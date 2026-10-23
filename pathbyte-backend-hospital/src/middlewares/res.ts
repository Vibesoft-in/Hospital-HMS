import { successResponse } from "@src/libs/response";
import { Request, Response, NextFunction } from "express";
import { sanitizeResponseData } from "@src/shared/role-sanitizer";

// extend Express Response type
declare module "express-serve-static-core" {
  interface Response {
    success: (data: any, message?: string, code?: number) => Response;
  }
}

function successMiddleware(req: Request, res: Response, next: NextFunction) {
  res.success = function (data: any, message = "success", code = 200) {
    const role = (req as any).hospitalUser?.role;
    const sanitizedData = sanitizeResponseData(data, role);
    return res.status(code).json(successResponse(sanitizedData, message, code));
  };
  next();
}

export default successMiddleware;
