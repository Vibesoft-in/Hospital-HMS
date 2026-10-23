import { Request, Response, NextFunction } from "express";
import { AppError } from "@src/libs/errors";
import { APIError } from "@src/shared";
import hospitalVisitExportService from "../services/hospital-visit-export.service";

async function exportHospitalVisits(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    // Build search — identical logic to readHospitalVisits
    const search: any = {};
    const {
      search: searchQuery,
      status,
      visitType,
      appointmentType,
      doctorId,
      mrd,
      date,
      createdFrom,
      createdTo,
    } = request.query;

    if (searchQuery) {
      search.$or = [
        { visitId:         { $regex: searchQuery, $options: "i" } },
        { mrd:             { $regex: searchQuery, $options: "i" } },
        { visitType:       { $regex: searchQuery, $options: "i" } },
        { appointmentType: { $regex: searchQuery, $options: "i" } },
        { reason:          { $regex: searchQuery, $options: "i" } },
      ];
      search._patientNameSearch = searchQuery as string;
    }

    if (status)          search.status          = status;
    if (visitType)       search.visitType       = visitType;
    if (appointmentType) search.appointmentType = appointmentType;
    if (doctorId)        search.doctorId        = doctorId;
    if (mrd)             search.mrd             = mrd;

    if (date) {
      const d = new Date(date as string);
      if (isNaN(d.getTime())) return next(new APIError(400, "Bad Request", "Invalid date format. Use YYYY-MM-DD"));
      search.visitDate = {
        $gte: new Date(new Date(d).setHours(0, 0, 0, 0)),
        $lt:  new Date(new Date(d).setHours(23, 59, 59, 999)),
      };
    }

    if (createdFrom || createdTo) {
      search.createdAt = {};
      if (createdFrom) { const f = new Date(createdFrom as string); f.setHours(0, 0, 0, 0);       search.createdAt.$gte = f; }
      if (createdTo)   { const t = new Date(createdTo   as string); t.setHours(23, 59, 59, 999);  search.createdAt.$lte = t; }
    }

    const buffer = await hospitalVisitExportService.exportToExcel(
      { ...(request.ownershipFilter || {}) },
      search,
      {
        from: (createdFrom as string) || undefined,
        to:   (createdTo   as string) || undefined,
      }
    );
    const filename = `visits_export_${new Date().toISOString().split("T")[0]}.xlsx`;

    response.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    response.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    response.setHeader("Content-Length", buffer.length);
    return response.send(buffer);
  } catch (err: any) {
    return next(new AppError(500, "Unable to export visits", err.message ?? undefined));
  }
}

export default { exportHospitalVisits };
