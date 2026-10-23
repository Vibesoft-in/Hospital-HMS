import { Request, Response, NextFunction } from "express";
import HospitalWardService from "../services/hospital-ward.service";

class HospitalWardController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const createdBy = (req as any).hospitalUser?._id?.toString();
      const ward = await HospitalWardService.createWard({ ...req.body, createdBy });
      res.success(ward, "Ward created successfully", 201);
    } catch (error) { next(error); }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      let page = Math.max(1, parseInt(req.query.page as string) || 1);
      let limit = Math.min(1000, Math.max(1, parseInt(req.query.limit as string) || 10));
      const skip = (page - 1) * limit;
      const search: any = {};
      if (req.query.search) search.name = req.query.search as string;
      const result = await HospitalWardService.getWards({}, search, skip, limit);
      res.success(
        {
          wards: result.data,
          pagination: {
            total: result.totalCount,
            page,
            limit,
            totalPages: Math.ceil(result.totalCount / limit),
            hasNextPage: page < Math.ceil(result.totalCount / limit),
            hasPrevPage: page > 1,
          },
        },
        "Wards retrieved successfully"
      );
    } catch (error) { next(error); }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ward = await HospitalWardService.getWardById(req.params.id);
      res.success(ward, "Ward retrieved successfully");
    } catch (error) { next(error); }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ward = await HospitalWardService.updateWard(req.params.id, req.body);
      res.success(ward, "Ward updated successfully");
    } catch (error) { next(error); }
  }

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const deletedBy = (req as any).hospitalUser?._id?.toString();
      await HospitalWardService.deleteWard(req.params.id, deletedBy);
      res.success(null, "Ward deleted successfully");
    } catch (error) { next(error); }
  }
}

export default new HospitalWardController();
