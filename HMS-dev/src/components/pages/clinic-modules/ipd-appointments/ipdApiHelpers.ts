import type {
  IIpdAppointmentDetail,
  IIpdBedSummary,
  IIpdDoctorVisit,
  IIpdProcedure,
  IIpdTransaction,
  IPathlabCaseData,
} from "@/components/pages/clinic-modules/appointments/buildIPDReceiptData";
import { calcIpdProceduresTotal } from "@/components/pages/clinic-modules/ipd-appointments/ipdProcedureRows";
import type { IIpdProcedureRow } from "@/components/pages/clinic-modules/ipd-appointments/IpdProceduresTable";

export interface IIpdBillingCharge {
  type?: string;
  procedureId?: string;
  procedureName?: string;
  category?: string;
  procedureCategory?: string;
  doctorId?: string;
  doctorName?: string;
  price?: number;
  units?: number;
  isCompleted?: boolean;
  totalCharge?: number;
  charge?: number;
  caseId?: string;
  caseReadableId?: string;
  caseData?: IPathlabCaseData;
}

export const getIpdBillingChargeAmount = (charge: IIpdBillingCharge): number => {
  const total = Number(charge.totalCharge);
  if (Number.isFinite(total) && total >= 0) return total;
  const flat = Number(charge.charge);
  if (Number.isFinite(flat) && flat >= 0) return flat;
  const price = Number(charge.price) || 0;
  const units = Math.max(1, Number(charge.units) || 1);
  return price * units;
};

export const sumIpdBillingChargesByType = (
  charges: IIpdBillingCharge[],
  type: string
): number =>
  charges
    .filter((c) => c.type === type)
    .reduce((sum, c) => sum + getIpdBillingChargeAmount(c), 0);

export interface IIpdApiRecord {
  _id: string;
  ipdId?: string;
  ipdNumber?: string;
  appointmentId?: string;
  patientId: string;
  doctorId: string;
  visitId?: string;
  bedId?: string;
  reason?: string;
  notes?: string;
  admissionDate?: string;
  appointmentDate?: string;
  status?: string;
  isDischarge?: boolean;
  paymentStatus?: string;
  billingCharges?: IIpdBillingCharge[];
  procedures?: IIpdProcedure[];
  procedureChargesTotal?: number;
  doctorVisitCharges?: boolean;
  doctorChargesAmount?: number;
  bedChargesTotal?: number;
  bedCharge?: {
    wardId?: string;
    wardName?: string;
    chargePerDay?: number;
    fromDate?: string;
    toDate?: string;
    days?: number;
    totalCharge?: number;
  };
  nursingChargesTotal?: number;
  nursingCharge?: {
    wardId?: string;
    wardName?: string;
    nursingChargePerDay?: number;
    fromDate?: string;
    toDate?: string;
    days?: number;
    totalCharge?: number;
  };
  subtotal?: number;
  discount?: number;
  totalPrice?: number;
  amountPaid?: number;
  receiptId?: string;
  createdAt?: string;
  updatedAt?: string;
  mlc?: boolean | Record<string, unknown>;
  isMlc?: boolean;
  isMLC?: boolean;
  doctor?: IIpdAppointmentDetail["doctor"];
  patient?: IIpdAppointmentDetail["patient"];
  bed?: {
    _id?: string;
    bedId?: string;
    bedNumber?: string;
    bedCode?: string;
    wardId?: string;
    ward?: { _id?: string; name?: string; chargePerDay?: number };
  };
  transactions?: IIpdTransaction[];
  abhaLinked?: boolean;
}

const asIpdApiRecord = (value: object): IIpdApiRecord => value as unknown as IIpdApiRecord;

export const isIpdDischarged = (record: {
  isDischarge?: boolean;
  status?: string;
}): boolean =>
  Boolean(record.isDischarge) ||
  record.status === "Completed" ||
  record.status === "Discharged" ||
  record.status?.toLowerCase() === "discharged";

export const extractIpdFromGetResponse = (data: unknown): IIpdApiRecord | null => {
  if (!data || typeof data !== "object") return null;
  const root = data as Record<string, unknown>;
  const nested = root.ipd ?? root.ipdAppointment;
  if (nested && typeof nested === "object") return asIpdApiRecord(nested);
  if (root._id) return asIpdApiRecord(root);
  return null;
};

const doctorVisitsFromBilling = (
  charges: IIpdBillingCharge[],
  fallbackDoctor?: IIpdAppointmentDetail["doctor"],
  fallbackDoctorId?: string
): IIpdDoctorVisit[] => {
  const fromBilling = charges
    .filter((c) => c.type === "doctor")
    .map((c) => {
      const days = Math.max(1, Number(c.units) || 1);
      const chargePerDay = Number(c.charge) || Number(c.price) || 0;
      return {
        doctorId: (c.doctorId ?? fallbackDoctorId ?? "").trim(),
        doctorName: c.doctorName?.trim() || fallbackDoctor?.name,
        days,
        chargePerDay,
        price: getIpdBillingChargeAmount(c),
      };
    })
    .filter((row) => row.doctorId || row.doctorName);

  if (fromBilling.length > 0) return fromBilling;

  const doctorId = fallbackDoctorId?.trim();
  if (!doctorId && !fallbackDoctor?.name) return [];

  const total = sumIpdBillingChargesByType(charges, "doctor");
  if (total <= 0) return [];

  return [
    {
      doctorId: doctorId ?? "",
      doctorName: fallbackDoctor?.name,
      days: 1,
      chargePerDay: total,
      price: total,
    },
  ];
};

