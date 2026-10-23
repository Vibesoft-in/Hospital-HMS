import { sendTemplateMessage } from "./WhatsappMessaging";
import { createBodyComponents } from "./templateComponents/whatsappMessaging";
import { logger } from "@src/config/logger";

interface AppointmentNotificationParams {
  phone: string;
  patientName: string;
  appointmentId: string;
  serviceType: string;
  doctorName: string;
  appointmentDate: string; // ISO or Date string — will be formatted internally
  appointmentTime: string;
  tokenNo?: string | number; // Optional — omit for daycare
}

/** Formats a date string/Date to "29 Apr 2026" */
export function formatAppointmentDate(date: Date | string): string {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return String(date);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

/** Maps visit type + appointment type to a human-readable service_type string */
export function resolveVisitServiceType(visitType: string, appointmentType: string): string {
  if (appointmentType === "Day Care") return "Daycare Procedure";
  switch (visitType) {
    case "New":             return "OPD Appointment";
    case "Follow-up":       return "Follow-Up Visit";
    case "Follow-up-report": return "Follow-Up Report";
    case "Emergency":       return "Emergency Registration";
    case "MR":              return "MR Visit";
    default:                return "OPD Appointment";
  }
}

/**
 * Sends the jjm_appointment_registration WhatsApp template to the patient.
 * Non-fatal — logs errors but does not throw.
 * Pass tokenNo as undefined/omit for daycare (renders as empty string).
 */
export async function sendAppointmentRegistrationWhatsapp(
  params: AppointmentNotificationParams
): Promise<void> {
  const {
    phone,
    patientName,
    appointmentId,
    serviceType,
    doctorName,
    appointmentDate,
    appointmentTime,
    tokenNo,
  } = params;

  // Normalize phone: strip leading +
  const normalizedPhone = phone.replace(/^\+/, "");

  try {
    const components = createBodyComponents({
      name: patientName,
      appointment_id: appointmentId,
      service_type: serviceType,
      dr_name: doctorName,
      appointment_date: formatAppointmentDate(appointmentDate),
      appointment_time: appointmentTime || "N/A",
      token_no: tokenNo !== undefined && tokenNo !== "" ? String(tokenNo) : "N/A",
    });

    await sendTemplateMessage({
      to: normalizedPhone,
      templateName: "jjm_appointment_registration",
      languageCode: "en",
      components,
      logMeta: {
        context: "visit-registration",
        referenceId: appointmentId,
        referenceType: "visit",
        patientName,
        patientPhone: normalizedPhone,
        templateParams: { name: patientName, appointment_id: appointmentId, service_type: serviceType, dr_name: doctorName },
      },
    });

    logger.info(
      { phone: normalizedPhone, appointmentId },
      "Appointment registration WhatsApp sent"
    );
  } catch (error: any) {
    logger.warn(
      { phone: normalizedPhone, appointmentId, error: error.message },
      "Failed to send appointment registration WhatsApp — non-fatal"
    );
  }
}
