import mongoose from "mongoose";
import { APIError } from "@src/shared";
import DialysisSessionModel from "../models/dialysis-session.model";
import { getNextSequence } from "@src/libs/counter";
import { 
  CreateDialysisSessionDTO, 
  DialysisSessionResponseDTO,
  AddMonitoringReadingDTO
} from "../dtos/dialysis-session.dto";
import { DialysisSession } from "../models/dialysis-session.types";

export function parseUTCStartOfDay(dateInput: any): Date | null {
  if (!dateInput) return null;
  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) return null;
    return new Date(Date.UTC(dateInput.getUTCFullYear(), dateInput.getUTCMonth(), dateInput.getUTCDate(), 0, 0, 0, 0));
  }
  if (typeof dateInput === "string") {
    const match = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const day = parseInt(match[3], 10);
      return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
    }
    const d = new Date(dateInput);
    if (!isNaN(d.getTime())) {
      return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
    }
  }
  return null;
}

export function parseUTCEndOfDay(dateInput: any): Date | null {
  const start = parseUTCStartOfDay(dateInput);
  if (!start) return null;
  return new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate(), 23, 59, 59, 999));
}

export function formatUTCDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function validateSlotCapacity(
  slotId: string,
  sessionDateInput: Date | string,
  excludeSessionId?: string | string[],
  requiredCount: number = 1
): Promise<{ doctorId: string; slotDetails: { name: string; startTime: string; endTime: string } }> {
  const sessionDate = parseUTCStartOfDay(sessionDateInput);
  if (!sessionDate) {
    throw new APIError(400, "Bad Request", "Invalid sessionDate provided");
  }

  const HospitalDoctorModel = (await import("../../hospital-doctor/models/hospital-doctor.model")).default;
  const doctor = await HospitalDoctorModel.findOne({
    "dialysisSlots._id": new mongoose.Types.ObjectId(slotId),
    isDeleted: { $ne: true }
  }).lean();

  if (!doctor) {
    throw new APIError(404, "Slot Not Found", `No doctor found with dialysis slot ID '${slotId}'`);
  }

  const matchedSlot = doctor.dialysisSlots?.find((s: any) => s._id.toString() === slotId.toString());
  if (!matchedSlot || matchedSlot.isActive === false) {
    throw new APIError(404, "Slot Not Found", `Dialysis slot with ID '${slotId}' is inactive or not found`);
  }

  const startOfDay = parseUTCStartOfDay(sessionDate)!;
  const endOfDay = parseUTCEndOfDay(sessionDate)!;

  const countQuery: any = {
    slotId: slotId.toString(),
    sessionDate: { $gte: startOfDay, $lte: endOfDay },
    status: { $ne: "Cancelled" },
    isDeleted: { $ne: true },
  };

  if (excludeSessionId) {
    if (Array.isArray(excludeSessionId)) {
      const validIds = excludeSessionId.filter(id => mongoose.Types.ObjectId.isValid(id)).map(id => new mongoose.Types.ObjectId(id));
      if (validIds.length > 0) {
        countQuery._id = { $nin: validIds };
      }
    } else if (mongoose.Types.ObjectId.isValid(excludeSessionId)) {
      countQuery._id = { $ne: new mongoose.Types.ObjectId(excludeSessionId) };
    }
  }

  const bookedCount = await DialysisSessionModel.countDocuments(countQuery);

  if (bookedCount + requiredCount > matchedSlot.maxAppointments) {
    const available = Math.max(0, matchedSlot.maxAppointments - bookedCount);
    throw new APIError(
      409,
      "Slot Capacity Exceeded",
      `Dialysis slot '${matchedSlot.name}' has capacity for ${matchedSlot.maxAppointments} appointments (${available} available, ${requiredCount} requested) on this date.`
    );
  }

  return {
    doctorId: (doctor as any)._id.toString(),
    slotDetails: {
      name: matchedSlot.name,
      startTime: matchedSlot.startTime,
      endTime: matchedSlot.endTime,
    }
  };
}

