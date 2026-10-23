import { Document, Model } from "mongoose";

export type WhatsappLogContext =
  | "visit-registration"
  | "daycare-registration"
  | "case-registration"
  | "case-signoff"
  | "manual-welcome"
  | "manual-report";

export type WhatsappLogStatus = "sent" | "failed";

export interface WhatsappLog {
  to: string;                          // normalized phone number
  templateName: string;
  templateParams?: Record<string, any>; // body params passed to template
  context: WhatsappLogContext;
  referenceId?: string;                // visitId, daycareId, caseId etc.
  referenceType?: string;              // "visit" | "daycare" | "case"
  patientId?: string;
  patientName?: string;
  patientPhone?: string;
  status: WhatsappLogStatus;
  whatsappMessageId?: string;          // Meta messages[0].id on success
  failureReason?: string;
  createdAt?: Date;
}

export interface WhatsappLogDoc extends WhatsappLog, Document {}

export interface WhatsappLogModel extends Model<WhatsappLogDoc> {}
