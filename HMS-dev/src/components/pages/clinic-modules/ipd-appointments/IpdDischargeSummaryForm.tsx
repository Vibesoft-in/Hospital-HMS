"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "@/environment";
import { fetchMedicineTypes } from "@/core/api/medicineApi";
import CommonSelect, { type Option } from "@/core/common/common-select/commonSelect";
import IcdDiagnosisMultiSelect from "@/components/pages/clinic-modules/ipd-appointments/IcdDiagnosisMultiSelect";
import MedicineNameSelect from "@/components/pages/clinic-modules/ipd-appointments/MedicineNameSelect";
import MultiSelectWithOther from "@/components/pages/clinic-modules/ipd-appointments/MultiSelectWithOther";
import {
  ADVICE_ON_DISCHARGE_OTHER_OPTION,
  ADVICE_ON_DISCHARGE_PRESETS,
  buildCustomDuration,
  buildDischargeSummaryPayload,
  CONDITION_ON_DISCHARGE_OPTIONS,
  DISCHARGE_TYPE_OPTIONS,
  DOR_REQUESTED_BY_TYPE_OPTIONS,
  DOSAGE_OPTIONS,
  DURATION_PRESET_OPTIONS,
  DURATION_UNIT_OPTIONS,
  emptyDischargeSummaryForm,
  FOLLOW_UP_PRESET_OPTIONS,
  FOLLOW_UP_SPECIFIC_DATE_VALUE,
  dateInputValueToFollowUp,
  followUpToDateInputValue,
  isFollowUpSpecificDate,
  normalizeDischargeSummaryFromApi,
  parseMedicineDuration,
  showDischargeTypeDetailCard,
  validateDischargeSummaryForm,
  type IDischargeSummaryFormState,
  type TDischargeType,
  type TDurationUnit,
} from "@/components/pages/clinic-modules/ipd-appointments/ipdDischargeSummaryTypes";

interface IProps {
  ipdId: string;
  ipdStatus?: string;
  initialSummary?: unknown;
  open: boolean;
  onClose: () => void;
  onDischargeComplete?: () => void;
}

const LABEL_CLASS = "form-label mb-1 fw-medium text-dark fs-14";

const OFFCANVAS_STYLE = {
  visibility: "visible" as const,
  width: "min(900px, 100vw - 1rem)",
  zIndex: 1045,
  top: 0,
  right: 0,
  height: "100vh",
};
const COMPACT_TEXTAREA_STYLE = {
  minHeight: "38px",
  resize: "vertical" as const,
};

const PAIRED_FIELD_HEIGHT = "40px";
const DISCHARGE_CARD_FIELD_FONT_SIZE = "0.9375rem";

const PAIRED_INPUT_STYLE = {
  height: PAIRED_FIELD_HEIGHT,
  minHeight: PAIRED_FIELD_HEIGHT,
  fontSize: DISCHARGE_CARD_FIELD_FONT_SIZE,
};

const PAIRED_TEXTAREA_STYLE = {
  height: PAIRED_FIELD_HEIGHT,
  minHeight: PAIRED_FIELD_HEIGHT,
  fontSize: DISCHARGE_CARD_FIELD_FONT_SIZE,
  resize: "vertical" as const,
  overflow: "auto",
};

const getAxiosMessage = (err: unknown, fallback: string) => {
  if (!axios.isAxiosError(err)) return fallback;
  const data = err.response?.data as
    | {
        message?: unknown;
        data?: { error?: { message?: unknown } };
      }
    | undefined;
  if (typeof data?.message === "string" && data.message.trim()) return data.message;
  const nestedMessage = data?.data?.error?.message;
  if (typeof nestedMessage === "string" && nestedMessage.trim()) return nestedMessage;
  return fallback;
};

const buildDurationUiState = (
  medicines: IDischargeSummaryFormState["medicinesOnDischarge"]
) => {
  const nextMode: Record<number, boolean> = {};
  const nextDraft: Record<number, { value: string; unit: TDurationUnit }> = {};
  medicines.forEach((med, index) => {
    const parsed = parseMedicineDuration(med.duration);
    if (parsed.preset !== "Custom") return;
    nextMode[index] = true;
    nextDraft[index] = {
      value: parsed.customValue,
      unit: parsed.customUnit,
    };
  });
  return { nextMode, nextDraft };
};

