/** 10-digit Indian mobile (national): first digit 6–9. */
const INDIAN_MOBILE_10 = /^[6-9]\d{9}$/;

export const INDIAN_MOBILE_PHONE_ERROR =
  "Enter a valid 10-digit mobile number (excluding +91). It must start with 6, 7, 8, or 9.";

/** National 10-digit mobile (no country code), or null if invalid. */
export const getIndianMobileNationalDigits = (
  raw: string | undefined | null
): string | null => {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) return null;

  let digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;

  if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  if (digits.length === 12 && digits.startsWith("91")) {
    digits = digits.slice(2);
  }

  if (trimmed.startsWith("+") && !trimmed.startsWith("+91")) {
    const afterPlus = trimmed.slice(1).replace(/\D/g, "");
    if (afterPlus.length === 10 && INDIAN_MOBILE_10.test(afterPlus)) {
      return afterPlus;
    }
    return null;
  }

  if (digits.length === 10 && INDIAN_MOBILE_10.test(digits)) {
    return digits;
  }

  return null;
};

export const isValidIndianMobilePhone = (raw: string | undefined | null): boolean =>
  getIndianMobileNationalDigits(raw) !== null;

export const validateIndianMobilePhone = (
  raw: string | undefined | null
): { valid: boolean; message?: string } => {
  if (!raw?.trim()) {
    return { valid: false, message: "Phone number is required." };
  }
  if (!isValidIndianMobilePhone(raw)) {
    return { valid: false, message: INDIAN_MOBILE_PHONE_ERROR };
  }
  return { valid: true };
};

/** 9-digit partial mobile (missing one digit); still prefix +91 for HMS consistency. */
const INDIAN_MOBILE_9 = /^[6-9]\d{8}$/;

/**
 * Obvious non-IN full numbers after `+` that are exactly 10 digits (avoid mis-reading as “missing 91”).
 * E.g. Singapore +65 ×××××××× → digits string length 10 starting with 65.
 */
const TEN_DIGIT_NON_IN_PREFIXES = /^(65|60|62|63|64|66)\d{8}$/;

/**
 * Normalizes patient phone for hospital APIs: Indian mobiles as E.164 `+91` + national digits.
 * Handles users typing `+` then the 10-digit mobile without `91` (e.g. `+9359459577` → `+919359459577`).
 */
export const formatPatientPhoneForApi = (raw: string | undefined | null): string => {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) return "";

  if (trimmed.startsWith("+")) {
    const digitsAfterPlus = trimmed.slice(1).replace(/\D/g, "");
    if (!digitsAfterPlus) return "";
    if (trimmed.startsWith("+91")) {
      let national = digitsAfterPlus.startsWith("91")
        ? digitsAfterPlus.slice(2)
        : digitsAfterPlus;
      national = national.replace(/^0+/, "");
      if (!national) return "";
      return `+91${national}`;
    }
    // `+` then 10-digit IN mobile without country code (common typo: +9XXXXXXXXX instead of +91…)
    if (
      digitsAfterPlus.length === 10 &&
      INDIAN_MOBILE_10.test(digitsAfterPlus) &&
      !TEN_DIGIT_NON_IN_PREFIXES.test(digitsAfterPlus)
    ) {
      return `+91${digitsAfterPlus}`;
    }
    // `+` then 9-digit national (user dropped one digit but still want +91)
    if (digitsAfterPlus.length === 9 && INDIAN_MOBILE_9.test(digitsAfterPlus)) {
      return `+91${digitsAfterPlus}`;
    }
    return `+${digitsAfterPlus}`;
  }

  let digits = trimmed.replace(/\D/g, "");
  if (!digits) return "";

  if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  if (digits.length === 12 && digits.startsWith("91")) {
    return `+${digits}`;
  }

  if (digits.length === 10) {
    return `+91${digits}`;
  }

  return `+${digits}`;
};
