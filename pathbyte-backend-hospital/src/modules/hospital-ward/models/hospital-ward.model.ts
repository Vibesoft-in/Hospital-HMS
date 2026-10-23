import mongoose from "mongoose";
import { APIError } from "@src/shared";
import { HospitalWard, HospitalWardDoc, HospitalWardModel } from "./hospital-ward.types";

const Schema = mongoose.Schema;

const hospitalWardSchema = new Schema<HospitalWardDoc>(
  {
    wardId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    chargePerDay: { type: Number, required: true, min: 0 },
    nursingChargePerDay: { type: Number, min: 0, default: null },
    imageUrl: { type: String },
    description: { type: String },
    metadata: { type: Schema.Types.Mixed },
    createdBy: { type: String },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    deletedBy: { type: String },
  },
  { timestamps: true }
);

hospitalWardSchema.index({ isDeleted: 1 });
hospitalWardSchema.index({ wardId: 1 });

hospitalWardSchema.statics = {
  async createHospitalWard(data: HospitalWard): Promise<HospitalWard> {
    const ward = await new this(data).save();
    return ward.toObject();
  },

  async readHospitalWards(query: any, search: any, skip: number, limit: number) {
    const matchQuery: any = { isDeleted: { $ne: true }, ...query };
    if (search?.name) {
      matchQuery.name = { $regex: search.name, $options: "i" };
    }

    const pipeline: any[] = [
      { $match: matchQuery },
      {
        $facet: {
          data: [
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit },
            {
              $addFields: {
                _id: { $toString: "$_id" },
                createdAt: { $dateToString: { format: "%Y-%m-%dT%H:%M:%S.%LZ", date: "$createdAt" } },
                updatedAt: { $dateToString: { format: "%Y-%m-%dT%H:%M:%S.%LZ", date: "$updatedAt" } },
              },
            },
            { $project: { __v: 0 } },
          ],
          totalCount: [{ $count: "count" }],
        },
      },
    ];

    const result = await this.aggregate(pipeline);
    return {
      data: result[0]?.data || [],
      totalCount: result[0]?.totalCount[0]?.count || 0,
    };
  },

  async readHospitalWardById(id: string) {
    const ward = await this.findOne({ _id: id, isDeleted: { $ne: true } });
    if (!ward) {
      throw new APIError(404, "Ward Not Found", `No ward with ID '${id}' found.`);
    }
    return ward.toObject();
  },

  async updateHospitalWard(id: string, updates: Partial<HospitalWard>): Promise<HospitalWard> {
    const updated = await this.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true } },
      { $set: updates },
      { new: true }
    );
    if (!updated) {
      throw new APIError(404, "Ward Not Found", `No ward with ID '${id}' found.`);
    }
    return updated.toObject();
  },

  async deleteHospitalWard(id: string, deletedBy?: string): Promise<void> {
    const updated = await this.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true } },
      { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: deletedBy || "system" } },
      { new: true }
    );
    if (!updated) {
      throw new APIError(404, "Ward Not Found", `No ward with ID '${id}' found.`);
    }
  },
};

if (!hospitalWardSchema.options.toObject) hospitalWardSchema.options.toObject = {};
hospitalWardSchema.options.toObject.transform = (_doc: any, ret: any) => {
  const { __v, ...clean } = ret;
  if (clean._id && typeof clean._id === "object") clean._id = clean._id.toString();
  if (clean.createdAt instanceof Date) clean.createdAt = clean.createdAt.toISOString();
  if (clean.updatedAt instanceof Date) clean.updatedAt = clean.updatedAt.toISOString();
  return clean;
};

export default mongoose.model<HospitalWardDoc, HospitalWardModel>("HospitalWard", hospitalWardSchema);
