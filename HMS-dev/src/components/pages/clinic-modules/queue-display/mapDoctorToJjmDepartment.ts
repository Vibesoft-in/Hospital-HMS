export type IJjmDepartmentKey =
  | "physiotherapy"
  | "radiology"
  | "paediatrics"
  | "orthopaedics"
  | "nephrology"
  | "anaesthesiology"
  | "emergency_medicine"
  | "neurosurgery"
  | "general_surgery"
  | "medicine"
  | "obg";

interface IDepartmentAlias {
  alias: string;
  key: IJjmDepartmentKey;
  exactOnly?: boolean;
}

const DEPARTMENT_ALIASES: IDepartmentAlias[] = [
  { alias: "physical medicine and rehabilitation", key: "physiotherapy" },
  { alias: "physiotherapy rehabilitation", key: "physiotherapy" },
  { alias: "physiotherapy & rehabilitation", key: "physiotherapy" },
  { alias: "obstetrics and gynaecology", key: "obg" },
  { alias: "obstetrics & gynaecology", key: "obg" },
  { alias: "obstetrics and gynecology", key: "obg" },
  { alias: "obstetrics & gynecology", key: "obg" },
  { alias: "general medicine internal medicine", key: "medicine" },
  { alias: "emergency medicine", key: "emergency_medicine" },
  { alias: "physical medicine", key: "physiotherapy" },
  { alias: "internal medicine", key: "medicine" },
  { alias: "general medicine", key: "medicine" },
  { alias: "general surgery", key: "general_surgery" },
  { alias: "radiology imaging", key: "radiology" },
  { alias: "radiology & imaging", key: "radiology" },
  { alias: "radio diagnosis", key: "radiology" },
  { alias: "radiodiagnosis", key: "radiology" },
  { alias: "anaesthesiology", key: "anaesthesiology" },
  { alias: "anesthesiology", key: "anaesthesiology" },
  { alias: "physiotherapy", key: "physiotherapy" },
  { alias: "neurosurgery", key: "neurosurgery" },
  { alias: "orthopaedics", key: "orthopaedics" },
  { alias: "orthopedics", key: "orthopaedics" },
  { alias: "paediatrics", key: "paediatrics" },
  { alias: "anaesthesia", key: "anaesthesiology" },
  { alias: "anesthesia", key: "anaesthesiology" },
  { alias: "gynaecology", key: "obg" },
  { alias: "gynecology", key: "obg" },
  { alias: "obstetrics", key: "obg" },
  { alias: "pediatrics", key: "paediatrics", exactOnly: true },
  { alias: "paediatric", key: "paediatrics", exactOnly: true },
  { alias: "pediatric", key: "paediatrics", exactOnly: true },
  { alias: "nephrology", key: "nephrology" },
  { alias: "radiology", key: "radiology" },
  { alias: "dialysis", key: "nephrology" },
  { alias: "imaging", key: "radiology" },
  { alias: "physio", key: "physiotherapy", exactOnly: true },
  { alias: "trauma", key: "emergency_medicine", exactOnly: true },
  { alias: "emergency", key: "emergency_medicine", exactOnly: true },
  { alias: "surgeon", key: "general_surgery", exactOnly: true },
  { alias: "surgery", key: "general_surgery", exactOnly: true },
  { alias: "ortho", key: "orthopaedics", exactOnly: true },
  { alias: "medicine", key: "medicine", exactOnly: true },
  { alias: "neuro", key: "neurosurgery", exactOnly: true },
  { alias: "gynae", key: "obg", exactOnly: true },
  { alias: "obgyn", key: "obg", exactOnly: true },
  { alias: "pmr", key: "physiotherapy", exactOnly: true },
  { alias: "obg", key: "obg", exactOnly: true },
];

const normalize = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[_/]+/g, " ")
    .replace(/[^a-z0-9& ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const hasWholeAlias = (text: string, alias: string): boolean => {
  if (text === alias) return true;
  const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^| )${escaped}(?: |$)`).test(text);
};

export const mapDoctorToJjmDepartment = (
  ...fields: Array<string | null | undefined>
): IJjmDepartmentKey | null => {
  for (const field of fields) {
    if (!field?.trim()) continue;
    const normalized = normalize(field);
    if (!normalized) continue;

    const exact = DEPARTMENT_ALIASES.find((entry) => entry.alias === normalized);
    if (exact) return exact.key;

    const partial = DEPARTMENT_ALIASES
      .filter((entry) => !entry.exactOnly && hasWholeAlias(normalized, entry.alias))
      .sort((a, b) => b.alias.length - a.alias.length)[0];
    if (partial) return partial.key;
  }

  return null;
};
