import { successResponse } from "@src/libs/response";
import { Request, Response, NextFunction } from "express";


// extend Express Response type
declare module "express-serve-static-core" {
  interface Response {
    success: (data: any, message?: string, code?: number) => Response;
  }
}

function successMiddleware(_req: Request, res: Response, next: NextFunction) {
  res.success = function (data: any, message = "success", code = 200) {
    return res.status(code).json(successResponse(data, message, code));
  };
  next();
}

export default successMiddleware;
