import { Document, Model } from "mongoose";

export interface PackageProcedure {
  procedureId: string;
  procedureName: string;
  price: number;
  isDialysis: boolean;
}

export interface HospitalProcedurePackage {
  packageId: string;
  name: string;
  description?: string;
  procedures: PackageProcedure[];
  totalPrice: number;
  createdBy?: string;
  isDeleted?: boolean;
  deletedAt?: Date;
  deletedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface HospitalProcedurePackageDoc extends HospitalProcedurePackage, Document {}

export interface HospitalProcedurePackageModel extends Model<HospitalProcedurePackageDoc> {
  createPackage(data: HospitalProcedurePackage): Promise<HospitalProcedurePackage>;
  readPackages(query: any, search: any, skip: number, limit: number): Promise<{ data: any[]; totalCount: number }>;
  readPackageById(id: string): Promise<any>;
  updatePackage(id: string, updates: Partial<HospitalProcedurePackage>): Promise<HospitalProcedurePackage>;
  deletePackage(id: string, deletedBy?: string): Promise<void>;
}
