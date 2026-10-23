import {
  GeneralInformation,
  PreDialysisAssessment,
  MonitoringReading,
  PostDialysisAssessment,
  Complications,
  TreatmentGiven,
  Signatures,
  DialysisSessionSource,
  SlotDetails
} from "../models/dialysis-session.types";

export interface CreateDialysisSessionDTO {
  visitId?: string;
  patientId?: string; // Optional when daycareAppointmentId is provided
  procedureId?: string;
  daycareAppointmentId?: string;
  ipdId?: string;
  source?: DialysisSessionSource; // auto-derived if not provided
  sessionDate?: string | Date;
  slotId?: string;
  doctorId?: string;
  slotDetails?: SlotDetails;
  generalInformation: GeneralInformation;
  preDialysisAssessment?: PreDialysisAssessment;
  monitoringReadings?: MonitoringReading[];
  postDialysisAssessment?: PostDialysisAssessment;
  complications?: Complications;
  treatmentGiven?: TreatmentGiven;
  signatures?: Signatures;
  status?: "In Progress" | "Completed" | "Cancelled";
}

export interface UpdateDialysisSessionDTO {
  visitId?: string;
  sessionDate?: string | Date;
  slotId?: string;
  doctorId?: string;
  slotDetails?: SlotDetails;
  generalInformation?: Partial<GeneralInformation>;
  preDialysisAssessment?: Partial<PreDialysisAssessment>;
  monitoringReadings?: MonitoringReading[];
  postDialysisAssessment?: Partial<PostDialysisAssessment>;
  complications?: Partial<Complications>;
  treatmentGiven?: Partial<TreatmentGiven>;
  signatures?: Partial<Signatures>;
  status?: "In Progress" | "Completed" | "Cancelled";
}

export interface AddMonitoringReadingDTO {
  reading: MonitoringReading;
}

export interface DialysisSessionResponseDTO {
  sessionId: string;
  visitId: string;
  patientId: string;
  procedureId?: string;
  daycareAppointmentId?: string | null;
  ipdId?: string | null;
  source: DialysisSessionSource;
  sessionDate?: Date | null;
  slotId?: string | null;
  doctorId?: string | null;
  slotDetails?: SlotDetails;
  generalInformation: GeneralInformation;
  preDialysisAssessment?: PreDialysisAssessment;
  monitoringReadings: MonitoringReading[];
  postDialysisAssessment?: PostDialysisAssessment;
  complications?: Complications;
  treatmentGiven?: TreatmentGiven;
  signatures?: Signatures;
  status: "In Progress" | "Completed" | "Cancelled";
  createdAt: Date;
  updatedAt: Date;
  visit?: any;
  patient?: any;
}
