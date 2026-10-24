import mongoose from "mongoose";
import { randomUUID } from "crypto";
import HospitalIPDModel from "../models/hospital-ipd.model";
import { getNextSequence } from "@src/libs/counter";
import { logger } from "@src/config/logger";
import { APIError } from "@src/shared";
import { BillingCharge, HospitalIPD } from "../models/hospital-ipd.types";
import HospitalPatientService from "../../hospital-patient/services/hospital-patient.service";
import HospitalTransactionService from "../../hospital-transaction/services/hospital-transaction.service";
import HospitalBedService from "../../hospital-bed/services/hospital-bed.service";
import { getS3SignedUrl } from "@src/libs/utils/s3Upload";
import { getHospitalConfig } from "@src/libs/utils/systemConfig";

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function calcTotals(charges: BillingCharge[], discount: number) {
  let subtotal = 0;
  for (const c of charges) {
    // "test" charges are pathlab-only â€” they are displayed on the IPD bill for
    // reference but do NOT contribute to IPD subtotal / totalPrice because
    // pathlab billing is handled independently in the pathlab system.
    if (c.type === "procedure") subtotal += c.totalCharge;
    else if (c.type === "procedure_package") subtotal += c.totalCharge;
    else if (c.type === "doctor") subtotal += c.totalCharge;
    else if (c.type === "bed") subtotal += c.totalCharge;
    else if (c.type === "nursing") subtotal += c.totalCharge;
  }
  return { subtotal, totalPrice: Math.max(0, subtotal - discount) };
}

function calcTotalPaid(transactions: any[]): number {
  return (transactions || []).reduce((sum: number, t: any) => {
    const amt = t.amount || 0;
    if (t.transactionType === "Payment" || t.transactionType === "Advance") return sum + amt;
    if (t.transactionType === "Refund") return sum - amt;
    if (t.transactionType === "Adjustment") return sum + amt;
    return sum;
  }, 0);
}

function calcPaymentStatus(totalPrice: number, totalPaid: number): "Paid" | "Unpaid" | "Partially Paid" {
  if (totalPrice <= 0) return "Paid";
  if (totalPaid >= totalPrice) return "Paid";
  if (totalPaid > 0) return "Partially Paid";
  return "Unpaid";
}

/** Fetch live prices and build resolved billing charge items */
async function resolveBillingCharges(rawCharges: any[]): Promise<BillingCharge[]> {
  if (!rawCharges?.length) return [];
  const resolved: BillingCharge[] = [];

  for (const item of rawCharges) {
    if (item.type === "procedure") {
      const HospitalProcedure = mongoose.model("HospitalProcedure");
      const proc = await HospitalProcedure.findOne({ _id: item.procedureId, isDeleted: { $ne: true }, status: "Active" }).lean() as any;
      if (!proc) throw new APIError(404, "Procedure Not Found", `Procedure '${item.procedureId}' not found or inactive.`);
      const units = Math.max(1, item.units || 1);
      resolved.push({
        type: "procedure",
        chargeId: randomUUID(),
        procedureId: proc._id.toString(),
        procedureName: proc.procedureName,
        procedureCategory: proc.category || null,
        price: proc.price,
        units,
        totalCharge: proc.price * units,
        isDialysis: proc.isDialysis || false,
        isPackage: proc.isPackage || false,
        dialysisSessionId: null,
        isXray: proc.isXray || false,
        isUltrasound: proc.isUltrasound === true,
        xraySessionId: null,
        isCompleted: item.isCompleted === true ? true : false,
        addedAt: new Date(),
      });

    } else if (item.type === "procedure_package") {
      const HospitalProcedurePackage = mongoose.model("HospitalProcedurePackage");
      const pkg = await HospitalProcedurePackage.findOne({ _id: item.packageId, isDeleted: { $ne: true } }).lean() as any;
      if (!pkg) throw new APIError(404, "Package Not Found", `Procedure package '${item.packageId}' not found.`);

      // Fetch live prices for each procedure in the package
      const HospitalProcedure = mongoose.model("HospitalProcedure");
      const procDocs = await HospitalProcedure.find({
        _id: { $in: pkg.procedures.map((p: any) => new mongoose.Types.ObjectId(p.procedureId)) },
        isDeleted: { $ne: true },
        status: "Active",
      }).lean() as any[];

      const procMap = new Map(procDocs.map((p: any) => [p._id.toString(), p]));
      const resolvedProcs = pkg.procedures.map((p: any) => {
        const live = procMap.get(p.procedureId);
        return {
          procedureId: p.procedureId,
          procedureName: live ? live.procedureName : p.procedureName,
          price: live ? live.price : p.price,
          isDialysis: live ? (live.isDialysis || false) : (p.isDialysis || false),
          dialysisSessionId: null,
          isXray: live ? (live.isXray || false) : (p.isXray || false),
          isUltrasound: live ? (live.isUltrasound === true) : (p.isUltrasound === true),
          xraySessionId: null,
        };
      });

      const packageTotal = resolvedProcs.reduce((s: number, p: any) => s + p.price, 0);
      const units = Math.max(1, item.units || 1);
      resolved.push({
        type: "procedure_package",
        chargeId: randomUUID(),
        packageId: pkg._id.toString(),
        packageName: pkg.name,
        procedures: resolvedProcs,
        packageTotal,
        units,
        totalCharge: packageTotal * units,
        isCompleted: item.isCompleted === true ? true : false,
        addedAt: new Date(),
      });

    } else if (item.type === "doctor") {
      const HospitalDoctor = mongoose.model("HospitalDoctor");
      const doc = await HospitalDoctor.findOne({ _id: item.doctorId, isDeleted: { $ne: true } }).lean() as any;
      if (!doc) throw new APIError(404, "Doctor Not Found", `Doctor '${item.doctorId}' not found.`);
      const ipdCharge = (doc.visitTypes || []).find((vt: any) => vt.appointmentType === "IPD");
      if (!ipdCharge) throw new APIError(400, "Doctor IPD Charge Not Configured", `Doctor '${doc.name}' has no IPD charge configured.`);
      const units = Math.max(1, item.units || 1);
      resolved.push({
        type: "doctor",
        chargeId: randomUUID(),
        doctorId: doc._id.toString(),
        doctorName: doc.name,
        charge: ipdCharge.charge,
        units,
        totalCharge: ipdCharge.charge * units,
        isCompleted: item.isCompleted === true ? true : false,
        addedAt: new Date(),
      });

    } else if (item.type === "test") {
      const CaseModel = mongoose.model("Case");
      const cas = await CaseModel.findOne({ _id: item.caseId, deleted: { $ne: true } }).lean() as any;
      if (!cas) throw new APIError(404, "Case Not Found", `Pathlab case '${item.caseId}' not found.`);
      const totalAmount = cas.totalAmount || 0;
      resolved.push({
        type: "test",
        chargeId: randomUUID(),
        caseId: cas._id.toString(),
        caseReadableId: cas.caseId,
        totalAmount,
        units: 1,
        totalCharge: totalAmount,
        isCompleted: item.isCompleted === true ? true : false,
        addedAt: new Date(),
      });

    } else if (item.type === "bed") {
      // Bed charge: bed.chargePerDay takes priority; falls back to ward.chargePerDay
      const HospitalBed = mongoose.model("HospitalBed");
      const bed = await HospitalBed.findOne({ _id: item.bedId, isDeleted: { $ne: true } }).lean() as any;
      if (!bed) throw new APIError(404, "Bed Not Found", `Bed '${item.bedId}' not found.`);

      const HospitalWard = mongoose.model("HospitalWard");
      const ward = await HospitalWard.findOne({ _id: bed.wardId, isDeleted: { $ne: true } }).lean() as any;
      if (!ward) throw new APIError(404, "Ward Not Found", `Ward for bed '${item.bedId}' not found.`);

      const fromDate = new Date(item.fromDate);
      const toDate = new Date(item.toDate);
      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        throw new APIError(400, "Invalid Dates", "fromDate and toDate are required for bed charges.");
      }
      const days = calcBillingDays(fromDate, toDate);

      // Use bed-level charge if configured, otherwise fall back to ward charge
      const effectiveRate: number = (bed.chargePerDay != null && bed.chargePerDay > 0)
        ? bed.chargePerDay
        : ward.chargePerDay;

      resolved.push({
        type: "bed",
        chargeId: randomUUID(),
        bedId: bed._id.toString(),
        bedNumber: bed.bedNumber,
        wardId: ward._id.toString(),
        wardName: ward.name,
        chargePerDay: effectiveRate,
        units: days,
        totalCharge: effectiveRate * days,
        fromDate,
        toDate,
        isCompleted: item.isCompleted === true ? true : false,
        addedAt: new Date(),
      });
    }
  }

  return resolved;
}

