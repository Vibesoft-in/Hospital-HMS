import mongoose from "mongoose";
import { APIError } from "@src/shared";
import { 
  HospitalDoctor, 
  HospitalDoctorDoc, 
  HospitalDoctorModel 
} from "./hospital-doctor.types";

const Schema = mongoose.Schema;

const visitTypeSchema = new Schema({
  visitType: { 
    type: String, 
    enum: ["New", "Emergency", "Follow-up", "Follow-up-report", "MR"],
    required: true 
  },
  appointmentType: { 
    type: String, 
    enum: ["OPD", "Day Care", "IPD", "ICU", "Emergency"],
    required: true 
  },
  charge: { type: Number, required: true, min: 0 }
}, { _id: false });

const scheduleSlotSchema = new Schema({
  session: { 
    type: String, 
    enum: ["Morning", "Noon", "Afternoon", "Evening", "Night"],
    required: true 
  },
  startTime: { type: String, required: true }, // HH:MM format
  endTime: { type: String, required: true }    // HH:MM format
}, { _id: false });

const weeklyScheduleSchema = new Schema({
  dayOfWeek: { 
    type: String, 
    enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    required: true 
  },
  mr: { type: Boolean, default: false }, // Whether MR visits are allowed on this day
  slots: { type: [scheduleSlotSchema], default: [] }
}, { _id: false });

const dialysisSlotSchema = new Schema({
  name: { type: String, required: true },
  startTime: { type: String, required: true }, // HH:MM format
  endTime: { type: String, required: true },   // HH:MM format
  maxAppointments: { type: Number, required: true, min: 1 },
  isActive: { type: Boolean, default: true }
});

const hospitalDoctorSchema = new Schema<HospitalDoctorDoc>(
  {
    doctorId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    imageUrl: { type: String },
    email: { type: String, match: /.+\@.+\..+/ },
    phone: { type: String },
    dob: { type: Date },
    yearsOfExperience: { type: Number, min: 0 },
    department: { type: String, required: true },
    designation: { type: String },
    medicalLicenseNo: { type: String },
    gender: { 
      type: String, 
      enum: ["Male", "Female", "Other"] 
    },
    bloodGroup: { 
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Not Known"]
    },
    address: { type: String },
    opdNumber: { type: String },
    posterUrl: { type: String },
    visitTypes: { type: [visitTypeSchema], default: [] },
    sessions: { type: [String], default: [] }, // Kept for backward compatibility
    weeklySchedule: { type: [weeklyScheduleSchema], default: [] }, // New schedule system
    dialysisSlots: { type: [dialysisSlotSchema], default: [] },
    maxAppointmentsPerSlot: { type: Number, min: 1, default: 1 },
    // MR-specific settings
    mrMaxVisitsPerDay: { type: Number, min: 0 }, // Maximum MR visits allowed per day for this doctor
    // TV queue sort preference
    queueSortBy: { 
      type: String, 
      enum: ["token", "time"], 
      default: "token" 
    },
    // Soft delete fields
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    deletedBy: { type: String }, // User ID who deleted the record
  },
  { timestamps: true }
);

