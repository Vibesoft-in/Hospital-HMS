export type TFhirSourceType = "Visit" | "Daycare" | "IPD" | "Case";

export type TFhirHiType =
  | "DischargeSummary"
  | "OPConsultation"
  | "Prescription"
  | "DiagnosticReport"
  | "ImmunizationRecord"
  | "HealthDocumentRecord"
  | "WellnessRecord"
  | "Invoice";

export interface IFhirHiTypeOption {
  value: TFhirHiType;
  label: string;
}

export const FHIR_HI_TYPE_OPTIONS: IFhirHiTypeOption[] = [
  { value: "DischargeSummary", label: "Discharge Summary" },
  { value: "OPConsultation", label: "OP Consultation" },
  { value: "Prescription", label: "Prescription" },
  { value: "DiagnosticReport", label: "Diagnostic Report" },
  { value: "ImmunizationRecord", label: "Immunization Record" },
  { value: "HealthDocumentRecord", label: "Health Document Record" },
  { value: "WellnessRecord", label: "Wellness Record" },
  { value: "Invoice", label: "Invoice" },
];

export interface IFhirDiagnosisItem {
  icdCode: string;
  diagnosisName: string;
}

export interface IFhirMedicationItem {
  medicineName: string;
  dosage: string;
  frequency: string;
  duration: string;
  route: string;
  timing?: string;
  instructions?: string;
  quantity?: number;
}

export interface IFhirInvestigationItem {
  testName: string;
  result: string;
  date: string;
  notes?: string;
}

export interface IFhirProcedureItem {
  procedureName: string;
  date: string;
  notes?: string;
}

export interface IFhirInvestigationAdvisedItem {
  testName: string;
  notes: string;
}

export interface IFhirWomenHealth {
  menstrualCycle: string;
  pregnancyStatus: string;
}

export interface IFhirTestResultItem {
  testName: string;
  value: string;
  unit: string;
  referenceRange: string;
  status: string;
  notes?: string;
}

export interface IFhirVitalSigns {
  bloodPressureSystolic: number | "";
  bloodPressureDiastolic: number | "";
  heartRate: number | "";
  temperature: number | "";
  respiratoryRate: number | "";
  oxygenSaturation: number | "";
  height: number | "";
  weight: number | "";
  bmi: number | "";
}

export interface IFhirAttachment {
  s3Key: string;
  title: string;
  contentType: string;
  url?: string;
  signedUrl?: string;
  originalUrl?: string;
  data?: string;
}

export interface IFhirHealthRecordMetadata {
  date: string;
  authorId: string;
}

export interface IFhirDischargeSummaryData {
  patientName: string;
  patientAge: number | "";
  patientGender: string;
  patientMRD: string;
  patientPhone: string;
  patientAddress: string;
  admissionDate: string;
  dischargeDate: string;
  dischargeType: string;
  attendingDoctorName: string;
  wardName: string;
  bedNumber: string;
  chiefComplaints: string;
  presentIllnessHistory: string;
  pastMedicalHistory: string;
  familyHistory: string;
  physicalExamination: string;
  allergies: string[];
  provisionalDiagnosis: IFhirDiagnosisItem[];
  finalDiagnosis: IFhirDiagnosisItem[];
  clinicalSummary: string;
  courseInHospital: string;
  treatmentGiven: string;
  conditionOnDischarge: string;
  investigations: IFhirInvestigationItem[];
  dischargeBp: string;
  dischargePulse: string;
  dischargeSpO2: string;
  dischargeTemp: string;
  proceduresPerformed: IFhirProcedureItem[];
  medicinesOnDischarge: IFhirMedicationItem[];
  adviceOnDischarge: string[];
  followUpDate: string;
  followUpInstructions: string;
}

export interface IFhirOPConsultationData {
  patientName: string;
  patientAge: number | "";
  patientGender: string;
  patientMRD: string;
  patientPhone: string;
  visitDate: string;
  visitType: string;
  attendingDoctorName: string;
  chiefComplaints: string;
  presentIllnessHistory: string;
  pastHistory: string;
  familyHistory: string;
  physicalExamination: string;
  allergies: string[];
  provisionalDiagnosis: IFhirDiagnosisItem[];
  finalDiagnosis: IFhirDiagnosisItem[];
  investigationsAdvised: IFhirInvestigationAdvisedItem[];
  medications: IFhirMedicationItem[];
  advice: string[];
  followUpDate: string;
  followUpInstructions: string;
}

