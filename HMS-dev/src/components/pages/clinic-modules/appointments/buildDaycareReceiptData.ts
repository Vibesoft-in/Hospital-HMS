import axios from "axios";
import { API_BASE_URL } from "@/environment";
import type { IReceiptData, IReceiptTransaction } from "./printReceipt";

/**
 * Daycare appointment payloads often omit `doctor.medicalLicenseNo`. Fetch full doctor so receipt
 * matches OPD: `Dr. … [licence]` via shared {@link buildDaycareReceiptData} + PrintReceipt.
 */
export async function enrichDaycareDoctorForReceipt(
  daycare: IDaycareAppointmentDetail
): Promise<IDaycareAppointmentDetail> {
  if (!API_BASE_URL) return daycare;
  if (daycare.doctor?.medicalLicenseNo?.trim()) return daycare;
  const doctorRef = String(daycare.doctor?._id || daycare.doctorId || "").trim();
  if (!doctorRef) return daycare;
  try {
    const res = await axios.get(`${API_BASE_URL}/hospital/doctors/${doctorRef}`);
    const d = res.data?.data?.doctor as
      | {
          _id?: string;
          doctorId?: string;
          name?: string;
          department?: string;
          designation?: string;
          medicalLicenseNo?: string;
        }
      | undefined;
    if (!d) return daycare;
    const cur = daycare.doctor;
    return {
      ...daycare,
      doctor: {
        _id: d._id ?? cur?._id ?? doctorRef,
        doctorId: d.doctorId ?? cur?.doctorId,
        name: cur?.name?.trim() || d.name || "",
        department: cur?.department ?? d.department,
        designation: cur?.designation ?? d.designation,
        medicalLicenseNo: d.medicalLicenseNo ?? cur?.medicalLicenseNo,
      },
    };
  } catch {
    return daycare;
  }
}

export interface IDaycarePatient {
  _id: string;
  name?: string;
  title?: string;
  phone?: string;
  email?: string;
  mrd?: string;
  age?: number;
  months?: number;
  days?: number;
  gender?: string;
  bloodGroup?: string;
  address?: string;
}

export interface IDaycareDoctor {
  _id: string;
  doctorId?: string;
  name: string;
  department?: string;
  designation?: string;
  medicalLicenseNo?: string;
}

export interface IDaycareProcedure {
  procedureId: string;
  procedureName?: string;
  price?: number;
  isDialysis?: boolean;
  dialysisSessionId?: string;
}

export interface IDaycareTransaction {
  _id: string;
  transactionId: string;
  amount: number;
  paymentMode: string;
  transactionDate: string;
  createdAt: string;
}

export interface IDaycareAppointmentDetail {
  _id: string;
  daycareId: string;
  receiptId?: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  bedChargesType?: string;
  bedChargesHours?: number;
  bedChargesTotal?: number;
  daycareChargesType?: string;
  daycareChargesHours?: number;
  daycareChargesTotal?: number;
  procedures?: IDaycareProcedure[];
  procedureChargesTotal?: number;
  doctorVisitCharges?: boolean;
  doctorChargesAmount?: number;
  subtotal?: number;
  discount?: number;
  totalPrice?: number;
  appointmentDate?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  amountPaid?: number;
  paymentStatus?: string;
  doctor?: IDaycareDoctor;
  patient?: IDaycarePatient;
  transactions?: IDaycareTransaction[];
  abhaLinked?: boolean;
}

export const buildDaycareReceiptData = (
  daycare: IDaycareAppointmentDetail,
  dueAmount: number
): IReceiptData => {
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

  const charges: IReceiptTransaction[] = [];

  const bedTotal = daycare.daycareChargesTotal ?? daycare.bedChargesTotal ?? 0;
  if (bedTotal > 0) {
    charges.push({
      _id: `${daycare._id}-bed`,
      transactionId: "",
      transactionType: "Daycare Charges",
      amount: bedTotal,
      paymentMode: "",
      transactionDate: daycare.appointmentDate || daycare.createdAt || "",
      createdAt: daycare.createdAt ?? "",
    });
  }

  if (daycare.procedures && daycare.procedures.length > 0) {
    daycare.procedures.forEach((proc, index) => {
      const procAmount = proc.price ?? 0;
      if (procAmount > 0) {
        charges.push({
          _id: `${daycare._id}-proc-${index}`,
          transactionId: "",
          transactionType: proc.procedureName || "Procedure",
          amount: procAmount,
          paymentMode: "",
          transactionDate: daycare.appointmentDate || daycare.createdAt || "",
          createdAt: daycare.createdAt ?? "",
        });
      }
    });
  } else {
    const procTotal = daycare.procedureChargesTotal ?? 0;
    if (procTotal > 0) {
      charges.push({
        _id: `${daycare._id}-proc`,
        transactionId: "",
        transactionType: "Procedure Charges",
        amount: procTotal,
        paymentMode: "",
        transactionDate: daycare.appointmentDate || daycare.createdAt || "",
        createdAt: daycare.createdAt ?? "",
      });
    }
  }

  const docTotal = daycare.doctorChargesAmount ?? 0;
  if (daycare.doctorVisitCharges && docTotal > 0) {
    charges.push({
      _id: `${daycare._id}-doc`,
      transactionId: "",
      transactionType: "Doctor Visit Charges",
      amount: docTotal,
      paymentMode: "",
      transactionDate: daycare.appointmentDate || daycare.createdAt || "",
      createdAt: daycare.createdAt ?? "",
    });
  }

  return {
    visitId: daycare.daycareId,
    appointmentId: daycare.appointmentId,
    visitDate: daycare.appointmentDate,
    visitTime: undefined,
    visitType: "Day Care",
    appointmentType: "Day Care",
    status: daycare.status,
    patientName: daycare.patient?.name,
    patientTitle: daycare.patient?.title,
    mrd: daycare.patient?.mrd,
    age: formatAgeForReceipt(daycare.patient?.age, daycare.patient?.months, daycare.patient?.days),
    gender: daycare.patient?.gender,
    phone: daycare.patient?.phone,
    address: daycare.patient?.address?.trim() || undefined,
    doctorName: daycare.doctor?.name,
    doctorDepartment: daycare.doctor?.department,
    medicalLicenseNo: daycare.doctor?.medicalLicenseNo,
    receiptId: daycare.receiptId,
    transactions: charges,
    totalAmount: daycare.subtotal ?? daycare.totalPrice ?? 0,
    discount: daycare.discount ?? 0,
    dueAmount,
    paidAmount: daycare.amountPaid ?? 0,
  };
};
