import { Document, Model } from "mongoose";

export type XraySessionSource = "daycare" | "ipd" | "manual";

export interface XraySession {
  sessionId: string;
  xrayTokenId?: number;        // Daily sequential token number (1, 2, 3...)
  xrayTokenDisplay?: string;   // Display string: "X0001" or "U0001"
  tokenDate?: string;           // YYYY-MM-DD — scopes the daily counter
  isUltrasound?: boolean;       // true = ultrasound session (token prefix U), false/undefined = xray (prefix X)
  visitId?: string;
  patientId: string;
  procedureId?: string;
  daycareAppointmentId?: string | null;
  ipdId?: string | null;
  source: XraySessionSource;
  // Xray-specific fields
  bodyPart?: string;
  projectionType?: string;       // e.g. AP, Lateral, PA, Oblique
  technique?: string;
  contrast?: string;
  radiologistName?: string;
  findings?: string;
  impression?: string;
  reportDate?: Date;
  reportHtml?: string;           // HTML report string from frontend
  docUrl?: string;               // S3 key — store original, serve as signed URL
  status: "Pending" | "In Progress" | "Completed" | "Cancelled";
  isDeleted?: boolean;
  deletedAt?: Date;
  deletedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface XraySessionDoc extends XraySession, Document {}

export interface XraySessionModel extends Model<XraySessionDoc> {
  createXraySession(newSession: XraySession): Promise<XraySession>;
  readXraySessions(query: any, search: any, skip: number, limit: number): Promise<any>;
  readXraySession(sessionId: string): Promise<any>;
  readXraySessionById(id: string): Promise<any>;
  readXrayTokenQueue(date: string): Promise<any[]>;
  updateXraySession(sessionId: string, updates: Partial<XraySession>): Promise<XraySession>;
  deleteXraySession(sessionId: string, deletedBy?: string): Promise<void>;
  getSessionsByVisit(visitId: string): Promise<any[]>;
  getSessionsByPatient(patientId: string, skip: number, limit: number): Promise<any>;
}
