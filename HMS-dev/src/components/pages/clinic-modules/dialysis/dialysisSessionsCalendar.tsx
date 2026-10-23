"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import type { DatesSetArg, EventClickArg, EventInput } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import axios from "axios";
import dayjs from "dayjs";
import Link from "next/link";
import { API_BASE_URL } from "@/environment";
import { all_routes } from "@/routes/all_routes";

interface IDoctorOption {
  _id: string;
  name?: string;
  department?: string;
}

interface IDialysisCalendarPatientSession {
  id: string;
  sessionId?: string;
  status?: string;
  source?: string;
  patientName?: string;
  patientPhone?: string;
  patientMrd?: string;
  patientId?: string;
}

interface IDialysisCalendarSlot {
  slotId: string;
  slotName: string;
  startTime?: string;
  endTime?: string;
  bookedCount: number;
  availableCount?: number;
  maxAppointments?: number;
  doctorName?: string;
  doctorDepartment?: string;
  sessions: IDialysisCalendarPatientSession[];
}

interface IDialysisCalendarDay {
  date: string;
  bookedCount: number;
  slots: IDialysisCalendarSlot[];
}

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const asString = (value: unknown): string => {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
};

const nestedName = (value: unknown): string => {
  if (typeof value === "string") return value.trim();
  const obj = asRecord(value);
  return asString(obj.name) || asString(obj.fullName);
};

const toDateKey = (value: unknown): string => {
  const raw = asString(value);
  if (!raw) return "";
  const parsed = dayjs(raw);
  return parsed.isValid() ? parsed.format("YYYY-MM-DD") : raw.slice(0, 10);
};

const toHHmm = (value: unknown): string => {
  const raw = asString(value);
  if (!raw) return "";
  return raw.length >= 5 ? raw.slice(0, 5) : raw;
};

const toCount = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value == null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const extractDays = (payload: unknown): IDialysisCalendarDay[] => {
  const root = asRecord(payload);
  const data = asRecord(root.data ?? payload);
  const calendar = Array.isArray(data.calendar) ? data.calendar : [];

  return calendar
    .map((dayRaw) => {
      const day = asRecord(dayRaw);
      const date = toDateKey(day.date);
      const slotsRaw = Array.isArray(day.slots) ? day.slots : [];
      const slots: IDialysisCalendarSlot[] = slotsRaw.map((slotRaw) => {
        const slot = asRecord(slotRaw);
        const doctor = asRecord(slot.doctor);
        const sessionsRaw = Array.isArray(slot.sessions) ? slot.sessions : [];
        const sessions: IDialysisCalendarPatientSession[] = sessionsRaw.map(
          (sessionRaw) => {
            const session = asRecord(sessionRaw);
            const patient = asRecord(session.patient);
            return {
              id: asString(session._id ?? session.id ?? session.sessionId),
              sessionId: asString(session.sessionId) || undefined,
              status: asString(session.status) || undefined,
              source: asString(session.source) || undefined,
              patientName: nestedName(session.patient) || undefined,
              patientPhone: asString(patient.phone) || undefined,
              patientMrd: asString(patient.mrd) || undefined,
              patientId: asString(patient._id) || undefined,
            };
          }
        );
        const bookedCount = toCount(slot.bookedCount) ?? sessions.length;
        return {
          slotId: asString(slot.slotId ?? slot._id),
          slotName: asString(slot.name) || "Slot",
          startTime: toHHmm(slot.startTime) || undefined,
          endTime: toHHmm(slot.endTime) || undefined,
          bookedCount,
          availableCount: toCount(slot.availableCount),
          maxAppointments: toCount(slot.maxAppointments),
          doctorName: nestedName(slot.doctor) || undefined,
          doctorDepartment: asString(doctor.department) || undefined,
          sessions,
        };
      });
      const bookedCount = slots.reduce((sum, slot) => sum + slot.bookedCount, 0);
      return { date, bookedCount, slots };
    })
    .filter((day) => day.date && day.bookedCount > 0);
};

