import axios from "axios";
import { API_BASE_URL } from "@/environment";
import type {
  IFhirHealthRecordListItem,
  IFhirHealthRecordListResult,
  IFhirHealthRecordPayload,
  TFhirHiType,
  TFhirSourceType,
} from "@/core/types/fhirHealthRecord";
import { FHIR_HI_TYPE_OPTIONS } from "@/core/types/fhirHealthRecord";

const getAxiosMessage = (err: unknown, fallback: string): string => {
  if (!axios.isAxiosError(err)) return fallback;
  const data = err.response?.data as { message?: unknown } | undefined;
  if (typeof data?.message === "string" && data.message.trim()) return data.message;
  return fallback;
};

const asRecordArray = (value: unknown): IFhirHealthRecordListItem[] => {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is IFhirHealthRecordListItem =>
      !!item && typeof item === "object" && !Array.isArray(item)
  );
};

export const listFhirHealthRecords = async (
  sourceType: TFhirSourceType,
  sourceId: string,
  page = 1,
  limit = 10
): Promise<IFhirHealthRecordListResult> => {
  if (!API_BASE_URL) throw new Error("API configuration error");
  if (!sourceId?.trim()) {
    return { records: [], total: 0, page, limit };
  }

  try {
    const res = await axios.get(`${API_BASE_URL}/hospital/abdm/fhir/health-information`, {
      params: { sourceType, sourceId, page, limit },
    });

    const payload = res.data?.data ?? res.data;
    if (Array.isArray(payload)) {
      return { records: asRecordArray(payload), total: payload.length, page, limit };
    }

    if (payload && typeof payload === "object") {
      const records = asRecordArray(
        (payload as { records?: unknown }).records ??
          (payload as { items?: unknown }).items ??
          (payload as { docs?: unknown }).docs ??
          (payload as { healthInformation?: unknown }).healthInformation ??
          (payload as { data?: unknown }).data
      );
      const totalRaw =
        (payload as { total?: unknown }).total ??
        (payload as { totalCount?: unknown }).totalCount ??
        (payload as { count?: unknown }).count ??
        records.length;
      const total = typeof totalRaw === "number" ? totalRaw : Number(totalRaw) || records.length;
      const pageRaw = (payload as { page?: unknown }).page ?? page;
      const limitRaw = (payload as { limit?: unknown }).limit ?? limit;

      return {
        records,
        total,
        page: typeof pageRaw === "number" ? pageRaw : Number(pageRaw) || page,
        limit: typeof limitRaw === "number" ? limitRaw : Number(limitRaw) || limit,
      };
    }

    return { records: [], total: 0, page, limit };
  } catch (err) {
    throw new Error(getAxiosMessage(err, "Failed to load health records"));
  }
};

export const getFhirHiTypeLabel = (hiType?: string): string => {
  if (!hiType) return "—";
  return FHIR_HI_TYPE_OPTIONS.find((o) => o.value === hiType)?.label ?? hiType;
};

const typedDataKeyByHiType: Record<TFhirHiType, keyof IFhirHealthRecordListItem> = {
  DischargeSummary: "dischargeSummaryData",
  OPConsultation: "opConsultData",
  Prescription: "prescriptionData",
  DiagnosticReport: "diagnosticReportData",
  ImmunizationRecord: "immunizationData",
  HealthDocumentRecord: "healthDocumentData",
  WellnessRecord: "wellnessData",
  Invoice: "invoiceData",
};

/** Resolves clinical payload from either `data` or hiType-specific fields like `opConsultData`. */
export const extractFhirRecordData = (
  record: IFhirHealthRecordListItem
): Record<string, unknown> => {
  if (record.data && typeof record.data === "object" && !Array.isArray(record.data)) {
    return record.data;
  }

  const hiType = record.hiType as TFhirHiType | undefined;
  if (hiType && typedDataKeyByHiType[hiType]) {
    const nested = record[typedDataKeyByHiType[hiType]];
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      return nested as Record<string, unknown>;
    }
  }

  return {};
};