/** Auto-create dialysis sessions for procedure/package items with isDialysis = true */
async function createDialysisSessions(ipdId: string, patientId: string, charges: BillingCharge[]): Promise<BillingCharge[]> {
  const DialysisSessionService = (await import("../../hospital-dialysis-session/services/dialysis-session.service")).default;
  const DialysisSessionModel = (await import("../../hospital-dialysis-session/models/dialysis-session.model")).default;
  const { validateSlotCapacity } = await import("../../hospital-dialysis-session/services/dialysis-session.service");
  const updated = [...charges];

  for (let i = 0; i < updated.length; i++) {
    const item = updated[i];

    if (item.type === "procedure" && item.isDialysis) {
      const targetUnits = Math.max(1, item.units || 1);

      // Collect already-known active session IDs from item
      let activeSessionIds: string[] = [];
      if (Array.isArray((item as any).dialysisSessionIds) && (item as any).dialysisSessionIds.length > 0) {
        activeSessionIds = [...(item as any).dialysisSessionIds];
      } else if (item.dialysisSessionId) {
        activeSessionIds = [item.dialysisSessionId];
      }

      // Query DB for all active (non-cancelled) sessions for this ipdId and procedureId
      const activeSessionsInDb = (await DialysisSessionModel.find({
        ipdId,
        procedureId: item.procedureId,
        status: { $ne: "Cancelled" },
        isDeleted: { $ne: true },
      }).lean()) as any[];

      // Merge active session IDs from DB that belong to this IPD + procedure
      for (const s of activeSessionsInDb) {
        const sid = s._id.toString();
        if (!activeSessionIds.includes(sid)) {
          activeSessionIds.push(sid);
        }
      }

      // Filter to keep only those that actually exist and are not cancelled in DB
      const validActiveDbIds = new Set(activeSessionsInDb.map(s => s._id.toString()));
      activeSessionIds = activeSessionIds.filter(id => validActiveDbIds.has(id));

      const slotId = (item as any).slotId || undefined;
      const sessionDate = (item as any).sessionDate || undefined;

      if (activeSessionIds.length < targetUnits) {
        const needed = targetUnits - activeSessionIds.length;
        // Validate slot capacity for needed count
        if (slotId && sessionDate) {
          await validateSlotCapacity(slotId, sessionDate, activeSessionIds, needed);
        }

        // Sync existing active sessions if slot/date updated
        if (slotId !== undefined || sessionDate !== undefined) {
          for (const sid of activeSessionIds) {
            try {
              await DialysisSessionService.updateDialysisSessionById(sid, {
                ...(slotId !== undefined ? { slotId } : {}),
                ...(sessionDate !== undefined ? { sessionDate } : {}),
              });
            } catch (err: any) {
              if (err instanceof APIError) throw err;
              logger.error({ err: err.message, sid }, "Failed to update existing dialysis session for IPD procedure");
            }
          }
        }

        // Create remaining needed sessions
        for (let k = 0; k < needed; k++) {
          try {
            const session = await DialysisSessionService.createDialysisSession({
              patientId,
              procedureId: item.procedureId,
              ipdId,
              slotId,
              sessionDate,
              generalInformation: {},
              status: "In Progress",
              allowMultiple: true,
            } as any);
            activeSessionIds.push((session as any)._id?.toString());
          } catch (err: any) {
            if (err instanceof APIError) throw err;
            logger.error({ err: err.message, procedureId: item.procedureId }, "Auto dialysis session creation failed for IPD procedure");
          }
        }
      } else if (activeSessionIds.length > targetUnits) {
        const excess = activeSessionIds.length - targetUnits;
        // Cancel the excess sessions from the end
        const idsToCancel = activeSessionIds.slice(-excess);
        for (const sid of idsToCancel) {
          try {
            await DialysisSessionModel.findByIdAndUpdate(sid, { $set: { status: "Cancelled" } });
          } catch (err: any) {
            logger.error({ err: err.message, sid }, "Failed to cancel excess dialysis session for IPD procedure");
          }
        }
        activeSessionIds = activeSessionIds.slice(0, targetUnits);

        // Sync remaining active sessions if slot/date updated
        if (slotId !== undefined || sessionDate !== undefined) {
          for (const sid of activeSessionIds) {
            try {
              await DialysisSessionService.updateDialysisSessionById(sid, {
                ...(slotId !== undefined ? { slotId } : {}),
                ...(sessionDate !== undefined ? { sessionDate } : {}),
              });
            } catch (err: any) {
              if (err instanceof APIError) throw err;
              logger.error({ err: err.message, sid }, "Failed to update existing dialysis session for IPD procedure");
            }
          }
        }
      } else {
        // activeSessionIds.length === targetUnits
        // Sync slotId/sessionDate if updated
        if (slotId !== undefined || sessionDate !== undefined) {
          for (const sid of activeSessionIds) {
            try {
              await DialysisSessionService.updateDialysisSessionById(sid, {
                ...(slotId !== undefined ? { slotId } : {}),
                ...(sessionDate !== undefined ? { sessionDate } : {}),
              });
            } catch (err: any) {
              if (err instanceof APIError) throw err;
              logger.error({ err: err.message, sid }, "Failed to update existing dialysis session for IPD procedure");
            }
          }
        }
      }

      (updated[i] as any).dialysisSessionIds = activeSessionIds;
      (updated[i] as any).dialysisSessionId = activeSessionIds[0] || null;
    }

    if (item.type === "procedure_package" && Array.isArray(item.procedures)) {
      const packageUnits = Math.max(1, item.units || 1);

      for (let j = 0; j < item.procedures.length; j++) {
        const proc = item.procedures[j];
        if (proc.isDialysis) {
          const targetUnits = packageUnits;

          let activeSessionIds: string[] = [];
          if (Array.isArray((proc as any).dialysisSessionIds) && (proc as any).dialysisSessionIds.length > 0) {
            activeSessionIds = [...(proc as any).dialysisSessionIds];
          } else if (proc.dialysisSessionId) {
            activeSessionIds = [proc.dialysisSessionId];
          }

          const activeSessionsInDb = (await DialysisSessionModel.find({
            ipdId,
            procedureId: proc.procedureId,
            status: { $ne: "Cancelled" },
            isDeleted: { $ne: true },
          }).lean()) as any[];

          for (const s of activeSessionsInDb) {
            const sid = s._id.toString();
            if (!activeSessionIds.includes(sid)) {
              activeSessionIds.push(sid);
            }
          }

          const validActiveDbIds = new Set(activeSessionsInDb.map(s => s._id.toString()));
          activeSessionIds = activeSessionIds.filter(id => validActiveDbIds.has(id));

          const slotId = (proc as any).slotId || undefined;
          const sessionDate = (proc as any).sessionDate || undefined;

          if (activeSessionIds.length < targetUnits) {
            const needed = targetUnits - activeSessionIds.length;
            if (slotId && sessionDate) {
              await validateSlotCapacity(slotId, sessionDate, activeSessionIds, needed);
            }

            if (slotId !== undefined || sessionDate !== undefined) {
              for (const sid of activeSessionIds) {
                try {
                  await DialysisSessionService.updateDialysisSessionById(sid, {
                    ...(slotId !== undefined ? { slotId } : {}),
                    ...(sessionDate !== undefined ? { sessionDate } : {}),
                  });
                } catch (err: any) {
                  if (err instanceof APIError) throw err;
                  logger.error({ err: err.message, sid }, "Failed to update existing dialysis session for IPD package procedure");
                }
              }
            }

            for (let k = 0; k < needed; k++) {
              try {
                const session = await DialysisSessionService.createDialysisSession({
                  patientId,
                  procedureId: proc.procedureId,
                  ipdId,
                  slotId,
                  sessionDate,
                  generalInformation: {},
                  status: "In Progress",
                  allowMultiple: true,
                } as any);
                activeSessionIds.push((session as any)._id?.toString());
              } catch (err: any) {
                if (err instanceof APIError) throw err;
                logger.error({ err: err.message, procedureId: proc.procedureId }, "Auto dialysis session creation failed for IPD package procedure");
              }
            }
          } else if (activeSessionIds.length > targetUnits) {
            const excess = activeSessionIds.length - targetUnits;
            const idsToCancel = activeSessionIds.slice(-excess);
            for (const sid of idsToCancel) {
              try {
                await DialysisSessionModel.findByIdAndUpdate(sid, { $set: { status: "Cancelled" } });
              } catch (err: any) {
                logger.error({ err: err.message, sid }, "Failed to cancel excess dialysis session for IPD package procedure");
              }
            }
            activeSessionIds = activeSessionIds.slice(0, targetUnits);

            if (slotId !== undefined || sessionDate !== undefined) {
              for (const sid of activeSessionIds) {
                try {
                  await DialysisSessionService.updateDialysisSessionById(sid, {
                    ...(slotId !== undefined ? { slotId } : {}),
                    ...(sessionDate !== undefined ? { sessionDate } : {}),
                  });
                } catch (err: any) {
                  if (err instanceof APIError) throw err;
                  logger.error({ err: err.message, sid }, "Failed to update existing dialysis session for IPD package procedure");
                }
              }
            }
          } else {
            if (slotId !== undefined || sessionDate !== undefined) {
              for (const sid of activeSessionIds) {
                try {
                  await DialysisSessionService.updateDialysisSessionById(sid, {
                    ...(slotId !== undefined ? { slotId } : {}),
                    ...(sessionDate !== undefined ? { sessionDate } : {}),
                  });
                } catch (err: any) {
                  if (err instanceof APIError) throw err;
                  logger.error({ err: err.message, sid }, "Failed to update existing dialysis session for IPD package procedure");
                }
              }
            }
          }

          (updated[i] as any).procedures[j].dialysisSessionIds = activeSessionIds;
          (updated[i] as any).procedures[j].dialysisSessionId = activeSessionIds[0] || null;
        }
      }
    }
  }

  return updated;
}

/** Auto-create xray sessions for procedure/package items with isXray = true */
async function createXraySessions(ipdId: string, patientId: string, charges: BillingCharge[]): Promise<BillingCharge[]> {
  const XraySessionService = (await import("../../hospital-xray-session/services/xray-session.service")).default;
  const XraySessionModel = (await import("../../hospital-xray-session/models/xray-session.model")).default;
  const updated = [...charges];

  for (let i = 0; i < updated.length; i++) {
    const item = updated[i];

    if (item.type === "procedure" && (item as any).isXray && !(item as any).xraySessionId) {
      const existing = await XraySessionModel.findOne({
        ipdId,
        procedureId: (item as any).procedureId,
        status: { $ne: "Cancelled" },
        isDeleted: { $ne: true },
      }).lean() as any;
      if (existing) {
        (updated[i] as any).xraySessionId = existing._id?.toString();
        continue;
      }
      try {
        const session = await XraySessionService.createXraySession({
          patientId,
          procedureId: (item as any).procedureId,
          ipdId,
          isUltrasound: (item as any).isUltrasound === true,
          status: "Pending",
        } as any);
        (updated[i] as any).xraySessionId = (session as any)._id?.toString();
        // Fire SSE â€” non-fatal
        try {
          const xrayTokenEventsService = (await import("../../hospital-xray-session/services/xray-token-events.service")).default;
          const queue = await XraySessionService.getQueueForDate((session as any).tokenDate);
          xrayTokenEventsService.emitTokenCreated((session as any).tokenDate, session, queue);
        } catch (sseErr: any) {
          logger.warn({ err: sseErr.message, procedureId: (item as any).procedureId }, "SSE emit failed after IPD xray auto-create â€” non-fatal");
        }
      } catch (err: any) {
        logger.error({ err: err.message, procedureId: (item as any).procedureId }, "Auto xray session creation failed for IPD procedure");
      }
    }

    if (item.type === "procedure_package") {
      for (let j = 0; j < item.procedures.length; j++) {
        const proc = item.procedures[j];
        if ((proc as any).isXray && !(proc as any).xraySessionId) {
          const existing = await XraySessionModel.findOne({
            ipdId,
            procedureId: proc.procedureId,
            status: { $ne: "Cancelled" },
            isDeleted: { $ne: true },
          }).lean() as any;
          if (existing) {
            (updated[i] as any).procedures[j].xraySessionId = existing._id?.toString();
            continue;
          }
          try {
            const session = await XraySessionService.createXraySession({
              patientId,
              procedureId: proc.procedureId,
              ipdId,
              isUltrasound: (proc as any).isUltrasound === true,
              status: "Pending",
            } as any);
            (updated[i] as any).procedures[j].xraySessionId = (session as any)._id?.toString();
            // Fire SSE â€” non-fatal
            try {
              const xrayTokenEventsService = (await import("../../hospital-xray-session/services/xray-token-events.service")).default;
              const queue = await XraySessionService.getQueueForDate((session as any).tokenDate);
              xrayTokenEventsService.emitTokenCreated((session as any).tokenDate, session, queue);
            } catch (sseErr: any) {
              logger.warn({ err: sseErr.message, procedureId: proc.procedureId }, "SSE emit failed after IPD package xray auto-create â€” non-fatal");
            }
          } catch (err: any) {
            logger.error({ err: err.message, procedureId: proc.procedureId }, "Auto xray session creation failed for IPD package procedure");
          }
        }
      }
    }
  }

  return updated;
}

