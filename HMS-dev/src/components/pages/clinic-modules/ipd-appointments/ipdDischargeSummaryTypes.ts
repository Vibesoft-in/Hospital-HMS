export type TDischargeType = "Normal" | "LAMA" | "DOR" | "Death" | "Refer";

/** Catalog order for advice presets (no serial prefix). Custom lines sort after these. */
export const ADVICE_ON_DISCHARGE_PRESETS: { value: string; label: string; text: string }[] = [
  {
    value: "take_medicines",
    label: "Take medicines as prescribed, do not skip doses",
    text: "Take medicines as prescribed, do not skip doses",
  },
  {
    value: "low_salt_low_fat_diet",
    label: "Follow low-salt, low-fat diet",
    text: "Follow low-salt, low-fat diet",
  },
  {
    value: "avoid_heavy_exertion",
    label: "Avoid heavy exertion / lifting for [X] weeks",
    text: "Avoid heavy exertion / lifting for [X] weeks",
  },
  {
    value: "keep_wound_clean_dry",
    label: "Keep the wound clean and dry, review for dressing",
    text: "Keep the wound clean and dry, review for dressing",
  },
  {
    value: "drink_fluids",
    label: "Drink plenty of fluids",
    text: "Drink plenty of fluids",
  },
  {
    value: "monitor_bp",
    label: "Monitor blood pressure daily",
    text: "Monitor blood pressure daily",
  },
  {
    value: "monitor_blood_sugar",
    label: "Monitor blood sugar daily",
    text: "Monitor blood sugar daily",
  },
  {
    value: "complete_antibiotics",
    label: "Complete the full course of antibiotics",
    text: "Complete the full course of antibiotics",
  },
  {
    value: "report_red_flags",
    label: "Report immediately if fever, breathlessness, or swelling occurs",
    text: "Report immediately if fever, breathlessness, or swelling occurs",
  },
  {
    value: "rest_avoid_strenuous",
    label: "Adequate rest, avoid strenuous activity",
    text: "Adequate rest, avoid strenuous activity",
  },
];

export const ADVICE_ON_DISCHARGE_OTHER_OPTION = {
  value: "other",
  label: "Other",
  text: "__ADVICE_OTHER__",
} as const;

/** Strip leading "1. " / "10. " style serials from advice lines (legacy saves). */
export const stripAdviceSerialPrefix = (line: string): string =>
  line.replace(/^\d+\.\s*/, "").trim();

/**
 * Normalize advice lines: strip legacy serials, de-dupe, sort by catalog order,
 * then append custom lines in original relative order.
 */
export const normalizeAdviceOnDischargeLines = (lines: string[]): string[] => {
  const stripped = lines.map((line) => stripAdviceSerialPrefix(String(line ?? ""))).filter(Boolean);
  if (!stripped.length) return [];

  const presetOrder = new Map(
    ADVICE_ON_DISCHARGE_PRESETS.map((preset, index) => [preset.text.toLowerCase(), index])
  );
  const seen = new Set<string>();
  const matched: { text: string; order: number }[] = [];
  const custom: string[] = [];

  stripped.forEach((line) => {
    const key = line.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    const order = presetOrder.get(key);
    if (order == null) {
      custom.push(line);
      return;
    }
    matched.push({ text: ADVICE_ON_DISCHARGE_PRESETS[order]?.text ?? line, order });
  });

  matched.sort((a, b) => a.order - b.order);
  return [...matched.map((m) => m.text), ...custom];
};

export const DISCHARGE_TYPE_OPTIONS: { value: TDischargeType; label: string }[] = [
  { value: "Normal", label: "Normal" },
  { value: "LAMA", label: "LAMA (Leave Against Medical Advice)" },
  { value: "DOR", label: "DOR (Discharge on Request)" },
  { value: "Death", label: "Death" },
  { value: "Refer", label: "Refer" },
];

