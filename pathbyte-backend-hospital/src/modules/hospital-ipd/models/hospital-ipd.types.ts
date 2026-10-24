import { Document, Model } from "mongoose";

// ── Billing charge item types ──────────────────────────────────────────────

export interface BillingChargeProcedure {
  chargeId: string;
  type: "procedure";
  procedureId: string;
  procedureName: string;
  procedureCategory?: string;  // category of the procedure (e.g. "Surgery", "Radiology")
  price: number;           // unit price (fetched live)
  units: number;           // quantity (default 1)
  totalCharge: number;     // price * units
  isDialysis: boolean;
  isPackage: boolean;      // snapshot of procedure.isPackage — indicates this is a package-type procedure
  dialysisSessionId?: string | null;
  dialysisSessionIds?: string[];
  dialysisSessions?: any[];
  isXray: boolean;
  isUltrasound?: boolean;  // only set when isXray is true — controls token prefix (U vs X)
  xraySessionId?: string | null;
  isCompleted: boolean;    // whether this charge has been completed/delivered
  addedAt: Date;
}

export interface BillingChargeProcedurePackage {
  chargeId: string;
  type: "procedure_package";
  packageId: string;
  packageName: string;
  procedures: Array<{
    procedureId: string;
    procedureName: string;
    price: number;
    isDialysis: boolean;
    dialysisSessionId?: string | null;
    dialysisSessionIds?: string[];
    dialysisSessions?: any[];
    isXray: boolean;
    isUltrasound?: boolean;
    xraySessionId?: string | null;
  }>;
  packageTotal: number;    // sum of procedure prices (1 unit)
  units: number;           // quantity (default 1)
  totalCharge: number;     // packageTotal * units
  isCompleted: boolean;    // whether this charge has been completed/delivered
  addedAt: Date;
}

export interface BillingChargeDoctor {
  chargeId: string;
  type: "doctor";
  doctorId: string;
  doctorName: string;
  charge: number;          // unit charge
  units: number;           // number of visits/consultations (default 1)
  totalCharge: number;     // charge * units
  isCompleted: boolean;    // whether this charge has been completed/delivered
  addedAt: Date;
}

export interface BillingChargeTest {
  chargeId: string;
  type: "test";
  caseId: string;
  caseReadableId: string;
  totalAmount: number;     // from pathlab case (already a total)
  units: number;           // always 1 for test cases
  totalCharge: number;     // same as totalAmount
  isCompleted: boolean;    // whether this charge has been completed/delivered
  addedAt: Date;
}

export interface BillingChargeBed {
  chargeId: string;
  type: "bed";
  bedId?: string;      // optional — the specific bed (for traceability)
  bedNumber?: string;  // snapshot of bed number at time of charge
  wardId: string;
  wardName: string;
  chargePerDay: number;    // effective rate used (bed-level if set, otherwise ward-level)
  units: number;           // number of days
  totalCharge: number;     // chargePerDay * units
  fromDate: Date;
  toDate: Date;
  isCompleted: boolean;    // whether this charge has been completed/delivered
  addedAt: Date;
}

export interface BillingChargeNursing {
  chargeId: string;
  type: "nursing";
  wardId: string;
  wardName: string;
  nursingChargePerDay: number;  // ward-level nursing rate
  units: number;                // number of days
  totalCharge: number;          // nursingChargePerDay * units
  fromDate: Date;
  toDate: Date;
  isCompleted: boolean;
  addedAt: Date;
}

export type BillingCharge =
  | BillingChargeProcedure
  | BillingChargeProcedurePackage
  | BillingChargeDoctor
  | BillingChargeTest
  | BillingChargeBed
  | BillingChargeNursing;

// ── MLC ───────────────────────────────────────────────────────────────────

export interface MLCInfo {
  markOfIdentification?: string;  // Physical identification marks on the patient
  thanaName?: string;             // Police station (thana) name
  patientBroughtBy?: string;      // Who brought the patient
  placeOfAccident?: string;       // Where the incident/accident occurred
  documentUrl?: string;           // S3 key — stored as raw key, served as signed URL
}

// ── Discharge Summary ─────────────────────────────────────────────────────

