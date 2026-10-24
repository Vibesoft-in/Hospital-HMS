const HospitalProcedureModel = require("../models/hospital-procedure.model").default;
import { getNextSequence } from "@src/libs/counter";
import { sanitizeRichText } from "@src/libs/utils/sanitizeHtml";
import { 
  CreateHospitalProcedureDTO, 
  HospitalProcedureResponseDTO 
} from "../dtos/hospital-procedure.dto";
import { HospitalProcedure } from "../models/hospital-procedure.types";

class HospitalProcedureService {
  async createHospitalProcedure(
    newProcedure: CreateHospitalProcedureDTO
  ): Promise<HospitalProcedureResponseDTO> {
    if (newProcedure.description) {
      newProcedure.description = sanitizeRichText(newProcedure.description);
    }
    if (newProcedure.metaData) {
      newProcedure.metaData = sanitizeRichText(newProcedure.metaData);
    }

    // Generate procedureId
    const nextProcedureId = await getNextSequence("hospitalProcedureId");
    const generatedProcedureId = `PROC${String(nextProcedureId).padStart(5, "0")}`;

    // Create procedure
    const procedure = await HospitalProcedureModel.createHospitalProcedure({
      ...newProcedure,
      procedureId: generatedProcedureId,
      status: newProcedure.status || "Active",
      dayCareBilling: newProcedure.dayCareBilling || false,
      consumables: newProcedure.consumables || false,
      nursingCharges: newProcedure.nursingCharges || 0,
      roomCharges: newProcedure.roomCharges || 0,
    } as HospitalProcedure);

    return procedure as HospitalProcedureResponseDTO;
  }

  async getHospitalProcedures(
    query: any = {},
    search: any = {},
    skip: number = 0,
    limit: number = 10
  ): Promise<HospitalProcedureResponseDTO[]> {
    const procedures = await HospitalProcedureModel.readHospitalProcedures(
      query,
      search,
      skip,
      limit
    );

    return procedures;
  }

  async getHospitalProcedure(procedureId: string): Promise<HospitalProcedureResponseDTO> {
    const procedure = await HospitalProcedureModel.readHospitalProcedure(procedureId);
    return procedure as HospitalProcedureResponseDTO;
  }

  async getHospitalProcedureById(id: string): Promise<HospitalProcedureResponseDTO> {
    const procedure = await HospitalProcedureModel.findById(id);
    
    if (!procedure) {
      throw new Error(`Procedure with ID '${id}' not found`);
    }
    
    return procedure.toObject() as HospitalProcedureResponseDTO;
  }

  async updateHospitalProcedure(
    procedureId: string,
    updates: Partial<HospitalProcedure>
  ): Promise<HospitalProcedureResponseDTO> {
    if (updates.description) {
      updates.description = sanitizeRichText(updates.description);
    }
    if (updates.metaData) {
      updates.metaData = sanitizeRichText(updates.metaData);
    }

    const updatedProcedure = await HospitalProcedureModel.updateHospitalProcedure(
      procedureId,
      updates
    );

    return updatedProcedure as HospitalProcedureResponseDTO;
  }

  async updateHospitalProcedureById(
    id: string,
    updates: Partial<HospitalProcedure>
  ): Promise<HospitalProcedureResponseDTO> {
    if (updates.description) {
      updates.description = sanitizeRichText(updates.description);
    }
    if (updates.metaData) {
      updates.metaData = sanitizeRichText(updates.metaData);
    }

    const updatedProcedure = await HospitalProcedureModel.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true }
    );
    
    if (!updatedProcedure) {
      throw new Error(`Procedure with ID '${id}' not found`);
    }

    return updatedProcedure.toObject() as HospitalProcedureResponseDTO;
  }

  async deleteHospitalProcedure(procedureId: string): Promise<void> {
    await HospitalProcedureModel.deleteHospitalProcedure(procedureId);
  }

  async deleteHospitalProcedureById(id: string): Promise<void> {
    const deleted = await HospitalProcedureModel.findByIdAndDelete(id);
    
    if (!deleted) {
      throw new Error(`Procedure with ID '${id}' not found`);
    }
  }

  async getProceduresByCategory(category: string): Promise<HospitalProcedureResponseDTO[]> {
    const procedures = await HospitalProcedureModel.readHospitalProcedures(
      { category: { $regex: category, $options: "i" } },
      {},
      0,
      100
    );

    return procedures;
  }

  async getProceduresByDepartment(department: string): Promise<HospitalProcedureResponseDTO[]> {
    const procedures = await HospitalProcedureModel.readHospitalProcedures(
      { department: { $regex: department, $options: "i" } },
      {},
      0,
      100
    );

    return procedures;
  }
}

export default new HospitalProcedureService();
