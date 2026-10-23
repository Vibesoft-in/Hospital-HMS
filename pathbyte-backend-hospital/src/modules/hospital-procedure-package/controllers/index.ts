import { Request, Response, NextFunction } from "express";
import HospitalProcedurePackageService from "../services/hospital-procedure-package.service";

class HospitalProcedurePackageController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const createdBy = (req as any).hospitalUser?._id?.toString();
      const pkg = await HospitalProcedurePackageService.createPackage({ ...req.body, createdBy });
      res.success(pkg, "Procedure package created successfully", 201);
    } catch (error) { next(error); }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      let page = Math.max(1, parseInt(req.query.page as string) || 1);
      let limit = Math.min(1000, Math.max(1, parseInt(req.query.limit as string) || 10));
      const skip = (page - 1) * limit;
      const search: any = {};
      if (req.query.search) search.name = req.query.search as string;
      const result = await HospitalProcedurePackageService.getPackages({}, search, skip, limit);
      res.success(
        {
          packages: result.data,
          pagination: {
            total: result.totalCount,
            page,
            limit,
            totalPages: Math.ceil(result.totalCount / limit),
            hasNextPage: page < Math.ceil(result.totalCount / limit),
            hasPrevPage: page > 1,
          },
        },
        "Procedure packages retrieved successfully"
      );
    } catch (error) { next(error); }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const pkg = await HospitalProcedurePackageService.getPackageById(req.params.id);
      res.success(pkg, "Procedure package retrieved successfully");
    } catch (error) { next(error); }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const pkg = await HospitalProcedurePackageService.updatePackage(req.params.id, req.body);
      res.success(pkg, "Procedure package updated successfully");
    } catch (error) { next(error); }
  }

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const deletedBy = (req as any).hospitalUser?._id?.toString();
      await HospitalProcedurePackageService.deletePackage(req.params.id, deletedBy);
      res.success(null, "Procedure package deleted successfully");
    } catch (error) { next(error); }
  }
}

export default new HospitalProcedurePackageController();