export interface DischargeMedicine {
  medicineName: string;
  type?: string;           // e.g. "Tablet", "Syrup", "Injection"
  duration?: string;       // e.g. "5 days"
  dosage?: string;         // e.g. "1-0-1"
  instructions?: string;   // e.g. "after food"
}

export interface DischargeDiagnosis {
  icdCode?: string;
  diagnosisName: string;
}

export interface DischargeSummary {
  // Discharge type — determines which type-specific fields are required on finalize
  dischargeType?: "Normal" | "LAMA" | "DOR" | "Death" | "Refer";

  // All clinical fields are optional — filled progressively while on draft
  dischargeDate?: Date;              // used for Normal/LAMA/DOR/Refer; set here, can be edited while draft
  clinicalSummary?: string;          // presenting complaints / symptoms on admission
  provisionalDiagnosis?: DischargeDiagnosis[];  // initial diagnosis on admission (structured, same as finalDiagnosis)
  finalDiagnosis?: DischargeDiagnosis[];
  courseInHospital?: string;         // what happened during the stay
  treatmentGiven?: string;           // surgeries, procedures performed
  conditionOnDischarge?: string;     // free text: "Stable", "Improved", "Expired", etc.
  medicinesOnDischarge?: DischargeMedicine[];
  adviceOnDischarge?: string[];      // bullet list of instructions
  followUp?: string;                 // e.g. "Visit OPD after 7 days"

  // LAMA fields
  lamaReason?: string;

  // DOR fields (required when dischargeType = DOR)
  dorRequestedBy?: string;           // name of person requesting discharge
  dorReason?: string;

  // Death fields (required when dischargeType = Death)
  deathDateTime?: Date;              // exact date/time of death
  deathCause?: string;

  // Refer fields (optional when dischargeType = Refer)
  referHospitalName?: string;        // hospital patient is being transferred to
  referReason?: string;

  // Vitals at discharge
  allergies?: string;
  dischargeBp?: string;
  dischargePulse?: string;
  dischargeSpO2?: string;
  dischargeTemp?: string;

  // Meta
  summaryStatus: "Draft" | "Finalized";
  finalizedAt?: Date;
  finalizedBy?: string;              // hospital user _id
}

// ── IPD ───────────────────────────────────────────────────────────────────

export interface HospitalIPD {
  ipdId: string;
  patientId: string;
  doctorId: string;
  bedId?: string;
  visitId?: string;              // optional — links to a HospitalVisit _id (visit-to-IPD conversion)
  admissionDate: Date;
  isDischarge: boolean;
  reason?: string;
  notes?: string;
  allowBedCharges: boolean;      // when false, bed charges are blocked for this IPD
  allowNursingCharges: boolean;  // when false, nursing charges are blocked for this IPD
  billingCharges: BillingCharge[];
  subtotal: number;
  discount: number;
  discountAuthorizedAt?: Date;
  totalPrice: number;
  status: "Admitted" | "Discharged" | "LAMA" | "DOR" | "Death" | "Refer" | "Cancelled";
  dischargeType?: "Normal" | "LAMA" | "DOR" | "Death" | "Refer";
  paymentNotCleared?: boolean;   // true when LAMA/DOR/Death/Refer/Cancelled with outstanding balance
  isMLC: boolean;
  mlc?: MLCInfo;
  dischargeSummary?: DischargeSummary;
  receiptId?: string;
  createdBy?: string;
  isDeleted?: boolean;
  deletedAt?: Date;
  deletedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface HospitalIPDDoc extends HospitalIPD, Document {}

export interface HospitalIPDModel extends Model<HospitalIPDDoc> {
  createIPD(data: HospitalIPD): Promise<HospitalIPD>;
  readIPDs(query: any, search: any, skip: number, limit: number): Promise<{ data: any[]; totalCount: number }>;
  readIPDById(id: string, filter?: any): Promise<any>;
  readIPDsForPathlab(query: any, search: string, skip: number, limit: number): Promise<{ data: any[]; totalCount: number }>;
  updateIPD(id: string, updates: Partial<HospitalIPD>, filter?: any): Promise<HospitalIPD>;
  softDeleteIPD(id: string, deletedBy?: string, filter?: any): Promise<void>;
}
