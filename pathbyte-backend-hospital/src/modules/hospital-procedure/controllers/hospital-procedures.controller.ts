import { Request, Response, NextFunction } from "express";
import { AppError } from "@src/libs/errors";
import { APIError } from "@src/shared";
import hospitalProcedureService from "../services/hospital-procedure.service";

const HospitalProcedureModel = require("../models/hospital-procedure.model").default;

async function readHospitalProcedures(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    let skip = 0;
    let limit = 10;

    const { page, limit: limitParam } = request.query;

    if (limitParam) {
      const parsed = parseInt(limitParam as string);
      if (isNaN(parsed) || parsed < 1) return next(new APIError(400, "Bad Request", "limit must be a positive integer"));
      limit = Math.min(parsed, 100);
    }

    if (page) {
      const pageNum = parseInt(page as string);
      if (isNaN(pageNum) || pageNum < 1) return next(new APIError(400, "Bad Request", "page must be a positive integer starting from 1"));
      skip = (pageNum - 1) * limit;
    }

    // Build query
    const search: any = { isDeleted: { $ne: true } };
    const { search: searchQuery, category, department, status, dayCareBilling, type } = request.query;

    if (searchQuery) {
      search.$or = [
        { procedureName: { $regex: searchQuery, $options: "i" } },
        { procedureId: { $regex: searchQuery, $options: "i" } },
        { category: { $regex: searchQuery, $options: "i" } },
        { department: { $regex: searchQuery, $options: "i" } },
      ];
    }

    if (category) search.category = { $regex: category, $options: "i" };
    if (department) search.department = { $regex: department, $options: "i" };
    if (status) search.status = status;
    if (dayCareBilling !== undefined) search.dayCareBilling = dayCareBilling === "true";
    if (type) {
      const types = Array.isArray(type)
        ? type
        : (type as string).split(",").map((t) => t.trim()).filter(Boolean);

      // Valid procedure types — validate to avoid injecting arbitrary values
      const validTypes = new Set(["daycare", "ipd", "opd", "both"]);
      const filteredTypes = (types as string[]).filter((t) => validTypes.has(t));

      // Type filter is exact — "both" means IPD+Daycare only, not OPD.
      // When ?type=opd → only type:"opd"
      // When ?type=ipd → type:"ipd" or type:"both"
      // When ?type=daycare → type:"daycare" or type:"both"
      // When ?type=ipd,daycare → type:"ipd", "daycare", or "both"
      const matchTypes: string[] = [...filteredTypes];
      // Add "both" only if at least one of ipd/daycare is requested and opd is NOT
      const hasIpdOrDaycare = filteredTypes.some((t) => t === "ipd" || t === "daycare");
      const hasOpd = filteredTypes.includes("opd");
      if (hasIpdOrDaycare && !hasOpd) {
        matchTypes.push("both");
      }

      // Apply type filter directly on the search object
      search.type = { $in: Array.from(new Set(matchTypes)) };
    }

    const [procedures, totalCount] = await Promise.all([
      hospitalProcedureService.getHospitalProcedures({}, search, skip, limit),
      HospitalProcedureModel.countDocuments(search),
    ]);

    const currentPage = page ? parseInt(page as string) : Math.floor(skip / limit) + 1;
    const totalPages = Math.ceil(totalCount / limit);

    return response.success(
      {
        procedures,
        pagination: {
          currentPage,
          limit,
          skip,
          count: procedures.length,
          totalCount,
          totalPages,
          hasNextPage: currentPage < totalPages,
          hasPrevPage: currentPage > 1,
        },
      },
      "Procedures retrieved successfully"
    );
  } catch (err: any) {
    return next(new AppError(500, "Unable to get procedures", err.message ?? undefined));
  }
}

async function readProcedureCategories(
  _request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const HospitalProcedureModel = require("../models/hospital-procedure.model").default;
    const categories: string[] = await HospitalProcedureModel.distinct("category", {
      isDeleted: { $ne: true },
      category: { $nin: [null, ""] },
    });
    return response.success(
      { categories: categories.filter(Boolean).sort() },
      "Procedure categories retrieved successfully"
    );
  } catch (err: any) {
    return next(new AppError(500, "Unable to get procedure categories", err.message ?? undefined));
  }
}

async function readProceduresByCategory(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const { category } = request.params;
  
  try {
    const procedures = await hospitalProcedureService.getProceduresByCategory(category);
    
    return response.success(
      { procedures, count: procedures.length },
      `Procedures in category '${category}' retrieved successfully`
    );
  } catch (err: any) {
    return next(
      new AppError(500, "Unable to get procedures by category", err.message ?? undefined)
    );
  }
}

export default {
  readHospitalProcedures,
  readProceduresByCategory,
  readProcedureCategories,
};