const IpdDischargeSummaryForm = ({
  ipdId,
  ipdStatus,
  initialSummary,
  open,
  onClose,
  onDischargeComplete,
}: IProps) => {
  const [form, setForm] = useState<IDischargeSummaryFormState>(emptyDischargeSummaryForm);
  const [loading, setLoading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "danger"; text: string } | null>(
    null
  );
  const [customDurationMode, setCustomDurationMode] = useState<Record<number, boolean>>({});
  const [customDurationDraft, setCustomDurationDraft] = useState<
    Record<number, { value: string; unit: TDurationUnit }>
  >({});
  const [medicineTypeOptions, setMedicineTypeOptions] = useState<Option[]>([]);
  const [medicineTypesLoading, setMedicineTypesLoading] = useState(false);
  const [followUpDateMode, setFollowUpDateMode] = useState(false);

  const isDischarged =
    ipdStatus === "Completed" ||
    ipdStatus === "Discharged" ||
    ipdStatus?.toLowerCase() === "discharged";

  const toSelectOptions = <T extends { value: string; label: string }>(
    opts: readonly T[]
  ): Option[] => opts.map((opt) => ({ value: opt.value, label: opt.label }));

  const dischargeTypeSelectOptions = useMemo(
    () => toSelectOptions(DISCHARGE_TYPE_OPTIONS),
    []
  );
  const conditionOnDischargeOptions = useMemo(
    () => toSelectOptions(CONDITION_ON_DISCHARGE_OPTIONS),
    []
  );
  const dosageSelectOptions = useMemo(() => toSelectOptions(DOSAGE_OPTIONS), []);
  const durationPresetOptions = useMemo(
    () => toSelectOptions(DURATION_PRESET_OPTIONS),
    []
  );
  const durationUnitOptions = useMemo(
    () => toSelectOptions(DURATION_UNIT_OPTIONS),
    []
  );
  const followUpPresetOptions = useMemo(
    () => toSelectOptions(FOLLOW_UP_PRESET_OPTIONS),
    []
  );
  const dorRequestedByTypeOptions = useMemo(
    () => toSelectOptions(DOR_REQUESTED_BY_TYPE_OPTIONS),
    []
  );

  const selectedDischargeType =
    dischargeTypeSelectOptions.find((o) => o.value === form.dischargeType) ?? null;
  const selectedConditionOnDischarge =
    conditionOnDischargeOptions.find((o) => o.value === form.conditionOnDischarge) ??
    null;
  const selectedDorRequestedByType =
    dorRequestedByTypeOptions.find((o) => o.value === form.dorRequestedByType) ?? null;
  const followUpIsSpecificDate = isFollowUpSpecificDate(form.followUp);
  const showFollowUpDatePicker = followUpDateMode || followUpIsSpecificDate;
  const selectedFollowUp =
    followUpPresetOptions.find((o) =>
      showFollowUpDatePicker
        ? o.value === FOLLOW_UP_SPECIFIC_DATE_VALUE
        : o.value === form.followUp
    ) ?? null;

  const adviceOnDischargeOptions = useMemo(
    () => [...ADVICE_ON_DISCHARGE_PRESETS, ADVICE_ON_DISCHARGE_OTHER_OPTION],
    []
  );

  const medicineInstructionOptions = useMemo(
    () => [
      { value: "before_food", label: "1. Before food", text: "1. Before food" },
      { value: "after_food", label: "2. After food", text: "2. After food" },
      { value: "empty_stomach", label: "3. Empty stomach", text: "3. Empty stomach" },
      { value: "with_milk", label: "4. With milk", text: "4. With milk" },
      { value: "sos", label: "5. SOS (as needed)", text: "5. SOS (as needed)" },
      {
        value: "avoid_alcohol",
        label: "6. Avoid alcohol with this medicine",
        text: "6. Avoid alcohol with this medicine",
      },
      {
        value: "do_not_skip_doses",
        label: "7. Do not skip doses",
        text: "7. Do not skip doses",
      },
      { value: "other", label: "8. Other ", text: "__INSTRUCTION_OTHER__" },
    ],
    []
  );

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const loadMedicineTypes = async () => {
      setMedicineTypesLoading(true);
      try {
        const types = await fetchMedicineTypes();
        if (cancelled) return;
        setMedicineTypeOptions(types.map((type) => ({ value: type, label: type })));
      } catch {
        if (!cancelled) setMedicineTypeOptions([]);
      } finally {
        if (!cancelled) setMedicineTypesLoading(false);
      }
    };
    void loadMedicineTypes();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const updateMedicineField = (
    index: number,
    patch: Partial<IDischargeSummaryFormState["medicinesOnDischarge"][number]>
  ) => {
    setForm((prev) => {
      const next = [...prev.medicinesOnDischarge];
      const current = next[index];
      if (!current) return prev;
      next[index] = { ...current, ...patch };
      return { ...prev, medicinesOnDischarge: next };
    });
  };

  const handleDurationPresetChange = (index: number, preset: string | undefined) => {
    if (!preset) {
      setCustomDurationMode((prev) => {
        const next = { ...prev };
        delete next[index];
        return next;
      });
      setCustomDurationDraft((prev) => {
        const next = { ...prev };
        delete next[index];
        return next;
      });
      updateMedicineField(index, { duration: "" });
      return;
    }
    if (preset === "Custom") {
      setCustomDurationMode((prev) => ({ ...prev, [index]: true }));
      setCustomDurationDraft((prev) => ({
        ...prev,
        [index]: prev[index] ?? { value: "", unit: "Days" },
      }));
      updateMedicineField(index, { duration: "" });
      return;
    }
    setCustomDurationMode((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
    setCustomDurationDraft((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
    updateMedicineField(index, { duration: preset });
  };

  const handleCustomDurationChange = (
    index: number,
    value: string,
    unit: TDurationUnit
  ) => {
    setCustomDurationDraft((prev) => ({ ...prev, [index]: { value, unit } }));
    updateMedicineField(index, { duration: buildCustomDuration(value, unit) });
  };

  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      const normalized = normalizeDischargeSummaryFromApi(initialSummary);
      if (normalized) {
        setForm(normalized);
        const { nextMode, nextDraft } = buildDurationUiState(normalized.medicinesOnDischarge);
        setCustomDurationMode(nextMode);
        setCustomDurationDraft(nextDraft);
        setFollowUpDateMode(isFollowUpSpecificDate(normalized.followUp));
        return;
      }
      setForm(emptyDischargeSummaryForm());
      setCustomDurationMode({});
      setCustomDurationDraft({});
      setFollowUpDateMode(false);
    } finally {
      setLoading(false);
    }
  }, [initialSummary]);

  useEffect(() => {
    if (!open) return;
    setFeedback(null);
    void loadSummary();
  }, [open, loadSummary]);

  const handleSaveDraft = async () => {
    if (!API_BASE_URL || !ipdId) return;
    const validationError = validateDischargeSummaryForm(form);
    if (validationError) {
      setFeedback({ type: "danger", text: validationError });
      return;
    }
    try {
      setSavingDraft(true);
      setFeedback(null);
      const payload = buildDischargeSummaryPayload(form);
      const res = await axios.put(
        `${API_BASE_URL}/hospital/ipd/${ipdId}/discharge-summary`,
        payload
      );
      if (res.data?.code === 200 || (res.status >= 200 && res.status < 300)) {
        onDischargeComplete?.();
        onClose();
      } else {
        setFeedback({
          type: "danger",
          text: res.data?.message ?? "Failed to save discharge summary draft.",
        });
      }
    } catch (err) {
      setFeedback({
        type: "danger",
        text: getAxiosMessage(err, "Failed to save discharge summary draft."),
      });
    } finally {
      setSavingDraft(false);
    }
  };

  const updateField = <K extends keyof IDischargeSummaryFormState>(
    key: K,
    value: IDischargeSummaryFormState[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const addMedicine = () => {
    setForm((prev) => ({
      ...prev,
      medicinesOnDischarge: [
        ...prev.medicinesOnDischarge,
        { medicineName: "", type: "", duration: "", dosage: "", instructions: "" },
      ],
    }));
  };

  const removeMedicine = (index: number) => {
    const reindexRecord = <T,>(prev: Record<number, T>): Record<number, T> => {
      const next: Record<number, T> = {};
      Object.entries(prev).forEach(([key, val]) => {
        const i = Number(key);
        if (Number.isNaN(i) || i === index) return;
        next[i > index ? i - 1 : i] = val;
      });
      return next;
    };
    setCustomDurationMode((prev) => reindexRecord(prev));
    setCustomDurationDraft((prev) => reindexRecord(prev));
    setForm((prev) => ({
      ...prev,
      medicinesOnDischarge:
        prev.medicinesOnDischarge.length > 1
          ? prev.medicinesOnDischarge.filter((_, i) => i !== index)
          : [{ medicineName: "", type: "", duration: "", dosage: "", instructions: "" }],
    }));
  };

  if (!open) return null;

  return (
    <>
      <div
        className="position-fixed top-0 start-0 w-100 h-100"
        style={{ zIndex: 1040, backgroundColor: "rgba(0, 0, 0, 0.5)" }}
        aria-hidden
        onClick={onClose}
      />
      <div
        className="offcanvas offcanvas-end show position-fixed d-flex flex-column"
        style={OFFCANVAS_STYLE}
        tabIndex={-1}
        aria-modal="true"
        role="dialog"
        aria-labelledby="ipd-discharge-summary-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="offcanvas-header border-bottom flex-shrink-0">
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <h5 id="ipd-discharge-summary-title" className="offcanvas-title fw-bold text-dark mb-0">
              Discharge Summary
            </h5>
            {isDischarged ? (
              <span className="badge badge-soft-success">Discharged</span>
            ) : null}
          </div>
          <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />
        </div>

        <div className="offcanvas-body overflow-y-auto flex-grow-1 text-dark">
          {loading ? (
            <div className="text-center text-muted py-4">
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
              Loading discharge summary…
            </div>
          ) : (
            <>
              {feedback ? (
                <div
                  className={`alert alert-${feedback.type === "success" ? "success" : "danger"} py-2 fs-14 mb-3`}
                  role="alert"
                >
                  {feedback.text}
                </div>
              ) : null}

              <fieldset disabled={isDischarged || savingDraft}>
                <div className="row g-2 mb-2">
                  <div className="col-12 col-md-4">
                    <label className={LABEL_CLASS}>
                      Discharge Type<span className="text-danger">*</span>
                    </label>
                    <CommonSelect
                      instanceId="ipd-discharge-type"
                      options={dischargeTypeSelectOptions}
                      value={selectedDischargeType}
                      onChange={(opt) => {
                        if (opt?.value) {
                          updateField("dischargeType", opt.value as TDischargeType);
                        }
                      }}
                      placeholder="Select discharge type"
                      className="w-100"
                      disabled={isDischarged || savingDraft}
                    />
                  </div>
                  <div className="col-12 col-md-4">
                    <label className={LABEL_CLASS} htmlFor="ipd-discharge-date">
                      Discharge Date<span className="text-danger">*</span>
                    </label>
                    <input
                      id="ipd-discharge-date"
                      type="date"
                      className="form-control"
                      value={form.dischargeDate}
                      onChange={(e) => updateField("dischargeDate", e.target.value)}
                    />
                  </div>
                  <div className="col-12 col-md-4">
                    <label className={LABEL_CLASS}>
                      Condition on Discharge
                    </label>
                    <CommonSelect
                      instanceId="ipd-condition-on-discharge"
                      options={conditionOnDischargeOptions}
                      value={selectedConditionOnDischarge}
                      onChange={(opt) =>
                        updateField("conditionOnDischarge", opt?.value ?? "")
                      }
                      placeholder="Select condition"
                      className="w-100"
                      disabled={isDischarged || savingDraft}
                    />
                  </div>
                </div>

                {showDischargeTypeDetailCard(form.dischargeType) ? (
                <div className="mb-3">
                  <label className={`${LABEL_CLASS} mb-1`}>
                    {DISCHARGE_TYPE_OPTIONS.find((o) => o.value === form.dischargeType)?.label ??
                      "Discharge Type Details"}
                  </label>
                  <div className="border rounded p-2 mb-2 bg-light">
                    {form.dischargeType === "LAMA" ? (
                      <div className="row g-2">
                        <div className="col-12">
                          <label className={`${LABEL_CLASS} fs-13`} htmlFor="ipd-lama-reason">
                            LAMA Reason<span className="text-danger">*</span>
                          </label>
                          <textarea
                            id="ipd-lama-reason"
                            className="form-control form-control-sm"
                            rows={2}
                            style={{
                              ...COMPACT_TEXTAREA_STYLE,
                              fontSize: DISCHARGE_CARD_FIELD_FONT_SIZE,
                            }}
                            placeholder="e.g. Patient insisted on leaving against medical advice. AMA form signed."
                            value={form.lamaReason}
                            onChange={(e) => updateField("lamaReason", e.target.value)}
                          />
                        </div>
                      </div>
                    ) : null}

                    {form.dischargeType === "DOR" ? (
                      <div className="row g-2">
                        <div className="col-12 col-md-4">
                          <label className={`${LABEL_CLASS} fs-13`} htmlFor="ipd-dor-requested-by-type">
                            Requested By<span className="text-danger">*</span>
                          </label>
                          <CommonSelect
                            instanceId="ipd-dor-requested-by-type"
                            options={dorRequestedByTypeOptions}
                            value={selectedDorRequestedByType}
                            onChange={(opt) =>
                              updateField(
                                "dorRequestedByType",
                                (opt?.value as (typeof form.dorRequestedByType)) ?? ""
                              )
                            }
                            placeholder="Select type"
                            className="w-100"
                            disabled={isDischarged || savingDraft}
                          />
                        </div>
                        <div className="col-12 col-md-4">
                          <label className={`${LABEL_CLASS} fs-13`} htmlFor="ipd-dor-requested-by-name">
                            Name<span className="text-danger">*</span>
                          </label>
                          <input
                            id="ipd-dor-requested-by-name"
                            type="text"
                            className="form-control form-control-sm"
                            style={PAIRED_INPUT_STYLE}
                            placeholder="Enter name"
                            value={form.dorRequestedByName}
                            onChange={(e) => updateField("dorRequestedByName", e.target.value)}
                            disabled={isDischarged || savingDraft}
                          />
                        </div>
                        <div className="col-12 col-md-4">
                          <label className={`${LABEL_CLASS} fs-13`} htmlFor="ipd-dor-reason">
                            DOR Reason<span className="text-danger">*</span>
                          </label>
                          <textarea
                            id="ipd-dor-reason"
                            className="form-control form-control-sm"
                            rows={1}
                            style={PAIRED_TEXTAREA_STYLE}
                            placeholder="e.g. Family requested discharge to continue treatment at home."
                            value={form.dorReason}
                            onChange={(e) => updateField("dorReason", e.target.value)}
                            disabled={isDischarged || savingDraft}
                          />
                        </div>
                      </div>
                    ) : null}

                    {form.dischargeType === "Death" ? (
                      <div className="row g-2">
                        <div className="col-12 col-md-6">
                          <label className={`${LABEL_CLASS} fs-13`} htmlFor="ipd-death-datetime">
                            Death Date & Time<span className="text-danger">*</span>
                          </label>
                          <input
                            id="ipd-death-datetime"
                            type="datetime-local"
                            className="form-control form-control-sm"
                            style={PAIRED_INPUT_STYLE}
                            value={form.deathDateTime}
                            onChange={(e) => updateField("deathDateTime", e.target.value)}
                          />
                        </div>
                        <div className="col-12 col-md-6">
                          <label className={`${LABEL_CLASS} fs-13`} htmlFor="ipd-death-cause">
                            Cause of Death<span className="text-danger">*</span>
                          </label>
                          <textarea
                            id="ipd-death-cause"
                            className="form-control form-control-sm"
                            rows={1}
                            style={PAIRED_TEXTAREA_STYLE}
                            placeholder="e.g. Cardiac arrest — unresponsive to resuscitation."
                            value={form.deathCause}
                            onChange={(e) => updateField("deathCause", e.target.value)}
                          />
                        </div>
                      </div>
                    ) : null}

                    {form.dischargeType === "Refer" ? (
                      <div className="row g-2">
                        <div className="col-12 col-md-6">
                          <label className={`${LABEL_CLASS} fs-13`} htmlFor="ipd-refer-hospital">
                            Refer Hospital Name
                          </label>
                          <input
                            id="ipd-refer-hospital"
                            type="text"
                            className="form-control form-control-sm"
                            style={PAIRED_INPUT_STYLE}
                            placeholder="e.g. AIIMS New Delhi"
                            value={form.referHospitalName}
                            onChange={(e) => updateField("referHospitalName", e.target.value)}
                          />
                        </div>
                        <div className="col-12 col-md-6">
                          <label className={`${LABEL_CLASS} fs-13`} htmlFor="ipd-refer-reason">
                            Refer Reason
                          </label>
                          <textarea
                            id="ipd-refer-reason"
                            className="form-control form-control-sm"
                            rows={1}
                            style={PAIRED_TEXTAREA_STYLE}
                            placeholder="e.g. Patient requires advanced cardiac surgery not available here."
                            value={form.referReason}
                            onChange={(e) => updateField("referReason", e.target.value)}
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
                ) : null}

                <div className="mb-3">
                  <label className={LABEL_CLASS} htmlFor="ipd-clinical-summary">
                    Clinical Summary
                  </label>
                  <textarea
                    id="ipd-clinical-summary"
                    className="form-control"
                    rows={1}
                    style={COMPACT_TEXTAREA_STYLE}
                    value={form.clinicalSummary}
                    onChange={(e) => updateField("clinicalSummary", e.target.value)}
                  />
                </div>

                <div className="mb-3">
                  <label className={LABEL_CLASS} htmlFor="ipd-provisional-diagnosis">
                    Provisional Diagnosis
                  </label>
                  <IcdDiagnosisMultiSelect
                    id="ipd-provisional-diagnosis"
                    value={form.provisionalDiagnosis}
                    onChange={(next) => updateField("provisionalDiagnosis", next)}
                    placeholder="Search provisional diagnosis..."
                    disabled={loading || savingDraft}
                  />
                </div>

                <div className="mb-3">
                  <label className={LABEL_CLASS} htmlFor="ipd-final-diagnosis">
                    Final Diagnosis
                  </label>
                  <IcdDiagnosisMultiSelect
                    id="ipd-final-diagnosis"
                    value={form.finalDiagnosis}
                    onChange={(next) => updateField("finalDiagnosis", next)}
                    placeholder="Search final diagnosis..."
                    disabled={loading || savingDraft}
                  />
                </div>

                <div className="row g-2 mb-3">
                  <div className="col-12 col-md-6">
                    <label className={LABEL_CLASS} htmlFor="ipd-course-in-hospital">
                      Course in Hospital
                    </label>
                    <textarea
                      id="ipd-course-in-hospital"
                      className="form-control"
                      rows={1}
                      style={COMPACT_TEXTAREA_STYLE}
                      value={form.courseInHospital}
                      onChange={(e) => updateField("courseInHospital", e.target.value)}
                    />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className={LABEL_CLASS} htmlFor="ipd-treatment-given">
                      Treatment Given
                    </label>
                    <textarea
                      id="ipd-treatment-given"
                      className="form-control"
                      rows={1}
                      style={COMPACT_TEXTAREA_STYLE}
                      value={form.treatmentGiven}
                      onChange={(e) => updateField("treatmentGiven", e.target.value)}
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <label className={LABEL_CLASS}>Vitals at Discharge</label>
                  <div className="row g-2">
                    <div className="col-12 col-sm-6 col-lg-3">
                      <input
                        id="ipd-discharge-bp"
                        type="text"
                        className="form-control text-dark"
                        style={PAIRED_INPUT_STYLE}
                        placeholder="BP (e.g. 120/80 mmHg)"
                        value={form.dischargeBp ?? ""}
                        onChange={(e) => updateField("dischargeBp", e.target.value)}
                      />
                    </div>
                    <div className="col-12 col-sm-6 col-lg-3">
                      <input
                        id="ipd-discharge-pulse"
                        type="text"
                        className="form-control text-dark"
                        style={PAIRED_INPUT_STYLE}
                        placeholder="Pulse (bpm)"
                        value={form.dischargePulse ?? ""}
                        onChange={(e) => updateField("dischargePulse", e.target.value)}
                      />
                    </div>
                    <div className="col-12 col-sm-6 col-lg-3">
                      <input
                        id="ipd-discharge-temp"
                        type="text"
                        className="form-control text-dark"
                        style={PAIRED_INPUT_STYLE}
                        placeholder="Temp (F/C)"
                        value={form.dischargeTemp ?? ""}
                        onChange={(e) => updateField("dischargeTemp", e.target.value)}
                      />
                    </div>
                    <div className="col-12 col-sm-6 col-lg-3">
                      <input
                        id="ipd-discharge-spo2"
                        type="text"
                        className="form-control text-dark"
                        style={PAIRED_INPUT_STYLE}
                        placeholder="SpO2 (%)"
                        value={form.dischargeSpO2 ?? ""}
                        onChange={(e) => updateField("dischargeSpO2", e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="mb-3">
                  <label className={LABEL_CLASS} htmlFor="ipd-allergies">
                    Allergies
                  </label>
                  <textarea
                    id="ipd-allergies"
                    className="form-control"
                    rows={1}
                    style={COMPACT_TEXTAREA_STYLE}
                    placeholder="Enter known allergies"
                    value={form.allergies ?? ""}
                    onChange={(e) => updateField("allergies", e.target.value)}
                  />
                </div>

                <div className="mb-3">
                  <div className="d-flex align-items-center justify-content-between mb-1">
                    <label className={`${LABEL_CLASS} mb-0`}>Medicines on Discharge</label>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary py-0 px-2"
                      onClick={addMedicine}
                    >
                      <i className="ti ti-plus me-1" />
                      Add
                    </button>
                  </div>
                  {form.medicinesOnDischarge.map((med, index) => {
                    const parsedDuration = parseMedicineDuration(med.duration);
                    const isCustomDuration =
                      Boolean(customDurationMode[index]) || parsedDuration.preset === "Custom";
                    const selectedDuration = isCustomDuration
                      ? durationPresetOptions.find((o) => o.value === "Custom") ?? null
                      : durationPresetOptions.find((o) => o.value === parsedDuration.preset) ??
                        null;
                    const customDraft = customDurationDraft[index] ?? {
                      value: parsedDuration.customValue,
                      unit: parsedDuration.customUnit,
                    };
                    const selectedDosage =
                      dosageSelectOptions.find((o) => o.value === med.dosage) ?? null;
                    const selectedUnit =
                      durationUnitOptions.find((o) => o.value === customDraft.unit) ??
                      durationUnitOptions[0] ??
                      null;
                    const selectedMedicineType =
                      medicineTypeOptions.find((o) => o.value === (med.type ?? "")) ?? null;

                    return (
                    <div className="border rounded p-2 mb-2 bg-light" key={`med-${index}`}>
                      <div className="row g-2 align-items-center">
                        <div className="col-6 col-md-3">
                          <CommonSelect
                            instanceId={`ipd-med-type-${index}`}
                            options={medicineTypeOptions}
                            value={selectedMedicineType}
                            onChange={(opt) => {
                              const nextType = opt?.value ?? "";
                              updateMedicineField(index, {
                                type: nextType,
                                ...(med.medicineName ? { medicineName: "" } : {}),
                              });
                            }}
                            placeholder="Type"
                            className="w-100"
                            disabled={isDischarged || savingDraft}
                            isLoading={medicineTypesLoading}
                          />
                        </div>
                        <div className="col-6 col-md-3">
                          <MedicineNameSelect
                            id={`ipd-med-name-${index}`}
                            value={med.medicineName}
                            medicineType={med.type ?? ""}
                            onChange={(next) =>
                              updateMedicineField(index, { medicineName: next })
                            }
                            placeholder="Search medicine..."
                            disabled={isDischarged || savingDraft}
                          />
                        </div>
                        <div className="col-6 col-md-2">
                          <CommonSelect
                            instanceId={`ipd-med-duration-${index}`}
                            options={durationPresetOptions}
                            value={selectedDuration}
                            onChange={(opt) =>
                              handleDurationPresetChange(index, opt?.value)
                            }
                            placeholder="Duration"
                            className="w-100"
                            disabled={isDischarged || savingDraft}
                          />
                        </div>
                        <div className="col-6 col-md-3">
                          <CommonSelect
                            instanceId={`ipd-med-dosage-${index}`}
                            options={dosageSelectOptions}
                            value={selectedDosage}
                            onChange={(opt) =>
                              updateMedicineField(index, { dosage: opt?.value ?? "" })
                            }
                            placeholder="Dosage"
                            className="w-100"
                            disabled={isDischarged || savingDraft}
                          />
                        </div>
                        <div className="col-auto ms-md-auto">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => removeMedicine(index)}
                            aria-label="Remove medicine"
                          >
                            <i className="ti ti-trash" />
                          </button>
                        </div>
                        {isCustomDuration ? (
                          <>
                            <div className="col-4 col-sm-2 col-md-1">
                              <input
                                type="number"
                                min={1}
                                className="form-control text-dark"
                                style={PAIRED_INPUT_STYLE}
                                placeholder="No."
                                value={customDraft.value}
                                onChange={(e) =>
                                  handleCustomDurationChange(
                                    index,
                                    e.target.value,
                                    customDraft.unit
                                  )
                                }
                                aria-label={`Custom duration value ${index + 1}`}
                              />
                            </div>
                            <div className="col-8 col-sm-3 col-md-2">
                              <CommonSelect
                                instanceId={`ipd-med-duration-unit-${index}`}
                                options={durationUnitOptions}
                                value={selectedUnit}
                                onChange={(opt) =>
                                  handleCustomDurationChange(
                                    index,
                                    customDraft.value,
                                    (opt?.value as TDurationUnit) ?? "Days"
                                  )
                                }
                                placeholder="Unit"
                                className="w-100"
                                disabled={isDischarged || savingDraft}
                              />
                            </div>
                            <div className="col-12 col-sm-7 col-md-9">
                              <MultiSelectWithOther
                                id={`ipd-med-instructions-${index}`}
                                value={med.instructions ?? ""}
                                onChange={(next) =>
                                  updateMedicineField(index, { instructions: next })
                                }
                                disabled={isDischarged || savingDraft}
                                placeholder="Select instructions"
                                options={medicineInstructionOptions}
                                otherValue="other"
                              />
                            </div>
                          </>
                        ) : (
                          <div className="col-12">
                            <MultiSelectWithOther
                              id={`ipd-med-instructions-${index}`}
                              value={med.instructions ?? ""}
                              onChange={(next) =>
                                updateMedicineField(index, { instructions: next })
                              }
                              disabled={isDischarged || savingDraft}
                              placeholder="Select instructions"
                              options={medicineInstructionOptions}
                              otherValue="other"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    );
                  })}
                </div>

                <div className="row g-2 mb-0">
                  <div className="col-12 col-md-6">
                    <label className={LABEL_CLASS} htmlFor="ipd-advice-on-discharge">
                      Advice on Discharge
                    </label>
                    <MultiSelectWithOther
                      id="ipd-advice-on-discharge"
                      value={form.adviceOnDischarge}
                      onChange={(next) => updateField("adviceOnDischarge", next)}
                      disabled={isDischarged || savingDraft}
                      placeholder="Select advice items"
                      options={adviceOnDischargeOptions}
                      otherValue="other"
                    />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className={LABEL_CLASS}>Follow Up</label>
                    <div className="row g-2">
                      <div className={showFollowUpDatePicker ? "col-12 col-sm-6" : "col-12"}>
                        <CommonSelect
                          instanceId="ipd-follow-up"
                          options={followUpPresetOptions}
                          value={selectedFollowUp}
                          onChange={(opt) => {
                            const value = opt?.value ?? "";
                            if (value === FOLLOW_UP_SPECIFIC_DATE_VALUE) {
                              setFollowUpDateMode(true);
                              updateField(
                                "followUp",
                                followUpIsSpecificDate ? form.followUp : ""
                              );
                              return;
                            }
                            setFollowUpDateMode(false);
                            updateField("followUp", value);
                          }}
                          placeholder="Select follow up"
                          className="w-100"
                          disabled={isDischarged || savingDraft}
                        />
                      </div>
                      {showFollowUpDatePicker ? (
                        <div className="col-12 col-sm-6">
                          <input
                            id="ipd-follow-up-date"
                            type="date"
                            className="form-control"
                            value={
                              followUpIsSpecificDate
                                ? followUpToDateInputValue(form.followUp)
                                : ""
                            }
                            onChange={(e) =>
                              updateField(
                                "followUp",
                                dateInputValueToFollowUp(e.target.value)
                              )
                            }
                            aria-label="Follow up date"
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </fieldset>
            </>
          )}
        </div>

        {!loading && !isDischarged ? (
          <div className="offcanvas-footer border-top d-flex flex-wrap justify-content-end gap-2 p-3 flex-shrink-0">
            <button
              type="button"
              className="btn btn-light"
              onClick={onClose}
              disabled={savingDraft}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-outline-primary"
              onClick={handleSaveDraft}
              disabled={savingDraft}
            >
              {savingDraft ? (
                <>
                  <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" />
                  Saving draft…
                </>
              ) : (
                "Save as Draft"
              )}
            </button>
          </div>
        ) : null}

        {!loading && isDischarged ? (
          <div className="offcanvas-footer border-top d-flex justify-content-end p-3 flex-shrink-0">
            <button type="button" className="btn btn-light" onClick={onClose}>
              Close
            </button>
          </div>
        ) : null}
      </div>
    </>
  );
};

export default IpdDischargeSummaryForm;
