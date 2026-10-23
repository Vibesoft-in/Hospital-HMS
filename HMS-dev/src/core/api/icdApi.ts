import axios from "axios";
import { API_BASE_URL } from "@/environment";

export interface IIcdDiagnosisItem {
  icdCode: string;
  diagnosisName: string;
}

const asDiagnosisItem = (value: unknown): IIcdDiagnosisItem | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const icdCode = String(row.icdCode ?? row.code ?? row.icd ?? "").trim();
  const diagnosisName = String(
    row.diagnosisName ?? row.name ?? row.title ?? row.description ?? ""
  ).trim();
  if (!icdCode && !diagnosisName) return null;
  return { icdCode, diagnosisName };
};

const extractDiagnosisArray = (payload: unknown): IIcdDiagnosisItem[] => {
  if (Array.isArray(payload)) {
    return payload
      .map(asDiagnosisItem)
      .filter((item): item is IIcdDiagnosisItem => item != null);
  }
  if (!payload || typeof payload !== "object") return [];
  const data = payload as Record<string, unknown>;
  const nested =
    data.results ?? data.items ?? data.icdCodes ?? data.diagnoses ?? data.records;
  if (Array.isArray(nested)) {
    return nested
      .map(asDiagnosisItem)
      .filter((item): item is IIcdDiagnosisItem => item != null);
  }
  return [];
};

export const searchIcdDiagnoses = async (term: string): Promise<IIcdDiagnosisItem[]> => {
  if (!API_BASE_URL) throw new Error("API configuration error");
  const trimmed = term.trim();
  if (!trimmed) return [];

  const res = await axios.get(`${API_BASE_URL}/hospital/icd/search`, {
    params: { term: trimmed },
  });

  const payload = res.data?.data ?? res.data;
  return extractDiagnosisArray(payload);
};
