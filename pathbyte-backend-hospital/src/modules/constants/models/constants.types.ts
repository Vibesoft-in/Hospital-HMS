import { Document, Model } from "mongoose";

export interface Constants {
  key: string; // Unique identifier for the constant (e.g., "MR_VISITS_PER_DAY")
  value: any; // Can be number, string, array, object, boolean
  description?: string; // Human-readable description
  category?: string; // Category for grouping (e.g., "MR_SETTINGS", "VISIT_SETTINGS")
  isActive?: boolean; // Whether this constant is currently active
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ConstantsDoc extends Constants, Document {}

export interface ConstantsModel extends Model<ConstantsDoc> {
  createConstant(newConstant: Constants): Promise<Constants>;
  readConstants(query: any, search: any, skip: number, limit: number): Promise<any>;
  readConstant(key: string): Promise<any>;
  readConstantById(id: string): Promise<any>;
  updateConstant(key: string, updates: Partial<Constants>): Promise<Constants>;
  updateConstantById(id: string, updates: Partial<Constants>): Promise<Constants>;
  deleteConstant(key: string): Promise<void>;
  deleteConstantById(id: string): Promise<void>;
  getConstantsByCategory(category: string): Promise<any[]>;
}
