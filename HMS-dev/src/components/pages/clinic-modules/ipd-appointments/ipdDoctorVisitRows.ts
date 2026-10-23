import { getIpdBillingChargeAmount } from "@/components/pages/clinic-modules/ipd-appointments/ipdApiHelpers";
import type { IIpdBillingCharge } from "@/components/pages/clinic-modules/ipd-appointments/ipdApiHelpers";
import { appendDefaultDoctorVisitingCharge } from "@/components/pages/clinic-modules/ipd-appointments/ipdDoctorVisitingCharge";

export interface IIpdDoctorVisitRow {
  doctorId: string;
  name: string;
  chargePerDay: number;
  days: number;
}

export const calcIpdDoctorVisitsTotal = (rows: IIpdDoctorVisitRow[]): number =>
  rows.reduce((sum, row) => sum + row.chargePerDay * row.days, 0);

/** Always includes consulting doctor day charge separately from visit rows. */
export const calcIpdDoctorChargesTotalWithConsulting = (
  visits: IIpdDoctorVisitRow[],
  consultingChargePerDay: number,
  consultingDoctorId?: string
): number => {
  const visitsTotal = calcIpdDoctorVisitsTotal(visits);
  if (!consultingDoctorId) return visitsTotal;
  return visitsTotal + consultingChargePerDay;
};

export const addIpdDoctorVisitRow = (
  prev: IIpdDoctorVisitRow[],
  row: { doctorId: string; name: string; chargePerDay: number }
): IIpdDoctorVisitRow[] => {
  const existing = prev.find((item) => item.doctorId === row.doctorId);
  if (existing) {
    return prev.map((item) =>
      item.doctorId === row.doctorId ? { ...item, days: item.days + 1 } : item
    );
  }
  return [...prev, { ...row, days: 1 }];
};

export const incrementIpdDoctorVisitDays = (
  prev: IIpdDoctorVisitRow[],
  doctorId: string
): IIpdDoctorVisitRow[] =>
  prev.map((row) =>
    row.doctorId === doctorId ? { ...row, days: row.days + 1 } : row
  );

export const decrementIpdDoctorVisitDays = (
  prev: IIpdDoctorVisitRow[],
  doctorId: string
): IIpdDoctorVisitRow[] => {
  const target = prev.find((row) => row.doctorId === doctorId);
  if (!target) return prev;
  if (target.days <= 1) return prev.filter((row) => row.doctorId !== doctorId);
  return prev.map((row) =>
    row.doctorId === doctorId ? { ...row, days: row.days - 1 } : row
  );
};

export const removeIpdDoctorVisitRow = (
  prev: IIpdDoctorVisitRow[],
  doctorId: string
): IIpdDoctorVisitRow[] => prev.filter((row) => row.doctorId !== doctorId);

export const ipdDoctorVisitRowsFromBilling = (
  charges: IIpdBillingCharge[]
): IIpdDoctorVisitRow[] => {
  const rows: IIpdDoctorVisitRow[] = [];

  charges
    .filter((c) => c.type === "doctor" && c.doctorId)
    .forEach((c) => {
      const doctorId = c.doctorId as string;
      const days = Math.max(1, Number(c.units) || 1);
      const total = getIpdBillingChargeAmount(c);
      const chargePerDay =
        Number(c.charge) || Number(c.price) || (days > 0 ? total / days : 0);
      const name = c.doctorName?.trim() || "—";
      const existing = rows.find((row) => row.doctorId === doctorId);

      if (existing) {
        existing.days += days;
        return;
      }

      rows.push({ doctorId, name, chargePerDay, days });
    });

  return rows;
};

export const ipdDoctorVisitRowsToBillingPayload = (
  rows: IIpdDoctorVisitRow[]
): Array<{ type: "doctor"; doctorId: string; units: number }> =>
  rows
    .filter((row) => row.doctorId && row.days > 0)
    .map((row) => ({
      type: "doctor" as const,
      doctorId: row.doctorId,
      units: row.days,
    }));

/** Visiting doctors from the table plus default 1-day charge for the consulting doctor. */
export const buildIpdDoctorBillingCharges = (
  visits: IIpdDoctorVisitRow[],
  consultingDoctorId?: string
): Array<{ type: "doctor"; doctorId: string; units: number }> =>
  appendDefaultDoctorVisitingCharge(
    ipdDoctorVisitRowsToBillingPayload(visits),
    consultingDoctorId ?? ""
  );