class DialysisSessionService {
  async createDialysisSession(
    newSession: CreateDialysisSessionDTO
  ): Promise<DialysisSessionResponseDTO> {
    let patientId = newSession.patientId;

    // Auto-fill patientId from daycareAppointmentId if not provided
    if (!patientId && newSession.daycareAppointmentId) {
      const DaycareAppointmentModel = (await import("../../hospital-daycare-appointment/models/daycare-appointment.model")).default;
      const appt = await DaycareAppointmentModel.findById(newSession.daycareAppointmentId).lean();
      if (!appt) {
        throw new Error(`Daycare appointment with ID '${newSession.daycareAppointmentId}' not found`);
      }
      patientId = (appt as any).patientId;
    }

    if (!patientId) {
      throw new Error("patientId is required when daycareAppointmentId is not provided");
    }

    // Deduplication guard: Check if an active session already exists for this daycare appointment / IPD procedure
    if (newSession.daycareAppointmentId && newSession.procedureId && !(newSession as any).allowMultiple) {
      const existingSession = await DialysisSessionModel.findOne({
        daycareAppointmentId: newSession.daycareAppointmentId,
        procedureId: newSession.procedureId,
        status: { $ne: "Cancelled" },
        isDeleted: { $ne: true },
      }).lean();

      if (existingSession) {
        // Reuse and update existing session
        return await this.updateDialysisSessionById((existingSession as any)._id.toString(), {
          ...(newSession.slotId !== undefined ? { slotId: newSession.slotId } : {}),
          ...(newSession.sessionDate !== undefined ? { sessionDate: parseUTCStartOfDay(newSession.sessionDate) || undefined } : {}),
        });
      }
    } else if ((newSession as any).ipdId && newSession.procedureId && !(newSession as any).allowMultiple) {
      const existingSession = await DialysisSessionModel.findOne({
        ipdId: (newSession as any).ipdId,
        procedureId: newSession.procedureId,
        status: { $ne: "Cancelled" },
        isDeleted: { $ne: true },
      }).lean();

      if (existingSession) {
        return await this.updateDialysisSessionById((existingSession as any)._id.toString(), {
          ...(newSession.slotId !== undefined ? { slotId: newSession.slotId } : {}),
          ...(newSession.sessionDate !== undefined ? { sessionDate: parseUTCStartOfDay(newSession.sessionDate) || undefined } : {}),
        });
      }
    }

    // Generate sessionId
    const nextSessionId = await getNextSequence("dialysisSessionId");
    const generatedSessionId = `DIA${String(nextSessionId).padStart(5, "0")}`;

    let doctorId = newSession.doctorId || null;
    let slotDetails = newSession.slotDetails || undefined;
    let sessionDate: Date | null = parseUTCStartOfDay(newSession.sessionDate);

    // Auto-resolve doctor and validate slot capacity if slotId is provided
    if (newSession.slotId) {
      if (sessionDate) {
        const validated = await validateSlotCapacity(newSession.slotId, sessionDate);
        doctorId = validated.doctorId;
        slotDetails = validated.slotDetails;
      } else {
        const HospitalDoctorModel = (await import("../../hospital-doctor/models/hospital-doctor.model")).default;
        const doctor = await HospitalDoctorModel.findOne({
          "dialysisSlots._id": new mongoose.Types.ObjectId(newSession.slotId),
          isDeleted: { $ne: true }
        }).lean();

        if (!doctor) {
          throw new APIError(404, "Slot Not Found", `No doctor found with dialysis slot ID '${newSession.slotId}'`);
        }

        const matchedSlot = doctor.dialysisSlots?.find((s: any) => s._id.toString() === newSession.slotId!.toString());
        if (!matchedSlot || matchedSlot.isActive === false) {
          throw new APIError(404, "Slot Not Found", `Dialysis slot with ID '${newSession.slotId}' is inactive or not found`);
        }

        doctorId = (doctor as any)._id.toString();
        slotDetails = {
          name: matchedSlot.name,
          startTime: matchedSlot.startTime,
          endTime: matchedSlot.endTime,
        };
      }
    }

    // Create session
    const session = await DialysisSessionModel.createDialysisSession({
      ...newSession,
      patientId,
      sessionId: generatedSessionId,
      sessionDate,
      slotId: newSession.slotId || null,
      doctorId,
      slotDetails,
      monitoringReadings: newSession.monitoringReadings || [],
      status: newSession.status || "In Progress",
      daycareAppointmentId: newSession.daycareAppointmentId || null,
      source: newSession.daycareAppointmentId
        ? "daycare"
        : (newSession as any).ipdId
          ? "ipd"
          : "manual",
    } as DialysisSession);

    // If linked to a daycare appointment + procedure, patch the appointment's procedure entry
    if (newSession.daycareAppointmentId && newSession.procedureId) {
      try {
        const DaycareAppointmentModel = (await import("../../hospital-daycare-appointment/models/daycare-appointment.model")).default;
        await DaycareAppointmentModel.findByIdAndUpdate(
          newSession.daycareAppointmentId,
          {
            $set: {
              "procedures.$[elem].dialysisSessionId": (session as any)._id?.toString(),
            }
          },
          {
            arrayFilters: [{ "elem.procedureId": newSession.procedureId }],
            new: true,
          }
        );
      } catch (err: any) {
        // Non-fatal — log and continue
        console.error(`Failed to patch dialysisSessionId on daycare appointment: ${err.message}`);
      }
    }

    return session as DialysisSessionResponseDTO;
  }

