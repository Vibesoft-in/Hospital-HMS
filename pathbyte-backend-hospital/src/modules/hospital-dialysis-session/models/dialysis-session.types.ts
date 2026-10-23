import { Document, Model } from "mongoose";

export interface GeneralInformation {
  machineNumber?: string;
  uhid?: string;
  technicianName?: string;
  fiberVolume?: string;
  height?: string;
  heparinUse?: string;
  preHdWeightToday?: string;
  lastPostHdWeight?: string;
  weightGain?: string;
  targetWeightLoss?: string;
  postHdWeightToday?: string;
  actualWeightLoss?: string;
  remainingWeightLoss?: string;
  targetDryWeight?: string;
  dialyzerUsageSingleUse?: boolean;
  dialyzerUsageReuse?: boolean;
  timesReused?: string;
  vascularAccessPresent?: boolean;
  centralLineYes?: boolean;
  centralLineNo?: boolean;
  centralLineIJV?: boolean;
  centralLineFemoral?: boolean;
  avfSelected?: boolean;
  avgSelected?: boolean;
  ijvSelected?: boolean;
  femoralSelected?: boolean;
  tunneledCatheter?: boolean;
  avfNeedleSize16G?: boolean;
  avfNeedleSize17G?: boolean;
  avfNeedleSizeOthers?: boolean;
  avfNeedleSizeOthersValue?: string;
  bruitThrillPresent?: boolean;
  bruitThrillAbsent?: boolean;
  bruitThrillNotApplicable?: boolean;
  bolus?: string;
  hourly?: string;
  startTime?: string;
  endTime?: string;
}

export interface PreDialysisAssessment {
  bpStartHd?: string;
  spo2?: string;
  bodyTemperature?: string;
  pulse?: string;
}

export interface MonitoringReading {
  timeOnHd: string;
  pr?: string;
  bp?: string;
  bfr?: string;
  dfr?: string;
  ufr?: string;
  totalUf?: string;
  temperature?: string;
  dyna?: string;
  heparin?: string;
  rbs?: string;
}

export interface PostDialysisAssessment {
  pulse?: string;
  bp?: string;
  bodyTemperature?: string;
  postHdWeight?: string;
  postHdWeightField2?: string;
  ufRemoved?: string;
  prolongedBleedingField1?: string;
  prolongedBleedingField2?: string;
  bruitThrillAvfAvgField1?: string;
  bruitThrillAvfAvgField2?: string;
  bruitThrillAvfAvgField3?: string;
  ktVAchieved?: string;
}

export interface Complications {
  headache?: boolean;
  rash?: boolean;
  dyspnea?: boolean;
  seizures?: boolean;
  fever?: boolean;
  cramps?: boolean;
  chestPain?: boolean;
  dialyzerReaction?: boolean;
  hypotension?: boolean;
  rigor?: boolean;
  vomiting?: boolean;
  pruritus?: boolean;
  formSibring?: boolean;
  hypoglycemia?: boolean;
  hypertension?: boolean;
  other?: string;
  noComplication?: boolean;
}

export interface TreatmentGiven {
  epoDosage?: string;
  epoGivenBy?: string;
  patientSignature?: string;
  ivIronDose?: string;
  bloodTransfusionField1?: string;
  bloodTransfusionField2?: string;
  numberOfUnits?: string;
  bloodBankName?: string;
  typeOfBlood?: string;
  otherTreatmentGivenDrug?: string;
}

export interface Signatures {
  technicianSignature?: string;
  doctorInCharge?: string;
  patientSignature?: string;
}

export interface SlotDetails {
  name?: string;
  startTime?: string;
  endTime?: string;
}

export type DialysisSessionSource = "daycare" | "ipd" | "manual";

export interface DialysisSession {
  sessionId: string;
  visitId?: string;
  patientId: string;
  procedureId?: string;
  daycareAppointmentId?: string | null;
  ipdId?: string | null; // Optional link to HospitalIPD
  source: DialysisSessionSource; // "daycare" | "ipd" | "manual"
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
  isDeleted?: boolean;
  deletedAt?: Date;
  deletedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface DialysisSessionDoc extends DialysisSession, Document {}

export interface DialysisSessionModel extends Model<DialysisSessionDoc> {
  createDialysisSession(newSession: DialysisSession): Promise<DialysisSession>;
  readDialysisSessions(query: any, search: any, skip: number, limit: number): Promise<any>;
  readDialysisSession(sessionId: string): Promise<any>;
  readDialysisSessionById(id: string): Promise<any>;
  updateDialysisSession(sessionId: string, updates: Partial<DialysisSession>): Promise<DialysisSession>;
  deleteDialysisSession(sessionId: string, deletedBy?: string): Promise<void>;
  restoreDialysisSession(sessionId: string): Promise<DialysisSession>;
  getSessionsByVisit(visitId: string, filter?: any): Promise<any[]>;
  getSessionsByPatient(patientId: string, skip: number, limit: number, filter?: any): Promise<any>;
  addMonitoringReading(sessionId: string, reading: MonitoringReading): Promise<DialysisSession>;
}
