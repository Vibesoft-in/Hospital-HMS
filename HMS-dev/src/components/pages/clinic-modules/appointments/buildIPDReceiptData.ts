import axios from "axios";
import { API_BASE_URL } from "@/environment";
import type { IReceiptData, IReceiptTransaction, IPathlabReceiptData, IPathlabTestItem, IBillingLineItem } from "./printReceipt";

export async function enrichIPDDoctorForReceipt(
  ipd: IIpdAppointmentDetail
): Promise<IIpdAppointmentDetail> {
  if (!API_BASE_URL) return ipd;
  if (ipd.doctor?.medicalLicenseNo?.trim()) return ipd;
  const doctorRef = String(ipd.doctor?._id || ipd.doctorId || "").trim();
  if (!doctorRef) return ipd;
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
    if (!d) return ipd;
    const cur = ipd.doctor;
    return {
      ...ipd,
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
    return ipd;
  }
}

export interface IIpdPatient {
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
  abhaLinked?: boolean;
}

export interface IIpdDoctor {
  _id: string;
  doctorId?: string;
  name: string;
  department?: string;
  designation?: string;
  medicalLicenseNo?: string;
}

export interface IIpdProcedure {
  procedureId: string;
  procedureName?: string;
  category?: string;
  price?: number;
  units?: number;
  unitPrice?: number;
  isDialysis?: boolean;
  dialysisSessionId?: string;
}

export interface IIpdDoctorVisit {
  doctorId: string;
  doctorName?: string;
  days: number;
  chargePerDay?: number;
  price: number;
}

export interface IIpdTransaction {
  _id: string;
  transactionId: string;
  amount: number;
  paymentMode: string;
  transactionDate: string;
  createdAt: string;
}

export interface IIpdBedSummary {
  _id?: string;
  bedNumber?: string;
  bedCode?: string;
  ward?: { _id?: string; name?: string; chargePerDay?: number };
}

export interface IPathlabCasePatient {
  patientId?: string;
  title?: string;
  firstName?: string;
  lastName?: string;
  age?: number;
  months?: number;
  days?: number;
  gender?: string;
  address?: { line1?: string; [key: string]: unknown };
}

export interface IPathlabCaseDoctor {
  _id?: string;
  doctorId?: string;
  firstName?: string;
  lastName?: string;
}

export interface IPathlabCaseTestEntry {
  _id?: string;
  price?: number;
  test?: {
    _id?: string;
    testId?: string;
    testCode?: string;
    name?: string;
  };
}

export interface IPathlabCaseData {
  _id?: string;
  caseId?: string;
  patientId?: string;
  discountValue?: number;
  finalAmount?: number;
  totalAmount?: number;
  patient?: IPathlabCasePatient;
  doctor?: IPathlabCaseDoctor;
  casetests?: IPathlabCaseTestEntry[];
  transactions?: Array<{ amount?: number }>;
  labcenter?: { name?: string };
  createdAt?: string;
}

export interface IIpdBillingChargeSummary {
  type?: string;
  procedureId?: string;
  procedureName?: string;
  procedureCategory?: string;
  doctorId?: string;
  doctorName?: string;
  price?: number;
  units?: number;
  totalCharge?: number;
  charge?: number;
  caseId?: string;
  caseReadableId?: string;
  caseData?: IPathlabCaseData;
}