export const DOR_REQUESTED_BY_TYPE_OPTIONS = [
  { value: "Patients", label: "Patients" },
  { value: "Attendant", label: "Attendant" },
  { value: "Guardian", label: "Guardian" },
] as const;

export type TDorRequestedByType = (typeof DOR_REQUESTED_BY_TYPE_OPTIONS)[number]["value"];

export const parseDorRequestedBy = (
  value: unknown
): { type: TDorRequestedByType | ""; name: string } => {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return { type: "", name: "" };

  for (const opt of DOR_REQUESTED_BY_TYPE_OPTIONS) {
    const colonPrefix = `${opt.value}:`;
    if (trimmed.toLowerCase().startsWith(colonPrefix.toLowerCase())) {
      return {
        type: opt.value,
        name: trimmed.slice(colonPrefix.length).trim(),
      };
    }
    const dashPrefix = `${opt.value} -`;
    if (trimmed.toLowerCase().startsWith(dashPrefix.toLowerCase())) {
      return {
        type: opt.value,
        name: trimmed.slice(dashPrefix.length).trim(),
      };
    }
  }

  return { type: "", name: trimmed };
};

export const buildDorRequestedBy = (type: string, name: string): string => {
  const trimmedType = type.trim();
  const trimmedName = name.trim();
  if (!trimmedType && !trimmedName) return "";
  if (!trimmedType) return trimmedName;
  if (!trimmedName) return trimmedType;
  return `${trimmedType}: ${trimmedName}`;
};

export const formatDorRequestedByDisplay = (type: string, name: string): string => {
  const combined = buildDorRequestedBy(type, name);
  return combined.trim();
};

export const CONDITION_ON_DISCHARGE_OPTIONS = [
  { value: "Stable", label: "Stable" },
  { value: "Improved", label: "Improved" },
  { value: "Unchanged", label: "Unchanged" },
  { value: "Unstable", label: "Unstable" },
  { value: "Critical", label: "Critical" },
  { value: "Deceased", label: "Deceased" },
  { value: "Referred", label: "Referred" },
] as const;

export const DOSAGE_OPTIONS = [
  { value: "1-0-0", label: "1-0-0" },
  { value: "0-1-0", label: "0-1-0" },
  { value: "0-0-1", label: "0-0-1" },
  { value: "1-0-1", label: "1-0-1" },
  { value: "1-1-1", label: "1-1-1" },
  { value: "1-1-0", label: "1-1-0" },
  { value: "0-1-1", label: "0-1-1" },
  { value: "SOS (as needed)", label: "SOS (As Needed)" },
  { value: "STAT (immediately, once)", label: "STAT (Immediately, Once)" },
] as const;

export type TDurationUnit = "Days" | "Weeks" | "Months";

export const DURATION_PRESET_OPTIONS = [
  { value: "3 Days", label: "3 Days" },
  { value: "5 Days", label: "5 Days" },
  { value: "7 Days", label: "7 Days" },
  { value: "10 Days", label: "10 Days" },
  { value: "15 Days", label: "15 Days" },
  { value: "1 Month", label: "1 Month" },
  { value: "Ongoing/Continue", label: "Ongoing/Continue" },
  { value: "Custom", label: "Custom" },
] as const;

export const DURATION_UNIT_OPTIONS: { value: TDurationUnit; label: string }[] = [
  { value: "Days", label: "Days" },
  { value: "Weeks", label: "Weeks" },
  { value: "Months", label: "Months" },
];

export const FOLLOW_UP_PRESET_OPTIONS = [
  { value: "After 3 Days", label: "After 3 Days" },
  { value: "After 5 Days", label: "After 5 Days" },
  { value: "After 7 Days", label: "After 7 Days" },
  { value: "After 10 Days", label: "After 10 Days" },
  { value: "After 15 Days", label: "After 15 Days" },
  { value: "After 1 Month", label: "After 1 Month" },
  { value: "Specific Date", label: "Specific Date" },
] as const;

export const FOLLOW_UP_SPECIFIC_DATE_VALUE = "Specific Date";

