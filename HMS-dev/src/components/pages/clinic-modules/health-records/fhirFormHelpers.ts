import dayjs from "dayjs";
import type {
  IFhirDiagnosticReportData,
  IFhirDischargeSummaryData,
  IFhirDiagnosisItem,
  IFhirHealthDocumentRecordData,
  IFhirImmunizationRecordData,
  IFhirInvoiceData,
  IFhirInvoiceLineItem,
  IFhirInvestigationAdvisedItem,
  IFhirInvestigationItem,
  IFhirMedicationItem,
  IFhirOPConsultationData,
  IFhirPrescriptionData,
  IFhirProcedureItem,
  IFhirTestResultItem,
  IFhirVitalSigns,
  IFhirWellnessRecordData,
  IFhirWomenHealth,
  TFhirHiType,
} from "@/core/types/fhirHealthRecord";

export const LABEL_CLASS = "form-label mb-1 fw-medium text-dark fs-13";

export const toDateInputValue = (iso?: string): string => {
  if (!iso) return "";
  const d = dayjs(iso);
  return d.isValid() ? d.format("YYYY-MM-DD") : "";
};

export const toDateTimeLocalValue = (iso?: string): string => {
  if (!iso) return "";
  const d = dayjs(iso);
  return d.isValid() ? d.format("YYYY-MM-DDTHH:mm") : "";
};

export const dateInputToIso = (value: string): string => {
  if (!value) return "";
  const d = dayjs(value);
  return d.isValid() ? d.toISOString() : value;
};

export const dateTimeLocalToIso = (value: string): string => {
  if (!value) return "";
  const d = dayjs(value);
  return d.isValid() ? d.toISOString() : value;
};

const emptyMedication = (): IFhirMedicationItem => ({
  medicineName: "",
  dosage: "",
  frequency: "",
  duration: "",
  route: "Oral",
  timing: "",
  instructions: "",
  quantity: undefined,
});

const emptyVitalSigns = (): IFhirVitalSigns => ({
  bloodPressureSystolic: "",
  bloodPressureDiastolic: "",
  heartRate: "",
  temperature: "",
  respiratoryRate: "",
  oxygenSaturation: "",
  height: "",
  weight: "",
  bmi: "",
});

const emptyWomenHealth = (): IFhirWomenHealth => ({
  menstrualCycle: "",
  pregnancyStatus: "",
});

const emptyTestResult = (): IFhirTestResultItem => ({
  testName: "",
  value: "",
  unit: "",
  referenceRange: "",
  status: "Normal",
  notes: "",
});

const emptyInvestigation = (): IFhirInvestigationItem => ({
  testName: "",
  result: "",
  date: "",
  notes: "",
});

const emptyProcedure = (): IFhirProcedureItem => ({
  procedureName: "",
  date: "",
  notes: "",
});

const emptyInvestigationAdvised = (): IFhirInvestigationAdvisedItem => ({
  testName: "",
  notes: "",
});

export const emptyDischargeSummaryData = (): IFhirDischargeSummaryData => ({
  patientName: "",
  patientAge: "",
  patientGender: "",
  patientMRD: "",
  patientPhone: "",
  patientAddress: "",
  admissionDate: "",
  dischargeDate: "",
  dischargeType: "Normal",
  attendingDoctorName: "",
  wardName: "",
  bedNumber: "",
  chiefComplaints: "",
  presentIllnessHistory: "",
  pastMedicalHistory: "",
  familyHistory: "",
  physicalExamination: "",
  allergies: [],
  provisionalDiagnosis: [],
  finalDiagnosis: [],
  clinicalSummary: "",
  courseInHospital: "",
  treatmentGiven: "",
  conditionOnDischarge: "",
  investigations: [],
  dischargeBp: "",
  dischargePulse: "",
  dischargeSpO2: "",
  dischargeTemp: "",
  proceduresPerformed: [],
  medicinesOnDischarge: [],
  adviceOnDischarge: [],
  followUpDate: "",
  followUpInstructions: "",
});

