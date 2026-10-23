import HospitalDoctorModel from "@src/modules/hospital-doctor/models/hospital-doctor.model";
import HospitalPatientModel from "@src/modules/hospital-patient/models/hospital-patient.model";
import HospitalVisitModel from "@src/modules/hospital-visit/models/hospital-visit.model";
import HospitalTransactionModel from "@src/modules/hospital-transaction/models/hospital-transaction.model";
import DaycareAppointmentModel from "@src/modules/hospital-daycare-appointment/models/daycare-appointment.model";
import {
  startOfDay, subDays, subWeeks, subMonths, subYears,
  startOfWeek, startOfMonth, startOfYear,
  addDays, addWeeks, addMonths, addYears,
} from "date-fns";
import { calculateGrowthRate } from "@src/libs/growth-rate";
import {
  OverviewStats,
  VisitStatistics,
  DaycareStatistics,
  RecentTransaction,
  RecentVisit,
  RevenueStatistics,
} from "../types/hospital-dashboard.types";

type RangeType = "daily" | "weekly" | "monthly" | "yearly";

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = (n: number) => String(n).padStart(2, "0");
const getOrdinal = (n: number) => {
  if (n === 1) return "1st";
  if (n === 2) return "2nd";
  if (n === 3) return "3rd";
  return n + "th";
};

function resolveDateRange(range: RangeType, from?: Date, to?: Date): { startDate: Date; endDate: Date } {
  const now = new Date();
  if (from && to) return { startDate: from, endDate: to };
  switch (range) {
    case "daily":   return { startDate: subDays(now, 6), endDate: now };
    case "weekly":  return { startDate: subWeeks(now, 11), endDate: now };
    case "monthly": return { startDate: subMonths(now, 11), endDate: now };
    case "yearly":  return { startDate: subYears(now, 6), endDate: now };
  }
}

function generatePeriods(range: RangeType, startDate: Date, endDate: Date) {
  const periods: { label: string; date: string; year: number; month?: number; day?: number; week?: number }[] = [];

  if (range === "daily") {
    let cursor = startOfDay(startDate);
    const end = startOfDay(endDate);
    while (cursor <= end) {
      const y = cursor.getFullYear(), m = cursor.getMonth() + 1, d = cursor.getDate();
      periods.push({ label: dayNames[cursor.getDay()], date: `${pad(d)}-${pad(m)}-${y}`, year: y, month: m, day: d });
      cursor = addDays(cursor, 1);
    }
  } else if (range === "weekly") {
    let cursor = startOfWeek(startDate, { weekStartsOn: 0 });
    const end = startOfWeek(endDate, { weekStartsOn: 0 });
    while (cursor <= end) {
      const firstDayOfYear = new Date(cursor.getFullYear(), 0, 1);
      const pastDays = (cursor.getTime() - firstDayOfYear.getTime()) / 86400000;
      const weekOfYear = Math.floor((pastDays + firstDayOfYear.getDay()) / 7);
      let weekOfMonth = Math.ceil((cursor.getDate() + 6 - cursor.getDay()) / 7);
      if (weekOfMonth < 1) weekOfMonth = 1;
      periods.push({
        label: `${monthNames[cursor.getMonth()]} ${getOrdinal(weekOfMonth)} week`,
        date: `${getOrdinal(weekOfMonth)} week ${monthNames[cursor.getMonth()]} ${cursor.getFullYear()}`,
        year: cursor.getFullYear(),
        week: weekOfYear,
      });
      cursor = addWeeks(cursor, 1);
    }
  } else if (range === "monthly") {
    let cursor = startOfMonth(startDate);
    const end = startOfMonth(endDate);
    while (cursor <= end) {
      const y = cursor.getFullYear(), m = cursor.getMonth() + 1;
      periods.push({ label: monthNames[cursor.getMonth()], date: `${pad(m)}-${y}`, year: y, month: m });
      cursor = addMonths(cursor, 1);
    }
  } else {
    let cursor = startOfYear(startDate);
    const end = startOfYear(endDate);
    while (cursor <= end) {
      const y = cursor.getFullYear();
      periods.push({ label: String(y), date: String(y), year: y });
      cursor = addYears(cursor, 1);
    }
  }

  return periods;
}