  async getDialysisSessions(
    query: any = {},
    search: any = {},
    skip: number = 0,
    limit: number = 10
  ): Promise<DialysisSessionResponseDTO[]> {
    const sessions = await DialysisSessionModel.readDialysisSessions(
      query,
      search,
      skip,
      limit
    );

    return sessions;
  }

  async getDialysisSession(sessionId: string): Promise<DialysisSessionResponseDTO> {
    const session = await DialysisSessionModel.readDialysisSession(sessionId);
    return session;
  }

  async getDialysisSessionById(id: string): Promise<DialysisSessionResponseDTO> {
    const session = await DialysisSessionModel.readDialysisSessionById(id);
    return session as DialysisSessionResponseDTO;
  }

  async updateDialysisSession(
    sessionId: string,
    updates: Partial<DialysisSession>
  ): Promise<DialysisSessionResponseDTO> {
    const updatedSession = await DialysisSessionModel.updateDialysisSession(
      sessionId,
      updates
    );

    return updatedSession as DialysisSessionResponseDTO;
  }

  async updateDialysisSessionById(
    id: string,
    updates: Partial<DialysisSession>
  ): Promise<DialysisSessionResponseDTO> {
    const existingSession = await DialysisSessionModel.findById(id).lean();
    if (!existingSession) {
      throw new APIError(404, "Dialysis Session Not Found", `Dialysis session with ID '${id}' not found`);
    }

    const effectiveSlotId = updates.slotId !== undefined ? updates.slotId : existingSession.slotId;
    const effectiveSessionDate = updates.sessionDate !== undefined
      ? parseUTCStartOfDay(updates.sessionDate)
      : parseUTCStartOfDay(existingSession.sessionDate);

    if (updates.sessionDate !== undefined) {
      updates.sessionDate = parseUTCStartOfDay(updates.sessionDate) as any;
    }

    // Validate capacity and resolve doctor/slotDetails
    if (effectiveSlotId) {
      if (effectiveSessionDate) {
        const validated = await validateSlotCapacity(effectiveSlotId, effectiveSessionDate, id);
        updates.doctorId = validated.doctorId;
        updates.slotDetails = validated.slotDetails;
      } else if (updates.slotId) {
        const HospitalDoctorModel = (await import("../../hospital-doctor/models/hospital-doctor.model")).default;
        const doctor = await HospitalDoctorModel.findOne({
          "dialysisSlots._id": new mongoose.Types.ObjectId(updates.slotId),
          isDeleted: { $ne: true }
        }).lean();

        if (!doctor) {
          throw new APIError(404, "Slot Not Found", `No doctor found with dialysis slot ID '${updates.slotId}'`);
        }

        const matchedSlot = doctor.dialysisSlots?.find((s: any) => s._id.toString() === updates.slotId!.toString());
        if (!matchedSlot || matchedSlot.isActive === false) {
          throw new APIError(404, "Slot Not Found", `Dialysis slot with ID '${updates.slotId}' is inactive or not found`);
        }

        updates.doctorId = (doctor as any)._id.toString();
        updates.slotDetails = {
          name: matchedSlot.name,
          startTime: matchedSlot.startTime,
          endTime: matchedSlot.endTime,
        };
      }
    }

    const updatedSession = await DialysisSessionModel.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );
    