export const emptyOPConsultationData = (): IFhirOPConsultationData => ({
  patientName: "",
  patientAge: "",
  patientGender: "",
  patientMRD: "",
  patientPhone: "",
  visitDate: "",
  visitType: "OPD",
  attendingDoctorName: "",
  chiefComplaints: "",
  presentIllnessHistory: "",
  pastHistory: "",
  familyHistory: "",
  physicalExamination: "",
  allergies: [],
  provisionalDiagnosis: [],
  finalDiagnosis: [],
  investigationsAdvised: [],
  medications: [],
  advice: [],
  followUpDate: "",
  followUpInstructions: "",
});

export const emptyPrescriptionData = (): IFhirPrescriptionData => ({
  patientName: "",
  patientAge: "",
  patientGender: "",
  patientMRD: "",
  prescribedDate: "",
  attendingDoctorName: "",
  diagnosis: "",
  validityDays: 30,
  medications: [emptyMedication()],
  advice: [],
  followUpDate: "",
});

export const emptyDiagnosticReportData = (): IFhirDiagnosticReportData => ({
  patientName: "",
  patientAge: "",
  patientGender: "",
  patientMRD: "",
  reportType: "Laboratory",
  reportDate: "",
  attendingDoctorName: "",
  specimenType: "",
  specimenCollectedAt: "",
  testResults: [emptyTestResult()],
  clinicalInterpretation: "",
  conclusion: "",
  recommendations: [],
});

export const emptyImmunizationRecordData = (): IFhirImmunizationRecordData => ({
  patientName: "",
  patientAge: "",
  patientGender: "",
  patientMRD: "",
  vaccineName: "",
  vaccineCode: "",
  manufacturer: "",
  lotNumber: "",
  expirationDate: "",
  administeredDate: "",
  administeredBy: "",
  site: "",
  route: "Intramuscular",
  doseNumber: "",
  seriesName: "",
  nextDueDate: "",
  reactions: "",
});

export const emptyHealthDocumentRecordData = (): IFhirHealthDocumentRecordData => ({
  patientName: "",
  patientAge: "",
  patientGender: "",
  patientMRD: "",
  documentType: "",
  documentTitle: "",
  documentDate: "",
  issuedBy: "",
  description: "",
  notes: "",
});

export const emptyWellnessRecordData = (): IFhirWellnessRecordData => ({
  patientName: "",
  patientAge: "",
  patientGender: "",
  patientMRD: "",
  checkupDate: "",
  checkupType: "",
  attendingDoctorName: "",
  vitalSigns: emptyVitalSigns(),
  generalExamination: "",
  systemicExamination: "",
  smokingStatus: "",
  alcoholConsumption: "",
  exerciseFrequency: "",
  womenHealth: emptyWomenHealth(),
  healthStatus: "",
  recommendations: [],
  observations: "",
});

const emptyInvoiceLineItem = (): IFhirInvoiceLineItem => ({
  sequence: "",
  itemName: "",
  hsnCode: "",
  itemType: "",
  quantity: "",
  unit: "",
  rate: "",
  mrp: "",
  discount: "",
  cgst: "",
  sgst: "",
  total: "",
  batchNumber: "",
  expiryDate: "",
});

export const emptyInvoiceData = (): IFhirInvoiceData => ({
  patientName: "",
  patientAge: "",
  patientGender: "",
  patientMRD: "",
  patientPhone: "",
  patientAddress: "",
  invoiceNumber: "",
  invoiceDate: "",
  invoiceType: "Hospital",
  billingCode: "00",
  status: "issued",
  attendingDoctorName: "",
  lineItems: [emptyInvoiceLineItem()],
  totalGross: "",
  totalNet: "",
  notes: "",
});

