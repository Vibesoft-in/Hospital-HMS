"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import Select, {
  components,
  type InputActionMeta,
  type MenuProps,
  type MultiValue,
} from "react-select";
import { searchIcdDiagnoses } from "@/core/api/icdApi";
import type { IFinalDiagnosisRow } from "@/components/pages/clinic-modules/ipd-appointments/ipdDischargeSummaryTypes";

interface IIcdDiagnosisOption {
  value: string;
  label: string;
  icdCode: string;
  diagnosisName: string;
}

interface IIcdDiagnosisMultiSelectProps {
  value: IFinalDiagnosisRow[];
  onChange: (value: IFinalDiagnosisRow[]) => void;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
}

interface ISelectExtraProps {
  createInputValue?: string;
  onCreateDiagnosis?: (name: string) => void;
}

const toOptionValue = (row: IFinalDiagnosisRow): string =>
  `${row.icdCode.trim()}::${row.diagnosisName.trim()}`;

const fromOptionValue = (option: IIcdDiagnosisOption): IFinalDiagnosisRow => ({
  icdCode: option.icdCode,
  diagnosisName: option.diagnosisName,
});

const toOption = (row: IFinalDiagnosisRow): IIcdDiagnosisOption => {
  const icdCode = row.icdCode.trim();
  const diagnosisName = row.diagnosisName.trim();
  const label = icdCode ? `${icdCode} — ${diagnosisName}` : diagnosisName;
  return {
    value: toOptionValue(row),
    label,
    icdCode,
    diagnosisName,
  };
};

const CreateDiagnosisMenu = (props: MenuProps<IIcdDiagnosisOption, true>) => {
  const { children, selectProps } = props;
  const extra = selectProps as typeof selectProps & ISelectExtraProps;
  const createInputValue = (extra.createInputValue ?? "").trim();
  const onCreateDiagnosis = extra.onCreateDiagnosis;

  return (
    <components.Menu {...props}>
      {children}
      {createInputValue && onCreateDiagnosis ? (
        <div
          className="px-3 py-2 text-dark"
          style={{
            backgroundColor: "#ececec",
            borderTop: "1px solid #e0e0e0",
            fontSize: "0.875rem",
            lineHeight: 1.4,
            position: "sticky",
            bottom: 0,
            zIndex: 2,
          }}
        >
          Cannot Find {createInputValue} ,{" "}
          <button
            type="button"
            className="btn btn-link p-0 align-baseline text-decoration-none"
            style={{ color: "#0d6efd", fontSize: "inherit", lineHeight: "inherit" }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onCreateDiagnosis(createInputValue);
            }}
          >
            Create One
          </button>
        </div>
      ) : null}
    </components.Menu>
  );
};

const IcdDiagnosisMultiSelect = ({
  value,
  onChange,
  id,
  placeholder = "Search ICD diagnosis...",
  disabled = false,
}: IIcdDiagnosisMultiSelectProps) => {
  const reactId = useId();
  const instanceId = id ?? `icd-diagnosis-multi-${reactId}`;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [searchOptions, setSearchOptions] = useState<IIcdDiagnosisOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const selectedOptions = useMemo(
    () => value.filter((row) => row.icdCode.trim() || row.diagnosisName.trim()).map(toOption),
    [value]
  );

  const mergedOptions = useMemo(() => {
    const seen = new Set<string>();
    const next: IIcdDiagnosisOption[] = [];
    [...selectedOptions, ...searchOptions].forEach((option) => {
      if (seen.has(option.value)) return;
      seen.add(option.value);
      next.push(option);
    });
    return next;
  }, [searchOptions, selectedOptions]);

  const fetchDiagnoses = useCallback(async (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) {
      setSearchOptions([]);
      return;
    }
    setIsLoading(true);
    try {
      const results = await searchIcdDiagnoses(trimmed);
      setSearchOptions(results.map(toOption));
    } catch {
      setSearchOptions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = useCallback(
    (nextInputValue: string, actionMeta: InputActionMeta) => {
      if (actionMeta.action === "input-change") {
        setInputValue(nextInputValue);
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
          debounceRef.current = null;
        }
        debounceRef.current = setTimeout(() => {
          void fetchDiagnoses(nextInputValue);
        }, 300);
        return;
      }
      if (actionMeta.action === "menu-close" || actionMeta.action === "set-value") {
        setInputValue("");
      }
    },
    [fetchDiagnoses]
  );

  const handleChange = useCallback(
    (options: MultiValue<IIcdDiagnosisOption>) => {
      onChange(options.map(fromOptionValue));
    },
    [onChange]
  );

  const handleCreateDiagnosis = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;

      const alreadySelected = value.some(
        (row) => !row.icdCode.trim() && row.diagnosisName.trim().toLowerCase() === trimmed.toLowerCase()
      );
      if (alreadySelected) {
        setInputValue("");
        setSearchOptions([]);
        return;
      }

      onChange([...value, { icdCode: "", diagnosisName: trimmed }]);
      setInputValue("");
      setSearchOptions([]);
    },
    [onChange, value]
  );

  useEffect(
    () => () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    },
    []
  );

  const customStyles = useMemo(
    () => ({
      option: (base: Record<string, unknown>, state: { isSelected: boolean; isFocused: boolean }) => ({
        ...base,
        backgroundColor: state.isSelected || state.isFocused ? "#2e37a4" : "white",
        color: state.isSelected || state.isFocused ? "#ffffff" : "#333",
        cursor: "pointer",
        padding: "8px 12px",
      }),
      menuPortal: (base: Record<string, unknown>) => ({
        ...base,
        zIndex: 9999,
      }),
      menu: (base: Record<string, unknown>) => ({
        ...base,
        zIndex: 9999,
      }),
      multiValue: (base: Record<string, unknown>) => ({
        ...base,
        backgroundColor: "#eef0ff",
      }),
      multiValueLabel: (base: Record<string, unknown>) => ({
        ...base,
        color: "#2e37a4",
        fontSize: "0.875rem",
      }),
    }),
    []
  );

  const selectComponents = useMemo(() => ({ Menu: CreateDiagnosisMenu }), []);

  return (
    <div className="common-select-wrapper">
      <Select<IIcdDiagnosisOption, true>
        classNamePrefix="react-select"
        instanceId={instanceId}
        inputId={id}
        isMulti
        isSearchable
        isDisabled={disabled}
        isLoading={isLoading}
        options={mergedOptions}
        value={selectedOptions}
        inputValue={inputValue}
        onChange={handleChange}
        onInputChange={handleInputChange}
        placeholder={placeholder}
        noOptionsMessage={({ inputValue: typed }) =>
          typed.trim() ? "No diagnoses found" : "Type to search ICD diagnoses"
        }
        styles={customStyles}
        components={selectComponents}
        closeMenuOnSelect={false}
        menuPortalTarget={typeof window !== "undefined" ? document.body : null}
        menuPosition="fixed"
        {...({
          createInputValue: inputValue,
          onCreateDiagnosis: handleCreateDiagnosis,
        } as ISelectExtraProps)}
      />
    </div>
  );
};

export default IcdDiagnosisMultiSelect;
