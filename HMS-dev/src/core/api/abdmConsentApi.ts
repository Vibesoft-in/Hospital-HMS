import axios from "axios";
import { API_BASE_URL } from "@/environment";
import type { TFhirHiType } from "@/core/types/fhirHealthRecord";

export type TConsentPurpose =
  | "CAREMGT"
  | "BTG"
  | "PUBHLTH"
  | "HPAYMT"
  | "DSRCH"
  | "PATRQ";

export interface IConsentPurposeOption {
  value: TConsentPurpose;
  label: string;
}

export const CONSENT_PURPOSE_OPTIONS: IConsentPurposeOption[] = [
  { value: "CAREMGT", label: "Care Management" },
  { value: "BTG", label: "Break the Glass" },
  { value: "PUBHLTH", label: "Public Health" },
  { value: "HPAYMT", label: "Healthcare Payment" },
  { value: "DSRCH", label: "Disease Specific Healthcare Research" },
  { value: "PATRQ", label: "Self Requested" },
];

export interface IConsentInitParams {
  patientId: string;
  abhaAddress: string;
  purposeCode: TConsentPurpose;
  dateRangeFrom: string;
  dateRangeTo: string;
  dataEraseAt: string;
  hiTypes: TFhirHiType[];
  requesterName: string;
}

export interface IConsentCareContext {
  patientReference?: string;
  careContextReference?: string;
}

export interface IConsentListItem {
  _id: string | null;
  consentId: string | null;
  consentRequestId: string | null;
  outboundRequestId: string | null;
  status: string | null;
  purpose: string | null;
  purposeCode: string | null;
  requesterName: string | null;
  hipName: string | null;
  hiTypes: string[];
  requestedHiTypes: string[];
  grantedHiTypes: string[];
  dateRangeFrom: string | null;
  dateRangeTo: string | null;
  dataEraseAt: string | null;
  grantedDateRangeFrom: string | null;
  grantedDateRangeTo: string | null;
  grantedDataEraseAt: string | null;
  initiatedAt: string | null;
  grantedAt: string | null;
  deniedAt: string | null;
  revokedAt: string | null;
  careContexts: IConsentCareContext[];
  patientId: string | null;
  patientName: string | null;
  abhaAddress: string | null;
  abhaNumber: string | null;
  uhid: string | null;
  patientMobile: string | null;
  patientDob: string | null;
  patientAddress: string | null;
  createdAt: string | null;
}

export interface IConsentDetailResult {
  consent: IConsentListItem | null;
  hips: IConsentHipOption[];
  raw: unknown;
}

export interface IConsentPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface IAllConsentsResult {
  consents: IConsentListItem[];
  pagination: IConsentPagination;
  raw: unknown;
}

export type TConsentStatus =
  | "REQUESTED"
  | "GRANTED"
  | "DENIED"
  | "REVOKED"
  | "EXPIRED"
  | "ERROR";

export type TConsentStatusFilter = TConsentStatus | "ALL";

export const CONSENT_STATUS_FILTERS: { value: TConsentStatusFilter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "REQUESTED", label: "Requested" },
  { value: "GRANTED", label: "Granted" },
  { value: "DENIED", label: "Denied" },
  { value: "REVOKED", label: "Revoked" },
  { value: "EXPIRED", label: "Expired" },
  { value: "ERROR", label: "Error" },
];

export interface IConsentStatusResult {
  status: string | null;
  consents: IConsentListItem[];
  abhaAddress: string | null;
  abhaNumber: string | null;
  raw: unknown;
}

export interface IConsentHipOption {
  consentArtifactId: string;
  hipName: string;
  hipId: string | null;
  hiTypes: string[];
  grantedHiTypes: string[];
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

const readStatusString = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const readOptionalString = (value: unknown): string | null => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
};

const readStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
};

