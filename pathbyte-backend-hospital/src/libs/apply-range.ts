// utils/applyRange.ts

export type Gender = "Male" | "Female" | "Other";

export function getAppliedRange(age: number, gender: Gender): string {
  if (age < 0) {
    throw new Error("Age cannot be negative");
  }

  // Infants (< 3 months)
  if (age < 0.25) { // ~0.25 years = 3 months
    return "N-3Month";
  }

  // Up to 1 year
  if (age < 1) {
    return "N-1Year";
  }

  // Up to 6 years
  if (age < 6) {
    return "N-6Year";
  }

  // Up to 12 years
  if (age < 12) {
    return "N-12Year";
  }

  // Male & Female split (>=12 years)
  if (gender === "Male") {
    return "N-Male";
  }

  if (gender === "Female") {
    return "N-Female";
  }

  // Default bucket
  return "N-Default";
}
