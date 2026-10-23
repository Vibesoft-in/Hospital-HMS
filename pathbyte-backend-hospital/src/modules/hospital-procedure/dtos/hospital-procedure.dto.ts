import { ProcedureType } from "../models/hospital-procedure.types";

export interface CreateHospitalProcedureDTO {
  procedureName: string;
  department: string;
  category: string;
  status?: "Active" | "Inactive";
  price: number;
  dayCareBilling?: boolean;
  consumables?: boolean;
  nursingCharges?: number;
  roomCharges?: number;
  metaData?: string;
  description?: string;
  isDialysis?: boolean;
  isXray?: boolean;
  isUltrasound?: boolean;
  isPackage?: boolean;
  type?: ProcedureType;
}

export interface HospitalProcedureResponseDTO {
  _id?: string;
  procedureId: string;
  procedureName: string;
  department: string;
  category: string;
  status: "Active" | "Inactive";
  price: number;
  dayCareBilling: boolean;
  consumables: boolean;
  nursingCharges: number;
  roomCharges: number;
  metaData?: string;
  description?: string;
  isDialysis?: boolean;
  isXray?: boolean;
  isUltrasound?: boolean;
  isPackage?: boolean;
  type: ProcedureType;
  isDeleted?: boolean;
  deletedAt?: Date;
  deletedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UpdateHospitalProcedureDTO {
  procedureName?: string;
  department?: string;
  category?: string;
  status?: "Active" | "Inactive";
  price?: number;
  dayCareBilling?: boolean;
  consumables?: boolean;
  nursingCharges?: number;
  roomCharges?: number;
  metaData?: string;
  description?: string;
  isDialysis?: boolean;
  isXray?: boolean;
  isUltrasound?: boolean;
  isPackage?: boolean;
  type?: ProcedureType;
}
