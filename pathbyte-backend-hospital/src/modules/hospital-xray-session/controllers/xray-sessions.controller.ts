import { Request, Response, NextFunction } from "express";
import { validate } from "jsonschema";
import { AppError } from "@src/libs/errors";
import { APIError } from "@src/shared";
import { parseSkipLimit } from "@src/shared/parseSkipLimit";
import { logger } from "@src/config/logger";
import xraySessionService from "../services/xray-session.service";
import xrayTokenEventsService, { XrayTokenEventData } from "../services/xray-token-events.service";
import xrayTokenNewSchema from "../validators/xray-token-new.json";

// ─── helpers ─────────────────────────────────────────────────────────────────

function buildSummary(queue: any[]) {
  return {
    total:      queue.length,
    pending:    queue.filter((t) => t.status === "Pending").length,
    inProgress: queue.filter((t) => t.status === "In Progress").length,
    completed:  queue.filter((t) => t.status === "Completed").length,
    cancelled:  queue.filter((t) => t.status === "Cancelled").length,
  };
}

// ─── GET /xray-sessions ───────────────────────────────────────────────────────
async function readXraySessions(req: Request, res: Response, next: NextFunction) {
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
        return next(new APIError(400, "Bad Request", `Page ${pageNum} with limit ${limit} exceeds maximum.`));
      }
    } else if (skipParam) {
      const skipResult = parseSkipLimit(skipParam, 10000, "skip");
      if (skipResult instanceof APIError) return next(skipResult);
      skip = skipResult || 0;
    }

    const query: any  = {};
    const search: any = {};

    const {
      search: searchQuery,
      status,
      visitId,
      patientId,
      procedureId,
      daycareAppointmentId,
      ipdId,
      source,
      tokenDate,
      createdFrom,
      createdTo,
      allowCancelled,
    } = req.query;

    if (searchQuery) {
      search.$or = [{ sessionId: { $regex: searchQuery, $options: "i" } }];
      search._patientNameSearch = searchQuery as string;
    }

    // Default: exclude Cancelled unless explicitly requested
    if (status) {
      search.status = status;
    } else if (allowCancelled !== "true") {
      search.status = { $ne: "Cancelled" };
    }

    if (visitId)              search.visitId              = visitId;
    if (patientId)            search.patientId            = patientId;
    if (procedureId)          search.procedureId          = procedureId;
    if (daycareAppointmentId) search.daycareAppointmentId = daycareAppointmentId;
    if (ipdId)                search.ipdId                = ipdId;
    if (source)               search.source               = source;
    if (tokenDate)            search.tokenDate            = tokenDate;

    if (req.query.date) {
      const d = new Date(req.query.date as string);
      if (isNaN(d.getTime())) return next(new APIError(400, "Bad Request", "Invalid date format. Use YYYY-MM-DD"));
      search.createdAt = {
        $gte: new Date(new Date(d).setHours(0, 0, 0, 0)),
        $lte: new Date(new Date(d).setHours(23, 59, 59, 999)),
      };
    } else if (createdFrom || createdTo) {
      search.createdAt = {};
      if (createdFrom) {
        const from = new Date(createdFrom as string);
        if (isNaN(from.getTime())) return next(new APIError(400, "Bad Request", "Invalid createdFrom date."));
        from.setHours(0, 0, 0, 0);
        search.createdAt.$gte = from;
      }
      if (createdTo) {
        const to = new Date(createdTo as string);
        if (isNaN(to.getTime())) return next(new APIError(400, "Bad Request", "Invalid createdTo date."));
        to.setHours(23, 59, 59, 999);
        search.createdAt.$lte = to;
      }
    }

    const result = await xraySessionService.getXraySessions(query, search, skip, limit);
    const data       = result[0]?.data       || [];
    const totalCount = result[0]?.totalCount?.[0]?.count || 0;
    const currentPage = page ? parseInt(page as string) : Math.floor(skip / limit) + 1;

    return res.success(
      {
        sessions: data,
        pagination: {
          currentPage,
          limit,
          skip,
          count: data.length,
          totalCount,
          hasMore: data.length === limit,
        },
      },
      "Xray sessions retrieved successfully"
    );
  } catch (err: any) {
    return next(new AppError(500, "Unable to get xray sessions", err.message ?? undefined));
  }
}

