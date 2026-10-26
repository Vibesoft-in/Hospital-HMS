import { EventEmitter } from "events";
import { logger } from "@src/config/logger";

// Event types
export interface VisitEventData {
  doctorId: string;
  doctorName?: string;
  department?: string;
  designation?: string;
  yearsOfExperience?: number;
  opdNumber?: string;
  posterUrl?: string; // Signed S3 URL
  shift?: string; // e.g. "Mon - Sat | 9 AM - 5 PM"
  sessionSlot?: string; // Now optional - for backward compatibility
  queueSortBy?: "token" | "time";
  date: string; // YYYY-MM-DD
  eventType: "status-change" | "new-visit" | "visit-updated" | "visit-deleted" | "queue-refresh";
  visit?: any;
  queue?: any[];
  totalPatients?: number;
  emergencyCount?: number;
  regularCount?: number;
}

const DAY_ABBR: Record<string, string> = {
  Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed", Thursday: "Thu",
  Friday: "Fri", Saturday: "Sat", Sunday: "Sun"
};

const DAY_ORDER: Record<string, number> = {
  Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3,
  Friday: 4, Saturday: 5, Sunday: 6
};

// Convert "HH:MM" 24h to "H AM/PM" display
function formatTime(time: string): string {
  const [hStr, mStr] = time.split(":");
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const period = h >= 12 ? "PM" : "AM";
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return m === 0 ? `${h} ${period}` : `${h}:${mStr} ${period}`;
}

const DEFAULT_SHIFT_TIME = "9 AM - 6 PM";

// Build a human-readable shift string from weeklySchedule
// Format: "<working days range> | <today's time or default>"
// e.g. "Mon - Sat | 9 AM - 6 PM"
// Days part is always the full working days range (never changes per day).
// Time part reflects today's slots; defaults to "9 AM - 6 PM" if no slots set for that day.
export function formatDoctorShift(weeklySchedule: any[], targetDate?: Date): string {
  if (!weeklySchedule || weeklySchedule.length === 0) return "";

  // Working days = days that have slots configured
  const activeDays = weeklySchedule
    .filter((d: any) => d.slots && d.slots.length > 0)
    .sort((a: any, b: any) => (DAY_ORDER[a.dayOfWeek] ?? 7) - (DAY_ORDER[b.dayOfWeek] ?? 7));

  if (activeDays.length === 0) return "";

  // Day range: first active day - last active day (always the same regardless of targetDate)
  const firstDay = DAY_ABBR[activeDays[0].dayOfWeek] ?? activeDays[0].dayOfWeek;
  const lastDay = DAY_ABBR[activeDays[activeDays.length - 1].dayOfWeek] ?? activeDays[activeDays.length - 1].dayOfWeek;
  const dayPart = firstDay === lastDay ? firstDay : `${firstDay} - ${lastDay}`;

  // Time part: use today's slots if available, else default
  let timePart = DEFAULT_SHIFT_TIME;
  if (targetDate) {
    const dayName = targetDate.toLocaleDateString("en-US", { weekday: "long", timeZone: "Asia/Kolkata" });
    const daySchedule = weeklySchedule.find((d: any) => d.dayOfWeek === dayName);
    if (daySchedule?.slots?.length > 0) {
      const slots = daySchedule.slots as Array<{ startTime: string; endTime: string }>;
      const earliest = slots.reduce((a, b) => a.startTime < b.startTime ? a : b);
      const latest = slots.reduce((a, b) => a.endTime > b.endTime ? a : b);
      timePart = `${formatTime(earliest.startTime)} - ${formatTime(latest.endTime)}`;
    }
    // else: day has no slots (doctor off today) — keep default time
  }

  return `${dayPart} | ${timePart}`;
}

// Helper to format visit for SSE (match queue structure)
function formatVisitForSSE(visit: any): any {
  return {
    _id: visit._id,
    visitId: visit.visitId,
    appointmentId: visit.appointmentId,
    visitType: visit.visitType,
    appointmentType: visit.appointmentType,
    visitTime: visit.visitTime,
    sessionSlot: visit.sessionSlot,
    tokenNumber: visit.tokenNumber,
    status: visit.status,
    patient: visit.patient ? {
      mrd: visit.patient.mrd,
      patientUhid: visit.patient.patientUhid,
      name: visit.patient.name,
      age: visit.patient.age,
      gender: visit.patient.gender
    } : undefined
  };
}

