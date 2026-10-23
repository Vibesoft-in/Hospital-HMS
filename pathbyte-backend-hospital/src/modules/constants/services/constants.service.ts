import ConstantsModel from "../models/constants.model";
import { CreateConstantDTO, ConstantResponseDTO, UpdateConstantDTO } from "../dtos/constants.dto";
import { Constants } from "../models/constants.types";
import { hashPassword, comparePassword } from "@src/libs/password";
import { APIError } from "@src/shared";

const PASSWORD_KEYS = ["DISCOUNT_PASSWORD", "DASHBOARD_PASSWORD"];

class ConstantsService {
  async createConstant(newConstant: CreateConstantDTO): Promise<ConstantResponseDTO> {
    // Hash value for any password constant
    if (PASSWORD_KEYS.includes(newConstant.key) && typeof newConstant.value === "string") {
      newConstant.value = await hashPassword(newConstant.value);
    }
    
    const constant = await ConstantsModel.createConstant(newConstant as Constants);
    return constant as ConstantResponseDTO;
  }

  async getConstants(
    query: any = {},
    search: any = {},
    skip: number = 0,
    limit: number = 10
  ): Promise<ConstantResponseDTO[]> {
    const constants = await ConstantsModel.readConstants(query, search, skip, limit);
    
    // Hide password constant values in list responses
    return constants.map((constant: any) => {
      if (PASSWORD_KEYS.includes(constant.key)) {
        return { ...constant, value: "***HIDDEN***" };
      }
      return constant;
    }) as ConstantResponseDTO[];
  }

  async getConstant(key: string): Promise<ConstantResponseDTO> {
    const constant = await ConstantsModel.readConstant(key);
    
    // Hide password constant values
    if (PASSWORD_KEYS.includes(key)) {
      return { ...constant, value: "***HIDDEN***" } as ConstantResponseDTO;
    }
    
    return constant as ConstantResponseDTO;
  }

  async getConstantById(id: string): Promise<ConstantResponseDTO> {
    const constant = await ConstantsModel.readConstantById(id);
    
    // Hide password constant values
    if (PASSWORD_KEYS.includes(constant.key)) {
      return { ...constant, value: "***HIDDEN***" } as ConstantResponseDTO;
    }
    
    return constant as ConstantResponseDTO;
  }

  async updateConstant(key: string, updates: UpdateConstantDTO): Promise<ConstantResponseDTO> {
    // Hash value for any password constant
    if (PASSWORD_KEYS.includes(key) && updates.value && typeof updates.value === "string") {
      updates.value = await hashPassword(updates.value);
    }
    
    const updatedConstant = await ConstantsModel.updateConstant(key, updates);
    
    // Hide password constant values in response
    if (PASSWORD_KEYS.includes(key)) {
      return { ...updatedConstant, value: "***HIDDEN***" } as ConstantResponseDTO;
    }
    
    return updatedConstant as ConstantResponseDTO;
  }

  async updateConstantById(id: string, updates: UpdateConstantDTO): Promise<ConstantResponseDTO> {
    const existing = await ConstantsModel.readConstantById(id);
    
    // Hash value for any password constant
    if (PASSWORD_KEYS.includes(existing.key) && updates.value && typeof updates.value === "string") {
      updates.value = await hashPassword(updates.value);
    }
    
    const updatedConstant = await ConstantsModel.updateConstantById(id, updates);
    
    // Hide password constant values in response
    if (PASSWORD_KEYS.includes(existing.key)) {
      return { ...updatedConstant, value: "***HIDDEN***" } as ConstantResponseDTO;
    }
    
    return updatedConstant as ConstantResponseDTO;
  }

  async deleteConstant(key: string): Promise<void> {
    await ConstantsModel.deleteConstant(key);
  }

  async deleteConstantById(id: string): Promise<void> {
    await ConstantsModel.deleteConstantById(id);
  }

  async getConstantsByCategory(category: string): Promise<ConstantResponseDTO[]> {
    const constants = await ConstantsModel.getConstantsByCategory(category);
    return constants as ConstantResponseDTO[];
  }

  async verifyDashboardPassword(password: string): Promise<boolean> {
    let constant: any;
    try {
      constant = await ConstantsModel.readConstant("DASHBOARD_PASSWORD");
    } catch {
      throw new APIError(404, "Not Configured", "Dashboard password has not been set up yet.");
    }
    return comparePassword(password, constant.value);
  }
}

export default new ConstantsService();
