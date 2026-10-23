import { Document, Model } from "mongoose";

export interface VisitType {
  visitType: string; // "New" | "Emergency" | "Follow-up" | "MR"
  appointmentType: string; // "OPD" | "Day Care" | "IPD" | "ICU" | "Emergency"
  charge: number;
}

export interface ScheduleSlot {
  session: "Morning" | "Noon" | "Afternoon" | "Evening" | "Night";
  startTime: string; // HH:MM format
  endTime: string;   // HH:MM format
}

export interface WeeklySchedule {
  dayOfWeek: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";
  mr?: boolean; // Whether MR visits are allowed on this day
  slots: ScheduleSlot[];
}

export interface DialysisSlot {
  _id?: any;
  name: string; // e.g. "Morning Dialysis Session"
  startTime: string; // HH:MM format
  endTime: string;   // HH:MM format
  maxAppointments: number; // max appointments allowed in this slot
  isActive?: boolean;
}

export interface HospitalDoctor {
  doctorId: string;
  name: string;
  imageUrl?: string;
  email?: string;
  phone?: string;
  dob?: Date;
  yearsOfExperience?: number;
  department: string;
  designation?: string;
  medicalLicenseNo?: string;
  gender?: "Male" | "Female" | "Other";
  bloodGroup?: string;
  address?: string;
  opdNumber?: string;
  posterUrl?: string;
  visitTypes?: VisitType[]; // Array of visit types with charges
  sessions?: string[]; // Array of available sessions (kept for backward compatibility)
  weeklySchedule?: WeeklySchedule[]; // New weekly schedule system
  dialysisSlots?: DialysisSlot[]; // Dialysis sessions slots configured by/for doctor
  maxAppointmentsPerSlot?: number;
  // MR-specific settings
  mrMaxVisitsPerDay?: number; // Maximum MR visits allowed per day for this doctor
  queueSortBy?: "token" | "time"; // TV queue display sorting mode: token-wise (default) or time-wise
  // Soft delete fields
  isDeleted?: boolean;
  deletedAt?: Date;
  deletedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface HospitalDoctorDoc extends HospitalDoctor, Document {}

export interface HospitalDoctorModel extends Model<HospitalDoctorDoc> {
  createHospitalDoctor(newDoctor: HospitalDoctor): Promise<HospitalDoctor>;
  readHospitalDoctors(query: any, search: any, skip: number, limit: number): Promise<any>;
  readHospitalDoctor(doctorId: string): Promise<any>;
  updateHospitalDoctor(doctorId: string, updates: Partial<HospitalDoctor>): Promise<HospitalDoctor>;
  deleteHospitalDoctor(doctorId: string, deletedBy?: string): Promise<void>;
  restoreHospitalDoctor(doctorId: string): Promise<HospitalDoctor>;
  updateDoctorSchedule(doctorId: string, scheduleData: { weeklySchedule: WeeklySchedule[]; mrMaxVisitsPerDay?: number }): Promise<HospitalDoctor>;
}