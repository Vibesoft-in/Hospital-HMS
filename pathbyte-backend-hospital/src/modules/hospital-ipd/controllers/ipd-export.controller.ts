import { Request, Response, NextFunction } from "express";
import { AppError } from "@src/libs/errors";
import hospitalIPDExportService from "../services/hospital-ipd-export.service";

async function exportIPDs(req: Request, res: Response, next: NextFunction) {
  try {
    // Build query — identical logic to the list controller
    const query: any = {};
    if (req.query.status)             query.status             = req.query.status;
    if (req.query.doctorId)           query.doctorId           = req.query.doctorId;
    if (req.query.patientId)          query.patientId          = req.query.patientId;
    if (req.query.bedId)              query.bedId              = req.query.bedId;
    if (req.query.isDischarge !== undefined) {
      query.isDischarge = req.query.isDischarge === "true";
    }
    if (req.query.paymentNotCleared !== undefined) {
      query.paymentNotCleared = req.query.paymentNotCleared === "true";
    }

    if (req.query.date) {
      const d = new Date(req.query.date as string);
      query.admissionDate = {
        $gte: new Date(new Date(d).setHours(0, 0, 0, 0)),
        $lte: new Date(new Date(d).setHours(23, 59, 59, 999)),
      };
    } else if (req.query.from || req.query.to) {
      query.admissionDate = {};
      if (req.query.from) query.admissionDate.$gte = new Date(new Date(req.query.from as string).setHours(0, 0, 0, 0));
      if (req.query.to)   query.admissionDate.$lte = new Date(new Date(req.query.to   as string).setHours(23, 59, 59, 999));
    } else if (req.query.startDate || req.query.endDate) {
      query.admissionDate = {};
      if (req.query.startDate) query.admissionDate.$gte = new Date(req.query.startDate as string);
      if (req.query.endDate)   query.admissionDate.$lte = new Date(new Date(req.query.endDate as string).setHours(23, 59, 59, 999));
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

    const buffer = await hospitalIPDExportService.exportToExcel(query, search, {
      from: (req.query.from || req.query.startDate) as string | undefined,
      to:   (req.query.to   || req.query.endDate)   as string | undefined,
    });
    const filename = `ipd_export_${new Date().toISOString().split("T")[0]}.xlsx`;

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", buffer.length);
    return res.send(buffer);
  } catch (err: any) {
    return next(new AppError(500, "Unable to export IPDs", err.message ?? undefined));
  }
}

export default { exportIPDs };
