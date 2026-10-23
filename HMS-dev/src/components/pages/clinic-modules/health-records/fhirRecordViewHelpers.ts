import dayjs from "dayjs";
import type { IFhirAttachment, TFhirHiType } from "@/core/types/fhirHealthRecord";

export interface IFhirViewRow {
  label: string;
  value: string;
}

export interface IFhirViewSection {
  title: string;
  rows: IFhirViewRow[];
  lists: Array<{ label: string; items: string[] }>;
}

const FIELD_LABELS: Record<string, string> = {
  patientName: "Patient Name",
  patientAge: "Age",
  patientGender: "Gender",
  patientMRD: "MRD / UHID",
  patientPhone: "Phone",
  patientAddress: "Address",
  admissionDate: "Admission Date",
  dischargeDate: "Discharge Date",
  dischargeType: "Discharge Type",
  attendingDoctorName: "Attending Doctor",
  wardName: "Ward",
  bedNumber: "Bed",
  chiefComplaints: "Chief Complaints",
  presentIllnessHistory: "Present Illness History",
  pastMedicalHistory: "Past Medical History",
  pastHistory: "Past History",
  familyHistory: "Family History",
  physicalExamination: "Physical Examination",
  clinicalSummary: "Clinical Summary",
  courseInHospital: "Course in Hospital",
  treatmentGiven: "Treatment Given",
  conditionOnDischarge: "Condition on Discharge",
  dischargeBp: "Discharge BP",
  dischargePulse: "Discharge Pulse",
  dischargeSpO2: "Discharge SpO2",
  dischargeTemp: "Discharge Temp",
  followUpDate: "Follow Up Date",
  followUpInstructions: "Follow Up Instructions",
  visitDate: "Visit Date",
  visitType: "Visit Type",
  prescribedDate: "Prescribed Date",
  diagnosis: "Diagnosis",
  validityDays: "Validity (Days)",
  reportType: "Report Type",
  reportDate: "Report Date",
  specimenType: "Specimen Type",
  specimenCollectedAt: "Specimen Collected At",
  clinicalInterpretation: "Clinical Interpretation",
  conclusion: "Conclusion",
  vaccineName: "Vaccine",
  vaccineCode: "Vaccine Code",
  manufacturer: "Manufacturer",
  lotNumber: "Lot Number",
  expirationDate: "Expiration Date",
  administeredDate: "Administered Date",
  administeredBy: "Administered By",
  site: "Site",
  route: "Route",
  doseNumber: "Dose Number",
  seriesName: "Series",
  nextDueDate: "Next Due Date",
  reactions: "Reactions",
  documentType: "Document Type",
  documentTitle: "Document Title",
  documentDate: "Document Date",
  issuedBy: "Issued By",
  description: "Description",
  notes: "Notes",
  checkupDate: "Checkup Date",
  checkupType: "Checkup Type",
  generalExamination: "General Examination",
  systemicExamination: "Systemic Examination",
  smokingStatus: "Smoking Status",
  alcoholConsumption: "Alcohol Consumption",
  exerciseFrequency: "Exercise Frequency",
  healthStatus: "Health Status",
  observations: "Observations",
  invoiceNumber: "Invoice Number",
  invoiceDate: "Invoice Date",
  invoiceType: "Invoice Type",
  billingCode: "Billing Code",
  status: "Status",
  totalGross: "Total Gross",
  totalNet: "Total Net",
};

