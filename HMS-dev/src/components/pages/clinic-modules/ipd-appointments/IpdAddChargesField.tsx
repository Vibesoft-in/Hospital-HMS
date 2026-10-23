"use client";

import React, { useState, useCallback, useRef, useMemo } from "react";
import CommonSelect, { type Option } from "@/core/common/common-select/commonSelect";
import type { IIpdProcedureRow } from "@/components/pages/clinic-modules/ipd-appointments/IpdProceduresTable";
import type { IIpdDoctorVisitRow } from "@/components/pages/clinic-modules/ipd-appointments/ipdDoctorVisitRows";

type ChargeItemType = "procedure" | "doctor";

interface IChargeRow {
  id: string;
  type: ChargeItemType;
  name: string;
  rate: number;
  units: number;
  category?: string;
  isCompleted?: boolean;
}

interface IIpdAddChargesFieldProps {
  procedures: IIpdProcedureRow[];
  doctorVisits: IIpdDoctorVisitRow[];
  proceduresOptions: Option[];
  doctorOptions: Option[];
  proceduresLoading: boolean;
  doctorsLoading: boolean;
  procedureCategoryById?: Record<string, string>;
  onAddProcedure: (option: Option | null) => void;
  onAddDoctor: (option: Option | null) => void;
  onIncrementProcedureUnits: (id: string) => void;
  onDecrementProcedureUnits: (id: string) => void;
  onRemoveProcedure: (id: string) => void;
  onToggleProcedureCompleted: (id: string, isCompleted: boolean) => void;
  onIncrementDoctorDays: (doctorId: string) => void;
  onDecrementDoctorDays: (doctorId: string) => void;
  onRemoveDoctor: (doctorId: string) => void;
  onSearchInputChange?: (value: string) => void;
}

const DOCTOR_OPTION_PREFIX = "doctor::";
const PROCEDURE_OPTION_PREFIX = "procedure::";

