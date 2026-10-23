import { ZodObject } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../libs/errors';

export const validate =
  (schema: ZodObject) =>
  (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse({ body: req.body, query: req.query, params: req.params });
    if (!result.success) {
      return next(new AppError(400, 'Validation failed', 'VALIDATION_ERROR'));
    }
    if (result.data) {
      const data: any = result.data;
      if (data.body) req.body = data.body;
      if (data.params) req.params = data.params;
      if (data.query && req.query) {
        for (const k of Object.keys(req.query)) delete (req.query as any)[k];
        Object.assign(req.query, data.query);
      }
    }
    next();
  };