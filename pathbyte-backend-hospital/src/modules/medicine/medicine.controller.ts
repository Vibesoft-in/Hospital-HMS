import { Request, Response, NextFunction } from "express";
import { APIError } from "@src/shared";
import { importMedicinesFromExcel, getMedicines, getMedicineTypes, exportMedicinesToExcel } from "./medicine.service";

export async function importMedicines(req: Request, res: Response, next: NextFunction) {
  try {
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) throw new APIError(400, "Bad Request", "No file uploaded. Send an Excel file in the 'file' field.");

    const allowed = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
      "application/vnd.ms-excel",                                           // .xls
    ];
    if (!allowed.includes(file.mimetype)) {
      throw new APIError(400, "Bad Request", "Only Excel files (.xlsx / .xls) are accepted.");
    }

    const result = await importMedicinesFromExcel(file.buffer);
    res.success(
      result,
      `Import complete. ${result.inserted} new medicines added, ${result.updated} updated, ${result.skipped} unchanged.`
    );
  } catch (err) {
    next(err);
  }
}

export async function listMedicines(req: Request, res: Response, next: NextFunction) {
  try {
    const search = ((req.query.search as string) ?? "").trim();
    const type   = ((req.query.type as string) ?? "").trim() || undefined;
    const pageNum = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit   = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip    = (pageNum - 1) * limit;

    const { medicines, totalCount } = await getMedicines(search, skip, limit, type);

    const totalPages = Math.ceil(totalCount / limit);

    res.success(
      {
        medicines,
        pagination: {
          currentPage: pageNum,
          limit,
          skip,
          count: medicines.length,
          totalCount,
          totalPages,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1,
        },
      },
      "Medicines retrieved successfully"
    );
  } catch (err) {
    next(err);
  }
}

export async function listMedicineTypes(_req: Request, res: Response, next: NextFunction) {
  try {
    const types = await getMedicineTypes();
    res.success({ types }, "Medicine types retrieved successfully");
  } catch (err) {
    next(err);
  }
}

export async function exportMedicines(_req: Request, res: Response, next: NextFunction) {
  try {
    const buffer = await exportMedicinesToExcel();
    const filename = `medicines-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(Buffer.from(buffer));
  } catch (err) {
    next(err);
  }
}
