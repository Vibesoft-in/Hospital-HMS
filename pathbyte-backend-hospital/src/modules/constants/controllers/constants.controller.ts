import { Request, Response, NextFunction } from "express";
import { AppError } from "@src/libs/errors";
import { APIError } from "@src/shared";
import { parseSkipLimit } from "@src/shared/parseSkipLimit";
import constantsService from "../services/constants.service";

async function readConstants(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    // Support both skip/limit and page/limit patterns
    let skip = 0;
    let limit = 10;
    
    const { page, skip: skipParam, limit: limitParam } = request.query;
    
    // Parse limit first
    if (limitParam) {
      const limitResult = parseSkipLimit(limitParam, 100, "limit");
      if (limitResult instanceof APIError) return next(limitResult);
      limit = limitResult || 10;
    }
    
    // Calculate skip from page or use skip directly
    if (page) {
      const pageNum = parseInt(page as string);
      if (isNaN(pageNum) || pageNum < 1) {
        return next(new APIError(400, "Bad Request", "Page must be a positive integer starting from 1"));
      }
      skip = (pageNum - 1) * limit;
      
      // Validate calculated skip doesn't exceed max
      if (skip > 1000) {
        return next(new APIError(400, "Bad Request", `Page ${pageNum} with limit ${limit} exceeds maximum skip of 1000. Please use a smaller page number or limit.`));
      }
    } else if (skipParam) {
      const skipResult = parseSkipLimit(skipParam, 1000, "skip");
      if (skipResult instanceof APIError) return next(skipResult);
      skip = skipResult || 0;
    }
    
    // Build search query
    const search: any = {};
    const { search: searchQuery, category, isActive } = request.query;
    
    if (searchQuery) {
      search.$or = [
        { key: { $regex: searchQuery, $options: "i" } },
        { description: { $regex: searchQuery, $options: "i" } },
        { category: { $regex: searchQuery, $options: "i" } },
      ];
    }
    
    if (category) {
      search.category = category;
    }
    
    if (isActive !== undefined) {
      search.isActive = isActive === 'true';
    }

    // Get total count for pagination
    const ConstantsModel = (await import("../models/constants.model")).default;
    const totalCount = await ConstantsModel.countDocuments({ ...search });

    const constants = await constantsService.getConstants(
      {},
      search,
      skip,
      limit
    );
    
    // Calculate pagination metadata
    const currentPage = page ? parseInt(page as string) : Math.floor(skip / limit) + 1;
    const pagination = {
      currentPage,
      limit,
      skip,
      count: constants.length,
      totalCount,
      hasMore: constants.length === limit
    };
    
    return response.success(
      { constants, pagination },
      "Constants retrieved successfully"
    );
  } catch (err: any) {
    return next(
      new AppError(500, "Unable to get constants", err.message ?? undefined)
    );
  }
}

export default {
  readConstants,
};