/** Stored / displayed follow-up date format: DD-MM-YYYY */
const FOLLOW_UP_DATE_DISPLAY_RE = /^(\d{2})-(\d{2})-(\d{4})$/;
/** HTML date input / legacy ISO format: YYYY-MM-DD */
const FOLLOW_UP_DATE_ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export const isFollowUpSpecificDate = (followUp: string): boolean => {
  const trimmed = followUp.trim();
  if (!trimmed) return false;
  if (FOLLOW_UP_PRESET_OPTIONS.some((o) => o.value === trimmed)) return false;
  return FOLLOW_UP_DATE_DISPLAY_RE.test(trimmed) || FOLLOW_UP_DATE_ISO_RE.test(trimmed);
};

/** Convert stored follow-up date to YYYY-MM-DD for `<input type="date">`. */
export const followUpToDateInputValue = (followUp: string): string => {
  const trimmed = followUp.trim();
  const displayMatch = trimmed.match(FOLLOW_UP_DATE_DISPLAY_RE);
  if (displayMatch?.[1] && displayMatch[2] && displayMatch[3]) {
    return `${displayMatch[3]}-${displayMatch[2]}-${displayMatch[1]}`;
  }
  const isoMatch = trimmed.match(FOLLOW_UP_DATE_ISO_RE);
  if (isoMatch?.[1] && isoMatch[2] && isoMatch[3]) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }
  return "";
};

/** Convert YYYY-MM-DD from date input to DD-MM-YYYY for storage. */
export const dateInputValueToFollowUp = (isoDate: string): string => {
  const trimmed = isoDate.trim();
  const isoMatch = trimmed.match(FOLLOW_UP_DATE_ISO_RE);
  if (!isoMatch?.[1] || !isoMatch[2] || !isoMatch[3]) return "";
  return `${isoMatch[3]}-${isoMatch[2]}-${isoMatch[1]}`;
};

/** Normalize any recognized date to DD-MM-YYYY for payload/display. */
export const normalizeFollowUpDate = (followUp: string): string => {
  const trimmed = followUp.trim();
  if (!trimmed) return "";
  if (FOLLOW_UP_PRESET_OPTIONS.some((o) => o.value === trimmed)) return trimmed;
  const fromInput = followUpToDateInputValue(trimmed);
  if (!fromInput) return trimmed;
  return dateInputValueToFollowUp(fromInput);
};

export interface IParsedDuration {
  preset: string;
  customValue: string;
  customUnit: TDurationUnit;
}

export const parseMedicineDuration = (duration: string): IParsedDuration => {
  const trimmed = duration.trim();
  if (!trimmed) {
    return { preset: "", customValue: "", customUnit: "Days" };
  }
  const isPreset = DURATION_PRESET_OPTIONS.some(
    (o) => o.value === trimmed && o.value !== "Custom"
  );
  if (isPreset) {
    return { preset: trimmed, customValue: "", customUnit: "Days" };
  }
  const match = trimmed.match(/^(\d+)\s+(Days|Weeks|Months)$/i);
  if (match?.[1] && match[2]) {
    const unitRaw = match[2].toLowerCase();
    const customUnit: TDurationUnit =
      unitRaw === "weeks" ? "Weeks" : unitRaw === "months" ? "Months" : "Days";
    return { preset: "Custom", customValue: match[1], customUnit };
  }
  return { preset: "Custom", customValue: trimmed, customUnit: "Days" };
};

export const buildCustomDuration = (value: string, unit: TDurationUnit): string => {
  const num = value.trim();
  if (!num) return "";
  return `${num} ${unit}`;
};

export const showDischargeTypeDetailCard = (type: TDischargeType): boolean => type !== "Normal";

export const parseDischargeType = (value: unknown): TDischargeType | undefined => {
  const raw = String(value ?? "").trim();
  if (!raw) return undefined;
  return DISCHARGE_TYPE_OPTIONS.some((o) => o.value === raw) ? (raw as TDischargeType) : undefined;
};

