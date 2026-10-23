export interface TemplateComponent {
  type: string;
  parameters?: Array<{
    type: string;
    text?: string;
    image?: { link: string };
    document?: { id?: any,link?: string; filename?: string };
    video?: { link: string };
    [key: string]: any;
  }>;
  [key: string]: any;
}

import { WhatsappLogContext } from "@src/modules/whatsapp-log/models/whatsapp-log.types";

export interface WhatsappLogMeta {
  context: WhatsappLogContext;
  referenceId?: string;
  referenceType?: string;
  patientId?: string;
  patientName?: string;
  patientPhone?: string;
  templateParams?: Record<string, any>;
}

export interface SendTemplateMessageOptions {
  to: string;
  templateName: string;
  languageCode: string;
  components?: TemplateComponent[];
  /** Optional — when provided, the result is written to WhatsApp logs */
  logMeta?: WhatsappLogMeta;
}