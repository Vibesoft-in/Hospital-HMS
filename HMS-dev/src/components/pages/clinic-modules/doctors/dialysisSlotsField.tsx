"use client";

export interface IDialysisSlotForm {
  localId: string;
  _id?: string;
  name: string;
  startTime: string;
  endTime: string;
  maxAppointments: string;
}

export interface IDialysisSlotApiPayload {
  _id?: string;
  name: string;
  startTime: string;
  endTime: string;
  maxAppointments: number;
}

interface IDialysisSlotsFieldProps {
  slots: IDialysisSlotForm[];
  onChange: (slots: IDialysisSlotForm[]) => void;
}

const createLocalId = (): string =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const toHHmm = (value: unknown): string => {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  return raw.length >= 5 ? raw.slice(0, 5) : raw;
};

export const createEmptyDialysisSlot = (): IDialysisSlotForm => ({
  localId: createLocalId(),
  name: "",
  startTime: "",
  endTime: "",
  maxAppointments: "",
});

export const mapDialysisSlotsFromApi = (slots: unknown): IDialysisSlotForm[] => {
  if (!Array.isArray(slots)) return [];
  return slots.map((slot) => {
    const item = (slot ?? {}) as Record<string, unknown>;
    const id = typeof item._id === "string" ? item._id : undefined;
    return {
      localId: id ?? createLocalId(),
      _id: id,
      name: String(item.name ?? ""),
      startTime: toHHmm(item.startTime),
      endTime: toHHmm(item.endTime),
      maxAppointments:
        item.maxAppointments != null ? String(item.maxAppointments) : "",
    };
  });
};

export const mapDialysisSlotsToApi = (
  slots: IDialysisSlotForm[]
): IDialysisSlotApiPayload[] =>
  slots
    .filter((slot) => slot.name.trim() && slot.startTime && slot.endTime)
    .map((slot) => {
      const payload: IDialysisSlotApiPayload = {
        name: slot.name.trim(),
        startTime: slot.startTime,
        endTime: slot.endTime,
        maxAppointments: parseInt(slot.maxAppointments, 10) || 0,
      };
      if (slot._id) payload._id = slot._id;
      return payload;
    });

export const getDialysisSlotsValidationMessage = (
  slots: IDialysisSlotForm[]
): string | null => {
  const incomplete = slots.find((slot) => {
    const hasAny =
      slot.name.trim() !== "" ||
      slot.startTime !== "" ||
      slot.endTime !== "" ||
      slot.maxAppointments.trim() !== "";
    const isComplete =
      slot.name.trim() !== "" && slot.startTime !== "" && slot.endTime !== "";
    return hasAny && !isComplete;
  });
  if (!incomplete) return null;
  return "Please complete Name, Start time, and End time for each dialysis slot, or remove the incomplete row.";
};

const DialysisSlotsField = ({ slots, onChange }: IDialysisSlotsFieldProps) => {
  const handleSlotChange = (
    index: number,
    field: keyof Omit<IDialysisSlotForm, "localId" | "_id">,
    value: string
  ) => {
    const next = slots.map((slot, i) =>
      i === index ? { ...slot, [field]: value } : slot
    );
    onChange(next);
  };

  const handleAddSlot = () => {
    onChange([...slots, createEmptyDialysisSlot()]);
  };

  const handleRemoveSlot = (index: number) => {
    onChange(slots.filter((_, i) => i !== index));
  };

  return (
    <div className="mb-3">
      <div className="d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-2 mb-2">
        <label className="form-label mb-0">Dialysis Slots</label>
        <button
          type="button"
          className="btn btn-sm btn-outline-primary"
          onClick={handleAddSlot}
          aria-label="Add dialysis slot"
        >
          <i className="ti ti-plus me-1" />
          Add Slot
        </button>
      </div>
      {slots.length === 0 ? (
        <p className="text-muted mb-0 fs-13">
          Optional. Add named dialysis sessions with start/end time and max appointments.
        </p>
      ) : (
        <div className="d-flex flex-column gap-2">
          {slots.map((slot, index) => (
            <div key={slot.localId} className="border rounded p-2">
              <div className="d-flex align-items-center justify-content-between gap-2 mb-2">
                <span className="fs-13 text-muted">Slot {index + 1}</span>
                <button
                  type="button"
                  className="btn btn-sm btn-link text-danger p-0"
                  onClick={() => handleRemoveSlot(index)}
                  aria-label={`Remove dialysis slot ${index + 1}`}
                >
                  <i className="ti ti-trash fs-16" />
                </button>
              </div>
              <div className="mb-2">
                <input
                  type="text"
                  className="form-control"
                  value={slot.name}
                  onChange={(e) =>
                    handleSlotChange(index, "name", e.target.value)
                  }
                  placeholder="Morning Dialysis Session"
                  aria-label={`Dialysis slot ${index + 1} name`}
                />
              </div>
              <div className="row g-2">
                <div className="col-12 col-sm-4">
                  <input
                    type="time"
                    className="form-control"
                    value={slot.startTime}
                    onChange={(e) =>
                      handleSlotChange(index, "startTime", e.target.value)
                    }
                    aria-label={`Dialysis slot ${index + 1} start time`}
                  />
                </div>
                <div className="col-12 col-sm-4">
                  <input
                    type="time"
                    className="form-control"
                    value={slot.endTime}
                    onChange={(e) =>
                      handleSlotChange(index, "endTime", e.target.value)
                    }
                    aria-label={`Dialysis slot ${index + 1} end time`}
                  />
                </div>
                <div className="col-12 col-sm-4">
                  <input
                    type="number"
                    min={0}
                    className="form-control"
                    value={slot.maxAppointments}
                    onChange={(e) =>
                      handleSlotChange(index, "maxAppointments", e.target.value)
                    }
                    placeholder="Max appts"
                    aria-label={`Dialysis slot ${index + 1} max appointments`}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DialysisSlotsField;
