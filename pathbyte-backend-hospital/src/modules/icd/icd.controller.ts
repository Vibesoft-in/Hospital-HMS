import { Request, Response, NextFunction } from "express";
import { APIError } from "@src/shared";
import { searchICD } from "./icd.service";

export async function searchDiagnosis(req: Request, res: Response, next: NextFunction) {
  try {
    const term = (req.query.term as string)?.trim();

    if (!term || term.length < 2) {
      throw new APIError(400, "Bad Request", "Query param 'term' must be at least 2 characters.");
    }

    const results = await searchICD(term);
    res.json({ success: true, data: results });
  } catch (err: any) {
    // Surface WHO API errors clearly
    if (err.response) {
      return next(new APIError(502, "ICD API Error", err.response.data?.detail ?? "Failed to reach ICD API."));
    }
    next(err);
  }
}