const DialysisSessionsCalendar = () => {
  const now = dayjs();
  const [viewYear, setViewYear] = useState(now.year());
  const [viewMonth, setViewMonth] = useState(now.month() + 1);
  const [doctorOptions, setDoctorOptions] = useState<IDoctorOption[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [days, setDays] = useState<IDialysisCalendarDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedDay, setSelectedDay] = useState<IDialysisCalendarDay | null>(null);

  const selectedDoctorLabel = useMemo(() => {
    if (!selectedDoctorId) return "All doctors";
    const match = doctorOptions.find((doc) => doc._id === selectedDoctorId);
    return match?.name ?? "All doctors";
  }, [doctorOptions, selectedDoctorId]);

  const handleFetchDoctors = useCallback(async () => {
    if (!API_BASE_URL) return;
    try {
      const res = await axios.get(`${API_BASE_URL}/hospital/doctors`, {
        params: { limit: 100 },
      });
      const doctors = Array.isArray(res.data?.data?.doctors)
        ? (res.data.data.doctors as IDoctorOption[])
        : [];
      setDoctorOptions(doctors);
    } catch {
      setDoctorOptions([]);
    }
  }, []);

  const handleFetchCalendar = useCallback(async () => {
    if (!API_BASE_URL) return;
    setLoading(true);
    setError("");
    try {
      const params: Record<string, string | number> = {
        year: viewYear,
        month: viewMonth,
      };
      if (selectedDoctorId) params.doctorId = selectedDoctorId;
      const res = await axios.get(
        `${API_BASE_URL}/hospital/dialysis-sessions/calendar`,
        { params }
      );
      setDays(extractDays(res.data));
    } catch {
      setDays([]);
      setError("Failed to load dialysis calendar.");
    } finally {
      setLoading(false);
    }
  }, [selectedDoctorId, viewMonth, viewYear]);

  useEffect(() => {
    void handleFetchDoctors();
  }, [handleFetchDoctors]);

  useEffect(() => {
    void handleFetchCalendar();
  }, [handleFetchCalendar]);

  const events = useMemo<EventInput[]>(
    () =>
      days.map((day) => ({
        id: day.date,
        title: String(day.bookedCount),
        start: day.date,
        allDay: true,
        backgroundColor: "#2E37A4",
        borderColor: "#2E37A4",
        extendedProps: { date: day.date },
      })),
    [days]
  );

  const handleDatesSet = (arg: DatesSetArg) => {
    const midMs =
      (arg.view.currentStart.getTime() + arg.view.currentEnd.getTime()) / 2;
    const current = dayjs(midMs);
    const nextYear = current.year();
    const nextMonth = current.month() + 1;
    if (nextYear === viewYear && nextMonth === viewMonth) return;
    setViewYear(nextYear);
    setViewMonth(nextMonth);
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    const date = asString(clickInfo.event.extendedProps?.date ?? clickInfo.event.id);
    const match = days.find((day) => day.date === date) ?? null;
    setSelectedDay(match);
  };

  useEffect(() => {
    if (!selectedDay) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedDay]);

  return (
    <div className="card shadow-sm flex-fill w-100">
      <div className="card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
        <h5 className="fw-bold mb-0">Dialysis Calendar</h5>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          {loading ? <span className="fs-13 text-muted">Loading…</span> : null}
          <label className="mb-0 fs-13 text-muted" htmlFor="dialysis-calendar-doctor">
            Doctor
          </label>
          <div className="dropdown">
            <button
              id="dialysis-calendar-doctor"
              type="button"
              className="btn btn-sm px-2 border shadow-sm btn-outline-white d-inline-flex align-items-center justify-content-between text-start"
              data-bs-toggle="dropdown"
              aria-label="Filter dialysis calendar by doctor"
              style={{ width: "220px" }}
            >
              <span className="text-truncate d-inline-block" style={{ maxWidth: "176px" }}>
                {selectedDoctorLabel}
              </span>
              <i className="ti ti-chevron-down ms-1 flex-shrink-0" />
            </button>
            <ul className="dropdown-menu" style={{ width: "260px", maxWidth: "90vw" }}>
              <li>
                <button
                  type="button"
                  className={`dropdown-item ${selectedDoctorId ? "" : "active"}`}
                  onClick={() => setSelectedDoctorId("")}
                >
                  All doctors
                </button>
              </li>
              {doctorOptions.map((doctor) => (
                <li key={doctor._id}>
                  <button
                    type="button"
                    className={`dropdown-item ${selectedDoctorId === doctor._id ? "active" : ""}`}
                    onClick={() => setSelectedDoctorId(doctor._id)}
                    style={{ whiteSpace: "normal", lineHeight: 1.25 }}
                  >
                    {doctor.department
                      ? `${doctor.name ?? "—"} (${doctor.department})`
                      : doctor.name ?? "—"}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <div className="card-body">
        {error ? <p className="text-danger mb-2">{error}</p> : null}
        <div className="dialysis-dashboard-calendar">
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            events={events}
            height="auto"
            headerToolbar={{
              start: "prev,next today",
              center: "title",
              end: "",
            }}
            datesSet={handleDatesSet}
            eventClick={handleEventClick}
            eventDisplay="block"
            displayEventTime={false}
            dayMaxEvents={1}
            eventContent={(arg) => (
              <div className="fc-event-title fc-sticky px-1 text-center">
                {arg.event.title}
              </div>
            )}
          />
        </div>
      </div>

      {selectedDay ? (
        <>
          <div
            className="offcanvas-backdrop fade show"
            onClick={() => setSelectedDay(null)}
          />
          <div
            className="offcanvas offcanvas-offset offcanvas-end offcanvas-large show"
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialysis-calendar-day-title"
            style={{
              visibility: "visible",
              width: "min(800px, 96vw)",
              maxWidth: "100%",
            }}
          >
            <div className="offcanvas-header d-block pb-0 px-0">
              <div className="border-bottom d-flex align-items-center justify-content-between pb-3 px-3">
                <h5 id="dialysis-calendar-day-title" className="offcanvas-title fs-18 fw-bold mb-0">
                  {dayjs(selectedDay.date).format("DD MMM YYYY")} · {selectedDay.bookedCount}{" "}
                  booked
                </h5>
                <button
                  type="button"
                  className="btn-close custom-btn-close opacity-100"
                  aria-label="Close"
                  onClick={() => setSelectedDay(null)}
                >
                  <i className="ti ti-x fs-16 text-dark" />
                </button>
              </div>
            </div>
            <div className="offcanvas-body p-3">
              {selectedDay.slots.map((slot) => (
                <div key={slot.slotId || slot.slotName} className="mb-4">
                  <p className="fw-semibold mb-1">
                    {slot.slotName}
                    {slot.startTime && slot.endTime
                      ? ` · ${slot.startTime}–${slot.endTime}`
                      : ""}
                    {` · ${slot.bookedCount} booked`}
                    {slot.maxAppointments != null
                      ? ` of ${slot.maxAppointments}`
                      : ""}
                  </p>
                  {slot.doctorName ? (
                    <p className="text-muted fs-13 mb-2">
                      {slot.doctorDepartment
                        ? `${slot.doctorName} (${slot.doctorDepartment})`
                        : slot.doctorName}
                    </p>
                  ) : null}
                  {slot.sessions.length === 0 ? (
                    <p className="text-muted mb-0">No sessions in this slot.</p>
                  ) : (
                    <ul className="list-unstyled mb-0">
                      {slot.sessions.map((session) => (
                        <li
                          key={session.id}
                          className="d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-2 border rounded px-3 py-2 mb-2"
                        >
                          <div>
                            <div className="fw-medium">
                              {session.patientName || "Patient"}
                              {session.sessionId ? ` · ${session.sessionId}` : ""}
                            </div>
                            <div className="fs-13 text-muted">
                              {[session.status, session.source, session.patientMrd]
                                .filter(Boolean)
                                .join(" · ") || "—"}
                            </div>
                          </div>
                          {session.patientId ? (
                            <Link
                              href={`${all_routes.dialysisAppointment}?patientId=${session.patientId}&sessionId=${session.id}`}
                              className="btn btn-sm btn-outline-primary"
                            >
                              Open
                            </Link>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
            <div className="offcanvas-footer mb-1 p-3 border-1 border-top">
              <div className="d-flex justify-content-end">
                <button
                  type="button"
                  className="btn btn-light btm-md"
                  onClick={() => setSelectedDay(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default DialysisSessionsCalendar;
