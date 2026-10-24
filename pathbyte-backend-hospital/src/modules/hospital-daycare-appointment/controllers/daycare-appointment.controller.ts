import { Request, Response, NextFunction } from "express";
import DaycareAppointmentService from "../services/daycare-appointment.service";

class DaycareAppointmentController {
  async getDaycareAppointment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const ownershipFilter = req.ownershipFilter || {};
      const appointment = await DaycareAppointmentService.getDaycareAppointmentById(id, ownershipFilter);
      res.success(appointment, "Day care appointment retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  async updateDaycareAppointment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const updates = req.body;
      const ownershipFilter = req.ownershipFilter || {};
      const appointment = await DaycareAppointmentService.updateDaycareAppointmentById(id, updates, ownershipFilter);
      res.success(appointment, "Day care appointment updated successfully");
    } catch (error) {
      next(error);
    }
  }

  async deleteDaycareAppointment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const ownershipFilter = req.ownershipFilter || {};
      await DaycareAppointmentService.deleteDaycareAppointmentById(id, ownershipFilter);
      res.success(null, "Day care appointment deleted successfully");
    } catch (error) {
      next(error);
    }
  }

  async searchByDaycareId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { daycareId } = req.params;
      const appointment = await DaycareAppointmentService.getDaycareAppointmentByDaycareId(daycareId);
      res.success(appointment, "Day care appointment retrieved successfully");
    } catch (error) {
      next(error);
    }
  }
}

export default new DaycareAppointmentController();