export interface IIpdAppointmentDetail {
  _id: string;
  ipdId: string;
  receiptId?: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  bedId?: string;
  procedures?: IIpdProcedure[];
  doctorVisits?: IIpdDoctorVisit[];
  billingCharges?: IIpdBillingChargeSummary[];
  procedureChargesTotal?: number;
  doctorVisitCharges?: boolean;
  doctorChargesAmount?: number;
  bedChargesTotal?: number;
  nursingChargesTotal?: number;
  subtotal?: number;
  discount?: number;
  totalPrice?: number;
  appointmentDate?: string;
  admissionDate?: string;
  reason?: string;
  status?: string;
  isDischarge?: boolean;
  createdAt?: string;
  updatedAt?: string;
  amountPaid?: number;
  paymentStatus?: string;
  notes?: string;
  mlc?: boolean;
  isMlc?: boolean;
  doctor?: IIpdDoctor;
  patient?: IIpdPatient;
  bed?: IIpdBedSummary;
  bedCharge?: {
    wardId?: string;
    wardName?: string;
    chargePerDay?: number;
    fromDate?: string;
    toDate?: string;
    days?: number;
    totalCharge?: number;
  };
  nursingCharge?: {
    wardId?: string;
    wardName?: string;
    nursingChargePerDay?: number;
    fromDate?: string;
    toDate?: string;
    days?: number;
    totalCharge?: number;
  };
  transactions?: IIpdTransaction[];
  abhaLinked?: boolean;
}

export const resolveIpdGrossTotal = (ipd: IIpdAppointmentDetail): number => {
  const subtotal = ipd.subtotal;
  const totalPrice = ipd.totalPrice;
  if (subtotal != null && Number.isFinite(Number(subtotal)) && Number(subtotal) > 0) {
    return Number(subtotal);
  }
  if (totalPrice != null && Number.isFinite(Number(totalPrice)) && Number(totalPrice) > 0) {
    return Number(totalPrice);
  }

  const procedureTotal =
    ipd.procedureChargesTotal ??
    (ipd.procedures ?? []).reduce((sum, proc) => sum + (Number(proc.price) || 0), 0);
  const doctorTotal =
    ipd.doctorChargesAmount ??
    (ipd.doctorVisits ?? []).reduce((sum, visit) => sum + (Number(visit.price) || 0), 0);
  const bedTotal =
    ipd.bedChargesTotal ??
    (Number.isFinite(Number(ipd.bedCharge?.totalCharge))
      ? Number(ipd.bedCharge?.totalCharge)
      : 0);
  const nursingTotal =
    ipd.nursingChargesTotal ??
    (Number.isFinite(Number(ipd.nursingCharge?.totalCharge))
      ? Number(ipd.nursingCharge?.totalCharge)
      : 0);

  const computed = procedureTotal + doctorTotal + bedTotal + nursingTotal;
  if (computed > 0) return computed;

  if (subtotal != null && Number.isFinite(Number(subtotal))) return Number(subtotal);
  if (totalPrice != null && Number.isFinite(Number(totalPrice))) return Number(totalPrice);
  return 0;
};

const resolveBillingChargeAmount = (charge: IIpdBillingChargeSummary): number => {
  const total = Number(charge.totalCharge);
  if (Number.isFinite(total) && total >= 0) return total;
  const flat = Number(charge.charge);
  if (Number.isFinite(flat) && flat >= 0) return flat;
  const price = Number(charge.price) || 0;
  const units = Math.max(1, Number(charge.units) || 1);
  return price * units;
};

const resolveBillingChargeRate = (
  charge: IIpdBillingChargeSummary,
  units: number,
  amount: number
): number => {
  const price = Number(charge.price);
  if (Number.isFinite(price) && price >= 0) return price;
  const flat = Number(charge.charge);
  if (Number.isFinite(flat) && flat >= 0) return flat;
  return units > 0 ? amount / units : amount;
};

const formatChargeDayLabel = (days: number): string =>
  days > 0 ? ` (${days} ${days === 1 ? "day" : "days"})` : "";

const buildBedChargeLabel = (wardName?: string): string => {
  const ward = wardName?.trim();
  return ward ? `Bed Charges - ${ward}` : "Bed Charges";
};

const buildNursingChargeLabel = (wardName?: string, days = 1): string => {
  const dayLabel = formatChargeDayLabel(days);
  const ward = wardName?.trim();
  return ward ? `Nursing Charges - ${ward}${dayLabel}` : `Nursing Charges${dayLabel}`;
};

