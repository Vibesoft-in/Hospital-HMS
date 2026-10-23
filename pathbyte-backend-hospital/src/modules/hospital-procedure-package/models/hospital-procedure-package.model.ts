import mongoose from "mongoose";
import { APIError } from "@src/shared";
import {
  HospitalProcedurePackage,
  HospitalProcedurePackageDoc,
  HospitalProcedurePackageModel,
} from "./hospital-procedure-package.types";

const Schema = mongoose.Schema;

const packageProcedureSchema = new Schema(
  {
    procedureId: { type: String, required: true },
    procedureName: { type: String, required: true },
    price: { type: Number, required: true },
    isDialysis: { type: Boolean, default: false },
  },
  { _id: false }
);

const hospitalProcedurePackageSchema = new Schema<HospitalProcedurePackageDoc>(
  {
    packageId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String },
    procedures: { type: [packageProcedureSchema], default: [] },
    totalPrice: { type: Number, required: true, min: 0 },
    createdBy: { type: String },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    deletedBy: { type: String },
  },
  { timestamps: true }
);

hospitalProcedurePackageSchema.index({ isDeleted: 1 });
hospitalProcedurePackageSchema.index({ packageId: 1 });

hospitalProcedurePackageSchema.statics = {
  async createPackage(data: HospitalProcedurePackage): Promise<HospitalProcedurePackage> {
    const pkg = await new this(data).save();
    return pkg.toObject();
  },

  async readPackages(query: any, search: any, skip: number, limit: number) {
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

  async readPackageById(id: string) {
    const pkg = await this.findOne({ _id: id, isDeleted: { $ne: true } });
    if (!pkg) throw new APIError(404, "Package Not Found", `No procedure package with ID '${id}' found.`);
    return pkg.toObject();
  },

  async updatePackage(id: string, updates: Partial<HospitalProcedurePackage>): Promise<HospitalProcedurePackage> {
    const updated = await this.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true } },
      { $set: updates },
      { new: true }
    );
    if (!updated) throw new APIError(404, "Package Not Found", `No procedure package with ID '${id}' found.`);
    return updated.toObject();
  },

  async deletePackage(id: string, deletedBy?: string): Promise<void> {
    const updated = await this.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true } },
      { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: deletedBy || "system" } },
      { new: true }
    );
    if (!updated) throw new APIError(404, "Package Not Found", `No procedure package with ID '${id}' found.`);
  },
};

if (!hospitalProcedurePackageSchema.options.toObject) hospitalProcedurePackageSchema.options.toObject = {};
hospitalProcedurePackageSchema.options.toObject.transform = (_doc: any, ret: any) => {
  const { __v, ...clean } = ret;
  if (clean._id && typeof clean._id === "object") clean._id = clean._id.toString();
  if (clean.createdAt instanceof Date) clean.createdAt = clean.createdAt.toISOString();
  if (clean.updatedAt instanceof Date) clean.updatedAt = clean.updatedAt.toISOString();
  return clean;
};

export default mongoose.model<HospitalProcedurePackageDoc, HospitalProcedurePackageModel>(
  "HospitalProcedurePackage",
  hospitalProcedurePackageSchema
);