hospitalDoctorSchema.statics = {
  async createHospitalDoctor(newDoctor: HospitalDoctor): Promise<HospitalDoctor> {
    // Check for duplicate doctorId (exclude soft deleted)
    const duplicateId = await this.findOne({ 
      doctorId: newDoctor.doctorId,
      isDeleted: { $ne: true }
    });
    if (duplicateId) {
      throw new APIError(
        409,
        "Doctor Already Exists",
        `Doctor with ID '${newDoctor.doctorId}' already exists.`
      );
    }

    // Check for duplicate email if provided (exclude soft deleted)
    if (newDoctor.email) {
      const duplicateEmail = await this.findOne({ 
        email: newDoctor.email,
        isDeleted: { $ne: true }
      });
      if (duplicateEmail) {
        throw new APIError(
          409,
          "Doctor Already Exists",
          `Doctor with email '${newDoctor.email}' already exists.`
        );
      }
    }

    // Check for duplicate medical license if provided (exclude soft deleted)
    if (newDoctor.medicalLicenseNo) {
      const duplicateLicense = await this.findOne({ 
        medicalLicenseNo: newDoctor.medicalLicenseNo,
        isDeleted: { $ne: true }
      });
      if (duplicateLicense) {
        throw new APIError(
          409,
          "Doctor Already Exists",
          `Doctor with medical license '${newDoctor.medicalLicenseNo}' already exists.`
        );
      }
    }

    const doctor = await new this(newDoctor).save();
    return doctor.toObject();
  },

  async readHospitalDoctors(query: any, search: any, skip: number, limit: number) {
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

    const doctors = await this.find(mongoQuery)
      .select("-__v -isDeleted -deletedAt -deletedBy")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();

    return doctors;
  },

  async readHospitalDoctor(doctorId: string) {
    const doctor = await this.findOne({ 
      doctorId,
      isDeleted: { $ne: true } // Exclude soft deleted
    })
      .select("-__v -isDeleted -deletedAt -deletedBy")
      .lean();
    
    if (!doctor) {
      throw new APIError(
        404,
        "Doctor Not Found",
        `No doctor with ID '${doctorId}' found.`
      );
    }
    
    return doctor;
  },

  async updateHospitalDoctor(doctorId: string, updates: Partial<HospitalDoctor>): Promise<HospitalDoctor> {
    // Check for duplicate email if updating email (exclude soft deleted)
    if (updates.email) {
      const duplicateEmail = await this.findOne({ 
        email: updates.email,
        doctorId: { $ne: doctorId },
        isDeleted: { $ne: true }
      });
      if (duplicateEmail) {
        throw new APIError(
          409,
          "Email Already Exists",
          `Another doctor with email '${updates.email}' already exists.`
        );
      }
    }

    // Check for duplicate medical license if updating (exclude soft deleted)
    if (updates.medicalLicenseNo) {
      const duplicateLicense = await this.findOne({ 
        medicalLicenseNo: updates.medicalLicenseNo,
        doctorId: { $ne: doctorId },
        isDeleted: { $ne: true }
      });
      if (duplicateLicense) {
        throw new APIError(
          409,
          "Medical License Already Exists",
          `Another doctor with medical license '${updates.medicalLicenseNo}' already exists.`
        );
      }
    }

    const updated = await this.findOneAndUpdate(
      { doctorId, isDeleted: { $ne: true } }, // Exclude soft deleted
      { $set: updates },
      { new: true }
    );
    
    if (!updated) {
      throw new APIError(
        404,
        "Doctor Not Found",
        `No doctor with ID '${doctorId}' found.`
      );
    }
    
    return updated.toObject();
  },

  async deleteHospitalDoctor(doctorId: string, deletedBy?: string): Promise<void> {
    const updated = await this.findOneAndUpdate(
      { doctorId, isDeleted: { $ne: true } },
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
        "Doctor Not Found",
        `No doctor with ID '${doctorId}' found.`
      );
    }
  },

  // New method to restore soft deleted doctor
  async restoreHospitalDoctor(doctorId: string): Promise<HospitalDoctor> {
    const restored = await this.findOneAndUpdate(
      { doctorId, isDeleted: true },
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
        "Doctor Not Found",
        `No deleted doctor with ID '${doctorId}' found.`
      );
    }
    
    return restored.toObject();
  },

  async updateDoctorSchedule(doctorId: string, scheduleData: { weeklySchedule: any[]; mrMaxVisitsPerDay?: number }): Promise<HospitalDoctor> {
    const doctor = await this.findOne({ doctorId, isDeleted: { $ne: true } });
    
    if (!doctor) {
      throw new APIError(
        404,
        "Doctor Not Found",
        `No doctor with ID '${doctorId}' found.`
      );
    }

    // Prepare update object
    const updateData: any = { weeklySchedule: scheduleData.weeklySchedule };
    
    // Add mrMaxVisitsPerDay if provided
    if (scheduleData.mrMaxVisitsPerDay !== undefined) {
      updateData.mrMaxVisitsPerDay = scheduleData.mrMaxVisitsPerDay;
    }

    // Update the weekly schedule and mrMaxVisitsPerDay
    const updated = await this.findOneAndUpdate(
      { doctorId, isDeleted: { $ne: true } },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updated) {
      throw new APIError(
        500,
        "Update Failed",
        "Failed to update doctor schedule."
      );
    }

    return updated.toObject();
  },
};

// Transform with .toObject to remove __v and properly serialize _id
if (!hospitalDoctorSchema.options.toObject) hospitalDoctorSchema.options.toObject = {};
hospitalDoctorSchema.options.toObject.transform = (_doc: any, ret: any) => {
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

const HospitalDoctor = mongoose.model<HospitalDoctorDoc, HospitalDoctorModel>(
  "HospitalDoctor",
  hospitalDoctorSchema
);

export default HospitalDoctor;