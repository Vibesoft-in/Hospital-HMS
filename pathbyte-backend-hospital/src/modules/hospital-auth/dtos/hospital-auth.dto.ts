import { HospitalUserRole } from "../models/hospital-user.types";

export interface LoginDTO {
  email: string;
  password: string;
}

export interface CreateUserDTO {
  username?: string;
  email: string;
  password: string;
  name: string;
  phoneNumber?: string;
  role: HospitalUserRole;
  linkedDoctorId?: string;
}

export interface UpdateUserDTO {
  username?: string;
  email?: string;
  password?: string;
  name?: string;
  phoneNumber?: string;
  role?: HospitalUserRole;
  isActive?: boolean;
  tokenVersion?: number;
  linkedDoctorId?: string;
}

export interface UpdateProfileDTO {
  name?: string;
  phoneNumber?: string;
}

export interface ChangePasswordDTO {
  currentPassword: string;
  newPassword: string;
}

export interface ResetPasswordDTO {
  newPassword: string;
}

export interface AuthUserDTO {
  _id: string;
  userId: string;
  username?: string;
  email: string;
  name: string;
  phoneNumber?: string;
  role: HospitalUserRole;
  tokenVersion?: number;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
