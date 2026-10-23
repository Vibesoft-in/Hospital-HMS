"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import CommonSelect, { type Option } from "@/core/common/common-select/commonSelect";
import {
  fetchFhirPrefill,
  // finalizeFhirHealthRecord,
  extractFhirRecordData,
  getFhirHealthRecord,
  saveFhirHealthRecord,
  updateFhirHealthRecord,
  uploadFhirAttachment,
} from "@/core/api/fhirHealthRecordApi";
import {
  FHIR_HI_TYPE_OPTIONS,
  type IFhirAttachment,
  type IFhirDiagnosisItem,
  type IFhirHealthRecordListItem,
  type IFhirInvestigationAdvisedItem,
  type IFhirInvestigationItem,
  type IFhirInvoiceLineItem,
  type IFhirMedicationItem,
  type IFhirProcedureItem,
  type IFhirTestResultItem,
  type IFhirVitalSigns,
  type IFhirWomenHealth,
  type TFhirHiType,
  type TFhirSourceType,
} from "@/core/types/fhirHealthRecord";
import {
  LABEL_CLASS,
  dateTimeLocalToIso,
  emptyInvestigation,
  emptyInvestigationAdvised,
  emptyInvoiceLineItem,
  emptyMedication,
  emptyProcedure,
  emptyTestResult,
  extractPrefillMetadata,
  getEmptyFormDataForHiType,
  mergePrefillIntoFormData,
  serializeFormDataForApi,
  toDateInputValue,
  toDateTimeLocalValue,
} from "./fhirFormHelpers";

interface IProps {
  sourceType: TFhirSourceType;
  sourceId: string;
  authorId?: string;
  /** When set, form loads/edits an existing record via GET/PATCH */
  editRecordId?: string | null;
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

const OFFCANVAS_STYLE = {
  visibility: "visible" as const,
  width: "min(980px, 100vw - 1rem)",
  zIndex: 1045,
  top: 0,
  right: 0,
  height: "100vh",
};

/** Standard readable input size (not form-control-sm) */
const INPUT_CLASS = "form-control text-dark fs-14";

type TFieldCol =
  | "full"
  | "half"
  | "third"
  | "quarter"
  | "name"
  | "age"
  | "gender"
  | "mrd"
  | "compact"
  | "date";

const COL_CLASS: Record<TFieldCol, string> = {
  full: "col-12",
  half: "col-12 col-md-6",
  third: "col-12 col-sm-6 col-md-4",
  quarter: "col-6 col-md-3",
  name: "col-12 col-sm-6 col-md-4",
  age: "col-6 col-sm-3 col-md-2",
  gender: "col-6 col-sm-3 col-md-2",
  mrd: "col-12 col-sm-6 col-md-4",
  compact: "col-6 col-md-3",
  date: "col-12 col-sm-6 col-md-4",
};

const StringListField = ({
  label,
  values,
  onChange,
  disabled,
}: {
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}) => {
  const [draft, setDraft] = useState("");

  const handleAdd = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onChange([...values, trimmed]);
    setDraft("");
  };

  return (
    <div className="mb-2">
      <label className={LABEL_CLASS}>{label}</label>
      <div className="d-flex flex-wrap gap-1 mb-2">
        {values.map((item, index) => (
          <span key={`${item}-${index}`} className="badge bg-light text-dark border d-inline-flex align-items-center gap-1 fs-13">
            {item}
            {!disabled ? (
              <button
                type="button"
                className="btn btn-link btn-sm p-0 text-danger"
                onClick={() => onChange(values.filter((_, i) => i !== index))}
                aria-label={`Remove ${item}`}
              >
                <i className="ti ti-x" />
              </button>
            ) : null}
          </span>
        ))}
      </div>
      {!disabled ? (
        <div className="input-group">
          <input
            type="text"
            className={INPUT_CLASS}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAdd();
              }
            }}
            placeholder={`Add ${label.toLowerCase()}`}
          />
          <button type="button" className="btn btn-outline-primary" onClick={handleAdd}>
            Add
          </button>
        </div>
      ) : null}
    </div>
  );
};

const TEXTAREA_STYLE = {
  minHeight: "38px",
  height: "38px",
  resize: "vertical" as const,
};

const TextField = ({
  id,
  label,
  value,
  onChange,
  type = "text",
  disabled,
  rows,
  col = "half",
}: {
  id: string;
  label: string;
  value: string | number;
  onChange: (val: string) => void;
  type?: "text" | "number" | "date" | "datetime-local" | "tel";
  disabled?: boolean;
  rows?: number;
  col?: TFieldCol;
}) => (
  <div className={`mb-2 ${rows ? COL_CLASS.full : COL_CLASS[col]}`}>
    <label className={LABEL_CLASS} htmlFor={id}>
      {label}
    </label>
    {rows ? (
      <textarea
        id={id}
        className={INPUT_CLASS}
        rows={rows}
        style={TEXTAREA_STYLE}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
    ) : (
      <input
        id={id}
        type={type}
        className={INPUT_CLASS}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
    )}
  </div>
);