export const getEmptyFormDataForHiType = (hiType: TFhirHiType): Record<string, unknown> => {
  switch (hiType) {
    case "DischargeSummary":
      return emptyDischargeSummaryData() as unknown as Record<string, unknown>;
    case "OPConsultation":
      return emptyOPConsultationData() as unknown as Record<string, unknown>;
    case "Prescription":
      return emptyPrescriptionData() as unknown as Record<string, unknown>;
    case "DiagnosticReport":
      return emptyDiagnosticReportData() as unknown as Record<string, unknown>;
    case "ImmunizationRecord":
      return emptyImmunizationRecordData() as unknown as Record<string, unknown>;
    case "HealthDocumentRecord":
      return emptyHealthDocumentRecordData() as unknown as Record<string, unknown>;
    case "WellnessRecord":
      return emptyWellnessRecordData() as unknown as Record<string, unknown>;
    case "Invoice":
      return emptyInvoiceData() as unknown as Record<string, unknown>;
    default:
      return {};
  }
};

const coerceStringArray = (val: unknown): string[] => {
  if (Array.isArray(val)) {
    return val
      .filter((item): item is string | number => ["string", "number"].includes(typeof item))
      .map(String)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (typeof val === "string" && val.trim()) return [val];
  return [];
};

const coerceNumberOrEmpty = (val: unknown): number | "" => {
  if (val === "" || val == null) return "";
  const n = Number(val);
  return Number.isFinite(n) ? n : "";
};

/** Normalizes API string | diagnosis[] | empty into IFhirDiagnosisItem[]. */
const coerceDiagnosisList = (val: unknown): IFhirDiagnosisItem[] => {
  if (Array.isArray(val)) {
    return val
      .map((item): IFhirDiagnosisItem | null => {
        if (typeof item === "string") {
          const diagnosisName = item.trim();
          return diagnosisName ? { icdCode: "", diagnosisName } : null;
        }
        if (item && typeof item === "object") {
          const row = item as Partial<IFhirDiagnosisItem>;
          const diagnosisName = String(row.diagnosisName ?? "").trim();
          const icdCode = String(row.icdCode ?? "").trim();
          if (!diagnosisName && !icdCode) return null;
          return { icdCode, diagnosisName };
        }
        return null;
      })
      .filter((item): item is IFhirDiagnosisItem => item != null);
  }
  if (typeof val === "string" && val.trim()) {
    return [{ icdCode: "", diagnosisName: val.trim() }];
  }
  return [];
};

const coerceMedicationList = (val: unknown): IFhirMedicationItem[] => {
  if (!Array.isArray(val)) return [];
  return val.map((item) => {
    if (!item || typeof item !== "object") return emptyMedication();
    const med = item as Partial<IFhirMedicationItem>;
    const quantityRaw = (item as Record<string, unknown>).quantity;
    const quantity =
      quantityRaw === "" || quantityRaw == null
        ? undefined
        : Number.isFinite(Number(quantityRaw))
          ? Number(quantityRaw)
          : undefined;
    return {
      medicineName: String(med.medicineName ?? ""),
      dosage: String(med.dosage ?? ""),
      frequency: String(med.frequency ?? ""),
      duration: String(med.duration ?? ""),
      route: String(med.route ?? "") || "Oral",
      timing: String(med.timing ?? ""),
      instructions: String(med.instructions ?? ""),
      quantity,
    };
  });
};

const coerceNullishString = (val: unknown): string => {
  if (val == null) return "";
  return String(val);
};

/** Prefill may nest record metadata inside `data`; keep it out of form fields. */
export const extractPrefillMetadata = (
  prefill: Record<string, unknown>
): { date?: string; authorId?: string; authorName?: string } | null => {
  const meta = prefill.metadata;
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return null;
  const m = meta as Record<string, unknown>;
  return {
    date: typeof m.date === "string" && m.date ? m.date : undefined,
    authorId: typeof m.authorId === "string" ? m.authorId : undefined,
    authorName: typeof m.authorName === "string" ? m.authorName : undefined,
  };
};

export const mergePrefillIntoFormData = (
  hiType: TFhirHiType,
  base: Record<string, unknown>,
  prefill: Record<string, unknown>
): Record<string, unknown> => {
  const { metadata: _metadata, ...prefillFields } = prefill;
  const merged = { ...base, ...prefillFields };

  if (hiType === "WellnessRecord") {
    merged.vitalSigns = {
      ...(base.vitalSigns as object),
      ...((prefillFields.vitalSigns &&
      typeof prefillFields.vitalSigns === "object" &&
      !Array.isArray(prefillFields.vitalSigns)
        ? prefillFields.vitalSigns
        : {}) as object),
    };
    merged.womenHealth = {
      ...(base.womenHealth as object),
      ...((prefillFields.womenHealth &&
      typeof prefillFields.womenHealth === "object" &&
      !Array.isArray(prefillFields.womenHealth)
        ? prefillFields.womenHealth
        : {}) as object),
    };
  }

  const arrayFields: Partial<Record<TFhirHiType, string[]>> = {
    DischargeSummary: ["allergies", "adviceOnDischarge"],
    OPConsultation: ["allergies", "advice"],
    Prescription: ["advice"],
    DiagnosticReport: ["recommendations"],
    WellnessRecord: ["recommendations"],
  };

  arrayFields[hiType]?.forEach((key) => {
    if (prefillFields[key] == null) {
      if (prefillFields[key] === null) merged[key] = [];
      return;
    }
    merged[key] = coerceStringArray(prefillFields[key]);
  });

  if (hiType === "DischargeSummary" || hiType === "OPConsultation") {
    if (prefillFields.provisionalDiagnosis != null) {
      merged.provisionalDiagnosis = coerceDiagnosisList(prefillFields.provisionalDiagnosis);
    } else if (!Array.isArray(merged.provisionalDiagnosis)) {
      merged.provisionalDiagnosis = coerceDiagnosisList(merged.provisionalDiagnosis);
    }
    if (prefillFields.finalDiagnosis != null) {
      merged.finalDiagnosis = coerceDiagnosisList(prefillFields.finalDiagnosis);
    } else if (!Array.isArray(merged.finalDiagnosis)) {
      merged.finalDiagnosis = coerceDiagnosisList(merged.finalDiagnosis);
    }
  }

  if (hiType === "DischargeSummary") {
    if (Array.isArray(prefillFields.proceduresPerformed)) {
      merged.proceduresPerformed = (prefillFields.proceduresPerformed as unknown[]).map((item) => {
        if (typeof item === "string") {
          return { procedureName: item, date: "", notes: "" };
        }
        if (item && typeof item === "object") {
          const proc = item as Partial<IFhirProcedureItem>;
          return {
            procedureName: String(proc.procedureName ?? ""),
            date: coerceNullishString(proc.date),
            notes: String(proc.notes ?? ""),
          };
        }
        return emptyProcedure();
      });
    }
    if (Array.isArray(prefillFields.investigations)) {
      merged.investigations = (prefillFields.investigations as unknown[]).map((item) => {
        if (!item || typeof item !== "object") return emptyInvestigation();
        const inv = item as Partial<IFhirInvestigationItem>;
        return {
          testName: String(inv.testName ?? ""),
          result: String(inv.result ?? ""),
          date: coerceNullishString(inv.date),
          notes: String(inv.notes ?? ""),
        };
      });
    }
    if (Array.isArray(prefillFields.medicinesOnDischarge)) {
      merged.medicinesOnDischarge = coerceMedicationList(prefillFields.medicinesOnDischarge);
    }
  }

  if (
    (hiType === "OPConsultation" || hiType === "Prescription") &&
    Array.isArray(prefillFields.medications)
  ) {
    merged.medications = coerceMedicationList(prefillFields.medications);
  }

  if (hiType === "OPConsultation" && Array.isArray(prefillFields.investigationsAdvised)) {
    merged.investigationsAdvised = (prefillFields.investigationsAdvised as unknown[]).map((item) => {
      if (!item || typeof item !== "object") return emptyInvestigationAdvised();
      const row = item as Partial<IFhirInvestigationAdvisedItem>;
      return {
        testName: String(row.testName ?? ""),
        notes: String(row.notes ?? ""),
      };
    });
  }

  if (hiType === "DiagnosticReport" && Array.isArray(prefillFields.testResults)) {
    merged.testResults = (prefillFields.testResults as unknown[]).map((item) => {
      if (!item || typeof item !== "object") return emptyTestResult();
      const row = item as Partial<IFhirTestResultItem>;
      return {
        testName: String(row.testName ?? ""),
        value: String(row.value ?? ""),
        unit: String(row.unit ?? ""),
        referenceRange: String(row.referenceRange ?? ""),
        status: String(row.status ?? "Normal"),
        notes: String(row.notes ?? ""),
      };
    });
  }

  if (hiType === "Invoice" && Array.isArray(prefillFields.lineItems)) {
    merged.lineItems = (prefillFields.lineItems as unknown[]).map((item, index) => {
      if (!item || typeof item !== "object") {
        return { ...emptyInvoiceLineItem(), sequence: index + 1 };
      }
      const row = item as Partial<IFhirInvoiceLineItem>;
      return {
        sequence: coerceNumberOrEmpty(row.sequence ?? index + 1),
        itemName: String(row.itemName ?? ""),
        hsnCode: String(row.hsnCode ?? ""),
        itemType: String(row.itemType ?? ""),
        quantity: coerceNumberOrEmpty(row.quantity),
        unit: String(row.unit ?? ""),
        rate: coerceNumberOrEmpty(row.rate),
        mrp: coerceNumberOrEmpty(row.mrp),
        discount: coerceNumberOrEmpty(row.discount),
        cgst: coerceNumberOrEmpty(row.cgst),
        sgst: coerceNumberOrEmpty(row.sgst),
        total: coerceNumberOrEmpty(row.total),
        batchNumber: String(row.batchNumber ?? ""),
        expiryDate: coerceNullishString(row.expiryDate),
      };
    });
  }

  const dateFields: Partial<Record<TFhirHiType, string[]>> = {
    DischargeSummary: ["admissionDate", "dischargeDate", "followUpDate"],
    OPConsultation: ["visitDate", "followUpDate"],
    Prescription: ["prescribedDate", "followUpDate"],
    DiagnosticReport: ["reportDate", "specimenCollectedAt"],
    ImmunizationRecord: ["expirationDate", "administeredDate", "nextDueDate"],
    HealthDocumentRecord: ["documentDate"],
    WellnessRecord: ["checkupDate"],
    Invoice: ["invoiceDate"],
  };

  dateFields[hiType]?.forEach((key) => {
    if (key in prefillFields || merged[key] == null) {
      merged[key] = coerceNullishString(merged[key]);
    }
  });

  if (prefillFields.patientAge != null) {
    merged.patientAge = coerceNumberOrEmpty(prefillFields.patientAge);
  }
  if (prefillFields.validityDays != null) {
    merged.validityDays = coerceNumberOrEmpty(prefillFields.validityDays);
  }
  if (prefillFields.doseNumber != null) {
    merged.doseNumber = coerceNumberOrEmpty(prefillFields.doseNumber);
  }
  if (prefillFields.totalGross != null) {
    merged.totalGross = coerceNumberOrEmpty(prefillFields.totalGross);
  }
  if (prefillFields.totalNet != null) {
    merged.totalNet = coerceNumberOrEmpty(prefillFields.totalNet);
  }

  return merged;
};

export const serializeFormDataForApi = (
  hiType: TFhirHiType,
  formData: Record<string, unknown>
): Record<string, unknown> => {
  const { metadata: _metadata, ...rest } = formData;
  const data = { ...rest };

  const dateFields: Partial<Record<TFhirHiType, string[]>> = {
    DischargeSummary: ["admissionDate", "dischargeDate", "followUpDate"],
    OPConsultation: ["visitDate", "followUpDate"],
    Prescription: ["prescribedDate", "followUpDate"],
    DiagnosticReport: ["reportDate", "specimenCollectedAt"],
    ImmunizationRecord: ["expirationDate", "administeredDate", "nextDueDate"],
    HealthDocumentRecord: ["documentDate"],
    WellnessRecord: ["checkupDate"],
    Invoice: ["invoiceDate"],
  };

  dateFields[hiType]?.forEach((key) => {
    const val = data[key];
    if (val == null || val === "") {
      data[key] = "";
      return;
    }
    if (typeof val === "string" && val) {
      data[key] = val.includes("T") ? dateTimeLocalToIso(val) : dateInputToIso(val);
    }
  });

  if (hiType === "DischargeSummary" && Array.isArray(data.investigations)) {
    data.investigations = (data.investigations as { date?: string }[]).map((inv) => ({
      ...inv,
      date: inv.date
        ? inv.date.includes("T")
          ? dateTimeLocalToIso(inv.date)
          : dateInputToIso(inv.date)
        : "",
    }));
  }

  if (hiType === "DischargeSummary" && Array.isArray(data.proceduresPerformed)) {
    data.proceduresPerformed = (data.proceduresPerformed as { date?: string }[]).map((proc) => ({
      ...proc,
      date: proc.date
        ? proc.date.includes("T")
          ? dateTimeLocalToIso(proc.date)
          : dateInputToIso(proc.date)
        : "",
    }));
  }

  if (hiType === "Invoice" && Array.isArray(data.lineItems)) {
    data.lineItems = (data.lineItems as IFhirInvoiceLineItem[]).map((item, index) => {
      const line: Record<string, unknown> = {
        sequence: item.sequence === "" || item.sequence == null ? index + 1 : Number(item.sequence),
        itemName: item.itemName ?? "",
        itemType: item.itemType ?? "",
        quantity: item.quantity === "" || item.quantity == null ? 0 : Number(item.quantity),
        unit: item.unit ?? "",
        rate: item.rate === "" || item.rate == null ? 0 : Number(item.rate),
        total: item.total === "" || item.total == null ? 0 : Number(item.total),
      };
      if (item.hsnCode?.trim()) line.hsnCode = item.hsnCode.trim();
      if (item.mrp !== "" && item.mrp != null) line.mrp = Number(item.mrp);
      if (item.discount !== "" && item.discount != null) line.discount = Number(item.discount);
      if (item.cgst !== "" && item.cgst != null) line.cgst = Number(item.cgst);
      if (item.sgst !== "" && item.sgst != null) line.sgst = Number(item.sgst);
      if (item.batchNumber?.trim()) line.batchNumber = item.batchNumber.trim();
      if (item.expiryDate?.trim()) {
        line.expiryDate = item.expiryDate.includes("T")
          ? dateTimeLocalToIso(item.expiryDate)
          : dateInputToIso(item.expiryDate);
      }
      return line;
    });
  }

  if (data.patientAge === "") delete data.patientAge;
  if (data.validityDays === "") delete data.validityDays;
  if (data.doseNumber === "") delete data.doseNumber;
  if (data.totalGross === "") delete data.totalGross;
  if (data.totalNet === "") delete data.totalNet;

  if (hiType === "DischargeSummary" || hiType === "OPConsultation") {
    data.provisionalDiagnosis = coerceDiagnosisList(data.provisionalDiagnosis);
    data.finalDiagnosis = coerceDiagnosisList(data.finalDiagnosis);
  }

  if (hiType === "WellnessRecord" && data.vitalSigns && typeof data.vitalSigns === "object") {
    const vs = { ...(data.vitalSigns as Record<string, unknown>) };
    Object.keys(vs).forEach((k) => {
      if (vs[k] === "" || vs[k] == null) delete vs[k];
    });
    data.vitalSigns = vs;
  }

  return data;
};

export {
  emptyInvestigation,
  emptyInvestigationAdvised,
  emptyInvoiceLineItem,
  emptyMedication,
  emptyProcedure,
  emptyTestResult,
  emptyVitalSigns,
  emptyWomenHealth,
};
