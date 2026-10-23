const XraySessionModel = require("../models/xray-session.model").default;
import { getNextSequence } from "@src/libs/counter";
import { getS3SignedUrl } from "@src/libs/utils/s3Upload";
import { CreateXraySessionDTO, UpdateXraySessionDTO, XraySessionResponseDTO } from "../dtos/xray-session.dto";
import { XraySession } from "../models/xray-session.types";

// Get today's date in IST as YYYY-MM-DD
function getTodayIST(): string {
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  const y = ist.getUTCFullYear();
  const m = String(ist.getUTCMonth() + 1).padStart(2, "0");
  const d = String(ist.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Resolve docUrl S3 key → signed URL on a single session object
async function resolveDocUrl(session: any): Promise<any> {
  if (session?.docUrl) {
    session.docUrl = await getS3SignedUrl(session.docUrl);
  }
  return session;
}

// Resolve docUrl on an array of sessions
async function resolveDocUrls(sessions: any[]): Promise<any[]> {
  return Promise.all(sessions.map(resolveDocUrl));
}

class XraySessionService {
  async createXraySession(newSession: CreateXraySessionDTO): Promise<XraySessionResponseDTO> {
    const nextId = await getNextSequence("xraySessionId");
    const sessionId = `XRA${String(nextId).padStart(5, "0")}`;

    let patientId = newSession.patientId;

    // Auto-fill patientId from daycareAppointmentId if not provided
    if (!patientId && newSession.daycareAppointmentId) {
      const DaycareAppointmentModel = (await import("../../hospital-daycare-appointment/models/daycare-appointment.model")).default;
      const appt = await DaycareAppointmentModel.findById(newSession.daycareAppointmentId).lean();
      if (!appt) throw new Error(`Daycare appointment '${newSession.daycareAppointmentId}' not found`);
      patientId = (appt as any).patientId;
    }

    if (!patientId) throw new Error("patientId is required when daycareAppointmentId is not provided");

    const source = newSession.daycareAppointmentId
      ? "daycare"
      : newSession.ipdId
      ? "ipd"
      : "manual";

    let isUltrasound = newSession.isUltrasound === true;
    if (newSession.procedureId && newSession.isUltrasound === undefined) {
      try {
        const HospitalProcedure = (await import("../../hospital-procedure/models/hospital-procedure.model")).default;
        const proc = await HospitalProcedure.findOne({ _id: newSession.procedureId, isDeleted: { $ne: true } }).lean() as any;
        if (proc && proc.isUltrasound) {
          isUltrasound = true;
        }
      } catch (err: any) {
        // ignore
      }
    }

    const session = await XraySessionModel.createXraySession({
      ...newSession,
      patientId,
      sessionId,
      source: newSession.source || source,
      // Every xray session gets a daily token regardless of source
      tokenDate: newSession.tokenDate || getTodayIST(),
      isUltrasound,
      status: newSession.status || "Pending",
      daycareAppointmentId: newSession.daycareAppointmentId || null,
      reportDate: newSession.reportDate ? new Date(newSession.reportDate) : undefined,
    } as XraySession);

    return session as XraySessionResponseDTO;
  }

  // Create a standalone walk-in token (no IPD/daycare context)
  async createXrayToken(input: {
    patientId: string;
    procedureId?: string;
    date?: string;
    reportHtml?: string;
    docUrl?: string;
    isUltrasound?: boolean;
  }): Promise<XraySessionResponseDTO> {
    const nextId = await getNextSequence("xraySessionId");
    const sessionId = `XRA${String(nextId).padStart(5, "0")}`;
    const tokenDate = input.date || getTodayIST();

    let isUltrasound = input.isUltrasound === true;
    if (input.procedureId && input.isUltrasound === undefined) {
      try {
        const HospitalProcedure = (await import("../../hospital-procedure/models/hospital-procedure.model")).default;
        const proc = await HospitalProcedure.findOne({ _id: input.procedureId, isDeleted: { $ne: true } }).lean() as any;
        if (proc && proc.isUltrasound) {
          isUltrasound = true;
        }
      } catch (err: any) {
        // ignore
      }
    }

    const session = await XraySessionModel.createXraySession({
      sessionId,
      patientId: input.patientId,
      procedureId: input.procedureId,
      tokenDate,
      source: "manual",
      isUltrasound,
      status: "Pending",
      reportHtml: input.reportHtml,
      docUrl: input.docUrl,
    } as XraySession);

    return session as XraySessionResponseDTO;
  }

  async getXraySessions(query: any = {}, search: any = {}, skip = 0, limit = 10): Promise<any> {
    const result = await XraySessionModel.readXraySessions(query, search, skip, limit);
    // Resolve docUrl signed URLs in the data array
    if (result[0]?.data?.length) {
      result[0].data = await resolveDocUrls(result[0].data);
    }
    return result;
  }

  async getXraySession(sessionId: string): Promise<XraySessionResponseDTO> {
    const session = await XraySessionModel.readXraySession(sessionId);
    return resolveDocUrl(session);
  }

  async getXraySessionById(id: string): Promise<XraySessionResponseDTO> {
    const session = await XraySessionModel.readXraySessionById(id);
    return resolveDocUrl(session);
  }

  async getQueueForDate(date?: string): Promise<any[]> {
    const d = date || getTodayIST();
    const queue = await XraySessionModel.readXrayTokenQueue(d);
    return resolveDocUrls(queue);
  }

  async updateXraySession(sessionId: string, updates: Partial<XraySession>): Promise<XraySessionResponseDTO> {
    const session = await XraySessionModel.updateXraySession(sessionId, updates);
    return resolveDocUrl(session);
  }

  async updateXraySessionById(id: string, updates: UpdateXraySessionDTO): Promise<XraySessionResponseDTO> {
    const payload: any = { ...updates };
    if (payload.reportDate) payload.reportDate = new Date(payload.reportDate);

    const updated = await XraySessionModel.findByIdAndUpdate(
      id,
      { $set: payload },
      { new: true, runValidators: true }
    );
    if (!updated) throw new Error(`Xray session with ID '${id}' not found`);
    return resolveDocUrl(updated.toObject());
  }

  async deleteXraySession(sessionId: string, deletedBy?: string): Promise<void> {
    await XraySessionModel.deleteXraySession(sessionId, deletedBy);
  }

  async deleteXraySessionById(id: string): Promise<void> {
    const deleted = await XraySessionModel.findByIdAndDelete(id);
    if (!deleted) throw new Error(`Xray session with ID '${id}' not found`);
  }

  async getSessionsByVisit(visitId: string): Promise<XraySessionResponseDTO[]> {
    const sessions = await XraySessionModel.getSessionsByVisit(visitId);
    return resolveDocUrls(sessions);
  }

  async getSessionsByPatient(patientId: string, skip = 0, limit = 10): Promise<XraySessionResponseDTO[]> {
    const sessions = await XraySessionModel.getSessionsByPatient(patientId, skip, limit);
    return resolveDocUrls(sessions);
  }

  async countSessionsByPatient(patientId: string): Promise<number> {
    return XraySessionModel.countDocuments({ patientId, isDeleted: { $ne: true } });
  }

  getTodayIST(): string {
    return getTodayIST();
  }
}

export default new XraySessionService();
