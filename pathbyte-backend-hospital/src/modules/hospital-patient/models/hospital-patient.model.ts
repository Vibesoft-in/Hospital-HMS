import mongoose from "mongoose";
import { APIError } from "@src/shared";
import { isPagiaSystem } from "@src/libs/utils/systemConfig";
import { 
  HospitalPatient, 
  HospitalPatientDoc, 
  HospitalPatientModel 
} from "./hospital-patient.types";

const Schema = mongoose.Schema;

const emergencyContactSchema = new Schema({
  name: { type: String, required: true },
  number: { type: String, required: true }
}, { _id: false });

const hospitalPatientSchema = new Schema<HospitalPatientDoc>(
  {
    mrd: { type: String, unique: true }, // Auto-generated, not required in input
    patientUhid: { type: String }, // Patient UHID - Used in Pagia system
    title: { 
      type: String, 
      enum: ["Mr.", "Mrs.", "Ms.", "Dr.", "Master", "Baby of", "Baby"],
      required: function() { return !isPagiaSystem(); } // Required only for pathlab
    },
    name: { type: String, required: function() { return !isPagiaSystem(); } },
    phone: { type: String, required: function() { return !isPagiaSystem(); } },
    email: { type: String, match: /.+\@.+\..+/ },
    dob: { type: Date }, // Date of Birth
    age: { type: Number, min: 0 },
    months: { type: Number, min: 0, max: 11 },
    days: { type: Number, min: 0, max: 31 },
    gender: { 
      type: String, 
      enum: ["Male", "Female", "Other"], 
      required: function() { return !isPagiaSystem(); }
    },
    bloodGroup: { 
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Not Known"]
    },
    address: { type: String },
    aadharNo: { type: String },
    aadharS3Url: { type: String },
    ayushmanCardNo: { type: String },
    ayushmanCardS3Url: { type: String },
    abhaNumber: { type: String, default: null },   // ABHA 14-digit number
    abhaAddress: { type: String, default: null },  // ABHA address
    allAbhaAddresses: { type: [String], default: [] }, // Array of all linked/synced ABHA addresses (unique)
    imageS3Url: { type: String },
    companyName: { type: String },
    division: { type: String },
    maritalStatus: {
      type: String,
      enum: ["Single", "Married", "Divorced", "Widowed", "Separated", "Other"],
    },
    occupation: { type: String },
    drugSensitivity: { type: String },
    otherDocsS3Urls: { type: [String], default: [] },
    emergencyContacts: { type: [emergencyContactSchema], default: [] },
    // Soft delete fields
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    deletedBy: { type: String }, // User ID who deleted the record
    pathlabPatientId: { type: String }, // Cross-reference to Pathlab Patient._id
    abhaPatientId: { type: String, default: null }, // Cross-reference to AbhaPatient._id
    abhaLinked: { type: Boolean, default: false },  // True once ABHA is linked
    isMRPatient: { type: Boolean, default: false }, // Set to true when an MR visit is created for this patient
    createdBy: { type: String }, // Hospital user _id who created this patient
  },
  { timestamps: true }
);

// Auto-sync abhaAddress into allAbhaAddresses array on save
hospitalPatientSchema.pre("save", function (this: HospitalPatientDoc, next: () => void) {
  if (this.abhaAddress && typeof this.abhaAddress === "string" && this.abhaAddress.trim()) {
    const addr = this.abhaAddress.trim();
    if (!Array.isArray(this.allAbhaAddresses)) {
      this.allAbhaAddresses = [];
    }
    if (!this.allAbhaAddresses.includes(addr)) {
      this.allAbhaAddresses.push(addr);
    }
  }
  next();
});

// Auto-sync abhaAddress into allAbhaAddresses array on query updates
function syncHospitalAbhaAddressOnQueryUpdate(this: any, next: () => void) {
  const update: any = this.getUpdate();
  const abhaAddress = update?.$set?.abhaAddress || update?.abhaAddress;
  if (abhaAddress && typeof abhaAddress === "string" && abhaAddress.trim()) {
    const addr = abhaAddress.trim();
    if (update.$set) {
      if (!update.$addToSet) update.$addToSet = {};
      update.$addToSet.allAbhaAddresses = addr;
    } else if (typeof update === "object") {
      if (!update.$addToSet) update.$addToSet = {};
      update.$addToSet.allAbhaAddresses = addr;
    }
  }
  next();
}

hospitalPatientSchema.pre("updateOne", syncHospitalAbhaAddressOnQueryUpdate);
hospitalPatientSchema.pre("findOneAndUpdate", syncHospitalAbhaAddressOnQueryUpdate);

// Composite unique index - Only for pathlab system
// For Pagia system, this will be conditionally applied
if (!isPagiaSystem()) {
  hospitalPatientSchema.index(
    { phone: 1, title: 1, name: 1 }, 
    { unique: true }
  );
}

// Index for soft delete queries
hospitalPatientSchema.index({ isDeleted: 1 });

// Index for patientUhid if in Pagia system
if (isPagiaSystem()) {
  hospitalPatientSchema.index({ patientUhid: 1 }, { sparse: true });
}

