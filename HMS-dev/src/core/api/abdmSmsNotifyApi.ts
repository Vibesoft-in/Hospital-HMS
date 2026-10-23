import axios from "axios";
import { API_BASE_URL } from "@/environment";

const getAxiosMessage = (err: unknown, fallback: string): string => {
  if (!axios.isAxiosError(err)) return fallback;
  const data = err.response?.data as { message?: unknown; error?: unknown } | undefined;
  if (typeof data?.message === "string" && data.message.trim()) return data.message;
  if (typeof data?.error === "string" && data.error.trim()) return data.error;
  return fallback;
};

export const normalizePatientPhoneNo = (phone: string | null | undefined): string | null => {
  if (!phone?.trim()) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits;
};

export const notifyPatientSms = async (phoneNo: string): Promise<void> => {
  if (!API_BASE_URL) throw new Error("API base URL is not configured.");

  const normalizedPhone = normalizePatientPhoneNo(phoneNo);
  if (!normalizedPhone) throw new Error("Patient phone number is not available.");

  try {
    const res = await axios.post(`${API_BASE_URL}/hospital/abdm/m2/sms-notify`, {
      phoneNo: normalizedPhone,
    });
    const code = res.data?.code;
    if (code != null && code !== 200 && code !== 201) {
      throw new Error(res.data?.message ?? "Failed to notify patient.");
    }
  } catch (err) {
    throw new Error(getAxiosMessage(err, "Failed to notify patient."));
  }
};