export const getDischargeTypeLabel = (type?: TDischargeType) =>
  DISCHARGE_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type ?? "";

export interface IFinalDiagnosisRow {
  icdCode: string;
  diagnosisName: string;
}

const normalizeDiagnosisList = (value: unknown): IFinalDiagnosisRow[] => {
  if (Array.isArray(value)) {
    return value
      .map((d) => ({
        icdCode: String((d as IFinalDiagnosisRow)?.icdCode ?? ""),
        diagnosisName: String((d as IFinalDiagnosisRow)?.diagnosisName ?? ""),
      }))
      .filter((d) => d.icdCode.trim() || d.diagnosisName.trim());
  }
  if (typeof value === "string" && value.trim()) {
    return [{ icdCode: "", diagnosisName: value.trim() }];
  }
  return [];
};

export interface IMedicineOnDischargeRow {
  medicineName: string;
  type?: string;
  duration: string;
  dosage: string;
  instructions?: string;
}

export interface IDischargeSummaryPayload {
  dischargeType: TDischargeType;
  dischargeDate: string;
  clinicalSummary: string;
  provisionalDiagnosis: IFinalDiagnosisRow[];
  finalDiagnosis: IFinalDiagnosisRow[];
  courseInHospital: string;
  treatmentGiven: string;
  conditionOnDischarge: string;
  dischargeBp?: string;
  dischargePulse?: string;
  dischargeTemp?: string;
  dischargeSpO2?: string;
  allergies?: string;
  medicinesOnDischarge: IMedicineOnDischargeRow[];
  adviceOnDischarge: string[];
  followUp: string;
  lamaReason?: string;
  dorRequestedBy?: string;
  dorReason?: string;
  deathDateTime?: string;
  deathCause?: string;
  referHospitalName?: string;
  referReason?: string;
}

export interface IDischargeSummaryFormState
  extends Omit<
    IDischargeSummaryPayload,
    "adviceOnDischarge" | "provisionalDiagnosis" | "finalDiagnosis" | "medicinesOnDischarge"
  > {
  provisionalDiagnosis: IFinalDiagnosisRow[];
  finalDiagnosis: IFinalDiagnosisRow[];
  medicinesOnDischarge: IMedicineOnDischargeRow[];
  /** Single textarea in UI; serialized to API string[] on save */
  adviceOnDischarge: string;
  lamaReason: string;
  dorRequestedByType: TDorRequestedByType | "";
  dorRequestedByName: string;
  dorReason: string;
  deathDateTime: string;
  deathCause: string;
  referHospitalName: string;
  referReason: string;
}

export const parseDischargeDateValue = (value: unknown): string | undefined => {
  if (value == null) return undefined;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    return trimmed.slice(0, 10);
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  return undefined;
};

const toDateTimeLocalValue = (value: unknown): string => {
  if (value == null) return "";
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "";
    const parsed = trimmed.length >= 16 ? trimmed.slice(0, 16) : trimmed;
    return parsed.includes("T") ? parsed : `${parsed}T00:00`;
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 16);
  }
  return "";
};

export const emptyDischargeSummaryForm = (): IDischargeSummaryFormState => ({
  dischargeType: "Normal",
  dischargeDate: new Date().toISOString().slice(0, 10),
  clinicalSummary: "",
  provisionalDiagnosis: [],
  finalDiagnosis: [],
  courseInHospital: "",
  treatmentGiven: "",
  conditionOnDischarge: "",
  dischargeBp: "",
  dischargePulse: "",
  dischargeTemp: "",
  dischargeSpO2: "",
  allergies: "",
  medicinesOnDischarge: [
    { medicineName: "", type: "", duration: "", dosage: "", instructions: "" },
  ],
  adviceOnDischarge: "",
  followUp: "",
  lamaReason: "",
  dorRequestedByType: "",
  dorRequestedByName: "",
  dorReason: "",
  deathDateTime: "",
  deathCause: "",
  referHospitalName: "",
  referReason: "",
});