// ─── POST /xray-sessions/token  (create walk-in token) ───────────────────────
async function createXrayToken(req: Request, res: Response, next: NextFunction) {
  try {
    const validation = validate(req.body, xrayTokenNewSchema);
    if (!validation.valid) {
      return next(new APIError(400, "Bad Request", validation.errors.map((e) => e.stack).join(". ")));
    }

    const { patientId, procedureId, date, reportHtml, docUrl, isUltrasound } = req.body;
    const session = await xraySessionService.createXrayToken({ patientId, procedureId, date, reportHtml, docUrl, isUltrasound });

    // Emit SSE — include full queue so display screen updates instantly
    const queue = await xraySessionService.getQueueForDate((session as any).tokenDate);
    xrayTokenEventsService.emitTokenCreated((session as any).tokenDate, session, queue);

    logger.info({ sessionId: (session as any).sessionId, xrayTokenId: (session as any).xrayTokenId, date: (session as any).tokenDate }, "Xray token created");
    return res.success({ session }, "Xray token created successfully", 201);
  } catch (err: any) {
    if (err instanceof APIError) return next(err);
    return next(new AppError(500, "Unable to create xray token", err.message));
  }
}

// ─── GET /xray-sessions/queue?date=YYYY-MM-DD ────────────────────────────────
async function getXrayTokenQueue(req: Request, res: Response, next: NextFunction) {
  try {
    const date  = req.query.date as string | undefined;
    const queue = await xraySessionService.getQueueForDate(date);
    const summary = buildSummary(queue);
    return res.success(
      { date: date || xraySessionService.getTodayIST(), queue, summary },
      "Xray queue retrieved successfully"
    );
  } catch (err: any) {
    return next(new AppError(500, "Unable to get xray queue", err.message));
  }
}

// ─── GET /xray-sessions/stream?date=YYYY-MM-DD  (SSE, no auth) ───────────────
async function streamXrayTokenQueue(req: Request, res: Response, next: NextFunction) {
  const requestedDate = req.query.date as string | undefined;

  try {
    // SSE headers
    res.setHeader("Content-Type",      "text/event-stream");
    res.setHeader("Cache-Control",     "no-cache");
    res.setHeader("Connection",        "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.setHeader("Transfer-Encoding", "chunked");
    res.flushHeaders();

    let currentDate = requestedDate || xraySessionService.getTodayIST();

    // Send initial queue state
    const initialQueue = await xraySessionService.getQueueForDate(currentDate);
    const initialSummary = buildSummary(initialQueue);
    res.write(`data: ${JSON.stringify({ type: "initial", date: currentDate, queue: initialQueue, summary: initialSummary })}\n\n`);
    if ((res as any).flush) (res as any).flush();

    logger.info({ date: currentDate }, "SSE xray queue connection established");

    // Event listener — rebroadcasts every update to this client
    const eventHandler = (data: XrayTokenEventData) => {
      try {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
        if ((res as any).flush) (res as any).flush();
      } catch (e) {
        logger.error({ error: e }, "Error writing SSE xray event");
      }
    };

    let eventKey = xrayTokenEventsService.getEventKey(currentDate);
    xrayTokenEventsService.on(eventKey, eventHandler);

    // Date rollover check every 60s (only relevant when no explicit date param)
    const dateCheckInterval = setInterval(async () => {
      if (requestedDate) return;
      const newDate = xraySessionService.getTodayIST();
      if (newDate !== currentDate) {
        xrayTokenEventsService.off(eventKey, eventHandler);
        currentDate = newDate;
        eventKey = xrayTokenEventsService.getEventKey(currentDate);
        xrayTokenEventsService.on(eventKey, eventHandler);

        const newQueue = await xraySessionService.getQueueForDate(currentDate);
        res.write(`data: ${JSON.stringify({ type: "date-change", date: currentDate, queue: newQueue, summary: buildSummary(newQueue) })}\n\n`);
        if ((res as any).flush) (res as any).flush();
        logger.info({ newDate: currentDate }, "Xray SSE date rolled over");
      }
    }, 60000);

    // Keepalive every 15s
    const keepAlive = setInterval(() => {
      try {
        res.write(":keepalive\n\n");
        if ((res as any).flush) (res as any).flush();
      } catch (e) { /* ignore */ }
    }, 15000);

    req.on("close", () => {
      clearInterval(dateCheckInterval);
      clearInterval(keepAlive);
      xrayTokenEventsService.off(eventKey, eventHandler);
      logger.info({ date: currentDate }, "SSE xray queue connection closed");
    });

  } catch (err: any) {
    if (err instanceof APIError) return next(err);
    return next(new AppError(500, "Unable to establish xray queue stream", err.message));
  }
}

export default {
  readXraySessions,
  createXrayToken,
  getXrayTokenQueue,
  streamXrayTokenQueue,
};
