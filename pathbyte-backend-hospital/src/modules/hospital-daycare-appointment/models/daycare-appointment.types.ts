import { Document, Model } from "mongoose";

export interface DaycareProcedure {
  procedureId: string; // MongoDB _id of procedure
  procedureName: string;
  price: number;
  isDialysis: boolean;
  dialysisSessionId?: string | null;
  slotId?: string | null;
  sessionDate?: Date | string | null;
  isXray: boolean;
  isUltrasound?: boolean;
  xraySessionId?: string | null;
}

export interface DaycareAppointment {
  daycareId: string; // JJMDC00001 (JJM) or PAGDC00001 (PAGIA)
  appointmentId: string; // APT00001
  patientId: string; // Reference to hospital patient _id
  doctorId?: string; // Optional consulting doctor MongoDB _id
  
  // Daycare charges (optional)
  daycareChargesType?: "Private" | "Semi-Private" | "General" | "Custom" | "None";
  daycareChargesRate?: number; // 200, 150, or 100
  daycareChargesHours?: number; // Number of hours
  daycareChargesTotal?: number; // rate × hours
  
  // Procedures
  procedures: DaycareProcedure[];
  procedureChargesTotal: number; // Sum of all procedures
  
  // Doctor charges
  doctorVisitCharges: boolean; // Yes/No
  doctorChargesAmount: number; // 0 if false, doctor's charge if true
  
  // Pricing
  subtotal: number; // bed + procedures + doctor
  discount: number;
  discountAuthorizedAt?: Date;
  totalPrice: number; // subtotal - discount
  
  // Appointment details
  appointmentDate: Date; // Defaults to today if not provided
  status: "Scheduled" | "In Progress" | "Completed" | "Cancelled";
  // Audit
  createdBy?: string; // Hospital user _id who created this appointment
  receiptId?: string; // Unique receipt ID
  // Soft delete fields
  isDeleted?: boolean;
  deletedAt?: Date;
  deletedBy?: string; // Hospital user _id who deleted the record
  
  createdAt?: Date;
  updatedAt?: Date;
}

export interface DaycareAppointmentDoc extends DaycareAppointment, Document {}

export interface DaycareAppointmentModel extends Model<DaycareAppointmentDoc> {
  validateDiscountPassword(discount: number, discountPassword?: string, existingDiscount?: number): Promise<void>;
  createDaycareAppointment(newAppointment: DaycareAppointment): Promise<DaycareAppointment>;
  readDaycareAppointments(query: any, search: any, skip: number, limit: number): Promise<any>;
  readDaycareAppointment(daycareId: string): Promise<any>;
  readDaycareAppointmentById(id: string): Promise<any>;
  updateDaycareAppointment(daycareId: string, updates: Partial<DaycareAppointment>): Promise<DaycareAppointment>;
  updateDaycareAppointmentById(id: string, updates: Partial<DaycareAppointment>): Promise<DaycareAppointment>;
  deleteDaycareAppointment(daycareId: string): Promise<void>;
  deleteDaycareAppointmentById(id: string): Promise<void>;
  getAppointmentsByPatient(patientId: string): Promise<any[]>;
  getAppointmentsByDoctor(doctorId: string, date?: Date): Promise<any[]>;
  calculatePrice(
    daycareChargesType: string | undefined,
    daycareChargesHours: number | undefined,
    procedureIds: string[],
    doctorId: string | undefined,
    doctorVisitCharges: boolean,
    customDaycareRate?: number
  ): Promise<{
    daycareChargesRate?: number;
    daycareChargesTotal?: number;
    procedures: DaycareProcedure[];
    procedureChargesTotal: number;
    doctorChargesAmount: number;
    subtotal: number;
  }>;
}
