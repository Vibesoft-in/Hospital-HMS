import axios from "axios";
import { API_BASE_URL } from "@/environment";

const getAxiosMessage = (err: unknown, fallback: string): string => {
  if (!axios.isAxiosError(err)) return fallback;
  const data = err.response?.data;

  if (data instanceof Blob) {
    return fallback;
  }

  if (data && typeof data === "object") {
    const payload = data as { message?: unknown; error?: unknown };
    if (typeof payload.message === "string" && payload.message.trim()) {
      return payload.message;
    }
    if (typeof payload.error === "string" && payload.error.trim()) {
      return payload.error;
    }
  }

  return fallback;
};

export const fetchAbhaScanAndShareQr = async (counterId: string): Promise<Blob> => {
  if (!API_BASE_URL) throw new Error("API base URL is not configured.");

  const trimmedCounterId = counterId.trim();
  if (!trimmedCounterId) throw new Error("Please enter a counter ID.");

  try {
    const res = await axios.get(
      `${API_BASE_URL}/hospital/abdm/scan-and-share/qr/${encodeURIComponent(trimmedCounterId)}`,
      {
        responseType: "blob",
      }
    );

    const contentType = String(res.headers?.["content-type"] ?? "");
    if (contentType.includes("application/json")) {
      const text = await (res.data as Blob).text();
      try {
        const parsed = JSON.parse(text) as { message?: string; error?: string };
        throw new Error(parsed.message || parsed.error || "Failed to generate ABHA QR.");
      } catch (parseErr) {
        if (parseErr instanceof Error && parseErr.message !== "Failed to generate ABHA QR.") {
          throw parseErr;
        }
        throw new Error("Failed to generate ABHA QR.");
      }
    }

    if (!(res.data instanceof Blob) || res.data.size === 0) {
      throw new Error("Invalid QR image response.");
    }

    return res.data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response?.data instanceof Blob) {
      try {
        const text = await err.response.data.text();
        const parsed = JSON.parse(text) as { message?: string; error?: string };
        if (parsed.message?.trim()) throw new Error(parsed.message);
        if (parsed.error?.trim()) throw new Error(parsed.error);
      } catch (innerErr) {
        if (innerErr instanceof Error && innerErr.message !== "Failed to generate ABHA QR.") {
          throw innerErr;
        }
      }
    }
    throw new Error(getAxiosMessage(err, "Failed to generate ABHA QR."));
  }
};

interface IPhrVisitRecordRaw {
  [key: string]: unknown;
}

interface IPhrVisitsResponsePayload {
  visits?: IPhrVisitRecordRaw[];
  records?: IPhrVisitRecordRaw[];
  data?: IPhrVisitRecordRaw[];
  pagination?: {
    total?: unknown;
    currentPage?: unknown;
    limit?: unknown;
    totalPages?: unknown;
  };
}

export interface IPhrVisitsPagination {
  total: number;
  currentPage: number;
  limit: number;
  totalPages: number;
}

export interface IFetchAbdmPhrVisitsResponse {
  visits: IPhrVisitRecordRaw[];
  pagination: IPhrVisitsPagination;
}

const toNumber = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const fetchAbdmPhrVisits = async (
  page = 1,
  limit = 20
): Promise<IFetchAbdmPhrVisitsResponse> => {
  if (!API_BASE_URL) throw new Error("API base URL is not configured.");

  try {
    const res = await axios.get(`${API_BASE_URL}/hospital/abdm/phr-visits`, {
      params: {
        date: "today",
        page,
        limit,
      },
    });

    const payload = res.data?.data as IPhrVisitsResponsePayload | undefined;
    const visits = Array.isArray(payload?.visits)
      ? payload.visits
      : Array.isArray(payload?.records)
        ? payload.records
        : Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(res.data?.data)
            ? (res.data.data as IPhrVisitRecordRaw[])
            : [];

    const paginationSource = payload?.pagination;
    const pagination: IPhrVisitsPagination = {
      total: toNumber(paginationSource?.total, 0),
      currentPage: toNumber(paginationSource?.currentPage, page),
      limit: toNumber(paginationSource?.limit, limit),
      totalPages: toNumber(paginationSource?.totalPages, 0),
    };

    return { visits, pagination };
  } catch (err: unknown) {
    throw new Error(getAxiosMessage(err, "Failed to load scanned ABHA users."));
  }
};
