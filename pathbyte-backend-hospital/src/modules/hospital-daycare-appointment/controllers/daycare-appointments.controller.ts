import { Request, Response, NextFunction } from "express";
import DaycareAppointmentService from "../services/daycare-appointment.service";
import HospitalProcedureModel from "../../hospital-procedure/models/hospital-procedure.model";

class DaycareAppointmentsController {
  async createDaycareAppointment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const createdBy = (req as any).hospitalUser?._id?.toString();
      const appointment = await DaycareAppointmentService.createDaycareAppointment({ ...req.body, createdBy });
      res.success(appointment, "Day care appointment created successfully", 201);
    } catch (error) {
      next(error);
    }
  }

  async createDaycareAppointmentWithTransaction(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const createdBy = (req as any).hospitalUser?._id?.toString();
      const appointment = await DaycareAppointmentService.createDaycareAppointmentWithTransaction({ ...req.body, createdBy });
      res.success(appointment, "Day care appointment created successfully with transaction", 201);
    } catch (error) {
      next(error);
    }
  }

  async createDaycareAppointmentWithPatient(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const createdBy = (req as any).hospitalUser?._id?.toString();
      const appointment = await DaycareAppointmentService.createDaycareAppointmentWithPatient({ ...req.body, createdBy });
      res.success(appointment, "Day care appointment created successfully with new patient", 201);
    } catch (error) {
      next(error);
    }
  }

  async getDaycareAppointments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Parse pagination params (page-based, not skip-based)
      let page = parseInt(req.query.page as string) || 1;
      let limit = parseInt(req.query.limit as string) || 10;
      
      if (page < 1) page = 1;
      if (limit < 1) limit = 10;
      
      const skip = (page - 1) * limit;
      
      // Build query filters — merge ownership filter
      const query: any = { ...(req.ownershipFilter || {}) };
      if (req.query.status) query.status = req.query.status;
      if (req.query.daycareChargesType) query.daycareChargesType = req.query.daycareChargesType;
      if (req.query.doctorId) query.doctorId = req.query.doctorId;
      if (req.query.patientId) query.patientId = req.query.patientId;
      
      // Single date filter (exact day)
      if (req.query.date) {
        const d = new Date(req.query.date as string);
        query.appointmentDate = {
          $gte: new Date(new Date(d).setHours(0, 0, 0, 0)),
          $lte: new Date(new Date(d).setHours(23, 59, 59, 999)),
        };
      } else if (req.query.startDate || req.query.endDate) {
        // Date range filters
        query.appointmentDate = {};
        if (req.query.startDate) {
          query.appointmentDate.$gte = new Date(req.query.startDate as string);
        }
        if (req.query.endDate) {
          query.appointmentDate.$lte = new Date(req.query.endDate as string);
        }
      }
      
      // Search filters
      const search: any = {};
      if (req.query.search) {
        const searchTerm = req.query.search as string;
        search.$or = [
          { daycareId:    { $regex: searchTerm, $options: "i" } },
          { appointmentId:{ $regex: searchTerm, $options: "i" } },
          { "procedures.procedureName": { $regex: searchTerm, $options: "i" } },
        ];
        search._patientNameSearch = searchTerm;
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

      // isMRPatient filter — resolve matching patientIds from HMS patients
      if (req.query.isMRPatient !== undefined) {
        const isMR = req.query.isMRPatient === "true";
        const PatientModel = (await import("../../hospital-patient/models/hospital-patient.model")).default;
        const matchingPatients = await PatientModel.find(
          { isMRPatient: isMR, isDeleted: { $ne: true } },
          { _id: 1 }
        ).lean();
        query.patientId = { $in: matchingPatients.map((p: any) => p._id.toString()) };
      }

      // procedureCategory filter — resolve matching procedureIds then filter appointments
      if (req.query.procedureCategory) {
        const matchingProcedures = await HospitalProcedureModel.find(
          {
            category: { $regex: req.query.procedureCategory as string, $options: "i" },
            isDeleted: { $ne: true },
          },
          { _id: 1 }
        ).lean();
        const procedureIds = matchingProcedures.map((p: any) => p._id.toString());
        query["procedures.procedureId"] = { $in: procedureIds };
      }

      // procedureIds filter — multi-filter by specific procedure _ids (comma-separated)
      if (req.query.procedureIds) {
        const procedureIdsArray = (req.query.procedureIds as string).split(',').map(id => id.trim()).filter(Boolean);
        if (procedureIdsArray.length > 0) {
          query["procedures.procedureId"] = { $in: procedureIdsArray };
        }
      }

      const result = await DaycareAppointmentService.getDaycareAppointments(query, search, skip, limit);
      const total = result.totalCount || 0;
      
      res.success(
        {
          appointments: result.appointments,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            hasNextPage: page < Math.ceil(total / limit),
            hasPrevPage: page > 1,
          },
        },
        "Day care appointments retrieved successfully"
      );
    } catch (error) {
      next(error);
    }
  }

  async calculatePrice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const priceData = await DaycareAppointmentService.calculatePrice(req.body);
      res.success(priceData, "Price calculated successfully");
    } catch (error) {
      next(error);
    }
  }

  async getAppointmentsByPatient(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { patientId } = req.params;
      const appointments = await DaycareAppointmentService.getAppointmentsByPatient(patientId);
      res.success(appointments, "Patient day care appointments retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  async getAppointmentsByDoctor(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { doctorId } = req.params;
      const date = req.query.date ? new Date(req.query.date as string) : undefined;
      const appointments = await DaycareAppointmentService.getAppointmentsByDoctor(doctorId, date);
      res.success(appointments, "Doctor day care appointments retrieved successfully");
    } catch (error) {
      next(error);
    }
  }
}

export default new DaycareAppointmentsController();
