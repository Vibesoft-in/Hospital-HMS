import { validate } from "jsonschema";
import { Request, Response, NextFunction } from "express";
import { APIError } from "@src/shared";
import { AppError } from "@src/libs/errors";
import hospitalProcedureService from "../services/hospital-procedure.service";
import hospitalProcedureNewSchema from "../validators/hospital-procedure-new.json";
import hospitalProcedureUpdateSchema from "../validators/hospital-procedure-update.json";
import {
  CreateHospitalProcedureDTO,
  UpdateHospitalProcedureDTO,
} from "../dtos/hospital-procedure.dto";

async function createHospitalProcedure(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const input: CreateHospitalProcedureDTO = request.body;
  const validation = validate(input, hospitalProcedureNewSchema);
  
  if (!validation.valid) {
    return next(
      new APIError(
        400,
        "Bad Request",
        validation.errors.map((e) => e.stack).join(". ")
      )
    );
  }

  try {
    const newProcedure = await hospitalProcedureService.createHospitalProcedure(input);
    return response.success({ procedure: newProcedure }, "Procedure created successfully", 201);
  } catch (err: any) {
    return next(
      new AppError(500, "Unable to create procedure", err.message ?? undefined)
    );
  }
}

async function readHospitalProcedure(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const { id } = request.params;
  
  try {
    const procedure = await hospitalProcedureService.getHospitalProcedureById(id);
    return response.success({ procedure }, "Procedure retrieved successfully");
  } catch (err: any) {
    return next(
      new AppError(500, "Unable to get procedure", err.message ?? undefined)
    );
  }
}

async function searchHospitalProcedureByProcedureId(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const { procedureId } = request.params;
  
  try {
    const procedure = await hospitalProcedureService.getHospitalProcedure(procedureId);
    return response.success({ procedure }, "Procedure retrieved successfully");
  } catch (err: any) {
    return next(
      new AppError(500, "Unable to get procedure", err.message ?? undefined)
    );
  }
}

async function updateHospitalProcedure(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const input: UpdateHospitalProcedureDTO = request.body;
  const validation = validate(input, hospitalProcedureUpdateSchema);
  
  if (!validation.valid) {
    return next(
      new APIError(
        400,
        "Bad Request",
        validation.errors.map((e) => e.stack).join(". ")
      )
    );
  }

  const { id } = request.params;
  
  try {
    const updatedProcedure = await hospitalProcedureService.updateHospitalProcedureById(id, input);
    return response.success({ procedure: updatedProcedure }, "Procedure updated successfully");
  } catch (err: any) {
    return next(
      new AppError(500, "Unable to update procedure", err.message ?? undefined)
    );
  }
}

async function deleteHospitalProcedure(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const { id } = request.params;
  
  try {
    await hospitalProcedureService.deleteHospitalProcedureById(id);
    return response.success({}, "Procedure deleted successfully");
  } catch (err: any) {
    return next(
      new AppError(500, "Unable to delete procedure", err.message ?? undefined)
    );
  }
}

export default {
  createHospitalProcedure,
  readHospitalProcedure,
  searchHospitalProcedureByProcedureId,
  updateHospitalProcedure,
  deleteHospitalProcedure,
};