/**
 * Full case population pipeline â€” mirrors case.model.ts caseJoins so the IPD
 * bill response contains every field needed to print the pathlab bill:
 * patient, referring doctor, lab center, all casetests (with test / group /
 * category details), and pathlab transactions.
 */
const CASE_BILL_PIPELINE: mongoose.PipelineStage[] = [
  // Patient
  {
    $lookup: { from: "patients", localField: "patientId", foreignField: "_id", as: "patient" },
  },
  { $unwind: { path: "$patient", preserveNullAndEmptyArrays: true } },

  // Referring doctor
  {
    $lookup: {
      from: "doctors",
      let: { doctorId: "$referringDoctor" },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [{ $eq: ["$_id", "$$doctorId"] }, { $ne: ["$deleted", true] }],
            },
          },
        },
      ],
      as: "doctor",
    },
  },
  { $unwind: { path: "$doctor", preserveNullAndEmptyArrays: true } },

  // Case tests â€” fully populated (test, group, category)
  {
    $lookup: {
      from: "casetests",
      localField: "_id",
      foreignField: "caseId",
      as: "casetests",
      pipeline: [
        { $sort: { sortOrder: 1 } },
        {
          $lookup: {
            from: "tests",
            let: { testId: "$testId" },
            pipeline: [
              { $match: { $expr: { $and: [{ $eq: ["$_id", "$$testId"] }, { $ne: ["$deleted", true] }] } } },
            ],
            as: "test",
          },
        },
        { $unwind: { path: "$test", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "testgroups",
            let: { groupId: "$groupId" },
            pipeline: [
              { $match: { $expr: { $and: [{ $eq: ["$_id", "$$groupId"] }, { $ne: ["$deleted", true] }] } } },
            ],
            as: "group",
          },
        },
        { $unwind: { path: "$group", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "testcategories",
            let: { categoryId: "$categoryId" },
            pipeline: [
              { $match: { $expr: { $and: [{ $eq: ["$_id", "$$categoryId"] }, { $ne: ["$deleted", true] }] } } },
            ],
            as: "category",
          },
        },
        { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
        {
          $addFields: {
            singleColumn: { $cond: { if: { $eq: ["$singleColumn", true] }, then: true, else: { $ifNull: ["$test.singleColumn", false] } } },
          },
        },
        { $project: { __v: 0, "test.__v": 0, "category.__v": 0 } },
      ],
    },
  },

  // Pathlab transactions
  { $lookup: { from: "transactions", localField: "_id", foreignField: "caseId", as: "transactions" } },

  // Lab center
  {
    $lookup: {
      from: "labcenters",
      let: { centerId: "$center" },
      pipeline: [
        {
          $match: {
            $expr: { $and: [{ $eq: ["$_id", "$$centerId"] }, { $eq: ["$deleted", false] }] },
          },
        },
      ],
      as: "labcenter",
    },
  },
  { $unwind: { path: "$labcenter", preserveNullAndEmptyArrays: true } },

  { $project: { __v: 0, "patient.__v": 0, "doctor.__v": 0, "labcenter.__v": 0 } },

  // Ensure billing summary fields are always present in caseData (for IPD bill display)
  {
    $addFields: {
      totalAmount:  { $ifNull: ["$totalAmount",  0] },
      finalAmount:  { $ifNull: ["$finalAmount",  0] },
      discountType:  { $ifNull: ["$discountType",  "Flat"] },
      discountValue: { $ifNull: ["$discountValue", 0] },
      amountStatus:  { $ifNull: ["$amountStatus",  "Unpaid"] },
      balance:       { $ifNull: ["$balance", "$finalAmount", 0] },
    },
  },
];

/**
 * Populate test billing items with full case data for the IPD bill view.
 * Non-test charges pass through unchanged.
 */
async function populateTestCharges(charges: BillingCharge[]): Promise<any[]> {
  const CaseModel = mongoose.model("Case");
  const result: any[] = [];

  for (const item of charges) {
    if (item.type !== "test") {
      result.push(item);
      continue;
    }

    try {
      const cases = await CaseModel.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(item.caseId), deleted: { $ne: true } } },
        ...CASE_BILL_PIPELINE,
      ]);

      result.push({
        ...item,
        caseData: cases[0] || null,
      });
    } catch (err: any) {
      logger.warn({ caseId: item.caseId, err: err.message }, "Failed to populate case for IPD test billing item");
      result.push(item);
    }
  }

  return result;
}

async function populateDialysisCharges(charges: BillingCharge[]): Promise<any[]> {
  const sessionIds: string[] = [];
  for (const item of (charges || [])) {
    if (item.type === "procedure") {
      if (Array.isArray((item as any).dialysisSessionIds)) {
        for (const sid of (item as any).dialysisSessionIds) {
          if (sid) sessionIds.push(sid);
        }
      } else if ((item as any).dialysisSessionId) {
        sessionIds.push((item as any).dialysisSessionId);
      }
    } else if (item.type === "procedure_package" && item.procedures?.length) {
      for (const p of item.procedures) {
        if (Array.isArray((p as any).dialysisSessionIds)) {
          for (const sid of (p as any).dialysisSessionIds) {
            if (sid) sessionIds.push(sid);
          }
        } else if ((p as any).dialysisSessionId) {
          sessionIds.push((p as any).dialysisSessionId);
        }
      }
    }
  }

  if (!sessionIds.length) return charges;

  let sessionMap = new Map<string, any>();
  try {
    const DialysisSessionModel = (await import("../../hospital-dialysis-session/models/dialysis-session.model")).default;
    const validObjectIds = sessionIds.filter((id: string) => mongoose.Types.ObjectId.isValid(id)).map((id: string) => new mongoose.Types.ObjectId(id));
    const sessions = await DialysisSessionModel.find({
      _id: { $in: validObjectIds }
    }).select('_id sessionId status sessionDate slotId doctorId slotDetails').lean();
    sessionMap = new Map(sessions.map((s: any) => [s._id.toString(), s]));
  } catch (err: any) {
    logger.warn({ err: err.message }, "Failed to fetch dialysis sessions for IPD billing charges");
  }

  const formatSession = (s: any) => s ? {
    _id: s._id?.toString(),
    sessionId: s.sessionId,
    status: s.status,
    sessionDate: s.sessionDate,
    slotId: s.slotId,
    doctorId: s.doctorId,
    slotDetails: s.slotDetails,
  } : null;

  const result: any[] = [];
  for (const item of charges) {
    if (item.type === "procedure" && ((item as any).dialysisSessionId || (item as any).dialysisSessionIds?.length)) {
      const sIds: string[] = (item as any).dialysisSessionIds?.length
        ? (item as any).dialysisSessionIds
        : ((item as any).dialysisSessionId ? [(item as any).dialysisSessionId] : []);
      const sessionObjs = sIds.map(sid => formatSession(sessionMap.get(sid.toString()))).filter(Boolean);

      result.push({
        ...item,
        dialysisSession: sessionObjs[0] || null,
        dialysisSessions: sessionObjs,
      });
    } else if (item.type === "procedure_package" && item.procedures?.length) {
      const procs = item.procedures.map((p: any) => {
        if ((p as any).dialysisSessionId || (p as any).dialysisSessionIds?.length) {
          const sIds: string[] = (p as any).dialysisSessionIds?.length
            ? (p as any).dialysisSessionIds
            : ((p as any).dialysisSessionId ? [(p as any).dialysisSessionId] : []);
          const sessionObjs = sIds.map(sid => formatSession(sessionMap.get(sid.toString()))).filter(Boolean);
          return {
            ...p,
            dialysisSession: sessionObjs[0] || null,
            dialysisSessions: sessionObjs,
          };
        }
        return p;
      });
      result.push({
        ...item,
        procedures: procs
      });
    } else {
      result.push(item);
    }
  }

  return result;
}

/** Resolve signed URLs for patient document S3 keys if present */
async function resolvePatientSignedUrls(ipd: any): Promise<any> {
  const patient = ipd?.patient;
  if (!patient) return ipd;

  if (patient.imageS3Url) patient.imageS3Url = await getS3SignedUrl(patient.imageS3Url);
  if (patient.aadharS3Url) patient.aadharS3Url = await getS3SignedUrl(patient.aadharS3Url);
  if (patient.ayushmanCardS3Url) patient.ayushmanCardS3Url = await getS3SignedUrl(patient.ayushmanCardS3Url);
  if (patient.otherDocsS3Urls?.length) {
    patient.otherDocsS3Urls = await Promise.all(patient.otherDocsS3Urls.map((url: string) => getS3SignedUrl(url)));
  }

  return ipd;
}

/** Resolve signed URL for MLC document if present */
async function resolveMlcSignedUrl(ipd: any): Promise<any> {
  if (ipd?.isMLC && ipd?.mlc?.documentUrl) {
    ipd.mlc.documentUrl = await getS3SignedUrl(ipd.mlc.documentUrl);
  }
  return ipd;
}

/**
 * Noon-boundary day counter with morning grace.
 *
 * A new billing day begins each time 12:00 PM (noon) is crossed, BUT:
 * - Admitted BEFORE noon (00:00â€“11:59): that same day's noon is skipped.
 *   First boundary = tomorrow 12:00 PM. This prevents unfairly charging a
 *   new day to someone admitted at e.g. 6 AM just because noon passed at 12.
 * - Admitted AT or AFTER noon (12:00â€“23:59): next noon (tomorrow 12:00 PM)
 *   is the first boundary. Fair because the patient is using the night.
 *
 * In both cases the admission time in the DB is never modified.
 *
 * Examples:
 *   Admit Jan 1  6:00 AM â†’ Discharge Jan 1  1:00 PM  =  1 day  (noon skipped, no boundary crossed)
 *   Admit Jan 1 11:00 AM â†’ Discharge Jan 1  1:00 PM  =  1 day  (noon skipped, no boundary crossed)
 *   Admit Jan 1 11:00 AM â†’ Discharge Jan 2  1:00 PM  =  2 days (Jan 2 noon crossed)
 *   Admit Jan 1  6:00 PM â†’ Discharge Jan 2 11:00 AM  =  1 day  (Jan 2 noon not yet reached)
 *   Admit Jan 1  6:00 PM â†’ Discharge Jan 2  1:00 PM  =  2 days (Jan 2 noon crossed)
 *   Admit Jan 1 10:00 PM â†’ Discharge Jan 2  1:00 PM  =  2 days (Jan 2 noon crossed)
 */
