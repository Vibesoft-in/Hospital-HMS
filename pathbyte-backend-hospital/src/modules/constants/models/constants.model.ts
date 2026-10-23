import mongoose from "mongoose";
import { APIError } from "@src/shared";
import { Constants, ConstantsDoc, ConstantsModel } from "./constants.types";

const Schema = mongoose.Schema;

const constantsSchema = new Schema<ConstantsDoc>(
  {
    key: { type: String, required: true, unique: true },
    value: { type: Schema.Types.Mixed, required: true },
    description: { type: String },
    category: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Indexes for better performance
constantsSchema.index({ key: 1 });
constantsSchema.index({ category: 1 });
constantsSchema.index({ isActive: 1 });

constantsSchema.statics = {
  async createConstant(newConstant: Constants): Promise<Constants> {
    // Check for duplicate key
    const duplicateKey = await this.findOne({ key: newConstant.key });
    if (duplicateKey) {
      throw new APIError(
        409,
        "Constant Already Exists",
        `Constant with key '${newConstant.key}' already exists.`
      );
    }

    const constant = await new this(newConstant).save();
    return constant.toObject();
  },

  async readConstants(query: any, search: any, skip: number, limit: number) {
    const constants = await this.find({ ...query, ...search })
      .sort({ category: 1, key: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return constants;
  },

  async readConstant(key: string) {
    const constant = await this.findOne({ key }).lean();
    
    if (!constant) {
      throw new APIError(
        404,
        "Constant Not Found",
        `Constant with key '${key}' was not found.`
      );
    }

    return constant;
  },

  async readConstantById(id: string) {
    const constant = await this.findById(id).lean();
    
    if (!constant) {
      throw new APIError(
        404,
        "Constant Not Found",
        `Constant with ID '${id}' was not found.`
      );
    }

    return constant;
  },

  async updateConstant(key: string, updates: Partial<Constants>): Promise<Constants> {
    // Don't allow updating the key itself
    if (updates.key && updates.key !== key) {
      throw new APIError(
        400,
        "Bad Request",
        "Cannot change the key of an existing constant. Create a new constant instead."
      );
    }

    const updatedConstant = await this.findOneAndUpdate(
      { key },
      { $set: updates },
      { new: true }
    );

    if (!updatedConstant) {
      throw new APIError(
        404,
        "Constant Not Found",
        `Constant with key '${key}' was not found.`
      );
    }

    return updatedConstant.toObject();
  },

  async updateConstantById(id: string, updates: Partial<Constants>): Promise<Constants> {
    // Don't allow updating the key if it would create a duplicate
    if (updates.key) {
      const existing = await this.findOne({ key: updates.key, _id: { $ne: id } });
      if (existing) {
        throw new APIError(
          409,
          "Duplicate Key",
          `Constant with key '${updates.key}' already exists.`
        );
      }
    }

    const updatedConstant = await this.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true }
    );

    if (!updatedConstant) {
      throw new APIError(
        404,
        "Constant Not Found",
        `Constant with ID '${id}' was not found.`
      );
    }

    return updatedConstant.toObject();
  },

  async deleteConstant(key: string): Promise<void> {
    const result = await this.deleteOne({ key });

    if (result.deletedCount === 0) {
      throw new APIError(
        404,
        "Constant Not Found",
        `Constant with key '${key}' was not found.`
      );
    }
  },

  async deleteConstantById(id: string): Promise<void> {
    const result = await this.findByIdAndDelete(id);

    if (!result) {
      throw new APIError(
        404,
        "Constant Not Found",
        `Constant with ID '${id}' was not found.`
      );
    }
  },

  async getConstantsByCategory(category: string) {
    const constants = await this.find({ category, isActive: true })
      .sort({ key: 1 })
      .lean();

    return constants;
  },
};

export default mongoose.model<ConstantsDoc, ConstantsModel>("Constants", constantsSchema);
