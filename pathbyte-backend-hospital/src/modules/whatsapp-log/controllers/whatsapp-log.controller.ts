import { Request, Response, NextFunction } from "express";
import { AppError } from "@src/libs/errors";
import { APIError } from "@src/shared";
import { parseSkipLimit } from "@src/shared/parseSkipLimit";
import whatsappLogService from "../services/whatsapp-log.service";

async function getWhatsappLogs(req: Request, res: Response, next: NextFunction) {
  try {
    let skip = 0;
    let limit = 20;

    const { page, skip: skipParam, limit: limitParam } = req.query;

    if (limitParam) {
      const r = parseSkipLimit(limitParam, 100, "limit");
      if (r instanceof APIError) return next(r);
      limit = r || 20;
    }

    if (page) {
      const pageNum = parseInt(page as string);
      if (isNaN(pageNum) || pageNum < 1)
        return next(new APIError(400, "Bad Request", "Page must be a positive integer."));
      skip = (pageNum - 1) * limit;
    } else if (skipParam) {
      const r = parseSkipLimit(skipParam, 10000, "skip");
      if (r instanceof APIError) return next(r);
      skip = r || 0;
    }

    const filter: any = {};
    if (req.query.status)       filter.status       = req.query.status;
    if (req.query.context)      filter.context      = req.query.context;
    if (req.query.templateName) filter.templateName = req.query.templateName;
    if (req.query.patientId)    filter.patientId    = req.query.patientId;
    if (req.query.to)           filter.to           = req.query.to;

    if (req.query.startDate || req.query.endDate) {
      filter.createdAt = {};
      if (req.query.startDate) filter.createdAt.$gte = new Date(req.query.startDate as string);
      if (req.query.endDate) {
        const end = new Date(req.query.endDate as string);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    const { logs, totalCount } = await whatsappLogService.getLogs(filter, skip, limit);
    const currentPage = page ? parseInt(page as string) : Math.floor(skip / limit) + 1;

    return res.success(
      {
        logs,
        pagination: {
          currentPage,
          limit,
          skip,
          count: logs.length,
          totalCount,
          hasMore: logs.length === limit,
        },
      },
      "WhatsApp logs retrieved successfully"
    );
  } catch (err: any) {
    return next(new AppError(500, "Unable to get WhatsApp logs", err.message));
  }
}

async function getWhatsappStats(req: Request, res: Response, next: NextFunction) {
  try {
    const filter: any = {};
    if (req.query.startDate || req.query.endDate) {
      filter.createdAt = {};
      if (req.query.startDate) filter.createdAt.$gte = new Date(req.query.startDate as string);
      if (req.query.endDate) {
        const end = new Date(req.query.endDate as string);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    const stats = await whatsappLogService.getStats(filter);
    return res.success({ stats }, "WhatsApp stats retrieved successfully");
  } catch (err: any) {
    return next(new AppError(500, "Unable to get WhatsApp stats", err.message));
  }
}

export default { getWhatsappLogs, getWhatsappStats };