const buildPatientName = (
  patient: Record<string, unknown> | null,
  fallback?: string | null
): string | null => {
  if (fallback?.trim()) return fallback.trim();
  if (!patient) return null;
  const title = readOptionalString(patient.title);
  const name = readOptionalString(patient.name);
  const combined = [title, name].filter(Boolean).join(" ").trim();
  return combined || readOptionalString(patient.patientName);
};

const readCareContexts = (value: unknown): IConsentCareContext[] => {
  if (!Array.isArray(value)) return [];
  const contexts: IConsentCareContext[] = [];
  for (const item of value) {
    const row = asObject(item);
    if (!row) continue;
    contexts.push({
      patientReference: readOptionalString(row.patientReference) ?? undefined,
      careContextReference: readOptionalString(row.careContextReference) ?? undefined,
    });
  }
  return contexts;
};

const mapConsentItem = (value: unknown): IConsentListItem | null => {
  const consent = asObject(value);
  if (!consent) return null;

  const detail = asObject(consent.consentDetail);
  const purposeObj = asObject(detail?.purpose);
  const hip = asObject(detail?.hip);
  const permission = asObject(detail?.permission);
  const dateRange = asObject(permission?.dateRange);
  const patientObj = asObject(consent.patient);

  const requestedHiTypes = readStringArray(consent.requestedHiTypes).length
    ? readStringArray(consent.requestedHiTypes)
    : readStringArray(consent.requestHiTypes).length
      ? readStringArray(consent.requestHiTypes)
      : readStringArray(consent.hiTypes).length
        ? readStringArray(consent.hiTypes)
        : readStringArray(detail?.hiTypes);

  const grantedHiTypes = readStringArray(consent.grantedHiTypes).length
    ? readStringArray(consent.grantedHiTypes)
    : readStringArray(consent.grantedTypes).length
      ? readStringArray(consent.grantedTypes)
      : readStringArray(detail?.grantedHiTypes).length
        ? readStringArray(detail?.grantedHiTypes)
        : readStringArray(permission?.grantedHiTypes);

  return {
    _id: readOptionalString(consent._id),
    consentId:
      readOptionalString(consent.consentId) ||
      readOptionalString(detail?.consentId) ||
      null,
    consentRequestId: readOptionalString(consent.consentRequestId),
    outboundRequestId: readOptionalString(consent.outboundRequestId),
    status: readStatusString(consent.status) || readStatusString(consent.consentStatus),
    purpose:
      readOptionalString(consent.purpose) ||
      readOptionalString(purposeObj?.text) ||
      null,
    purposeCode:
      readOptionalString(consent.purposeCode) ||
      readOptionalString(purposeObj?.code) ||
      null,
    requesterName: readOptionalString(consent.requesterName),
    hipName: readOptionalString(hip?.name),
    hiTypes: requestedHiTypes,
    requestedHiTypes,
    grantedHiTypes,
    dateRangeFrom:
      readOptionalString(consent.dateRangeFrom) ||
      readOptionalString(dateRange?.from) ||
      null,
    dateRangeTo:
      readOptionalString(consent.dateRangeTo) ||
      readOptionalString(dateRange?.to) ||
      null,
    dataEraseAt:
      readOptionalString(consent.dataEraseAt) ||
      readOptionalString(permission?.dataEraseAt) ||
      null,
    grantedDateRangeFrom: readOptionalString(consent.grantedDateRangeFrom),
    grantedDateRangeTo: readOptionalString(consent.grantedDateRangeTo),
    grantedDataEraseAt: readOptionalString(consent.grantedDataEraseAt),
    initiatedAt: readOptionalString(consent.initiatedAt),
    grantedAt: readOptionalString(consent.grantedAt),
    deniedAt: readOptionalString(consent.deniedAt),
    revokedAt: readOptionalString(consent.revokedAt),
    careContexts: readCareContexts(detail?.careContexts),
    patientId:
      readOptionalString(consent.hospitalPatientId) ||
      readOptionalString(consent.patientId) ||
      readOptionalString(patientObj?._id) ||
      readOptionalString(patientObj?.id) ||
      null,
    patientName: buildPatientName(patientObj, readOptionalString(consent.patientName)),
    abhaAddress:
      readOptionalString(consent.abhaAddress) ||
      readOptionalString(patientObj?.abhaAddress) ||
      null,
    abhaNumber:
      readOptionalString(consent.abhaNumber) ||
      readOptionalString(patientObj?.abhaNumber) ||
      null,
    uhid:
      readOptionalString(consent.uhid) ||
      readOptionalString(consent.mrd) ||
      readOptionalString(patientObj?.mrd) ||
      readOptionalString(patientObj?.uhid) ||
      null,
    patientMobile:
      readOptionalString(consent.patientMobile) ||
      readOptionalString(consent.mobile) ||
      readOptionalString(patientObj?.phone) ||
      readOptionalString(patientObj?.mobile) ||
      null,
    patientDob:
      readOptionalString(consent.patientDob) ||
      readOptionalString(consent.dob) ||
      readOptionalString(patientObj?.dob) ||
      readOptionalString(patientObj?.dateOfBirth) ||
      null,
    patientAddress:
      readOptionalString(consent.patientAddress) ||
      readOptionalString(consent.address) ||
      readOptionalString(patientObj?.address) ||
      null,
    createdAt:
      readOptionalString(consent.createdAt) ||
      readOptionalString(consent.initiatedAt) ||
      null,
  };
};

