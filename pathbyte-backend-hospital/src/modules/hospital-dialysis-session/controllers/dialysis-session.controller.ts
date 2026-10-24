import { validate } from "jsonschema";
import { Request, Response, NextFunction } from "express";
import { APIError } from "@src/shared";
import { AppError } from "@src/libs/errors";
import dialysisSessionService from "../services/dialysis-session.service";
import dialysisSessionNewSchema from "../validators/dialysis-session-new.json";
import dialysisSessionUpdateSchema from "../validators/dialysis-session-update.json";
import addMonitoringReadingSchema from "../validators/add-monitoring-reading.json";
import {
  CreateDialysisSessionDTO,
  UpdateDialysisSessionDTO,
  AddMonitoringReadingDTO,
} from "../dtos/dialysis-session.dto";

async function createDialysisSession(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const input: CreateDialysisSessionDTO = request.body;
  const validation = validate(input, dialysisSessionNewSchema);
  
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
    const newSession = await dialysisSessionService.createDialysisSession(input);
    return response.success({ session: newSession }, "Dialysis session created successfully", 201);
  } catch (err: any) {
    return next(
      new AppError(500, "Unable to create dialysis session", err.message ?? undefined)
    );
  }
}

async function readDialysisSession(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const { id } = request.params;
  
  try {
    const session = await dialysisSessionService.getDialysisSessionById(id, request.ownershipFilter || {});
    return response.success({ session }, "Dialysis session retrieved successfully");
  } catch (err: any) {
    if (err instanceof APIError) return next(err);
    return next(
      new AppError(500, "Unable to get dialysis session", err.message ?? undefined)
    );
  }
}

async function searchDialysisSessionBySessionId(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const { sessionId } = request.params;
  
  try {
    const session = await dialysisSessionService.getDialysisSession(sessionId);
    return response.success({ session }, "Dialysis session retrieved successfully");
  } catch (err: any) {
    if (err instanceof APIError) return next(err);
    return next(
      new AppError(500, "Unable to get dialysis session", err.message ?? undefined)
    );
  }
}

async function updateDialysisSession(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const input: UpdateDialysisSessionDTO = request.body;
  const validation = validate(input, dialysisSessionUpdateSchema);
  
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
    const updatedSession = await dialysisSessionService.updateDialysisSessionById(id, input as any, request.ownershipFilter || {});
    return response.success({ session: updatedSession }, "Dialysis session updated successfully");
  } catch (err: any) {
    if (err instanceof APIError) return next(err);
    return next(
      new AppError(500, "Unable to update dialysis session", err.message ?? undefined)
    );
  }
}

async function deleteDialysisSession(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const { id } = request.params;
  
  try {
    await dialysisSessionService.deleteDialysisSessionById(id, request.ownershipFilter || {});
    return response.success({}, "Dialysis session deleted successfully");
  } catch (err: any) {
    if (err instanceof APIError) return next(err);
    return next(
      new AppError(500, "Unable to delete dialysis session", err.message ?? undefined)
    );
  }
}

async function addMonitoringReading(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const input: AddMonitoringReadingDTO = request.body;
  const validation = validate(input, addMonitoringReadingSchema);
  
  if (!validation.valid) {
    return next(
      new APIError(
        400,
        "Bad Request",
        validation.errors.map((e) => e.stack).join(". ")
      )
    );
  }

  const { sessionId } = request.params;
  
  try {
    const updatedSession = await dialysisSessionService.addMonitoringReading(sessionId, input);
    return response.success({ session: updatedSession }, "Monitoring reading added successfully");
  } catch (err: any) {
    return next(
      new AppError(500, "Unable to add monitoring reading", err.message ?? undefined)
    );
  }
}

async function getSessionsByVisit(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const { visitId } = request.params;
  const { status, allowCancelled } = request.query;

  const filter: any = {};
  if (status) {
    filter.status = status;
  } else if (allowCancelled !== "true") {
    filter.status = { $ne: "Cancelled" };
  }
  
  try {
    const sessions = await dialysisSessionService.getSessionsByVisit(visitId, filter);
    return response.success(
      { sessions, count: sessions.length },
      "Dialysis sessions retrieved successfully"
    );
  } catch (err: any) {
    return next(
      new AppError(500, "Unable to get dialysis sessions", err.message ?? undefined)
    );
  }
}

async function getSessionsByPatient(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const { patientId } = request.params;
  const page  = Math.max(1, parseInt(request.query.page  as string) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(request.query.limit as string) || 10));
  const skip  = (page - 1) * limit;

  const { status, allowCancelled } = request.query;
  const filter: any = {};
  if (status) {
    filter.status = status;
  } else if (allowCancelled !== "true") {
    filter.status = { $ne: "Cancelled" };
  }
  
  try {
    const [sessions, total] = await Promise.all([
      dialysisSessionService.getSessionsByPatient(patientId, skip, limit, filter),
      dialysisSessionService.countSessionsByPatient(patientId, filter),
    ]);

    const totalPages = Math.ceil(total / limit);

    return response.success(
      {
        sessions,
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      "Dialysis sessions retrieved successfully"
    );
  } catch (err: any) {
    return next(
      new AppError(500, "Unable to get dialysis sessions", err.message ?? undefined)
    );
  }
}

export default {
  createDialysisSession,
  readDialysisSession,
  searchDialysisSessionBySessionId,
  updateDialysisSession,
  deleteDialysisSession,
  addMonitoringReading,
  getSessionsByVisit,
  getSessionsByPatient,
};
