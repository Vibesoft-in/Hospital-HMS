import { validate } from "jsonschema";
import { Request, Response, NextFunction } from "express";
import HospitalBedService from "../services/hospital-bed.service";
import { APIError } from "@src/shared";
import bedNewSchema from "../validators/bed-new.json";
import bedUpdateSchema from "../validators/bed-update.json";

function validationError(next: NextFunction, errors: any[]) {
  return next(new APIError(400, "Bad Request", errors.map((e) => e.stack).join(". ")));
}

class HospitalBedController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    const v = validate(req.body, bedNewSchema);
    if (!v.valid) { validationError(next, v.errors); return; }
    try {
      const createdBy = (req as any).hospitalUser?._id?.toString();
      const bed = await HospitalBedService.createBed({ ...req.body, createdBy });
      res.success(bed, "Bed created successfully", 201);
    } catch (error) { next(error); }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      let page = Math.max(1, parseInt(req.query.page as string) || 1);
      let limit = Math.min(1000, Math.max(1, parseInt(req.query.limit as string) || 10));
      const skip = (page - 1) * limit;

      const query: any = {};
      if (req.query.wardId) query.wardId = req.query.wardId;
      if (req.query.status) query.status = req.query.status;

      const search: any = {};
      if (req.query.search) search.bedNumber = req.query.search as string;

      const result = await HospitalBedService.getBeds(query, search, skip, limit);
      res.success(
        {
          beds: result.data,
          pagination: {
            total: result.totalCount,
            page,
            limit,
            totalPages: Math.ceil(result.totalCount / limit),
            hasNextPage: page < Math.ceil(result.totalCount / limit),
            hasPrevPage: page > 1,
          },
        },
        "Beds retrieved successfully"
      );
    } catch (error) { next(error); }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const bed = await HospitalBedService.getBedById(req.params.id);
      res.success(bed, "Bed retrieved successfully");
    } catch (error) { next(error); }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    const v = validate(req.body, bedUpdateSchema);
    if (!v.valid) { validationError(next, v.errors); return; }
    try {
      const bed = await HospitalBedService.updateBed(req.params.id, req.body);
      res.success(bed, "Bed updated successfully");
    } catch (error) { next(error); }
  }

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const deletedBy = (req as any).hospitalUser?._id?.toString();
      await HospitalBedService.deleteBed(req.params.id, deletedBy);
      res.success(null, "Bed deleted successfully");
    } catch (error) { next(error); }
  }
}

export default new HospitalBedController();
