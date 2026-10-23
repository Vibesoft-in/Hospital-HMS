import { validate } from "jsonschema";
import { Request, Response, NextFunction } from "express";
import { APIError } from "@src/shared";
import { AppError } from "@src/libs/errors";
import { isPagiaSystem } from "@src/libs/utils/systemConfig";
import hospitalPatientService from "../services/hospital-patient.service";
import hospitalPatientNewSchema from "../validators/hospital-patient-new.json";
import hospitalPatientUpdateSchema from "../validators/hospital-patient-update.json";
import hospitalPatientPagiaNewSchema from "../validators/hospital-patient-pagia-new.json";
import hospitalPatientPagiaUpdateSchema from "../validators/hospital-patient-pagia-update.json";
import {
  CreateHospitalPatientDTO,
  UpdateHospitalPatientDTO,
} from "../dtos/hospital-patient.dto";
import { containsHtml, stripHtmlTags } from "@src/libs/utils/sanitizeHtml";

/**
 * Sanitize all text fields in hospital patient input to prevent HTML injection
 */
function sanitizePatientInput(input: any): void {
  const textFields = [
    'name', 'email', 'fatherName', 'address', 'village', 
    'companyName', 'division', 'occupation', 'drugSensitivity', 
    'notes', 'patientUhid'
  ];
  
  for (const field of textFields) {
    if (input[field] && containsHtml(input[field])) {
      input[field] = stripHtmlTags(input[field]);
    }
  }
  
  // Sanitize emergency contacts
  if (input.emergencyContacts && Array.isArray(input.emergencyContacts)) {
    input.emergencyContacts = input.emergencyContacts.map((contact: any) => ({
      ...contact,
      name: containsHtml(contact.name) ? stripHtmlTags(contact.name) : contact.name,
      number: contact.number // Keep number as is
    }));
  }
}

async function createHospitalPatient(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const input: CreateHospitalPatientDTO = request.body;
  
  // Sanitize all text fields to prevent HTML injection
  sanitizePatientInput(input);
  
  // Use Pagia validator if SYSTEM=pagia, otherwise use pathlab validator
  const schema = isPagiaSystem() ? hospitalPatientPagiaNewSchema : hospitalPatientNewSchema;
  const validation = validate(input, schema);
  
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
    const createdBy = (request as any).hospitalUser?._id?.toString();
    const newPatient = await hospitalPatientService.createHospitalPatient({ ...input, createdBy } as any);
    return response.success({ patient: newPatient }, "Patient created successfully", 201);
  } catch (err: any) {
    console.error("Hospital Patient Creation Error:", err);
    return next(
      new AppError(500, "Unable to create patient", err.message || err.toString())
    );
  }
}

async function readHospitalPatient(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const { id } = request.params;
  
  try {
    const patient = await hospitalPatientService.getHospitalPatientById(id);
    return response.success({ patient }, "Patient retrieved successfully");
  } catch (err: any) {
    return next(
      new AppError(500, "Unable to get patient", err.message ?? undefined)
    );
  }
}

async function searchHospitalPatientByMrd(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const { mrd } = request.params;
  
  try {
    const patient = await hospitalPatientService.getHospitalPatient(mrd);
    return response.success({ patient }, "Patient retrieved successfully");
  } catch (err: any) {
    return next(
      new AppError(500, "Unable to get patient", err.message ?? undefined)
    );
  }
}

async function searchHospitalPatientByAbha(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const { abhaAddress, abhaNumber } = request.query;

  if (!abhaAddress && !abhaNumber) {
    return next(
      new APIError(400, "Bad Request", "At least one of abhaAddress or abhaNumber is required")
    );
  }

  try {
    const HospitalPatientModel = (await import("../models/hospital-patient.model")).default;
    const { transformS3UrlsAsync } = await import("@src/libs/utils/s3Upload");

    const orConditions: any[] = [];
    if (abhaAddress) orConditions.push({ abhaAddress: { $regex: `^${abhaAddress}$`, $options: "i" } });
    if (abhaNumber) orConditions.push({ abhaNumber: abhaNumber as string });

    const doc = await HospitalPatientModel.findOne({
      $or: orConditions,
      isDeleted: { $ne: true },
    });

    if (!doc) {
      return next(new APIError(404, "Patient Not Found", "No hospital patient found with the provided ABHA details"));
    }

    const patient = await transformS3UrlsAsync(doc.toObject());


    return response.success({ patient }, "Patient retrieved successfully");
  } catch (err: any) {
    return next(
      new AppError(500, "Unable to search patient", err.message ?? undefined)
    );
  }
}

async function updateHospitalPatient(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const input: UpdateHospitalPatientDTO = request.body;
  
  // Sanitize all text fields to prevent HTML injection
  sanitizePatientInput(input);
  
  // Use Pagia validator if SYSTEM=pagia, otherwise use pathlab validator
  const schema = isPagiaSystem() ? hospitalPatientPagiaUpdateSchema : hospitalPatientUpdateSchema;
  const validation = validate(input, schema);
  
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
    const updatedPatient = await hospitalPatientService.updateHospitalPatientById(id, input);
    return response.success({ patient: updatedPatient }, "Patient updated successfully");
  } catch (err: any) {
    return next(
      new AppError(500, "Unable to update patient", err.message ?? undefined)
    );
  }
}

async function deleteHospitalPatient(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const { id } = request.params;
  const deletedBy = request.body?.deletedBy || 'system'; // Optional, defaults to 'system'
  
  try {
    await hospitalPatientService.deleteHospitalPatientById(id, deletedBy);
    return response.success({}, "Patient deleted successfully");
  } catch (err: any) {
    return next(
      new AppError(500, "Unable to delete patient", err.message ?? undefined)
    );
  }
}

async function restoreHospitalPatient(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const { id } = request.params;
  
  try {
    const restoredPatient = await hospitalPatientService.restoreHospitalPatientById(id);
    return response.success({ patient: restoredPatient }, "Patient restored successfully");
  } catch (err: any) {
    return next(
      new AppError(500, "Unable to restore patient", err.message ?? undefined)
    );
  }
}

export default {
  createHospitalPatient,
  readHospitalPatient,
  searchHospitalPatientByMrd,
  searchHospitalPatientByAbha,
  updateHospitalPatient,
  deleteHospitalPatient,
  restoreHospitalPatient,
};
