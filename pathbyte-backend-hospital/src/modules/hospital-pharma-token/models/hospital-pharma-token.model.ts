import mongoose from "mongoose";
import { APIError } from "@src/shared";
import {
  HospitalPharmaToken,
  HospitalPharmaTokenDoc,
  HospitalPharmaTokenModel,
} from "./hospital-pharma-token.types";

const Schema = mongoose.Schema;

const hospitalPharmaTokenSchema = new Schema<HospitalPharmaTokenDoc>(
  {
    pharmaTokenId: { type: Number, required: true },
    patientId:     { type: String, required: true, index: true },
    date:          { type: String, required: true, index: true }, // YYYY-MM-DD
    status: {
      type: String,
      enum: ["Created", "InProgress", "PayNow", "Completed", "Cancelled"],
      default: "Created",
    },
    isDeleted:  { type: Boolean, default: false },
    deletedAt:  { type: Date },
    deletedBy:  { type: String },
  },
  { timestamps: true }
);

// Unique token number per day
hospitalPharmaTokenSchema.index({ pharmaTokenId: 1, date: 1 }, { unique: true });
hospitalPharmaTokenSchema.index({ status: 1 });
hospitalPharmaTokenSchema.index({ createdAt: -1 });

// ─── patient lookup pipeline ──────────────────────────────────────────────────
function buildPatientLookupStages(): any[] {
  return [
    {
      $addFields: {
        _patientObjId: {
          $cond: {
            if: { $regexMatch: { input: { $ifNull: ["$patientId", ""] }, regex: /^[0-9a-fA-F]{24}$/ } },
            then: { $toObjectId: "$patientId" },
            else: null,
          },
        },
      },
    },
    {
      $lookup: {
        from: "hospitalpatients",
        localField: "_patientObjId",
        foreignField: "_id",
        as: "_patient",
        pipeline: [{ $project: { name: 1, mrd: 1, patientUhid: 1, phone: 1, gender: 1, age: 1, title: 1 } }],
      },
    },
    { $unwind: { path: "$_patient", preserveNullAndEmptyArrays: true } },
    {
      $addFields: {
        patient: { $ifNull: ["$_patient", null] },
      },
    },
    {
      $project: {
        _patientObjId: 0,
        _patient: 0,
        __v: 0,
      },
    },
  ];
}

hospitalPharmaTokenSchema.statics = {
  async createHospitalPharmaToken(
    newToken: Omit<HospitalPharmaToken, "pharmaTokenId">
  ): Promise<HospitalPharmaToken> {
    // Atomic daily sequence — find max for this date regardless of soft deletes
    const last = await this.findOne({ date: newToken.date })
      .sort({ pharmaTokenId: -1 })
      .select("pharmaTokenId")
      .lean();
    const nextId = last ? (last as any).pharmaTokenId + 1 : 1;

    const token = await new this({ ...newToken, pharmaTokenId: nextId }).save();
    return token.toObject();
  },

  async readHospitalPharmaTokens(query: any, search: any, skip: number, limit: number) {
    const matchStage = { ...query, ...search, isDeleted: { $ne: true } };
    const pipeline: any[] = [
      { $match: matchStage },
      ...buildPatientLookupStages(),
      { $sort: { date: -1, pharmaTokenId: 1 } },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limit }],
          totalCount: [{ $count: "count" }],
        },
      },
    ];
    const result = await this.aggregate(pipeline);
    return {
      tokens: result[0]?.data || [],
      totalCount: result[0]?.totalCount?.[0]?.count || 0,
    };
  },

  async readHospitalPharmaToken(id: string, filter: any = {}) {
    const pipeline: any[] = [
      { $match: { _id: new mongoose.Types.ObjectId(id), isDeleted: { $ne: true }, ...(filter || {}) } },
      ...buildPatientLookupStages(),
    ];
    const results = await this.aggregate(pipeline);
    if (!results[0]) {
      throw new APIError(404, "Not Found", `Pharma token '${id}' not found.`);
    }
    return results[0];
  },

  async readHospitalPharmaTokenQueue(date: string) {
    const pipeline: any[] = [
      { $match: { date, isDeleted: { $ne: true } } },
      ...buildPatientLookupStages(),
      { $sort: { pharmaTokenId: 1 } },
    ];
    return this.aggregate(pipeline);
  },

  async updateHospitalPharmaToken(id: string, updates: Partial<HospitalPharmaToken>, filter: any = {}): Promise<HospitalPharmaToken> {
    const updated = await this.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(id), isDeleted: { $ne: true }, ...(filter || {}) },
      { $set: updates },
      { new: true }
    );
    if (!updated) {
      throw new APIError(404, "Not Found", `Pharma token '${id}' not found.`);
    }
    return updated.toObject();
  },

  async deleteHospitalPharmaToken(id: string, deletedBy?: string, filter: any = {}): Promise<void> {
    const updated = await this.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(id), isDeleted: { $ne: true }, ...(filter || {}) },
      { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: deletedBy || "system" } },
      { new: true }
    );
    if (!updated) {
      throw new APIError(404, "Not Found", `Pharma token '${id}' not found.`);
    }
  },
};

hospitalPharmaTokenSchema.options.toObject = {
  transform: (_doc: any, ret: any) => {
    const { __v, ...clean } = ret;
    if (clean._id && typeof clean._id === "object") clean._id = clean._id.toString();
    return clean;
  },
};

const HospitalPharmaTokenModel = mongoose.model<HospitalPharmaTokenDoc, HospitalPharmaTokenModel>(
  "HospitalPharmaToken",
  hospitalPharmaTokenSchema
);

export default HospitalPharmaTokenModel;