function calcBillingDays(from: Date, to: Date): number {
  if (to <= from) return 1;

  // First noon boundary is always the next day's noon.
  // - Admitted before noon: today's noon is skipped (grace), so tomorrow noon is first.
  // - Admitted at/after noon: today's noon already passed, so tomorrow noon is first.
  // Both cases resolve to the same: first boundary = tomorrow 12:00 PM.
  const firstNoon = new Date(from.getFullYear(), from.getMonth(), from.getDate() + 1, 12, 0, 0, 0);

  // Count how many noon boundaries are crossed: firstNoon, firstNoon+1day, firstNoon+2days...
  if (to <= firstNoon) return 1;

  const msPerDay = 24 * 60 * 60 * 1000;
  const noonsCrossed = Math.floor((to.getTime() - firstNoon.getTime()) / msPerDay) + 1;
  return 1 + noonsCrossed;
}

/**
 * Compute the dynamic bed charge for an IPD on the fly.
 * Uses the already-populated bed.ward.chargePerDay from the IPD response.
 * Days = admissionDate â†’ dischargeDate (or now if still admitted), min 1 day.
 * Returns null if no bed or ward chargePerDay is not set.
 */
function computeBedCharge(ipd: any): {
  bedId?: string;
  bedNumber?: string;
  wardId: string;
  wardName: string;
  chargePerDay: number;
  fromDate: string;
  toDate: string;
  days: number;
  totalCharge: number;
} | null {
  // Use bed-level charge if configured, otherwise fall back to ward charge
  const bed = ipd?.bed;
  const ward = bed?.ward;
  const bedLevelRate: number | null = (bed?.chargePerDay != null && bed.chargePerDay > 0) ? bed.chargePerDay : null;
  const effectiveRate: number | undefined = bedLevelRate ?? ward?.chargePerDay;

  if (!ipd?.bedId || !effectiveRate) return null;

  const from = new Date(ipd.admissionDate);
  // Use discharge summary's dischargeDate if set (draft or finalized), otherwise use now
  const rawDischargeDate = ipd?.dischargeSummary?.dischargeDate;
  const to = rawDischargeDate ? new Date(rawDischargeDate) : new Date();

  const days = calcBillingDays(from, to);

  return {
    ...(bed?._id ? { bedId: bed._id?.toString() || bed.bedId } : {}),
    ...(bed?.bedNumber ? { bedNumber: bed.bedNumber } : {}),
    wardId: ward?._id?.toString() || ipd.bed.wardId,
    wardName: ward?.name,
    chargePerDay: effectiveRate,
    fromDate: from.toISOString().split("T")[0],
    toDate: to.toISOString().split("T")[0],
    days,
    totalCharge: effectiveRate * days,
  };
}

/**
 * Compute the dynamic nursing charge for an IPD on the fly.
 * Uses ward.nursingChargePerDay â€” ward-level only, no bed-level override.
 * Returns null if no bed/ward assigned or nursingChargePerDay is not set.
 */
function computeNursingCharge(ipd: any): {
  wardId: string;
  wardName: string;
  nursingChargePerDay: number;
  fromDate: string;
  toDate: string;
  days: number;
  totalCharge: number;
} | null {
  const ward = ipd?.bed?.ward;
  const rate: number | undefined = ward?.nursingChargePerDay;

  if (!ipd?.bedId || !rate || rate <= 0) return null;

  const from = new Date(ipd.admissionDate);
  const rawDischargeDate = ipd?.dischargeSummary?.dischargeDate;
  const to = rawDischargeDate ? new Date(rawDischargeDate) : new Date();

  const days = calcBillingDays(from, to);

  return {
    wardId: ward?._id?.toString() || ipd.bed.wardId,
    wardName: ward?.name,
    nursingChargePerDay: rate,
    fromDate: from.toISOString().split("T")[0],
    toDate: to.toISOString().split("T")[0],
    days,
    totalCharge: rate * days,
  };
}

/**
 * Compute how many days the patient has been / was admitted.
 * - Active (Admitted): admissionDate â†’ now
 * - Terminal (Discharged/LAMA/Cancelled): admissionDate â†’ dischargeSummary.dischargeDate
 * Minimum 1 day.
 */
function computeAdmissionDays(ipd: any): number {
  const from = new Date(ipd.admissionDate);
  const isTerminal = ipd.isDischarge || ["Discharged", "LAMA", "DOR", "Death", "Refer", "Cancelled"].includes(ipd.status);
  const rawEndDate = isTerminal ? ipd?.dischargeSummary?.dischargeDate : null;
  const to = rawEndDate ? new Date(rawEndDate) : new Date();
  return calcBillingDays(from, to);
}

/**
 * Inject computed bed charge and nursing charge into the IPD response.
 * Adds bedCharge / nursingCharge fields and folds both into subtotal / totalPrice.
 *
 * For discharged / LAMA / Cancelled IPDs these charges are already frozen
 * into billingCharges and baked into the stored subtotal â€” skip dynamic
 * computation to avoid double-counting.
 *
 * If allowBedCharges or allowNursingCharges is false on the IPD, the respective
 * dynamic charge is skipped entirely.
 */
function applyBedCharge(ipd: any): any {
  // Charges are frozen on discharge/LAMA/DOR/Death/Refer/cancel â€” don't add them again
  if (ipd.isDischarge || ["Discharged", "LAMA", "DOR", "Death", "Refer", "Cancelled"].includes(ipd.status)) {
    return { ...ipd, bedCharge: null, nursingCharge: null, admissionDays: computeAdmissionDays(ipd) };
  }

  const admissionDays = computeAdmissionDays(ipd);
  const bedCharge = ipd.allowBedCharges !== false ? computeBedCharge(ipd) : null;
  const nursingCharge = ipd.allowNursingCharges !== false ? computeNursingCharge(ipd) : null;

  if (!bedCharge && !nursingCharge) return { ...ipd, bedCharge: null, nursingCharge: null, admissionDays };

  const extraSubtotal = (bedCharge?.totalCharge || 0) + (nursingCharge?.totalCharge || 0);
  const subtotal = (ipd.subtotal || 0) + extraSubtotal;
  const totalPrice = Math.max(0, subtotal - (ipd.discount || 0));

  return {
    ...ipd,
    bedCharge: bedCharge || null,
    nursingCharge: nursingCharge || null,
    subtotal,
    totalPrice,
    admissionDays,
  };
}

