import mongoose, { Types } from "mongoose";
import { APIError } from "@src/shared";
import { HospitalUserDoc, HospitalUserModel, HospitalUser } from "./hospital-user.types";

const Schema = mongoose.Schema;

const hospitalUserSchema = new Schema<HospitalUserDoc>(
  {
    userId: { type: String, required: true, unique: true },
    username: { type: String, unique: true, sparse: true }, // Optional, auto-generated if not provided
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /.+\@.+\..+/,
    },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true }, // Changed from fullName to name
    phoneNumber: { type: String },
    role: { 
      type: String, 
      enum: ["ADMIN", "RECEPTIONIST", "RECEPTIONIST2", "DOCTOR", "DIALYSIS", "PHARMACIST", "ACCOUNTANT", "XRAY"], 
      required: true 
    },
    linkedDoctorId: { type: String, default: null }, // _id of HospitalDoctor for DOCTOR role
    isActive: { type: Boolean, default: true },
    deleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

hospitalUserSchema.statics = {
  async readByEmail(email: string) {
    return await this.findOne({ 
      email, 
      deleted: { $ne: true } 
    }).lean();
  },

  async readByUserId(userId: string) {
    const user = await this.findOne({ 
      userId, 
      deleted: { $ne: true } 
    }).select("-passwordHash").lean();
    
    return user;
  },

  async readUser(id: string) {
    const user = await this.findOne({ 
      _id: new Types.ObjectId(id), 
      deleted: { $ne: true } 
    }).select("-passwordHash").lean();
    
    return user;
  },

  async createUser(
    user: Omit<HospitalUser, "userId"> & { userId: string }
  ): Promise<HospitalUser> {
    const duplicate = await this.findOne({
      email: user.email,
      deleted: { $ne: true },
    });
    
    if (duplicate) {
      throw new APIError(
        409,
        "User Already Exists",
        `Email '${user.email}' is already registered in hospital system.`
      );
    }
    
    const doc = await new this(user).save();
    return doc.toObject();
  },

  async readUsers(
    filter: any,
    search: any,
    skip: number,
    limit: number
  ): Promise<any[]> {
    return await this.aggregate([
      { $match: filter },
      ...(search?.$or ? [{ $match: search }] : []),
      {
        $facet: {
          data: [
            { $skip: skip },
            { $limit: limit },
            { $sort: { createdAt: -1 } },
            { $project: { passwordHash: 0 } },
          ],
          totalCount: [{ $count: "count" }],
        },
      },
    ]);
  },

  async updateUser(
    id: string,
    updates: Partial<HospitalUser>
  ): Promise<HospitalUser | null> {
    return await this.findOneAndUpdate(
      { _id: new Types.ObjectId(id), deleted: { $ne: true } },
      { $set: updates },
      { new: true }
    ).select("-passwordHash").lean();
  },

  async softDeleteUser(id: string): Promise<void> {
    const deleted = await this.findOneAndUpdate(
      { _id: new Types.ObjectId(id), deleted: { $ne: true } },
      { $set: { deleted: true, deletedAt: new Date() } },
      { new: true }
    );

    if (!deleted) {
      throw new APIError(
        404,
        "User Not Found",
        `Hospital user '${id}' not found or already deleted.`
      );
    }
  },
};

if (!hospitalUserSchema.options.toObject) hospitalUserSchema.options.toObject = {};
hospitalUserSchema.options.toObject.transform = (_doc, ret) => {
  const { __v, passwordHash, ...clean } = ret as Record<string, unknown>;
  return clean;
};

export default mongoose.model<HospitalUserDoc, HospitalUserModel>(
  "HospitalUser", 
  hospitalUserSchema
);



