export interface IIpdDoctorVisitTypeCharge {
  visitType?: string;
  appointmentType?: string;
  charge: number;
  type?: string;
}

export const getIpdDoctorVisitingCharge = (
  visitTypes?: IIpdDoctorVisitTypeCharge[]
): number => {
  if (!visitTypes?.length) return 0;
  const match = visitTypes.find((vt) => {
    if (vt.visitType != null && vt.appointmentType != null) {
      return (
        vt.visitType === "New" &&
        (vt.appointmentType === "IPD" || vt.appointmentType === "In Patient")
      );
    }
    return vt.type === "IPD";
  });
  return match?.charge ?? 0;
};

export const appendDefaultDoctorVisitingCharge = <
  T extends { type: string; doctorId?: string },
>(
  charges: T[],
  doctorId: string
): T[] => {
  if (!doctorId) return charges;
  const hasConsultingDoctorCharge = charges.some(
    (charge) => charge.type === "doctor" && charge.doctorId === doctorId
  );
  if (hasConsultingDoctorCharge) return charges;
  return [...charges, { type: "doctor", doctorId, units: 1 } as unknown as T];
};
