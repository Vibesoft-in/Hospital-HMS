import { Request, Response, NextFunction } from "express";
import { AppError } from "@src/libs/errors";
import { APIError } from "@src/shared";
import dialysisSessionService from "../services/dialysis-session.service";

async function readDialysisSessions(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const page  = Math.max(1, parseInt(request.query.page  as string) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(request.query.limit as string) || 10));
    const skip  = (page - 1) * limit;

    const query: any  = {};
    const search: any = {};

    const {
      search: searchQuery,
      status,
      visitId,
      patientId,
      procedureId,
      daycareAppointmentId,
      createdFrom,
      createdTo,
      allowCancelled,
    } = request.query;

    // Text search — sessionId on root doc; patient name handled post-lookup
    if (searchQuery) {
      search.$or = [
        { sessionId: { $regex: searchQuery, $options: "i" } },
      ];
      // Flag for model to also match patient.name after lookup
      search._patientNameSearch = searchQuery as string;
    }

    // Status filter — by default exclude Cancelled sessions unless allowCancelled=true or status explicitly set
    if (status) {
      search.status = status;
    } else if (allowCancelled !== "true") {
      search.status = { $ne: "Cancelled" };
    }

    if (visitId)              search.visitId              = visitId;
    if (patientId)            search.patientId            = patientId;
    if (procedureId)          search.procedureId          = procedureId;
    if (daycareAppointmentId) search.daycareAppointmentId = daycareAppointmentId;

    // Date filter — single day takes priority over range
    if (request.query.date) {
      const d = new Date(request.query.date as string);
      if (isNaN(d.getTime())) {
        return next(new APIError(400, "Bad Request", "Invalid date format. Use YYYY-MM-DD"));
      }
      search.createdAt = {
        $gte: new Date(new Date(d).setHours(0, 0, 0, 0)),
        $lte: new Date(new Date(d).setHours(23, 59, 59, 999)),
      };
    } else if (createdFrom || createdTo) {
      search.createdAt = {};
      if (createdFrom) {
        const from = new Date(createdFrom as string);
        if (isNaN(from.getTime())) {
          return next(new APIError(400, "Bad Request", "Invalid createdFrom date. Use YYYY-MM-DD"));
        }
        from.setHours(0, 0, 0, 0);
        search.createdAt.$gte = from;
      }
      if (createdTo) {
        const to = new Date(createdTo as string);
        if (isNaN(to.getTime())) {
          return next(new APIError(400, "Bad Request", "Invalid createdTo date. Use YYYY-MM-DD"));
        }
        to.setHours(23, 59, 59, 999);
        search.createdAt.$lte = to;
      }
    }

    const sessions = await dialysisSessionService.getDialysisSessions(query, search, skip, limit);

    // Total count — use aggregation when patient name search is active (needs lookup)
    const DialysisSessionModel = (await import("../models/dialysis-session.model")).default;
    let total: number;

    if (search._patientNameSearch) {
      // Need to count after lookup — run a count aggregation
      const patientNameSearch = search._patientNameSearch;
      const countSearch = { ...search };
      delete countSearch._patientNameSearch;
      delete countSearch.$or;

      const countPipeline: any[] = [
        { $match: { ...query, isDeleted: { $ne: true }, ...countSearch } },
        {
          $addFields: {
            patientObjectId: {
              $cond: {
                if: { $regexMatch: { input: "$patientId", regex: /^[0-9a-fA-F]{24}$/ } },
                then: { $toObjectId: "$patientId" },
                else: null
              }
            }
          }
        },
        {
          $lookup: {
            from: "hospitalpatients",
            localField: "patientObjectId",
            foreignField: "_id",
            as: "patient",
            pipeline: [{ $project: { name: 1, mrd: 1 } }]
          }
        },
        { $unwind: { path: "$patient", preserveNullAndEmptyArrays: true } },
        {
          $match: {
            $or: [
              { sessionId: { $regex: patientNameSearch, $options: "i" } },
              { "patient.name": { $regex: patientNameSearch, $options: "i" } },
              { "patient.mrd": { $regex: patientNameSearch, $options: "i" } },
            ]
          }
        },
        { $count: "total" }
      ];

      const countResult = await DialysisSessionModel.aggregate(countPipeline);
      total = countResult[0]?.total || 0;
    } else {
      // Simple count without lookup
      const countFilter = { ...query, ...search, isDeleted: { $ne: true } };
      delete countFilter._patientNameSearch;
      total = await DialysisSessionModel.countDocuments(countFilter);
    }

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
    return next(new AppError(500, "Unable to get dialysis sessions", err.message ?? undefined));
  }
}

async function getMonthlyCalendar(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const { year, month, doctorId } = request.query;
    if (!year || !month) {
      return next(new APIError(400, "Bad Request", "Query parameters 'year' and 'month' are required."));
    }

    const calendarData = await dialysisSessionService.getMonthlyCalendar(
      parseInt(year as string),
      parseInt(month as string),
      doctorId ? (doctorId as string) : undefined
    );

    return response.success(calendarData, "Dialysis calendar retrieved successfully");
  } catch (err: any) {
    if (err instanceof APIError) return next(err);
    return next(new AppError(500, "Unable to get dialysis calendar", err.message ?? undefined));
  }
}

export default { readDialysisSessions, getMonthlyCalendar };
