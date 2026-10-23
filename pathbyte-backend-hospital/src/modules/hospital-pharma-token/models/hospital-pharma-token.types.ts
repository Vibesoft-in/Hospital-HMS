import { Document, Model } from "mongoose";

export interface HospitalPharmaToken {
  pharmaTokenId: number;           // Daily sequential token number (1, 2, 3...)
  patientId: string;               // MongoDB _id of the hospital patient
  date: string;                    // YYYY-MM-DD — scopes the daily counter
  status: "Created" | "InProgress" | "PayNow" | "Completed" | "Cancelled";
  isDeleted?: boolean;
  deletedAt?: Date;
  deletedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface HospitalPharmaTokenDoc extends HospitalPharmaToken, Document {}

export interface HospitalPharmaTokenModel extends Model<HospitalPharmaTokenDoc> {
  createHospitalPharmaToken(newToken: Omit<HospitalPharmaToken, "pharmaTokenId">): Promise<HospitalPharmaToken>;
  readHospitalPharmaTokens(query: any, search: any, skip: number, limit: number): Promise<{ tokens: any[]; totalCount: number }>;
  readHospitalPharmaToken(id: string): Promise<any>;
  readHospitalPharmaTokenQueue(date: string): Promise<any[]>;
  updateHospitalPharmaToken(id: string, updates: Partial<HospitalPharmaToken>): Promise<HospitalPharmaToken>;
  deleteHospitalPharmaToken(id: string, deletedBy?: string): Promise<void>;
}
