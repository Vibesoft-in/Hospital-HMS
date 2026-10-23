import axios from "axios";
import { API_BASE_URL } from "@/environment";
import {
  computeBedSummary,
  normalizeBedStatus,
  type IIpdBed,
  type IIpdBedBlockViewData,
  type IIpdWard,
} from "./ipdBedTypes";

const emptyBlockView = (): IIpdBedBlockViewData => ({
  wards: [],
  summary: computeBedSummary([]),
});

const mapBed = (raw: Record<string, unknown>): IIpdBed => {
  const patientRaw = raw.currentPatientDetails;
  const patient =
    patientRaw && typeof patientRaw === "object"
      ? (patientRaw as Record<string, unknown>)
      : undefined;

  const admittedAtRaw = patient?.admittedAt;
  let dayLabel: string | undefined;
  if (admittedAtRaw) {
    const admittedAt = new Date(String(admittedAtRaw));
    if (!Number.isNaN(admittedAt.getTime())) {
      const diffMs = Date.now() - admittedAt.getTime();
      const days = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      dayLabel = `Day ${days}`;
    }
  }

  return {
    _id: String(raw._id ?? raw.id ?? ""),
    bedCode: String(
      raw.bedNumber ?? raw.bedCode ?? raw.bedId ?? raw.code ?? raw.name ?? "—"
    ),
    status: normalizeBedStatus(raw.status),
    patientName:
      patient?.name != null
        ? String(patient.name)
        : raw.patientName != null
          ? String(raw.patientName)
          : undefined,
    dayLabel:
      dayLabel ??
      (raw.dayLabel != null
        ? String(raw.dayLabel)
        : raw.days != null
          ? `Day ${raw.days}`
          : undefined),
    patientMrdNo:
      patient?.mrd != null
        ? String(patient.mrd)
        : raw.patientMrdNo != null
          ? String(raw.patientMrdNo)
          : raw.mrd != null
            ? String(raw.mrd)
            : undefined,
  };
};

