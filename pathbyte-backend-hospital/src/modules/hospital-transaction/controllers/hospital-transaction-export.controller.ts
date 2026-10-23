import { Request, Response, NextFunction } from "express";
import { AppError } from "@src/libs/errors";
import { APIError } from "@src/shared";
import hospitalTransactionExportService from "../services/hospital-transaction-export.service";

async function exportHospitalTransactions(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    const search: any = {};
    const {
      search: searchQuery,
      transactionType,
      paymentMode,
      visitId,
      doctorId,
      patientId,
      department,
      visitType,
      sourceType,
      date,
      dateFrom,
      dateTo,
      createdFrom,
      createdTo,
      amountFrom,
      amountTo,
    } = request.query;

    // Validate sourceType if provided
    const validSourceTypes = ["visit", "daycareAppointment", "IPD"];
    if (sourceType && !validSourceTypes.includes(sourceType as string)) {
      return next(new APIError(400, "Bad Request", `Invalid sourceType. Must be one of: ${validSourceTypes.join(", ")}`));
    }

    if (searchQuery) {
      search.$or = [
        { transactionId: { $regex: searchQuery, $options: "i" } },
        { referenceNo:   { $regex: searchQuery, $options: "i" } },
        { visitId:       { $regex: searchQuery, $options: "i" } },
      ];
    }

    if (transactionType) search.transactionType = transactionType;
    if (paymentMode)     search.paymentMode     = paymentMode;
    if (visitId)         search.visitId         = visitId;

    // Date range filter for transactionDate (supports date, dateFrom, dateTo; defaults to current date if dateTo not provided)
    const startDateStr = (date || dateFrom) as string;
    if (startDateStr || dateTo) {
      search.transactionDate = {};
      if (startDateStr) {
        const f = new Date(startDateStr);
        if (isNaN(f.getTime())) return next(new APIError(400, "Bad Request", "Invalid date format. Use YYYY-MM-DD"));
        f.setHours(0, 0, 0, 0);
        search.transactionDate.$gte = f;
      }
      if (dateTo) {
        const t = new Date(dateTo as string);
        if (isNaN(t.getTime())) return next(new APIError(400, "Bad Request", "Invalid dateTo date. Use YYYY-MM-DD"));
        t.setHours(23, 59, 59, 999);
        search.transactionDate.$lte = t;
      } else if (startDateStr) {
        const t = new Date();
        t.setHours(23, 59, 59, 999);
        search.transactionDate.$lte = t;
      }
    }

    if (createdFrom || createdTo) {
      search.createdAt = {};
      if (createdFrom) {
        const f = new Date(createdFrom as string);
        if (isNaN(f.getTime())) return next(new APIError(400, "Bad Request", "Invalid createdFrom date. Use YYYY-MM-DD"));
        f.setHours(0, 0, 0, 0);
        search.createdAt.$gte = f;
      }
      if (createdTo) {
        const t = new Date(createdTo as string);
        if (isNaN(t.getTime())) return next(new APIError(400, "Bad Request", "Invalid createdTo date. Use YYYY-MM-DD"));
        t.setHours(23, 59, 59, 999);
        search.createdAt.$lte = t;
      }
    }

    if (amountFrom || amountTo) {
      search.amount = {};
      if (amountFrom) search.amount.$gte = parseFloat(amountFrom as string);
      if (amountTo)   search.amount.$lte = parseFloat(amountTo   as string);
    }

    const joinFilters: Record<string, string> = {};
    if (doctorId)   joinFilters.doctorId   = doctorId as string;
    if (patientId)  joinFilters.patientId  = patientId as string;
    if (department) joinFilters.department = department as string;
    if (visitType)  joinFilters.visitType  = visitType as string;
    if (sourceType) joinFilters.sourceType = sourceType as string;

    const exportFrom = createdFrom
      ? String(createdFrom)
      : startDateStr
      ? String(startDateStr)
      : undefined;

    const exportTo = createdTo
      ? String(createdTo)
      : dateTo
      ? String(dateTo)
      : exportFrom
      ? new Date().toISOString().split("T")[0]
      : undefined;

    const buffer = await hospitalTransactionExportService.exportToExcel({}, search, joinFilters, {
      from: exportFrom,
      to:   exportTo,
    });
    const filename = `transactions_export_${new Date().toISOString().split("T")[0]}.xlsx`;

    response.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    response.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    response.setHeader("Content-Length", buffer.length);
    return response.send(buffer);
  } catch (err: any) {
    return next(new AppError(500, "Unable to export transactions", err.message ?? undefined));
  }
}

export default { exportHospitalTransactions };
