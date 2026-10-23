import { SendTemplateMessageOptions } from "./WhatsappMessaging.dto";
import { FormData, File } from "formdata-node";
import { FormDataEncoder } from "form-data-encoder";
import { Readable } from "stream";
import axios from "axios";
import whatsappLogService from "@src/modules/whatsapp-log/services/whatsapp-log.service";

export async function sendTemplateMessage({
  to,
  templateName,
  languageCode,
  components = [],
  logMeta,
}: SendTemplateMessageOptions): Promise<any> {
  const url = `https://graph.facebook.com/v23.0/${process.env.phoneNumberId}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
      components,
    },
  };

  try {
    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${process.env.accessToken}`,
        "Content-Type": "application/json",
      },
    });

    // Log success (fire-and-forget)
    if (logMeta) {
      whatsappLogService.log({
        to,
        templateName,
        templateParams: logMeta.templateParams,
        context: logMeta.context,
        referenceId: logMeta.referenceId,
        referenceType: logMeta.referenceType,
        patientId: logMeta.patientId,
        patientName: logMeta.patientName,
        patientPhone: logMeta.patientPhone,
        status: "sent",
        whatsappMessageId: response.data?.messages?.[0]?.id,
      });
    }

    return response.data;
  } catch (error: any) {
    // Log failure (fire-and-forget)
    if (logMeta) {
      const reason =
        error.response?.data?.error?.message ||
        error.response?.data ||
        error.message;
      whatsappLogService.log({
        to,
        templateName,
        templateParams: logMeta.templateParams,
        context: logMeta.context,
        referenceId: logMeta.referenceId,
        referenceType: logMeta.referenceType,
        patientId: logMeta.patientId,
        patientName: logMeta.patientName,
        patientPhone: logMeta.patientPhone,
        status: "failed",
        failureReason: typeof reason === "string" ? reason : JSON.stringify(reason),
      });
    }

    console.error(
      "Error sending template message:",
      error.response?.data || error.message
    );
    throw error;
  }
}

export async function uploadPdfToWhatsapp(pdfBuffer: Buffer, fileName: string) {
  const url = `https://graph.facebook.com/v23.0/${process.env.phoneNumberId}/media`;
  const form = new FormData();

  form.set("messaging_product", "whatsapp");
  form.set(
    "file",
    new File([pdfBuffer], fileName, { type: "application/pdf" })
  );

  const encoder = new FormDataEncoder(form);
  const stream = Readable.from(encoder.encode());

  const headers = {
    ...encoder.headers,
    Authorization: `Bearer ${process.env.accessToken}`,
  };

  const resp = await axios.post(url, stream, {
    headers,
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
  });

  return resp.data;
}
