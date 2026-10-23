import HospitalWardModel from "../models/hospital-ward.model";
import { getNextSequence } from "@src/libs/counter";
import { HospitalWard } from "../models/hospital-ward.types";

class HospitalWardService {
  async createWard(data: Partial<HospitalWard> & { createdBy?: string }): Promise<any> {
    const next = await getNextSequence("hospitalWardId");
    const wardId = `WARD${String(next).padStart(5, "0")}`;
    return HospitalWardModel.createHospitalWard({ ...data, wardId } as HospitalWard);
  }

  async getWards(query: any = {}, search: any = {}, skip = 0, limit = 10) {
    return HospitalWardModel.readHospitalWards(query, search, skip, limit);
  }

  async getWardById(id: string) {
    return HospitalWardModel.readHospitalWardById(id);
  }

  async updateWard(id: string, updates: Partial<HospitalWard>) {
    return HospitalWardModel.updateHospitalWard(id, updates);
  }

  async deleteWard(id: string, deletedBy?: string) {
    // Check if any active beds reference this ward
    const BedModel = (await import("../../hospital-bed/models/hospital-bed.model")).default;
    const activeBeds = await BedModel.countDocuments({ wardId: id, isDeleted: { $ne: true } });
    if (activeBeds > 0) {
      const { APIError } = await import("@src/shared");
      throw new APIError(400, "Ward In Use", `Cannot delete ward — ${activeBeds} bed(s) are still assigned to it.`);
    }
    return HospitalWardModel.deleteHospitalWard(id, deletedBy);
  }
}

export default new HospitalWardService();