export const extractConsents = (payload: unknown): IConsentListItem[] => {
  const root = asObject(payload);
  if (!root) return [];

  const data = asObject(root.data) ?? root;
  const candidates: unknown[] = [];

  if (Array.isArray(data.hiuConsents)) candidates.push(...data.hiuConsents);
  if (Array.isArray(data.consents)) candidates.push(...data.consents);
  if (data.hiuConsent) candidates.push(data.hiuConsent);
  if (data.consent) candidates.push(data.consent);

  const mapped = candidates
    .map((item) => mapConsentItem(item))
    .filter((item): item is IConsentListItem => Boolean(item));

  const seen = new Set<string>();
  return mapped.filter((item) => {
    const key =
      item._id ||
      item.consentId ||
      item.consentRequestId ||
      item.outboundRequestId ||
      `${item.status ?? ""}-${item.initiatedAt ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const extractConsentStatus = (payload: unknown): string | null => {
  const consents = extractConsents(payload);
  if (consents.length) {
    const granted = consents.find(
      (item) => item.status?.trim().toUpperCase() === "GRANTED"
    );
    if (granted?.status) return granted.status;
    return consents[0]?.status ?? null;
  }

  const root = asObject(payload);
  if (!root) return null;
  const data = asObject(root.data) ?? root;
  return readStatusString(data.status) || readStatusString(root.status) || null;
};

export const isConsentGranted = (status: string | null | undefined): boolean =>
  status?.trim().toUpperCase() === "GRANTED";

export const getConsentRecordId = (consent: IConsentListItem): string | null =>
  consent._id?.trim() || null;

/** Hospital patient ID used for health-data SSE (`hospitalPatientId` from consent API). */
export const getConsentStreamPatientId = (consent: IConsentListItem): string | null =>
  consent.patientId?.trim() || null;

/** Full ABDM HI type catalog — always displayed on consent detail. */
export const ALL_CONSENT_HI_TYPES = [
  "Prescription",
  "DischargeSummary",
  "OPConsultation",
  "DiagnosticReport",
  "WellnessRecord",
  "ImmunizationRecord",
  "HealthDocumentRecord",
  "Invoice",
] as const;

const normalizeHiTypeKey = (value: string): string => value.trim().toLowerCase();

const isHiTypeInList = (hiType: string, list: string[]): boolean => {
  const key = normalizeHiTypeKey(hiType);
  return list.some((item) => normalizeHiTypeKey(item) === key);
};

export const isHiTypeInApiResponse = (hiType: string, apiHiTypes: string[]): boolean =>
  isHiTypeInList(hiType, apiHiTypes);

const getApiReturnedHiTypes = (consent: IConsentListItem): string[] => {
  if (consent.requestedHiTypes?.length) return consent.requestedHiTypes;
  if (consent.hiTypes?.length) return consent.hiTypes;
  return [];
};

export const getConsentHiTypeSummary = (
  consent: IConsentListItem
): {
  displayHiTypes: string[];
  apiHiTypes: string[];
  absentHiTypes: string[];
} => {
  const catalogHiTypes = [...ALL_CONSENT_HI_TYPES];
  const apiHiTypes = getApiReturnedHiTypes(consent);
  const presentHiTypes = catalogHiTypes.filter((hiType) =>
    isHiTypeInList(hiType, apiHiTypes)
  );
  const absentHiTypes = catalogHiTypes.filter(
    (hiType) => !isHiTypeInList(hiType, apiHiTypes)
  );
  const displayHiTypes = [...presentHiTypes, ...absentHiTypes];

  return { displayHiTypes, apiHiTypes, absentHiTypes };
};

export const validateConsentInitFields = (params: IConsentInitParams): string | null => {
  if (!params.patientId?.trim()) return "Patient ID is required.";
  if (!params.abhaAddress?.trim()) return "Please select an ABHA address.";
  if (!params.purposeCode?.trim()) return "Please select a purpose.";
  if (!params.dateRangeFrom?.trim()) return "Please select date range from.";
  if (!params.dateRangeTo?.trim()) return "Please select date range to.";
  if (!params.dataEraseAt?.trim()) return "Please select data erase date.";
  if (!params.hiTypes?.length) return "Please select at least one HI type.";
  if (!params.requesterName?.trim()) return "Requester name is required.";

  const from = new Date(params.dateRangeFrom);
  const to = new Date(params.dateRangeTo);
  const eraseAt = new Date(params.dataEraseAt);

  if (Number.isNaN(from.getTime())) return "Invalid date range from.";
  if (Number.isNaN(to.getTime())) return "Invalid date range to.";
  if (Number.isNaN(eraseAt.getTime())) return "Invalid data erase date.";
  if (from > to) return "Date range from must be before date range to.";
  if (eraseAt < to) return "Data erase date must be on or after date range to.";

  return null;
};

export const initConsent = async (params: IConsentInitParams): Promise<unknown> => {
  if (!API_BASE_URL) throw new Error("API base URL is not configured.");

  try {
    const res = await axios.post(`${API_BASE_URL}/hospital/abdm/m3/consent/init`, {
      patientId: params.patientId.trim(),
      abhaAddress: params.abhaAddress.trim(),
      purposeCode: params.purposeCode,
      dateRangeFrom: params.dateRangeFrom,
      dateRangeTo: params.dateRangeTo,
      dataEraseAt: params.dataEraseAt,
      hiTypes: params.hiTypes,
      requesterName: params.requesterName.trim(),
    });
    return res.data?.data ?? res.data;
  } catch (err: unknown) {
    throw new Error(getAxiosMessage(err, "Failed to initiate consent request."));
  }
};

export const getAllConsents = async (params?: {
  page?: number;
  limit?: number;
  status?: TConsentStatusFilter;
  search?: string;
}): Promise<IAllConsentsResult> => {
  if (!API_BASE_URL) throw new Error("API base URL is not configured.");

  const search = params?.search?.trim() ?? "";
  const status = params?.status;
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 10;

  try {
    const res = await axios.get(`${API_BASE_URL}/hospital/abdm/m3/consent`, {
      params: {
        purpose: "M3",
        page,
        limit,
        ...(status && status !== "ALL" ? { status } : {}),
        ...(search ? { search } : {}),
      },
    });
    const payload = res.data;
    const consents = extractConsents(payload);
    const pagination = extractConsentPagination(payload, {
      page,
      limit,
      count: consents.length,
    });

    return {
      consents,
      pagination,
      raw: payload,
    };
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response?.status === 404) {
      return {
        consents: [],
        pagination: {
          total: 0,
          page,
          limit,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false,
        },
        raw: err.response?.data ?? null,
      };
    }
    throw new Error(getAxiosMessage(err, "Failed to fetch consents."));
  }
};

const readPaginationNumber = (value: unknown, fallback: number): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return fallback;
};

const extractConsentPagination = (
  payload: unknown,
  fallback: { page: number; limit: number; count: number }
): IConsentPagination => {
  const root = asObject(payload);
  const data = asObject(root?.data) ?? root;
  const pagination = asObject(data?.pagination) ?? asObject(root?.pagination);

  const page = readPaginationNumber(pagination?.page, fallback.page);
  const limit = readPaginationNumber(pagination?.limit, fallback.limit);
  const total = readPaginationNumber(
    pagination?.total ?? data?.total ?? data?.count ?? data?.totalCount,
    fallback.count
  );
  const totalPages = readPaginationNumber(
    pagination?.totalPages,
    Math.max(1, Math.ceil(total / Math.max(limit, 1)))
  );

  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: Boolean(pagination?.hasNextPage),
    hasPrevPage: Boolean(pagination?.hasPrevPage),
  };
};

export const getConsentStatus = async (patientId: string): Promise<IConsentStatusResult> => {
  if (!API_BASE_URL) throw new Error("API base URL is not configured.");
  if (!patientId?.trim()) {
    return { status: null, consents: [], abhaAddress: null, abhaNumber: null, raw: null };
  }

  try {
    const res = await axios.get(`${API_BASE_URL}/hospital/abdm/m3/consent`, {
      params: {
        patientId: patientId.trim(),
        purpose: "M3",
        page: 1,
        limit: 20,
      },
    });
    const payload = res.data;
    const data = asObject(asObject(payload)?.data) ?? asObject(payload);
    return {
      status: extractConsentStatus(payload),
      consents: extractConsents(payload),
      abhaAddress: readOptionalString(data?.abhaAddress),
      abhaNumber: readOptionalString(data?.abhaNumber),
      raw: payload,
    };
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response?.status === 404) {
      return {
        status: null,
        consents: [],
        abhaAddress: null,
        abhaNumber: null,
        raw: err.response?.data ?? null,
      };
    }
    throw new Error(getAxiosMessage(err, "Failed to fetch consent status."));
  }
};

const mapConsentHipOption = (value: unknown): IConsentHipOption | null => {
  const row = asObject(value);
  if (!row) return null;

  const detail = asObject(row.consentDetail) ?? asObject(row.consentArtefact) ?? asObject(row.artefact);
  const hip = asObject(row.hip) ?? asObject(detail?.hip);

  const consentArtifactId =
    readOptionalString(row.consentArtifactId) ||
    readOptionalString(row.consentArtefactId) ||
    readOptionalString(row.artefactId) ||
    readOptionalString(row.consentId) ||
    readOptionalString(detail?.consentId) ||
    null;

  const hipName =
    readOptionalString(row.hipName) ||
    readOptionalString(hip?.name) ||
    readOptionalString(row.name) ||
    null;

  if (!consentArtifactId || !hipName) return null;

  const artefactGrantedHiTypes = readStringArray(row.grantedHiTypes).length
    ? readStringArray(row.grantedHiTypes)
    : readStringArray(detail?.grantedHiTypes);

  const artefactHiTypes = readStringArray(row.hiTypes).length
    ? readStringArray(row.hiTypes)
    : readStringArray(detail?.hiTypes);

  const grantedHiTypes =
    artefactGrantedHiTypes.length
      ? artefactGrantedHiTypes
      : artefactHiTypes.length === 1
        ? artefactHiTypes
        : [];

  return {
    consentArtifactId,
    hipName,
    hipId: readOptionalString(hip?.id) || readOptionalString(row.hipId),
    hiTypes: artefactHiTypes.length ? artefactHiTypes : grantedHiTypes,
    grantedHiTypes,
  };
};

const collectHipCandidateArrays = (payload: unknown): unknown[] => {
  const root = asObject(payload);
  if (!root) return [];

  const data = asObject(root.data) ?? root;
  const candidates: unknown[] = [];

  const arrayKeys = [
    "consentArtifacts",
    "consentArtefacts",
    "artefacts",
    "artifacts",
    "hips",
    "hiuConsents",
    "consents",
  ];

  for (const key of arrayKeys) {
    const value = data[key];
    if (Array.isArray(value)) candidates.push(...value);
  }

  if (data.hiuConsent) candidates.push(data.hiuConsent);
  if (data.consent) candidates.push(data.consent);
  if (data.consentArtifact) candidates.push(data.consentArtifact);
  if (data.consentArtefact) candidates.push(data.consentArtefact);

  // Some APIs return the detail object itself with nested hip + consentId
  if (candidates.length === 0 && (data.hip || data.consentDetail || data.consentArtifactId)) {
    candidates.push(data);
  }

  return candidates;
};

export const extractConsentHipOptions = (payload: unknown): IConsentHipOption[] => {
  const mapped = collectHipCandidateArrays(payload)
    .map((item) => mapConsentHipOption(item))
    .filter((item): item is IConsentHipOption => Boolean(item));

  const seen = new Set<string>();
  return mapped.filter((item) => {
    const key = `${item.consentArtifactId}::${item.hipName}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const extractConsentDetail = (payload: unknown): IConsentDetailResult => {
  const root = asObject(payload);
  const data = asObject(root?.data) ?? root;

  const directConsent =
    mapConsentItem(data?.hiuConsent) ||
    mapConsentItem(data?.consent) ||
    mapConsentItem(data);

  const consent = directConsent ?? extractConsents(payload)[0] ?? null;
  const hips = extractConsentHipOptions(payload);

  return {
    consent,
    hips,
    raw: payload,
  };
};

export const getConsentDetail = async (consentId: string): Promise<IConsentDetailResult> => {
  if (!API_BASE_URL) throw new Error("API base URL is not configured.");
  if (!consentId?.trim()) throw new Error("Consent ID is required.");

  try {
    const res = await axios.get(
      `${API_BASE_URL}/hospital/abdm/m3/consent/${encodeURIComponent(consentId.trim())}`
    );
    return extractConsentDetail(res.data);
  } catch (err: unknown) {
    throw new Error(getAxiosMessage(err, "Failed to fetch consent details."));
  }
};

export const getConsentById = async (consentId: string): Promise<IConsentHipOption[]> => {
  const detail = await getConsentDetail(consentId);
  return detail.hips;
};

export const getConsentStatusBadgeClass = (status: string | null): string => {
  const normalized = status?.trim().toLowerCase() ?? "";
  if (!normalized) {
    return "badge-soft-secondary border-secondary text-secondary";
  }
  if (
    ["granted", "approved", "active", "completed", "success"].some((value) =>
      normalized.includes(value)
    )
  ) {
    return "badge-soft-success border-success text-success";
  }
  if (
    ["denied", "rejected", "expired", "revoked", "failed", "error"].some((value) =>
      normalized.includes(value)
    )
  ) {
    return "badge-soft-danger border-danger text-danger";
  }
  if (
    ["requested", "pending", "initiated", "in-progress", "inprogress", "processing"].some(
      (value) => normalized.includes(value)
    )
  ) {
    return "badge-soft-warning border-warning text-warning";
  }
  return "badge-soft-info border-info text-info";
};
