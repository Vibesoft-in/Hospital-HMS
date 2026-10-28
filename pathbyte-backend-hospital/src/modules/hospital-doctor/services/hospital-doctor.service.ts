import mongoose from "mongoose";
import HospitalDoctorModel from "../models/hospital-doctor.model";
import { getNextSequence } from "@src/libs/counter";
import { transformS3UrlsAsync } from "@src/libs/utils/s3Upload";
import { 
  CreateHospitalDoctorDTO,
  UpdateHospitalDoctorDTO,
  HospitalDoctorResponseDTO 
} from "../dtos/hospital-doctor.dto";
import { HospitalDoctor } from "../models/hospital-doctor.types";
import hospitalUserService from "@src/modules/hospital-auth/services/hospital-user.service";
import { APIError } from "@src/shared";

class HospitalDoctorService {
  async createHospitalDoctor(
    newDoctor: CreateHospitalDoctorDTO
  ): Promise<HospitalDoctorResponseDTO> {
    // Step 1: Pre-check email availability before touching doctor collection
    await hospitalUserService.checkEmailAvailable(newDoctor.email);

    // Step 2: Generate doctorId
    const nextDoctorId = await getNextSequence("hospitalDoctorId");
    const generatedDoctorId = `DOC${String(nextDoctorId).padStart(3, "0")}`;

    // Strip password — not a doctor model field
    const { password, ...doctorFields } = newDoctor;
    const doctorData: any = { ...doctorFields, doctorId: generatedDoctorId };

    if (newDoctor.dob) {
      try {
        const dobDate = new Date(newDoctor.dob);
        if (isNaN(dobDate.getTime())) throw new Error(`Invalid date format for DOB: ${newDoctor.dob}`);
        doctorData.dob = dobDate;
      } catch (error: any) {
        throw new Error(`Error parsing DOB: ${error.message || error.toString()}`);
      }
    }

    if (Array.isArray(newDoctor.dialysisSlots)) {
      doctorData.dialysisSlots = newDoctor.dialysisSlots.map((slot: any) => {
        if (slot._id && mongoose.Types.ObjectId.isValid(slot._id)) {
          return { ...slot, _id: new mongoose.Types.ObjectId(slot._id) };
        } else {
          const { _id, ...rest } = slot;
          return { ...rest, _id: new mongoose.Types.ObjectId() };
        }
      });
    }

    // Step 3: Create doctor
    const doctor = await HospitalDoctorModel.createHospitalDoctor(doctorData as HospitalDoctor);

    // Step 4: Create linked user account — rollback doctor if this fails
    try {
      await hospitalUserService.createDoctorUser(
        newDoctor.email,
        password,
        newDoctor.name,
        (doctor as any)._id.toString()
      );
    } catch (userErr: any) {
      // Rollback: delete the doctor we just created
      await HospitalDoctorModel.findByIdAndDelete((doctor as any)._id).catch(() => {});
      throw userErr;
    }

    return await transformS3UrlsAsync(doctor) as HospitalDoctorResponseDTO;
  }

  async getHospitalDoctors(
    query: any = {},
    search: any = {},
    skip: number = 0,
    limit: number = 10
  ): Promise<HospitalDoctorResponseDTO[]> {
    const doctors = await HospitalDoctorModel.readHospitalDoctors(
      query,
      search,
      skip,
      limit
    );

    // Transform S3 URLs to signed URLs for all doctors (fast and targeted)
    const { getS3SignedUrl } = await import("@src/libs/utils/s3Upload");
    return Promise.all(
      doctors.map(async (doctor: any) => {
        const item = { ...doctor };
        if (item.imageUrl && typeof item.imageUrl === "string") {
          item.imageUrl = await getS3SignedUrl(item.imageUrl);
        }
        if (item.posterUrl && typeof item.posterUrl === "string") {
          item.posterUrl = await getS3SignedUrl(item.posterUrl);
        }
        return item;
      })
    );
  }

  async getHospitalDoctor(doctorId: string): Promise<HospitalDoctorResponseDTO> {
    const doctor = await HospitalDoctorModel.readHospitalDoctor(doctorId);
    
    // Transform S3 URLs to signed URLs
    return await transformS3UrlsAsync(doctor) as HospitalDoctorResponseDTO;
  }

  async getHospitalDoctorById(id: string): Promise<HospitalDoctorResponseDTO> {
    const isMongoId = mongoose.Types.ObjectId.isValid(id);
    let doctor = null;

    if (isMongoId) {
      doctor = await HospitalDoctorModel.findOne({ 
        _id: id,
        isDeleted: { $ne: true } // Exclude soft deleted
      });
    }

    if (!doctor) {
      doctor = await HospitalDoctorModel.findOne({
        doctorId: id,
        isDeleted: { $ne: true }
      });
    }
    
    if (!doctor) {
      throw new APIError(404, "Doctor Not Found", `Doctor with ID '${id}' not found`);
    }
    
    // Transform S3 URLs to signed URLs
    return await transformS3UrlsAsync(doctor.toObject()) as HospitalDoctorResponseDTO;
  }