// â”€â”€ Service â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class HospitalIPDService {
  /** Pre-flight price calculation â€” no DB writes */
  async calculatePrice(rawCharges: any[], discount = 0) {
    const resolved = await resolveBillingCharges(rawCharges);
    const { subtotal, totalPrice } = calcTotals(resolved, discount);
    return { billingCharges: resolved, subtotal, discount, totalPrice };
  }

  /** Validate IPD can be created (used as pre-check before patient creation) */
  async validateIPDCreation(data: any): Promise<void> {
    // Validate doctor
    const HospitalDoctor = mongoose.model("HospitalDoctor");
    const doctor = await HospitalDoctor.findOne({ _id: data.doctorId, isDeleted: { $ne: true } }).lean();
    if (!doctor) throw new APIError(404, "Doctor Not Found", `No doctor with ID '${data.doctorId}' found.`);

    // Validate bed availability
    if (data.bedId) {
      const bed = await HospitalBedService.getBedById(data.bedId);
      if (bed.status === "Occupied") {
        throw new APIError(409, "Bed Occupied", `Bed '${bed.bedNumber}' is already occupied.`);
      }
    }

    // Validate discount password
    if (data.discount && data.discount > 0) {
      await this._validateDiscountPassword(data.discount, data.discountPassword);
    }

    // Validate visitId â€” if provided, the visit must exist and its patient must match
    // (if visitId is present, the patient already exists â€” that's why the visit was created)
    if (data.visitId) {
      const HospitalVisit = mongoose.model("HospitalVisit");
      const visit = await HospitalVisit.findById(data.visitId).lean() as any;
      if (!visit) {
        throw new APIError(404, "Visit Not Found", `No visit with ID '${data.visitId}' found.`);
      }
      if (visit.patientId?.toString() !== data.patientId?.toString()) {
        throw new APIError(
          400,
          "Patient Mismatch",
          "The visit does not belong to the selected patient. Please select the correct patient or visit."
        );
      }
    }
  }

  private async _validateDiscountPassword(discount: number, discountPassword?: string, existingDiscount?: number): Promise<void> {
    if (!discount || discount === 0) return;
    
    // If discount hasn't changed, no validation needed
    if (existingDiscount !== undefined && discount === existingDiscount) {
      return;
    }
    
    if (!discountPassword) {
      throw new APIError(400, "Discount Password Required", "A password is required to authorize discounts.");
    }
    const ConstantsModel = (await import("../../constants/models/constants.model")).default;
    const constant = await ConstantsModel.findOne({ key: "DISCOUNT_PASSWORD", isActive: true }).lean();
    if (!constant) throw new APIError(500, "Discount Not Configured", "Discount authorization is not configured.");
    const { comparePassword } = await import("@src/libs/password");
    const isValid = await comparePassword(discountPassword, (constant as any).value as string);
    if (!isValid) throw new APIError(401, "Invalid Discount Password", "The discount authorization password is incorrect.");
  }

  /** Create IPD â€” handles new or existing patient, optional transaction */
  async createIPD(input: any): Promise<any> {
    const { patientData, transaction, discountPassword, ...ipdData } = input;

    // Parse admissionDate
    const admissionDate = ipdData.admissionDate ? new Date(ipdData.admissionDate) : new Date();

    // Pre-check validation BEFORE creating patient
    await this.validateIPDCreation({ ...ipdData, admissionDate, discountPassword });

    // Resolve billing charges (live price fetch)
    // Auto-inject the main doctor's IPD charge if not already in the list
    const rawCharges = [...(ipdData.billingCharges || [])];
    const alreadyHasMainDoctor = rawCharges.some(
      (c: any) => c.type === "doctor" && c.doctorId === ipdData.doctorId
    );
    if (!alreadyHasMainDoctor) {
      rawCharges.unshift({ type: "doctor", doctorId: ipdData.doctorId });
    }
    const resolvedCharges = await resolveBillingCharges(rawCharges);
    const discount = ipdData.discount || 0;
    const { subtotal, totalPrice } = calcTotals(resolvedCharges, discount);

    // Create patient if patientData provided
    let patientId = ipdData.patientId;
    let createdPatient: any = null;
    if (!patientId) {
      createdPatient = await HospitalPatientService.createHospitalPatient(patientData);
      const patientDoc: any = await HospitalPatientService.getHospitalPatient(createdPatient.mrd);
      patientId = patientDoc._id?.toString() || patientDoc.id;
      if (!patientId) throw new Error("Patient created but ID not found");
    }

    // Generate IDs
    const nextIpdId = await getNextSequence("hospitalIpdId");
    const ipdId = `${getHospitalConfig().ipdPrefix}${String(nextIpdId).padStart(5, "0")}`;
    const nextReceiptId = await getNextSequence("ipdReceiptId");
    const receiptId = `IPDREC${String(nextReceiptId).padStart(5, "0")}`;

    // Create IPD
    const ipd = await HospitalIPDModel.createIPD({
      ipdId,
      receiptId,
      patientId,
      doctorId: ipdData.doctorId,
      bedId: ipdData.bedId || null,
      visitId: ipdData.visitId || null,
      admissionDate,
      isDischarge: false,
      reason: ipdData.reason,
      notes: ipdData.notes,
      allowBedCharges: ipdData.allowBedCharges !== false,
      allowNursingCharges: ipdData.allowNursingCharges !== false,
      billingCharges: resolvedCharges,
      subtotal,
      discount,
      discountAuthorizedAt: discount > 0 ? new Date() : undefined,
      totalPrice,
      status: "Admitted",
      isMLC: ipdData.isMLC === true,
      mlc: ipdData.isMLC === true ? (ipdData.mlc || null) : null,
      createdBy: ipdData.createdBy,
    } as HospitalIPD);

    const ipdMongoId = (ipd as any)._id?.toString();

    // Auto-create dialysis and xray sessions
    const needsDialysis = resolvedCharges.some((c) => (c.type === "procedure" && c.isDialysis) || (c.type === "procedure_package" && c.procedures.some((p) => p.isDialysis)));
    const needsXray     = resolvedCharges.some((c) => (c.type === "procedure" && (c as any).isXray) || (c.type === "procedure_package" && c.procedures.some((p) => (p as any).isXray)));
    if (needsDialysis || needsXray) {
      let charges = resolvedCharges;
      if (needsDialysis) charges = await createDialysisSessions(ipdMongoId, patientId, charges);
      if (needsXray)     charges = await createXraySessions(ipdMongoId, patientId, charges);
      await HospitalIPDModel.findByIdAndUpdate(ipdMongoId, { $set: { billingCharges: charges } });
    }

    // Occupy bed
    if (ipdData.bedId) {
      try {
        const HospitalPatientModel = (await import("../../hospital-patient/models/hospital-patient.model")).default;
        const patient = await HospitalPatientModel.findById(patientId).select("name mrd phone").lean() as any;
        await HospitalBedService.occupyBed(ipdData.bedId, {
          name: patient?.name,
          mrd: patient?.mrd,
          ipdId: ipdMongoId,
          contact: patient?.phone,
          admittedAt: admissionDate,
        });
      } catch (err: any) {
        logger.error({ err: err.message, bedId: ipdData.bedId }, "Failed to occupy bed â€” non-fatal");
      }
    }

    // Create transaction
    let createdTransaction: any = null;
    if (transaction) {
      try {
        const transactionDate = transaction.transactionDate ? new Date(transaction.transactionDate) : new Date();
        createdTransaction = await HospitalTransactionService.createHospitalTransaction({
          ...transaction,
          visitId: ipdMongoId,
          transactionDate,
        });
        logger.info({ ipdId, transactionId: createdTransaction.transactionId }, "Transaction created with IPD");
      } catch (err: any) {
        logger.error({ err: err.message, ipdId }, "Transaction creation failed for IPD â€” non-fatal");
      }
    }

    // Return populated IPD
    const populated = await this._populateIPD(ipdMongoId);
    return {
      ...populated,
      ...(createdPatient ? { patient: createdPatient } : {}),
      ...(createdTransaction ? { transaction: createdTransaction } : {}),
    };
  }

  async getIPDs(query: any = {}, search: any = {}, skip = 0, limit = 10) {
    const result = await HospitalIPDModel.readIPDs(query, search, skip, limit);
    const ipds = await Promise.all(
      result.data.map(async (ipd: any) => {
        const mongoId = ipd._id?.toString();

        // Inject computed bed charge first (affects totalPrice used for paymentStatus)
        ipd = applyBedCharge(ipd);

        if (mongoId) {
          try {
            const transactions = await HospitalTransactionService.getTransactionsByVisit(mongoId);
            const totalPaid = calcTotalPaid(transactions);
            ipd.amountPaid = totalPaid;
            ipd.paymentStatus = calcPaymentStatus(ipd.totalPrice || 0, totalPaid);
            ipd.transactions = transactions;
          } catch {
            ipd.amountPaid = 0;
            ipd.paymentStatus = "Unpaid";
          }
        }
        // Resolve MLC document signed URL
        await resolveMlcSignedUrl(ipd);
        // Resolve patient document signed URLs
        await resolvePatientSignedUrls(ipd);
        return ipd;
      })
    );


    return { ipds, totalCount: result.totalCount };
  }

  async getIPDById(id: string, filter: any = {}): Promise<any> {
    let ipd = await HospitalIPDModel.readIPDById(id, filter);

    // Populate test billing items with full case data and dialysis sessions
    if (ipd.billingCharges?.length) {
      ipd.billingCharges = await populateTestCharges(ipd.billingCharges);
      ipd.billingCharges = await populateDialysisCharges(ipd.billingCharges);
    }

    // Resolve MLC document signed URL
    ipd = await resolveMlcSignedUrl(ipd);
    // Resolve patient document signed URLs
    ipd = await resolvePatientSignedUrls(ipd);

    // Inject computed bed charge
    ipd = applyBedCharge(ipd);

    // Transactions + payment status (use bed-charge-inclusive totalPrice)
    try {
      const transactions = await HospitalTransactionService.getTransactionsByVisit(id);
      ipd.transactions = transactions;
      const totalPaid = calcTotalPaid(transactions);
      ipd.amountPaid = totalPaid;
      ipd.paymentStatus = calcPaymentStatus(ipd.totalPrice || 0, totalPaid);
    } catch {
      ipd.amountPaid = 0;
      ipd.paymentStatus = "Unpaid";
    }


    return ipd;
  }

  async updateIPD(id: string, input: any, filter: any = {}): Promise<any> {
    const { transaction, discountPassword, billingCharges: rawCharges, ...updates } = input;

    const existing = await HospitalIPDModel.findOne({ _id: id, isDeleted: { $ne: true }, ...(filter || {}) }).lean() as any;
    if (!existing) throw new APIError(404, "IPD Not Found", `No IPD with ID '${id}' found.`);

    // Block updates on discharged IPDs (use discharge endpoint instead)
    if (existing.isDischarge) {
      throw new APIError(400, "IPD Already Discharged", "Cannot update a discharged IPD. Use the discharge summary endpoint.");
    }

    // Handle bed change
    if (updates.bedId && updates.bedId !== existing.bedId) {
      if (existing.bedId) {
        try { await HospitalBedService.releaseBed(existing.bedId); } catch {}
      }
      const HospitalPatientModel = (await import("../../hospital-patient/models/hospital-patient.model")).default;
      const patient = await HospitalPatientModel.findById(existing.patientId).select("name mrd phone").lean() as any;
      await HospitalBedService.occupyBed(updates.bedId, {
        name: patient?.name,
        mrd: patient?.mrd,
        ipdId: id,
        contact: patient?.phone,
        admittedAt: existing.admissionDate,
      });
    }

    // Handle billing charges update
    if (rawCharges !== undefined) {
      if (updates.discount !== undefined && updates.discount > 0) {
        await this._validateDiscountPassword(updates.discount, discountPassword, existing.discount);
      }
      const resolvedCharges = await resolveBillingCharges(rawCharges);
      const discount = updates.discount ?? existing.discount ?? 0;
      const { subtotal, totalPrice } = calcTotals(resolvedCharges, discount);

      // Cancel dialysis sessions for procedures removed from the charge list
      const newProcedureIds = new Set(
        resolvedCharges.flatMap((c: any) =>
          c.type === "procedure" ? [c.procedureId] :
          c.type === "procedure_package" ? (c.procedures || []).map((p: any) => p.procedureId) : []
        )
      );
      const existingCharges: any[] = existing.billingCharges || [];
      const sessionIdsToCancel: string[] = [];
      const procedureIdsToLookup: string[] = [];
      const xraySessionIdsToCancel: string[] = [];
      const xrayProcedureIdsToLookup: string[] = [];

      for (const charge of existingCharges) {
        if (charge.type === "procedure" && !newProcedureIds.has(charge.procedureId)) {
          // Dialysis
          if (charge.isDialysis !== false) {
            if (Array.isArray(charge.dialysisSessionIds) && charge.dialysisSessionIds.length > 0) {
              sessionIdsToCancel.push(...charge.dialysisSessionIds);
            } else if (charge.dialysisSessionId) {
              sessionIdsToCancel.push(charge.dialysisSessionId);
            } else {
              procedureIdsToLookup.push(charge.procedureId);
            }
          }
          // Xray
          if (charge.isXray !== false && charge.isXray) {
            charge.xraySessionId
              ? xraySessionIdsToCancel.push(charge.xraySessionId)
              : xrayProcedureIdsToLookup.push(charge.procedureId);
          }
        } else if (charge.type === "procedure_package" && Array.isArray(charge.procedures)) {
          for (const proc of charge.procedures) {
            if (!newProcedureIds.has(proc.procedureId)) {
              if (proc.isDialysis !== false) {
                if (Array.isArray(proc.dialysisSessionIds) && proc.dialysisSessionIds.length > 0) {
                  sessionIdsToCancel.push(...proc.dialysisSessionIds);
                } else if (proc.dialysisSessionId) {
                  sessionIdsToCancel.push(proc.dialysisSessionId);
                } else {
                  procedureIdsToLookup.push(proc.procedureId);
                }
              }
              if (proc.isXray !== false && proc.isXray) {
                proc.xraySessionId
                  ? xraySessionIdsToCancel.push(proc.xraySessionId)
                  : xrayProcedureIdsToLookup.push(proc.procedureId);
              }
            }
          }
        }
      }

      // Cancel removed dialysis sessions
      if (sessionIdsToCancel.length > 0 || procedureIdsToLookup.length > 0) {
        try {
          const DialysisSessionModel = (await import("../../hospital-dialysis-session/models/dialysis-session.model")).default;
          for (const sid of sessionIdsToCancel) {
            await DialysisSessionModel.findByIdAndUpdate(sid, { $set: { status: "Cancelled" } });
          }
          if (procedureIdsToLookup.length > 0) {
            await DialysisSessionModel.updateMany(
              { ipdId: id, procedureId: { $in: procedureIdsToLookup }, status: { $ne: "Cancelled" }, isDeleted: { $ne: true } },
              { $set: { status: "Cancelled" } }
            );
          }
        } catch (err: any) {
          logger.error({ err: err.message, ipdId: id }, "Failed to cancel dialysis sessions during IPD billing update");
        }
      }

      // Cancel removed xray sessions
      if (xraySessionIdsToCancel.length > 0 || xrayProcedureIdsToLookup.length > 0) {
        try {
          const XraySessionModel = (await import("../../hospital-xray-session/models/xray-session.model")).default;
          for (const sid of xraySessionIdsToCancel) {
            await XraySessionModel.findByIdAndUpdate(sid, { $set: { status: "Cancelled" } });
          }
          if (xrayProcedureIdsToLookup.length > 0) {
            await XraySessionModel.updateMany(
              { ipdId: id, procedureId: { $in: xrayProcedureIdsToLookup }, status: { $ne: "Cancelled" }, isDeleted: { $ne: true } },
              { $set: { status: "Cancelled" } }
            );
          }
        } catch (err: any) {
          logger.error({ err: err.message, ipdId: id }, "Failed to cancel xray sessions during IPD billing update");
        }
      }

      // Safety net â€” cancel any orphaned dialysis sessions for procedures no longer in the charge list
      try {
        const DialysisSessionModel = (await import("../../hospital-dialysis-session/models/dialysis-session.model")).default;
        const allNewProcIds = [...newProcedureIds];
        const cancelQuery: any = { ipdId: id, status: { $ne: "Cancelled" }, isDeleted: { $ne: true } };
        if (allNewProcIds.length > 0) cancelQuery.procedureId = { $nin: allNewProcIds };
        await DialysisSessionModel.updateMany(cancelQuery, { $set: { status: "Cancelled" } });
      } catch (err: any) {
        logger.error({ err: err.message, ipdId: id }, "Safety-net cancel for removed dialysis sessions failed");
      }

      // Safety net â€” cancel any orphaned xray sessions for procedures no longer in the charge list
      try {
        const XraySessionModel = (await import("../../hospital-xray-session/models/xray-session.model")).default;
        const allNewProcIds = [...newProcedureIds];
        const cancelQuery: any = { ipdId: id, status: { $ne: "Cancelled" }, isDeleted: { $ne: true } };
        if (allNewProcIds.length > 0) cancelQuery.procedureId = { $nin: allNewProcIds };
        await XraySessionModel.updateMany(cancelQuery, { $set: { status: "Cancelled" } });
      } catch (err: any) {
        logger.error({ err: err.message, ipdId: id }, "Safety-net cancel for removed xray sessions failed");
      }

      // Auto-create sessions for new procedures
      let chargesWithSessions = await createDialysisSessions(id, existing.patientId, resolvedCharges);
      chargesWithSessions = await createXraySessions(id, existing.patientId, chargesWithSessions);

      updates.billingCharges = chargesWithSessions;
      updates.subtotal = subtotal;
      updates.totalPrice = totalPrice;
      updates.discount = discount;
      if (discount > 0) updates.discountAuthorizedAt = new Date();
    } else if (updates.discount !== undefined) {
      // Discount-only update
      if (updates.discount > 0) await this._validateDiscountPassword(updates.discount, discountPassword, existing.discount);
      const { subtotal, totalPrice } = calcTotals(existing.billingCharges || [], updates.discount);
      updates.subtotal = subtotal;
      updates.totalPrice = totalPrice;
      if (updates.discount > 0) updates.discountAuthorizedAt = new Date();
    }

    await HospitalIPDModel.updateIPD(id, updates, filter);

    // Create transaction if provided
    if (transaction) {
      try {
        const transactionDate = transaction.transactionDate ? new Date(transaction.transactionDate) : new Date();
        await HospitalTransactionService.createHospitalTransaction({ ...transaction, visitId: id, transactionDate });
      } catch (err: any) {
        logger.error({ err: err.message, ipdId: id }, "Transaction creation failed during IPD update");
      }
    }

    return this._populateIPD(id);
  }

  /**
   * Save or update the discharge summary draft.
   * IPD must be Admitted. All fields are optional â€” call as many times as needed.
   * Now also accepts dischargeType + type-specific fields (dorRequestedBy, deathDateTime, etc.)
   */
  async saveDischargeSummary(id: string, summaryData: any): Promise<any> {
    const existing = await HospitalIPDModel.findOne({ _id: id, isDeleted: { $ne: true } }).lean() as any;
    if (!existing) throw new APIError(404, "IPD Not Found", `No IPD with ID '${id}' found.`);
    if (existing.isDischarge) {
      throw new APIError(400, "Already Discharged", "Discharge summary is locked after discharge.");
    }

    const current = existing.dischargeSummary || {};
    const merged: any = { ...current, ...summaryData, summaryStatus: "Draft" };

    if (summaryData.dischargeDate !== undefined) {
      merged.dischargeDate = summaryData.dischargeDate ? new Date(summaryData.dischargeDate) : null;
    }
    if (summaryData.deathDateTime !== undefined) {
      merged.deathDateTime = summaryData.deathDateTime ? new Date(summaryData.deathDateTime) : null;
    }

    // Keep arrays as full replacements when provided
    if (summaryData.provisionalDiagnosis !== undefined) merged.provisionalDiagnosis = summaryData.provisionalDiagnosis;
    if (summaryData.finalDiagnosis !== undefined) merged.finalDiagnosis = summaryData.finalDiagnosis;
    if (summaryData.medicinesOnDischarge !== undefined) merged.medicinesOnDischarge = summaryData.medicinesOnDischarge;
    if (summaryData.adviceOnDischarge !== undefined) merged.adviceOnDischarge = summaryData.adviceOnDischarge;

    await HospitalIPDModel.updateIPD(id, { dischargeSummary: merged });
    return this._populateIPD(id);
  }

  /**
   * Unified discharge finalizer.
   *
   * dischargeType (resolved from: input > dischargeSummary draft > defaults to "Normal")
   *
   * Normal   â€” full payment required, dischargeDate required
   * LAMA     â€” no payment block, lamaDate / dischargeDate (auto now)
   * DOR      â€” no payment block, dorRequestedBy required, dischargeDate (auto now)
   * Death    â€” no payment block, deathDateTime required
   * Refer    â€” no payment block, referHospitalName optional, dischargeDate (auto now)
   *
   * All type-specific fields are read from input first, then fall back to the
   * saved dischargeSummary draft â€” so the frontend can prefill via the summary
   * endpoint and just hit POST /discharge with no body.
   */
  async dischargeIPD(id: string, input: any): Promise<any> {
    const existing = await HospitalIPDModel.findOne({ _id: id, isDeleted: { $ne: true } }).lean() as any;
    if (!existing) throw new APIError(404, "IPD Not Found", `No IPD with ID '${id}' found.`);
    if (existing.isDischarge) throw new APIError(400, "Already Discharged", "This IPD has already been discharged.");
    if (existing.status !== "Admitted") throw new APIError(400, "Invalid Status", `Cannot discharge an IPD with status '${existing.status}'.`);

    const draft = existing.dischargeSummary || {};

    // Resolve dischargeType â€” input wins over draft
    const dischargeType: string = input.dischargeType || draft.dischargeType || "Normal";

    // â”€â”€ Resolve the "end date" for this discharge type â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    let endDate: Date;

    if (dischargeType === "Death") {
      const raw = input.deathDateTime || draft.deathDateTime;
      if (!raw) throw new APIError(400, "Death Date/Time Required", "Set deathDateTime in the discharge summary or pass it directly.");
      endDate = new Date(raw);
      if (isNaN(endDate.getTime())) throw new APIError(400, "Invalid Death Date/Time", "deathDateTime is not a valid date.");
      if (endDate > new Date()) throw new APIError(400, "Invalid Death Date/Time", "deathDateTime cannot be in the future.");
    } else {
      const raw = input.dischargeDate || draft.dischargeDate;
      if (dischargeType === "Normal" && !raw) {
        throw new APIError(400, "Discharge Date Required", "Set a dischargeDate in the discharge summary before finalizing.");
      }
      endDate = raw ? new Date(raw) : new Date();
      if (isNaN(endDate.getTime())) throw new APIError(400, "Invalid Discharge Date", "dischargeDate is not a valid date.");
      if (endDate > new Date()) throw new APIError(400, "Invalid Discharge Date", "dischargeDate cannot be in the future.");
    }

    // â”€â”€ Type-specific field validation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (dischargeType === "DOR") {
      const requestedBy = input.dorRequestedBy || draft.dorRequestedBy;
      if (!requestedBy?.trim()) throw new APIError(400, "DOR Requested By Required", "Set dorRequestedBy in the discharge summary or pass it directly.");
    }
    if (dischargeType === "Refer") {
      // referHospitalName is optional â€” no enforcement
    }

    // â”€â”€ Optional transaction â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (input.transaction) {
      try {
        const txDate = input.transaction.transactionDate ? new Date(input.transaction.transactionDate) : new Date();
        await HospitalTransactionService.createHospitalTransaction({ ...input.transaction, visitId: id, transactionDate: txDate });
      } catch (err: any) {
        if (dischargeType === "Normal") throw new APIError(500, "Transaction Failed", `Could not record final payment: ${err.message}`);
        logger.error({ err: err.message, ipdId: id }, "Transaction failed during discharge â€” non-fatal for non-Normal types");
      }
    }

    // â”€â”€ Freeze bed charge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    let finalCharges = [...(existing.billingCharges || [])];
    if (existing.bedId) {
      try {
        const HospitalBed = mongoose.model("HospitalBed");
        const bed = await HospitalBed.findOne({ _id: existing.bedId, isDeleted: { $ne: true } }).lean() as any;
        if (bed) {
          const HospitalWard = mongoose.model("HospitalWard");
          const ward = await HospitalWard.findOne({ _id: bed.wardId, isDeleted: { $ne: true } }).lean() as any;

          // â”€â”€ Freeze bed charge (only if allowed) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
          if (existing.allowBedCharges !== false) {
            const effectiveRate: number | null = (bed.chargePerDay != null && bed.chargePerDay > 0)
              ? bed.chargePerDay
              : (ward?.chargePerDay ?? null);
            if (effectiveRate) {
              const from = new Date(existing.admissionDate);
              const days = Math.max(1, Math.ceil((endDate.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)));
              const frozenBedCharge = {
                type: "bed",
                chargeId: randomUUID(),
                bedId: bed._id.toString(),
                bedNumber: bed.bedNumber,
                wardId: ward._id.toString(),
                wardName: ward.name,
                chargePerDay: effectiveRate,
                units: days,
                totalCharge: effectiveRate * days,
                fromDate: from,
                toDate: endDate,
                addedAt: new Date(),
              };
              finalCharges = finalCharges.filter((c: any) => c.type !== "bed");
              finalCharges.push(frozenBedCharge);
            }
          }

          // â”€â”€ Freeze nursing charge (only if allowed) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
          if (existing.allowNursingCharges !== false) {
            const nursingRate: number | null = (ward?.nursingChargePerDay != null && ward.nursingChargePerDay > 0)
              ? ward.nursingChargePerDay
              : null;
            if (nursingRate) {
              const from = new Date(existing.admissionDate);
              const days = Math.max(1, Math.ceil((endDate.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)));
              const frozenNursingCharge = {
                type: "nursing",
                chargeId: randomUUID(),
                wardId: ward._id.toString(),
                wardName: ward.name,
                nursingChargePerDay: nursingRate,
                units: days,
                totalCharge: nursingRate * days,
                fromDate: from,
                toDate: endDate,
                addedAt: new Date(),
              };
              finalCharges = finalCharges.filter((c: any) => c.type !== "nursing");
              finalCharges.push(frozenNursingCharge);
            }
          }
        }
      } catch (err: any) {
        logger.warn({ err: err.message, bedId: existing.bedId }, "Could not freeze bed/nursing charge on discharge â€” skipping");
      }
    }

    const { subtotal, totalPrice } = calcTotals(finalCharges, existing.discount || 0);

    // â”€â”€ Payment check (Normal only blocks) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const transactions = await HospitalTransactionService.getTransactionsByVisit(id);
    const totalPaid = calcTotalPaid(transactions);
    if (dischargeType === "Normal" && totalPaid < totalPrice) {
      const due = totalPrice - totalPaid;
      throw new APIError(400, "Payment Pending", `Outstanding balance of â‚¹${due.toFixed(2)} must be cleared before discharge.`);
    }
    const paymentNotCleared = totalPaid < totalPrice;

    // â”€â”€ Build finalized discharge summary â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const summaryOverrides: any = {};
    const clinicalFields = ["clinicalSummary", "provisionalDiagnosis", "finalDiagnosis", "courseInHospital", "treatmentGiven", "conditionOnDischarge", "medicinesOnDischarge", "adviceOnDischarge", "followUp"];
    for (const f of clinicalFields) { if (input[f] !== undefined) summaryOverrides[f] = input[f]; }

    // Merge type-specific fields from input (override draft)
    const typeFields = ["dorRequestedBy", "dorReason", "lamaReason", "deathDateTime", "deathCause", "referHospitalName", "referReason"];
    for (const f of typeFields) { if (input[f] !== undefined) summaryOverrides[f] = input[f]; }

    // Merge vitals / allergy fields from input (override draft)
    const vitalsFields = ["allergies", "dischargeBp", "dischargePulse", "dischargeTemp", "dischargeSpO2"];
    for (const f of vitalsFields) { if (input[f] !== undefined) summaryOverrides[f] = input[f]; }

    const finalSummary: any = {
      ...draft,
      ...summaryOverrides,
      dischargeType,
      summaryStatus: "Finalized",
      finalizedAt: new Date(),
      ...(input.finalizedBy ? { finalizedBy: input.finalizedBy } : {}),
    };

    // Store end date in the right field
    if (dischargeType === "Death") {
      finalSummary.deathDateTime = endDate;
    } else {
      finalSummary.dischargeDate = endDate;
    }

    // â”€â”€ Status mapping â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const statusMap: Record<string, string> = {
      Normal: "Discharged",
      LAMA: "LAMA",
      DOR: "DOR",
      Death: "Death",
      Refer: "Refer",
    };

    await HospitalIPDModel.updateIPD(id, {
      isDischarge: true,
      status: statusMap[dischargeType] as any,
      dischargeType: dischargeType as any,
      billingCharges: finalCharges,
      subtotal,
      totalPrice,
      ...(dischargeType !== "Normal" ? { paymentNotCleared } : {}),
      dischargeSummary: finalSummary,
    });

    // â”€â”€ Release bed â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (existing.bedId) {
      try { await HospitalBedService.releaseBed(existing.bedId); } catch (err: any) {
        logger.error({ err: err.message, bedId: existing.bedId }, "Failed to release bed on discharge");
      }
    }

    return this._populateIPD(id);
  }

  /**
   * LAMA â€” delegates to unified dischargeIPD with type=LAMA.
   * Kept for backward compatibility.
   */
  async lamaIPD(id: string, input: any): Promise<any> {
    return this.dischargeIPD(id, {
      ...input,
      dischargeType: "LAMA",
      lamaReason: input.reason || input.lamaReason,
      dischargeDate: input.lamaDate || input.dischargeDate,
    });
  }

  /**
   * DOR â€” delegates to unified dischargeIPD with type=DOR.
   * Kept for backward compatibility.
   */
  async dorIPD(id: string, input: any): Promise<any> {
    return this.dischargeIPD(id, {
      ...input,
      dischargeType: "DOR",
      dorRequestedBy: input.requestedBy || input.dorRequestedBy,
      dorReason: input.reason || input.dorReason,
      dischargeDate: input.dorDate || input.dischargeDate,
    });
  }

  /**
   * Death â€” delegates to unified dischargeIPD with type=Death.
   * Kept for backward compatibility.
   */
  async deathIPD(id: string, input: any): Promise<any> {
    return this.dischargeIPD(id, {
      ...input,
      dischargeType: "Death",
      deathCause: input.cause || input.deathCause,
    });
  }

  /**
   * Refer â€” delegates to unified dischargeIPD with type=Refer.
   * Kept for backward compatibility.
   */
  async referIPD(id: string, input: any): Promise<any> {
    return this.dischargeIPD(id, {
      ...input,
      dischargeType: "Refer",
      referHospitalName: input.hospitalName || input.referHospitalName,
      referReason: input.reason || input.referReason,
      dischargeDate: input.referDate || input.dischargeDate,
    });
  }

  /**
   * Cancel IPD â€” administrative cancellation (created in error / patient never admitted).
   * Payment check: does NOT block â€” sets paymentNotCleared flag if dues remain.
   * Freezes bed charge to cancellationDate, releases bed.
   */
  async cancelIPD(id: string, input: any): Promise<any> {
    const existing = await HospitalIPDModel.findOne({ _id: id, isDeleted: { $ne: true } }).lean() as any;
    if (!existing) throw new APIError(404, "IPD Not Found", `No IPD with ID '${id}' found.`);
    if (existing.status !== "Admitted") {
      throw new APIError(400, "Invalid Status", `Cannot cancel an IPD with status '${existing.status}'.`);
    }

    const cancellationDate = new Date();

    // Freeze bed charge to now (cancellation time)
    let finalCharges = [...(existing.billingCharges || [])];
    if (existing.bedId) {
      try {
        const HospitalBed = mongoose.model("HospitalBed");
        const bed = await HospitalBed.findOne({ _id: existing.bedId, isDeleted: { $ne: true } }).lean() as any;
        if (bed) {
          const HospitalWard = mongoose.model("HospitalWard");
          const ward = await HospitalWard.findOne({ _id: bed.wardId, isDeleted: { $ne: true } }).lean() as any;

          // â”€â”€ Freeze bed charge (only if allowed) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
          if (existing.allowBedCharges !== false) {
            const effectiveRate: number | null = (bed.chargePerDay != null && bed.chargePerDay > 0)
              ? bed.chargePerDay
              : (ward?.chargePerDay ?? null);
            if (effectiveRate) {
              const from = new Date(existing.admissionDate);
              const days = Math.max(1, Math.ceil((cancellationDate.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)));
              const frozenBedCharge = {
                type: "bed",
                chargeId: randomUUID(),
                bedId: bed._id.toString(),
                bedNumber: bed.bedNumber,
                wardId: ward._id.toString(),
                wardName: ward.name,
                chargePerDay: effectiveRate,
                units: days,
                totalCharge: effectiveRate * days,
                fromDate: from,
                toDate: cancellationDate,
                addedAt: new Date(),
              };
              finalCharges = finalCharges.filter((c: any) => c.type !== "bed");
              finalCharges.push(frozenBedCharge);
            }
          }

          // â”€â”€ Freeze nursing charge (only if allowed) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
          if (existing.allowNursingCharges !== false) {
            const nursingRate: number | null = (ward?.nursingChargePerDay != null && ward.nursingChargePerDay > 0)
              ? ward.nursingChargePerDay
              : null;
            if (nursingRate) {
              const from = new Date(existing.admissionDate);
              const days = Math.max(1, Math.ceil((cancellationDate.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)));
              const frozenNursingCharge = {
                type: "nursing",
                chargeId: randomUUID(),
                wardId: ward._id.toString(),
                wardName: ward.name,
                nursingChargePerDay: nursingRate,
                units: days,
                totalCharge: nursingRate * days,
                fromDate: from,
                toDate: cancellationDate,
                addedAt: new Date(),
              };
              finalCharges = finalCharges.filter((c: any) => c.type !== "nursing");
              finalCharges.push(frozenNursingCharge);
            }
          }
        }
      } catch (err: any) {
        logger.warn({ err: err.message, bedId: existing.bedId }, "Could not freeze bed/nursing charge on cancel â€” skipping");
      }
    }

    const { subtotal, totalPrice } = calcTotals(finalCharges, existing.discount || 0);

    // Check payment â€” warn only, do not block
    const transactions = await HospitalTransactionService.getTransactionsByVisit(id);
    const totalPaid = calcTotalPaid(transactions);
    const paymentNotCleared = totalPaid < totalPrice;

    // Store cancellationDate inside dischargeSummary so bed charge calc uses it
    const existingSummary = existing.dischargeSummary || {};
    const cancelSummary = {
      ...existingSummary,
      dischargeDate: cancellationDate,
      summaryStatus: "Finalized",
      finalizedAt: new Date(),
      ...(input.finalizedBy ? { finalizedBy: input.finalizedBy } : {}),
    };

    await HospitalIPDModel.updateIPD(id, {
      isDischarge: false,
      status: "Cancelled",
      billingCharges: finalCharges,
      subtotal,
      totalPrice,
      paymentNotCleared,
      dischargeSummary: cancelSummary,
      ...(input.reason ? { reason: input.reason } : {}),
    });

    if (existing.bedId) {
      try { await HospitalBedService.releaseBed(existing.bedId); } catch (err: any) {
        logger.error({ err: err.message, bedId: existing.bedId }, "Failed to release bed on cancel");
      }
    }

    return this._populateIPD(id);
  }

  async deleteIPD(id: string, deletedBy?: string, filter: any = {}): Promise<void> {
    const existing = await HospitalIPDModel.findOne({ _id: id, isDeleted: { $ne: true }, ...(filter || {}) }).lean() as any;
    if (!existing) throw new APIError(404, "IPD Not Found", `No IPD with ID '${id}' found.`);

    // Release bed
    if (existing.bedId && existing.status === "Admitted") {
      try { await HospitalBedService.releaseBed(existing.bedId); } catch {}
    }

    await HospitalIPDModel.softDeleteIPD(id, deletedBy, filter);
    await HospitalTransactionService.deleteTransactionsByVisitId(id);
  }

  async addBillingCharge(id: string, rawCharges: any | any[]): Promise<any> {
    const existing = await HospitalIPDModel.findOne({ _id: id, isDeleted: { $ne: true } }).lean() as any;
    if (!existing) throw new APIError(404, "IPD Not Found", `No IPD with ID '${id}' found.`);

    // Accept both a single charge object and an array
    const chargesArray = Array.isArray(rawCharges) ? rawCharges : [rawCharges];

    // Guard bed and nursing charges against IPD-level flags
    for (const c of chargesArray) {
      if (c.type === "bed" && existing.allowBedCharges === false) {
        throw new APIError(400, "Bed Charges Not Allowed", "Bed charges are not allowed for this IPD.");
      }
      if (c.type === "nursing" && existing.allowNursingCharges === false) {
        throw new APIError(400, "Nursing Charges Not Allowed", "Nursing charges are not allowed for this IPD.");
      }
    }

    const resolved = await resolveBillingCharges(chargesArray);
    const updatedCharges = [...(existing.billingCharges || []), ...resolved];

    // Auto-create dialysis sessions if needed
    const chargesWithSessions = await createDialysisSessions(id, existing.patientId, updatedCharges);

    const { subtotal, totalPrice } = calcTotals(chargesWithSessions, existing.discount || 0);
    await HospitalIPDModel.updateIPD(id, { billingCharges: chargesWithSessions, subtotal, totalPrice });
    return this._populateIPD(id);
  }

  /**
   * Add or update the dynamic bed charge for an IPD.
   * Calculates days between fromDate and toDate using the ward's chargePerDay.
   * If a bed charge already exists it is replaced (only one bed charge per IPD).
   */
  async addBedCharge(id: string, fromDate: Date, toDate: Date): Promise<any> {
    const existing = await HospitalIPDModel.findOne({ _id: id, isDeleted: { $ne: true } }).lean() as any;
    if (!existing) throw new APIError(404, "IPD Not Found", `No IPD with ID '${id}' found.`);
    if (existing.allowBedCharges === false) {
      throw new APIError(400, "Bed Charges Not Allowed", "Bed charges are not allowed for this IPD.");
    }
    if (!existing.bedId) throw new APIError(400, "No Bed Assigned", "This IPD has no bed assigned.");

    // Resolve the bed charge via the standard resolver
    const [resolved] = await resolveBillingCharges([{ type: "bed", bedId: existing.bedId, fromDate, toDate }]);

    // Replace any existing bed charge, keep everything else
    const otherCharges = (existing.billingCharges || []).filter((c: any) => c.type !== "bed");
    const updatedCharges = [...otherCharges, resolved];

    const { subtotal, totalPrice } = calcTotals(updatedCharges, existing.discount || 0);
    await HospitalIPDModel.updateIPD(id, { billingCharges: updatedCharges, subtotal, totalPrice });
    return this._populateIPD(id);
  }

  /**
   * Add or update the nursing charge for an IPD.
   * Uses ward.nursingChargePerDay. Only one nursing charge per IPD (replaced on re-add).
   */
  async addNursingCharge(id: string, fromDate: Date, toDate: Date): Promise<any> {
    const existing = await HospitalIPDModel.findOne({ _id: id, isDeleted: { $ne: true } }).lean() as any;
    if (!existing) throw new APIError(404, "IPD Not Found", `No IPD with ID '${id}' found.`);
    if (existing.allowNursingCharges === false) {
      throw new APIError(400, "Nursing Charges Not Allowed", "Nursing charges are not allowed for this IPD.");
    }
    if (!existing.bedId) throw new APIError(400, "No Bed Assigned", "This IPD has no bed assigned.");

    const HospitalBed = mongoose.model("HospitalBed");
    const bed = await HospitalBed.findOne({ _id: existing.bedId, isDeleted: { $ne: true } }).lean() as any;
    if (!bed) throw new APIError(404, "Bed Not Found", "The assigned bed could not be found.");

    const HospitalWard = mongoose.model("HospitalWard");
    const ward = await HospitalWard.findOne({ _id: bed.wardId, isDeleted: { $ne: true } }).lean() as any;
    if (!ward) throw new APIError(404, "Ward Not Found", "The ward for the assigned bed could not be found.");

    const rate: number = ward.nursingChargePerDay;
    if (!rate || rate <= 0) throw new APIError(400, "Nursing Charge Not Configured", "This ward has no nursing charge configured.");

    const from = new Date(fromDate);
    const to = new Date(toDate);
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      throw new APIError(400, "Invalid Dates", "fromDate and toDate must be valid dates.");
    }
    const days = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)));

    const nursingCharge = {
      type: "nursing" as const,
      chargeId: randomUUID(),
      wardId: ward._id.toString(),
      wardName: ward.name,
      nursingChargePerDay: rate,
      units: days,
      totalCharge: rate * days,
      fromDate: from,
      toDate: to,
      isCompleted: false,
      addedAt: new Date(),
    };

    // Replace any existing nursing charge, keep everything else
    const otherCharges = (existing.billingCharges || []).filter((c: any) => c.type !== "nursing");
    const updatedCharges = [...otherCharges, nursingCharge];

    const { subtotal, totalPrice } = calcTotals(updatedCharges, existing.discount || 0);
    await HospitalIPDModel.updateIPD(id, { billingCharges: updatedCharges, subtotal, totalPrice });
    return this._populateIPD(id);
  }

  async updateBillingChargeCompletion(id: string, chargeId: string, isCompleted: boolean): Promise<any> {
    const existing = await HospitalIPDModel.findOne({ _id: id, isDeleted: { $ne: true } }).lean() as any;
    if (!existing) throw new APIError(404, "IPD Not Found", `No IPD with ID '${id}' found.`);

    const charges = (existing.billingCharges || []) as any[];
    const idx = charges.findIndex((c: any) => c.chargeId === chargeId);
    if (idx === -1) {
      throw new APIError(404, "Charge Not Found", `No billing charge with chargeId '${chargeId}' found.`);
    }

    charges[idx] = { ...charges[idx], isCompleted };
    await HospitalIPDModel.updateIPD(id, { billingCharges: charges });
    return this._populateIPD(id);
  }

  async removeBillingCharge(id: string, chargeId: string): Promise<any> {
    const existing = await HospitalIPDModel.findOne({ _id: id, isDeleted: { $ne: true } }).lean() as any;
    if (!existing) throw new APIError(404, "IPD Not Found", `No IPD with ID '${id}' found.`);

    const charges = (existing.billingCharges || []) as any[];
    const idx = charges.findIndex((c: any) => c.chargeId === chargeId);
    if (idx === -1) {
      throw new APIError(404, "Charge Not Found", `No billing charge with chargeId '${chargeId}' found.`);
    }

    const removedCharge = charges[idx];
    charges.splice(idx, 1);

    // Cancel any dialysis sessions linked to the removed charge
    try {
      const DialysisSessionModel = (await import("../../hospital-dialysis-session/models/dialysis-session.model")).default;

      // Collect session IDs from the charge itself (if dialysisSessionId was stored)
      const sessionIdsToCancel: string[] = [];
      const procedureIdsToLookup: string[] = []; // fallback: find by ipdId + procedureId

      if (removedCharge.type === "procedure" && removedCharge.isDialysis !== false) {
        if (Array.isArray((removedCharge as any).dialysisSessionIds) && (removedCharge as any).dialysisSessionIds.length > 0) {
          sessionIdsToCancel.push(...(removedCharge as any).dialysisSessionIds);
        } else if (removedCharge.dialysisSessionId) {
          sessionIdsToCancel.push(removedCharge.dialysisSessionId);
        } else {
          procedureIdsToLookup.push(removedCharge.procedureId);
        }
      } else if (removedCharge.type === "procedure_package" && Array.isArray(removedCharge.procedures)) {
        for (const proc of removedCharge.procedures) {
          if (proc.isDialysis !== false) {
            if (Array.isArray((proc as any).dialysisSessionIds) && (proc as any).dialysisSessionIds.length > 0) {
              sessionIdsToCancel.push(...(proc as any).dialysisSessionIds);
            } else if (proc.dialysisSessionId) {
              sessionIdsToCancel.push(proc.dialysisSessionId);
            } else {
              procedureIdsToLookup.push(proc.procedureId);
            }
          }
        }
      }

      // Cancel sessions by stored ID
      for (const sessionId of sessionIdsToCancel) {
        await DialysisSessionModel.findByIdAndUpdate(sessionId, { $set: { status: "Cancelled" } });
      }

      // Fallback: cancel sessions matched by ipdId + procedureId (handles cases where dialysisSessionId wasn't stored)
      if (procedureIdsToLookup.length > 0) {
        await DialysisSessionModel.updateMany(
          { ipdId: id, procedureId: { $in: procedureIdsToLookup }, status: { $ne: "Cancelled" }, isDeleted: { $ne: true } },
          { $set: { status: "Cancelled" } }
        );
      }

      // Safety net: cancel ALL active sessions for this IPD that match the removed procedureId
      if (removedCharge.procedureId) {
        await DialysisSessionModel.updateMany(
          { ipdId: id, procedureId: removedCharge.procedureId, status: { $ne: "Cancelled" }, isDeleted: { $ne: true } },
          { $set: { status: "Cancelled" } }
        );
      }
    } catch (err: any) {
      logger.error({ err: err.message, chargeId, ipdId: id }, "Failed to cancel dialysis session(s) when removing billing charge");
    }

    const { subtotal, totalPrice } = calcTotals(charges, existing.discount || 0);
    await HospitalIPDModel.updateIPD(id, { billingCharges: charges, subtotal, totalPrice });
    return this._populateIPD(id);
  }

  async getIPDsForPathlab(
    page: number,
    limit: number,
    search: string,
    status?: string
  ): Promise<any> {
    const skip = (page - 1) * limit;
    const query: any = {};
    if (status) query.status = status;

    const { data, totalCount } = await HospitalIPDModel.readIPDsForPathlab(query, search, skip, limit);
    return {
      ipds: data,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
        hasNextPage: page < Math.ceil(totalCount / limit),
        hasPrevPage: page > 1,
      },
    };
  }

  private async _populateIPD(id: string): Promise<any> {
    let ipd = await HospitalIPDModel.readIPDById(id);
    if (ipd.billingCharges?.length) {
      ipd.billingCharges = await populateTestCharges(ipd.billingCharges);
      ipd.billingCharges = await populateDialysisCharges(ipd.billingCharges);
    }
    ipd = await resolveMlcSignedUrl(ipd);
    ipd = await resolvePatientSignedUrls(ipd);
    ipd = applyBedCharge(ipd);
    try {
      const transactions = await HospitalTransactionService.getTransactionsByVisit(id);
      ipd.transactions = transactions;
      const totalPaid = calcTotalPaid(transactions);
      ipd.amountPaid = totalPaid;
      ipd.paymentStatus = calcPaymentStatus(ipd.totalPrice || 0, totalPaid);
    } catch {
      ipd.amountPaid = 0;
      ipd.paymentStatus = "Unpaid";
    }
    return ipd;
  }
}

export default new HospitalIPDService();
