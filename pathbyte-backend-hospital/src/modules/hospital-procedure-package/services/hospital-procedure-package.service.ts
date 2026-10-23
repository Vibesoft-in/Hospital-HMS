import HospitalProcedurePackageModel from "../models/hospital-procedure-package.model";
import { getNextSequence } from "@src/libs/counter";
import { APIError } from "@src/shared";
import { HospitalProcedurePackage, PackageProcedure } from "../models/hospital-procedure-package.types";
import mongoose from "mongoose";

async function resolveProcedures(procedureIds: string[]): Promise<PackageProcedure[]> {
  if (!procedureIds?.length) return [];
  const HospitalProcedure = mongoose.model("HospitalProcedure");
  const docs = await HospitalProcedure.find({
    _id: { $in: procedureIds.map((id) => new mongoose.Types.ObjectId(id)) },
    isDeleted: { $ne: true },
    status: "Active",
  }).lean();

  if (docs.length !== procedureIds.length) {
    throw new APIError(404, "Procedure Not Found", "One or more procedures not found or inactive.");
  }

  return docs.map((p: any) => ({
    procedureId: p._id.toString(),
    procedureName: p.procedureName,
    price: p.price,
    isDialysis: p.isDialysis || false,
  }));
}

class HospitalProcedurePackageService {
  async createPackage(data: { name: string; description?: string; procedureIds: string[]; createdBy?: string }): Promise<any> {
    const next = await getNextSequence("hospitalProcedurePackageId");
    const packageId = `PKG${String(next).padStart(5, "0")}`;
    const procedures = await resolveProcedures(data.procedureIds);
    const totalPrice = procedures.reduce((sum, p) => sum + p.price, 0);
    return HospitalProcedurePackageModel.createPackage({
      packageId,
      name: data.name,
      description: data.description,
      procedures,
      totalPrice,
      createdBy: data.createdBy,
    } as HospitalProcedurePackage);
  }

  async getPackages(query: any = {}, search: any = {}, skip = 0, limit = 10) {
    return HospitalProcedurePackageModel.readPackages(query, search, skip, limit);
  }

  async getPackageById(id: string) {
    return HospitalProcedurePackageModel.readPackageById(id);
  }

  async updatePackage(id: string, updates: { name?: string; description?: string; procedureIds?: string[] }): Promise<any> {
    const patch: Partial<HospitalProcedurePackage> = {};
    if (updates.name !== undefined) patch.name = updates.name;
    if (updates.description !== undefined) patch.description = updates.description;
    if (updates.procedureIds !== undefined) {
      const procedures = await resolveProcedures(updates.procedureIds);
      patch.procedures = procedures;
      patch.totalPrice = procedures.reduce((sum, p) => sum + p.price, 0);
    }
    return HospitalProcedurePackageModel.updatePackage(id, patch);
  }

  async deletePackage(id: string, deletedBy?: string) {
    return HospitalProcedurePackageModel.deletePackage(id, deletedBy);
  }
}

export default new HospitalProcedurePackageService();