export const normalizeDischargeSummaryFromApi = (
  raw: unknown
): IDischargeSummaryFormState | null => {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  const nested =
    data.dischargeSummary && typeof data.dischargeSummary === "object"
      ? (data.dischargeSummary as Record<string, unknown>)
      : data;

  const provisionalDiagnosis = normalizeDiagnosisList(nested.provisionalDiagnosis);
  const finalDiagnosis = normalizeDiagnosisList(nested.finalDiagnosis);

  const medicinesOnDischarge = Array.isArray(nested.medicinesOnDischarge)
    ? (nested.medicinesOnDischarge as IMedicineOnDischargeRow[]).map((m) => ({
        medicineName: String(m?.medicineName ?? ""),
        type: String(
          (m as { type?: unknown; medicineType?: unknown })?.type ??
            (m as { medicineType?: unknown })?.medicineType ??
            ""
        ),
        duration: String(m?.duration ?? ""),
        dosage: String(m?.dosage ?? ""),
        instructions: String(m?.instructions ?? ""),
      }))
    : [{ medicineName: "", type: "", duration: "", dosage: "", instructions: "" }];

  const adviceOnDischarge = Array.isArray(nested.adviceOnDischarge)
    ? normalizeAdviceOnDischargeLines(
        (nested.adviceOnDischarge as unknown[]).map((a) => String(a ?? "").trim())
      ).join("\n")
    : "";

  const dischargeTypeRaw = String(nested.dischargeType ?? "Normal");
  const dischargeType = DISCHARGE_TYPE_OPTIONS.some((o) => o.value === dischargeTypeRaw)
    ? (dischargeTypeRaw as TDischargeType)
    : "Normal";

  const dorRequestedByTypeRaw = String(nested.dorRequestedByType ?? "").trim();
  const dorRequestedByNameRaw = String(nested.dorRequestedByName ?? "").trim();
  const dorRequestedByParsed =
    dorRequestedByTypeRaw || dorRequestedByNameRaw
      ? {
          type: DOR_REQUESTED_BY_TYPE_OPTIONS.some((o) => o.value === dorRequestedByTypeRaw)
            ? (dorRequestedByTypeRaw as TDorRequestedByType)
            : ("" as const),
          name: dorRequestedByNameRaw,
        }
      : parseDorRequestedBy(nested.dorRequestedBy);

  return {
    dischargeType,
    dischargeDate:
      parseDischargeDateValue(nested.dischargeDate) ??
      parseDischargeDateValue(nested.dateOfDischarge) ??
      new Date().toISOString().slice(0, 10),
    clinicalSummary: String(nested.clinicalSummary ?? ""),
    provisionalDiagnosis,
    finalDiagnosis,
    courseInHospital: String(nested.courseInHospital ?? ""),
    treatmentGiven: String(nested.treatmentGiven ?? ""),
    conditionOnDischarge: String(nested.conditionOnDischarge ?? ""),
    dischargeBp: String(nested.dischargeBp ?? nested.bpAtDischarge ?? ""),
    dischargePulse: String(nested.dischargePulse ?? nested.pulseAtDischarge ?? ""),
    dischargeTemp: String(nested.dischargeTemp ?? nested.tempAtDischarge ?? ""),
    dischargeSpO2: String(nested.dischargeSpO2 ?? nested.spo2AtDischarge ?? ""),
    allergies: String(nested.allergies ?? ""),
    medicinesOnDischarge: medicinesOnDischarge.length
      ? medicinesOnDischarge
      : [{ medicineName: "", type: "", duration: "", dosage: "", instructions: "" }],
    adviceOnDischarge,
    followUp: normalizeFollowUpDate(String(nested.followUp ?? "")),
    lamaReason: String(nested.lamaReason ?? ""),
    dorRequestedByType: dorRequestedByParsed.type,
    dorRequestedByName: dorRequestedByParsed.name,
    dorReason: String(nested.dorReason ?? ""),
    deathDateTime: toDateTimeLocalValue(nested.deathDateTime),
    deathCause: String(nested.deathCause ?? ""),
    referHospitalName: String(nested.referHospitalName ?? ""),
    referReason: String(nested.referReason ?? ""),
  };
};

