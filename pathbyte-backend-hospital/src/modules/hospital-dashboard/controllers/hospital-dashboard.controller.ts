import { Request, Response, NextFunction } from "express";
import { AppError } from "@src/libs/errors";
import HospitalDashboardService from "../services/hospital-dashboard.service";
import { RangeType } from "../types/hospital-dashboard.types";
import ConstantsService from "@src/modules/constants/services/constants.service";

const VALID_RANGES: RangeType[] = ["daily", "weekly", "monthly", "yearly"];

function parseDateRangeParams(req: Request, defaultRange: RangeType = "monthly"): { range: RangeType; from?: Date; to?: Date } | { error: string } {
  const range = ((req.query.range || req.query.period) as RangeType) || defaultRange;
  if (!VALID_RANGES.includes(range)) return { error: `Invalid range. Must be one of: ${VALID_RANGES.join(", ")}` };

  const fromStr = req.query.from as string | undefined;
  const toStr = req.query.to as string | undefined;

  if (fromStr || toStr) {
    if (!fromStr || !toStr) return { error: "Both 'from' and 'to' must be provided together" };
    const from = new Date(fromStr);
    const to = new Date(toStr);
    if (isNaN(from.getTime())) return { error: "Invalid 'from' date. Use YYYY-MM-DD format" };
    if (isNaN(to.getTime())) return { error: "Invalid 'to' date. Use YYYY-MM-DD format" };
    if (from > to) return { error: "'from' date must be before 'to' date" };
    return { range, from, to };
  }

  return { range };
}

async function getOverview(_req: Request, response: Response, next: NextFunction) {
  try {
    const data = await HospitalDashboardService.getOverview();
    return response.success(data, "Overview statistics retrieved successfully");
  } catch (err: any) {
    return next(new AppError(500, "Unable to get overview statistics", err.message ?? undefined));
  }
}

async function getVisitStatistics(request: Request, response: Response, next: NextFunction) {
  try {
    const parsed = parseDateRangeParams(request, "monthly");
    if ("error" in parsed) return next(new AppError(400, parsed.error));
    const data = await HospitalDashboardService.getVisitStatistics(parsed.range, parsed.from, parsed.to);
    return response.success(data, "Visit statistics retrieved successfully");
  } catch (err: any) {
    return next(new AppError(500, "Unable to get visit statistics", err.message ?? undefined));
  }
}

async function getDaycareStatistics(request: Request, response: Response, next: NextFunction) {
  try {
    const parsed = parseDateRangeParams(request, "monthly");
    if ("error" in parsed) return next(new AppError(400, parsed.error));
    const data = await HospitalDashboardService.getDaycareStatistics(parsed.range, parsed.from, parsed.to);
    return response.success(data, "Daycare statistics retrieved successfully");
  } catch (err: any) {
    return next(new AppError(500, "Unable to get daycare statistics", err.message ?? undefined));
  }
}

async function getRevenueStatistics(request: Request, response: Response, next: NextFunction) {
  try {
    const parsed = parseDateRangeParams(request, "monthly");
    if ("error" in parsed) return next(new AppError(400, parsed.error));
    const data = await HospitalDashboardService.getRevenueStatistics(parsed.range, parsed.from, parsed.to);
    return response.success(data, "Revenue statistics retrieved successfully");
  } catch (err: any) {
    return next(new AppError(500, "Unable to get revenue statistics", err.message ?? undefined));
  }
}

async function getVisitRevenueStatistics(request: Request, response: Response, next: NextFunction) {
  try {
    const parsed = parseDateRangeParams(request, "monthly");
    if ("error" in parsed) return next(new AppError(400, parsed.error));
    const doctorId = request.query.doctorId as string | undefined;
    const data = await HospitalDashboardService.getVisitRevenueStatistics(parsed.range, parsed.from, parsed.to, doctorId);
    return response.success(data, "Visit revenue statistics retrieved successfully");
  } catch (err: any) {
    return next(new AppError(500, "Unable to get visit revenue statistics", err.message ?? undefined));
  }
}

async function getDaycareRevenueStatistics(request: Request, response: Response, next: NextFunction) {
  try {
    const parsed = parseDateRangeParams(request, "monthly");
    if ("error" in parsed) return next(new AppError(400, parsed.error));
    const doctorId    = request.query.doctorId    as string | undefined;
    const procedureId = request.query.procedureId as string | undefined;
    const data = await HospitalDashboardService.getDaycareRevenueStatistics(parsed.range, parsed.from, parsed.to, doctorId, procedureId);
    return response.success(data, "Daycare revenue statistics retrieved successfully");
  } catch (err: any) {
    return next(new AppError(500, "Unable to get daycare revenue statistics", err.message ?? undefined));
  }
}

async function getRecentTransactions(request: Request, response: Response, next: NextFunction) {
  try {
    const limit = parseInt(request.query.limit as string) || 5;
    const data = await HospitalDashboardService.getRecentTransactions(limit);
    return response.success({ transactions: data, count: data.length }, "Recent transactions retrieved successfully");
  } catch (err: any) {
    return next(new AppError(500, "Unable to get recent transactions", err.message ?? undefined));
  }
}

async function getRecentVisits(request: Request, response: Response, next: NextFunction) {
  try {
    const limit = parseInt(request.query.limit as string) || 10;
    const data = await HospitalDashboardService.getRecentVisits(limit);
    return response.success({ visits: data, count: data.length }, "Recent visits retrieved successfully");
  } catch (err: any) {
    return next(new AppError(500, "Unable to get recent visits", err.message ?? undefined));
  }
}

async function verifyDashboardPassword(request: Request, response: Response, next: NextFunction) {
  try {
    const { password } = request.body;
    if (!password || typeof password !== "string") {
      return next(new AppError(400, "password is required"));
    }
    const verified = await ConstantsService.verifyDashboardPassword(password);
    if (!verified) {
      return next(new AppError(401, "Incorrect dashboard password"));
    }
    return response.success({ verified: true }, "Password verified");
  } catch (err: any) {
    return next(err);
  }
}

async function changeDashboardPassword(request: Request, response: Response, next: NextFunction) {
  try {
    const { currentPassword, newPassword } = request.body;
    const user = (request as any).hospitalUser;
    const isAdmin = user?.role === "ADMIN";

    if (!newPassword || typeof newPassword !== "string" || newPassword.trim().length < 4) {
      return next(new AppError(400, "New password must be at least 4 characters long"));
    }

    if (currentPassword) {
      const ok = await ConstantsService.verifyDashboardPassword(currentPassword);
      if (!ok) {
        return next(new AppError(401, "Current dashboard password is incorrect"));
      }
    } else if (!isAdmin) {
      return next(new AppError(403, "Current password is required to change dashboard password"));
    }

    await ConstantsService.updateConstant("DASHBOARD_PASSWORD", { value: newPassword.trim() });
    return response.success({ success: true }, "Dashboard password changed successfully");
  } catch (err: any) {
    return next(err);
  }
}

export default {
  getOverview,
  getVisitStatistics,
  getDaycareStatistics,
  getRecentTransactions,
  getRecentVisits,
  getRevenueStatistics,
  getVisitRevenueStatistics,
  getDaycareRevenueStatistics,
  verifyDashboardPassword,
  changeDashboardPassword,
};
