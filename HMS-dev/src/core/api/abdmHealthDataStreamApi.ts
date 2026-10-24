import { API_BASE_URL } from "@/environment";
import { getAccessToken } from "@/core/auth/accessToken";

export interface IHealthDataStreamParams {
  patientId: string;
  consentArtifactId: string;
}

export interface IHealthHistoryItem {
  id: string;
  hiType: string | null;
  title: string;
  careContextReference: string | null;
  patientName: string | null;
  practitionerName: string | null;
  organizationName: string | null;
  createdAt: string | null;
  status: string | null;
  raw: Record<string, unknown>;
}

export type THealthStreamConnectionStatus =
  | "idle"
  | "connecting"
  | "streaming"
  | "completed"
  | "error";

interface ISseEvent {
  event: string;
  data: string;
}

const asObject = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

const readOptionalString = (value: unknown): string | null => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
};

const getResourceEntries = (
  fhirBundle: Record<string, unknown> | null
): Record<string, unknown>[] => {
  if (!fhirBundle || !Array.isArray(fhirBundle.entry)) return [];
  return fhirBundle.entry
    .map((item) => {
      const entry = asObject(item);
      return asObject(entry?.resource);
    })
    .filter((item): item is Record<string, unknown> => Boolean(item));
};

const findResourceByType = (
  resources: Record<string, unknown>[],
  resourceType: string
): Record<string, unknown> | null =>
  resources.find((item) => readOptionalString(item.resourceType) === resourceType) ?? null;

const readHumanName = (resource: Record<string, unknown> | null): string | null => {
  if (!resource) return null;
  if (Array.isArray(resource.name)) {
    for (const nameItem of resource.name) {
      const nameObj = asObject(nameItem);
      const text = readOptionalString(nameObj?.text);
      if (text) return text;
    }
  }
  return readOptionalString(resource.name);
};

const readCompositionType = (composition: Record<string, unknown> | null): string | null => {
  if (!composition) return null;
  const typeObj = asObject(composition.type);
  const text = readOptionalString(typeObj?.text);
  if (text) return text;
  if (Array.isArray(typeObj?.coding)) {
    for (const codingItem of typeObj.coding) {
      const coding = asObject(codingItem);
      const display = readOptionalString(coding?.display);
      if (display) return display;
    }
  }
  return null;
};

export const mapRecordEventToHistoryItem = (
  payload: unknown,
  index = 0
): IHealthHistoryItem | null => {
  const root = asObject(payload);
  if (!root) return null;

  const careContextReference = readOptionalString(root.careContextReference);
  const fhirBundle = asObject(root.fhirBundle);
  if (!careContextReference && !fhirBundle) return null;

  const resources = getResourceEntries(fhirBundle);
  const composition = findResourceByType(resources, "Composition");
  const patient = findResourceByType(resources, "Patient");
  const practitioner = findResourceByType(resources, "Practitioner");
  const organization = findResourceByType(resources, "Organization");

  const hiType = readCompositionType(composition);
  const title = readOptionalString(composition?.title) || hiType || "Health Record";

  const createdAt =
    readOptionalString(composition?.date) ||
    readOptionalString(fhirBundle?.timestamp) ||
    readOptionalString(asObject(fhirBundle?.meta)?.lastUpdated) ||
    null;

  const bundleId = readOptionalString(fhirBundle?.id);
  const id = `${careContextReference ?? bundleId ?? "record"}-${index}`;

  return {
    id,
    hiType,
    title,
    careContextReference,
    patientName: readHumanName(patient),
    practitionerName: readHumanName(practitioner),
    organizationName: readOptionalString(organization?.name),
    createdAt,
    status: readOptionalString(composition?.status) || "received",
    raw: root,
  };
};

export const buildHealthDataStreamUrl = (params: IHealthDataStreamParams): string => {
  if (!API_BASE_URL) throw new Error("API base URL is not configured.");
  if (!params.patientId?.trim()) throw new Error("Patient ID is required.");
  if (!params.consentArtifactId?.trim()) throw new Error("Consent artifact ID is required.");

  const query = [
    `patientId=${encodeURIComponent(params.patientId.trim())}`,
    `consentId=${encodeURIComponent(params.consentArtifactId.trim())}`,
  ].join("&");

  return `${API_BASE_URL.replace(/\/$/, "")}/hospital/abdm/m3/health-data/stream?${query}`;
};

