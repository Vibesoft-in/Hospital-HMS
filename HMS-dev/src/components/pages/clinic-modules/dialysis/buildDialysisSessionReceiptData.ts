import type { IReceiptData, IReceiptTransaction } from "@/components/pages/clinic-modules/appointments/printReceipt";
import { resolveDialysisSessionDate } from "@/components/pages/clinic-modules/dialysis/resolveDialysisSessionDate";

interface IDialysisReceiptPatient {
  name?: string;
  title?: string;
  mrd?: string;
  age?: number;
  months?: number;
  days?: number;
  gender?: string;
  phone?: string;
  address?: string;
}

interface IDialysisReceiptDoctor {
  name?: string;
  department?: string;
  medicalLicenseNo?: string;
}

interface IDialysisReceiptAppointmentSummary {
  daycareId?: string;
  appointmentId?: string;
  ipdId?: string;
  receiptId?: string;
  appointmentDate?: string;
  admissionDate?: string;
  status?: string;
  procedurePrice?: number;
  discount?: number;
  totalPrice?: number;
  amountPaid?: number;
}

export interface IDialysisSessionReceiptInput {
  _id: string;
  sessionId?: string;
  sessionDate?: string;
  createdAt?: string;
  dialysisSessionSource?: string;
  patient?: IDialysisReceiptPatient;
  procedure?: {
    procedureName?: string;
    price?: number;
  };
  daycareAppointment?: IDialysisReceiptAppointmentSummary | null;
  ipdAppointment?: IDialysisReceiptAppointmentSummary | null;
  doctor?: IDialysisReceiptDoctor;
}

const formatAgeForReceipt = (
  years?: number | null,
  months?: number | null,
  days?: number | null
): string | undefined => {
  const y = years != null ? Number(years) : undefined;
  if (y != null && Number.isFinite(y)) {
    if (y === 0) {
      const m = months != null ? Number(months) : 0;
      if (m > 0) return `${m} ${m === 1 ? "Month" : "Months"}`;
      if (days != null) return `${days} ${Number(days) === 1 ? "Day" : "Days"}`;
      return undefined;
    }
    return `${y} ${y === 1 ? "Year" : "Years"}`;
  }

  const m = months != null ? Number(months) : 0;
  if (m > 0) return `${m} ${m === 1 ? "Month" : "Months"}`;
  if (days != null) return `${days} ${Number(days) === 1 ? "Day" : "Days"}`;
  return undefined;
};

const resolveDialysisAppointmentSummary = (session: IDialysisSessionReceiptInput) => {
  const source = session.dialysisSessionSource?.trim().toLowerCase();
  if (source === "ipd") return session.ipdAppointment ?? undefined;
  if (source === "daycare") return session.daycareAppointment ?? undefined;
  return session.daycareAppointment ?? session.ipdAppointment ?? undefined;
};

/** Receipt for a single dialysis session — only the dialysis procedure line, no bed/doctor/other procedures. */
export const buildDialysisSessionReceiptData = (
  session: IDialysisSessionReceiptInput
): IReceiptData => {
  const appointment = resolveDialysisAppointmentSummary(session);
  const source = session.dialysisSessionSource?.trim().toLowerCase();
  const isIpd = source === "ipd";

  const procedureAmount =
    Number(appointment?.procedurePrice ?? session.procedure?.price ?? 0) || 0;
  const discount = Number(appointment?.discount ?? 0) || 0;
  const paidAmount = Number(appointment?.amountPaid ?? 0) || 0;
  const dueAmount = Math.max(0, procedureAmount - discount - paidAmount);

  const procedureName =
    session.procedure?.procedureName?.trim() || "Dialysis Procedure";
  const visitDate =
    resolveDialysisSessionDate(session) ||
    (isIpd ? appointment?.admissionDate : appointment?.appointmentDate) ||
    undefined;

  const charges: IReceiptTransaction[] =
    procedureAmount > 0
      ? [
          {
            _id: `${session._id}-dialysis`,
            transactionId: "",
            transactionType: procedureName,
            amount: procedureAmount,
            paymentMode: "",
            transactionDate: visitDate ?? "",
            createdAt: session.createdAt ?? "",
          },
        ]
      : [];

  return {
    printTitle: "Dialysis Receipt",
    visitId: isIpd ? appointment?.ipdId : appointment?.daycareId,
    appointmentId: appointment?.appointmentId,
    visitDate,
    visitTime: undefined,
    visitType: isIpd ? "IPD" : "Day Care",
    appointmentType: isIpd ? "IPD" : "Day Care",
    status: appointment?.status,
    patientName: session.patient?.name,
    patientTitle: session.patient?.title,
    mrd: session.patient?.mrd,
    age: formatAgeForReceipt(
      session.patient?.age,
      session.patient?.months,
      session.patient?.days
    ),
    gender: session.patient?.gender,
    phone: session.patient?.phone,
    address: session.patient?.address?.trim() || undefined,
    doctorName: session.doctor?.name,
    doctorDepartment: session.doctor?.department,
    medicalLicenseNo: session.doctor?.medicalLicenseNo,
    receiptId: appointment?.receiptId,
    transactions: charges,
    totalAmount: procedureAmount,
    discount,
    dueAmount,
    paidAmount,
  };
};