export const getFhirHealthRecord = async (
  fhirRecordId: string
): Promise<IFhirHealthRecordListItem> => {
  if (!API_BASE_URL) throw new Error("API configuration error");
  if (!fhirRecordId?.trim()) throw new Error("Health record id is required");

  try {
    const res = await axios.get(
      `${API_BASE_URL}/hospital/abdm/fhir/health-information/${fhirRecordId.trim()}`
    );
    const code = res.data?.code;
    if (code != null && code !== 200 && code !== 201) {
      throw new Error(res.data?.message ?? "Failed to load health record");
    }

    const payload = res.data?.data ?? res.data;
    if (payload && typeof payload === "object" && !Array.isArray(payload)) {
      return payload as IFhirHealthRecordListItem;
    }
    throw new Error("Invalid health record response");
  } catch (err) {
    throw new Error(getAxiosMessage(err, "Failed to load health record"));
  }
};

export const updateFhirHealthRecord = async (
  fhirRecordId: string,
  payload: IFhirHealthRecordPayload
): Promise<string> => {
  if (!API_BASE_URL) throw new Error("API configuration error");
  if (!fhirRecordId?.trim()) throw new Error("Health record id is required");

  try {
    const res = await axios.patch(
      `${API_BASE_URL}/hospital/abdm/fhir/health-information/${fhirRecordId.trim()}`,
      payload
    );
    const code = res.data?.code;
    if (code != null && code !== 200 && code !== 201) {
      throw new Error(res.data?.message ?? "Failed to update health record");
    }

    const data = res.data?.data ?? res.data;
    const id =
      (typeof data?._id === "string" && data._id) ||
      (typeof data?.fhirId === "string" && data.fhirId) ||
      (typeof data?.id === "string" && data.id) ||
      fhirRecordId.trim();

    return id;
  } catch (err) {
    throw new Error(getAxiosMessage(err, "Failed to update health record"));
  }
};

export const fetchFhirPrefill = async (
  sourceType: TFhirSourceType,
  sourceId: string,
  hiType: TFhirHiType
): Promise<Record<string, unknown>> => {
  if (!API_BASE_URL) throw new Error("API configuration error");

  const res = await axios.get(`${API_BASE_URL}/hospital/abdm/fhir/prefill`, {
    params: { sourceType, sourceId, hiType },
  });

  const payload = res.data?.data ?? res.data;
  if (payload && typeof payload === "object") {
    const nested = (payload as { data?: unknown }).data;
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      return nested as Record<string, unknown>;
    }
    return payload as Record<string, unknown>;
  }
  return {};
};

export const saveFhirHealthRecord = async (
  payload: IFhirHealthRecordPayload
): Promise<string> => {
  if (!API_BASE_URL) throw new Error("API configuration error");

  try {
    const res = await axios.post(
      `${API_BASE_URL}/hospital/abdm/fhir/health-information`,
      payload
    );
    const code = res.data?.code;
    if (code != null && code !== 200 && code !== 201) {
      throw new Error(res.data?.message ?? "Failed to save health record");
    }

    const data = res.data?.data ?? res.data;
    const id =
      (typeof data?._id === "string" && data._id) ||
      (typeof data?.fhirId === "string" && data.fhirId) ||
      (typeof data?.id === "string" && data.id) ||
      (typeof data?.fhirRecordId === "string" && data.fhirRecordId) ||
      "";

    return id;
  } catch (err) {
    throw new Error(getAxiosMessage(err, "Failed to save health record"));
  }
};

export const finalizeFhirHealthRecord = async (fhirRecordId: string): Promise<void> => {
  if (!API_BASE_URL) throw new Error("API configuration error");
  if (!fhirRecordId?.trim()) throw new Error("Health record id is required to finalize");

  try {
    const res = await axios.patch(
      `${API_BASE_URL}/hospital/abdm/fhir/health-information/${fhirRecordId.trim()}/finalize`
    );
    const code = res.data?.code;
    if (code != null && code !== 200 && code !== 201) {
      throw new Error(res.data?.message ?? "Failed to finalize health record");
    }
  } catch (err) {
    throw new Error(getAxiosMessage(err, "Failed to finalize health record"));
  }
};

export const deleteFhirHealthRecord = async (fhirRecordId: string): Promise<void> => {
  if (!API_BASE_URL) throw new Error("API configuration error");
  if (!fhirRecordId?.trim()) throw new Error("Health record id is required to delete");

  try {
    const res = await axios.delete(
      `${API_BASE_URL}/hospital/abdm/fhir/health-information/${fhirRecordId.trim()}`
    );
    const code = res.data?.code;
    if (code != null && code !== 200 && code !== 201) {
      throw new Error(res.data?.message ?? "Failed to delete health record");
    }
  } catch (err) {
    throw new Error(getAxiosMessage(err, "Failed to delete health record"));
  }
};