const IpdAddChargesField = ({
  procedures,
  doctorVisits,
  proceduresOptions,
  doctorOptions,
  proceduresLoading,
  doctorsLoading,
  procedureCategoryById = {},
  onAddProcedure,
  onAddDoctor,
  onIncrementProcedureUnits,
  onDecrementProcedureUnits,
  onRemoveProcedure,
  onToggleProcedureCompleted,
  onIncrementDoctorDays,
  onDecrementDoctorDays,
  onRemoveDoctor,
  onSearchInputChange,
}: IIpdAddChargesFieldProps) => {
  const [selectValue, setSelectValue] = useState<Option | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mergedOptions = useMemo<Option[]>(() => {
    const procOpts: Option[] = proceduresOptions.map((o) => ({
      value: `${PROCEDURE_OPTION_PREFIX}${o.value}`,
      label: o.label,
    }));
    const docOpts: Option[] = doctorOptions.map((o) => ({
      value: `${DOCTOR_OPTION_PREFIX}${o.value}`,
      label: o.label,
    }));
    return [...procOpts, ...docOpts];
  }, [proceduresOptions, doctorOptions]);

  const formatChargeOptionLabel = useCallback((option: Option) => {
    const isProcedure = option.value.startsWith(PROCEDURE_OPTION_PREFIX);
    if (isProcedure) {
      const procId = option.value.slice(PROCEDURE_OPTION_PREFIX.length);
      const cat = procedureCategoryById[procId];
      return (
        <span className="d-flex align-items-center gap-2">
          {option.label}
          {cat ? (
            <span className="badge badge-soft-primary border border-primary fs-10 px-2 py-1">{cat}</span>
          ) : null}
        </span>
      );
    }
    return <span>{option.label}</span>;
  }, [procedureCategoryById]);

  const handleChange = useCallback(
    (option: Option | null) => {
      setSelectValue(null);
      if (!option?.value) return;

      if (option.value.startsWith(DOCTOR_OPTION_PREFIX)) {
        const realId = option.value.slice(DOCTOR_OPTION_PREFIX.length);
        onAddDoctor({ value: realId, label: option.label });
      } else if (option.value.startsWith(PROCEDURE_OPTION_PREFIX)) {
        const realId = option.value.slice(PROCEDURE_OPTION_PREFIX.length);
        onAddProcedure({ value: realId, label: option.label });
      }
    },
    [onAddProcedure, onAddDoctor]
  );

  const handleInputChange = useCallback(
    (value: string) => {
      if (!onSearchInputChange) return;
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      debounceRef.current = setTimeout(() => {
        onSearchInputChange(value);
      }, 300);
    },
    [onSearchInputChange]
  );

  const rows = useMemo<IChargeRow[]>(() => {
    const procRows: IChargeRow[] = procedures.map((p) => ({
      id: p.id,
      type: "procedure",
      name: p.name,
      rate: p.price,
      units: p.units,
      category: p.category || procedureCategoryById[p.id],
      isCompleted: Boolean(p.isCompleted),
    }));
    const docRows: IChargeRow[] = doctorVisits.map((d) => ({
      id: d.doctorId,
      type: "doctor",
      name: d.name,
      rate: d.chargePerDay,
      units: d.days,
    }));
    return [...procRows, ...docRows];
  }, [procedures, doctorVisits, procedureCategoryById]);

  const handleIncrement = useCallback(
    (row: IChargeRow) => {
      if (row.type === "procedure") onIncrementProcedureUnits(row.id);
      else onIncrementDoctorDays(row.id);
    },
    [onIncrementProcedureUnits, onIncrementDoctorDays]
  );

  const handleDecrement = useCallback(
    (row: IChargeRow) => {
      if (row.type === "procedure") onDecrementProcedureUnits(row.id);
      else onDecrementDoctorDays(row.id);
    },
    [onDecrementProcedureUnits, onDecrementDoctorDays]
  );

  const handleRemove = useCallback(
    (row: IChargeRow) => {
      if (row.type === "procedure") onRemoveProcedure(row.id);
      else onRemoveDoctor(row.id);
    },
    [onRemoveProcedure, onRemoveDoctor]
  );

  const categoryBadge = (row: IChargeRow) => {
    if (!row.category) return null;
    const isDoctor = row.type === "doctor";
    return (
      <span
        className={`badge fs-10 px-2 py-1 ms-1 ${
          isDoctor
            ? "badge-soft-info border border-info"
            : "badge-soft-primary border border-primary"
        }`}
      >
        {row.category}
      </span>
    );
  };

  const unitsLabel = (type: ChargeItemType) => (type === "doctor" ? "Days" : "Units");

  return (
    <>
      <div className="col-12">
        <label className="form-label mb-1 fw-medium fs-14">Add Procedures / Doctors</label>
        <CommonSelect
          options={mergedOptions}
          value={selectValue}
          onChange={handleChange}
          onInputChange={onSearchInputChange ? handleInputChange : undefined}
          placeholder="Search procedure or doctor..."
          isLoading={proceduresLoading || doctorsLoading}
          formatOptionLabel={formatChargeOptionLabel}
        />
      </div>
      <div className="col-12">
        <div className="border rounded overflow-hidden">
          <div
            className="d-flex border-bottom bg-light px-2 py-1 fw-medium text-dark"
            style={{ fontSize: "0.95rem" }}
          >
            <span className="col-1 text-nowrap">S.No</span>
            <span className="col text-nowrap ps-3">Name</span>
            <span className="col-2 text-center text-nowrap">Completed</span>
            <span className="col-3 text-center text-nowrap">Units</span>
            <span className="col text-end pe-4 text-nowrap">Price</span>
          </div>
          <div
            className="text-dark"
            style={{ maxHeight: "250px", overflowY: "auto", fontSize: "0.95rem" }}
          >
            {rows.length === 0 ? (
              <div className="px-2 py-3 text-center">No items added</div>
            ) : (
              rows.map((row, idx) => (
                <div
                  key={`${row.type}-${row.id}`}
                  className="d-flex align-items-center border-bottom px-2 py-2"
                >
                  <span className="col-1">{idx + 1}</span>
                  <span className="col ps-3 d-flex align-items-center flex-wrap gap-1">
                    {row.name}
                    {categoryBadge(row)}
                  </span>
                  <span className="col-2 d-flex align-items-center justify-content-center">
                    {row.type === "procedure" ? (
                      <div className="form-check form-switch mb-0">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          role="switch"
                          id={`ipd-charge-done-${row.id}`}
                          checked={Boolean(row.isCompleted)}
                          onChange={(e) =>
                            onToggleProcedureCompleted(row.id, e.target.checked)
                          }
                          aria-label={`Mark ${row.name} as completed`}
                        />
                      </div>
                    ) : null}
                  </span>
                  <span className="col-3 d-flex align-items-center justify-content-center gap-1">
                    <button
                      type="button"
                      className="btn btn-sm btn-light border px-2 py-0"
                      aria-label={`Decrease ${unitsLabel(row.type).toLowerCase()} for ${row.name}`}
                      onClick={() => handleDecrement(row)}
                    >
                      <i className="ti ti-minus fs-14" />
                    </button>
                    <span className="fw-semibold text-center" style={{ minWidth: "1.5rem" }}>
                      {row.units}
                    </span>
                    <button
                      type="button"
                      className="btn btn-sm btn-light border px-2 py-0"
                      aria-label={`Increase ${unitsLabel(row.type).toLowerCase()} for ${row.name}`}
                      onClick={() => handleIncrement(row)}
                    >
                      <i className="ti ti-plus fs-14" />
                    </button>
                  </span>
                  <span className="col d-flex align-items-center justify-content-end gap-1">
                    <span>₹{(row.rate * row.units).toFixed(2)}</span>
                    <button
                      type="button"
                      className="btn btn-link p-0 text-danger min-w-0"
                      aria-label={`Remove ${row.name}`}
                      onClick={() => handleRemove(row)}
                    >
                      <i className="ti ti-trash ps-1 fs-16" />
                    </button>
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default IpdAddChargesField;