const buildIpdBillingLineItems = (ipd: IIpdAppointmentDetail): IBillingLineItem[] => {
  const items: IBillingLineItem[] = [];
  let srNo = 0;

  const pushItem = (description: string, units: number, rate: number, amount: number) => {
    srNo += 1;
    items.push({
      srNo,
      description: description.trim() || "—",
      units,
      rate,
      amount,
    });
  };

  const billing = ipd.billingCharges ?? [];

  if (billing.length > 0) {
    billing.forEach((charge) => {
      const type = charge.type?.trim().toLowerCase() ?? "";
      if (type === "test") return;

      const units = Math.max(1, Number(charge.units) || 1);
      const amount = resolveBillingChargeAmount(charge);
      const rate = resolveBillingChargeRate(charge, units, amount);

      if (type === "procedure") {
        pushItem(charge.procedureName?.trim() || "Procedure", units, rate, amount);
        return;
      }

      if (type === "doctor") {
        pushItem(
          charge.doctorName?.trim() || ipd.doctor?.name?.trim() || "Doctor Visit Charges",
          units,
          rate,
          amount
        );
        return;
      }

      if (type === "bed") {
        const wardName = ipd.bedCharge?.wardName?.trim();
        pushItem(buildBedChargeLabel(wardName), units, rate, amount);
        return;
      }

      if (type === "nursing") {
        const wardName = ipd.nursingCharge?.wardName?.trim();
        pushItem(buildNursingChargeLabel(wardName, units), units, rate, amount);
        return;
      }

      const fallbackDescription =
        charge.procedureName?.trim() ||
        charge.doctorName?.trim() ||
        "Charge";
      pushItem(fallbackDescription, units, rate, amount);
    });

    const hasBedInBilling = billing.some((c) => c.type?.trim().toLowerCase() === "bed");
    const hasNursingInBilling = billing.some((c) => c.type?.trim().toLowerCase() === "nursing");

    if (!hasBedInBilling && ipd.bedCharge) {
      const days = Math.max(1, Number(ipd.bedCharge.days) || 1);
      const rate = Number(ipd.bedCharge.chargePerDay) || 0;
      const amount = Number.isFinite(Number(ipd.bedCharge.totalCharge))
        ? Number(ipd.bedCharge.totalCharge)
        : rate * days;
      pushItem(buildBedChargeLabel(ipd.bedCharge.wardName), days, rate, amount);
    }

    if (!hasNursingInBilling && ipd.nursingCharge) {
      const days = Math.max(1, Number(ipd.nursingCharge.days) || 1);
      const rate = Number(ipd.nursingCharge.nursingChargePerDay) || 0;
      const amount = Number.isFinite(Number(ipd.nursingCharge.totalCharge))
        ? Number(ipd.nursingCharge.totalCharge)
        : rate * days;
      pushItem(buildNursingChargeLabel(ipd.nursingCharge.wardName, days), days, rate, amount);
    }

    return items;
  }

  if (ipd.procedures && ipd.procedures.length > 0) {
    ipd.procedures.forEach((proc) => {
      const units = Math.max(1, Number(proc.units) || 1);
      const amount = Number(proc.price) || 0;
      const rate =
        Number(proc.unitPrice) ||
        (units > 0 ? amount / units : amount);
      pushItem(proc.procedureName?.trim() || "Procedure", units, rate, amount);
    });
  } else {
    const procTotal = ipd.procedureChargesTotal ?? 0;
    if (procTotal > 0) {
      pushItem("Procedure Charges", 1, procTotal, procTotal);
    }
  }

  const docTotal = ipd.doctorChargesAmount ?? 0;
  if (docTotal > 0 || (ipd.doctorVisits && ipd.doctorVisits.length > 0)) {
    const visit = ipd.doctorVisits?.[0];
    const days = Math.max(1, Number(visit?.days) || 1);
    const rate = Number(visit?.chargePerDay) || docTotal;
    const description = visit?.doctorName?.trim() || ipd.doctor?.name?.trim() || "Doctor Visit Charges";
    pushItem(description, days, rate, docTotal);
  }

  if (ipd.bedCharge) {
    const days = Math.max(1, Number(ipd.bedCharge.days) || 1);
    const rate = Number(ipd.bedCharge.chargePerDay) || 0;
    const amount = Number.isFinite(Number(ipd.bedCharge.totalCharge))
      ? Number(ipd.bedCharge.totalCharge)
      : rate * days;
    if (amount > 0 || rate > 0) {
      pushItem(buildBedChargeLabel(ipd.bedCharge.wardName), days, rate, amount);
    }
  }

  if (ipd.nursingCharge) {
    const days = Math.max(1, Number(ipd.nursingCharge.days) || 1);
    const rate = Number(ipd.nursingCharge.nursingChargePerDay) || 0;
    const amount = Number.isFinite(Number(ipd.nursingCharge.totalCharge))
      ? Number(ipd.nursingCharge.totalCharge)
      : rate * days;
    if (amount > 0 || rate > 0) {
      pushItem(buildNursingChargeLabel(ipd.nursingCharge.wardName, days), days, rate, amount);
    }
  }

  return items;
};

