import { validate } from "jsonschema";
import { Request, Response, NextFunction } from "express";
import { APIError } from "@src/shared";
import { AppError } from "@src/libs/errors";
import { logger } from "@src/config/logger";
import xraySessionService from "../services/xray-session.service";
import xrayTokenEventsService from "../services/xray-token-events.service";
import xraySessionNewSchema from "../validators/xray-session-new.json";
import xraySessionUpdateSchema from "../validators/xray-session-update.json";
import { CreateXraySessionDTO, UpdateXraySessionDTO } from "../dtos/xray-session.dto";

// POST /xray-session
async function createXraySession(req: Request, res: Response, next: NextFunction) {
  const input: CreateXraySessionDTO = req.body;
  const validation = validate(input, xraySessionNewSchema);
  if (!validation.valid) {
    return next(new APIError(400, "Bad Request", validation.errors.map((e) => e.stack).join(". ")));
  }

  try {
    const session = await xraySessionService.createXraySession(input);

    // If a token was assigned, notify queue subscribers
    if ((session as any).tokenDate) {
      const queue = await xraySessionService.getQueueForDate((session as any).tokenDate);
      xrayTokenEventsService.emitTokenCreated((session as any).tokenDate, session, queue);
    }

    logger.info({ sessionId: (session as any).sessionId, tokenDate: (session as any).tokenDate }, "Xray session created");
    return res.success({ session }, "Xray session created successfully", 201);
  } catch (err: any) {
    if (err instanceof APIError) return next(err);
    return next(new AppError(500, "Unable to create xray session", err.message ?? undefined));
  }
}

// GET /xray-session/:id  (by MongoDB _id)
async function readXraySession(req: Request, res: Response, next: NextFunction) {
  const { id } = req.params;
  try {
    const session = await xraySessionService.getXraySessionById(id);
    return res.success({ session }, "Xray session retrieved successfully");
  } catch (err: any) {
    if (err instanceof APIError) return next(err);
    return next(new AppError(500, "Unable to get xray session", err.message ?? undefined));
  }
}

// GET /xray-session/session/:sessionId  (by readable sessionId e.g. XRA00001)
async function searchXraySessionBySessionId(req: Request, res: Response, next: NextFunction) {
  const { sessionId } = req.params;
  try {
    const session = await xraySessionService.getXraySession(sessionId);
    return res.success({ session }, "Xray session retrieved successfully");
  } catch (err: any) {
    if (err instanceof APIError) return next(err);
    return next(new AppError(500, "Unable to get xray session", err.message ?? undefined));
  }
}

// PUT /xray-session/:id  (by MongoDB _id)
async function updateXraySession(req: Request, res: Response, next: NextFunction) {
  const input: UpdateXraySessionDTO = req.body;
  const validation = validate(input, xraySessionUpdateSchema);
  if (!validation.valid) {
    return next(new APIError(400, "Bad Request", validation.errors.map((e) => e.stack).join(". ")));
  }

  const { id } = req.params;
  try {
    const session = await xraySessionService.updateXraySessionById(id, input);

    // Emit status-change SSE event if session has a token date
    if ((session as any).tokenDate) {
      const queue = await xraySessionService.getQueueForDate((session as any).tokenDate);
      xrayTokenEventsService.emitStatusChange((session as any).tokenDate, session, queue);
    }

    logger.info({ id, status: (session as any).status }, "Xray session updated");
    return res.success({ session }, "Xray session updated successfully");
  } catch (err: any) {
    if (err instanceof APIError) return next(err);
    return next(new AppError(500, "Unable to update xray session", err.message ?? undefined));
  }
}

// DELETE /xray-session/:id  (by MongoDB _id)
async function deleteXraySession(req: Request, res: Response, next: NextFunction) {
  const { id } = req.params;
  try {
    await xraySessionService.deleteXraySessionById(id);
    logger.info({ id }, "Xray session deleted");
    return res.success({}, "Xray session deleted successfully");
  } catch (err: any) {
    if (err instanceof APIError) return next(err);
    return next(new AppError(500, "Unable to delete xray session", err.message ?? undefined));
  }
}

// GET /xray-session/visit/:visitId
async function getSessionsByVisit(req: Request, res: Response, next: NextFunction) {
  const { visitId } = req.params;
  try {
    const sessions = await xraySessionService.getSessionsByVisit(visitId);
    return res.success({ sessions, count: sessions.length }, "Xray sessions retrieved successfully");
  } catch (err: any) {
    return next(new AppError(500, "Unable to get xray sessions", err.message ?? undefined));
  }
}

// GET /xray-session/patient/:patientId
async function getSessionsByPatient(req: Request, res: Response, next: NextFunction) {
  const { patientId } = req.params;
  const page  = Math.max(1, parseInt(req.query.page  as string) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string) || 10));
  const skip  = (page - 1) * limit;

  try {
    const [sessions, total] = await Promise.all([
      xraySessionService.getSessionsByPatient(patientId, skip, limit),
      xraySessionService.countSessionsByPatient(patientId),
    ]);
    const totalPages = Math.ceil(total / limit);
    return res.success(
      { sessions, total, page, limit, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 },
      "Xray sessions retrieved successfully"
    );
  } catch (err: any) {
    return next(new AppError(500, "Unable to get xray sessions", err.message ?? undefined));
  }
}

export default {
  createXraySession,
  readXraySession,
  searchXraySessionBySessionId,
  updateXraySession,
  deleteXraySession,
  getSessionsByVisit,
  getSessionsByPatient,
};
