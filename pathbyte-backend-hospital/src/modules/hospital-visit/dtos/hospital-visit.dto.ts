// For creating visit with existing patient ID
export interface CreateHospitalVisitDTO {
  patientId: string;
  doctorId: string;
  visitType: "New" | "Emergency" | "Follow-up" | "Follow-up-report"  | "MR";
  appointmentType: "OPD" | "Day Care" | "IPD" | "ICU" | "Emergency";
  reason?: string;
  visitDate: Date | string;
  visitTime?: string;
  sessionSlot?: "Morning" | "Noon" | "Afternoon" | "Evening" | "Night";
  discount?: number;
  discountPassword?: string;
  status?: "Scheduled" | "In Progress" | "Completed" | "Cancelled" | "No Show";
  // Optional OPD procedures (MongoDB _ids resolved to snapshots in service)
  procedures?: Array<{ procedureId: string }>;
  // MR visit specific — saved to patient record
  companyName?: string;
  division?: string;
}

// For creating visit with new patient data
export interface CreateHospitalVisitWithPatientDTO {
  // Patient data (will create new patient)
  patient: {
    title: "Mr." | "Mrs." | "Ms." | "Dr." | "Master" | "Baby of" | "Baby";
    name: string;
    phone: string;
    email?: string;
    dob?: string; // Date string
    age?: number;
    gender: "Male" | "Female" | "Other";
    bloodGroup?: "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-" | "Not Known";
    address?: string;
    aadharNo?: string;
    aadharS3Url?: string;
    ayushmanCardNo?: string;
    otherDocsS3Urls?: string[];
    emergencyContacts?: Array<{
      name: string;
      number: string;
    }>;
  };
  // Visit data
  doctorId: string; // Doctor's MongoDB _id
  visitType: "New" | "Emergency" | "Follow-up" | "MR";
  appointmentType: "OPD" | "Day Care" | "IPD" | "ICU" | "Emergency";
  reason?: string;
  visitDate: Date | string; // Accept both Date and string from frontend
  visitTime?: string; // Time of visit in HH:MM format (24-hour) - Optional
  sessionSlot?: "Morning" | "Noon" | "Afternoon" | "Evening" | "Night"; // Optional - for informational purposes only
  discount?: number; // Discount amount (optional, defaults to 0)
  discountPassword?: string; // Required when discount > 0 (not stored in DB)
  status?: "Scheduled" | "In Progress" | "Completed" | "Cancelled" | "No Show";
  // Optional OPD procedures
  procedures?: Array<{ procedureId: string }>;
  // Optional transaction data
  transaction?: {
    transactionType: "Payment" | "Refund" | "Advance" | "Adjustment";
    amount: number;
    paymentMode: "Cash" | "Card" | "UPI" | "Net Banking" | "Cheque" | "Insurance";
    referenceNo?: string;
    transactionDate?: Date | string; // Accept both Date and string from frontend
  };
}

// For creating visit with existing patient and optional transaction
export interface CreateHospitalVisitWithTransactionDTO extends CreateHospitalVisitDTO {
  transaction?: {
    transactionType: "Payment" | "Refund" | "Advance" | "Adjustment";
    amount: number;
    paymentMode: "Cash" | "Card" | "UPI" | "Net Banking" | "Cheque" | "Insurance";
    referenceNo?: string;
    transactionDate?: Date;
  };
}

export interface HospitalVisitResponseDTO {
  _id?: string; // MongoDB _id
  visitId: string;
  appointmentId: string; // New unique readable appointment ID
  patientId: string; // Patient's MongoDB _id
  doctorId: string; // Doctor's MongoDB _id
  visitType: "New" | "Emergency" | "Follow-up" | "MR";
  appointmentType: "OPD" | "Day Care" | "IPD" | "ICU" | "Emergency";
  reason?: string;
  visitDate: Date;
  visitTime?: string; // Time of visit in HH:MM format (24-hour) - Optional
  sessionSlot?: "Morning" | "Noon" | "Afternoon" | "Evening" | "Night"; // Optional - for informational purposes only
  tokenNumber: number; // Daily auto-incrementing token number (per-doctor per-day)
  price: number; // Doctor consultation fee
  procedures?: Array<{ procedureId: string; procedureName: string; price: number }>;
  procedureChargesTotal?: number; // Sum of all procedure prices
  subtotal?: number;              // price + procedureChargesTotal
  totalPrice?: number;            // subtotal - discount
  discount: number; // Discount amount
  discountAuthorizedAt?: Date; // Timestamp when discount was authorized
  status: string;
  amountPaid?: number; // Total amount paid from all transactions
  paymentStatus?: "Paid" | "Unpaid" | "Partially Paid"; // Calculated based on totalPrice vs amountPaid
  patient?: any; // Populated patient data
  doctor?: any; // Populated doctor data
  transaction?: any; // Populated transaction data if created
  transactions?: any[]; // All transactions for this visit
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateHospitalVisitDTO {
  patientId?: string; // Patient's MongoDB _id
  doctorId?: string; // Doctor's MongoDB _id
  visitType?: "New" | "Emergency" | "Follow-up" | "MR";
  appointmentType?: "OPD" | "Day Care" | "IPD" | "ICU" | "Emergency";
  reason?: string;
  visitDate?: Date | string; // Accept both Date and string from frontend
  visitTime?: string; // Time of visit in HH:MM format (24-hour)
  sessionSlot?: "Morning" | "Noon" | "Afternoon" | "Evening" | "Night"; // Optional - for informational purposes only
  discount?: number; // Discount amount
  discountPassword?: string; // Required when discount > 0 (not stored in DB)
  tokenNumber?: number; // Can be manually updated if needed
  // Note: price is recalculated automatically when visitType changes
  status?: "Scheduled" | "In Progress" | "Completed" | "Cancelled" | "No Show";
  // Optional OPD procedures (replaces entire procedures array when provided)
  procedures?: Array<{ procedureId: string }>;
  // Optional transaction data (same as create)
  transaction?: {
    transactionType: "Payment" | "Refund" | "Advance" | "Adjustment";
    amount: number;
    paymentMode: "Cash" | "Card" | "UPI" | "Net Banking" | "Cheque" | "Insurance";
    referenceNo?: string;
    transactionDate?: Date | string;
  };
}