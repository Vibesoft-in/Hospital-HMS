"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import axios from "axios";
import { API_BASE_URL } from "@/environment";
import { Maximize, Minimize, Ambulance, Clock } from "tabler-icons-react";
import { formatTokenWithVisitPrefix } from "@/core/utils/tokenPrefix";
import {
  getDeletedVisitId,
  getSessionSlotBadge,
  parseCurrentSessionSlot,
  parseQueueSortBy,
  parseSessionSlot,
  shouldShowVisitOnScreen,
  sortDisplayQueue,
  type IQueueSortBy,
  type ISessionSlot,
} from "./sessionQueue";
import { getDoctorDefaultAvatar } from "@/components/common/DoctorAvatar";

// ============================================================================
// POLYFILLS FOR ANDROID 7, 8, 9 & SYSTEM WEBVIEW 66 (66.0.3359.158 / SDK 28)
// Chrome 66 lacks: globalThis, Promise.allSettled, queueMicrotask, structuredClone
// ============================================================================
if (typeof window !== "undefined") {
  if (typeof (window as any).globalThis === "undefined") {
    (window as any).globalThis = window;
  }
  if (!(Promise as any).allSettled) {
    (Promise as any).allSettled = function (promises: Iterable<any>) {
      return Promise.all(
        Array.from(promises).map(function (p) {
          return Promise.resolve(p).then(
            function (value) { return { status: "fulfilled" as const, value: value }; },
            function (reason) { return { status: "rejected" as const, reason: reason }; }
          );
        })
      );
    };
  }
  if (typeof window.queueMicrotask !== "function") {
    window.queueMicrotask = function (callback: () => void) {
      Promise.resolve().then(callback).catch(function (err) {
        setTimeout(function () { throw err; }, 0);
      });
    };
  }
}

interface IQueuePatient {
  _id: string;
  visitId: string;
  appointmentId?: string;
  visitType?: string;
  visitTime?: string;
  tokenNumber: number;
  sessionSlot: ISessionSlot;
  status: string;
  patient: {
    mrd: string;
    name: string;
    age?: number;
    gender?: string;
  };
  doctor?: { name: string };
}

interface IQueueDisplay {
  doctorId: string;
  doctorName: string;
  specialization?: string | null;
  department?: string | null;
  designation?: string | null;
  yearsOfExperience?: number | null;
  opdNumber?: string | null;
  posterUrl?: string | null;
  gender?: string | null;
  shift?: string | null;
  currentSessionSlot: ISessionSlot;
  sessionSlot: string;
  date: string;
  totalPatients: number;
  emergencyCount?: number;
  regularCount?: number;
  currentTime?: string;
  queueSortBy: IQueueSortBy;
  queue: IQueuePatient[];
}

const DEFAULT_DOCTOR_POSTER = "/assets/img/Photo3.jpg";

// Safe check: NO `?.` and NO `??`
const isEmergencyVisit = (visit?: IQueuePatient): boolean => {
  if (!visit || !visit.visitType) return false;
  return visit.visitType.toLowerCase() === "emergency";
};

function sortAndComputeQueue(queue: IQueuePatient[], queueSortBy: IQueueSortBy = "token") {
  const sorted = sortDisplayQueue(queue, queueSortBy);
  const emergencyCount = sorted.filter((v) => isEmergencyVisit(v)).length;
  const totalPatients = sorted.length;
  const regularCount = totalPatients - emergencyCount;
  return { queue: sorted, totalPatients, emergencyCount, regularCount };
}

/** Normalize SSE/REST visit to IQueuePatient (Zero `?.` / Zero `??` - Safe for Chrome 66) */
function toQueuePatient(visit: Record<string, unknown>): IQueuePatient {
  const patient = (visit && visit.patient) ? (visit.patient as Record<string, unknown>) : {};
  const rawId = visit && visit._id ? String(visit._id) : "";
  const rawVisitId = visit && visit.visitId ? String(visit.visitId) : "";
  const vId = rawVisitId || rawId || "";
  const tokenNum = (visit && visit.tokenNumber != null) ? Number(visit.tokenNumber) : 0;
  const slot = (visit && visit.sessionSlot) ? parseSessionSlot(visit.sessionSlot) : "Morning";
  const stat = (visit && visit.status) ? String(visit.status) : "Scheduled";

  return {
    _id: rawId || vId,
    visitId: rawVisitId || vId,
    appointmentId: visit && visit.appointmentId ? String(visit.appointmentId) : undefined,
    visitType: visit && visit.visitType ? String(visit.visitType) : undefined,
    visitTime: visit && visit.visitTime ? String(visit.visitTime) : undefined,
    tokenNumber: isNaN(tokenNum) ? 0 : tokenNum,
    sessionSlot: slot,
    status: stat,
    patient: {
      mrd: patient && (patient.mrd || (patient as any).patientUhid) ? String(patient.mrd || (patient as any).patientUhid) : "—",
      name: patient && patient.name ? String(patient.name) : "—",
      age: patient && patient.age != null ? Number(patient.age) : undefined,
      gender: patient && patient.gender ? String(patient.gender) : undefined,
    },
  };
}