export const buildIPDReceiptData = (
  ipd: IIpdAppointmentDetail,
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

  if (ipd.procedures && ipd.procedures.length > 0) {
    ipd.procedures.forEach((proc, index) => {
      const procAmount = proc.price ?? 0;
      if (procAmount > 0) {
        charges.push({
          _id: `${ipd._id}-proc-${index}`,
          transactionId: "",
          transactionType: proc.procedureName || "Procedure",
          amount: procAmount,
          paymentMode: "",
          transactionDate: ipd.appointmentDate || ipd.createdAt || "",
          createdAt: ipd.createdAt ?? "",
        });
      }
    });
  } else {
    const procTotal = ipd.procedureChargesTotal ?? 0;
    if (procTotal > 0) {
      charges.push({
        _id: `${ipd._id}-proc`,
        transactionId: "",
        transactionType: "Procedure Charges",
        amount: procTotal,
        paymentMode: "",
        transactionDate: ipd.appointmentDate || ipd.createdAt || "",
        createdAt: ipd.createdAt ?? "",
      });
    }
  }

  const docTotal = ipd.doctorChargesAmount ?? 0;
  if (docTotal > 0) {
    charges.push({
      _id: `${ipd._id}-doc`,
      transactionId: "",
      transactionType: "Doctor Visit Charges",
      amount: docTotal,
      paymentMode: "",
      transactionDate: ipd.appointmentDate || ipd.createdAt || "",
      createdAt: ipd.createdAt ?? "",
    });
  }

  const bedChargeTotal =
    ipd.bedChargesTotal ??
    (Number.isFinite(Number(ipd.bedCharge?.totalCharge)) ? Number(ipd.bedCharge?.totalCharge) : 0);
  if (bedChargeTotal > 0) {
    const bedChargeDays = Number(ipd.bedCharge?.days ?? 0);
    const bedChargeDayLabel =
      bedChargeDays > 0 ? ` (${bedChargeDays} ${bedChargeDays === 1 ? "day" : "days"})` : "";
    const wardName = ipd.bedCharge?.wardName?.trim();
    charges.push({
      _id: `${ipd._id}-bed`,
      transactionId: "",
      transactionType: wardName
        ? `Bed Charges - ${wardName}${bedChargeDayLabel}`
        : `Bed Charges${bedChargeDayLabel}`,
      amount: bedChargeTotal,
      paymentMode: "",
      transactionDate: ipd.appointmentDate || ipd.createdAt || "",
      createdAt: ipd.createdAt ?? "",
    });
  }

  const nursingChargeTotal =
    ipd.nursingChargesTotal ??
    (Number.isFinite(Number(ipd.nursingCharge?.totalCharge))
      ? Number(ipd.nursingCharge?.totalCharge)
      : 0);
  if (nursingChargeTotal > 0) {
    const nursingChargeDays = Number(ipd.nursingCharge?.days ?? 0);
    const nursingChargeDayLabel =
      nursingChargeDays > 0
        ? ` (${nursingChargeDays} ${nursingChargeDays === 1 ? "day" : "days"})`
        : "";
    const nursingWardName = ipd.nursingCharge?.wardName?.trim();
    charges.push({
      _id: `${ipd._id}-nursing`,
      transactionId: "",
      transactionType: nursingWardName
        ? `Nursing Charges - ${nursingWardName}${nursingChargeDayLabel}`
        : `Nursing Charges${nursingChargeDayLabel}`,
      amount: nursingChargeTotal,
      paymentMode: "",
      transactionDate: ipd.appointmentDate || ipd.createdAt || "",
      createdAt: ipd.createdAt ?? "",
    });
  }

  const discountAmount = ipd.discount ?? 0;
  const billingLineItems = buildIpdBillingLineItems(ipd);

  return {
    printTitle: "Final Bill",
    visitId: ipd.ipdId,
    appointmentId: ipd.appointmentId,
    visitDate: ipd.appointmentDate,
    visitTime: undefined,
    visitType: "IPD",
    appointmentType: "IPD",
    status: ipd.status,
    patientName: ipd.patient?.name,
    patientTitle: ipd.patient?.title,
    mrd: ipd.patient?.mrd,
    age: formatAgeForReceipt(ipd.patient?.age, ipd.patient?.months, ipd.patient?.days),
    gender: ipd.patient?.gender,
    phone: ipd.patient?.phone,
    address: ipd.patient?.address?.trim() || undefined,
    doctorName: ipd.doctor?.name,
    doctorDepartment: ipd.doctor?.department,
    medicalLicenseNo: ipd.doctor?.medicalLicenseNo,
    receiptId: ipd.receiptId,
    transactions: charges,
    billingLineItems,
    totalAmount: resolveIpdGrossTotal(ipd),
    discount: discountAmount,
    discountAuthorizedBy: discountAmount > 0 ? "Dr. Abhishek Goel" : undefined,
    dueAmount,
    paidAmount: ipd.amountPaid ?? 0,
  };
};

