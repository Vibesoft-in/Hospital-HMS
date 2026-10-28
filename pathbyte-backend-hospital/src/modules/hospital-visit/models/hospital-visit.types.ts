import { Document, Model } from "mongoose";

export interface VisitProcedure {
  procedureId: string;   // MongoDB _id of the procedure
  procedureName: string; // Snapshot at time of booking
  price: number;         // Snapshot of price at time of booking
}

export interface HospitalVisit {
  visitId: string;
  appointmentId: string; // New unique readable appointment ID
  patientId: string; // Reference to hospital patient _id
  doctorId: string; // Reference to hospital doctor MongoDB _id
  visitType: "New" | "Emergency" | "Follow-up" | "Follow-up-report" | "MR";
  appointmentType: "OPD" | "Day Care" | "IPD" | "ICU" | "Emergency";
  reason?: string;
  notes?: string;
  visitDate: Date;
  visitTime?: string; // Time of visit in HH:MM format (24-hour) - Optional
  sessionSlot?: "Morning" | "Noon" | "Afternoon" | "Evening" | "Night"; // Optional - for informational purposes
  tokenNumber: number; // Daily auto-incrementing token number (per doctor per day)
  price: number; // Doctor consultation fee — calculated from doctor's rate card
  discount: number; // Discount amount
  discountAuthorizedAt?: Date; // Timestamp when discount was authorized
  // Procedure charges (OPD)
  procedures?: VisitProcedure[];          // Optional procedures added at visit time
  procedureChargesTotal?: number;         // Sum of all procedure prices
  subtotal?: number;                      // price + procedureChargesTotal
  totalPrice?: number;                    // subtotal - discount
  status: "Scheduled" | "In Progress" | "Completed" | "Cancelled" | "No Show";
  // Attendant information
  attendantName?: string;
  attendantRelation?: string;
  // Audit
  createdBy?: string; // Hospital user _id who created this visit
  receiptId?: string; // Unique receipt ID
  // Soft delete fields
  isDeleted?: boolean;
  deletedAt?: Date;
  deletedBy?: string; // Hospital user _id who deleted the record
  createdAt?: Date;
  updatedAt?: Date;
}

export interface HospitalVisitDoc extends HospitalVisit, Document {}

export interface HospitalVisitModel extends Model<HospitalVisitDoc> {
  validateDoctorAvailability(
    doctorId: string, 
    visitDate: Date, 
    sessionSlot: string | undefined, // Now optional
    visitTime?: string,
    excludeVisitId?: string
  ): Promise<{ isAvailable: boolean; message?: string; doctor: any }>;
  validateDiscountPassword(discount: number, discountPassword?: string, existingDiscount?: number): Promise<void>;
  validateVisitCreation(newVisit: Partial<HospitalVisit>): Promise<void>;
  createHospitalVisit(newVisit: HospitalVisit): Promise<HospitalVisit>;
  readHospitalVisits(query: any, search: any, skip: number, limit: number): Promise<any>;
  readHospitalVisit(visitId: string, filter?: any): Promise<any>;
  updateHospitalVisit(visitId: string, updates: Partial<HospitalVisit>): Promise<HospitalVisit>;
  deleteHospitalVisit(visitId: string): Promise<void>;
  getVisitsByPatient(patientId: string): Promise<any[]>;
  getVisitsByDoctor(doctorId: string, date?: Date): Promise<any[]>;
  getDoctorSchedule(doctorId: string, date: Date): Promise<any>;
  getVisitByTokenNumber(tokenNumber: number, date: Date, doctorId: string, sessionSlot?: string): Promise<any>;
  calculateVisitPrice(doctorId: string, visitType: string, appointmentType: string): Promise<{ price: number; doctorId: string; visitType: string; appointmentType: string; available: boolean }>;
}