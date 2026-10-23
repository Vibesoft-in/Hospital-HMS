import { Document, Model } from "mongoose";

export interface BedPatientDetails {
  name?: string;
  mrd?: string;
  ipdId?: string;
  contact?: string;
  admittedAt?: Date;
}

export interface HospitalBed {
  bedId: string;
  bedNumber: string;
  wardId: string; // reference to HospitalWard _id as string
  chargePerDay?: number; // optional bed-level override; falls back to ward.chargePerDay when not set
  status: "Available" | "Occupied" | "Reserved" | "Maintenance";
  currentPatientDetails?: BedPatientDetails;
  createdBy?: string;
  isDeleted?: boolean;
  deletedAt?: Date;
  deletedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface HospitalBedDoc extends HospitalBed, Document {}

export interface HospitalBedModel extends Model<HospitalBedDoc> {
  createHospitalBed(data: HospitalBed): Promise<HospitalBed>;
  readHospitalBeds(query: any, search: any, skip: number, limit: number): Promise<{ data: any[]; totalCount: number }>;
  readHospitalBedById(id: string): Promise<any>;
  updateHospitalBed(id: string, updates: Partial<HospitalBed>): Promise<HospitalBed>;
  deleteHospitalBed(id: string, deletedBy?: string): Promise<void>;
}
