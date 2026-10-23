import { Request, Response, NextFunction } from "express";
import { AppError } from "@src/libs/errors";
import daycareAppointmentExportService from "../services/daycare-appointment-export.service";

async function exportDaycareAppointments(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    // Build query — identical logic to getDaycareAppointments
    const query: any = { ...(request.ownershipFilter || {}) };
    if (request.query.status)             query.status             = request.query.status;
    if (request.query.daycareChargesType) query.daycareChargesType = request.query.daycareChargesType;
    if (request.query.doctorId)           query.doctorId           = request.query.doctorId;
    if (request.query.patientId)          query.patientId          = request.query.patientId;

    if (request.query.date) {
      const d = new Date(request.query.date as string);
      query.appointmentDate = {
        $gte: new Date(new Date(d).setHours(0, 0, 0, 0)),
        $lte: new Date(new Date(d).setHours(23, 59, 59, 999)),
      };
    } else if (request.query.startDate || request.query.endDate) {
      query.appointmentDate = {};
      if (request.query.startDate) query.appointmentDate.$gte = new Date(request.query.startDate as string);
      if (request.query.endDate)   query.appointmentDate.$lte = new Date(request.query.endDate   as string);
    }

    const search: any = {};
    if (request.query.search) {
      const term = request.query.search as string;
      search.$or = [
        { daycareId:     { $regex: term, $options: "i" } },
        { appointmentId: { $regex: term, $options: "i" } },
        { "procedures.procedureName": { $regex: term, $options: "i" } },
      ];
      search._patientNameSearch = term;
    }

    const startDate = (request.query.startDate || request.query.date) as string | undefined;
    const endDate   = (request.query.endDate   || request.query.date) as string | undefined;

    const buffer = await daycareAppointmentExportService.exportToExcel(query, search, {
      from: startDate || undefined,
      to:   endDate   || undefined,
    });
    const filename = `daycare_appointments_export_${new Date().toISOString().split("T")[0]}.xlsx`;

    response.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    response.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    response.setHeader("Content-Length", buffer.length);
    return response.send(buffer);
  } catch (err: any) {
    return next(new AppError(500, "Unable to export daycare appointments", err.message ?? undefined));
  }
}

export default { exportDaycareAppointments };
