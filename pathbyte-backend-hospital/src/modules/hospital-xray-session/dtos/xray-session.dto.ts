import { XraySessionSource } from "../models/xray-session.types";

export interface CreateXraySessionDTO {
  visitId?: string;
  patientId?: string;
  procedureId?: string;
  daycareAppointmentId?: string;
  ipdId?: string;
  source?: XraySessionSource;
  tokenDate?: string;
  isUltrasound?: boolean;
  bodyPart?: string;
  projectionType?: string;
  technique?: string;
  contrast?: string;
  radiologistName?: string;
  findings?: string;
  impression?: string;
  reportDate?: string;
  reportHtml?: string;
  docUrl?: string;
  status?: "Pending" | "In Progress" | "Completed" | "Cancelled";
}

export interface UpdateXraySessionDTO {
  isUltrasound?: boolean;
  bodyPart?: string;
  projectionType?: string;
  technique?: string;
  contrast?: string;
  radiologistName?: string;
  findings?: string;
  impression?: string;
  reportDate?: string;
  reportHtml?: string;
  docUrl?: string;
  status?: "Pending" | "In Progress" | "Completed" | "Cancelled";
}

export interface XraySessionResponseDTO {
  sessionId: string;
  xrayTokenId?: number;
  xrayTokenDisplay?: string;
  tokenDate?: string;
  isUltrasound?: boolean;
  visitId?: string;
  patientId: string;
  procedureId?: string;
  daycareAppointmentId?: string | null;
  ipdId?: string | null;
  source: XraySessionSource;
  bodyPart?: string;
  projectionType?: string;
  technique?: string;
  contrast?: string;
  radiologistName?: string;
  findings?: string;
  impression?: string;
  reportDate?: string;
  reportHtml?: string;
  docUrl?: string;               // signed URL on response; send original S3 key on create/update
  status: "Pending" | "In Progress" | "Completed" | "Cancelled";
  createdAt: Date;
  updatedAt: Date;
  patient?: any;
  procedure?: any;
}