const HI_TYPE_FIELD_ORDER: Record<TFhirHiType, string[]> = {
  DischargeSummary: [
    "patientName",
    "patientAge",
    "patientGender",
    "patientMRD",
    "patientPhone",
    "patientAddress",
    "admissionDate",
    "dischargeDate",
    "dischargeType",
    "attendingDoctorName",
    "wardName",
    "bedNumber",
    "chiefComplaints",
    "presentIllnessHistory",
    "pastMedicalHistory",
    "familyHistory",
    "physicalExamination",
    "clinicalSummary",
    "courseInHospital",
    "treatmentGiven",
    "conditionOnDischarge",
    "dischargeBp",
    "dischargePulse",
    "dischargeSpO2",
    "dischargeTemp",
    "followUpDate",
    "followUpInstructions",
  ],
  OPConsultation: [
    "patientName",
    "patientAge",
    "patientGender",
    "patientMRD",
    "patientPhone",
    "visitDate",
    "visitType",
    "attendingDoctorName",
    "chiefComplaints",
    "presentIllnessHistory",
    "pastHistory",
    "familyHistory",
    "physicalExamination",
    "followUpDate",
    "followUpInstructions",
  ],
  Prescription: [
    "patientName",
    "patientAge",
    "patientGender",
    "patientMRD",
    "prescribedDate",
    "attendingDoctorName",
    "diagnosis",
    "validityDays",
    "followUpDate",
  ],
  DiagnosticReport: [
    "patientName",
    "patientAge",
    "patientGender",
    "patientMRD",
    "reportType",
    "reportDate",
    "attendingDoctorName",
    "specimenType",
    "specimenCollectedAt",
    "clinicalInterpretation",
    "conclusion",
  ],
  ImmunizationRecord: [
    "patientName",
    "patientAge",
    "patientGender",
    "patientMRD",
    "vaccineName",
    "vaccineCode",
    "manufacturer",
    "lotNumber",
    "expirationDate",
    "administeredDate",
    "administeredBy",
    "site",
    "route",
    "doseNumber",
    "seriesName",
    "nextDueDate",
    "reactions",
  ],
  HealthDocumentRecord: [
    "patientName",
    "patientAge",
    "patientGender",
    "patientMRD",
    "documentType",
    "documentTitle",
    "documentDate",
    "issuedBy",
    "description",
    "notes",
  ],
  WellnessRecord: [
    "patientName",
    "patientAge",
    "patientGender",
    "patientMRD",
    "checkupDate",
    "checkupType",
    "attendingDoctorName",
    "generalExamination",
    "systemicExamination",
    "smokingStatus",
    "alcoholConsumption",
    "exerciseFrequency",
    "healthStatus",
    "observations",
  ],
  Invoice: [
    "patientName",
    "patientAge",
    "patientGender",
    "patientMRD",
    "patientPhone",
    "patientAddress",
    "invoiceNumber",
    "invoiceDate",
    "invoiceType",
    "billingCode",
    "status",
    "attendingDoctorName",
    "totalGross",
    "totalNet",
    "notes",
  ],
};

const formatLabel = (key: string): string =>
  FIELD_LABELS[key] ||
  key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (char) => char.toUpperCase())
    .trim();

const formatPrimitive = (value: unknown): string | null => {
  if (value == null || value === "") return null;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date = dayjs(trimmed);
  if (date.isValid() && /^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.includes("T")
      ? date.format("DD MMM YYYY, HH:mm")
      : date.format("DD MMM YYYY");
  }
  return trimmed;
};

const formatDiagnosisItems = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as { icdCode?: string; diagnosisName?: string };
      const name = row.diagnosisName?.trim();
      const code = row.icdCode?.trim();
      if (name && code) return `${name} (${code})`;
      return name || code || null;
    })
    .filter((item): item is string => Boolean(item));
};

const formatMedicationItems = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const med = item as Record<string, unknown>;
      const name = formatPrimitive(med.medicineName);
      if (!name) return null;
      const parts = [
        name,
        formatPrimitive(med.dosage),
        formatPrimitive(med.frequency),
        formatPrimitive(med.duration),
        formatPrimitive(med.route),
        formatPrimitive(med.timing),
        formatPrimitive(med.instructions),
      ].filter(Boolean);
      return parts.join(" · ");
    })
    .filter((item): item is string => Boolean(item));
};

const formatInvestigationItems = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const name =
        formatPrimitive(row.testName) ||
        formatPrimitive(row.procedureName) ||
        formatPrimitive(row.testName);
      if (!name) return null;
      const parts = [
        name,
        formatPrimitive(row.result),
        formatPrimitive(row.value),
        formatPrimitive(row.date),
        formatPrimitive(row.notes),
      ].filter(Boolean);
      return parts.join(" · ");
    })
    .filter((item): item is string => Boolean(item));
};

const formatTestResultItems = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const name = formatPrimitive(row.testName);
      if (!name) return null;
      const parts = [
        `${name}: ${formatPrimitive(row.value) ?? "—"}`,
        formatPrimitive(row.unit),
        formatPrimitive(row.referenceRange),
        formatPrimitive(row.status),
        formatPrimitive(row.notes),
      ].filter(Boolean);
      return parts.join(" · ");
    })
    .filter((item): item is string => Boolean(item));
};

const formatInvoiceLineItems = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const name = formatPrimitive(row.itemName);
      if (!name) return null;
      const qty = formatPrimitive(row.quantity);
      const unit = formatPrimitive(row.unit);
      const rate = formatPrimitive(row.rate);
      const total = formatPrimitive(row.total);
      const parts = [
        name,
        formatPrimitive(row.itemType),
        qty && unit ? `${qty} ${unit}` : qty || unit,
        rate ? `Rate: ${rate}` : null,
        total ? `Total: ${total}` : null,
        formatPrimitive(row.batchNumber),
      ].filter(Boolean);
      return parts.join(" · ");
    })
    .filter((item): item is string => Boolean(item));
};

const formatVitalSigns = (value: unknown): IFhirViewRow[] => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const vitals = value as Record<string, unknown>;
  const rows: IFhirViewRow[] = [];
  const push = (label: string, raw: unknown) => {
    const formatted = formatPrimitive(raw);
    if (formatted) rows.push({ label, value: formatted });
  };

  push("Blood Pressure Systolic", vitals.bloodPressureSystolic);
  push("Blood Pressure Diastolic", vitals.bloodPressureDiastolic);
  push("Heart Rate", vitals.heartRate);
  push("Temperature", vitals.temperature);
  push("Respiratory Rate", vitals.respiratoryRate);
  push("SpO2", vitals.oxygenSaturation);
  push("Height", vitals.height);
  push("Weight", vitals.weight);
  push("BMI", vitals.bmi);
  return rows;
};

