import { Request, Response, NextFunction } from "express";
import { AppError } from "@src/libs/errors";
import { APIError } from "@src/shared";
import { logger } from "@src/config/logger";
import { parseSkipLimit } from "@src/shared/parseSkipLimit";
import hospitalUserService from "../services/hospital-user.service";

async function getUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const skipResult = parseSkipLimit(req.query.skip, 10000, "skip");
    const limitResult = parseSkipLimit(req.query.limit, 100, "limit");
    
    if (skipResult instanceof APIError) return next(skipResult);
    if (limitResult instanceof APIError) return next(limitResult);
    
    const skip = skipResult || 0;
    const limit = limitResult || 50;
    const searchQuery = req.query.search as string | undefined;
    
    const { users, total } = await hospitalUserService.getUsers(skip, limit, searchQuery);
    
    return res.success(
      { users, total, skip, limit },
      "Users retrieved successfully"
    );
  } catch (err: any) {
    logger.error({ error: err.message }, "Failed to get hospital users");
    
    return next(
      new AppError(500, "Unable to get users", err.message ?? undefined)
    );
  }
}

export default { getUsers };
