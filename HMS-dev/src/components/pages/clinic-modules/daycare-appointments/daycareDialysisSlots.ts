import axios from "axios";
import { API_BASE_URL } from "@/environment";

export interface IDoctorDialysisSlot {
  _id: string;
  name: string;
  startTime: string;
  endTime: string;
  maxAppointments?: number;
}

export interface IDaycareDialysisProcedurePayload {
  procedureId: string;
  slotId?: string;
  sessionDate?: string;
}

export const isDialysisProcedureName = (
  name?: string,
  category?: string
): boolean => {
  const haystack = `${name ?? ""} ${category ?? ""}`.toLowerCase();
  return haystack.includes("dialysis");
};

const mapSlot = (raw: unknown): IDoctorDialysisSlot | null => {
  const item = (raw ?? {}) as Record<string, unknown>;
  const id = String(item._id ?? item.id ?? item.slotId ?? "").trim();
  if (!id) return null;
  return {
    _id: id,
    name: String(item.name ?? "Dialysis slot"),
    startTime: String(item.startTime ?? "").slice(0, 5),
    endTime: String(item.endTime ?? "").slice(0, 5),
    maxAppointments:
      typeof item.maxAppointments === "number"
        ? item.maxAppointments
        : Number(item.maxAppointments) || undefined,
  };
};

export const parseDoctorDialysisSlots = (payload: unknown): IDoctorDialysisSlot[] => {
  const root = (payload ?? {}) as Record<string, unknown>;
  const data = (root.data ?? root) as Record<string, unknown>;
  const candidates = [
    data.dialysisSlots,
    data.slots,
    (data.doctor as Record<string, unknown> | undefined)?.dialysisSlots,
    Array.isArray(data) ? data : null,
    Array.isArray(root) ? root : null,
  ];
  const list = candidates.find((value) => Array.isArray(value)) as unknown[] | undefined;
  if (!list) return [];
  return list.map(mapSlot).filter((slot): slot is IDoctorDialysisSlot => Boolean(slot));
};

export const fetchDoctorDialysisSlots = async (
  doctorId: string
): Promise<IDoctorDialysisSlot[]> => {
  if (!API_BASE_URL || !doctorId) return [];
  const res = await axios.get(
    `${API_BASE_URL}/hospital/doctors/${doctorId}/dialysis-slots`
  );
  return parseDoctorDialysisSlots(res.data);
};

export const toDialysisSlotSelectOptions = (
  slots: IDoctorDialysisSlot[]
): Array<{ value: string; label: string }> =>
  slots.map((slot) => {
    const timeRange =
      slot.startTime && slot.endTime
        ? `${slot.startTime}–${slot.endTime}`
        : slot.startTime || slot.endTime;
    return {
      value: slot._id,
      label: timeRange ? `${slot.name} (${timeRange})` : slot.name,
    };
  });

export const buildDaycareProceduresPayload = (
  procedures: Array<{ id: string; name: string; isDialysis?: boolean }>,
  slotId: string | undefined,
  sessionDate: string | undefined
): IDaycareDialysisProcedurePayload[] =>
  procedures
    .filter((proc) => Boolean(proc.id))
    .map((proc) => {
      const item: IDaycareDialysisProcedurePayload = { procedureId: proc.id };
      if (proc.isDialysis || isDialysisProcedureName(proc.name)) {
        if (slotId) item.slotId = slotId;
        if (sessionDate) item.sessionDate = sessionDate;
      }
      return item;
    });