const formatWomenHealth = (value: unknown): IFhirViewRow[] => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const data = value as Record<string, unknown>;
  const rows: IFhirViewRow[] = [];
  const menstrual = formatPrimitive(data.menstrualCycle);
  const pregnancy = formatPrimitive(data.pregnancyStatus);
  if (menstrual) rows.push({ label: "Menstrual Cycle", value: menstrual });
  if (pregnancy) rows.push({ label: "Pregnancy Status", value: pregnancy });
  return rows;
};

const LIST_FIELD_CONFIG: Record<string, { label: string; formatter?: (value: unknown) => string[] }> = {
  allergies: { label: "Allergies" },
  advice: { label: "Advice" },
  adviceOnDischarge: { label: "Advice on Discharge" },
  recommendations: { label: "Recommendations" },
  provisionalDiagnosis: { label: "Provisional Diagnosis", formatter: formatDiagnosisItems },
  finalDiagnosis: { label: "Final Diagnosis", formatter: formatDiagnosisItems },
  medications: { label: "Medications", formatter: formatMedicationItems },
  medicinesOnDischarge: { label: "Medicines on Discharge", formatter: formatMedicationItems },
  investigations: { label: "Investigations", formatter: formatInvestigationItems },
  investigationsAdvised: { label: "Investigations Advised", formatter: formatInvestigationItems },
  proceduresPerformed: { label: "Procedures Performed", formatter: formatInvestigationItems },
  testResults: { label: "Test Results", formatter: formatTestResultItems },
  lineItems: { label: "Line Items", formatter: formatInvoiceLineItems },
};

export const buildFhirRecordViewSections = (
  hiType: TFhirHiType | string | undefined,
  data: Record<string, unknown>
): IFhirViewSection[] => {
  const orderedKeys =
    hiType && hiType in HI_TYPE_FIELD_ORDER
      ? HI_TYPE_FIELD_ORDER[hiType as TFhirHiType]
      : Object.keys(data);

  const rows: IFhirViewRow[] = [];
  const lists: Array<{ label: string; items: string[] }> = [];
  const usedKeys = new Set<string>();

  orderedKeys.forEach((key) => {
    if (key in LIST_FIELD_CONFIG) return;
    if (key === "vitalSigns" || key === "womenHealth") return;
    const value = formatPrimitive(data[key]);
    if (value) {
      rows.push({ label: formatLabel(key), value });
      usedKeys.add(key);
    }
  });

  Object.entries(LIST_FIELD_CONFIG).forEach(([key, config]) => {
    const raw = data[key];
    const items = config.formatter ? config.formatter(raw) : formatStringList(raw);
    if (items.length) {
      lists.push({ label: config.label, items });
      usedKeys.add(key);
    }
  });

  const vitalRows = formatVitalSigns(data.vitalSigns);
  if (vitalRows.length) {
    usedKeys.add("vitalSigns");
  }

  const womenRows = formatWomenHealth(data.womenHealth);
  if (womenRows.length) {
    usedKeys.add("womenHealth");
  }

  Object.keys(data).forEach((key) => {
    if (usedKeys.has(key)) return;
    const value = formatPrimitive(data[key]);
    if (value) rows.push({ label: formatLabel(key), value });
  });

  const sections: IFhirViewSection[] = [];
  if (rows.length) sections.push({ title: "Clinical Details", rows, lists: [] });

  if (vitalRows.length) {
    sections.push({ title: "Vital Signs", rows: vitalRows, lists: [] });
  }

  if (womenRows.length) {
    sections.push({ title: "Women's Health", rows: womenRows, lists: [] });
  }

  if (lists.length) {
    sections.push({ title: "Clinical Lists", rows: [], lists });
  }

  return sections;
};

const formatStringList = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => formatPrimitive(item))
    .filter((item): item is string => Boolean(item));
};

export const getAttachmentUrl = (attachment: IFhirAttachment): string | null => {
  const directUrl =
    attachment.signedUrl?.trim() ||
    attachment.url?.trim() ||
    attachment.originalUrl?.trim() ||
    null;
  if (directUrl) return directUrl;

  if (attachment.data?.trim()) {
    const contentType = attachment.contentType?.trim() || "application/octet-stream";
    return `data:${contentType};base64,${attachment.data.replace(/\s/g, "")}`;
  }

  return null;
};

export const isImageAttachment = (contentType: string): boolean =>
  contentType.toLowerCase().startsWith("image/");

export const isPdfAttachment = (contentType: string): boolean =>
  contentType.toLowerCase().includes("pdf");
