import { Document, Model } from "mongoose";

export type ProcedureType = "daycare" | "ipd" | "opd" | "both";

export interface HospitalProcedure {
  procedureId: string;
  procedureName: string;
  department?: string;
  category?: string;
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
  isUltrasound?: boolean; // only meaningful when isXray is true — controls token prefix (U vs X)
  isPackage?: boolean;  // when true, this procedure acts as a package (bed/nursing charges may be suppressed on IPD)
  type?: ProcedureType;
  // Soft delete fields
  isDeleted?: boolean;
  deletedAt?: Date;
  deletedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface HospitalProcedureDoc extends HospitalProcedure, Document {}

export interface HospitalProcedureModel extends Model<HospitalProcedureDoc> {
  createHospitalProcedure(newProcedure: HospitalProcedure): Promise<HospitalProcedure>;
  readHospitalProcedures(query: any, search: any, skip: number, limit: number): Promise<any>;
  readHospitalProcedure(procedureId: string): Promise<any>;
  updateHospitalProcedure(procedureId: string, updates: Partial<HospitalProcedure>): Promise<HospitalProcedure>;
  deleteHospitalProcedure(procedureId: string, deletedBy?: string): Promise<void>;
  restoreHospitalProcedure(procedureId: string): Promise<HospitalProcedure>;
}