const proceduresFromBilling = (charges: IIpdBillingCharge[]): IIpdProcedure[] =>
  charges
    .filter((c) => c.type === "procedure" && c.procedureId)
    .map((c) => ({
      procedureId: c.procedureId as string,
      procedureName: c.procedureName,
      category: c.procedureCategory ?? c.category,
      units: Math.max(1, Number(c.units) || 1),
      unitPrice: Number(c.price) || 0,
      price: getIpdBillingChargeAmount(c),
    }));

export const normalizeIpdBedSummary = (
  bed?: IIpdApiRecord["bed"]
): IIpdBedSummary | undefined => {
  if (!bed) return undefined;
  const bedNumber = (bed.bedNumber ?? bed.bedCode ?? "").trim() || undefined;
  return {
    _id: bed._id,
    bedNumber,
    bedCode: bed.bedCode ?? bedNumber,
    ward: bed.ward,
  };
};

const procedureRowsFromBilling = (charges: IIpdBillingCharge[]): IIpdProcedureRow[] =>
  charges
    .filter((c) => c.type === "procedure" && c.procedureId)
    .map((c) => ({
      id: c.procedureId as string,
      name: c.procedureName ?? "—",
      price: Number(c.price) || 0,
      units: Math.max(1, Number(c.units) || 1),
      category: c.procedureCategory ?? c.category,
      isCompleted: Boolean(c.isCompleted),
    }));

export const mapIpdApiToAppointmentDetail = (
  raw: IIpdApiRecord,
  responseReceiptId?: string
): IIpdAppointmentDetail => {
  const billing = Array.isArray(raw.billingCharges) ? raw.billingCharges : [];
  const procedureRows = billing.length ? procedureRowsFromBilling(billing) : [];
  const procedures =
    raw.procedures && raw.procedures.length > 0
      ? raw.procedures
          .filter((p) => p.procedureId)
          .map((p) => ({
            procedureId: p.procedureId as string,
            procedureName: p.procedureName,
            category: p.category,
            price: p.price,
            units: Math.max(1, Number(p.units) || 1),
            isDialysis: p.isDialysis,
            dialysisSessionId: p.dialysisSessionId,
          }))
      : billing.length
        ? proceduresFromBilling(billing)
        : [];

  const procedureChargesFromBilling = sumIpdBillingChargesByType(billing, "procedure");
  const doctorChargesFromBilling = sumIpdBillingChargesByType(billing, "doctor");

  const procedureChargesTotal =
    raw.procedureChargesTotal ??
    (procedureChargesFromBilling > 0
      ? procedureChargesFromBilling
      : procedureRows.length > 0
        ? calcIpdProceduresTotal(procedureRows)
        : undefined);

  const doctorChargesAmount =
    raw.doctorChargesAmount ??
    (doctorChargesFromBilling > 0 ? doctorChargesFromBilling : undefined);
  const bedChargesTotalFromSummary = Number(raw.bedCharge?.totalCharge);
  const bedChargesTotal =
    raw.bedChargesTotal ??
    (Number.isFinite(bedChargesTotalFromSummary) && bedChargesTotalFromSummary > 0
      ? bedChargesTotalFromSummary
      : undefined);
  const nursingChargesTotalFromSummary = Number(raw.nursingCharge?.totalCharge);
  const nursingChargesTotal =
    raw.nursingChargesTotal ??
    (Number.isFinite(nursingChargesTotalFromSummary) && nursingChargesTotalFromSummary > 0
      ? nursingChargesTotalFromSummary
      : undefined);

  const doctorVisits = doctorVisitsFromBilling(
    billing,
    raw.doctor,
    raw.doctorId ?? raw.doctor?._id
  );

  const admissionOrAppointment = raw.admissionDate ?? raw.appointmentDate;

  return {
    _id: raw._id,
    ipdId: raw.ipdId ?? raw.ipdNumber ?? raw._id,
    receiptId: raw.receiptId ?? responseReceiptId,
    appointmentId: raw.appointmentId ?? raw._id,
    patientId: raw.patientId,
    doctorId: raw.doctorId,
    bedId: raw.bedId ?? raw.bed?._id,
    procedures,
    doctorVisits,
    billingCharges: billing,
    procedureChargesTotal,
    doctorVisitCharges: raw.doctorVisitCharges ?? (doctorChargesFromBilling > 0),
    doctorChargesAmount,
    bedChargesTotal,
    nursingChargesTotal,
    subtotal: raw.subtotal,
    discount: raw.discount,
    totalPrice: raw.totalPrice,
    appointmentDate: admissionOrAppointment,
    admissionDate: raw.admissionDate,
    status: raw.status,
    isDischarge: Boolean(raw.isDischarge),
    paymentStatus: raw.paymentStatus,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    amountPaid: raw.amountPaid,
    notes: raw.notes ?? raw.reason,
    reason: raw.reason ?? raw.notes,
    mlc: Boolean(raw.isMLC ?? raw.isMlc),
    isMlc: Boolean(raw.isMLC ?? raw.isMlc),
    doctor: raw.doctor,
    patient: raw.patient,
    bed: normalizeIpdBedSummary(raw.bed),
    bedCharge: raw.bedCharge,
    nursingCharge: raw.nursingCharge,
    transactions: raw.transactions,
    abhaLinked: (raw.patient as { abhaLinked?: boolean } | undefined)?.abhaLinked === true,
  };
};
