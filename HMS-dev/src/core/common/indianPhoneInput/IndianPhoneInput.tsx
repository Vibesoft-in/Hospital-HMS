"use client";

import PhoneInput, {
  type DefaultInputComponentProps,
  type Props,
  type Value as IIndianPhoneValue,
} from "react-phone-number-input";
import "react-phone-number-input/style.css";

export type { IIndianPhoneValue };

export type IIndianPhoneInputProps = Props<DefaultInputComponentProps>;

const IndianPhoneInput = ({
  className,
  defaultCountry = "IN",
  international = false,
  countryCallingCodeEditable = false,
  placeholder = "Enter 10-digit phone number",
  ...props
}: IIndianPhoneInputProps) => {
  return (
    <div className="indian-phone-field">
      <span className="indian-phone-field__prefix" aria-hidden="true">
        +91
        <i className="ti ti-chevron-down indian-phone-field__chevron" />
      </span>
      <PhoneInput
        {...props}
        defaultCountry={defaultCountry}
        international={international}
        countryCallingCodeEditable={countryCallingCodeEditable}
        placeholder={placeholder}
        className={["indian-phone-field__phone", className].filter(Boolean).join(" ")}
      />
    </div>
  );
};

export default IndianPhoneInput;
