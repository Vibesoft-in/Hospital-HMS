import { Document, Model } from "mongoose";

export interface EmergencyContact {
  name: string;
  number: string;
}

export interface HospitalPatient {
  mrd: string; // Medical Record ID - Auto-generated on backend
  patientUhid?: string; // Patient UHID - Used in Pagia system for external identification
  title: string;
  name: string;
  phone: string;
  email?: string;
  dob?: Date; // Date of Birth
  age?: number;
  months?: number;
  days?: number;
  gender: "Male" | "Female" | "Other";
  bloodGroup?: string;
  address?: string;
  aadharNo?: string;
  aadharS3Url?: string;
  ayushmanCardNo?: string;
  ayushmanCardS3Url?: string;
  abhaNumber?: string;       // ABHA 14-digit number (e.g. "91-1234-5678-9012")
  abhaAddress?: string;      // ABHA address (e.g. "john@abdm")
  allAbhaAddresses?: string[]; // Array of all linked/synced ABHA addresses for this patient (unique)
  imageS3Url?: string;
  companyName?: string;
  division?: string;
  maritalStatus?: "Single" | "Married" | "Divorced" | "Widowed" | "Separated" | "Other";
  occupation?: string;
  drugSensitivity?: string;
  otherDocsS3Urls?: string[];
  emergencyContacts?: EmergencyContact[];
  // Soft delete fields
  isDeleted?: boolean;
  deletedAt?: Date;
  deletedBy?: string;
  pathlabPatientId?: string; // Cross-reference to Pathlab Patient._id
  abhaPatientId?: string;   // Cross-reference to AbhaPatient._id
  abhaLinked?: boolean;     // True once ABHA has been linked to this patient
  isMRPatient?: boolean; // True once an MR visit has been created for this patient
  createdBy?: string; // Hospital user _id who created this patient
  createdAt?: Date;
  updatedAt?: Date;
}

export interface HospitalPatientDoc extends HospitalPatient, Document {}

export interface HospitalPatientModel extends Model<HospitalPatientDoc> {
  createHospitalPatient(newPatient: HospitalPatient): Promise<HospitalPatient>;
  readHospitalPatients(query: any, search: any, skip: number, limit: number): Promise<any>;
  readHospitalPatient(mrd: string): Promise<any>;
  updateHospitalPatient(mrd: string, updates: Partial<HospitalPatient>): Promise<HospitalPatient>;
  deleteHospitalPatient(mrd: string, deletedBy?: string): Promise<void>;
  permanentlyDeleteHospitalPatient(mrd: string): Promise<void>;
  restoreHospitalPatient(mrd: string): Promise<HospitalPatient>;
}