export interface IFhirPrescriptionData {
  patientName: string;
  patientAge: number | "";
  patientGender: string;
  patientMRD: string;
  prescribedDate: string;
  attendingDoctorName: string;
  diagnosis: string;
  validityDays: number | "";
  medications: IFhirMedicationItem[];
  advice: string[];
  followUpDate: string;
}

export interface IFhirDiagnosticReportData {
  patientName: string;
  patientAge: number | "";
  patientGender: string;
  patientMRD: string;
  reportType: string;
  reportDate: string;
  attendingDoctorName: string;
  specimenType: string;
  specimenCollectedAt: string;
  testResults: IFhirTestResultItem[];
  clinicalInterpretation: string;
  conclusion: string;
  recommendations: string[];
}

export interface IFhirImmunizationRecordData {
  patientName: string;
  patientAge: number | "";
  patientGender: string;
  patientMRD: string;
  vaccineName: string;
  vaccineCode: string;
  manufacturer: string;
  lotNumber: string;
  expirationDate: string;
  administeredDate: string;
  administeredBy: string;
  site: string;
  route: string;
  doseNumber: number | "";
  seriesName: string;
  nextDueDate: string;
  reactions: string;
}

export interface IFhirHealthDocumentRecordData {
  patientName: string;
  patientAge: number | "";
  patientGender: string;
  patientMRD: string;
  documentType: string;
  documentTitle: string;
  documentDate: string;
  issuedBy: string;
  description: string;
  notes: string;
}

export interface IFhirWellnessRecordData {
  patientName: string;
  patientAge: number | "";
  patientGender: string;
  patientMRD: string;
  checkupDate: string;
  checkupType: string;
  attendingDoctorName: string;
  vitalSigns: IFhirVitalSigns;
  generalExamination: string;
  systemicExamination: string;
  smokingStatus: string;
  alcoholConsumption: string;
  exerciseFrequency: string;
  womenHealth: IFhirWomenHealth;
  healthStatus: string;
  recommendations: string[];
  observations: string;
}

export interface IFhirInvoiceLineItem {
  sequence: number | "";
  itemName: string;
  hsnCode?: string;
  itemType: string;
  quantity: number | "";
  unit: string;
  rate: number | "";
  mrp?: number | "";
  discount?: number | "";
  cgst?: number | "";
  sgst?: number | "";
  total: number | "";
  batchNumber?: string;
  expiryDate?: string;
}

export interface IFhirInvoiceData {
  patientName: string;
  patientAge: number | "";
  patientGender: string;
  patientMRD: string;
  patientPhone: string;
  patientAddress: string;
  invoiceNumber: string;
  invoiceDate: string;
  invoiceType: string;
  billingCode: string;
  status: string;
  attendingDoctorName: string;
  lineItems: IFhirInvoiceLineItem[];
  totalGross: number | "";
  totalNet: number | "";
  notes: string;
}

export type TFhirHealthRecordData =
  | IFhirDischargeSummaryData
  | IFhirOPConsultationData
  | IFhirPrescriptionData
  | IFhirDiagnosticReportData
  | IFhirImmunizationRecordData
  | IFhirHealthDocumentRecordData
  | IFhirWellnessRecordData
  | IFhirInvoiceData;

export interface IFhirHealthRecordPayload {
  sourceType: TFhirSourceType;
  sourceId: string;
  hiType: TFhirHiType;
  metadata: IFhirHealthRecordMetadata;
  data: Record<string, unknown>;
  attachments: IFhirAttachment[];
}

export interface IFhirHealthRecordListItem {
  fhirId?: string;
  _id?: string;
  id?: string;
  sourceType?: TFhirSourceType | string;
  sourceId?: string;
  hiType?: TFhirHiType | string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  finalizedAt?: string;
  linkedToAbdm?: boolean;
  fhirBundle?: Record<string, unknown>;
  metadata?: {
    status?: string;
    date?: string;
    authorId?: string;
    authorName?: string;
    organizationName?: string;
  };
  data?: Record<string, unknown>;
  dischargeSummaryData?: Record<string, unknown> | null;
  opConsultData?: Record<string, unknown> | null;
  prescriptionData?: Record<string, unknown> | null;
  diagnosticReportData?: Record<string, unknown> | null;
  immunizationData?: Record<string, unknown> | null;
  healthDocumentData?: Record<string, unknown> | null;
  wellnessData?: Record<string, unknown> | null;
  invoiceData?: Record<string, unknown> | null;
  attachments?: IFhirAttachment[];
}

export interface IFhirHealthRecordListResult {
  records: IFhirHealthRecordListItem[];
  total: number;
  page: number;
  limit: number;
}
