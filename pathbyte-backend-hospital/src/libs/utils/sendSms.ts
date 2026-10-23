import axios from "axios";
import { logger } from "@src/config/logger";

/**
 * Send an SMS via KYI Solutions API.
 * Returns true if sent successfully, false otherwise (non-fatal — caller should not throw).
 */
export async function sendSms(phone: string, message: string): Promise<boolean> {
  const apiKey    = process.env.KYI_SMS_API_KEY;
  const apiUrl    = process.env.KYI_SMS_API_URL;
  const senderId  = process.env.KYI_SMS_SENDER_ID;

  if (!apiKey || !apiUrl || !senderId) {
    logger.warn("sendSms: KYI SMS env vars not configured — skipping");
    return false;
  }

  // Normalize to 10 digits (strip +91 or country code prefix)
  const clean = phone.replace(/^\+91/, "").replace(/\D/g, "");
  if (clean.length !== 10) {
    logger.error({ phone }, "sendSms: invalid phone number format");
    return false;
  }

  const url = `${apiUrl}?apikey=${apiKey}&senderid=${senderId}&number=${clean}&message=${encodeURIComponent(message)}&format=json`;

  try {
    const response = await axios.get(url, { timeout: 10_000 });

    if (response.data?.status === "success") {
      logger.info({ phone: clean }, "sendSms: SMS sent successfully");
      return true;
    }

    logger.error({ phone: clean, responseData: response.data }, "sendSms: API returned non-success");
    return false;
  } catch (err: any) {
    logger.error({ err: err.message, phone: clean }, "sendSms: request failed");
    return false;
  }
}
