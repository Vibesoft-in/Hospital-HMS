import HospitalPatientModel from "../models/hospital-patient.model";
import { getNextSequence } from "@src/libs/counter";
import { transformS3UrlsAsync } from "@src/libs/utils/s3Upload";
import {
  CreateHospitalPatientDTO,
  HospitalPatientResponseDTO,
  UpdateHospitalPatientDTO
} from "../dtos/hospital-patient.dto";
import { HospitalPatient } from "../models/hospital-patient.types";
import { getPathlabCasesForHmsPatient } from "@src/libs/utils/crossReferencePatient";

class HospitalPatientService {
  async createHospitalPatient(
    newPatient: CreateHospitalPatientDTO
  ): Promise<HospitalPatientResponseDTO> {
    const nextMrdId = await getNextSequence("hospitalPatientMrd");
    const generatedMrd = `MRD${String(nextMrdId).padStart(5, "0")}`;

    const patientData: any = {
      ...newPatient,
      mrd: generatedMrd,
    };

    if (newPatient.dob) {
      try {
        const dobDate = new Date(newPatient.dob);
        if (isNaN(dobDate.getTime())) {
          throw new Error(`Invalid date format for DOB: ${newPatient.dob}`);
        }
        patientData.dob = dobDate;
      } catch (error: any) {
        throw new Error(`Error parsing DOB: ${error.message || error.toString()}`);
      }
    }

    const patient = await HospitalPatientModel.createHospitalPatient(patientData as HospitalPatient);
    return await transformS3UrlsAsync(patient) as HospitalPatientResponseDTO;
  }

  async getHospitalPatients(
    query: any = {},
    search: any = {},
    skip: number = 0,
    limit: number = 10
  ): Promise<HospitalPatientResponseDTO[]> {
    const patients = await HospitalPatientModel.readHospitalPatients(
      query,
      search,
      skip,
      limit
    );

    return Promise.all(patients.map(async (patient: any) => {
      return await transformS3UrlsAsync(patient);
    }));
  }

  async getHospitalPatient(mrd: string): Promise<HospitalPatientResponseDTO> {
    const patient = await HospitalPatientModel.readHospitalPatient(mrd);
    return await transformS3UrlsAsync(patient) as HospitalPatientResponseDTO;
  }

  async getHospitalPatientById(id: string): Promise<HospitalPatientResponseDTO> {
    const patient = await HospitalPatientModel.findOne({
      _id: id,
      isDeleted: { $ne: true }
    }).select("-__v -isDeleted -deletedAt -deletedBy").lean();

    if (!patient) {
      throw new Error(`Patient with ID '${id}' not found`);
    }

    const serializedPatient = { ...(patient as any) };
    if (serializedPatient._id && typeof serializedPatient._id === 'object') {
      serializedPatient._id = serializedPatient._id.toString();
    }
    const result = await transformS3UrlsAsync(serializedPatient) as any;

    // Append pathlab cases if cross-reference exists
    result.pathlabCases = serializedPatient.pathlabPatientId
      ? await getPathlabCasesForHmsPatient(serializedPatient.pathlabPatientId)
      : [];

    return result as HospitalPatientResponseDTO;
  }

  async updateHospitalPatient(
    mrd: string,
    updates: UpdateHospitalPatientDTO
  ): Promise<HospitalPatientResponseDTO> {
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

    const updatedPatient = await HospitalPatientModel.updateHospitalPatient(
      mrd,
      updateData as Partial<HospitalPatient>
    );
    return await transformS3UrlsAsync(updatedPatient) as HospitalPatientResponseDTO;
  }

  async updateHospitalPatientById(
    id: string,
    updates: UpdateHospitalPatientDTO
  ): Promise<HospitalPatientResponseDTO> {
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

    const updatedPatient = await HospitalPatientModel.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true } },
      { $set: updateData },
      { new: true }
    );

    if (!updatedPatient) {
      throw new Error(`Patient with ID '${id}' not found`);
    }

    const serializedPatient = updatedPatient.toObject();
    return await transformS3UrlsAsync(serializedPatient) as HospitalPatientResponseDTO;
  }

  async deleteHospitalPatient(mrd: string, deletedBy?: string): Promise<void> {
    await HospitalPatientModel.deleteHospitalPatient(mrd, deletedBy);
  }

  async deleteHospitalPatientById(id: string, deletedBy?: string): Promise<void> {
    const updated = await HospitalPatientModel.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true } },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: deletedBy || "system",
        },
      },
      { new: true }
    );

    if (!updated) {
      throw new Error(`Patient with ID '${id}' not found`);
    }
  }

  async restoreHospitalPatient(mrd: string): Promise<HospitalPatientResponseDTO> {
    const restored = await HospitalPatientModel.restoreHospitalPatient(mrd);
    return await transformS3UrlsAsync(restored) as HospitalPatientResponseDTO;
  }

  async restoreHospitalPatientById(id: string): Promise<HospitalPatientResponseDTO> {
    const restored = await HospitalPatientModel.findOneAndUpdate(
      { _id: id, isDeleted: true },
      {
        $set: {
          isDeleted: false,
          deletedAt: null,
          deletedBy: null,
        },
      },
      { new: true }
    );

    if (!restored) {
      throw new Error(`Deleted patient with ID '${id}' not found`);
    }

    const serializedPatient = restored.toObject();
    return await transformS3UrlsAsync(serializedPatient) as HospitalPatientResponseDTO;
  }
}

export default new HospitalPatientService();
