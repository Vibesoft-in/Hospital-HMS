import { Request, Response, NextFunction } from "express";
import { AppError } from "@src/libs/errors";
import { APIError } from "@src/shared";
import { errorResponse } from "@src/libs/response";
import { logger } from "@src/config/logger";

function sanitizeBody(body: any): any {
  if (!body || typeof body !== "object") return body;
  const clone = Array.isArray(body) ? [...body] : { ...body };
  const sensitiveKeys = ["password", "newpassword", "currentpassword", "token", "otp", "aadhaar", "fingerprintauthpid", "refreshtoken", "accesstoken", "secret"];
  for (const key of Object.keys(clone)) {
    if (sensitiveKeys.some(s => key.toLowerCase().includes(s))) {
      (clone as any)[key] = "[REDACTED]";
    } else if (typeof (clone as any)[key] === "object") {
      (clone as any)[key] = sanitizeBody((clone as any)[key]);
    }
  }
  return clone;
}

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  // Log the error with context
  logger.error({
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: sanitizeBody(req.body),
    query: req.query,
    params: req.params,
  }, "Error occurred in request");

  // Handle APIError (from shared)
  if (err instanceof APIError) {
    const body = {
      error: err.title || "API Error",
      message: err.message || "An error occurred",
    };
    res
      .status(err.status)
      .json(errorResponse(err.status, body.message, body.error, null));
    return;
  }

  // Handle AppError (from libs)
  const status = err instanceof AppError ? err.status : 500;

  let statusMessage = "INTERNAL";
  if (status === 400) statusMessage = "INVALID_ARGUMENT";
  else if (status === 401) statusMessage = "UNAUTHENTICATED";
  else if (status === 403) statusMessage = "PERMISSION_DENIED";
  else if (status === 404) statusMessage = "NOT_FOUND";
  else if (status === 409) statusMessage = "CONFLICT";
  else statusMessage = "SOMETHING WENT WRONG";
  
  const body = {
    error: statusMessage || "INTERNAL_ERROR",
    message: err.message ?? "Something went wrong. Please try again.",
  };
  
  res
    .status(status)
    .json(errorResponse(status, body.message, body.error, err.code || null));
}