const isMatchingPatient = (patient: IQueuePatient, targetId: string): boolean => {
  if (!targetId || !patient) return false;
  return (
    patient.visitId === targetId ||
    patient._id === targetId ||
    (Boolean(patient.appointmentId) && patient.appointmentId === targetId)
  );
};

/** Build IQueueDisplay from SSE payload (Zero `?.` / Zero `??` - Safe for Chrome 66) */
function displayFromSSE(data: Record<string, unknown>): IQueueDisplay {
  const rawQueue = (data && Array.isArray(data.queue))
    ? (data.queue as Record<string, unknown>[]).map(toQueuePatient)
    : [];
  const queueSortBy = parseQueueSortBy(data ? data.queueSortBy : undefined);
  const {
    queue,
    totalPatients: computedTotal,
    emergencyCount: computedEmergency,
    regularCount: computedRegular,
  } = sortAndComputeQueue(rawQueue, queueSortBy);

  const apiTotal = data && data.totalPatients != null ? Number(data.totalPatients) : NaN;
  const apiEmergency = data && data.emergencyCount != null ? Number(data.emergencyCount) : NaN;
  const apiRegular = data && data.regularCount != null ? Number(data.regularCount) : NaN;

  let posterUrl: string | null = null;
  if (data && typeof data.posterUrl === "string" && data.posterUrl.trim()) {
    posterUrl = data.posterUrl.trim();
  } else if (data && typeof data.imageUrl === "string" && data.imageUrl.trim()) {
    posterUrl = data.imageUrl.trim();
  }

  const currentSlot = parseCurrentSessionSlot(data);

  return {
    doctorId: data && data.doctorId ? String(data.doctorId) : "",
    doctorName: data && data.doctorName ? String(data.doctorName) : "—",
    department: data && data.department ? String(data.department) : null,
    specialization: data && data.specialization ? String(data.specialization) : null,
    designation: data && data.designation ? String(data.designation) : null,
    yearsOfExperience: data && data.yearsOfExperience != null ? Number(data.yearsOfExperience) : null,
    opdNumber: data && data.opdNumber ? String(data.opdNumber) : null,
    posterUrl: posterUrl,
    gender: data && data.gender ? String(data.gender) : null,
    shift: data && data.shift ? String(data.shift) : null,
    currentSessionSlot: currentSlot,
    sessionSlot: currentSlot ? currentSlot : "Morning",
    date: data && data.date ? String(data.date) : "",
    totalPatients: !isNaN(apiTotal) ? apiTotal : computedTotal,
    emergencyCount: !isNaN(apiEmergency) ? apiEmergency : computedEmergency,
    regularCount: !isNaN(apiRegular) ? apiRegular : computedRegular,
    currentTime: data && typeof data.currentTime === "string" ? data.currentTime : undefined,
    queueSortBy,
    queue,
  };
}

/** Color Palettes & Status Definitions */
const QUEUE_ORANGE_MR = "#FF6600";
const HEADER_PURPLE = "#6F4A8E";
const DOCTOR_INFO_BG = "#F4EFFA";

const getStatusDisplay = (status: string, visitType?: string) => {
  const normalized = status ? status.toLowerCase().trim() : "";
  const normalizedVisitType = visitType ? visitType.toLowerCase().replace(/\s+/g, " ").trim() : "";

  // Consulting (In Progress)
  if (normalized === "consulting" || normalized === "in progress") {
    return {
      label: "Consulting (कंसल्टेशन जारी)",
      rowStyle: { backgroundColor: "#bed75a" },
      textClass: "text-dark",
    };
  }

  // Emergency — lighter red
  if (normalizedVisitType === "emergency") {
    return {
      label: "In Queue (आप कतार में हैं)",
      rowStyle: { backgroundColor: "#FCA5A5" },
      textClass: "text-dark",
    };
  }

  // MR (Medical Representative)
  if (normalizedVisitType === "mr") {
    return {
      label: "In Queue (आप कतार में हैं)",
      rowStyle: { backgroundColor: QUEUE_ORANGE_MR },
      textClass: "text-white",
    };
  }

  // Follow-up report — dark gray
  if (
    normalizedVisitType === "follow-up-report" ||
    normalizedVisitType === "follow up report" ||
    normalizedVisitType === "followup-report" ||
    normalizedVisitType === "followup report"
  ) {
    return {
      label: "In Queue (आप कतार में हैं)",
      rowStyle: { backgroundColor: "#374151" },
      textClass: "text-white",
    };
  }

  // Follow-up — steel blue
  if (
    normalizedVisitType === "follow-up" ||
    normalizedVisitType === "follow up" ||
    normalizedVisitType === "followup"
  ) {
    return {
      label: "In Queue (आप कतार में हैं)",
      rowStyle: { backgroundColor: "#3D5C79" },
      textClass: "text-white",
    };
  }

  // OPD / New / default queue
  return {
    label: "In Queue (आप कतार में हैं)",
    rowStyle: { backgroundColor: "#5D443C" },
    textClass: "text-white",
  };
};

