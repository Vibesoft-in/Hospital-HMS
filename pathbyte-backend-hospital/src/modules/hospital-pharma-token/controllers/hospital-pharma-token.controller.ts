import { Request, Response, NextFunction } from "express";
import { validate } from "jsonschema";
import { AppError } from "@src/libs/errors";
import { APIError } from "@src/shared";
import { logger } from "@src/config/logger";
import hospitalPharmaTokenService from "../services/hospital-pharma-token.service";
import pharmaTokenEventsService from "../services/pharma-token-events.service";
import newSchema    from "../validators/hospital-pharma-token-new.json";
import updateSchema from "../validators/hospital-pharma-token-update.json";

// POST /pharma-tokens
async function createHospitalPharmaToken(req: Request, res: Response, next: NextFunction) {
  try {
    const validation = validate(req.body, newSchema);
    if (!validation.valid) {
      return next(new APIError(400, "Bad Request", validation.errors.map((e) => e.stack).join(". ")));
    }

    const { patientId, date } = req.body;
    const token = await hospitalPharmaTokenService.createHospitalPharmaToken({ patientId, date });

    // Emit SSE event
    const queue = await hospitalPharmaTokenService.getQueueForDate(token.date);
    pharmaTokenEventsService.emitTokenCreated(token.date, token, queue);

    logger.info({ pharmaTokenId: token.pharmaTokenId, date: token.date }, "Pharma token created");
    return res.success({ token }, "Pharma token created successfully", 201);
  } catch (err: any) {
    if (err instanceof APIError) return next(err);
    return next(new AppError(500, "Unable to create pharma token", err.message));
  }
}

// GET /pharma-tokens/:id
async function getHospitalPharmaToken(req: Request, res: Response, next: NextFunction) {
  try {
    const token = await hospitalPharmaTokenService.getHospitalPharmaTokenById(req.params.id);
    return res.success({ token }, "Pharma token retrieved successfully");
  } catch (err: any) {
    if (err instanceof APIError) return next(err);
    return next(new AppError(500, "Unable to get pharma token", err.message));
  }
}

// PATCH /pharma-tokens/:id
async function updateHospitalPharmaToken(req: Request, res: Response, next: NextFunction) {
  try {
    const validation = validate(req.body, updateSchema);
    if (!validation.valid) {
      return next(new APIError(400, "Bad Request", validation.errors.map((e) => e.stack).join(". ")));
    }

    const token = await hospitalPharmaTokenService.updateHospitalPharmaToken(req.params.id, req.body);

    // Emit SSE event
    const queue = await hospitalPharmaTokenService.getQueueForDate(token.date);
    pharmaTokenEventsService.emitStatusChange(token.date, token, queue);

    logger.info({ id: req.params.id, status: token.status }, "Pharma token updated");
    return res.success({ token }, "Pharma token updated successfully");
  } catch (err: any) {
    if (err instanceof APIError) return next(err);
    return next(new AppError(500, "Unable to update pharma token", err.message));
  }
}

// DELETE /pharma-tokens/:id
async function deleteHospitalPharmaToken(req: Request, res: Response, next: NextFunction) {
  try {
    const deletedBy = (req as any).hospitalUser?._id?.toString();
    await hospitalPharmaTokenService.deleteHospitalPharmaToken(req.params.id, deletedBy);
    logger.info({ id: req.params.id }, "Pharma token deleted");
    return res.success({}, "Pharma token deleted successfully");
  } catch (err: any) {
    if (err instanceof APIError) return next(err);
    return next(new AppError(500, "Unable to delete pharma token", err.message));
  }
}

export default {
  createHospitalPharmaToken,
  getHospitalPharmaToken,
  updateHospitalPharmaToken,
  deleteHospitalPharmaToken,
};
