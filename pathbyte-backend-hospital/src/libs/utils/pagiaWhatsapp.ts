import axios from "axios";
import { logger } from "@src/config/logger";
import { formatAppointmentDate } from "./hospitalWhatsapp";

const PAGIA_WHATSAPP_SUBDOMAIN = "pagiaksp";
const PAGIA_WHATSAPP_TEMPLATE_ID = "6aad45911ce5742db32b882f";
const PAGIA_WHATSAPP_URL = `https://${PAGIA_WHATSAPP_SUBDOMAIN}.whatsbyte.com/api/whatsapp/external/send-template`;

interface PagiaVisitWhatsappParams {
  phone: string;
  patientName: string;
  appointmentId: string;
  doctorName: string;
  appointmentDate: Date | string;
  appointmentTime: string;
  tokenNo?: string | number;
}

/**
 * Sends the pagia_appointment_registration WhatsApp template via the
 * Pagia external WhatsApp API (whatsbyte.com).
 * Non-fatal — logs errors but does not throw.
 */
export async function sendPagiaVisitWhatsapp(params: PagiaVisitWhatsappParams): Promise<void> {
  const apiKey = process.env.PAGIA_WHATSAPP_API_KEY;
  if (!apiKey) {
    logger.warn("PAGIA_WHATSAPP_API_KEY is not set — skipping Pagia WhatsApp");
    return;
  }

  const normalizedPhone = params.phone.replace(/^\+/, "");

  try {
    await axios.post(
      PAGIA_WHATSAPP_URL,
      {
        whatsapp_id: normalizedPhone,
        templateId: PAGIA_WHATSAPP_TEMPLATE_ID,
        variables: {
          name: params.patientName,
          appointment_id: params.appointmentId,
          dr_name: params.doctorName || "N/A",
          appointment_date: formatAppointmentDate(params.appointmentDate),
          appointment_time: params.appointmentTime || "N/A",
          token_no: params.tokenNo !== undefined && params.tokenNo !== "" ? String(params.tokenNo) : "N/A",
        },
      },
      {
        headers: {
          "x-api-key": apiKey,
          "Content-Type": "application/json",
        },
      }
    );

    logger.info({ phone: normalizedPhone, appointmentId: params.appointmentId }, "Pagia visit WhatsApp sent");
  } catch (error: any) {
    logger.warn(
      { phone: normalizedPhone, appointmentId: params.appointmentId, error: error.message },
      "Failed to send Pagia visit WhatsApp — non-fatal"
    );
  }
}