export const linkFhirHealthRecords = async (fhirIds: string[]): Promise<void> => {
  if (!API_BASE_URL) throw new Error("API configuration error");
  const ids = fhirIds.map((id) => id.trim()).filter(Boolean);
  if (ids.length === 0) throw new Error("Select at least one health record to link");

  try {
    const res = await axios.post(`${API_BASE_URL}/hospital/abdm/fhir/link`, {
      fhirIds: ids,
    });
    const code = res.data?.code;
    if (code != null && code !== 200 && code !== 201) {
      throw new Error(res.data?.message ?? "Failed to link health records");
    }
  } catch (err) {
    throw new Error(getAxiosMessage(err, "Failed to link health records"));
  }
};

export const uploadFhirAttachment = async (
  file: File,
  folder = "fhir_attachments"
): Promise<{ s3Key: string; title: string; contentType: string }> => {
  if (!API_BASE_URL) throw new Error("API configuration error");

  const formData = new FormData();
  formData.append("file", file);
  const res = await axios.post(`${API_BASE_URL}/upload/pathlab?folder=${folder}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  const d = res.data?.data ?? res.data;
  const s3Key =
    (typeof d?.s3Key === "string" && d.s3Key) ||
    (typeof d?.key === "string" && d.key) ||
    extractS3KeyFromUrl(d?.signedUrl || d?.originalUrl || d?.url || "");

  if (!s3Key) {
    throw new Error("Upload succeeded but no S3 key was returned");
  }

  return {
    s3Key,
    title: file.name,
    contentType: file.type || "application/octet-stream",
  };
};

const extractS3KeyFromUrl = (url: string): string => {
  if (!url) return "";
  try {
    const pathname = new URL(url.split("?")[0]).pathname;
    return pathname.startsWith("/") ? pathname.slice(1) : pathname;
  } catch {
    return url.split("?")[0];
  }
};

const triggerBlobDownload = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
};

const resolveDownloadFilename = (
  contentDisposition: string | undefined,
  fhirRecordId: string,
  contentType: string
): string => {
  const match =
    contentDisposition?.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i) ??
    contentDisposition?.match(/filename="([^"]+)"/i);
  const fromHeader = match?.[1]?.trim();
  if (fromHeader) return decodeURIComponent(fromHeader);

  const lowerType = contentType.toLowerCase();
  if (lowerType.includes("pdf")) return `health-record-${fhirRecordId}.pdf`;
  if (lowerType.includes("json")) return `health-record-${fhirRecordId}.json`;
  return `health-record-${fhirRecordId}.bundle`;
};

export const downloadFhirHealthRecord = async (fhirRecordId: string): Promise<void> => {
  if (!API_BASE_URL) throw new Error("API configuration error");
  if (!fhirRecordId?.trim()) throw new Error("Health record id is required");

  try {
    const response = await axios.get(
      `${API_BASE_URL}/hospital/abdm/fhir/health-information/${fhirRecordId.trim()}/download`,
      { responseType: "blob" }
    );
    const blob = response.data as Blob;
    const contentType = String(response.headers["content-type"] ?? "");

    if (contentType.includes("application/json")) {
      const text = await blob.text();
      let message = "Failed to download health record";
      try {
        const parsed = JSON.parse(text) as { message?: string };
        if (parsed?.message?.trim()) message = parsed.message.trim();
      } catch {
        // keep default message
      }
      throw new Error(message);
    }

    const filename = resolveDownloadFilename(
      response.headers["content-disposition"] as string | undefined,
      fhirRecordId.trim(),
      contentType
    );
    triggerBlobDownload(blob, filename);
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.data instanceof Blob) {
      try {
        const text = await err.response.data.text();
        const parsed = JSON.parse(text) as { message?: string };
        throw new Error(parsed?.message ?? "Failed to download health record");
      } catch {
        throw new Error("Failed to download health record");
      }
    }
    throw new Error(getAxiosMessage(err, "Failed to download health record"));
  }
};
