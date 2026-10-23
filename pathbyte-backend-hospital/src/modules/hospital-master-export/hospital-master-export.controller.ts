import { Request, Response, NextFunction } from "express";
import { APIError, parseSkipLimit } from "@src/shared";
import { AppError } from "@src/libs/errors";
import { logger } from "@src/config/logger";
import {
  buildDetailedExport,
  buildDetailedData,
  buildSummarizedExport,
  buildSummarizedData,
  MasterExportFilters,
} from "./hospital-master-export.service";

/** Shared filter extraction from request.query */
function extractFilters(query: Record<string, any>): MasterExportFilters {
  const { from, to, doctorId, patientId, search, status } = query;
  return {
    from:      from      ? String(from)      : undefined,
    to:        to        ? String(to)        : undefined,
    doctorId:  doctorId  ? String(doctorId)  : undefined,
    patientId: patientId ? String(patientId) : undefined,
    search:    search    ? String(search)    : undefined,
    status:    status    ? String(status)    : undefined,
  };
}

/** Validate ISO date string — returns true if valid */
function isValidDate(d: string): boolean {
  const t = new Date(d);
  return !isNaN(t.getTime());
}

/** Parse onlyData query param — treats "true" / "1" as true */
function parseOnlyData(val: any): boolean {
  return val === "true" || val === "1" || val === true;
}

/**
 * GET /hospital-master-export/detailed
 *
 * Query params:
 *   from        YYYY-MM-DD  (optional — returns all-time if omitted)
 *   to          YYYY-MM-DD  (optional)
 *   doctorId    ObjectId    (optional)
 *   patientId   ObjectId    (optional)
 *   search      string      (optional — matches patient name or UHID)
 *   status      string      (optional — comma-separated, e.g. "Completed,Discharged")
 *   page        number      (optional, default 1)
 *   limit       number      (optional, default 20000)
 *   onlyData    boolean     (optional — return JSON instead of Excel)
 */
export async function exportDetailed(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const filters = extractFilters(request.query as Record<string, any>);

    if (filters.from && !isValidDate(filters.from)) {
      return next(new APIError(400, "Bad Request", "Invalid 'from' date. Use YYYY-MM-DD format."));
    }
    if (filters.to && !isValidDate(filters.to)) {
      return next(new APIError(400, "Bad Request", "Invalid 'to' date. Use YYYY-MM-DD format."));
    }
    if (filters.from && filters.to && new Date(filters.from) > new Date(filters.to)) {
      return next(new APIError(400, "Bad Request", "'from' date must be before or equal to 'to' date."));
    }

    // Pagination
    const limitResult = parseSkipLimit(request.query.limit, 20000, "limit");
    if (limitResult instanceof APIError) return next(limitResult);
    filters.limit = limitResult ?? 20000;

    const page = parseInt(request.query.page as string) || 1;
    if (page < 1) return next(new APIError(400, "Bad Request", "'page' must be a positive integer."));
    filters.page = page;

    const onlyData = parseOnlyData(request.query.onlyData);

    logger.info({ filters, onlyData }, "Generating detailed master export");

    if (onlyData) {
      const result = await buildDetailedData(filters);
      response.json({ success: true, data: result });
      return;
    }

    const buffer = await buildDetailedExport(filters);

    const fromLabel = filters.from ?? "all";
    const toLabel   = filters.to   ?? "time";
    const filename  = `detailed-export-${fromLabel}-to-${toLabel}.xlsx`;

    response.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    response.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    response.send(buffer);
  } catch (err: any) {
    logger.error({ error: err.message, stack: err.stack }, "Detailed master export failed");
    if (err instanceof APIError) return next(err);
    return next(new AppError(500, "Failed to generate detailed export.", err.message ?? undefined));
  }
}

/**
 * GET /hospital-master-export/summarized
 *
 * Query params:
 *   from        YYYY-MM-DD  (REQUIRED)
 *   to          YYYY-MM-DD  (REQUIRED)
 *   doctorId    ObjectId    (optional)
 *   patientId   ObjectId    (optional)
 *   search      string      (optional)
 *   status      string      (optional — comma-separated)
 *   onlyData    boolean     (optional — return JSON instead of Excel)
 */
export async function exportSummarized(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const filters = extractFilters(request.query as Record<string, any>);

    if (!filters.from || !filters.to) {
      return next(new APIError(400, "Bad Request", "'from' and 'to' date parameters are required for summarized export."));
    }
    if (!isValidDate(filters.from)) {
      return next(new APIError(400, "Bad Request", "Invalid 'from' date. Use YYYY-MM-DD format."));
    }
    if (!isValidDate(filters.to)) {
      return next(new APIError(400, "Bad Request", "Invalid 'to' date. Use YYYY-MM-DD format."));
    }
    if (new Date(filters.from) > new Date(filters.to)) {
      return next(new APIError(400, "Bad Request", "'from' date must be before or equal to 'to' date."));
    }

    const onlyData = parseOnlyData(request.query.onlyData);

    logger.info({ filters, onlyData }, "Generating summarized master export");

    if (onlyData) {
      const result = await buildSummarizedData(filters);
      response.json({ success: true, data: result });
      return;
    }

    const buffer = await buildSummarizedExport(filters);

    const filename = `summarized-export-${filters.from}-to-${filters.to}.xlsx`;

    response.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    response.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    response.send(buffer);
  } catch (err: any) {
    logger.error({ error: err.message, stack: err.stack }, "Summarized master export failed");
    if (err instanceof APIError) return next(err);
    return next(new AppError(500, "Failed to generate summarized export.", err.message ?? undefined));
  }
}