class VisitEventsService extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100); // Allow many TV displays to connect
  }

  private _broadcast(doctorId: string, date: string, eventData: VisitEventData, doctorInfo?: any) {
    const keys = new Set<string>();
    if (doctorId) {
      if (date) keys.add(this.getEventKey(doctorId, date));
      keys.add(`queue:${doctorId}`);
    }
    if (doctorInfo?.doctorId) {
      if (date) keys.add(this.getEventKey(doctorInfo.doctorId, date));
      keys.add(`queue:${doctorInfo.doctorId}`);
    }
    keys.forEach((key) => {
      this.emit(key, eventData);
    });
  }

  // Emit event when visit status changes
  emitVisitStatusChange(doctorId: string, date: string, visit: any, doctorInfo?: any) {
    const eventData: VisitEventData = {
      doctorId,
      doctorName: doctorInfo?.name,
      department: doctorInfo?.department,
      designation: doctorInfo?.designation,
      yearsOfExperience: doctorInfo?.yearsOfExperience,
      opdNumber: doctorInfo?.opdNumber,
      posterUrl: doctorInfo?.posterUrl,
      shift: doctorInfo?.shift,
      sessionSlot: visit.sessionSlot,
      date,
      eventType: "status-change",
      visit: formatVisitForSSE(visit),
    };
    
    const eventKey = this.getEventKey(doctorId, date);
    logger.info({ eventKey, visitId: visit.visitId, status: visit.status }, "Emitting visit status change event");
    this._broadcast(doctorId, date, eventData, doctorInfo);
  }

  // Emit event when new visit is created
  emitNewVisit(doctorId: string, date: string, visit: any, doctorInfo?: any) {
    const eventData: VisitEventData = {
      doctorId,
      doctorName: doctorInfo?.name,
      department: doctorInfo?.department,
      designation: doctorInfo?.designation,
      yearsOfExperience: doctorInfo?.yearsOfExperience,
      opdNumber: doctorInfo?.opdNumber,
      posterUrl: doctorInfo?.posterUrl,
      shift: doctorInfo?.shift,
      sessionSlot: visit.sessionSlot,
      date,
      eventType: "new-visit",
      visit: formatVisitForSSE(visit),
    };
    
    const eventKey = this.getEventKey(doctorId, date);
    logger.info({ eventKey, visitId: visit.visitId }, "Emitting new visit event");
    this._broadcast(doctorId, date, eventData, doctorInfo);
  }

  // Emit event when visit is updated
  emitVisitUpdated(doctorId: string, date: string, visit: any, doctorInfo?: any) {
    const eventData: VisitEventData = {
      doctorId,
      doctorName: doctorInfo?.name,
      department: doctorInfo?.department,
      designation: doctorInfo?.designation,
      yearsOfExperience: doctorInfo?.yearsOfExperience,
      opdNumber: doctorInfo?.opdNumber,
      posterUrl: doctorInfo?.posterUrl,
      shift: doctorInfo?.shift,
      sessionSlot: visit.sessionSlot,
      date,
      eventType: "visit-updated",
      visit: formatVisitForSSE(visit),
    };
    
    const eventKey = this.getEventKey(doctorId, date);
    logger.info({ eventKey, visitId: visit.visitId }, "Emitting visit updated event");
    this._broadcast(doctorId, date, eventData, doctorInfo);
  }

  // Emit event when visit is deleted/cancelled
  emitVisitDeleted(doctorId: string, date: string, visitId: string, doctorInfo?: any) {
    const eventData: VisitEventData = {
      doctorId,
      doctorName: doctorInfo?.name,
      department: doctorInfo?.department,
      designation: doctorInfo?.designation,
      yearsOfExperience: doctorInfo?.yearsOfExperience,
      opdNumber: doctorInfo?.opdNumber,
      posterUrl: doctorInfo?.posterUrl,
      shift: doctorInfo?.shift,
      date,
      eventType: "visit-deleted",
      visit: { visitId },
    };
    
    const eventKey = this.getEventKey(doctorId, date);
    logger.info({ eventKey, visitId }, "Emitting visit deleted event");
    this._broadcast(doctorId, date, eventData, doctorInfo);
  }

  // Emit full queue refresh
  emitQueueRefresh(doctorId: string, date: string, queue: any[], doctorInfo?: any) {
    const eventData: VisitEventData = {
      doctorId,
      doctorName: doctorInfo?.name,
      department: doctorInfo?.department,
      designation: doctorInfo?.designation,
      yearsOfExperience: doctorInfo?.yearsOfExperience,
      opdNumber: doctorInfo?.opdNumber,
      posterUrl: doctorInfo?.posterUrl,
      shift: doctorInfo?.shift,
      date,
      eventType: "queue-refresh",
      queue,
      totalPatients: queue.length,
      emergencyCount: queue.filter((v: any) => v.visitType === 'Emergency').length,
      regularCount: queue.filter((v: any) => v.visitType !== 'Emergency').length,
    };
    
    const eventKey = this.getEventKey(doctorId, date);
    logger.info({ eventKey, queueLength: queue.length }, "Emitting queue refresh event");
    this._broadcast(doctorId, date, eventData, doctorInfo);
  }

  // Generate event key for specific doctor/date combination (session removed)
  getEventKey(doctorId: string, date: string): string {
    return `queue:${doctorId}:${date}`;
  }

  // Subscribe to events for specific doctor/date
  subscribeToQueue(doctorId: string, date: string, callback: (data: VisitEventData) => void) {
    const eventKey = this.getEventKey(doctorId, date);
    this.on(eventKey, callback);
    logger.info({ eventKey }, "Client subscribed to queue events");
    return eventKey;
  }

  // Unsubscribe from events
  unsubscribeFromQueue(eventKey: string, callback: (data: VisitEventData) => void) {
    this.off(eventKey, callback);
    logger.info({ eventKey }, "Client unsubscribed from queue events");
  }
}

export default new VisitEventsService();
