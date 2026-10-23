import mongoose from "mongoose";
import { APIError } from "@src/shared";
import { HospitalBed, HospitalBedDoc, HospitalBedModel } from "./hospital-bed.types";

const Schema = mongoose.Schema;

const bedPatientDetailsSchema = new Schema(
  {
    name: { type: String },
    mrd: { type: String },
    ipdId: { type: String },
    contact: { type: String },
    admittedAt: { type: Date },
  },
  { _id: false }
);

const hospitalBedSchema = new Schema<HospitalBedDoc>(
  {
    bedId: { type: String, required: true, unique: true },
    bedNumber: { type: String, required: true },
    wardId: { type: String, required: true },
    chargePerDay: { type: Number, default: null }, // bed-level rate; overrides ward.chargePerDay when set
    status: {
      type: String,
      enum: ["Available", "Occupied", "Reserved", "Maintenance"],
      default: "Available",
    },
    currentPatientDetails: { type: bedPatientDetailsSchema, default: null },
    createdBy: { type: String },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    deletedBy: { type: String },
  },
  { timestamps: true }
);

hospitalBedSchema.index({ isDeleted: 1 });
hospitalBedSchema.index({ wardId: 1, status: 1 });
hospitalBedSchema.index({ bedId: 1 });

function buildBedPipeline(matchStage: any): any[] {
  return [
    { $match: matchStage },
    {
      $addFields: {
        wardObjectId: {
          $cond: {
            if: { $regexMatch: { input: { $ifNull: ["$wardId", ""] }, regex: /^[0-9a-fA-F]{24}$/ } },
            then: { $toObjectId: "$wardId" },
            else: null,
          },
        },
      },
    },
    {
      $lookup: {
        from: "hospitalwards",
        localField: "wardObjectId",
        foreignField: "_id",
        as: "ward",
        pipeline: [
          { $match: { isDeleted: { $ne: true } } },
          { $project: { wardId: 1, name: 1, chargePerDay: 1 } },
        ],
      },
    },
    { $unwind: { path: "$ward", preserveNullAndEmptyArrays: true } },
  ];
}

hospitalBedSchema.statics = {
  async createHospitalBed(data: HospitalBed): Promise<HospitalBed> {
    const bed = await new this(data).save();
    return bed.toObject();
  },

  async readHospitalBeds(query: any, search: any, skip: number, limit: number) {
    const matchQuery: any = { isDeleted: { $ne: true }, ...query };
    if (search?.bedNumber) {
      matchQuery.$or = [
        { bedNumber: { $regex: search.bedNumber, $options: "i" } },
        { bedId: { $regex: search.bedNumber, $options: "i" } },
      ];
    }

    const pipeline: any[] = [
      ...buildBedPipeline(matchQuery),
      {
        $facet: {
          data: [
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit },
            {
              $addFields: {
                _id: { $toString: "$_id" },
                "ward._id": { $toString: "$ward._id" },
                createdAt: { $dateToString: { format: "%Y-%m-%dT%H:%M:%S.%LZ", date: "$createdAt" } },
                updatedAt: { $dateToString: { format: "%Y-%m-%dT%H:%M:%S.%LZ", date: "$updatedAt" } },
              },
            },
            { $project: { __v: 0, wardObjectId: 0, "ward.__v": 0 } },
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

  async readHospitalBedById(id: string) {
    const pipeline: any[] = [
      ...buildBedPipeline({ _id: new mongoose.Types.ObjectId(id), isDeleted: { $ne: true } }),
      { $project: { __v: 0, wardObjectId: 0, "ward.__v": 0 } },
    ];
    const results = await this.aggregate(pipeline);
    const bed = results[0];
    if (!bed) throw new APIError(404, "Bed Not Found", `No bed with ID '${id}' found.`);
    if (bed._id && typeof bed._id === "object") bed._id = bed._id.toString();
    if (bed.ward?._id && typeof bed.ward._id === "object") bed.ward._id = bed.ward._id.toString();
    if (bed.createdAt instanceof Date) bed.createdAt = bed.createdAt.toISOString();
    if (bed.updatedAt instanceof Date) bed.updatedAt = bed.updatedAt.toISOString();
    return bed;
  },

  async updateHospitalBed(id: string, updates: Partial<HospitalBed>): Promise<HospitalBed> {
    const updated = await this.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true } },
      { $set: updates },
      { new: true }
    );
    if (!updated) throw new APIError(404, "Bed Not Found", `No bed with ID '${id}' found.`);
    return updated.toObject();
  },

  async deleteHospitalBed(id: string, deletedBy?: string): Promise<void> {
    const bed = await this.findOne({ _id: id, isDeleted: { $ne: true } });
    if (!bed) throw new APIError(404, "Bed Not Found", `No bed with ID '${id}' found.`);
    if (bed.status === "Occupied") {
      throw new APIError(400, "Bed Occupied", "Cannot delete a bed that is currently occupied.");
    }
    await this.findOneAndUpdate(
      { _id: id },
      { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: deletedBy || "system" } }
    );
  },
};

if (!hospitalBedSchema.options.toObject) hospitalBedSchema.options.toObject = {};
hospitalBedSchema.options.toObject.transform = (_doc: any, ret: any) => {
  const { __v, ...clean } = ret;
  if (clean._id && typeof clean._id === "object") clean._id = clean._id.toString();
  if (clean.createdAt instanceof Date) clean.createdAt = clean.createdAt.toISOString();
  if (clean.updatedAt instanceof Date) clean.updatedAt = clean.updatedAt.toISOString();
  return clean;
};

export default mongoose.model<HospitalBedDoc, HospitalBedModel>("HospitalBed", hospitalBedSchema);
