import mongoose from "mongoose";
import { MedicineDoc, MedicineModel } from "./medicine.types";

const Schema = mongoose.Schema;

/** Normalize a medicine name for dedup matching:
 *  lowercase, collapse all whitespace to single space, trim edges.
 *  "Paracetamol  500MG" → "paracetamol 500mg"
 */
export function normalizeMedicineName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, " ").trim();
}

const medicineSchema = new Schema<MedicineDoc>(
  {
    name:           { type: String, required: true, trim: true },        // display name
    normalizedName: { type: String, required: true, unique: true },      // dedup key
    type:           { type: String, trim: true, default: null },
  },
  { timestamps: true }
);

// Unique index on normalizedName (the dedup key)
medicineSchema.index({ normalizedName: 1 }, { unique: true });
// Search indexes
medicineSchema.index({ name: "text" });
medicineSchema.index({ name: 1 });
medicineSchema.index({ type: 1 });

medicineSchema.statics = {
  async searchMedicines(search: string, limit: number) {
    const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    return this.find({ name: regex }).sort({ name: 1 }).limit(limit).lean();
  },

  async upsertMany(entries: { name: string; type?: string }[]) {
    if (entries.length === 0) return { inserted: 0, skipped: 0 };

    const ops = entries.map(({ name, type }) => {
      const normalized = normalizeMedicineName(name);
      const update: any = {
        // Always update type if provided (handles no-type → type and type change)
        $set: { ...(type !== undefined ? { type: type.trim() || null } : {}) },
        // Only set name/normalizedName on first insert
        $setOnInsert: { name: name.trim(), normalizedName: normalized },
      };
      // If $set is empty, remove it to avoid a no-op error
      if (Object.keys(update.$set).length === 0) delete update.$set;

      return {
        updateOne: {
          filter: { normalizedName: normalized },
          update,
          upsert: true,
        },
      };
    });

    const result = await this.bulkWrite(ops, { ordered: false });
    const inserted = result.upsertedCount ?? 0;
    const updated  = result.modifiedCount ?? 0;
    const skipped  = entries.length - inserted - updated;

    return { inserted, updated, skipped };
  },
};

export default mongoose.model<MedicineDoc, MedicineModel>("Medicine", medicineSchema);
