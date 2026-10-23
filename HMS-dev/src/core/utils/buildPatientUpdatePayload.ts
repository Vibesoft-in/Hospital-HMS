import type { Option } from "@/core/common/common-select/commonSelect";
import { formatPatientPhoneForApi } from "@/core/utils/formatPatientPhoneForApi";

export interface IPatientEditSnapshot {
  title: string;
  name: string;
  phone: string;
  email?: string;
  dob?: string;
  age: number;
  months: number;
  days: number;
  gender: string;
  bloodGroup?: string;
  address: string;
  companyName?: string;
  division?: string;
  aadharNo?: string;
  ayushmanCardNo?: string;
  maritalStatus?: string;
  occupation?: string;
  drugSensitivity?: string;
}

export interface IPatientEditFormValues {
  title: Option | null;
  name: string;
  phone: string;
  email: string;
  dob: string;
  ageYears: string;
  ageMonths: string;
  ageDays: string;
  gender: Option | null;
  bloodGroup: Option | null;
  address: string;
  companyName: string;
  division: string;
  aadharNumber: string;
  ayushmanCardNo: string;
  maritalStatus: Option | null;
  occupation: string;
  drugSensitivity: string;
}

export interface IPatientEditUploads {
  aadharS3Url?: string;
  ayushmanCardS3Url?: string;
  imageS3Url?: string;
  otherDocsS3Urls?: string[];
}

const normalizeOptionalString = (value: string): string | undefined => {
  const trimmed = value.trim();
  return trimmed || undefined;
};

const normalizeSelectValue = (option: Option | null): string | undefined => {
  const value = option?.value?.trim();
  if (!value || value === "Select") return undefined;
  return value;
};

const parseAgeComponent = (value: string): number => {
  const trimmed = value.trim();
  if (trimmed === "") return 0;
  const parsed = parseInt(trimmed, 10);
  return Number.isNaN(parsed) ? 0 : Math.max(0, parsed);
};

export const buildPatientEditSnapshot = (
  values: IPatientEditFormValues
): IPatientEditSnapshot => ({
  title: values.title?.value?.trim() || "",
  name: values.name.trim(),
  phone: formatPatientPhoneForApi(values.phone),
  email: normalizeOptionalString(values.email),
  dob: values.dob.trim() || undefined,
  age: parseAgeComponent(values.ageYears),
  months: parseAgeComponent(values.ageMonths),
  days: parseAgeComponent(values.ageDays),
  gender: values.gender?.value?.trim() || "",
  bloodGroup: normalizeSelectValue(values.bloodGroup),
  address: values.address.trim(),
  companyName: normalizeOptionalString(values.companyName),
  division: normalizeOptionalString(values.division),
  aadharNo: normalizeOptionalString(values.aadharNumber),
  ayushmanCardNo: normalizeOptionalString(values.ayushmanCardNo),
  maritalStatus: normalizeSelectValue(values.maritalStatus),
  occupation: normalizeOptionalString(values.occupation),
  drugSensitivity: normalizeOptionalString(values.drugSensitivity),
});

export const buildPatientUpdatePayload = (
  original: IPatientEditSnapshot,
  current: IPatientEditSnapshot,
  uploads: IPatientEditUploads = {}
): Record<string, unknown> => {
  const payload: Record<string, unknown> = {};

  (Object.keys(current) as (keyof IPatientEditSnapshot)[]).forEach((key) => {
    if (current[key] !== original[key]) {
      payload[key] = current[key];
    }
  });

  if (uploads.aadharS3Url) {
    payload.aadharS3Url = uploads.aadharS3Url;
  }
  if (uploads.ayushmanCardS3Url) {
    payload.ayushmanCardS3Url = uploads.ayushmanCardS3Url;
  }
  if (uploads.imageS3Url) {
    payload.imageS3Url = uploads.imageS3Url;
  }
  if (uploads.otherDocsS3Urls?.length) {
    payload.otherDocsS3Urls = uploads.otherDocsS3Urls;
  }

  return payload;
};
