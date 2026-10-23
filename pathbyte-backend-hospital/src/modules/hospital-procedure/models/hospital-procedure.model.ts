import mongoose from "mongoose";
import { APIError } from "@src/shared";
import { 
  HospitalProcedure, 
  HospitalProcedureDoc, 
  HospitalProcedureModel 
} from "./hospital-procedure.types";

const Schema = mongoose.Schema;

const hospitalProcedureSchema = new Schema<HospitalProcedureDoc>(
  {
    procedureId: { type: String, required: true, unique: true },
    procedureName: { type: String, required: true },
    department: { type: String },
    category: { type: String },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
    price: { type: Number, required: true, min: 0 },
    dayCareBilling: { type: Boolean, default: false },
    consumables: { type: Boolean, default: false },
    nursingCharges: { type: Number, min: 0, default: 0 },
    roomCharges: { type: Number, min: 0, default: 0 },
    metaData: { type: String },
    description: { type: String },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    deletedBy: { type: String },
    isDialysis: { type: Boolean, default: false },
    isXray: { type: Boolean, default: false },
    isUltrasound: { type: Boolean, default: false }, // only valid when isXray: true
    isPackage: { type: Boolean, default: false },
    type: { type: String, enum: ["daycare", "ipd", "opd", "both"], default: "both" },
  },
  { timestamps: true }
);

hospitalProcedureSchema.index({ procedureName: 1, department: 1, category: 1 });
hospitalProcedureSchema.index({ department: 1 });
hospitalProcedureSchema.index({ category: 1 });
hospitalProcedureSchema.index({ status: 1 });
hospitalProcedureSchema.index({ isDeleted: 1 });
hospitalProcedureSchema.index({ type: 1 });

hospitalProcedureSchema.statics = {
  async createHospitalProcedure(newProcedure: HospitalProcedure): Promise<HospitalProcedure> {
    const duplicateId = await this.findOne({ 
      procedureId: newProcedure.procedureId,
      isDeleted: { $ne: true }
    });
    if (duplicateId) {
      throw new APIError(409, "Procedure Already Exists", `Procedure with ID '${newProcedure.procedureId}' already exists.`);
    }

    const duplicateName = await this.findOne({ 
      procedureName: { $regex: `^${newProcedure.procedureName}$`, $options: "i" },
      department: { $regex: `^${newProcedure.department}$`, $options: "i" },
      category: { $regex: `^${newProcedure.category}$`, $options: "i" },
      isDeleted: { $ne: true }
    });
    if (duplicateName) {
      throw new APIError(409, "Procedure Already Exists", `Procedure '${newProcedure.procedureName}' already exists in department '${newProcedure.department}' and category '${newProcedure.category}'.`);
    }

    const procedure = await new this(newProcedure).save();
    return procedure.toObject();
  },

  async readHospitalProcedures(query: any, search: any, skip: number, limit: number) {
    // Build the base query with soft delete filter
    const mongoQuery: any = { 
      isDeleted: { $ne: true } // Exclude soft deleted
    };
    
    // Merge additional query filters
    if (query && Object.keys(query).length > 0) {
      Object.assign(mongoQuery, query);
    }
    
    // Handle search with $or operator properly
    if (search && Object.keys(search).length > 0) {
      if (search.$or) {
        // If search has $or, we need to combine it with existing conditions
        const searchConditions = { ...search };
        delete searchConditions.$or;
        
        // Add non-$or search conditions to mongoQuery
        Object.assign(mongoQuery, searchConditions);
        
        // Add $or condition
        mongoQuery.$or = search.$or;
      } else {
        // No $or operator, just merge normally
        Object.assign(mongoQuery, search);
      }
    }
    
    const procedures = await this.find(mongoQuery).skip(skip).limit(limit).sort({ department: 1, category: 1, procedureName: 1 }).exec();
    return procedures.map((procedure: HospitalProcedureDoc) => procedure.toObject());
  },

  async readHospitalProcedure(procedureId: string) {
    const procedure = await this.findOne({ procedureId, isDeleted: { $ne: true } });
    if (!procedure) {
      throw new APIError(404, "Procedure Not Found", `No procedure with ID '${procedureId}' found.`);
    }
    return procedure.toObject();
  },

  async updateHospitalProcedure(procedureId: string, updates: Partial<HospitalProcedure>): Promise<HospitalProcedure> {
    if (updates.procedureName || updates.department || updates.category) {
      const existing = await this.findOne({ procedureId, isDeleted: { $ne: true } });
      if (!existing) {
        throw new APIError(404, "Procedure Not Found", `No procedure with ID '${procedureId}' found.`);
      }

      const nameToCheck = updates.procedureName || existing.procedureName;
      const departmentToCheck = updates.department || existing.department;
      const categoryToCheck = updates.category || existing.category;

      const duplicateName = await this.findOne({ 
        procedureName: { $regex: `^${nameToCheck}$`, $options: "i" },
        department: { $regex: `^${departmentToCheck}$`, $options: "i" },
        category: { $regex: `^${categoryToCheck}$`, $options: "i" },
        procedureId: { $ne: procedureId },
        isDeleted: { $ne: true }
      });
      
      if (duplicateName) {
        throw new APIError(409, "Procedure Already Exists", `Procedure '${nameToCheck}' already exists in department '${departmentToCheck}' and category '${categoryToCheck}'.`);
      }
    }

    const updated = await this.findOneAndUpdate({ procedureId, isDeleted: { $ne: true } }, { $set: updates }, { new: true });
    if (!updated) {
      throw new APIError(404, "Procedure Not Found", `No procedure with ID '${procedureId}' found.`);
    }
    return updated.toObject();
  },

  async deleteHospitalProcedure(procedureId: string, deletedBy?: string): Promise<void> {
    const updated = await this.findOneAndUpdate(
      { procedureId, isDeleted: { $ne: true } },
      { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: deletedBy || 'system' } },
      { new: true }
    );
    if (!updated) {
      throw new APIError(404, "Procedure Not Found", `No procedure with ID '${procedureId}' found.`);
    }
  },

  async restoreHospitalProcedure(procedureId: string): Promise<HospitalProcedure> {
    const restored = await this.findOneAndUpdate(
      { procedureId, isDeleted: true },
      { 
        $set: { 
          isDeleted: false,
          deletedAt: null,
          deletedBy: null
        }
      },
      { new: true }
    );
    if (!restored) {
      throw new APIError(404, "Procedure Not Found", `No deleted procedure with ID '${procedureId}' found.`);
    }
    return restored.toObject();
  },
};

if (!hospitalProcedureSchema.options.toObject) hospitalProcedureSchema.options.toObject = {};
hospitalProcedureSchema.options.toObject.transform = (_doc: any, ret: any) => {
  const { __v, ...clean } = ret;
  if (clean._id && typeof clean._id === 'object') {
    clean._id = clean._id.toString();
  }
  return clean;
};

const HospitalProcedure = mongoose.model<HospitalProcedureDoc, HospitalProcedureModel>("HospitalProcedure", hospitalProcedureSchema);

export default HospitalProcedure;