    if (!updatedSession) {
      throw new Error(`Dialysis session with ID '${id}' not found`);
    }

    return updatedSession.toObject() as DialysisSessionResponseDTO;
  }

  async deleteDialysisSession(sessionId: string, deletedBy?: string): Promise<void> {
    await DialysisSessionModel.deleteDialysisSession(sessionId, deletedBy);
  }

  async deleteDialysisSessionById(id: string): Promise<void> {
    const deleted = await DialysisSessionModel.findByIdAndDelete(id);
    
    if (!deleted) {
      throw new Error(`Dialysis session with ID '${id}' not found`);
    }
  }

  async getSessionsByVisit(visitId: string, filter: any = {}): Promise<DialysisSessionResponseDTO[]> {
    const sessions = await DialysisSessionModel.getSessionsByVisit(visitId, filter);
    return sessions;
  }

  async getSessionsByPatient(
    patientId: string,
    skip: number = 0,
    limit: number = 10,
    filter: any = {}
  ): Promise<DialysisSessionResponseDTO[]> {
    const sessions = await DialysisSessionModel.getSessionsByPatient(patientId, skip, limit, filter);
    return sessions;
  }

  async countSessionsByPatient(patientId: string, filter: any = {}): Promise<number> {
    return DialysisSessionModel.countDocuments({ patientId, isDeleted: { $ne: true }, ...filter });
  }

  async addMonitoringReading(
    sessionId: string,
    readingData: AddMonitoringReadingDTO
  ): Promise<DialysisSessionResponseDTO> {
    const updatedSession = await DialysisSessionModel.addMonitoringReading(
      sessionId,
      readingData.reading
    );

    return updatedSession as DialysisSessionResponseDTO;
  }

  async getMonthlyCalendar(year: number, month: number, doctorId?: string): Promise<any> {
    const yr = Number(year);
    const mth = Number(month); // 1-12
    if (isNaN(yr) || isNaN(mth) || mth < 1 || mth > 12) {
      throw new APIError(400, "Bad Request", "Valid year and month (1-12) are required");
    }

    // Start & end of requested month (in UTC)
    const startDate = new Date(Date.UTC(yr, mth - 1, 1, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(yr, mth, 0, 23, 59, 59, 999));

    const matchQuery: any = {
      sessionDate: { $gte: startDate, $lte: endDate },
      slotId: { $ne: null, $exists: true },
      isDeleted: { $ne: true },
      status: { $ne: "Cancelled" },
    };

    if (doctorId) {
      matchQuery.doctorId = doctorId;
    }

    // Fetch all sessions matching query
    const sessions = await DialysisSessionModel.aggregate([
      { $match: matchQuery },
      {
        $addFields: {
          patientObjectId: {
            $cond: {
              if: { $regexMatch: { input: "$patientId", regex: /^[0-9a-fA-F]{24}$/ } },
              then: { $toObjectId: "$patientId" },
              else: null
            }
          },
          doctorObjectId: {
            $cond: {
              if: {
                $and: [
                  { $ne: ["$doctorId", null] },
                  { $regexMatch: { input: { $ifNull: ["$doctorId", ""] }, regex: /^[0-9a-fA-F]{24}$/ } }
                ]
              },
              then: { $toObjectId: "$doctorId" },
              else: null
            }
          }
        }
      },
      {
        $lookup: {
          from: "hospitalpatients",
          localField: "patientObjectId",
          foreignField: "_id",
          as: "patientDoc"
        }
      },
      { $unwind: { path: "$patientDoc", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "hospitaldoctors",
          localField: "doctorObjectId",
          foreignField: "_id",
          as: "doctorDoc"
        }
      },
      { $unwind: { path: "$doctorDoc", preserveNullAndEmptyArrays: true } },
      { $sort: { sessionDate: 1, createdAt: 1 } }
    ]);

    // Fetch doctors to obtain slot maxAppointments and details
    const HospitalDoctorModel = (await import("../../hospital-doctor/models/hospital-doctor.model")).default;
    const doctorFilter: any = { isDeleted: { $ne: true } };
    if (doctorId) {
      if (mongoose.Types.ObjectId.isValid(doctorId)) {
        doctorFilter._id = new mongoose.Types.ObjectId(doctorId);
      } else {
        doctorFilter.doctorId = doctorId;
      }
    }
    const doctors = await HospitalDoctorModel.find(doctorFilter, "doctorId name department dialysisSlots").lean();

    // Map slot details by slotId string
    const slotMap = new Map<string, { slot: any; doctor: any }>();
    for (const doc of doctors) {
      if (doc.dialysisSlots && Array.isArray(doc.dialysisSlots)) {
        for (const slot of doc.dialysisSlots) {
          slotMap.set(slot._id.toString(), {
            slot,
            doctor: {
              _id: doc._id?.toString(),
              doctorId: doc.doctorId,
              name: doc.name,
              department: doc.department
            }
          });
        }
      }
    }

    // Group sessions by date string (YYYY-MM-DD) and slotId
    const dateMap = new Map<string, Map<string, any[]>>();
    for (const session of sessions) {
      const dateStr = formatUTCDate(new Date(session.sessionDate));
      const slotIdStr = session.slotId?.toString();
      if (!dateMap.has(dateStr)) {
        dateMap.set(dateStr, new Map());
      }
      const daySlots = dateMap.get(dateStr)!;
      if (!daySlots.has(slotIdStr)) {
        daySlots.set(slotIdStr, []);
      }
      daySlots.get(slotIdStr)!.push({
        _id: session._id?.toString(),
        sessionId: session.sessionId,
        source: session.source,
        status: session.status,
        patient: session.patientDoc ? {
          _id: session.patientDoc._id?.toString(),
          patientId: session.patientDoc.patientId,
          name: session.patientDoc.name,
          phone: session.patientDoc.phone,
          mrd: session.patientDoc.mrd
        } : { _id: session.patientId }
      });
    }

    // Build calendar result array
    const calendar: any[] = [];
    const sortedDates = Array.from(dateMap.keys()).sort();
    for (const dateStr of sortedDates) {
      const daySlots = dateMap.get(dateStr)!;
      const slotsList: any[] = [];
      for (const [slotIdStr, sessionList] of daySlots.entries()) {
        const slotInfo = slotMap.get(slotIdStr);
        const slotName = slotInfo?.slot?.name || sessionList[0]?.slotDetails?.name || "Dialysis Slot";
        const startTime = slotInfo?.slot?.startTime || sessionList[0]?.slotDetails?.startTime || "";
        const endTime = slotInfo?.slot?.endTime || sessionList[0]?.slotDetails?.endTime || "";
        const maxAppointments = slotInfo?.slot?.maxAppointments ?? 0;
        const bookedCount = sessionList.length;
        const availableCount = maxAppointments > 0 ? Math.max(0, maxAppointments - bookedCount) : 0;

        slotsList.push({
          slotId: slotIdStr,
          name: slotName,
          startTime,
          endTime,
          maxAppointments,
          bookedCount,
          availableCount,
          doctor: slotInfo?.doctor || null,
          sessions: sessionList
        });
      }
      calendar.push({
        date: dateStr,
        slots: slotsList
      });
    }

    return {
      year: yr,
      month: mth,
      totalBookings: sessions.length,
      calendar
    };
  }
}

export default new DialysisSessionService();