  async updateHospitalDoctor(
    doctorId: string,
    updates: UpdateHospitalDoctorDTO
  ): Promise<HospitalDoctorResponseDTO> {
    // Convert DOB string to Date if provided
    const updateData: any = { ...updates };
    if (updates.dob) {
      try {
        const dobDate = new Date(updates.dob);
        if (isNaN(dobDate.getTime())) {
          throw new Error(`Invalid date format for DOB: ${updates.dob}`);
        }
        updateData.dob = dobDate;
      } catch (error: any) {
        throw new Error(`Error parsing DOB: ${error.message || error.toString()}`);
      }
    }

    const updatedDoctor = await HospitalDoctorModel.updateHospitalDoctor(
      doctorId,
      updateData as Partial<HospitalDoctor>
    );

    // Transform S3 URLs to signed URLs
    return await transformS3UrlsAsync(updatedDoctor) as HospitalDoctorResponseDTO;
  }

  async updateHospitalDoctorById(
    id: string,
    updates: UpdateHospitalDoctorDTO
  ): Promise<HospitalDoctorResponseDTO> {
    // Strip password from doctor update — handle separately
    const { password, ...doctorUpdates } = updates;
    const updateData: any = { ...doctorUpdates };

    if (doctorUpdates.dob) {
      try {
        const dobDate = new Date(doctorUpdates.dob);
        if (isNaN(dobDate.getTime())) throw new Error(`Invalid date format for DOB: ${doctorUpdates.dob}`);
        updateData.dob = dobDate;
      } catch (error: any) {
        throw new Error(`Error parsing DOB: ${error.message || error.toString()}`);
      }
    }

    if (Array.isArray(doctorUpdates.dialysisSlots)) {
      updateData.dialysisSlots = doctorUpdates.dialysisSlots.map((slot: any) => {
        if (slot._id && mongoose.Types.ObjectId.isValid(slot._id)) {
          return { ...slot, _id: new mongoose.Types.ObjectId(slot._id) };
        } else {
          const { _id, ...rest } = slot;
          return { ...rest, _id: new mongoose.Types.ObjectId() };
        }
      });
    }

    const isMongoId = mongoose.Types.ObjectId.isValid(id);
    const filter = isMongoId
      ? { _id: id, isDeleted: { $ne: true } }
      : { doctorId: id, isDeleted: { $ne: true } };

    let updatedDoctor = await HospitalDoctorModel.findOneAndUpdate(
      filter,
      { $set: updateData },
      { new: true }
    );

    if (!updatedDoctor && isMongoId) {
      updatedDoctor = await HospitalDoctorModel.findOneAndUpdate(
        { doctorId: id, isDeleted: { $ne: true } },
        { $set: updateData },
        { new: true }
      );
    }

    if (!updatedDoctor) throw new APIError(404, "Doctor Not Found", `Doctor with ID '${id}' not found`);

    // Sync email/password to linked user if either changed
    if (doctorUpdates.email || password) {
      await hospitalUserService.syncDoctorUser(String((updatedDoctor as any)._id), {
        email: doctorUpdates.email,
        password,
      });
    }

    return await transformS3UrlsAsync(updatedDoctor.toObject()) as HospitalDoctorResponseDTO;
  }

  async getDoctorDialysisSlots(doctorIdOrId: string): Promise<any[]> {
    const isObjectId = mongoose.Types.ObjectId.isValid(doctorIdOrId);
    const query: any = {
      isDeleted: { $ne: true },
      $or: [
        { doctorId: doctorIdOrId },
        ...(isObjectId ? [{ _id: new mongoose.Types.ObjectId(doctorIdOrId) }] : [])
      ]
    };

    const doctor = await HospitalDoctorModel.findOne(query).lean();
    if (!doctor) {
      throw new Error(`Doctor with ID '${doctorIdOrId}' not found`);
    }

    return (doctor as any).dialysisSlots || [];
  }

  async deleteHospitalDoctor(doctorId: string, deletedBy?: string): Promise<void> {
    await HospitalDoctorModel.deleteHospitalDoctor(doctorId, deletedBy);
  }

  async deleteHospitalDoctorById(id: string, deletedBy?: string): Promise<void> {
    const updated = await HospitalDoctorModel.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true } }, // Only delete if not already deleted
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
      throw new Error(`Doctor with ID '${id}' not found`);
    }
  }

  async restoreHospitalDoctor(doctorId: string): Promise<HospitalDoctorResponseDTO> {
    const restored = await HospitalDoctorModel.restoreHospitalDoctor(doctorId);
    return await transformS3UrlsAsync(restored) as HospitalDoctorResponseDTO;
  }

  async restoreHospitalDoctorById(id: string): Promise<HospitalDoctorResponseDTO> {
    const restored = await HospitalDoctorModel.findOneAndUpdate(
      { _id: id, isDeleted: true }, // Only restore if actually deleted
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
      throw new Error(`Deleted doctor with ID '${id}' not found`);
    }
    
    const serializedRestored = restored.toObject();
    return await transformS3UrlsAsync(serializedRestored) as HospitalDoctorResponseDTO;
  }

  async updateDoctorSchedule(id: string, scheduleData: { weeklySchedule: any[]; mrMaxVisitsPerDay?: number }): Promise<HospitalDoctorResponseDTO> {
    // Find doctor by MongoDB _id
    const doctor = await HospitalDoctorModel.findOne({ 
      _id: id,
      isDeleted: { $ne: true }
    });
    
    if (!doctor) {
      throw new Error(`Doctor with ID '${id}' not found`);
    }

    // Update schedule using the doctorId
    const updated = await HospitalDoctorModel.updateDoctorSchedule(doctor.doctorId, scheduleData);
    
    return await transformS3UrlsAsync(updated) as HospitalDoctorResponseDTO;
  }
}

export default new HospitalDoctorService();