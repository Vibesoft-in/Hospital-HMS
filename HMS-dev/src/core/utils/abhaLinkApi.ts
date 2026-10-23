import axios from "axios";
import dayjs from "dayjs";

export type IAbhaLinkVisitType = "OPD" | "Daycare" | "IPD";

export interface IAbhaLinkParams {
  abhaAddress: string;
  abhaNumber: string;
  name: string;
  gender?: string;
  dob?: dayjs.Dayjs | Date | string | null;
  ageYears?: string | number;
  visitType: IAbhaLinkVisitType;
}

const HOSPITAL_DISPLAY = "JJM Hospital Kashipur";

const VISIT_CONFIG: Record<IAbhaLinkVisitType, { display: string; hiType: string }> = {
  OPD: { display: "visit", hiType: "OPConsultation" },
  Daycare: { display: "daycare", hiType: "OPConsultation" },
  IPD: { display: "ipd", hiType: "OPConsultation" },
};

export const mapGenderToAbdm = (gender?: string): string => {
  const g = gender?.trim().toLowerCase();
  if (g === "male") return "M";
  if (g === "female") return "F";
  if (g === "others") return "O";
  return "";
};

export const resolveYearOfBirth = (
  dob?: dayjs.Dayjs | Date | string | null,
  ageYears?: string | number
): string => {
  if (dob) {
    const d = dayjs.isDayjs(dob) ? dob : dayjs(dob);
    if (d.isValid()) return d.format("YYYY");
  }
  const age =
    typeof ageYears === "number" ? ageYears : parseInt(String(ageYears ?? ""), 10);
  if (Number.isFinite(age) && age > 0) {
    return String(new Date().getFullYear() - age);
  }
  return "";
};

const generateUuid = (): string => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const validateAbhaLinkFields = (params: {
  enabled: boolean;
  abhaAddress: string;
  abhaNumber: string;
  name: string;
  gender?: string;
  dob?: dayjs.Dayjs | Date | string | null;
  ageYears?: string | number;
}): string | null => {
  if (!params.enabled) return null;
  if (!params.abhaAddress.trim()) return "Please enter ABHA address.";
  if (!params.abhaNumber.trim()) return "Please enter ABHA number.";
  if (!params.name.trim()) return "Patient name is required to link ABHA.";
  if (!mapGenderToAbdm(params.gender)) {
    return "Please select a valid gender to link ABHA.";
  }
  if (!resolveYearOfBirth(params.dob, params.ageYears)) {
    return "Date of birth or age is required to link ABHA.";
  }
  return null;
};

export const linkAbhaSingle = async (
  apiBaseUrl: string,
  params: IAbhaLinkParams
): Promise<void> => {
  const config = VISIT_CONFIG[params.visitType];
  await axios.post(`${apiBaseUrl}/hospital/abdm/m2/link/single`, {
    abhaAddress: params.abhaAddress.trim(),
    abhaNumber: params.abhaNumber.trim(),
    name: params.name.trim(),
    gender: mapGenderToAbdm(params.gender),
    yearOfBirth: resolveYearOfBirth(params.dob, params.ageYears),
    patient: [
      {
        referenceNumber: generateUuid(),
        display: HOSPITAL_DISPLAY,
        careContexts: [
          {
            referenceNumber: generateUuid(),
            display: config.display,
          },
        ],
        hiType: config.hiType,
        count: 1,
      },
    ],
  });
};

export interface IGenerateLinkTokenParams {
  patientId: string;
  abhaAddress: string;
  abhaNumber: string;
  name: string;
  gender: string;
  yearOfBirth: number | string;
}

export const validateLinkTokenFields = (params: {
  patientId: string;
  abhaAddress: string;
  abhaNumber: string;
  name: string;
  gender: string;
  yearOfBirth: number | string;
}): string | null => {
  if (!params.patientId.trim()) return "Patient ID is required.";
  if (!params.abhaAddress.trim()) return "Please enter ABHA address.";
  if (!params.abhaNumber.trim()) return "Please enter ABHA number.";
  if (!params.name.trim()) return "Please enter patient name.";
  if (!params.gender.trim()) return "Please select gender.";
  const yob = Number(params.yearOfBirth);
  if (!Number.isFinite(yob) || yob < 1900 || yob > new Date().getFullYear()) {
    return "Please enter a valid year of birth.";
  }
  return null;
};

export const generateLinkToken = async (
  apiBaseUrl: string,
  params: IGenerateLinkTokenParams
): Promise<{ status: number; data: unknown }> => {
  const response = await axios.post(
    `${apiBaseUrl}/hospital/abdm/m2/link-token/generate`,
    {
      patientId: params.patientId.trim(),
      abhaAddress: params.abhaAddress.trim(),
      abhaNumber: params.abhaNumber.trim(),
      name: params.name.trim(),
      gender: params.gender.trim(),
      yearOfBirth: Number(params.yearOfBirth),
    },
    {
      // 202 Accepted means generation is in progress — still a success for polling.
      validateStatus: (status) => status === 200 || status === 202,
    }
  );
  return { status: response.status, data: response.data };
};

export const getLinkTokenStatus = async (
  apiBaseUrl: string,
  patientId: string
): Promise<unknown> => {
  const response = await axios.get(`${apiBaseUrl}/hospital/abdm/m2/link-token/status`, {
    params: { patientId: patientId.trim() },
  });
  return response.data;
};

export const unlinkAbha = async (apiBaseUrl: string, patientId: string): Promise<unknown> => {
  const trimmed = patientId.trim();
  if (!trimmed) throw new Error("Patient ID is required.");

  try {
    const response = await axios.delete(`${apiBaseUrl}/hospital/abdm/m2/unlink`, {
      params: { patientId: trimmed },
    });
    const code = response.data?.code;
    if (code != null && code !== 200 && code !== 201) {
      throw new Error(response.data?.message ?? "Failed to unlink ABHA.");
    }
    return response.data?.data ?? response.data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      const data = err.response?.data as { message?: unknown; error?: unknown } | undefined;
      if (typeof data?.message === "string" && data.message.trim()) {
        throw new Error(data.message);
      }
      if (typeof data?.error === "string" && data.error.trim()) {
        throw new Error(data.error);
      }
    }
    throw new Error(err instanceof Error ? err.message : "Failed to unlink ABHA.");
  }
};
