import { Request, Response, NextFunction } from "express";
import { AppError } from "@src/libs/errors";
import { APIError } from "@src/shared";
import { parseSkipLimit } from "@src/shared/parseSkipLimit";
import { logger } from "@src/config/logger";
import hospitalPharmaTokenService from "../services/hospital-pharma-token.service";
import pharmaTokenEventsService, { PharmaTokenEventData } from "../services/pharma-token-events.service";

// GET /pharma-tokens
async function getHospitalPharmaTokens(req: Request, res: Response, next: NextFunction) {
  try {
    let skip = 0;
    let limit = 10;

    const { page, skip: skipParam, limit: limitParam } = req.query;

    if (limitParam) {
      const limitResult = parseSkipLimit(limitParam, 100, "limit");
      if (limitResult instanceof APIError) return next(limitResult);
      limit = limitResult || 10;
    }

    if (page) {
      const pageNum = parseInt(page as string);
      if (isNaN(pageNum) || pageNum < 1) {
        return next(new APIError(400, "Bad Request", "Page must be a positive integer starting from 1"));
      }
      skip = (pageNum - 1) * limit;
      if (skip > 10000) {
        return next(new APIError(400, "Bad Request", `Page ${pageNum} with limit ${limit} exceeds maximum skip of 10000.`));
      }
    } else if (skipParam) {
      const skipResult = parseSkipLimit(skipParam, 10000, "skip");
      if (skipResult instanceof APIError) return next(skipResult);
      skip = skipResult || 0;
    }

    const query: any  = {};
    const search: any = {};

    if (req.query.status)    query.status    = req.query.status;
    if (req.query.patientId) query.patientId = req.query.patientId;

    if (req.query.date) {
      query.date = req.query.date;
    } else if (req.query.startDate || req.query.endDate) {
      query.date = {};
      if (req.query.startDate) query.date.$gte = req.query.startDate;
      if (req.query.endDate)   query.date.$lte = req.query.endDate;
    }

    const { tokens, totalCount } = await hospitalPharmaTokenService.getHospitalPharmaTokens(query, search, skip, limit);

    const currentPage = page ? parseInt(page as string) : Math.floor(skip / limit) + 1;
    const pagination = {
      currentPage,
      limit,
      skip,
      count: tokens.length,
      totalCount,
      hasMore: tokens.length === limit,
    };

    return res.success({ tokens, pagination }, "Pharma tokens retrieved successfully");
  } catch (err: any) {
    return next(new AppError(500, "Unable to get pharma tokens", err.message));
  }
}

// GET /pharma-tokens/queue?date=YYYY-MM-DD
async function getPharmaTokenQueue(req: Request, res: Response, next: NextFunction) {
  try {
    const date = req.query.date as string | undefined;
    const queue = await hospitalPharmaTokenService.getQueueForDate(date);
    const summary = {
      total:      queue.length,
      created:    queue.filter((t: any) => t.status === "Created").length,
      inProgress: queue.filter((t: any) => t.status === "InProgress").length,
      payNow:     queue.filter((t: any) => t.status === "PayNow").length,
      completed:  queue.filter((t: any) => t.status === "Completed").length,
      cancelled:  queue.filter((t: any) => t.status === "Cancelled").length,
    };
    return res.success({ date: date || hospitalPharmaTokenService.getTodayIST(), queue, summary }, "Queue retrieved successfully");
  } catch (err: any) {
    return next(new AppError(500, "Unable to get pharma queue", err.message));
  }
}

// GET /pharma-tokens/stream?date=YYYY-MM-DD  — SSE
async function streamPharmaTokenQueue(req: Request, res: Response, next: NextFunction) {
  const requestedDate = req.query.date as string | undefined;

  try {
    // SSE headers
    res.setHeader("Content-Type",       "text/event-stream");
    res.setHeader("Cache-Control",      "no-cache");
    res.setHeader("Connection",         "keep-alive");
    res.setHeader("X-Accel-Buffering",  "no");
    res.setHeader("Transfer-Encoding",  "chunked");
    res.flushHeaders(); // flush immediately so client knows connection is open

    let currentDate = requestedDate || hospitalPharmaTokenService.getTodayIST();

    // Send initial queue
    const initialQueue = await hospitalPharmaTokenService.getQueueForDate(currentDate);
    const summary = buildSummary(initialQueue);
    res.write(`data: ${JSON.stringify({ type: "initial", date: currentDate, queue: initialQueue, summary })}\n\n`);
    if ((res as any).flush) (res as any).flush();

    logger.info({ date: currentDate }, "SSE pharma queue connection established");

    // Event handler
    const eventHandler = (data: PharmaTokenEventData) => {
      try {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
        if ((res as any).flush) (res as any).flush();
      } catch (e) {
        logger.error({ error: e }, "Error writing SSE pharma event");
      }
    };

    let eventKey = pharmaTokenEventsService.getEventKey(currentDate);
    pharmaTokenEventsService.on(eventKey, eventHandler);

    // Check for date rollover every minute (only relevant if no date param)
    const dateCheckInterval = setInterval(async () => {
      if (requestedDate) return; // Fixed date — no rollover needed
      const newDate = hospitalPharmaTokenService.getTodayIST();
      if (newDate !== currentDate) {
        pharmaTokenEventsService.off(eventKey, eventHandler);
        currentDate = newDate;
        eventKey = pharmaTokenEventsService.getEventKey(currentDate);
        pharmaTokenEventsService.on(eventKey, eventHandler);

        const newQueue = await hospitalPharmaTokenService.getQueueForDate(currentDate);
        res.write(`data: ${JSON.stringify({ type: "date-change", date: currentDate, queue: newQueue, summary: buildSummary(newQueue) })}\n\n`);
        if ((res as any).flush) (res as any).flush();
        logger.info({ newDate: currentDate }, "Pharma SSE date rolled over");
      }
    }, 60000);

    // Keepalive every 15s (keeps Postman + proxies from closing the connection)
    const keepAlive = setInterval(() => {
      try {
        res.write(":keepalive\n\n");
        if ((res as any).flush) (res as any).flush();
      } catch (e) { /* ignore */ }
    }, 15000);

    req.on("close", () => {
      clearInterval(dateCheckInterval);
      clearInterval(keepAlive);
      pharmaTokenEventsService.off(eventKey, eventHandler);
      logger.info({ date: currentDate }, "SSE pharma queue connection closed");
    });

  } catch (err: any) {
    if (err instanceof APIError) return next(err);
    return next(new AppError(500, "Unable to establish pharma queue stream", err.message));
  }
}

function buildSummary(queue: any[]) {
  return {
    total:      queue.length,
    created:    queue.filter((t) => t.status === "Created").length,
    inProgress: queue.filter((t) => t.status === "InProgress").length,
    payNow:     queue.filter((t) => t.status === "PayNow").length,
    completed:  queue.filter((t) => t.status === "Completed").length,
    cancelled:  queue.filter((t) => t.status === "Cancelled").length,
  };
}

export default {
  getHospitalPharmaTokens,
  getPharmaTokenQueue,
  streamPharmaTokenQueue,
};
