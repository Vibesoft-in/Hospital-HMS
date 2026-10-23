export interface VisitTypeDTO {
  type: string;
  charge: number;
}

export interface DialysisSlotDTO {
  _id?: string;
  name: string;
  startTime: string;
  endTime: string;
  maxAppointments: number;
  isActive?: boolean;
}

export interface CreateHospitalDoctorDTO {
  name: string;
  imageUrl?: string;
  email: string;   // required — used to create linked user account
  password: string; // required — used to create linked user account
  phone?: string;
  dob?: string | Date; // Accept both string and Date
  yearsOfExperience?: number;
  department: string;
  designation?: string;
  medicalLicenseNo?: string;
  gender?: "Male" | "Female" | "Other";
  bloodGroup?: "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-" | "Not Known";
  address?: string;
  opdNumber?: string;
  posterUrl?: string;
  visitTypes?: VisitTypeDTO[];
  sessions?: string[];
  dialysisSlots?: DialysisSlotDTO[];
  maxAppointmentsPerSlot?: number;
  mrMaxVisitsPerDay?: number;
  queueSortBy?: "token" | "time";
}

export interface HospitalDoctorResponseDTO {
  doctorId: string;
  name: string;
  imageUrl?: string; // Will be signed S3 URL in response
  email?: string;
  phone?: string;
  dob?: string; // Returned as YYYY-MM-DD string
  yearsOfExperience?: number;
  department: string;
  designation?: string;
  medicalLicenseNo?: string;
  gender?: string;
  bloodGroup?: string;
  address?: string;
  opdNumber?: string;
  posterUrl?: string; // Will be signed S3 URL in response
  visitTypes?: VisitTypeDTO[];
  sessions?: string[];
  dialysisSlots?: DialysisSlotDTO[];
  maxAppointmentsPerSlot?: number;
  mrMaxVisitsPerDay?: number;
  queueSortBy?: "token" | "time";
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateHospitalDoctorDTO {
  name?: string;
  imageUrl?: string;
  email?: string;
  password?: string; // optional — if provided, syncs to linked user account
  phone?: string;
  dob?: string | Date; // Accept both string and Date
  yearsOfExperience?: number;
  department?: string;
  designation?: string;
  medicalLicenseNo?: string;
  gender?: "Male" | "Female" | "Other";
  bloodGroup?: "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-" | "Not Known";
  address?: string;
  opdNumber?: string;
  posterUrl?: string;
  visitTypes?: VisitTypeDTO[];
  sessions?: string[];
  dialysisSlots?: DialysisSlotDTO[];
  maxAppointmentsPerSlot?: number;
  mrMaxVisitsPerDay?: number;
  queueSortBy?: "token" | "time";
}