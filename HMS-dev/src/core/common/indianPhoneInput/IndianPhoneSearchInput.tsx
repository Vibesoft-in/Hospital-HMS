"use client";

import { type InputHTMLAttributes } from "react";

interface IIndianPhoneSearchInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "className" | "type"> {
  className?: string;
  inputClassName?: string;
}

const toDisplayValue = (value?: string | number | readonly string[]): string => {
  const raw = value != null ? String(value) : "";
  if (!raw) return "";
  if (raw.startsWith("+91")) return raw.slice(3);
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  return raw;
};

const IndianPhoneSearchInput = ({
  className,
  inputClassName,
  value,
  placeholder = "Enter phone number or name",
  ...props
}: IIndianPhoneSearchInputProps) => {
  return (
    <div className={["indian-phone-field", className].filter(Boolean).join(" ")}>
      <span className="indian-phone-field__prefix" aria-hidden="true">
        +91
        <i className="ti ti-chevron-down indian-phone-field__chevron" />
      </span>
      <input
        {...props}
        type="text"
        value={toDisplayValue(value)}
        placeholder={placeholder}
        className={["indian-phone-field__plain-input", "form-control", inputClassName]
          .filter(Boolean)
          .join(" ")}
      />
    </div>
  );
};

export default IndianPhoneSearchInput;
