import { Document, Model } from "mongoose";

export interface Medicine {
  name: string;           // original display name as provided
  normalizedName: string; // lowercase + collapsed whitespace — used for fuzzy dedup matching
  type?: string;          // optional medicine type/category (e.g. "Tablet", "Syrup")
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MedicineDoc extends Medicine, Document {}

export interface MedicineModel extends Model<MedicineDoc> {
  searchMedicines(search: string, limit: number): Promise<MedicineDoc[]>;
  upsertMany(entries: { name: string; type?: string }[]): Promise<{ inserted: number; updated: number; skipped: number }>;
}