hospitalPatientSchema.statics = {
  async createHospitalPatient(newPatient: HospitalPatient): Promise<HospitalPatient> {
    // MRD should be provided by the service layer (auto-generated)
    if (!newPatient.mrd) {
      throw new APIError(
        400,
        "MRD Required",
        "MRD must be generated by the service layer."
      );
    }

    // Check for duplicate MRD (exclude soft deleted)
    const duplicateMrd = await this.findOne({ 
      mrd: newPatient.mrd,
      isDeleted: { $ne: true }
    });
    if (duplicateMrd) {
      throw new APIError(
        409,
        "Patient Already Exists",
        `Patient with MRD '${newPatient.mrd}' already exists.`
      );
    }

    // Check for duplicate based on composite unique constraint (exclude soft deleted)
    // For Pathlab system only - Pagia system skips this check
    if (!isPagiaSystem() && newPatient.phone && newPatient.title && newPatient.name) {
      const duplicate = await this.findOne({
        phone: newPatient.phone,
        title: newPatient.title,
        name: { $regex: `^${newPatient.name}$`, $options: "i" },
        isDeleted: { $ne: true }
      });
      
      if (duplicate) {
        throw new APIError(
          409,
          "Patient Already Exists",
          `Patient '${newPatient.title} ${newPatient.name}' with phone '${newPatient.phone}' already exists.`
        );
      }
    }

    const patient = await new this(newPatient).save();
    return patient.toObject();
  },

  async readHospitalPatients(query: any, search: any, skip: number, limit: number) {
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

    const patients = await this.find(mongoQuery)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .exec();

    return patients.map((patient: HospitalPatientDoc) => patient.toObject());
  },

  async readHospitalPatient(mrd: string) {
    const patient = await this.findOne({ 
      mrd,
      isDeleted: { $ne: true } // Exclude soft deleted
    });
    
    if (!patient) {
      throw new APIError(
        404,
        "Patient Not Found",
        `No patient with MRD '${mrd}' found.`
      );
    }
    
    return patient.toObject();
  },

  async updateHospitalPatient(mrd: string, updates: Partial<HospitalPatient>): Promise<HospitalPatient> {
    const updated = await this.findOneAndUpdate(
      { mrd, isDeleted: { $ne: true } }, // Exclude soft deleted
      { $set: updates },
      { new: true }
    );
    
    if (!updated) {
      throw new APIError(
        404,
        "Patient Not Found",
        `No patient with MRD '${mrd}' found.`
      );
    }
    
    return updated.toObject();
  },

  async deleteHospitalPatient(mrd: string, deletedBy?: string): Promise<void> {
    const updated = await this.findOneAndUpdate(
      { mrd, isDeleted: { $ne: true } },
      { 
        $set: { 
          isDeleted: true, 
          deletedAt: new Date(),
          deletedBy: deletedBy || 'system'
        } 
      },
      { new: true }
    );
    
    if (!updated) {
      throw new APIError(
        404,
        "Patient Not Found",
        `No patient with MRD '${mrd}' found.`
      );
    }
  },

  // New method to permanently delete (for admin use)
  async permanentlyDeleteHospitalPatient(mrd: string): Promise<void> {
    const deleted = await this.findOneAndDelete({ mrd });
    
    if (!deleted) {
      throw new APIError(
        404,
        "Patient Not Found",
        `No patient with MRD '${mrd}' found.`
      );
    }
  },

  // New method to restore soft deleted patient
  async restoreHospitalPatient(mrd: string): Promise<HospitalPatient> {
    const restored = await this.findOneAndUpdate(
      { mrd, isDeleted: true },
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
      throw new APIError(
        404,
        "Patient Not Found",
        `No deleted patient with MRD '${mrd}' found.`
      );
    }
    
    return restored.toObject();
  },
};

// Transform with .toObject to remove __v and properly serialize _id
if (!hospitalPatientSchema.options.toObject) hospitalPatientSchema.options.toObject = {};
hospitalPatientSchema.options.toObject.transform = (_doc: any, ret: any) => {
  const { __v, ...clean } = ret;
  // Ensure _id is properly serialized as string
  if (clean._id && typeof clean._id === 'object') {
    clean._id = clean._id.toString();
  }
  // Ensure DOB is properly serialized as ISO string
  if (clean.dob && clean.dob instanceof Date) {
    clean.dob = clean.dob.toISOString().split('T')[0]; // Return as YYYY-MM-DD format
  }
  // Ensure createdAt is properly serialized as ISO string
  if (clean.createdAt && clean.createdAt instanceof Date) {
    clean.createdAt = clean.createdAt.toISOString();
  }
  // Ensure updatedAt is properly serialized as ISO string
  if (clean.updatedAt && clean.updatedAt instanceof Date) {
    clean.updatedAt = clean.updatedAt.toISOString();
  }
  return clean;
};

const HospitalPatient = mongoose.model<HospitalPatientDoc, HospitalPatientModel>(
  "HospitalPatient",
  hospitalPatientSchema
);

export default HospitalPatient;
