import { Document, Model } from "mongoose";

export interface HospitalWard {
  wardId: string;
  name: string;
  chargePerDay: number;
  nursingChargePerDay?: number;  // optional ward-level nursing charge per day
  imageUrl?: string;
  description?: string;
  metadata?: any;
  createdBy?: string;
  isDeleted?: boolean;
  deletedAt?: Date;
  deletedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface HospitalWardDoc extends HospitalWard, Document {}

export interface HospitalWardModel extends Model<HospitalWardDoc> {
  createHospitalWard(data: HospitalWard): Promise<HospitalWard>;
  readHospitalWards(query: any, search: any, skip: number, limit: number): Promise<{ data: any[]; totalCount: number }>;
  readHospitalWardById(id: string): Promise<any>;
  updateHospitalWard(id: string, updates: Partial<HospitalWard>): Promise<HospitalWard>;
  deleteHospitalWard(id: string, deletedBy?: string): Promise<void>;
}
