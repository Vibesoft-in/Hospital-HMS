import mongoose from "mongoose";
import HospitalBedModel from "../models/hospital-bed.model";
import { getNextSequence } from "@src/libs/counter";
import { HospitalBed, BedPatientDetails } from "../models/hospital-bed.types";
import { APIError } from "@src/shared";

class HospitalBedService {
  async createBed(data: Partial<HospitalBed> & { createdBy?: string }): Promise<any> {
    // Validate ward exists
    const HospitalWard = mongoose.model("HospitalWard");
    const ward = await HospitalWard.findOne({ _id: data.wardId, isDeleted: { $ne: true } }).lean();
    if (!ward) throw new APIError(404, "Ward Not Found", `No ward with ID '${data.wardId}' found.`);

    const next = await getNextSequence("hospitalBedId");
    const bedId = `BED${String(next).padStart(5, "0")}`;

    // Normalise chargePerDay: undefined/null → null (no override)
    const chargePerDay = (data.chargePerDay != null && data.chargePerDay >= 0)
      ? data.chargePerDay
      : null;

    return HospitalBedModel.createHospitalBed({
      ...data,
      bedId,
      status: "Available",
      chargePerDay,
    } as HospitalBed);
  }

  async getBeds(query: any = {}, search: any = {}, skip = 0, limit = 10) {
    return HospitalBedModel.readHospitalBeds(query, search, skip, limit);
  }

  async getBedById(id: string) {
    return HospitalBedModel.readHospitalBedById(id);
  }

  async updateBed(id: string, updates: Partial<HospitalBed> & { chargePerDay?: number | null }) {
    // Validate ward exists if wardId is being changed
    if (updates.wardId !== undefined) {
      const HospitalWard = mongoose.model("HospitalWard");
      const ward = await HospitalWard.findOne({ _id: updates.wardId, isDeleted: { $ne: true } }).lean();
      if (!ward) throw new APIError(404, "Ward Not Found", `No ward with ID '${updates.wardId}' found.`);
    }

    // Validate status transition
    if (updates.status !== undefined) {
      const bed = await HospitalBedModel.findById(id).lean() as any;
      if (!bed) throw new APIError(404, "Bed Not Found", `No bed with ID '${id}' found.`);

      const currentStatus = bed.status;
      const newStatus = updates.status;

      // Only allow: Available → Maintenance, Maintenance → Available
      const allowed =
        (currentStatus === "Available" && newStatus === "Maintenance") ||
        (currentStatus === "Maintenance" && newStatus === "Available");

      if (!allowed) {
        throw new APIError(
          409,
          "Invalid Status Transition",
          `Cannot change bed status from '${currentStatus}' to '${newStatus}'. Only Available ↔ Maintenance transitions are permitted via bed update.`
        );
      }
    }

    // Normalise chargePerDay:
    //   null  → explicitly removes the override (falls back to ward rate)
    //   number >= 0 → sets the bed-level override
    //   undefined → field not touched
    const safeUpdates: any = { ...updates };
    if ("chargePerDay" in updates) {
      safeUpdates.chargePerDay = (updates.chargePerDay != null && updates.chargePerDay >= 0)
        ? updates.chargePerDay
        : null;
    }

    return HospitalBedModel.updateHospitalBed(id, safeUpdates);
  }

  async deleteBed(id: string, deletedBy?: string) {
    return HospitalBedModel.deleteHospitalBed(id, deletedBy);
  }

  /** Called by IPD service when an IPD is created with a bedId */
  async occupyBed(bedId: string, patientDetails: BedPatientDetails): Promise<void> {
    const bed = await HospitalBedModel.findOne({ _id: bedId, isDeleted: { $ne: true } });
    if (!bed) throw new APIError(404, "Bed Not Found", `No bed with ID '${bedId}' found.`);
    if (bed.status === "Occupied") {
      throw new APIError(409, "Bed Already Occupied", `Bed '${bed.bedNumber}' is already occupied.`);
    }
    await HospitalBedModel.findByIdAndUpdate(bedId, {
      $set: { status: "Occupied", currentPatientDetails: patientDetails },
    });
  }

  /** Called by IPD service on discharge or delete */
  async releaseBed(bedId: string): Promise<void> {
    await HospitalBedModel.findByIdAndUpdate(bedId, {
      $set: { status: "Available", currentPatientDetails: null },
    });
  }
}

export default new HospitalBedService();
