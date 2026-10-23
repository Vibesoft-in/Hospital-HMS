import { validate } from "jsonschema";
import { Request, Response, NextFunction } from "express";
import { APIError } from "@src/shared";
import { AppError } from "@src/libs/errors";
import hospitalDoctorService from "../services/hospital-doctor.service";
import hospitalDoctorNewSchema from "../validators/hospital-doctor-new.json";
import hospitalDoctorUpdateSchema from "../validators/hospital-doctor-update.json";
import hospitalDoctorScheduleUpdateSchema from "../validators/doctor-schedule-update.json";
import {
  CreateHospitalDoctorDTO,
  UpdateHospitalDoctorDTO,
} from "../dtos/hospital-doctor.dto";

async function createHospitalDoctor(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const input: CreateHospitalDoctorDTO = request.body;
  const validation = validate(input, hospitalDoctorNewSchema);
  
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
    const newDoctor = await hospitalDoctorService.createHospitalDoctor(input);
    return response.success({ doctor: newDoctor }, "Doctor created successfully", 201);
  } catch (err: any) {
    return next(
      new AppError(500, "Unable to create doctor", err.message ?? undefined)
    );
  }
}

async function readHospitalDoctor(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const { id } = request.params;
  const user = (request as any).hospitalUser;
  
  // DOCTOR role can only read their own linked doctor profile
  if (user?.role === "DOCTOR") {
    if (!user.linkedDoctorId || user.linkedDoctorId !== id) {
      return next(new APIError(403, "Forbidden", "You can only view your own doctor profile."));
    }
  }
  
  try {
    const doctor = await hospitalDoctorService.getHospitalDoctorById(id);
    return response.success({ doctor }, "Doctor retrieved successfully");
  } catch (err: any) {
    return next(
      new AppError(500, "Unable to get doctor", err.message ?? undefined)
    );
  }
}

async function searchHospitalDoctorByDoctorId(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const { doctorId } = request.params;
  
  try {
    const doctor = await hospitalDoctorService.getHospitalDoctor(doctorId);
    return response.success({ doctor }, "Doctor retrieved successfully");
  } catch (err: any) {
    return next(
      new AppError(500, "Unable to get doctor", err.message ?? undefined)
    );
  }
}

async function updateHospitalDoctor(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const input: UpdateHospitalDoctorDTO = request.body;
  const validation = validate(input, hospitalDoctorUpdateSchema);
  
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
    const updatedDoctor = await hospitalDoctorService.updateHospitalDoctorById(id, input);
    return response.success({ doctor: updatedDoctor }, "Doctor updated successfully");
  } catch (err: any) {
    return next(
      new AppError(500, "Unable to update doctor", err.message ?? undefined)
    );
  }
}

async function deleteHospitalDoctor(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const { id } = request.params;
  const deletedBy = request.body?.deletedBy || 'system';
  
  try {
    await hospitalDoctorService.deleteHospitalDoctorById(id, deletedBy);
    return response.success({}, "Doctor deleted successfully");
  } catch (err: any) {
    return next(
      new AppError(500, "Unable to delete doctor", err.message ?? undefined)
    );
  }
}

async function restoreHospitalDoctor(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const { id } = request.params;
  
  try {
    const restoredDoctor = await hospitalDoctorService.restoreHospitalDoctorById(id);
    return response.success({ doctor: restoredDoctor }, "Doctor restored successfully");
  } catch (err: any) {
    return next(
      new AppError(500, "Unable to restore doctor", err.message ?? undefined)
    );
  }
}

async function updateDoctorSchedule(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const input = request.body;
  const validation = validate(input, hospitalDoctorScheduleUpdateSchema);
  
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
    const updatedDoctor = await hospitalDoctorService.updateDoctorSchedule(id, input);
    return response.success({ doctor: updatedDoctor }, "Doctor schedule updated successfully");
  } catch (err: any) {
    return next(
      new AppError(500, "Unable to update doctor schedule", err.message ?? undefined)
    );
  }
}

async function getDoctorDialysisSlots(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const { id } = request.params;
  
  try {
    const dialysisSlots = await hospitalDoctorService.getDoctorDialysisSlots(id);
    return response.success({ dialysisSlots }, "Doctor dialysis slots retrieved successfully");
  } catch (err: any) {
    return next(
      new AppError(500, "Unable to get doctor dialysis slots", err.message ?? undefined)
    );
  }
}

export default {
  createHospitalDoctor,
  readHospitalDoctor,
  searchHospitalDoctorByDoctorId,
  updateHospitalDoctor,
  deleteHospitalDoctor,
  restoreHospitalDoctor,
  updateDoctorSchedule,
  getDoctorDialysisSlots,
};