const findBalancedJsonEnd = (source: string, start: number): number => {
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < source.length; i += 1) {
    const ch = source[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (inString) {
      if (ch === "\\") {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === "{") {
      depth += 1;
      continue;
    }

    if (ch === "}") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }

  return -1;
};

/**
 * Extract complete SSE events without regex on huge FHIR JSON lines.
 * Uses brace-matching so multi-line / very large `data: {...}` payloads work.
 */
export const drainSseBuffer = (
  input: string
): { events: ISseEvent[]; rest: string } => {
  const buffer = input.replace(/\r\n/g, "\n");
  const events: ISseEvent[] = [];
  let pos = 0;

  while (pos < buffer.length) {
    // Skip keepalive comments and blank lines
    if (buffer[pos] === ":" || buffer[pos] === "\n") {
      const nl = buffer.indexOf("\n", pos);
      if (nl === -1) break;
      pos = nl + 1;
      continue;
    }

    if (buffer.startsWith("event:", pos)) {
      const lineEnd = buffer.indexOf("\n", pos);
      if (lineEnd === -1) break;

      const eventName = buffer.slice(pos + 6, lineEnd).trim() || "message";
      let cursor = lineEnd + 1;
      while (cursor < buffer.length && buffer[cursor] === "\n") cursor += 1;

      if (cursor >= buffer.length) break;
      if (!buffer.startsWith("data:", cursor)) break;

      const jsonStart = buffer.indexOf("{", cursor);
      if (jsonStart === -1) break;

      const jsonEnd = findBalancedJsonEnd(buffer, jsonStart);
      if (jsonEnd === -1) break;

      events.push({
        event: eventName,
        data: buffer.slice(jsonStart, jsonEnd + 1),
      });
      pos = jsonEnd + 1;
      continue;
    }

    if (buffer.startsWith("data:", pos)) {
      const jsonStart = buffer.indexOf("{", pos);
      if (jsonStart === -1) break;

      const jsonEnd = findBalancedJsonEnd(buffer, jsonStart);
      if (jsonEnd === -1) break;

      events.push({
        event: "message",
        data: buffer.slice(jsonStart, jsonEnd + 1),
      });
      pos = jsonEnd + 1;
      continue;
    }

    // Unknown line — skip it
    const nl = buffer.indexOf("\n", pos);
    if (nl === -1) break;
    pos = nl + 1;
  }

  return { events, rest: buffer.slice(pos) };
};

export interface IHealthDataStreamHandlers {
  onItems: (items: IHealthHistoryItem[]) => void;
  onStatus?: (status: THealthStreamConnectionStatus, message?: string) => void;
  onInfo?: (message: string) => void;
  onRawEvent?: (eventName: string, payload: unknown) => void;
  signal?: AbortSignal;
}

const processSseEvent = (
  sseEvent: ISseEvent,
  handlers: IHealthDataStreamHandlers,
  itemIndex: number
): number => {
  try {
    const payload = JSON.parse(sseEvent.data) as unknown;
    handlers.onRawEvent?.(sseEvent.event, payload);

    const eventName = sseEvent.event.trim().toLowerCase();
    const root = asObject(payload);
    const hasFhirRecord = Boolean(root?.careContextReference || root?.fhirBundle);

    if (eventName === "started") {
      const message =
        readOptionalString(root?.message) ||
        "Request accepted by ABDM. Waiting for HIP data...";
      handlers.onInfo?.(message);
      handlers.onStatus?.("streaming", message);
      return itemIndex;
    }

    if (
      eventName === "completed" ||
      eventName === "done" ||
      eventName === "finished" ||
      eventName === "end"
    ) {
      handlers.onStatus?.(
        "completed",
        readOptionalString(root?.message) || "Health data stream completed."
      );
      return itemIndex;
    }

    if (eventName === "error" || eventName === "failed") {
      handlers.onStatus?.(
        "error",
        readOptionalString(root?.message) || "Health data stream failed."
      );
      return itemIndex;
    }

    if (eventName === "record" || hasFhirRecord) {
      const item = mapRecordEventToHistoryItem(payload, itemIndex);
      if (item) {
        handlers.onItems([item]);
        return itemIndex + 1;
      }
    }
  } catch {
    // Ignore a single bad event; keep consuming the stream.
  }

  return itemIndex;
};

export const streamHealthData = async (
  params: IHealthDataStreamParams,
  handlers: IHealthDataStreamHandlers
): Promise<void> => {
  const streamUrl = buildHealthDataStreamUrl(params);
  handlers.onStatus?.("connecting");

  const token = getAccessToken();

  const response = await fetch(streamUrl, {
    method: "GET",
    headers: {
      Accept: "text/event-stream",
      "Cache-Control": "no-cache",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    signal: handlers.signal,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Health data stream failed (${response.status}).`);
  }
  if (!response.body) {
    throw new Error("Health data stream body is empty.");
  }

  handlers.onStatus?.("streaming");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let itemIndex = 0;

  const consume = (chunkText: string) => {
    buffer += chunkText;
    const drained = drainSseBuffer(buffer);
    buffer = drained.rest;
    for (const sseEvent of drained.events) {
      itemIndex = processSseEvent(sseEvent, handlers, itemIndex);
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    consume(decoder.decode(value, { stream: true }));
  }

  consume(decoder.decode());
  if (buffer.trim()) {
    const drained = drainSseBuffer(`${buffer}\n`);
    for (const sseEvent of drained.events) {
      itemIndex = processSseEvent(sseEvent, handlers, itemIndex);
    }
  }

  handlers.onStatus?.("completed");
};