export const buildPathlabReceiptsFromIPD = (
  ipd: IIpdAppointmentDetail
): IPathlabReceiptData[] => {
  const billing = ipd.billingCharges ?? [];
  const testCharges = billing.filter((c) => c.type === "test" && c.caseData);

  return testCharges.map((charge, idx) => {
    const caseData = charge.caseData!;
    const patient = caseData.patient;
    const doctor = caseData.doctor;

    const tests: IPathlabTestItem[] = (caseData.casetests ?? []).map((ct, i) => ({
      srNo: i + 1,
      testName: ct.test?.name ?? "",
      price: ct.price ?? 0,
    }));

    const paidAmount = (caseData.transactions ?? []).reduce(
      (sum, t) => sum + (Number(t.amount) || 0),
      0
    );

    const formatPathlabAge = (p?: IPathlabCasePatient): string | undefined => {
      if (!p) return undefined;
      const y = p.age != null ? Number(p.age) : undefined;
      if (y != null && Number.isFinite(y)) {
        if (y === 0) {
          const m = p.months != null ? Number(p.months) : 0;
          if (m > 0) return `${m} ${m === 1 ? "Month" : "Months"}`;
          if (p.days != null) return `${Number(p.days)} ${Number(p.days) === 1 ? "Day" : "Days"}`;
          return undefined;
        }
        return `${y} ${y === 1 ? "Year" : "Years"}`;
      }
      return undefined;
    };

    const referringDoctorName = doctor
      ? [doctor.firstName, doctor.lastName].filter(Boolean).join(" ").trim() || undefined
      : undefined;

    return {
      caseId: caseData.caseId ?? charge.caseReadableId ?? `CASE-${idx}`,
      patientName: patient
        ? [patient.firstName, patient.lastName].filter(Boolean).join(" ").trim() || undefined
        : undefined,
      patientTitle: patient?.title,
      mrd: patient?.patientId,
      age: formatPathlabAge(patient),
      gender: patient?.gender,
      address: patient?.address?.line1?.trim() || undefined,
      referringDoctorName,
      date: caseData.createdAt,
      tests,
      totalAmount: caseData.totalAmount ?? 0,
      discountValue: caseData.discountValue ?? 0,
      finalAmount: caseData.finalAmount ?? 0,
      paidAmount,
    };
  });
};
