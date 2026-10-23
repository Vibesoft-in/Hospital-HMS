import axios from "axios";
import { API_BASE_URL } from "@/environment";

export type TAbhaSearchBy = "abhaAddress" | "abhaNumber";

export interface IAbhaPatientSearchResult {
  patientId: string;
  name: string;
  mrd: string;
  phone: string;
  gender: string;
  abhaNumber: string;
  abhaAddress: string;
  abhaLinked: boolean;
  raw: Record<string, unknown>;
}

const getAxiosMessage = (err: unknown, fallback: string): string => {
  if (!axios.isAxiosError(err)) return fallback;
  const data = err.response?.data as { message?: unknown; error?: unknown } | undefined;
  if (typeof data?.message === "string" && data.message.trim()) return data.message;
  if (typeof data?.error === "string" && data.error.trim()) return data.error;
  return fallback;
};

const asObject = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

const readString = (value: unknown): string => {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
};

const readBool = (value: unknown): boolean => value === true || value === "true";

const mapPatient = (value: unknown): IAbhaPatientSearchResult | null => {
  const row = asObject(value);
  if (!row) return null;

  const patientId =
    readString(row._id) ||
    readString(row.patientId) ||
    readString(row.id);
  if (!patientId) return null;

  const name =
    readString(row.name) ||
    readString(row.fullName) ||
    readString(row.patientName) ||
    [readString(row.title), readString(row.firstName), readString(row.lastName)]
      .filter(Boolean)
      .join(" ");

  return {
    patientId,
    name,
    mrd: readString(row.mrd),
    phone: readString(row.phone) || readString(row.mobile),
    gender: readString(row.gender),
    abhaNumber:
      readString(row.abhaNumber) ||
      readString(row.ABHANumber) ||
      readString(row.healthIdNumber),
    abhaAddress:
      readString(row.abhaAddress) ||
      readString(row.preferredAbhaAddress) ||
      readString(row.healthId),
    abhaLinked:
      readBool(row.abhaLinked) ||
      readBool(row.isLinked) ||
      Boolean(
        readString(row.abhaNumber) ||
          readString(row.abhaAddress) ||
          readString(row.ABHANumber)
      ),
    raw: row,
  };
};

const extractPatients = (payload: unknown): IAbhaPatientSearchResult[] => {
  const root = asObject(payload);
  if (!root) return [];

  const data = asObject(root.data) ?? root;
  const candidates: unknown[] = [];

  const pushArray = (value: unknown) => {
    if (Array.isArray(value)) candidates.push(...value);
  };

  pushArray(data.patients);
  pushArray(data.results);
  pushArray(data.list);
  pushArray(data.accounts);
  pushArray(root.patients);
  pushArray(root.results);

  if (Array.isArray(payload)) candidates.push(...payload);

  if (!candidates.length) {
    const single = mapPatient(data);
    if (single) return [single];
    // nested patient object
    const nested = mapPatient(data.patient);
    return nested ? [nested] : [];
  }

  const seen = new Set<string>();
  return candidates
    .map((item) => mapPatient(item))
    .filter((item): item is IAbhaPatientSearchResult => Boolean(item))
    .filter((item) => {
      if (seen.has(item.patientId)) return false;
      seen.add(item.patientId);
      return true;
    });
};

export const searchPatientByAbha = async (params: {
  searchBy: TAbhaSearchBy;
  value: string;
}): Promise<IAbhaPatientSearchResult[]> => {
  if (!API_BASE_URL) throw new Error("API base URL is not configured.");

  const trimmed = params.value.trim();
  if (!trimmed) {
    throw new Error(
      params.searchBy === "abhaAddress"
        ? "Please enter an ABHA address."
        : "Please enter an ABHA number."
    );
  }

  const query: Record<string, string> =
    params.searchBy === "abhaAddress"
      ? { abhaAddress: trimmed }
      : { abhaNumber: trimmed };

  try {
    const res = await axios.get(`${API_BASE_URL}/hospital/patients/search/abha`, {
      params: query,
    });

    const code = res.data?.code;
    if (code != null && code !== 200 && code !== 201) {
      throw new Error(res.data?.message ?? "Failed to search patient by ABHA.");
    }

    return extractPatients(res.data);
  } catch (err: unknown) {
    throw new Error(getAxiosMessage(err, "Failed to search patient by ABHA."));
  }
};