class HospitalDashboardService {
  async getOverview(): Promise<OverviewStats> {
    const today = startOfDay(new Date());
    const currentStart = subDays(today, 7);
    const prevStart = subDays(today, 14);

    // Shared stages: only count transactions linked to a real visit or daycare (excludes orphans)
    const validTransactionStages = [
      {
        $addFields: {
          _visitObjId: {
            $cond: {
              if: {
                $and: [
                  { $ne: ["$visitId", null] },
                  { $ne: ["$visitId", ""] },
                  { $regexMatch: { input: "$visitId", regex: /^[0-9a-fA-F]{24}$/ } },
                ],
              },
              then: { $toObjectId: "$visitId" },
              else: null,
            },
          },
        },
      },
      { $lookup: { from: "hospitalvisits",      localField: "_visitObjId", foreignField: "_id", as: "_vm", pipeline: [{ $match: { isDeleted: { $ne: true } } }] } },
      { $lookup: { from: "daycareappointments", localField: "_visitObjId", foreignField: "_id", as: "_dm", pipeline: [{ $match: { isDeleted: { $ne: true } } }] } },
      { $match: { $or: [{ "_vm.0": { $exists: true } }, { "_dm.0": { $exists: true } }] } },
    ];

    const [totalDoctors, totalPatients, totalVisits, totalRevenue] = await Promise.all([
      HospitalDoctorModel.countDocuments({ isDeleted: { $ne: true } }),
      HospitalPatientModel.countDocuments({ isDeleted: { $ne: true } }),
      HospitalVisitModel.countDocuments({ isDeleted: { $ne: true } }),
      HospitalTransactionModel.aggregate([
        { $match: { transactionType: { $in: ["Payment", "Advance"] }, isDeleted: { $ne: true } } },
        ...validTransactionStages,
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
    ]);

    const [currentDoctors, currentPatients, currentVisits, currentRevenue] = await Promise.all([
      HospitalDoctorModel.countDocuments({ isDeleted: { $ne: true }, createdAt: { $gte: currentStart, $lt: today } }),
      HospitalPatientModel.countDocuments({ isDeleted: { $ne: true }, createdAt: { $gte: currentStart, $lt: today } }),
      HospitalVisitModel.countDocuments({ isDeleted: { $ne: true }, createdAt: { $gte: currentStart, $lt: today } }),
      HospitalTransactionModel.aggregate([
        { $match: { transactionType: { $in: ["Payment", "Advance"] }, transactionDate: { $gte: currentStart, $lt: today }, isDeleted: { $ne: true } } },
        ...validTransactionStages,
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
    ]);

    const [prevDoctors, prevPatients, prevVisits, prevRevenue] = await Promise.all([
      HospitalDoctorModel.countDocuments({ isDeleted: { $ne: true }, createdAt: { $gte: prevStart, $lt: currentStart } }),
      HospitalPatientModel.countDocuments({ isDeleted: { $ne: true }, createdAt: { $gte: prevStart, $lt: currentStart } }),
      HospitalVisitModel.countDocuments({ isDeleted: { $ne: true }, createdAt: { $gte: prevStart, $lt: currentStart } }),
      HospitalTransactionModel.aggregate([
        { $match: { transactionType: { $in: ["Payment", "Advance"] }, transactionDate: { $gte: prevStart, $lt: currentStart }, isDeleted: { $ne: true } } },
        ...validTransactionStages,
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
    ]);

    return {
      doctors: { total: totalDoctors, growthRate: calculateGrowthRate(currentDoctors, prevDoctors) },
      patients: { total: totalPatients, growthRate: calculateGrowthRate(currentPatients, prevPatients) },
      visits: { total: totalVisits, growthRate: calculateGrowthRate(currentVisits, prevVisits) },
      revenue: {
        total: totalRevenue[0]?.total || 0,
        growthRate: calculateGrowthRate(currentRevenue[0]?.total || 0, prevRevenue[0]?.total || 0),
      },
    };
  }

  async getVisitStatistics(range: RangeType = "monthly", from?: Date, to?: Date): Promise<VisitStatistics> {
    const { startDate, endDate } = resolveDateRange(range, from, to);

    const [all, scheduled, inProgress, completed, cancelled, noShow] = await Promise.all([
      HospitalVisitModel.countDocuments({ isDeleted: { $ne: true } }),
      HospitalVisitModel.countDocuments({ isDeleted: { $ne: true }, status: "Scheduled" }),
      HospitalVisitModel.countDocuments({ isDeleted: { $ne: true }, status: "In Progress" }),
      HospitalVisitModel.countDocuments({ isDeleted: { $ne: true }, status: "Completed" }),
      HospitalVisitModel.countDocuments({ isDeleted: { $ne: true }, status: "Cancelled" }),
      HospitalVisitModel.countDocuments({ isDeleted: { $ne: true }, status: "No Show" }),
    ]);

    let groupId: any;
    if (range === "daily") {
      groupId = { year: { $year: "$createdAt" }, month: { $month: "$createdAt" }, day: { $dayOfMonth: "$createdAt" } };
    } else if (range === "weekly") {
      groupId = { week: { $week: "$createdAt" }, year: { $year: "$createdAt" } };
    } else if (range === "monthly") {
      groupId = { month: { $month: "$createdAt" }, year: { $year: "$createdAt" } };
    } else {
      groupId = { year: { $year: "$createdAt" } };
    }

    const rawData = await HospitalVisitModel.aggregate([
      { $match: { isDeleted: { $ne: true }, createdAt: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: groupId,
          scheduled: { $sum: { $cond: [{ $eq: ["$status", "Scheduled"] }, 1, 0] } },
          inProgress: { $sum: { $cond: [{ $eq: ["$status", "In Progress"] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $eq: ["$status", "Completed"] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ["$status", "Cancelled"] }, 1, 0] } },
          noShow: { $sum: { $cond: [{ $eq: ["$status", "No Show"] }, 1, 0] } },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1, "_id.week": 1 } },
    ]);

    const periods = generatePeriods(range, startDate, endDate);

    const periodData = periods.map((p) => {
      let data: any;
      if (range === "daily") {
        data = rawData.find((d) => d._id.year === p.year && d._id.month === p.month && d._id.day === p.day);
      } else if (range === "weekly") {
        data = rawData.find((d) => d._id.year === p.year && d._id.week === p.week);
      } else if (range === "monthly") {
        data = rawData.find((d) => d._id.year === p.year && d._id.month === p.month);
      } else {
        data = rawData.find((d) => d._id.year === p.year);
      }
      return {
        period: p.label,
        date: p.date,
        scheduled: data?.scheduled || 0,
        inProgress: data?.inProgress || 0,
        completed: data?.completed || 0,
        cancelled: data?.cancelled || 0,
        noShow: data?.noShow || 0,
        total: (data?.scheduled || 0) + (data?.inProgress || 0) + (data?.completed || 0) + (data?.cancelled || 0) + (data?.noShow || 0),
      };
    });

    return { summary: { all, scheduled, inProgress, completed, cancelled, noShow }, periodData, range };
  }

  async getDaycareStatistics(range: RangeType = "monthly", from?: Date, to?: Date): Promise<DaycareStatistics> {
    const { startDate, endDate } = resolveDateRange(range, from, to);

    const [all, scheduled, inProgress, completed, cancelled] = await Promise.all([
      DaycareAppointmentModel.countDocuments({ isDeleted: { $ne: true } }),
      DaycareAppointmentModel.countDocuments({ isDeleted: { $ne: true }, status: "Scheduled" }),
      DaycareAppointmentModel.countDocuments({ isDeleted: { $ne: true }, status: "In Progress" }),
      DaycareAppointmentModel.countDocuments({ isDeleted: { $ne: true }, status: "Completed" }),
      DaycareAppointmentModel.countDocuments({ isDeleted: { $ne: true }, status: "Cancelled" }),
    ]);

    let groupId: any;
    if (range === "daily") {
      groupId = { year: { $year: "$appointmentDate" }, month: { $month: "$appointmentDate" }, day: { $dayOfMonth: "$appointmentDate" } };
    } else if (range === "weekly") {
      groupId = { week: { $week: "$appointmentDate" }, year: { $year: "$appointmentDate" } };
    } else if (range === "monthly") {
      groupId = { month: { $month: "$appointmentDate" }, year: { $year: "$appointmentDate" } };
    } else {
      groupId = { year: { $year: "$appointmentDate" } };
    }

    const rawData = await DaycareAppointmentModel.aggregate([
      { $match: { isDeleted: { $ne: true }, appointmentDate: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: groupId,
          scheduled:  { $sum: { $cond: [{ $eq: ["$status", "Scheduled"] },   1, 0] } },
          inProgress: { $sum: { $cond: [{ $eq: ["$status", "In Progress"] }, 1, 0] } },
          completed:  { $sum: { $cond: [{ $eq: ["$status", "Completed"] },   1, 0] } },
          cancelled:  { $sum: { $cond: [{ $eq: ["$status", "Cancelled"] },   1, 0] } },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1, "_id.week": 1 } },
    ]);

    const periods = generatePeriods(range, startDate, endDate);

    const periodData = periods.map((p) => {
      let data: any;
      if (range === "daily") {
        data = rawData.find((d) => d._id.year === p.year && d._id.month === p.month && d._id.day === p.day);
      } else if (range === "weekly") {
        data = rawData.find((d) => d._id.year === p.year && d._id.week === p.week);
      } else if (range === "monthly") {
        data = rawData.find((d) => d._id.year === p.year && d._id.month === p.month);
      } else {
        data = rawData.find((d) => d._id.year === p.year);
      }
      return {
        period: p.label,
        date: p.date,
        scheduled:  data?.scheduled  || 0,
        inProgress: data?.inProgress || 0,
        completed:  data?.completed  || 0,
        cancelled:  data?.cancelled  || 0,
        total: (data?.scheduled || 0) + (data?.inProgress || 0) + (data?.completed || 0) + (data?.cancelled || 0),
      };
    });

    return { summary: { all, scheduled, inProgress, completed, cancelled }, periodData, range };
  }

  async getRevenueStatistics(range: RangeType = "monthly", from?: Date, to?: Date): Promise<RevenueStatistics> {
    return this._getRevenueBySource("all", range, from, to);
  }

  async getVisitRevenueStatistics(range: RangeType = "monthly", from?: Date, to?: Date, doctorId?: string): Promise<RevenueStatistics> {
    return this._getRevenueBySource("visit", range, from, to, { doctorId });
  }

  async getDaycareRevenueStatistics(range: RangeType = "monthly", from?: Date, to?: Date, doctorId?: string, procedureId?: string): Promise<RevenueStatistics> {
    return this._getRevenueBySource("daycare", range, from, to, { doctorId, procedureId });
  }

  private async _getRevenueBySource(
    source: "all" | "visit" | "daycare",
    range: RangeType,
    from?: Date,
    to?: Date,
    filters: { doctorId?: string; procedureId?: string } = {}
  ): Promise<RevenueStatistics> {
    const { startDate, endDate } = resolveDateRange(range, from, to);

    // Build the source filter using $lookup to distinguish visit vs daycare transactions
    const sourcePipeline: any[] = [
      { $match: { transactionType: { $in: ["Payment", "Advance"] }, isDeleted: { $ne: true } } },
    ];

    // Shared stage: convert visitId to ObjectId safely
    const toObjIdStage = {
      $addFields: {
        _visitObjId: {
          $cond: {
            if: {
              $and: [
                { $ne: ["$visitId", null] },
                { $ne: ["$visitId", ""] },
                { $regexMatch: { input: "$visitId", regex: /^[0-9a-fA-F]{24}$/ } },
              ],
            },
            then: { $toObjectId: "$visitId" },
            else: null,
          },
        },
      },
    };

    if (source === "all") {
      // Only include transactions that resolve to a real visit OR daycare — excludes orphans/dummies
      sourcePipeline.push(
        toObjIdStage,
        { $lookup: { from: "hospitalvisits",      localField: "_visitObjId", foreignField: "_id", as: "_visitMatch", pipeline: [{ $match: { isDeleted: { $ne: true } } }] } },
        { $lookup: { from: "daycareappointments", localField: "_visitObjId", foreignField: "_id", as: "_daycareMatch", pipeline: [{ $match: { isDeleted: { $ne: true } } }] } },
        {
          $match: {
            $or: [
              { "_visitMatch.0":   { $exists: true } },
              { "_daycareMatch.0": { $exists: true } },
            ],
          },
        }
      );
    } else {
      const collection = source === "visit" ? "hospitalvisits" : "daycareappointments";
      sourcePipeline.push(
        toObjIdStage,
        { $lookup: { from: collection, localField: "_visitObjId", foreignField: "_id", as: "_sourceMatch", pipeline: [{ $match: { isDeleted: { $ne: true } } }] } },
        { $match: { "_sourceMatch.0": { $exists: true } } },
        // Expose the matched doc for filtering
        { $addFields: { _sourceDoc: { $arrayElemAt: ["$_sourceMatch", 0] } } }
      );

      // Doctor filter — applies to both visit and daycare
      if (filters.doctorId) {
        sourcePipeline.push({ $match: { "_sourceDoc.doctorId": filters.doctorId } });
      }

      // Procedure filter — daycare only (procedures is an array with procedureId per item)
      if (source === "daycare" && filters.procedureId) {
        sourcePipeline.push({
          $match: { "_sourceDoc.procedures": { $elemMatch: { procedureId: filters.procedureId } } },
        });
      }
    }

    // Summary — all time
    const summaryPipeline = [
      ...sourcePipeline,
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ];

    // Period breakdown
    let groupBy: any;
    if (range === "daily") {
      groupBy = { year: { $year: "$transactionDate" }, month: { $month: "$transactionDate" }, day: { $dayOfMonth: "$transactionDate" } };
    } else if (range === "weekly") {
      groupBy = { week: { $week: "$transactionDate" }, year: { $year: "$transactionDate" } };
    } else if (range === "monthly") {
      groupBy = { month: { $month: "$transactionDate" }, year: { $year: "$transactionDate" } };
    } else {
      groupBy = { year: { $year: "$transactionDate" } };
    }

    const periodPipeline = [
      ...sourcePipeline,
      { $match: { transactionDate: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: groupBy, revenue: { $sum: "$amount" } } },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1, "_id.week": 1 } },
    ];

    const [summaryAgg, periodRaw] = await Promise.all([
      HospitalTransactionModel.aggregate(summaryPipeline),
      HospitalTransactionModel.aggregate(periodPipeline),
    ]);

    const periods = generatePeriods(range, startDate, endDate);

    const periodData = periods.map((p) => {
      let found: any;
      if (range === "daily") {
        found = periodRaw.find((r: any) => r._id.year === p.year && r._id.month === p.month && r._id.day === p.day);
      } else if (range === "weekly") {
        found = periodRaw.find((r: any) => r._id.year === p.year && r._id.week === p.week);
      } else if (range === "monthly") {
        found = periodRaw.find((r: any) => r._id.year === p.year && r._id.month === p.month);
      } else {
        found = periodRaw.find((r: any) => r._id.year === p.year);
      }
      return { period: p.label, date: p.date, revenue: found?.revenue || 0 };
    });

    return { summary: { total: summaryAgg[0]?.total || 0 }, periodData, range };
  }

    async getRecentTransactions(limit: number = 5): Promise<RecentTransaction[]> {
    return HospitalTransactionModel.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      { $sort: { transactionDate: -1 } },
      { $limit: limit },
      {
        $addFields: {
          _visitObjId: {
            $cond: {
              if: {
                $and: [
                  { $ne: ["$visitId", null] },
                  { $ne: ["$visitId", ""] },
                  { $regexMatch: { input: "$visitId", regex: /^[0-9a-fA-F]{24}$/ } },
                ],
              },
              then: { $toObjectId: "$visitId" },
              else: null,
            },
          },
        },
      },
      { $lookup: { from: "hospitalvisits",      localField: "_visitObjId", foreignField: "_id", as: "_visitArr", pipeline: [{ $match: { isDeleted: { $ne: true } } }] } },
      { $lookup: { from: "daycareappointments", localField: "_visitObjId", foreignField: "_id", as: "_daycareArr", pipeline: [{ $match: { isDeleted: { $ne: true } } }] } },
      {
        $addFields: {
          _isVisit: { $gt: [{ $size: "$_visitArr" }, 0] },
          _resolvedVisit: {
            $cond: {
              if: { $gt: [{ $size: "$_visitArr" }, 0] },
              then: { $arrayElemAt: ["$_visitArr", 0] },
              else: {
                $cond: {
                  if: { $gt: [{ $size: "$_daycareArr" }, 0] },
                  then: { $arrayElemAt: ["$_daycareArr", 0] },
                  else: null,
                },
              },
            },
          },
        },
      },
      {
        $addFields: {
          _patientObjId: {
            $cond: {
              if: {
                $and: [
                  { $ne: ["$_resolvedVisit", null] },
                  { $ne: ["$_resolvedVisit.patientId", null] },
                  { $regexMatch: { input: { $ifNull: ["$_resolvedVisit.patientId", ""] }, regex: /^[0-9a-fA-F]{24}$/ } },
                ],
              },
              then: { $toObjectId: "$_resolvedVisit.patientId" },
              else: null,
            },
          },
        },
      },
      {
        $lookup: {
          from: "hospitalpatients",
          localField: "_patientObjId",
          foreignField: "_id",
          as: "_patient",
          pipeline: [{ $project: { name: 1 } }],
        },
      },
      { $unwind: { path: "$_patient", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          transactionId: 1,
          visitId: 1,
          patientName: { $ifNull: ["$_patient.name", "Unknown Patient"] },
          visitType: {
            $cond: {
              if: "$_isVisit",
              then: { $ifNull: ["$_resolvedVisit.visitType", null] },
              else: { $cond: { if: { $ne: ["$_resolvedVisit", null] }, then: "New", else: null } },
            },
          },
          appointmentType: {
            $cond: {
              if: "$_isVisit",
              then: { $ifNull: ["$_resolvedVisit.appointmentType", null] },
              else: { $cond: { if: { $ne: ["$_resolvedVisit", null] }, then: "Day Care", else: null } },
            },
          },
          amount: 1,
          transactionType: 1,
          paymentMode: 1,
          transactionDate: 1,
        },
      },
    ]);
  }

  async getRecentVisits(limit: number = 10): Promise<RecentVisit[]> {
    return HospitalVisitModel.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      { $sort: { visitDate: -1 } },
      { $limit: limit },
      {
        $addFields: {
          _doctorObjId: {
            $cond: {
              if: { $regexMatch: { input: { $ifNull: ["$doctorId", ""] }, regex: /^[0-9a-fA-F]{24}$/ } },
              then: { $toObjectId: "$doctorId" },
              else: null,
            },
          },
          _patientObjId: {
            $cond: {
              if: { $regexMatch: { input: { $ifNull: ["$patientId", ""] }, regex: /^[0-9a-fA-F]{24}$/ } },
              then: { $toObjectId: "$patientId" },
              else: null,
            },
          },
        },
      },
      { $lookup: { from: "hospitaldoctors",  localField: "_doctorObjId",  foreignField: "_id", as: "doctor"  } },
      { $unwind: { path: "$doctor",  preserveNullAndEmptyArrays: true } },
      { $lookup: { from: "hospitalpatients", localField: "_patientObjId", foreignField: "_id", as: "patient" } },
      { $unwind: { path: "$patient", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          visitId: 1,
          doctorName: { $ifNull: ["$doctor.name", "Unknown Doctor"] },
          patientName: { $ifNull: ["$patient.name", "Unknown Patient"] },
          dateTime: "$visitDate",
          appointmentType: 1, visitType: 1, status: 1,
        },
      },
    ]);
  }
}

export default new HospitalDashboardService();
