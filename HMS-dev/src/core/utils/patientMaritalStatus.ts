/** Patient marital status — API field is `maritalStatus` (not `maritialStatus`). */
export interface IPatientMaritalStatusSource {
  maritalStatus?: string;
  /** @deprecated Legacy API typo; prefer maritalStatus */
  maritialStatus?: string;
}

export const getPatientMaritalStatus = (
  patient: IPatientMaritalStatusSource | null | undefined
): string | undefined => patient?.maritalStatus ?? patient?.maritialStatus;
