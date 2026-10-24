import { Document, Model } from "mongoose";

export type HospitalUserRole = "ADMIN" | "RECEPTIONIST" | "RECEPTIONIST2" | "DOCTOR" | "DIALYSIS" | "PHARMACIST" | "ACCOUNTANT" | "XRAY";

export interface HospitalUser {
  userId: string;
  username?: string;
  email: string;
  passwordHash: string;
  name: string;
  phoneNumber?: string;
  role: HospitalUserRole;
  linkedDoctorId?: string; // _id of HospitalDoctor — required for DOCTOR role
  tokenVersion?: number;
  isActive: boolean;
  deleted: boolean;
  deletedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface HospitalUserDoc extends HospitalUser, Document {}

export interface HospitalUserModel extends Model<HospitalUserDoc> {
  readByEmail(email: string): Promise<HospitalUser | null>;
  readByUserId(userId: string): Promise<any>;
  readUser(id: string): Promise<any>;
  createUser(user: Omit<HospitalUser, "userId"> & { userId: string }): Promise<HospitalUser>;
  readUsers(filter: any, search: any, skip: number, limit: number): Promise<any[]>;
  updateUser(id: string, updates: Partial<HospitalUser>): Promise<HospitalUser | null>;
  softDeleteUser(id: string): Promise<void>;
}