const trimOptional = (value: string): string | undefined => {
  const trimmed = value.trim();
  return trimmed || undefined;
};

const toApiDateTime = (value: string): string | undefined => {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.length === 16 ? `${trimmed}:00` : trimmed;
};

export const validateDischargeSummaryForm = (
  form: IDischargeSummaryFormState
): string | null => {
  if (!form.dischargeDate) return "Discharge date is required.";

  switch (form.dischargeType) {
    case "LAMA":
      if (!form.lamaReason.trim()) return "LAMA reason is required.";
      break;
    case "DOR":
      if (!form.dorRequestedByType) return "Requested by type is required for DOR.";
      if (!form.dorRequestedByName.trim()) return "Requested by name is required for DOR.";
      if (!form.dorReason.trim()) return "DOR reason is required.";
      break;
    case "Death":
      if (!form.deathDateTime.trim()) return "Death date & time is required.";
      if (!form.deathCause.trim()) return "Cause of death is required.";
      break;
    default:
      break;
  }

  return null;
};

export const buildDischargeSummaryPayload = (
  form: IDischargeSummaryFormState
): IDischargeSummaryPayload => {
  const base: IDischargeSummaryPayload = {
    dischargeType: form.dischargeType,
    dischargeDate: form.dischargeDate,
    clinicalSummary: form.clinicalSummary.trim(),
    provisionalDiagnosis: form.provisionalDiagnosis
      .map((d) => ({
        icdCode: d.icdCode.trim(),
        diagnosisName: d.diagnosisName.trim(),
      }))
      .filter((d) => d.icdCode || d.diagnosisName),
    finalDiagnosis: form.finalDiagnosis
      .map((d) => ({
        icdCode: d.icdCode.trim(),
        diagnosisName: d.diagnosisName.trim(),
      }))
      .filter((d) => d.icdCode || d.diagnosisName),
    courseInHospital: form.courseInHospital.trim(),
    treatmentGiven: form.treatmentGiven.trim(),
    conditionOnDischarge: form.conditionOnDischarge.trim(),
    dischargeBp: trimOptional(form.dischargeBp ?? ""),
    dischargePulse: trimOptional(form.dischargePulse ?? ""),
    dischargeTemp: trimOptional(form.dischargeTemp ?? ""),
    dischargeSpO2: trimOptional(form.dischargeSpO2 ?? ""),
    allergies: trimOptional(form.allergies ?? ""),
    medicinesOnDischarge: form.medicinesOnDischarge
      .map((m) => ({
        medicineName: m.medicineName.trim(),
        ...(m.type?.trim() ? { type: m.type.trim() } : {}),
        duration: m.duration.trim(),
        dosage: m.dosage.trim(),
        ...(m.instructions?.trim() ? { instructions: m.instructions.trim() } : {}),
      }))
      .filter((m) => m.medicineName),
    adviceOnDischarge: normalizeAdviceOnDischargeLines(
      form.adviceOnDischarge.split("\n").map((line) => line.trim())
    ),
    followUp: normalizeFollowUpDate(form.followUp),
  };

  switch (form.dischargeType) {
    case "LAMA":
      return {
        ...base,
        lamaReason: trimOptional(form.lamaReason),
      };
    case "DOR":
      return {
        ...base,
        dorRequestedBy: trimOptional(
          buildDorRequestedBy(form.dorRequestedByType, form.dorRequestedByName)
        ),
        dorReason: trimOptional(form.dorReason),
      };
    case "Death":
      return {
        ...base,
        deathDateTime: toApiDateTime(form.deathDateTime),
        deathCause: trimOptional(form.deathCause),
      };
    case "Refer":
      return {
        ...base,
        referHospitalName: trimOptional(form.referHospitalName),
        referReason: trimOptional(form.referReason),
      };
    default:
      return base;
  }
};