const QueueDisplayComponent = () => {
  const params = useParams();
  const doctorId = (params && params.doctorId) ? String(params.doctorId) : "";

  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [display, setDisplay] = useState<IQueueDisplay | null>(null);
  const [now, setNow] = useState<Date>(new Date());
  // Track poster image load error separately so a fresh signed URL from SSE/poll can reset it
  const [posterImgError, setPosterImgError] = useState(false);
  const lastPosterUrlRef = useRef<string>("");
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDelayRef = useRef(2000);

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      if (el.requestFullscreen) {
        el.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => { });
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => { });
      }
    }
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Direct fetch doctor profile to guarantee photo/posterUrl is available
  useEffect(() => {
    if (!doctorId || !API_BASE_URL) return;

    const fetchDocProfile = () => {
      axios
        .get(API_BASE_URL + "/hospital/doctors/" + doctorId)
        .then((res) => {
          const resData = res && res.data ? res.data : null;
          const doc = (resData && resData.data && resData.data.doctor)
            ? resData.data.doctor
            : (resData && resData.doctor ? resData.doctor : (resData && resData.data ? resData.data : resData));

          const photo = doc && (doc.posterUrl || doc.imageUrl);
          if (photo && typeof photo === "string") {
            setDisplay((prev) => (prev ? { ...prev, posterUrl: photo, gender: (doc && doc.gender) ? doc.gender : prev.gender } : prev));
          } else if (doc && doc.gender) {
            setDisplay((prev) => (prev ? { ...prev, gender: doc.gender } : prev));
          }
        })
        .catch((err) => {
          console.warn("Direct doctor photo fetch warning:", err);
        });
    };

    fetchDocProfile();

    const handleDoctorUpdated = (e: any) => {
      const updatedId = e && e.detail ? e.detail.doctorId : null;
      if (!updatedId || updatedId === doctorId) {
        fetchDocProfile();
      }
    };
    window.addEventListener("doctor-updated", handleDoctorUpdated);

    return () => {
      window.removeEventListener("doctor-updated", handleDoctorUpdated);
    };
  }, [doctorId]);

  // SSE Stream with Instant Real-Time Updates + 2s Auto-Sync (Zero Refresh Needed!)
  useEffect(() => {
    if (!API_BASE_URL || !doctorId) return;

    let destroyed = false;
    let pollInterval: ReturnType<typeof setInterval> | null = null;

    const handleIncomingData = (event: MessageEvent) => {
      if (destroyed) return;
      reconnectDelayRef.current = 2000;
      try {
        const data = JSON.parse(event.data) as Record<string, unknown>;
        const rawType = data ? (data.eventType != null ? data.eventType : data.type) : (event.type || "");
        const type = typeof rawType === "string" ? rawType.trim().toLowerCase() : "";

        // 1. Initial or Full Queue Refresh
        if (type === "initial" || type === "session-change" || type === "date-change" || type === "queue-refresh" || type === "refresh") {
          setDisplay(displayFromSSE(data));
          return;
        }

        // 2. Status Change (Instant Update for Consulting / Emergency / Completed etc.)
        if (type === "status-change" || type === "status-updated" || type === "visit-status" || type.indexOf("status") !== -1) {
          const vData = (data && data.visit) ? (data.visit as Record<string, unknown>) : data;
          const targetVisitId = String(
            (vData && (vData.visitId || vData._id || vData.id || vData.appointmentId)) ||
            (data && (data.visitId || data._id || data.id || data.appointmentId)) ||
            ""
          );
          const rawNewStatus = String(
            (vData && (vData.status || vData.newStatus)) ||
            (data && (data.status || data.newStatus)) ||
            ""
          );

          if (targetVisitId && rawNewStatus) {
            const normalizedStatus = rawNewStatus.toLowerCase().trim();
            const shouldRemove =
              normalizedStatus === "completed" ||
              normalizedStatus === "cancelled" ||
              normalizedStatus === "canceled" ||
              normalizedStatus === "no show" ||
              normalizedStatus === "no_show";

            setDisplay((prev) => {
              if (!prev) return prev;
              const nextQueue = shouldRemove
                ? prev.queue.filter((p) => !isMatchingPatient(p, targetVisitId))
                : prev.queue.map((p) => {
                  if (isMatchingPatient(p, targetVisitId)) {
                    return { ...p, status: rawNewStatus };
                  }
                  return p;
                });

              const queueSortBy = parseQueueSortBy(data ? data.queueSortBy : undefined, prev.queueSortBy);
              const { queue, totalPatients, emergencyCount, regularCount } =
                sortAndComputeQueue(nextQueue, queueSortBy);
              return { ...prev, queueSortBy, queue, totalPatients, emergencyCount, regularCount };
            });
            return;
          }
        }

        // 3. New Visit / New Appointment (Instant Insert)
        if (type === "new-visit" || type === "new-appointment" || type === "appointment-created" || type.indexOf("new") !== -1) {
          const rawVisit = (data && data.visit)
            ? (data.visit as Record<string, unknown>)
            : (data && (data.visitId || data._id || data.tokenNumber != null) ? data : null);

          if (rawVisit) {
            setDisplay((prev) => {
              const newPatient = toQueuePatient(rawVisit);
              if (!prev) return displayFromSSE({ queue: [newPatient] });

              // Update existing or append new
              const existsIdx = prev.queue.findIndex(
                (p) => isMatchingPatient(p, newPatient.visitId) || isMatchingPatient(p, newPatient._id)
              );

              let updatedList: IQueuePatient[];
              if (existsIdx >= 0) {
                updatedList = [...prev.queue];
                updatedList[existsIdx] = newPatient;
              } else {
                updatedList = [...prev.queue, newPatient];
              }

              const queueSortBy = parseQueueSortBy(data ? data.queueSortBy : undefined, prev.queueSortBy);
              const { queue, totalPatients, emergencyCount, regularCount } =
                sortAndComputeQueue(updatedList, queueSortBy);

              return { ...prev, queueSortBy, queue, totalPatients, emergencyCount, regularCount };
            });
            return;
          }
        }

        // 4. Visit Updated / Details Modified
        if (type === "visit-updated" || type === "appointment-updated" || type.indexOf("update") !== -1) {
          const rawVisit = (data && data.visit)
            ? (data.visit as Record<string, unknown>)
            : (data && (data.visitId || data._id) ? data : null);

          if (rawVisit) {
            const updated = toQueuePatient(rawVisit);
            const matchId = updated.visitId || updated._id;

            setDisplay((prev) => {
              if (!prev) return prev;
              const idx = prev.queue.findIndex(
                (p) => isMatchingPatient(p, matchId) || (rawVisit._id && isMatchingPatient(p, String(rawVisit._id)))
              );

              let nextQueue: IQueuePatient[];
              if (idx >= 0) {
                nextQueue = [...prev.queue];
                nextQueue[idx] = { ...prev.queue[idx], ...updated };
              } else {
                nextQueue = [...prev.queue, updated];
              }

              const queueSortBy = parseQueueSortBy(data ? data.queueSortBy : undefined, prev.queueSortBy);
              const { queue, totalPatients, emergencyCount, regularCount } =
                sortAndComputeQueue(nextQueue, queueSortBy);
              return { ...prev, queueSortBy, queue, totalPatients, emergencyCount, regularCount };
            });
            return;
          }
        }

        // 5. Visit Deleted / Cancelled
        if (type === "visit-deleted" || type === "appointment-deleted" || type.indexOf("delete") !== -1) {
          const delId = getDeletedVisitId(data) || String((data && (data.visitId || data._id || data.id)) || "");
          if (delId) {
            setDisplay((prev) => {
              if (!prev) return prev;
              const nextQueue = prev.queue.filter((p) => !isMatchingPatient(p, delId));
              const queueSortBy = parseQueueSortBy(data ? data.queueSortBy : undefined, prev.queueSortBy);
              const { queue, totalPatients, emergencyCount, regularCount } =
                sortAndComputeQueue(nextQueue, queueSortBy);
              return { ...prev, queueSortBy, queue, totalPatients, emergencyCount, regularCount };
            });
            return;
          }
        }
      } catch (err) {
        console.error("SSE parse error:", err);
      }
    };

    const connect = () => {
      if (destroyed) return;
      const streamUrl = API_BASE_URL + "/hospital/visits/display/stream/" + doctorId;
      const es = new EventSource(streamUrl);
      eventSourceRef.current = es;

      es.onmessage = handleIncomingData;
      const eventNames = [
        "initial",
        "session-change",
        "date-change",
        "new-visit",
        "new-appointment",
        "appointment-created",
        "status-change",
        "status-updated",
        "visit-status",
        "visit-updated",
        "appointment-updated",
        "visit-deleted",
        "appointment-deleted",
        "queue-refresh",
        "refresh"
      ];
      for (let i = 0; i < eventNames.length; i++) {
        es.addEventListener(eventNames[i], handleIncomingData as EventListener);
      }

      es.onerror = () => {
        if (destroyed) return;
        es.close();
        eventSourceRef.current = null;
        const delay = Math.min(reconnectDelayRef.current, 30000);
        reconnectDelayRef.current = delay * 1.5;
        reconnectTimerRef.current = setTimeout(connect, delay);
      };
    };

    connect();

    // Fast 3-second auto-sync using REST endpoint (Never hangs or exhausts sockets!)
    const pollQueue = () => {
      if (destroyed || !API_BASE_URL || !doctorId) return;
      axios
        .get(API_BASE_URL + "/hospital/visits/display/queue/" + doctorId, {
          headers: { "Cache-Control": "no-cache", Pragma: "no-cache" }
        })
        .then((res) => {
          if (destroyed) return;
          const resData = res && res.data ? res.data : null;
          const displayPayload =
            (resData && resData.data && resData.data.display)
              ? resData.data.display
              : ((resData && resData.display) ? resData.display : (resData && resData.data ? resData.data : resData));

          if (displayPayload && Array.isArray(displayPayload.queue)) {
            setDisplay((prev) => {
              const updated = displayFromSSE(displayPayload);
              // Always prefer fresh signed posterUrl from server; only fall back to prev if server sent nothing
              if (prev && !updated.posterUrl && prev.posterUrl) {
                updated.posterUrl = prev.posterUrl;
              }
              return updated;
            });
          }
        })
        .catch(() => { });
    };

    pollQueue();
    pollInterval = setInterval(pollQueue, 3000);

    return () => {
      destroyed = true;
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [doctorId]);

  // When SSE/poll delivers a fresh signed posterUrl, reset the image error so it retries
  const currentPosterUrl = (display && display.posterUrl && typeof display.posterUrl === "string")
    ? display.posterUrl.trim()
    : "";
  useEffect(() => {
    if (currentPosterUrl && currentPosterUrl !== lastPosterUrlRef.current) {
      lastPosterUrlRef.current = currentPosterUrl;
      setPosterImgError(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPosterUrl]);

  if (!doctorId) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <p className="text-danger mb-0">Invalid doctor. Use /qd/[doctorId]</p>
      </div>
    );
  }

  // Doctor Data mapping (Safe checks - No `?.` / No `??`)
  const rawName = (display && display.doctorName && typeof display.doctorName === "string") ? display.doctorName.trim() : "";
  const rawPoster = (display && display.posterUrl && typeof display.posterUrl === "string")
    ? display.posterUrl.trim()
    : ((display && (display as any).imageUrl && typeof (display as any).imageUrl === "string") ? (display as any).imageUrl.trim() : "");
  const fallbackAvatar = getDoctorDefaultAvatar(display ? display.gender : undefined);

  // Use poster only if it exists AND no load error; otherwise fall back to gender-based icon
  const doctorPosterSrc = (rawPoster && !posterImgError) ? rawPoster : fallbackAvatar;
  const doctorName = rawName
    ? (rawName.indexOf("Dr.") === 0 ? rawName : "Dr. " + rawName)
    : "Doctor OPD";
  const designation = (display && display.designation) ? display.designation : "Consultant";
  const allQueue = (display && Array.isArray(display.queue)) ? display.queue : [];

  const isTerminalQueueStatus = (status?: string) => {
    if (!status) return false;
    const n = status.toLowerCase().trim();
    return (
      n === "completed" ||
      n === "cancelled" ||
      n === "canceled" ||
      n === "no show" ||
      n === "no_show"
    );
  };
  const queue = allQueue.filter((entry) => !isTerminalQueueStatus(entry.status));

  const timeLabel = now.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  const dateLabel = now.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const VISIBLE_ROWS = 6;
  const visibleQueue = queue.slice(0, VISIBLE_ROWS);
  const totalBasis = Math.max((display && display.totalPatients != null) ? display.totalPatients : 0, queue.length);
  const additionalWaiting = Math.max(0, totalBasis - visibleQueue.length);

  return (
    <div
      ref={containerRef}
      className="min-vh-100 w-100 d-flex flex-column bg-white position-relative overflow-hidden"
      style={{ height: "100vh" }}
    >
      {/* Fullscreen toggle button */}
      <button
        type="button"
        onClick={toggleFullscreen}
        className="position-fixed top-0 end-0 m-3 btn btn-light btn-lg shadow border d-flex align-items-center justify-content-center rounded-circle p-1 z-3"
        style={{ width: "48px", height: "48px" }}
        aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
      >
        {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
      </button>

      {/* Header */}
      <div
        className="bg-white border-bottom px-4 py-1 d-flex align-items-center justify-content-between w-100"
        style={{ height: "10vh", minHeight: "56px" }}
      >
        <div className="d-flex align-items-center gap-2">
          <img
            src="/JJM Logo.png"
            alt="JJM Hospital"
            style={{ height: "7vh", maxHeight: "64px", width: "auto", objectFit: "contain" }}
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
        </div>

        <div className="text-center">
          <h1
            className="mb-0 fw-bold"
            style={{
              fontSize: "2vw",
              lineHeight: 1.1,
              color: HEADER_PURPLE,
            }}
          >
            JJM Hospital
          </h1>
        </div>

        <div className="d-flex align-items-center justify-content-end gap-2 text-end pe-5">
          <span aria-hidden style={{ color: HEADER_PURPLE }}>
            <Clock size={42} strokeWidth={1.8} />
          </span>
          <div>
            <p
              className="mb-0 fw-bold"
              style={{ fontSize: "1.4vw", color: HEADER_PURPLE, lineHeight: 1.1 }}
            >
              {timeLabel}
            </p>
            <p className="mb-0 text-muted fw-semibold" style={{ fontSize: "0.85vw" }}>
              {dateLabel}
            </p>
          </div>
        </div>
      </div>

      {/* Priority notice strip */}
      <div
        className="bg-white text-dark py-1 px-4 text-center w-100 border-bottom"
        style={{ fontSize: "1vw", height: "3.5vh" }}
      >
        <span
          className="d-inline-flex align-items-center justify-content-center gap-2 fw-semibold"
          style={{ color: HEADER_PURPLE }}
        >
          <i className="ti ti-alert-circle" aria-hidden />
          Critical Patients will be given priority inQueue
        </span>
      </div>

      {/* Main content: Left Doctor Info, Right Queue Table */}
      <div
        className="flex-grow-1 d-flex flex-row align-items-stretch px-3 py-2 gap-3 w-100 overflow-hidden"
        style={{ height: "79vh" }}
      >
        {/* Left: Doctor Card */}
        <div
          className="flex-shrink-0 rounded-3 border bg-white shadow-sm text-center d-flex flex-column p-2"
          style={{
            width: "23%",
            minWidth: "260px",
            maxWidth: "380px",
            height: "100%",
          }}
        >
          <div
            className="bg-light flex-shrink-0 overflow-hidden rounded-2 mx-auto position-relative"
            style={{
              width: "85%",
              height: "36vh",
              marginBottom: "8px",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={doctorPosterSrc}
              alt={doctorName}
              className="position-absolute top-0 start-0 w-100 h-100"
              style={{ objectFit: "cover", objectPosition: "top" }}
              onError={() => {
                // Mark error so we fall back to gender icon;
                // posterImgError will be reset if SSE/poll delivers a fresh signed URL
                setPosterImgError(true);
              }}
            />
          </div>

          <h2
            className="fw-bold mb-2 mx-auto text-truncate w-100"
            style={{
              color: HEADER_PURPLE,
              fontSize: "1.6vw",
              lineHeight: 1.2,
            }}
          >
            {doctorName}
          </h2>

          <div className="mt-1 d-flex flex-column gap-2 flex-grow-1 justify-content-start">
            <div
              className="d-flex align-items-center gap-2 rounded-2 p-2"
              style={{ backgroundColor: DOCTOR_INFO_BG }}
            >
              <span
                className="d-inline-flex align-items-center justify-content-center rounded-circle text-white"
                style={{
                  width: "36px",
                  height: "36px",
                  backgroundColor: HEADER_PURPLE,
                  fontSize: "1.2vw",
                  flexShrink: 0,
                }}
              >
                <i className="ti ti-briefcase" />
              </span>
              <div className="text-start">
                <p
                  className="mb-0 fw-semibold"
                  style={{ color: HEADER_PURPLE, fontSize: "0.85vw" }}
                >
                  Designation
                </p>
                <p className="mb-0 text-dark fw-bold" style={{ fontSize: "1vw" }}>
                  {designation}
                </p>
              </div>
            </div>

            <div
              className="d-flex align-items-center gap-2 rounded-2 p-2"
              style={{ backgroundColor: DOCTOR_INFO_BG }}
            >
              <span
                className="d-inline-flex align-items-center justify-content-center rounded-circle text-white"
                style={{
                  width: "36px",
                  height: "36px",
                  backgroundColor: HEADER_PURPLE,
                  fontSize: "1.2vw",
                  flexShrink: 0,
                }}
              >
                <i className="ti ti-briefcase-2" />
              </span>
              <div className="text-start">
                <p
                  className="mb-0 fw-semibold"
                  style={{ color: HEADER_PURPLE, fontSize: "0.85vw" }}
                >
                  Experience
                </p>
                <p className="mb-0 text-dark fw-bold" style={{ fontSize: "1vw" }}>
                  {display && display.yearsOfExperience != null
                    ? display.yearsOfExperience + "+ Years"
                    : "N/A"}
                </p>
              </div>
            </div>

            <div
              className="d-flex align-items-center gap-2 rounded-2 p-2"
              style={{ backgroundColor: DOCTOR_INFO_BG }}
            >
              <span
                className="d-inline-flex align-items-center justify-content-center rounded-circle text-white"
                style={{
                  width: "36px",
                  height: "36px",
                  backgroundColor: HEADER_PURPLE,
                  fontSize: "1.2vw",
                  flexShrink: 0,
                }}
              >
                <i className="ti ti-calendar-time" />
              </span>
              <div className="text-start">
                <p
                  className="mb-0 fw-semibold"
                  style={{ color: HEADER_PURPLE, fontSize: "0.85vw" }}
                >
                  Timings
                </p>
                <p className="mb-0 text-dark fw-bold" style={{ fontSize: "1vw" }}>
                  {(display && display.shift) ? display.shift : "Regular OPD"}
                </p>
                <p className="mb-0 text-muted fw-semibold" style={{ fontSize: "0.8vw" }}>
                  Session: {(display && display.currentSessionSlot) ? display.currentSessionSlot : "All Day"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Queue Table */}
        <div
          className="flex-grow-1 min-w-0 rounded-3 border shadow-sm d-flex flex-column overflow-hidden"
          style={{ height: "100%" }}
        >
          <div className="table-responsive w-100 flex-grow-1">
            <table className="table mb-0 w-100" style={{ tableLayout: "fixed" }}>
              <thead className="position-sticky top-0 z-1" style={{ backgroundColor: "#EFE8F8" }}>
                <tr>
                  <th
                    className="text-center"
                    style={{
                      width: "32%",
                      backgroundColor: "#EFE8F8",
                      padding: "1.4vh 1vw",
                      fontSize: "1.6vw",
                      color: HEADER_PURPLE,
                      fontWeight: 800,
                    }}
                  >
                    Token No
                  </th>
                  <th
                    className="text-center"
                    style={{
                      width: "44%",
                      backgroundColor: "#EFE8F8",
                      padding: "1.4vh 1vw",
                      fontSize: "1.6vw",
                      color: HEADER_PURPLE,
                      fontWeight: 800,
                    }}
                  >
                    Status
                  </th>
                  <th
                    className="text-center"
                    style={{
                      width: "24%",
                      backgroundColor: "#EFE8F8",
                      padding: "1.4vh 1vw",
                      fontSize: "1.6vw",
                      color: HEADER_PURPLE,
                      fontWeight: 800,
                    }}
                  >
                    MRD No
                  </th>
                </tr>
              </thead>
              <tbody>
                {queue.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="text-center text-muted"
                      style={{
                        padding: "12vh 2vw",
                        fontSize: "1.8vw",
                        fontWeight: 700,
                      }}
                    >
                      <div className="mb-2" style={{ fontSize: "3vw", color: "#C3B6E0" }}>
                        👥🕒
                      </div>
                      <div className="fw-bold text-dark">No patients in queue</div>
                      <div className="small text-muted mt-1">New patient tokens will appear here</div>
                    </td>
                  </tr>
                ) : (
                  <>
                    {visibleQueue.map((entry) => {
                      const statusDisplay = getStatusDisplay(entry.status, entry.visitType);
                      const tokenLabel = formatTokenWithVisitPrefix(entry.tokenNumber, entry.visitType);
                      const mrdText = (entry.patient && entry.patient.mrd) ? entry.patient.mrd : "—";

                      return (
                        <tr key={entry._id} style={statusDisplay.rowStyle}>
                          <td
                            className={`fw-bold align-middle text-center ${statusDisplay.textClass}`}
                            style={{
                              ...statusDisplay.rowStyle,
                              padding: "1.3vh 1vw",
                              fontSize: "1.8vw",
                            }}
                          >
                            {tokenLabel}
                            <span
                              className="ms-2 fw-semibold px-2 py-1 rounded"
                              style={{
                                fontSize: "0.5em",
                                background: "rgba(255, 255, 255, 0.35)",
                                letterSpacing: "0.02em",
                              }}
                            >
                              {getSessionSlotBadge(entry.sessionSlot)}
                            </span>
                          </td>
                          <td
                            className={`align-middle text-center fw-bold ${statusDisplay.textClass}`}
                            style={{
                              ...statusDisplay.rowStyle,
                              padding: "1.3vh 1vw",
                              fontSize: "1.8vw",
                            }}
                          >
                            <span className="d-inline-flex align-items-center justify-content-center gap-2">
                              {entry.visitType === "Emergency" && (
                                <Ambulance
                                  style={{ width: "2vw", height: "2vw" }}
                                  color="#dc2626"
                                  aria-label="Emergency"
                                />
                              )}
                              {statusDisplay.label}
                            </span>
                          </td>
                          <td
                            className={`align-middle fw-bold text-center ${statusDisplay.textClass}`}
                            style={{
                              ...statusDisplay.rowStyle,
                              padding: "1.3vh 1vw",
                              fontSize: "1.8vw",
                            }}
                          >
                            {mrdText}
                          </td>
                        </tr>
                      );
                    })}

                    {additionalWaiting > 0 ? (
                      <tr>
                        <td
                          colSpan={3}
                          className="text-center fw-bold"
                          style={{
                            padding: "1.2vh 1vw",
                            fontSize: "1.3vw",
                            backgroundColor: "#f8f9fa",
                            color: "#111827",
                          }}
                        >
                          {additionalWaiting + " more " + (additionalWaiting === 1 ? "patient is" : "patients are") + " waiting"}
                        </td>
                      </tr>
                    ) : null}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Bottom Scrolling Hindi Ticker Strip */}
      <div
        className="w-100 py-1"
        style={{
          backgroundColor: "#704E8E",
          overflow: "hidden",
          height: "6.5vh",
          display: "flex",
          alignItems: "center",
        }}
      >
        <div
          className="text-white fw-bold"
          style={{
            whiteSpace: "nowrap",
            display: "inline-block",
            animation: "qd-strip-scroll 120s linear infinite",
            fontSize: "1.4vw",
          }}
        >
          24×7 इमरजेंसी केयर&nbsp;•&nbsp;
          अत्याधुनिक मशीनें और एडवांस इक्विपमेंट्स&nbsp;•&nbsp;
          हमारे क्षेत्र की सबसे बेहतर इक्विप्ड डायलिसिस यूनिट&nbsp;•&nbsp;
          प्रोफेशनल और समर्पित डॉक्टर्स एवं स्टाफ&nbsp;•&nbsp;
          मॉडर्न और स्मूथ कंसल्टेशन प्रोसेस&nbsp;•&nbsp;
          हाई-टेक डायग्नोस्टिक सर्विसेज&nbsp;•&nbsp;
          इनडोर पेशेंट प्राइवेट रूम्स&nbsp;•&nbsp;
          एडवांस ICU फैसिलिटी&nbsp;•&nbsp;
          वेल-इक्विप्ड क्रिटिकल केयर यूनिट&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
          24×7 इमरजेंसी केयर&nbsp;•&nbsp;
          अत्याधुनिक मशीनें और एडवांस इक्विपमेंट्स&nbsp;•&nbsp;
          हमारे क्षेत्र की सबसे बेहतर इक्विप्ड डायलिसिस यूनिट&nbsp;•&nbsp;
          प्रोफेशनल और समर्पित डॉक्टर्स एवं स्टाफ&nbsp;•&nbsp;
          मॉडर्न और स्मूथ कंसल्टेशन प्रोसेस&nbsp;•&nbsp;
          हाई-टेक डायग्नोस्टिक सर्विसेज&nbsp;•&nbsp;
          इनडोर पेशेंट प्राइवेट रूम्स&nbsp;•&nbsp;
          एडवांस ICU फैसिलिटी&nbsp;•&nbsp;
          वेल-इक्विप्ड क्रिटिकल केयर यूनिट
        </div>
      </div>

      {/* Animation keyframes */}
      <style jsx global>{`
        @keyframes qd-strip-scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-100%);
          }
        }
      `}</style>
    </div>
  );
};

export default QueueDisplayComponent;