const parseChargePerDay = (raw: unknown): number | undefined => {
  if (raw == null || raw === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
};

const mapWard = (raw: Record<string, unknown>): IIpdWard => {
  const bedsRaw = raw.beds ?? raw.bedList;
  const beds = Array.isArray(bedsRaw)
    ? bedsRaw
        .filter((b) => !(b as Record<string, unknown>)?.isDeleted)
        .map((b) => mapBed(b as Record<string, unknown>))
    : [];
  return {
    _id: String(raw._id ?? raw.id ?? ""),
    name: String(raw.name ?? raw.wardName ?? raw.label ?? "Ward"),
    beds,
    chargePerDay: parseChargePerDay(raw.chargePerDay),
    nursingChargePerDay: parseChargePerDay(raw.nursingChargePerDay),
  };
};

const parseBlockViewPayload = (payload: unknown): IIpdWard[] => {
  if (!payload || typeof payload !== "object") return [];
  const obj = payload as Record<string, unknown>;
  const wardsRaw = obj.wards ?? obj.wardList ?? obj.data;
  if (!Array.isArray(wardsRaw)) return [];
  return wardsRaw
    .map((w) => mapWard(w as Record<string, unknown>))
    .filter((w) => w._id && w.beds.length > 0);
};

const groupBedsByWard = (bedsRaw: unknown[]): IIpdWard[] => {
  const wardMap = new Map<string, IIpdWard>();

  for (const item of bedsRaw) {
    if (!item || typeof item !== "object") continue;
    const bed = item as Record<string, unknown>;
    if (bed.isDeleted === true) continue;

    const wardObj = bed.ward;
    const wardRecord =
      wardObj && typeof wardObj === "object"
        ? (wardObj as Record<string, unknown>)
        : undefined;

    const wardIdRaw = bed.wardId;
    const wardId =
      typeof wardIdRaw === "string"
        ? wardIdRaw
        : wardIdRaw && typeof wardIdRaw === "object"
          ? String((wardIdRaw as { _id?: string })._id ?? "")
          : wardRecord?._id != null
            ? String(wardRecord._id)
            : "";

    if (!wardId) continue;

    const wardName =
      wardRecord?.name != null
        ? String(wardRecord.name)
        : typeof wardIdRaw === "object" &&
            wardIdRaw &&
            (wardIdRaw as { name?: string }).name
          ? String((wardIdRaw as { name?: string }).name)
          : "Ward";

    if (!wardMap.has(wardId)) {
      wardMap.set(wardId, {
        _id: wardId,
        name: wardName,
        beds: [],
        chargePerDay: parseChargePerDay(wardRecord?.chargePerDay),
        nursingChargePerDay: parseChargePerDay(wardRecord?.nursingChargePerDay),
      });
    }
    wardMap.get(wardId)?.beds.push(mapBed(bed));
  }

  return Array.from(wardMap.values()).filter((w) => w.beds.length > 0);
};

export interface IIpdWardOption {
  value: string;
  label: string;
  chargePerDay?: number;
  nursingChargePerDay?: number;
}

export const fetchIpdWardOptions = async (): Promise<IIpdWardOption[]> => {
  if (!API_BASE_URL) return [];
  try {
    const res = await axios.get(`${API_BASE_URL}/hospital/wards`, {
      params: { limit: 200, page: 1 },
    });
    const raw = res.data?.data ?? res.data;
    const list = Array.isArray(raw?.wards)
      ? raw.wards
      : Array.isArray(raw)
        ? raw
        : [];
    return list
      .map((w: Record<string, unknown>) => ({
        value: String(w._id ?? w.id ?? ""),
        label: String(w.name ?? w.wardName ?? w.label ?? "Ward"),
        chargePerDay: parseChargePerDay(w.chargePerDay),
        nursingChargePerDay: parseChargePerDay(w.nursingChargePerDay),
      }))
      .filter((w: IIpdWardOption) => Boolean(w.value));
  } catch {
    return [];
  }
};

const fetchBedsFromList = async (wardId?: string): Promise<IIpdWard[]> => {
  const params: Record<string, string | number> = { limit: 500, page: 1 };
  if (wardId) params.wardId = wardId;

  const res = await axios.get(`${API_BASE_URL}/hospital/beds`, { params });
  const payload = res.data?.data ?? res.data;
  const list = Array.isArray(payload?.beds)
    ? payload.beds
    : Array.isArray(payload)
      ? payload
      : [];
  return groupBedsByWard(list);
};

export const fetchIpdBedBlockView = async (
  wardId?: string | null
): Promise<IIpdBedBlockViewData> => {
  if (!API_BASE_URL) {
    return emptyBlockView();
  }

  const trimmedWardId = wardId?.trim() || undefined;
  if (trimmedWardId) {
    try {
      const wards = await fetchBedsFromList(trimmedWardId);
      if (!wards.length) return emptyBlockView();
      return { wards, summary: computeBedSummary(wards) };
    } catch {
      return emptyBlockView();
    }
  }

  try {
    const res = await axios.get(`${API_BASE_URL}/hospital/beds/block-view`);
    const payload = res.data?.data ?? res.data;
    let wards = parseBlockViewPayload(payload);

    if (!wards.length) {
      const wardsRaw = payload;
      if (Array.isArray(wardsRaw)) {
        wards = wardsRaw
          .map((w) => mapWard(w as Record<string, unknown>))
          .filter((w) => w._id);
      }
    }

    const blockViewBedCount = wards.reduce((n, w) => n + w.beds.length, 0);
    if (!blockViewBedCount) {
      wards = await fetchBedsFromList();
    }

    if (!wards.length) {
      return emptyBlockView();
    }

    const summaryRaw =
      payload && typeof payload === "object"
        ? (payload as Record<string, unknown>).summary
        : undefined;
    const summary =
      summaryRaw && typeof summaryRaw === "object"
        ? {
            total: Number((summaryRaw as { total?: number }).total) || 0,
            available: Number((summaryRaw as { available?: number }).available) || 0,
            occupied: Number((summaryRaw as { occupied?: number }).occupied) || 0,
            reserved: Number((summaryRaw as { reserved?: number }).reserved) || 0,
            maintenance:
              Number((summaryRaw as { maintenance?: number }).maintenance) || 0,
            occupancyPercent:
              Number((summaryRaw as { occupancyPercent?: number }).occupancyPercent) || 0,
          }
        : computeBedSummary(wards);

    return { wards, summary };
  } catch {
    try {
      const wards = await fetchBedsFromList();
      if (!wards.length) return emptyBlockView();
      return { wards, summary: computeBedSummary(wards) };
    } catch {
      return emptyBlockView();
    }
  }
};
