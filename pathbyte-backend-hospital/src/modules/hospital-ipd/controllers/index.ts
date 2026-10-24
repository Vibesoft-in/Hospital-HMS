import { validate } from "jsonschema";
import { Request, Response, NextFunction } from "express";
import { APIError } from "@src/shared";
import HospitalIPDService from "../services/hospital-ipd.service";
import ipdNewSchema from "../validators/ipd-new.json";
import ipdUpdateSchema from "../validators/ipd-update.json";
import ipdDischargeSummarySchema from "../validators/ipd-discharge-summary.json";
import ipdDischargeSchema from "../validators/ipd-discharge.json";
import ipdLamaCancelSchema from "../validators/ipd-lama-cancel.json";
import ipdDorSchema from "../validators/ipd-dor.json";
import ipdDeathSchema from "../validators/ipd-death.json";
import ipdReferSchema from "../validators/ipd-refer.json";

function validationError(next: NextFunction, errors: any[]) {
  return next(new APIError(400, "Bad Request", errors.map((e) => e.stack).join(". ")));
}

class HospitalIPDController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    const v = validate(req.body, ipdNewSchema);
    if (!v.valid) { validationError(next, v.errors); return; }
    try {
      const createdBy = (req as any).hospitalUser?._id?.toString();
      const ipd = await HospitalIPDService.createIPD({ ...req.body, createdBy });
      res.success(ipd, "IPD created successfully", 201);
    } catch (error) { next(error); }
  }

  async calculatePrice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await HospitalIPDService.calculatePrice(
        req.body.billingCharges || [],
        req.body.discount || 0
      );
      res.success(result, "Price calculated successfully");
    } catch (error) { next(error); }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      let page = Math.max(1, parseInt(req.query.page as string) || 1);
      let limit = Math.max(1, parseInt(req.query.limit as string) || 10);
      const skip = (page - 1) * limit;

      const query: any = { ...(req.ownershipFilter || {}) };
      if (req.query.status) query.status = req.query.status;
      if (req.query.doctorId) query.doctorId = req.query.doctorId;
      if (req.query.patientId) query.patientId = req.query.patientId;
      if (req.query.bedId) query.bedId = req.query.bedId;
      if (req.query.isDischarge !== undefined) query.isDischarge = req.query.isDischarge === "true";
      if (req.query.paymentNotCleared !== undefined) query.paymentNotCleared = req.query.paymentNotCleared === "true";

      if (req.query.date) {
        const d = new Date(req.query.date as string);
        query.admissionDate = {
          $gte: new Date(new Date(d).setHours(0, 0, 0, 0)),
          $lte: new Date(new Date(d).setHours(23, 59, 59, 999)),
        };
      } else if (req.query.from || req.query.to) {
        query.admissionDate = {};
        if (req.query.from) query.admissionDate.$gte = new Date(new Date(req.query.from as string).setHours(0, 0, 0, 0));
        if (req.query.to) query.admissionDate.$lte = new Date(new Date(req.query.to as string).setHours(23, 59, 59, 999));
      } else if (req.query.startDate || req.query.endDate) {
        query.admissionDate = {};
        if (req.query.startDate) query.admissionDate.$gte = new Date(req.query.startDate as string);
        if (req.query.endDate) query.admissionDate.$lte = new Date(new Date(req.query.endDate as string).setHours(23, 59, 59, 999));
      }

      const search: any = {};
      if (req.query.search) {
        const searchTerm = req.query.search as string;
        search._patientNameSearch = searchTerm;
        search.$or = [
          { ipdId: { $regex: searchTerm, $options: "i" } },
          { "billingCharges.procedureName": { $regex: searchTerm, $options: "i" } },
        ];
      }

      // MRD filter — resolve patient by MRD then restrict to that patientId
      if (req.query.mrd) {
        const PatientModel = (await import("../../hospital-patient/models/hospital-patient.model")).default;
        const patient = await PatientModel.findOne(
          { mrd: req.query.mrd as string, isDeleted: { $ne: true } },
          { _id: 1 }
        ).lean();
        query.patientId = patient ? (patient as any)._id.toString() : "__no_match__";
      }

      const result = await HospitalIPDService.getIPDs(query, search, skip, limit);
      res.success(
        {
          ipds: result.ipds,
          pagination: {
            total: result.totalCount,
            page,
            limit,
            totalPages: Math.ceil(result.totalCount / limit),
            hasNextPage: page < Math.ceil(result.totalCount / limit),
            hasPrevPage: page > 1,
          },
        },
        "IPDs retrieved successfully"
      );
    } catch (error) { next(error); }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ownershipFilter = req.ownershipFilter || {};
      const ipd = await HospitalIPDService.getIPDById(req.params.id, ownershipFilter);
      res.success(ipd, "IPD retrieved successfully");
    } catch (error) { next(error); }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    const v = validate(req.body, ipdUpdateSchema);
    if (!v.valid) { validationError(next, v.errors); return; }
    try {
      const ownershipFilter = req.ownershipFilter || {};
      const ipd = await HospitalIPDService.updateIPD(req.params.id, req.body, ownershipFilter);
      res.success(ipd, "IPD updated successfully");
    } catch (error) { next(error); }
  }

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const deletedBy = (req as any).hospitalUser?._id?.toString();
      const ownershipFilter = req.ownershipFilter || {};
      await HospitalIPDService.deleteIPD(req.params.id, deletedBy, ownershipFilter);
      res.success(null, "IPD deleted successfully");
    } catch (error) { next(error); }
  }

  async addBillingCharge(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ipd = await HospitalIPDService.addBillingCharge(req.params.id, req.body);
      res.success(ipd, "Billing charge added successfully");
    } catch (error) { next(error); }
  }

  async addBedCharge(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { fromDate, toDate } = req.body;
      if (!fromDate || !toDate) {
        res.status(400).json({ message: "fromDate and toDate are required" });
        return;
      }
      const ipd = await HospitalIPDService.addBedCharge(req.params.id, new Date(fromDate), new Date(toDate));
      res.success(ipd, "Bed charge updated successfully");
    } catch (error) { next(error); }
  }

  async addNursingCharge(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { fromDate, toDate } = req.body;
      if (!fromDate || !toDate) {
        res.status(400).json({ message: "fromDate and toDate are required" });
        return;
      }
      const ipd = await HospitalIPDService.addNursingCharge(req.params.id, new Date(fromDate), new Date(toDate));
      res.success(ipd, "Nursing charge updated successfully");
    } catch (error) { next(error); }
  }

  async removeBillingCharge(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ipd = await HospitalIPDService.removeBillingCharge(req.params.id, req.params.chargeId);
      res.success(ipd, "Billing charge removed successfully");
    } catch (error) { next(error); }
  }

  async updateBillingChargeCompletion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { isCompleted } = req.body;
      if (typeof isCompleted !== "boolean") {
        return next(new APIError(400, "Bad Request", "isCompleted must be a boolean."));
      }
      const ipd = await HospitalIPDService.updateBillingChargeCompletion(req.params.id, req.params.chargeId, isCompleted);
      res.success(ipd, `Billing charge marked as ${isCompleted ? "completed" : "incomplete"}`);
    } catch (error) { next(error); }
  }

  async saveDischargeSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    const v = validate(req.body, ipdDischargeSummarySchema);
    if (!v.valid) { validationError(next, v.errors); return; }
    try {
      const ipd = await HospitalIPDService.saveDischargeSummary(req.params.id, req.body);
      res.success(ipd, "Discharge summary saved");
    } catch (error) { next(error); }
  }

  async discharge(req: Request, res: Response, next: NextFunction): Promise<void> {
    const v = validate(req.body, ipdDischargeSchema);
    if (!v.valid) { validationError(next, v.errors); return; }
    try {
      const finalizedBy = (req as any).hospitalUser?._id?.toString();
      const ipd = await HospitalIPDService.dischargeIPD(req.params.id, { ...req.body, finalizedBy });
      res.success(ipd, "Patient discharged successfully");
    } catch (error) { next(error); }
  }

  async lama(req: Request, res: Response, next: NextFunction): Promise<void> {
    const v = validate(req.body, ipdLamaCancelSchema);
    if (!v.valid) { validationError(next, v.errors); return; }
    try {
      const finalizedBy = (req as any).hospitalUser?._id?.toString();
      const ipd = await HospitalIPDService.lamaIPD(req.params.id, { ...req.body, finalizedBy });
      res.success(ipd, "IPD marked as LAMA");
    } catch (error) { next(error); }
  }

  async cancel(req: Request, res: Response, next: NextFunction): Promise<void> {
    const v = validate(req.body, ipdLamaCancelSchema);
    if (!v.valid) { validationError(next, v.errors); return; }
    try {
      const finalizedBy = (req as any).hospitalUser?._id?.toString();
      const ipd = await HospitalIPDService.cancelIPD(req.params.id, { ...req.body, finalizedBy });
      res.success(ipd, "IPD cancelled");
    } catch (error) { next(error); }
  }

  async dor(req: Request, res: Response, next: NextFunction): Promise<void> {
    const v = validate(req.body, ipdDorSchema);
    if (!v.valid) { validationError(next, v.errors); return; }
    try {
      const finalizedBy = (req as any).hospitalUser?._id?.toString();
      const ipd = await HospitalIPDService.dorIPD(req.params.id, { ...req.body, finalizedBy });
      res.success(ipd, "IPD marked as Discharge on Request (DOR)");
    } catch (error) { next(error); }
  }

  async death(req: Request, res: Response, next: NextFunction): Promise<void> {
    const v = validate(req.body, ipdDeathSchema);
    if (!v.valid) { validationError(next, v.errors); return; }
    try {
      const finalizedBy = (req as any).hospitalUser?._id?.toString();
      const ipd = await HospitalIPDService.deathIPD(req.params.id, { ...req.body, finalizedBy });
      res.success(ipd, "IPD marked as Death");
    } catch (error) { next(error); }
  }

  async refer(req: Request, res: Response, next: NextFunction): Promise<void> {
    const v = validate(req.body, ipdReferSchema);
    if (!v.valid) { validationError(next, v.errors); return; }
    try {
      const finalizedBy = (req as any).hospitalUser?._id?.toString();
      const ipd = await HospitalIPDService.referIPD(req.params.id, { ...req.body, finalizedBy });
      res.success(ipd, "IPD marked as Refer");
    } catch (error) { next(error); }
  }
}

export default new HospitalIPDController();
