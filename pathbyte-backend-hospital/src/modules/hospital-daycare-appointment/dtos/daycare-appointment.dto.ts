import { DaycareAppointment, DaycareProcedure } from "../models/daycare-appointment.types";

// Base DTO for creating day care appointment
export interface CreateDaycareAppointmentDTO {
  patientId: string;
  doctorId?: string;
  daycareChargesType?: "Private" | "Semi-Private" | "General" | "Custom" | "None";
  daycareChargesHours?: number;
  customDaycareRate?: number; // Required when daycareChargesType is "Custom"
  procedureIds?: string[];
  doctorVisitCharges: boolean;
  discount?: number;
  discountPassword?: string;
  appointmentDate?: Date | string;
  createdBy?: string;
}

// DTO for creating with new patient
export interface CreateDaycareAppointmentWithPatientDTO extends Omit<CreateDaycareAppointmentDTO, 'patientId'> {
  patient: {
    title: "Mr." | "Mrs." | "Ms." | "Dr." | "Master" | "Baby of" | "Baby";
    name: string;
    phone: string;
    email?: string;
    dob?: string;
    age?: number;
    gender: "Male" | "Female" | "Other";
    bloodGroup?: "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-" | "Not Known";
    address?: string;
    aadharNo?: string;
    ayushmanCardNo?: string;
    maritalStatus?: "Single" | "Married" | "Divorced" | "Widowed" | "Separated" | "Other";
    occupation?: string;
    drugSensitivity?: string;
    emergencyContacts?: Array<{
      name: string;
      number: string;
    }>;
  };
  transaction?: {
    transactionType: "Payment" | "Advance";
    amount: number;
    paymentMode: "Cash" | "Card" | "UPI" | "Net Banking" | "Cheque" | "Insurance" | "Govt Backed";
    referenceNo?: string;
    transactionDate?: Date | string;
  };
}

// DTO for creating with transaction
export interface CreateDaycareAppointmentWithTransactionDTO extends CreateDaycareAppointmentDTO {
  transaction?: {
    transactionType: "Payment" | "Advance";
    amount: number;
    paymentMode: "Cash" | "Card" | "UPI" | "Net Banking" | "Cheque" | "Insurance" | "Govt Backed";
    referenceNo?: string;
    transactionDate?: Date | string;
  };
}

// Response DTO
export interface DaycareAppointmentResponseDTO extends DaycareAppointment {
  _id?: string;
  patient?: any;
  doctor?: any;
  transaction?: any;
  transactions?: any[];
  amountPaid?: number;
  paymentStatus?: "Paid" | "Unpaid" | "Partially Paid";
}

// DTO for price calculation
export interface CalculatePriceDTO {
  daycareChargesType?: "Private" | "Semi-Private" | "General" | "Custom" | "None";
  daycareChargesHours?: number;
  customDaycareRate?: number; // Required when daycareChargesType is "Custom"
  procedureIds?: string[];
  doctorId?: string;
  doctorVisitCharges: boolean;
}

export interface CalculatePriceResponseDTO {
  daycareChargesType?: string;
  daycareChargesRate?: number;
  daycareChargesHours?: number;
  daycareChargesTotal?: number;
  procedures: DaycareProcedure[];
  procedureChargesTotal: number;
  doctorVisitCharges: boolean;
  doctorChargesAmount: number;
  subtotal: number;
}