const AddHealthRecordForm = ({
  sourceType,
  sourceId,
  authorId,
  editRecordId = null,
  open,
  onClose,
  onSaved,
}: IProps) => {
  const [hiType, setHiType] = useState<TFhirHiType>("OPConsultation");
  const [recordDate, setRecordDate] = useState(() => new Date().toISOString());
  const [formData, setFormData] = useState<Record<string, unknown>>(() =>
    getEmptyFormDataForHiType("OPConsultation")
  );
  const [attachments, setAttachments] = useState<IFhirAttachment[]>([]);
  const [fhirRecordId, setFhirRecordId] = useState<string>("");
  const [loadingPrefill, setLoadingPrefill] = useState(false);
  const [saving, setSaving] = useState(false);
  // const [finalizing, setFinalizing] = useState(false);
  const finalizing = false;
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "danger"; text: string } | null>(
    null
  );

  const isEditMode = Boolean(editRecordId?.trim() || fhirRecordId.trim());

  const hiTypeOptions: Option[] = useMemo(
    () => FHIR_HI_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
    []
  );

  const selectedHiType = useMemo(
    () => hiTypeOptions.find((o) => o.value === hiType) ?? null,
    [hiType, hiTypeOptions]
  );

  const updateField = useCallback((key: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }, []);

  const applyRecordToForm = useCallback((record: IFhirHealthRecordListItem) => {
    const nextHiType = (
      FHIR_HI_TYPE_OPTIONS.some((o) => o.value === record.hiType)
        ? record.hiType
        : "OPConsultation"
    ) as TFhirHiType;
    const empty = getEmptyFormDataForHiType(nextHiType);
    const recordData = extractFhirRecordData(record);
    setHiType(nextHiType);
    setFormData(mergePrefillIntoFormData(nextHiType, empty, recordData));
    setRecordDate(record.metadata?.date || new Date().toISOString());
    setAttachments(Array.isArray(record.attachments) ? record.attachments : []);
    const id = record._id || record.fhirId || record.id || editRecordId || "";
    if (id) setFhirRecordId(id);
  }, [editRecordId]);

  const loadPrefill = useCallback(
    async (nextHiType: TFhirHiType) => {
      if (!sourceId) return;
      setLoadingPrefill(true);
      setFeedback(null);
      const empty = getEmptyFormDataForHiType(nextHiType);
      try {
        const prefill = await fetchFhirPrefill(sourceType, sourceId, nextHiType);
        setFormData(mergePrefillIntoFormData(nextHiType, empty, prefill));
        const meta = extractPrefillMetadata(prefill);
        if (meta?.date) setRecordDate(meta.date);
      } catch {
        setFormData(empty);
        setFeedback({ type: "danger", text: "Could not load prefill data. You can fill the form manually." });
      } finally {
        setLoadingPrefill(false);
      }
    },
    [sourceId, sourceType]
  );

  const loadExistingRecord = useCallback(
    async (recordId: string) => {
      setLoadingPrefill(true);
      setFeedback(null);
      try {
        const record = await getFhirHealthRecord(recordId);
        applyRecordToForm(record);
      } catch (err) {
        setFeedback({
          type: "danger",
          text: err instanceof Error ? err.message : "Failed to load health record",
        });
      } finally {
        setLoadingPrefill(false);
      }
    },
    [applyRecordToForm]
  );

  useEffect(() => {
    if (!open) return;
    setAttachments([]);
    setFeedback(null);

    if (editRecordId?.trim()) {
      setFhirRecordId(editRecordId.trim());
      void loadExistingRecord(editRecordId.trim());
      return;
    }

    setFhirRecordId("");
    setRecordDate(new Date().toISOString());
    void loadPrefill(hiType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editRecordId]);

  const handleHiTypeChange = (opt: Option | null) => {
    if (editRecordId?.trim() || fhirRecordId.trim()) return;
    const next = (opt?.value ?? "OPConsultation") as TFhirHiType;
    setHiType(next);
    setAttachments([]);
    void loadPrefill(next);
  };

  const buildPayload = () => ({
    sourceType,
    sourceId,
    hiType,
    metadata: {
      date: recordDate || new Date().toISOString(),
      authorId: (authorId ?? "").trim(),
    },
    data: serializeFormDataForApi(hiType, formData),
    attachments,
  });

  const persistDraft = async (): Promise<string | null> => {
    const payload = buildPayload();
    if (fhirRecordId.trim()) {
      return updateFhirHealthRecord(fhirRecordId.trim(), payload);
    }
    return saveFhirHealthRecord(payload);
  };

  const handleSaveDraft = async (): Promise<string | null> => {
    if (!sourceId) return null;
    if (!authorId?.trim()) {
      setFeedback({ type: "danger", text: "Doctor information is required to save a health record." });
      return null;
    }

    setSaving(true);
    setFeedback(null);
    try {
      const id = await persistDraft();
      if (id) setFhirRecordId(id);
      setFeedback({ type: "success", text: "Draft saved successfully." });
      onSaved?.();
      setTimeout(() => onClose(), 800);
      return id || fhirRecordId || null;
    } catch (err) {
      setFeedback({
        type: "danger",
        text: err instanceof Error ? err.message : "Failed to save draft",
      });
      return null;
    } finally {
      setSaving(false);
    }
  };

  /*
  const handleFinalize = async () => {
    if (!sourceId) return;
    if (!authorId?.trim()) {
      setFeedback({ type: "danger", text: "Doctor information is required to finalize a health record." });
      return;
    }

    setFinalizing(true);
    setFeedback(null);
    try {
      setSaving(true);
      let recordId = "";
      try {
        recordId = (await persistDraft()) || fhirRecordId;
        if (recordId) setFhirRecordId(recordId);
      } finally {
        setSaving(false);
      }

      if (!recordId) {
        setFeedback({
          type: "danger",
          text: "Could not get record id. Save draft first, then finalize.",
        });
        return;
      }

      await finalizeFhirHealthRecord(recordId);
      setFeedback({ type: "success", text: "Health record finalized successfully." });
      onSaved?.();
      setTimeout(() => onClose(), 800);
    } catch (err) {
      setFeedback({
        type: "danger",
        text: err instanceof Error ? err.message : "Failed to finalize health record",
      });
    } finally {
      setFinalizing(false);
    }
  };
  */

  const handleAttachmentUpload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setFeedback(null);
    try {
      const uploaded = await uploadFhirAttachment(file);
      setAttachments((prev) => [...prev, uploaded]);
    } catch (err) {
      setFeedback({
        type: "danger",
        text: err instanceof Error ? err.message : "Failed to upload attachment",
      });
    } finally {
      setUploading(false);
    }
  };

  const renderPatientFields = () => (
    <>
      <TextField
        id="fhir-patient-name"
        label="Patient Name"
        value={String(formData.patientName ?? "")}
        onChange={(v) => updateField("patientName", v)}
        disabled={loadingPrefill || saving}
        col="name"
      />
      <TextField
        id="fhir-patient-age"
        label="Age"
        type="number"
        value={(formData.patientAge as string | number) ?? ""}
        onChange={(v) => updateField("patientAge", v === "" ? "" : Number(v))}
        disabled={loadingPrefill || saving}
        col="age"
      />
      <TextField
        id="fhir-patient-gender"
        label="Gender"
        value={String(formData.patientGender ?? "")}
        onChange={(v) => updateField("patientGender", v)}
        disabled={loadingPrefill || saving}
        col="gender"
      />
      <TextField
        id="fhir-patient-mrd"
        label="MRD"
        value={String(formData.patientMRD ?? "")}
        onChange={(v) => updateField("patientMRD", v)}
        disabled={loadingPrefill || saving}
        col="mrd"
      />
    </>
  );

  const renderDiagnosisList = (
    key: "finalDiagnosis" | "provisionalDiagnosis",
    label: string
  ) => {
    const rows = (formData[key] as IFhirDiagnosisItem[] | undefined) ?? [];
    return (
      <div className="col-12 mb-3">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <label className={LABEL_CLASS}>{label}</label>
          <button
            type="button"
            className="btn btn-sm btn-outline-primary"
            onClick={() =>
              updateField(key, [...rows, { icdCode: "", diagnosisName: "" }])
            }
            disabled={loadingPrefill || saving}
          >
            <i className="ti ti-plus me-1" />
            Add
          </button>
        </div>
        {rows.map((row, index) => (
          <div className="row g-2 mb-2 align-items-end" key={`${key}-${index}`}>
            <div className="col-4 col-sm-3">
              <input
                type="text"
                className={INPUT_CLASS}
                placeholder="ICD code"
                value={row.icdCode}
                onChange={(e) => {
                  const next = [...rows];
                  next[index] = { ...next[index], icdCode: e.target.value };
                  updateField(key, next);
                }}
                disabled={loadingPrefill || saving}
              />
            </div>
            <div className="col">
              <input
                type="text"
                className={INPUT_CLASS}
                placeholder="Diagnosis name"
                value={row.diagnosisName}
                onChange={(e) => {
                  const next = [...rows];
                  next[index] = { ...next[index], diagnosisName: e.target.value };
                  updateField(key, next);
                }}
                disabled={loadingPrefill || saving}
              />
            </div>
            <div className="col-auto">
              <button
                type="button"
                className="btn btn-sm btn-outline-danger"
                onClick={() => updateField(key, rows.filter((_, i) => i !== index))}
                disabled={loadingPrefill || saving}
              >
                <i className="ti ti-trash" />
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderMedicationList = (key: "medications" | "medicinesOnDischarge", label: string) => {
    const rows = (formData[key] as IFhirMedicationItem[] | undefined) ?? [];
    return (
      <div className="col-12 mb-3">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <label className={LABEL_CLASS}>{label}</label>
          <button
            type="button"
            className="btn btn-sm btn-outline-primary"
            onClick={() => updateField(key, [...rows, emptyMedication()])}
            disabled={loadingPrefill || saving}
          >
            <i className="ti ti-plus me-1" />
            Add
          </button>
        </div>
        {rows.map((med, index) => (
          <div className="border rounded p-2 mb-2 bg-light" key={`med-${index}`}>
            <div className="row g-2">
              {(
                [
                  "medicineName",
                  "dosage",
                  "frequency",
                  "duration",
                  "route",
                  "timing",
                  "instructions",
                ] as const
              ).map((field) => (
                <div className="col-6 col-md-4 col-lg-2" key={field}>
                  <input
                    type="text"
                    className={INPUT_CLASS}
                    placeholder={field.replace(/([A-Z])/g, " $1").trim()}
                    value={med[field] ?? ""}
                    onChange={(e) => {
                      const next = [...rows];
                      next[index] = { ...next[index], [field]: e.target.value };
                      updateField(key, next);
                    }}
                    disabled={loadingPrefill || saving}
                  />
                </div>
              ))}
              {key === "medications" ? (
                <div className="col-6 col-md-2">
                  <input
                    type="number"
                    className={INPUT_CLASS}
                    placeholder="Quantity"
                    value={med.quantity ?? ""}
                    onChange={(e) => {
                      const next = [...rows];
                      next[index] = {
                        ...next[index],
                        quantity: e.target.value ? Number(e.target.value) : undefined,
                      };
                      updateField(key, next);
                    }}
                    disabled={loadingPrefill || saving}
                  />
                </div>
              ) : null}
              <div className="col-auto ms-auto">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => updateField(key, rows.filter((_, i) => i !== index))}
                  disabled={loadingPrefill || saving}
                >
                  <i className="ti ti-trash" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderInvestigationsList = () => {
    const rows = (formData.investigations as IFhirInvestigationItem[] | undefined) ?? [];
    return (
      <div className="col-12 mb-3">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <label className={LABEL_CLASS}>Investigations</label>
          <button
            type="button"
            className="btn btn-sm btn-outline-primary"
            onClick={() => updateField("investigations", [...rows, emptyInvestigation()])}
            disabled={loadingPrefill || saving}
          >
            <i className="ti ti-plus me-1" />
            Add
          </button>
        </div>
        {rows.map((row, index) => (
          <div className="border rounded p-2 mb-2 bg-light" key={`inv-${index}`}>
            <div className="row g-2">
              <div className="col-6 col-md-3">
                <input
                  type="text"
                  className={INPUT_CLASS}
                  placeholder="Test name"
                  value={row.testName}
                  onChange={(e) => {
                    const next = [...rows];
                    next[index] = { ...next[index], testName: e.target.value };
                    updateField("investigations", next);
                  }}
                  disabled={loadingPrefill || saving}
                />
              </div>
              <div className="col-6 col-md-3">
                <input
                  type="text"
                  className={INPUT_CLASS}
                  placeholder="Result"
                  value={row.result}
                  onChange={(e) => {
                    const next = [...rows];
                    next[index] = { ...next[index], result: e.target.value };
                    updateField("investigations", next);
                  }}
                  disabled={loadingPrefill || saving}
                />
              </div>
              <div className="col-6 col-md-3">
                <input
                  type="datetime-local"
                  className={INPUT_CLASS}
                  aria-label="Investigation date"
                  value={toDateTimeLocalValue(row.date)}
                  onChange={(e) => {
                    const next = [...rows];
                    next[index] = { ...next[index], date: e.target.value };
                    updateField("investigations", next);
                  }}
                  disabled={loadingPrefill || saving}
                />
              </div>
              <div className="col-6 col-md-2">
                <input
                  type="text"
                  className={INPUT_CLASS}
                  placeholder="Notes"
                  value={row.notes ?? ""}
                  onChange={(e) => {
                    const next = [...rows];
                    next[index] = { ...next[index], notes: e.target.value };
                    updateField("investigations", next);
                  }}
                  disabled={loadingPrefill || saving}
                />
              </div>
              <div className="col-auto ms-auto">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => updateField("investigations", rows.filter((_, i) => i !== index))}
                  disabled={loadingPrefill || saving}
                >
                  <i className="ti ti-trash" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderProceduresList = () => {
    const rows = (formData.proceduresPerformed as IFhirProcedureItem[] | undefined) ?? [];
    return (
      <div className="col-12 mb-3">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <label className={LABEL_CLASS}>Procedures Performed</label>
          <button
            type="button"
            className="btn btn-sm btn-outline-primary"
            onClick={() => updateField("proceduresPerformed", [...rows, emptyProcedure()])}
            disabled={loadingPrefill || saving}
          >
            <i className="ti ti-plus me-1" />
            Add
          </button>
        </div>
        {rows.map((row, index) => (
          <div className="border rounded p-2 mb-2 bg-light" key={`proc-${index}`}>
            <div className="row g-2">
              <div className="col-6 col-md-4">
                <input
                  type="text"
                  className={INPUT_CLASS}
                  placeholder="Procedure name"
                  value={row.procedureName}
                  onChange={(e) => {
                    const next = [...rows];
                    next[index] = { ...next[index], procedureName: e.target.value };
                    updateField("proceduresPerformed", next);
                  }}
                  disabled={loadingPrefill || saving}
                />
              </div>
              <div className="col-6 col-md-3">
                <input
                  type="datetime-local"
                  className={INPUT_CLASS}
                  aria-label="Procedure date"
                  value={toDateTimeLocalValue(row.date)}
                  onChange={(e) => {
                    const next = [...rows];
                    next[index] = { ...next[index], date: e.target.value };
                    updateField("proceduresPerformed", next);
                  }}
                  disabled={loadingPrefill || saving}
                />
              </div>
              <div className="col-6 col-md-4">
                <input
                  type="text"
                  className={INPUT_CLASS}
                  placeholder="Notes"
                  value={row.notes ?? ""}
                  onChange={(e) => {
                    const next = [...rows];
                    next[index] = { ...next[index], notes: e.target.value };
                    updateField("proceduresPerformed", next);
                  }}
                  disabled={loadingPrefill || saving}
                />
              </div>
              <div className="col-auto ms-auto">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger"
                  onClick={() =>
                    updateField(
                      "proceduresPerformed",
                      rows.filter((_, i) => i !== index)
                    )
                  }
                  disabled={loadingPrefill || saving}
                >
                  <i className="ti ti-trash" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderInvestigationsAdvisedList = () => {
    const rows =
      (formData.investigationsAdvised as IFhirInvestigationAdvisedItem[] | undefined) ?? [];
    return (
      <div className="col-12 mb-3">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <label className={LABEL_CLASS}>Investigations Advised</label>
          <button
            type="button"
            className="btn btn-sm btn-outline-primary"
            onClick={() =>
              updateField("investigationsAdvised", [...rows, emptyInvestigationAdvised()])
            }
            disabled={loadingPrefill || saving}
          >
            <i className="ti ti-plus me-1" />
            Add
          </button>
        </div>
        {rows.map((row, index) => (
          <div className="row g-2 mb-2 align-items-end" key={`inv-adv-${index}`}>
            <div className="col-12 col-sm-4">
              <input
                type="text"
                className={INPUT_CLASS}
                placeholder="Test name"
                value={row.testName}
                onChange={(e) => {
                  const next = [...rows];
                  next[index] = { ...next[index], testName: e.target.value };
                  updateField("investigationsAdvised", next);
                }}
                disabled={loadingPrefill || saving}
              />
            </div>
            <div className="col">
              <input
                type="text"
                className={INPUT_CLASS}
                placeholder="Notes"
                value={row.notes}
                onChange={(e) => {
                  const next = [...rows];
                  next[index] = { ...next[index], notes: e.target.value };
                  updateField("investigationsAdvised", next);
                }}
                disabled={loadingPrefill || saving}
              />
            </div>
            <div className="col-auto">
              <button
                type="button"
                className="btn btn-sm btn-outline-danger"
                onClick={() =>
                  updateField(
                    "investigationsAdvised",
                    rows.filter((_, i) => i !== index)
                  )
                }
                disabled={loadingPrefill || saving}
              >
                <i className="ti ti-trash" />
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderHiTypeFields = () => {
    switch (hiType) {
      case "DischargeSummary":
        return (
          <>
            {renderPatientFields()}
            <TextField id="fhir-phone" label="Phone" type="tel" value={String(formData.patientPhone ?? "")} onChange={(v) => updateField("patientPhone", v)} disabled={loadingPrefill || saving} col="quarter" />
            <TextField id="fhir-discharge-type" label="Discharge Type" value={String(formData.dischargeType ?? "")} onChange={(v) => updateField("dischargeType", v)} disabled={loadingPrefill || saving} col="quarter" />
            <TextField id="fhir-ward" label="Ward" value={String(formData.wardName ?? "")} onChange={(v) => updateField("wardName", v)} disabled={loadingPrefill || saving} col="quarter" />
            <TextField id="fhir-bed" label="Bed" value={String(formData.bedNumber ?? "")} onChange={(v) => updateField("bedNumber", v)} disabled={loadingPrefill || saving} col="quarter" />
            <TextField id="fhir-address" label="Patient Address" value={String(formData.patientAddress ?? "")} onChange={(v) => updateField("patientAddress", v)} disabled={loadingPrefill || saving} col="half" />
            <TextField id="fhir-doctor" label="Attending Doctor" value={String(formData.attendingDoctorName ?? "")} onChange={(v) => updateField("attendingDoctorName", v)} disabled={loadingPrefill || saving} col="half" />
            <TextField id="fhir-admission" label="Admission Date" type="datetime-local" value={toDateTimeLocalValue(String(formData.admissionDate ?? ""))} onChange={(v) => updateField("admissionDate", v)} disabled={loadingPrefill || saving} col="date" />
            <TextField id="fhir-discharge" label="Discharge Date" type="datetime-local" value={toDateTimeLocalValue(String(formData.dischargeDate ?? ""))} onChange={(v) => updateField("dischargeDate", v)} disabled={loadingPrefill || saving} col="date" />
            <TextField id="fhir-followup" label="Follow Up Date" type="datetime-local" value={toDateTimeLocalValue(String(formData.followUpDate ?? ""))} onChange={(v) => updateField("followUpDate", v)} disabled={loadingPrefill || saving} col="date" />
            <TextField id="fhir-condition" label="Condition on Discharge" value={String(formData.conditionOnDischarge ?? "")} onChange={(v) => updateField("conditionOnDischarge", v)} disabled={loadingPrefill || saving} col="third" />
            <TextField id="fhir-chief" label="Chief Complaints" rows={1} value={String(formData.chiefComplaints ?? "")} onChange={(v) => updateField("chiefComplaints", v)} disabled={loadingPrefill || saving} />
            <TextField id="fhir-illness" label="Present Illness History" rows={1} value={String(formData.presentIllnessHistory ?? "")} onChange={(v) => updateField("presentIllnessHistory", v)} disabled={loadingPrefill || saving} />
            <TextField id="fhir-past" label="Past Medical History" rows={1} value={String(formData.pastMedicalHistory ?? "")} onChange={(v) => updateField("pastMedicalHistory", v)} disabled={loadingPrefill || saving} />
            <TextField id="fhir-family" label="Family History" rows={1} value={String(formData.familyHistory ?? "")} onChange={(v) => updateField("familyHistory", v)} disabled={loadingPrefill || saving} />
            <TextField id="fhir-physical" label="Physical Examination" rows={1} value={String(formData.physicalExamination ?? "")} onChange={(v) => updateField("physicalExamination", v)} disabled={loadingPrefill || saving} />
            <div className="col-12">
              <StringListField label="Allergies" values={(formData.allergies as string[]) ?? []} onChange={(v) => updateField("allergies", v)} disabled={loadingPrefill || saving} />
            </div>
            {renderDiagnosisList("provisionalDiagnosis", "Provisional Diagnosis")}
            {renderDiagnosisList("finalDiagnosis", "Final Diagnosis")}
            <TextField id="fhir-clinical" label="Clinical Summary" rows={1} value={String(formData.clinicalSummary ?? "")} onChange={(v) => updateField("clinicalSummary", v)} disabled={loadingPrefill || saving} />
            <TextField id="fhir-course" label="Course in Hospital" rows={1} value={String(formData.courseInHospital ?? "")} onChange={(v) => updateField("courseInHospital", v)} disabled={loadingPrefill || saving} />
            <TextField id="fhir-treatment" label="Treatment Given" rows={1} value={String(formData.treatmentGiven ?? "")} onChange={(v) => updateField("treatmentGiven", v)} disabled={loadingPrefill || saving} />
            {renderInvestigationsList()}
            <TextField id="fhir-discharge-bp" label="Discharge BP" value={String(formData.dischargeBp ?? "")} onChange={(v) => updateField("dischargeBp", v)} disabled={loadingPrefill || saving} col="quarter" />
            <TextField id="fhir-discharge-pulse" label="Discharge Pulse" value={String(formData.dischargePulse ?? "")} onChange={(v) => updateField("dischargePulse", v)} disabled={loadingPrefill || saving} col="quarter" />
            <TextField id="fhir-discharge-spo2" label="Discharge SpO2" value={String(formData.dischargeSpO2 ?? "")} onChange={(v) => updateField("dischargeSpO2", v)} disabled={loadingPrefill || saving} col="quarter" />
            <TextField id="fhir-discharge-temp" label="Discharge Temp" value={String(formData.dischargeTemp ?? "")} onChange={(v) => updateField("dischargeTemp", v)} disabled={loadingPrefill || saving} col="quarter" />
            {renderProceduresList()}
            {renderMedicationList("medicinesOnDischarge", "Medicines on Discharge")}
            <div className="col-12">
              <StringListField label="Advice on Discharge" values={(formData.adviceOnDischarge as string[]) ?? []} onChange={(v) => updateField("adviceOnDischarge", v)} disabled={loadingPrefill || saving} />
            </div>
            <TextField id="fhir-followup-inst" label="Follow Up Instructions" rows={1} value={String(formData.followUpInstructions ?? "")} onChange={(v) => updateField("followUpInstructions", v)} disabled={loadingPrefill || saving} />
          </>
        );

      case "OPConsultation":
        return (
          <>
            {renderPatientFields()}
            <TextField id="fhir-phone" label="Phone" type="tel" value={String(formData.patientPhone ?? "")} onChange={(v) => updateField("patientPhone", v)} disabled={loadingPrefill || saving} col="quarter" />
            <TextField id="fhir-visit-type" label="Visit Type" value={String(formData.visitType ?? "")} onChange={(v) => updateField("visitType", v)} disabled={loadingPrefill || saving} col="quarter" />
            <TextField id="fhir-visit-date" label="Visit Date" type="datetime-local" value={toDateTimeLocalValue(String(formData.visitDate ?? ""))} onChange={(v) => updateField("visitDate", v)} disabled={loadingPrefill || saving} col="date" />
            <TextField id="fhir-followup" label="Follow Up Date" type="datetime-local" value={toDateTimeLocalValue(String(formData.followUpDate ?? ""))} onChange={(v) => updateField("followUpDate", v)} disabled={loadingPrefill || saving} col="date" />
            <TextField id="fhir-doctor" label="Attending Doctor" value={String(formData.attendingDoctorName ?? "")} onChange={(v) => updateField("attendingDoctorName", v)} disabled={loadingPrefill || saving} col="half" />
            <TextField id="fhir-chief" label="Chief Complaints" rows={1} value={String(formData.chiefComplaints ?? "")} onChange={(v) => updateField("chiefComplaints", v)} disabled={loadingPrefill || saving} />
            <TextField id="fhir-illness" label="Present Illness History" rows={1} value={String(formData.presentIllnessHistory ?? "")} onChange={(v) => updateField("presentIllnessHistory", v)} disabled={loadingPrefill || saving} />
            <TextField id="fhir-past" label="Past History" rows={1} value={String(formData.pastHistory ?? "")} onChange={(v) => updateField("pastHistory", v)} disabled={loadingPrefill || saving} />
            <TextField id="fhir-family" label="Family History" rows={1} value={String(formData.familyHistory ?? "")} onChange={(v) => updateField("familyHistory", v)} disabled={loadingPrefill || saving} />
            <TextField id="fhir-physical" label="Physical Examination" rows={1} value={String(formData.physicalExamination ?? "")} onChange={(v) => updateField("physicalExamination", v)} disabled={loadingPrefill || saving} />
            <div className="col-12">
              <StringListField label="Allergies" values={(formData.allergies as string[]) ?? []} onChange={(v) => updateField("allergies", v)} disabled={loadingPrefill || saving} />
            </div>
            {renderDiagnosisList("provisionalDiagnosis", "Provisional Diagnosis")}
            {renderDiagnosisList("finalDiagnosis", "Final Diagnosis")}
            {renderInvestigationsAdvisedList()}
            {renderMedicationList("medications", "Medications")}
            <div className="col-12">
              <StringListField label="Advice" values={(formData.advice as string[]) ?? []} onChange={(v) => updateField("advice", v)} disabled={loadingPrefill || saving} />
            </div>
            <TextField id="fhir-followup-inst" label="Follow Up Instructions" rows={1} value={String(formData.followUpInstructions ?? "")} onChange={(v) => updateField("followUpInstructions", v)} disabled={loadingPrefill || saving} />
          </>
        );

      case "Prescription":
        return (
          <>
            {renderPatientFields()}
            <TextField id="fhir-prescribed" label="Prescribed Date" type="datetime-local" value={toDateTimeLocalValue(String(formData.prescribedDate ?? ""))} onChange={(v) => updateField("prescribedDate", v)} disabled={loadingPrefill || saving} col="date" />
            <TextField id="fhir-followup" label="Follow Up Date" type="datetime-local" value={toDateTimeLocalValue(String(formData.followUpDate ?? ""))} onChange={(v) => updateField("followUpDate", v)} disabled={loadingPrefill || saving} col="date" />
            <TextField id="fhir-validity" label="Validity (days)" type="number" value={(formData.validityDays as string | number) ?? ""} onChange={(v) => updateField("validityDays", v === "" ? "" : Number(v))} disabled={loadingPrefill || saving} col="compact" />
            <TextField id="fhir-doctor" label="Attending Doctor" value={String(formData.attendingDoctorName ?? "")} onChange={(v) => updateField("attendingDoctorName", v)} disabled={loadingPrefill || saving} col="third" />
            <TextField id="fhir-diagnosis" label="Diagnosis" value={String(formData.diagnosis ?? "")} onChange={(v) => updateField("diagnosis", v)} disabled={loadingPrefill || saving} col="half" />
            {renderMedicationList("medications", "Medications")}
            <div className="col-12">
              <StringListField label="Advice" values={(formData.advice as string[]) ?? []} onChange={(v) => updateField("advice", v)} disabled={loadingPrefill || saving} />
            </div>
          </>
        );

      case "DiagnosticReport":
        return (
          <>
            {renderPatientFields()}
            <TextField id="fhir-report-type" label="Report Type" value={String(formData.reportType ?? "")} onChange={(v) => updateField("reportType", v)} disabled={loadingPrefill || saving} col="quarter" />
            <TextField id="fhir-specimen" label="Specimen Type" value={String(formData.specimenType ?? "")} onChange={(v) => updateField("specimenType", v)} disabled={loadingPrefill || saving} col="quarter" />
            <TextField id="fhir-report-date" label="Report Date" type="datetime-local" value={toDateTimeLocalValue(String(formData.reportDate ?? ""))} onChange={(v) => updateField("reportDate", v)} disabled={loadingPrefill || saving} col="date" />
            <TextField id="fhir-specimen-at" label="Specimen Collected At" type="datetime-local" value={toDateTimeLocalValue(String(formData.specimenCollectedAt ?? ""))} onChange={(v) => updateField("specimenCollectedAt", v)} disabled={loadingPrefill || saving} col="date" />
            <TextField id="fhir-doctor" label="Attending Doctor" value={String(formData.attendingDoctorName ?? "")} onChange={(v) => updateField("attendingDoctorName", v)} disabled={loadingPrefill || saving} col="half" />
            <div className="col-12 mb-2">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <label className={LABEL_CLASS}>Test Results</label>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary"
                  onClick={() =>
                    updateField("testResults", [
                      ...((formData.testResults as IFhirTestResultItem[]) ?? []),
                      emptyTestResult(),
                    ])
                  }
                  disabled={loadingPrefill || saving}
                >
                  <i className="ti ti-plus me-1" />
                  Add
                </button>
              </div>
              {((formData.testResults as IFhirTestResultItem[]) ?? []).map((row, index) => (
                <div className="border rounded p-2 mb-2 bg-light" key={`test-${index}`}>
                  <div className="row g-2">
                    {(["testName", "value", "unit", "referenceRange", "status", "notes"] as const).map(
                      (field) => (
                        <div className="col-6 col-md-4 col-lg-2" key={field}>
                          <input
                            type="text"
                            className={INPUT_CLASS}
                            placeholder={field}
                            value={row[field] ?? ""}
                            onChange={(e) => {
                              const next = [...((formData.testResults as IFhirTestResultItem[]) ?? [])];
                              next[index] = { ...next[index], [field]: e.target.value };
                              updateField("testResults", next);
                            }}
                            disabled={loadingPrefill || saving}
                          />
                        </div>
                      )
                    )}
                    <div className="col-auto ms-auto">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() =>
                          updateField(
                            "testResults",
                            ((formData.testResults as IFhirTestResultItem[]) ?? []).filter(
                              (_, i) => i !== index
                            )
                          )
                        }
                        disabled={loadingPrefill || saving}
                      >
                        <i className="ti ti-trash" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <TextField id="fhir-interpretation" label="Clinical Interpretation" rows={1} value={String(formData.clinicalInterpretation ?? "")} onChange={(v) => updateField("clinicalInterpretation", v)} disabled={loadingPrefill || saving} />
            <TextField id="fhir-conclusion" label="Conclusion" rows={1} value={String(formData.conclusion ?? "")} onChange={(v) => updateField("conclusion", v)} disabled={loadingPrefill || saving} />
            <div className="col-12">
              <StringListField label="Recommendations" values={(formData.recommendations as string[]) ?? []} onChange={(v) => updateField("recommendations", v)} disabled={loadingPrefill || saving} />
            </div>
          </>
        );

      case "ImmunizationRecord":
        return (
          <>
            {renderPatientFields()}
            <TextField id="fhir-vaccine" label="Vaccine Name" value={String(formData.vaccineName ?? "")} onChange={(v) => updateField("vaccineName", v)} disabled={loadingPrefill || saving} col="third" />
            <TextField id="fhir-vaccine-code" label="Vaccine Code" value={String(formData.vaccineCode ?? "")} onChange={(v) => updateField("vaccineCode", v)} disabled={loadingPrefill || saving} col="quarter" />
            <TextField id="fhir-manufacturer" label="Manufacturer" value={String(formData.manufacturer ?? "")} onChange={(v) => updateField("manufacturer", v)} disabled={loadingPrefill || saving} col="third" />
            <TextField id="fhir-lot" label="Lot Number" value={String(formData.lotNumber ?? "")} onChange={(v) => updateField("lotNumber", v)} disabled={loadingPrefill || saving} col="quarter" />
            <TextField id="fhir-expiry" label="Expiration Date" type="date" value={toDateInputValue(String(formData.expirationDate ?? ""))} onChange={(v) => updateField("expirationDate", v)} disabled={loadingPrefill || saving} col="date" />
            <TextField id="fhir-administered" label="Administered Date" type="datetime-local" value={toDateTimeLocalValue(String(formData.administeredDate ?? ""))} onChange={(v) => updateField("administeredDate", v)} disabled={loadingPrefill || saving} col="date" />
            <TextField id="fhir-next-due" label="Next Due Date" type="datetime-local" value={toDateTimeLocalValue(String(formData.nextDueDate ?? ""))} onChange={(v) => updateField("nextDueDate", v)} disabled={loadingPrefill || saving} col="date" />
            <TextField id="fhir-admin-by" label="Administered By" value={String(formData.administeredBy ?? "")} onChange={(v) => updateField("administeredBy", v)} disabled={loadingPrefill || saving} col="third" />
            <TextField id="fhir-site" label="Site" value={String(formData.site ?? "")} onChange={(v) => updateField("site", v)} disabled={loadingPrefill || saving} col="quarter" />
            <TextField id="fhir-route" label="Route" value={String(formData.route ?? "")} onChange={(v) => updateField("route", v)} disabled={loadingPrefill || saving} col="quarter" />
            <TextField id="fhir-dose" label="Dose No." type="number" value={(formData.doseNumber as string | number) ?? ""} onChange={(v) => updateField("doseNumber", v === "" ? "" : Number(v))} disabled={loadingPrefill || saving} col="compact" />
            <TextField id="fhir-series" label="Series Name" value={String(formData.seriesName ?? "")} onChange={(v) => updateField("seriesName", v)} disabled={loadingPrefill || saving} col="third" />
            <TextField id="fhir-reactions" label="Reactions" rows={1} value={String(formData.reactions ?? "")} onChange={(v) => updateField("reactions", v)} disabled={loadingPrefill || saving} />
          </>
        );

      case "HealthDocumentRecord":
        return (
          <>
            {renderPatientFields()}
            <TextField id="fhir-doc-type" label="Document Type" value={String(formData.documentType ?? "")} onChange={(v) => updateField("documentType", v)} disabled={loadingPrefill || saving} col="third" />
            <TextField id="fhir-doc-title" label="Document Title" value={String(formData.documentTitle ?? "")} onChange={(v) => updateField("documentTitle", v)} disabled={loadingPrefill || saving} col="third" />
            <TextField id="fhir-doc-date" label="Document Date" type="datetime-local" value={toDateTimeLocalValue(String(formData.documentDate ?? ""))} onChange={(v) => updateField("documentDate", v)} disabled={loadingPrefill || saving} col="date" />
            <TextField id="fhir-issued" label="Issued By" value={String(formData.issuedBy ?? "")} onChange={(v) => updateField("issuedBy", v)} disabled={loadingPrefill || saving} col="half" />
            <TextField id="fhir-desc" label="Description" rows={1} value={String(formData.description ?? "")} onChange={(v) => updateField("description", v)} disabled={loadingPrefill || saving} />
            <TextField id="fhir-notes" label="Notes" rows={1} value={String(formData.notes ?? "")} onChange={(v) => updateField("notes", v)} disabled={loadingPrefill || saving} />
          </>
        );

      case "WellnessRecord":
        return (
          <>
            {renderPatientFields()}
            <TextField id="fhir-checkup-date" label="Checkup Date" type="datetime-local" value={toDateTimeLocalValue(String(formData.checkupDate ?? ""))} onChange={(v) => updateField("checkupDate", v)} disabled={loadingPrefill || saving} col="date" />
            <TextField id="fhir-checkup-type" label="Checkup Type" value={String(formData.checkupType ?? "")} onChange={(v) => updateField("checkupType", v)} disabled={loadingPrefill || saving} col="third" />
            <TextField id="fhir-doctor" label="Attending Doctor" value={String(formData.attendingDoctorName ?? "")} onChange={(v) => updateField("attendingDoctorName", v)} disabled={loadingPrefill || saving} col="third" />
            <div className="col-12 mb-2">
              <label className={LABEL_CLASS}>Vital Signs</label>
              <div className="row g-2">
                {(
                  [
                    ["bloodPressureSystolic", "BP Systolic"],
                    ["bloodPressureDiastolic", "BP Diastolic"],
                    ["heartRate", "Heart Rate"],
                    ["temperature", "Temperature"],
                    ["respiratoryRate", "Resp. Rate"],
                    ["oxygenSaturation", "SpO2"],
                    ["height", "Height (cm)"],
                    ["weight", "Weight (kg)"],
                    ["bmi", "BMI"],
                  ] as const
                ).map(([key, label]) => (
                  <div className="col-6 col-sm-4 col-md-3" key={key}>
                    <input
                      type="number"
                      className={INPUT_CLASS}
                      placeholder={label}
                      aria-label={label}
                      value={
                        ((formData.vitalSigns as IFhirVitalSigns | undefined)?.[key] ?? "") as
                          | string
                          | number
                      }
                      onChange={(e) => {
                        const vs = {
                          ...(((formData.vitalSigns as IFhirVitalSigns | undefined) ?? {}) as IFhirVitalSigns),
                        };
                        vs[key] = e.target.value === "" ? "" : Number(e.target.value);
                        updateField("vitalSigns", vs);
                      }}
                      disabled={loadingPrefill || saving}
                    />
                  </div>
                ))}
              </div>
            </div>
            <TextField id="fhir-smoking" label="Smoking Status" value={String(formData.smokingStatus ?? "")} onChange={(v) => updateField("smokingStatus", v)} disabled={loadingPrefill || saving} col="quarter" />
            <TextField id="fhir-alcohol" label="Alcohol" value={String(formData.alcoholConsumption ?? "")} onChange={(v) => updateField("alcoholConsumption", v)} disabled={loadingPrefill || saving} col="quarter" />
            <TextField id="fhir-exercise" label="Exercise Frequency" value={String(formData.exerciseFrequency ?? "")} onChange={(v) => updateField("exerciseFrequency", v)} disabled={loadingPrefill || saving} col="quarter" />
            <TextField id="fhir-health-status" label="Health Status" value={String(formData.healthStatus ?? "")} onChange={(v) => updateField("healthStatus", v)} disabled={loadingPrefill || saving} col="quarter" />
            <TextField
              id="fhir-menstrual"
              label="Menstrual Cycle"
              value={String((formData.womenHealth as IFhirWomenHealth | undefined)?.menstrualCycle ?? "")}
              onChange={(v) =>
                updateField("womenHealth", {
                  menstrualCycle: v,
                  pregnancyStatus:
                    (formData.womenHealth as IFhirWomenHealth | undefined)?.pregnancyStatus ?? "",
                })
              }
              disabled={loadingPrefill || saving}
              col="half"
            />
            <TextField
              id="fhir-pregnancy"
              label="Pregnancy Status"
              value={String((formData.womenHealth as IFhirWomenHealth | undefined)?.pregnancyStatus ?? "")}
              onChange={(v) =>
                updateField("womenHealth", {
                  menstrualCycle:
                    (formData.womenHealth as IFhirWomenHealth | undefined)?.menstrualCycle ?? "",
                  pregnancyStatus: v,
                })
              }
              disabled={loadingPrefill || saving}
              col="half"
            />
            <TextField id="fhir-general-exam" label="General Examination" rows={1} value={String(formData.generalExamination ?? "")} onChange={(v) => updateField("generalExamination", v)} disabled={loadingPrefill || saving} />
            <TextField id="fhir-systemic" label="Systemic Examination" rows={1} value={String(formData.systemicExamination ?? "")} onChange={(v) => updateField("systemicExamination", v)} disabled={loadingPrefill || saving} />
            <div className="col-12">
              <StringListField label="Recommendations" values={(formData.recommendations as string[]) ?? []} onChange={(v) => updateField("recommendations", v)} disabled={loadingPrefill || saving} />
            </div>
            <TextField id="fhir-observations" label="Observations" rows={1} value={String(formData.observations ?? "")} onChange={(v) => updateField("observations", v)} disabled={loadingPrefill || saving} />
          </>
        );

      case "Invoice": {
        const lineItems = (formData.lineItems as IFhirInvoiceLineItem[] | undefined) ?? [];
        return (
          <>
            {renderPatientFields()}
            <TextField id="fhir-phone" label="Phone" type="tel" value={String(formData.patientPhone ?? "")} onChange={(v) => updateField("patientPhone", v)} disabled={loadingPrefill || saving} col="quarter" />
            <TextField id="fhir-invoice-type" label="Invoice Type" value={String(formData.invoiceType ?? "")} onChange={(v) => updateField("invoiceType", v)} disabled={loadingPrefill || saving} col="quarter" />
            <TextField id="fhir-billing-code" label="Billing Code" value={String(formData.billingCode ?? "")} onChange={(v) => updateField("billingCode", v)} disabled={loadingPrefill || saving} col="quarter" />
            <TextField id="fhir-invoice-status" label="Status" value={String(formData.status ?? "")} onChange={(v) => updateField("status", v)} disabled={loadingPrefill || saving} col="quarter" />
            <TextField id="fhir-address" label="Patient Address" value={String(formData.patientAddress ?? "")} onChange={(v) => updateField("patientAddress", v)} disabled={loadingPrefill || saving} col="half" />
            <TextField id="fhir-doctor" label="Attending Doctor" value={String(formData.attendingDoctorName ?? "")} onChange={(v) => updateField("attendingDoctorName", v)} disabled={loadingPrefill || saving} col="half" />
            <TextField id="fhir-invoice-number" label="Invoice Number" value={String(formData.invoiceNumber ?? "")} onChange={(v) => updateField("invoiceNumber", v)} disabled={loadingPrefill || saving} col="third" />
            <TextField id="fhir-invoice-date" label="Invoice Date" type="datetime-local" value={toDateTimeLocalValue(String(formData.invoiceDate ?? ""))} onChange={(v) => updateField("invoiceDate", v)} disabled={loadingPrefill || saving} col="date" />
            <TextField id="fhir-total-gross" label="Total Gross" type="number" value={(formData.totalGross as string | number) ?? ""} onChange={(v) => updateField("totalGross", v === "" ? "" : Number(v))} disabled={loadingPrefill || saving} col="compact" />
            <TextField id="fhir-total-net" label="Total Net" type="number" value={(formData.totalNet as string | number) ?? ""} onChange={(v) => updateField("totalNet", v === "" ? "" : Number(v))} disabled={loadingPrefill || saving} col="compact" />
            <div className="col-12 mb-2">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <label className={LABEL_CLASS}>Line Items</label>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary"
                  onClick={() =>
                    updateField("lineItems", [
                      ...lineItems,
                      { ...emptyInvoiceLineItem(), sequence: lineItems.length + 1 },
                    ])
                  }
                  disabled={loadingPrefill || saving}
                >
                  <i className="ti ti-plus me-1" />
                  Add
                </button>
              </div>
              {lineItems.map((row, index) => (
                <div className="border rounded p-2 mb-2 bg-light" key={`line-${index}`}>
                  <div className="row g-2">
                    {(
                      [
                        ["sequence", "Seq", "number"],
                        ["itemName", "Item Name", "text"],
                        ["hsnCode", "HSN", "text"],
                        ["itemType", "Item Type", "text"],
                        ["quantity", "Qty", "number"],
                        ["unit", "Unit", "text"],
                        ["rate", "Rate", "number"],
                        ["mrp", "MRP", "number"],
                        ["discount", "Discount", "number"],
                        ["cgst", "CGST", "number"],
                        ["sgst", "SGST", "number"],
                        ["total", "Total", "number"],
                        ["batchNumber", "Batch", "text"],
                      ] as const
                    ).map(([field, placeholder, inputType]) => (
                      <div className="col-6 col-md-4 col-lg-2" key={field}>
                        <input
                          type={inputType}
                          className={INPUT_CLASS}
                          placeholder={placeholder}
                          aria-label={placeholder}
                          value={row[field] ?? ""}
                          onChange={(e) => {
                            const next = [...lineItems];
                            const raw = e.target.value;
                            next[index] = {
                              ...next[index],
                              [field]:
                                inputType === "number"
                                  ? raw === ""
                                    ? ""
                                    : Number(raw)
                                  : raw,
                            };
                            updateField("lineItems", next);
                          }}
                          disabled={loadingPrefill || saving}
                        />
                      </div>
                    ))}
                    <div className="col-6 col-md-4 col-lg-2">
                      <input
                        type="date"
                        className={INPUT_CLASS}
                        placeholder="Expiry"
                        aria-label="Expiry Date"
                        value={toDateInputValue(String(row.expiryDate ?? ""))}
                        onChange={(e) => {
                          const next = [...lineItems];
                          next[index] = { ...next[index], expiryDate: e.target.value };
                          updateField("lineItems", next);
                        }}
                        disabled={loadingPrefill || saving}
                      />
                    </div>
                    <div className="col-auto ms-auto">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() =>
                          updateField(
                            "lineItems",
                            lineItems.filter((_, i) => i !== index)
                          )
                        }
                        disabled={loadingPrefill || saving}
                      >
                        <i className="ti ti-trash" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <TextField id="fhir-notes" label="Notes" rows={1} value={String(formData.notes ?? "")} onChange={(v) => updateField("notes", v)} disabled={loadingPrefill || saving} />
          </>
        );
      }

      default:
        return null;
    }
  };

  if (!open) return null;

  return (
    <>
      <div
        className="offcanvas-backdrop fade show"
        onClick={onClose}
        style={{ zIndex: 1040 }}
        aria-hidden="true"
      />
      <div
        className="offcanvas offcanvas-end show d-flex flex-column"
        style={OFFCANVAS_STYLE}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-health-record-title"
      >
        <div className="offcanvas-header border-bottom flex-shrink-0">
          <h5 id="add-health-record-title" className="offcanvas-title fw-bold text-dark">
            {editRecordId ? "Edit Health Record" : "Add Health Record"}
          </h5>
          <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
        </div>

        <div className="offcanvas-body overflow-auto flex-grow-1">
          {feedback ? (
            <div className={`alert alert-${feedback.type} py-2`} role="alert">
              {feedback.text}
            </div>
          ) : null}

          <div className="row g-3 mb-3">
            <div className="col-12 col-md-6">
              <label className={LABEL_CLASS}>Record Type</label>
              <CommonSelect
                instanceId="fhir-hi-type"
                options={hiTypeOptions}
                value={selectedHiType}
                onChange={handleHiTypeChange}
                placeholder="Select record type"
                className="w-100"
                disabled={loadingPrefill || saving || finalizing || isEditMode}
              />
            </div>
            <div className="col-12 col-md-6">
              <label className={LABEL_CLASS} htmlFor="fhir-record-date">
                Record Date
              </label>
              <input
                id="fhir-record-date"
                type="datetime-local"
                className="form-control text-dark fs-14"
                value={toDateTimeLocalValue(recordDate)}
                onChange={(e) => setRecordDate(dateTimeLocalToIso(e.target.value))}
                disabled={loadingPrefill || saving}
              />
            </div>
          </div>

          {loadingPrefill ? (
            <div className="d-flex justify-content-center align-items-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading form…</span>
              </div>
            </div>
          ) : (
            <div className="row g-2">{renderHiTypeFields()}</div>
          )}

          <div className="mt-3 border-top pt-3">
            <label className={LABEL_CLASS}>Attachments</label>
            <div className="d-flex flex-wrap gap-2 mb-2">
              {attachments.map((att, index) => (
                <span
                  key={`${att.s3Key}-${index}`}
                  className="badge bg-light text-dark border d-inline-flex align-items-center gap-1"
                >
                  {att.title}
                  <button
                    type="button"
                    className="btn btn-link btn-sm p-0 text-danger"
                    onClick={() =>
                      setAttachments((prev) => prev.filter((_, i) => i !== index))
                    }
                    disabled={saving || uploading}
                    aria-label={`Remove ${att.title}`}
                  >
                    <i className="ti ti-x" />
                  </button>
                </span>
              ))}
            </div>
            <input
              type="file"
              className="form-control text-dark fs-14"
              accept=".pdf,image/*"
              disabled={saving || uploading}
              onChange={(e) => {
                void handleAttachmentUpload(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            {uploading ? (
              <small className="text-muted d-block mt-1">Uploading…</small>
            ) : null}
          </div>
        </div>

        <div className="offcanvas-footer border-top d-flex flex-wrap justify-content-end gap-2 p-3 flex-shrink-0">
          <button
            type="button"
            className="btn btn-light"
            onClick={onClose}
            disabled={saving || finalizing}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-outline-primary"
            onClick={() => void handleSaveDraft()}
            disabled={saving || finalizing || loadingPrefill}
          >
            {saving && !finalizing ? (
              <>
                <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" />
                Saving…
              </>
            ) : (
              "Save"
            )}
          </button>
          {/* Finalize handled by backend linking flow
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void handleFinalize()}
            disabled={saving || finalizing || loadingPrefill}
          >
            {finalizing ? (
              <>
                <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" />
                Finalizing…
              </>
            ) : (
              "Final"
            )}
          </button>
          */}
        </div>
      </div>
    </>
  );
};

export default AddHealthRecordForm;
