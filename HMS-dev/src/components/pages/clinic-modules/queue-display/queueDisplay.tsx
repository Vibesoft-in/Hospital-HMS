"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
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

const VIEW_ROTATE_MS = 10000;

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

const isEmergencyVisit = (visit?: IQueuePatient): boolean =>
  (visit?.visitType ?? "").toLowerCase() === "emergency";

function sortAndComputeQueue(queue: IQueuePatient[], queueSortBy: IQueueSortBy = "token") {
  const sorted = sortDisplayQueue(queue, queueSortBy);
  const emergencyCount = sorted.filter((v) => isEmergencyVisit(v)).length;
  const totalPatients = sorted.length;
  const regularCount = totalPatients - emergencyCount;
  return { queue: sorted, totalPatients, emergencyCount, regularCount };
}

/** Normalize SSE visit to IQueuePatient */
function toQueuePatient(visit: Record<string, unknown>): IQueuePatient {
  const patient = (visit.patient as Record<string, unknown>) ?? {};
  return {
    _id: (visit._id as string) ?? (visit.visitId as string) ?? "",
    visitId: (visit.visitId as string) ?? "",
    appointmentId: visit.appointmentId as string | undefined,
    visitType: visit.visitType as string | undefined,
    visitTime: visit.visitTime as string | undefined,
    tokenNumber: Number(visit.tokenNumber) ?? 0,
    sessionSlot: parseSessionSlot(visit.sessionSlot),
    status: (visit.status as string) ?? "Scheduled",
    patient: {
      mrd: (patient.mrd as string) ?? "—",
      name: (patient.name as string) ?? "—",
      age: patient.age as number | undefined,
      gender: patient.gender as string | undefined,
    },
  };
}

/** Build IQueueDisplay from SSE initial/session-change payload */
function displayFromSSE(data: Record<string, unknown>): IQueueDisplay {
  const rawQueue = Array.isArray(data.queue)
    ? (data.queue as Record<string, unknown>[]).map(toQueuePatient)
    : [];
  const queueSortBy = parseQueueSortBy(data.queueSortBy);
  const {
    queue,
    totalPatients: computedTotal,
    emergencyCount: computedEmergency,
    regularCount: computedRegular,
  } = sortAndComputeQueue(rawQueue, queueSortBy);
  const apiTotal = Number(data.totalPatients);
  const apiEmergency = Number(data.emergencyCount);
  const apiRegular = Number(data.regularCount);

  return {
    doctorId: (data.doctorId as string) ?? "",
    doctorName: (data.doctorName as string) ?? "—",
    department: (data.department as string) ?? null,
    specialization: (data.specialization as string) ?? null,
    designation: (data.designation as string) ?? null,
    yearsOfExperience:
      data.yearsOfExperience != null ? Number(data.yearsOfExperience) : null,
    opdNumber: (data.opdNumber as string) ?? null,
    posterUrl: typeof data.posterUrl === "string" ? data.posterUrl : null,
    shift: (data.shift as string) ?? null,
    currentSessionSlot: parseCurrentSessionSlot(data),
    sessionSlot: parseCurrentSessionSlot(data) ?? "Morning",
    date: (data.date as string) ?? "",
    totalPatients: Number.isFinite(apiTotal) ? apiTotal : computedTotal,
    emergencyCount: Number.isFinite(apiEmergency) ? apiEmergency : computedEmergency,
    regularCount: Number.isFinite(apiRegular) ? apiRegular : computedRegular,
    currentTime: typeof data.currentTime === "string" ? data.currentTime : undefined,
    queueSortBy,
    queue,
  };
}

/** MR row highlight */
const QUEUE_ORANGE_MR = "#FF6600";
const HEADER_PURPLE = "#6F4A8E";
const DOCTOR_INFO_BG = "#F4EFFA";

const getStatusDisplay = (status: string, visitType?: string) => {
  const normalized = status?.toLowerCase() ?? "";
  const normalizedVisitType = visitType?.toLowerCase().replace(/\s+/g, " ").trim() ?? "";

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

  // MR
  if (normalizedVisitType === "mr") {
    return {
      label: "In Queue (आप कतार में हैं)",
      rowStyle: { backgroundColor: QUEUE_ORANGE_MR },
      textClass: "text-white",
    };
  }

  // Follow-up report — dark gray (before plain Follow-up)
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

  // Follow-up
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
  const doctorId = params?.doctorId as string;

  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [display, setDisplay] = useState<IQueueDisplay | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [now, setNow] = useState<Date>(new Date());
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDelayRef = useRef(2000);

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
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

  useEffect(() => {
    if (!API_BASE_URL || !doctorId) return;

    let destroyed = false;

    const connect = () => {
      if (destroyed) return;
      const streamUrl = `${API_BASE_URL}/hospital/visits/display/stream/${doctorId}`;
      const es = new EventSource(streamUrl);
      eventSourceRef.current = es;

      es.onmessage = (event: MessageEvent) => {
        if (destroyed) return;
        // Reset backoff on successful message
        reconnectDelayRef.current = 2000;
        try {
          const data = JSON.parse(event.data) as Record<string, unknown>;
          const type = ((data.eventType ?? data.type) as string)?.trim().toLowerCase() ?? "";

          switch (type) {
            case "initial":
            case "session-change":
            case "date-change": {
              setDisplay(displayFromSSE(data));
              setLoading(false);
              setError("");
              break;
            }
            case "new-visit": {
              const visit = data.visit as Record<string, unknown>;
              if (visit) {
                setDisplay((prev) => {
                  if (!prev) return prev;
                  const newPatient = toQueuePatient(visit);
                  if (!shouldShowVisitOnScreen(newPatient.sessionSlot, prev.currentSessionSlot)) {
                    return prev;
                  }
                  const exists = prev.queue.some(
                    (p) => (p.visitId || p._id) === (newPatient.visitId || newPatient._id)
                  );
                  if (exists) return prev;
                  const queueSortBy = parseQueueSortBy(data.queueSortBy, prev.queueSortBy);
                  const { queue, totalPatients, emergencyCount, regularCount } =
                    sortAndComputeQueue([...prev.queue, newPatient], queueSortBy);
                  return { ...prev, queueSortBy, queue, totalPatients, emergencyCount, regularCount };
                });
              }
              break;
            }
            case "status-change": {
              const visit = data.visit as Record<string, unknown>;
              if (!visit) break;
              const updated = toQueuePatient(visit);
              const visitId = (updated.visitId as string) || (updated._id as string);
              const newStatus = updated.status;
              if (!visitId || !newStatus) break;
              const normalized = newStatus.toLowerCase();
              const shouldRemove =
                normalized === "completed" ||
                normalized === "cancelled" ||
                normalized === "canceled" ||
                normalized === "no show" ||
                normalized === "no_show";
              setDisplay((prev) => {
                if (!prev) return prev;
                const queueSortBy = parseQueueSortBy(data.queueSortBy, prev.queueSortBy);
                const nextQueue = shouldRemove
                  ? prev.queue.filter((p) => (p.visitId || p._id) !== visitId)
                  : prev.queue.map((p) =>
                      (p.visitId || p._id) === visitId ? { ...p, status: newStatus } : p
                    );
                const { queue, totalPatients, emergencyCount, regularCount } =
                  sortAndComputeQueue(nextQueue, queueSortBy);
                return { ...prev, queueSortBy, queue, totalPatients, emergencyCount, regularCount };
              });
              break;
            }
            case "visit-updated": {
              const visit = data.visit as Record<string, unknown>;
              if (!visit) break;
              const updated = toQueuePatient(visit);
              const matchId = (updated.visitId as string) || (updated._id as string);
              if (!matchId) break;
              setDisplay((prev) => {
                if (!prev) return prev;
                const queueSortBy = parseQueueSortBy(data.queueSortBy, prev.queueSortBy);
                const idx = prev.queue.findIndex(
                  (p) => (p.visitId || p._id) === matchId || p._id === (visit._id as string)
                );
                if (!shouldShowVisitOnScreen(updated.sessionSlot, prev.currentSessionSlot)) {
                  const nextQueue = prev.queue.filter(
                    (p) => (p.visitId || p._id) !== matchId && p._id !== (visit._id as string)
                  );
                  const { queue, totalPatients, emergencyCount, regularCount } =
                    sortAndComputeQueue(nextQueue, queueSortBy);
                  return { ...prev, queueSortBy, queue, totalPatients, emergencyCount, regularCount };
                }
                const existing = idx >= 0 ? prev.queue[idx] : null;
                const merged =
                  existing && !(visit.patient as Record<string, unknown>)
                    ? { ...updated, patient: { ...updated.patient, ...existing.patient } }
                    : { ...updated };
                const nextQueue = [...prev.queue];
                if (idx >= 0) nextQueue[idx] = merged;
                else nextQueue.push(merged);
                const { queue, totalPatients, emergencyCount, regularCount } =
                  sortAndComputeQueue(nextQueue, queueSortBy);
                return { ...prev, queueSortBy, queue, totalPatients, emergencyCount, regularCount };
              });
              break;
            }
            case "visit-deleted": {
              const visitId = getDeletedVisitId(data);
              if (!visitId) break;
              setDisplay((prev) => {
                if (!prev) return prev;
                const queueSortBy = parseQueueSortBy(data.queueSortBy, prev.queueSortBy);
                const nextQueue = prev.queue.filter(
                  (p) => (p.visitId || p._id) !== visitId
                );
                const { queue, totalPatients, emergencyCount, regularCount } =
                  sortAndComputeQueue(nextQueue, queueSortBy);
                return { ...prev, queueSortBy, queue, totalPatients, emergencyCount, regularCount };
              });
              break;
            }
            case "queue-refresh": {
              const rawQ = data.queue as Record<string, unknown>[] | undefined;
              if (Array.isArray(rawQ)) {
                setDisplay((prev) => {
                  if (!prev) return prev;
                  const currentSessionSlot =
                    parseCurrentSessionSlot(data) ?? prev.currentSessionSlot;
                  const queueSortBy = parseQueueSortBy(data.queueSortBy, prev.queueSortBy);
                  const { queue: sortedQueue, totalPatients, emergencyCount, regularCount } =
                    sortAndComputeQueue(rawQ.map(toQueuePatient), queueSortBy);
                  return {
                    ...prev,
                    currentSessionSlot,
                    sessionSlot: currentSessionSlot ?? prev.sessionSlot,
                    queueSortBy,
                    queue: sortedQueue,
                    totalPatients,
                    emergencyCount,
                    regularCount,
                  };
                });
              }
              break;
            }
            default:
              break;
          }
        } catch (err) {
          console.error("SSE parse error:", err);
        }
      };

      es.onerror = () => {
        if (destroyed) return;
        es.close();
        eventSourceRef.current = null;
        setLoading((prev) => prev);
        setError("Connection lost. Reconnecting…");
        // Exponential backoff: 2s → 4s → 8s → max 30s
        const delay = Math.min(reconnectDelayRef.current, 30000);
        reconnectDelayRef.current = delay * 2;
        reconnectTimerRef.current = setTimeout(connect, delay);
      };
    };

    setError("");
    connect();

    return () => {
      destroyed = true;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
    };
  }, [doctorId]);

  if (!doctorId) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <p className="text-danger mb-0">Invalid doctor. Use /qd/[doctorId]</p>
      </div>
    );
  }

  if (loading && !display) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error && !display) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <p className="text-danger mb-0">{error}</p>
      </div>
    );
  }

  const rawName = display?.doctorName?.trim() ?? "";
  const doctorPosterSrc = display?.posterUrl?.trim() || DEFAULT_DOCTOR_POSTER;
  const isRemotePoster = /^https?:\/\//i.test(doctorPosterSrc);
  const doctorName = rawName
    ? rawName.startsWith("Dr.")
      ? rawName
      : `Dr. ${rawName}`
    : "—";
  const designation = display?.designation ?? "—";
  const allQueue = display?.queue ?? [];
  /** Show everyone still in the live queue; only hide finished / cancelled visits (includes Consulting). */
  const isTerminalQueueStatus = (status?: string) => {
    const n = status?.toLowerCase().trim() ?? "";
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
  const totalBasis = Math.max(display?.totalPatients ?? 0, queue.length);
  const additionalWaiting = Math.max(0, totalBasis - visibleQueue.length);

  return (
    <div
      ref={containerRef}
      className="min-vh-100 w-100 d-flex flex-column bg-white position-relative"
    >
      {/* Fullscreen toggle - top right */}
      <button
        type="button"
        onClick={toggleFullscreen}
        className="position-fixed top-0 end-0 m-3 btn btn-light btn-lg shadow border d-flex align-items-center justify-content-center rounded-circle p-1 z-3"
        style={{ width: "clamp(40px, 3vw, 60px)", height: "clamp(40px, 3vw, 60px)" }}
        aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
      >
        {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
      </button>
      {/* Header */}
      <div
        className="bg-white border-bottom px-3 px-md-4 px-lg-5 py-1 d-grid align-items-center gap-2 gap-md-3 w-100"
        style={{ gridTemplateColumns: "1fr auto 1fr" }}
      >
        <div className="min-w-0" style={{ justifySelf: "start" }}>
          <img
            src="/JJM Logo.png"
            alt="JJM Hospital"
            style={{ height: "clamp(34px, 3.8vw, 72px)", width: "auto", objectFit: "contain" }}
          />
        </div>
        <div className="text-center" style={{ justifySelf: "center" }}>
          <h1
            className="mb-0 fw-bold"
            style={{
              fontSize: "clamp(1rem, 2vw, 2.4rem)",
              lineHeight: 1.1,
              color: HEADER_PURPLE,
            }}
          >
            JJM Hospital
          </h1>
         
        </div>
        <div
          className="d-flex align-items-center justify-content-end gap-2 text-end pe-5 pe-md-6 min-w-0"
          style={{ justifySelf: "end" }}
        >
          <span aria-hidden style={{ color: HEADER_PURPLE }}>
            <Clock size={48} strokeWidth={1.6} />
          </span>
          <div>
            <p
              className="mb-0 fw-bold"
              style={{ fontSize: "clamp(0.82rem, 1.3vw, 1.4rem)", color: HEADER_PURPLE }}
            >
              {timeLabel}
            </p>
            <p className="mb-0 text-muted fw-medium" style={{ fontSize: "clamp(0.58rem, 0.75vw, 0.86rem)" }}>
              {dateLabel}
            </p>
          </div>
        </div>
      </div>
      <div
        className="bg-white text-dark py-0 px-3 px-md-4 px-lg-5 text-center w-100 border-bottom"
        style={{ fontSize: "clamp(0.75rem, 1vw, 1.2rem)" }}
      >
        <span
          className="d-inline-flex align-items-center justify-content-center gap-2 fw-semibold"
          style={{ color: HEADER_PURPLE }}
        >
          <i className="ti ti-alert-circle" aria-hidden />
          Critical Patients will be given priority inQueue
        </span>
      </div>

      {/* Main content: doctor info left, queue right */}
      <div className="flex-grow-1 d-flex flex-column flex-md-row align-items-stretch px-2 px-md-3 px-lg-4 px-xl-4 py-1 py-md-2 gap-3 gap-md-4 gap-xl-4 w-100 overflow-hidden">
        {/* Left: Doctor info */}
        <div
          className="flex-shrink-0 w-100 rounded-3 border bg-white shadow-sm text-center order-2 order-md-1 d-flex flex-column"
          style={{
            maxWidth: "clamp(240px, 22%, 420px)",
            padding: "clamp(0.2rem, 0.45vw, 0.45rem)",
            height: "76vh",
          }}
        >
          <div
            className="bg-light  flex-shrink-0 overflow-hidden rounded-2 mx-auto position-relative"
            style={{ 
              width: "clamp(148px, 16.2vw, 260px)", 
              height: "clamp(184px, 22.5vw, 330px)",
            }}
          >
            {isRemotePoster ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={doctorPosterSrc}
                alt={doctorName}
                className="position-absolute top-0 start-0 w-100 h-100"
                style={{ objectFit: "cover", objectPosition: "top" }}
              />
            ) : (
              <Image
                src={doctorPosterSrc}
                alt={doctorName}
                fill
                sizes="(max-width: 768px) 200px, 25vw"
                style={{ objectFit: "cover", objectPosition: "top" }}
                priority={false}
              />
            )}
          </div>
          <h2
            className="fw-bold mb-2 mx-auto"
            style={{
              color: HEADER_PURPLE,
              fontSize: "clamp(1rem, 1.75vw, 3rem)",
              maxWidth: "clamp(220px, 20vw, 380px)",
              lineHeight: 1.2,
            }}
          >
            {doctorName}
          </h2>
          <div className="mt-1 d-flex flex-column gap-1">
            <div
              className="d-flex align-items-center gap-2 rounded-2 p-2"
              style={{ backgroundColor: DOCTOR_INFO_BG }}
            >
              <span
                className="d-inline-flex align-items-center justify-content-center rounded-circle text-white"
                style={{
                  width: "clamp(28px, 2vw, 42px)",
                  height: "clamp(28px, 2vw, 42px)",
                  backgroundColor: HEADER_PURPLE,
                  fontSize: "clamp(1rem, 1.35vw, 1.65rem)",
                  flexShrink: 0,
                }}
              >
                <i className="ti ti-briefcase" />
              </span>
              <div className="text-start">
                <p
                  className="mb-0 fw-semibold"
                  style={{ color: HEADER_PURPLE, fontSize: "clamp(0.78rem, 0.94vw, 1.08rem)" }}
                >
                  Designation
                </p>
                <p className="mb-0 text-dark fw-semibold" style={{ fontSize: "clamp(0.82rem, 1.08vw, 1.26rem)" }}>
                  {designation || "Consultant"}
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
                  width: "clamp(28px, 2vw, 42px)",
                  height: "clamp(28px, 2vw, 42px)",
                  backgroundColor: HEADER_PURPLE,
                  fontSize: "clamp(1rem, 1.35vw, 1.65rem)",
                  flexShrink: 0,
                }}
              >
                <i className="ti ti-briefcase-2" />
              </span>
              <div className="text-start">
                <p
                  className="mb-0 fw-semibold"
                  style={{ color: HEADER_PURPLE, fontSize: "clamp(0.78rem, 0.94vw, 1.08rem)" }}
                >
                  Experience
                </p>
                <p className="mb-0 text-dark fw-semibold" style={{ fontSize: "clamp(0.82rem, 1.08vw, 1.26rem)" }}>
                  {display?.yearsOfExperience != null
                    ? `${display.yearsOfExperience}+ Years`
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
                  width: "clamp(28px, 2vw, 42px)",
                  height: "clamp(28px, 2vw, 42px)",
                  backgroundColor: HEADER_PURPLE,
                  fontSize: "clamp(1rem, 1.35vw, 1.65rem)",
                  flexShrink: 0,
                }}
              >
                <i className="ti ti-calendar-time" />
              </span>
              <div className="text-start">
                <p
                  className="mb-0 fw-semibold"
                  style={{ color: HEADER_PURPLE, fontSize: "clamp(0.78rem, 0.94vw, 1.08rem)" }}
                >
                  Timings
                </p>
                <p className="mb-0 text-dark fw-semibold" style={{ fontSize: "clamp(0.82rem, 1.08vw, 1.26rem)" }}>
                  {display?.shift || "N/A"}
                </p>
                <p className="mb-0 text-muted fw-medium" style={{ fontSize: "clamp(0.7rem, 0.9vw, 1.02rem)" }}>
                  Session: {display?.currentSessionSlot || "All Day"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Queue table */}
        <div
          className="flex-grow-1 min-w-0 rounded-3 border shadow-sm order-1 order-md-2 d-flex flex-column overflow-hidden"
          style={{ minWidth: "0", height: "76vh" }}
        >
          <div className="table-responsive w-100 flex-grow-1">
            <table className="table mb-0 w-100">
              <thead className="position-sticky top-0 z-1" style={{ backgroundColor: "#EFE8F8" }}>
                <tr>
                  <th className="text-center" style={{ 
                    backgroundColor: "#EFE8F8",
                    padding: "clamp(0.5rem, 1.5vw, 4rem) clamp(0.75rem, 2vw, 5rem)",
                    fontSize: "clamp(0.875rem, 1.5vw, 5rem)",
                    color: HEADER_PURPLE
                  }}>Token No</th>
                  <th className="text-center" style={{ 
                    backgroundColor: "#EFE8F8",
                    padding: "clamp(0.5rem, 1.5vw, 4rem) clamp(0.75rem, 2vw, 5rem)",
                    fontSize: "clamp(0.875rem, 1.5vw, 5rem)",
                    color: HEADER_PURPLE
                  }}>Status</th>
                  <th className="text-center" style={{ 
                    backgroundColor: "#EFE8F8",
                    padding: "clamp(0.5rem, 1.5vw, 4rem) clamp(0.75rem, 2vw, 5rem)",
                    fontSize: "clamp(0.875rem, 1.5vw, 5rem)",
                    color: HEADER_PURPLE
                  }}>MRD No</th>
                </tr>
              </thead>
              <tbody>
                {queue.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center text-muted" style={{ 
                      padding: "clamp(2rem, 4vw, 8rem)",
                      fontSize: "clamp(0.875rem, 1.5vw, 5rem)"
                    }}>
                      No patients in queue
                    </td>
                  </tr>
                ) : (
                  <>
                    {visibleQueue.map((entry) => {
                    const statusDisplay = getStatusDisplay(entry.status, entry.visitType);
                    const tokenLabel = formatTokenWithVisitPrefix(entry.tokenNumber, entry.visitType);
                    return (
                      <tr key={entry._id} style={statusDisplay.rowStyle}>
                        <td className={`fw-semibold align-middle text-center ${statusDisplay.textClass}`} style={{
                          ...statusDisplay.rowStyle,
                          padding: "clamp(0.75rem, 2vw, 6rem) clamp(0.75rem, 2vw, 5rem)",
                          fontSize: "clamp(1rem, 1.8vw, 5.5rem)"
                        }}>
                          {tokenLabel}
                          <span
                            className="ms-2 fw-medium"
                            style={{ fontSize: "0.42em", letterSpacing: "0.02em", opacity: 0.92 }}
                          >
                            {getSessionSlotBadge(entry.sessionSlot)}
                          </span>
                        </td>
                        <td className={`align-middle text-center ${statusDisplay.textClass}`} style={{
                          ...statusDisplay.rowStyle,
                          padding: "clamp(0.75rem, 2vw, 6rem) clamp(0.75rem, 2vw, 5rem)",
                          fontSize: "clamp(1rem, 1.8vw, 5.5rem)"
                        }}>
                          <span className="d-inline-flex align-items-center justify-content-center gap-2">
                            {entry.visitType === "Emergency" && (
                              <Ambulance style={{ 
                                width: "clamp(20px, 2vw, 80px)", 
                                height: "clamp(20px, 2vw, 80px)" 
                              }} color="#dc2626" aria-label="Emergency" />
                            )}
                            {statusDisplay.label}
                          </span>
                        </td>
                        <td className={`align-middle fw-medium text-center ${statusDisplay.textClass}`} style={{
                          ...statusDisplay.rowStyle,
                          padding: "clamp(0.75rem, 2vw, 6rem) clamp(0.75rem, 2vw, 5rem)",
                          fontSize: "clamp(1rem, 1.8vw, 5.5rem)"
                        }}>
                          {entry.patient?.mrd ?? "—"}
                        </td>
                      </tr>
                    );
                    })}
                    {additionalWaiting > 0 ? (
                      <tr>
                        <td
                          colSpan={3}
                          className="text-center fw-semibold"
                          style={{
                            padding: "clamp(0.5rem, 1vw, 2rem)",
                            fontSize: "clamp(0.8rem, 1.4vw, 3rem)",
                            backgroundColor: "#f8f9fa",
                            color: "#000",
                          }}
                        >
                          {`${additionalWaiting} more ${additionalWaiting === 1 ? "patient is" : "patients are"} waiting`}
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

      {/* Scrolling info strip */}
      <div
        className="w-100 py-2 mt-0"
        style={{ backgroundColor: "#704E8E", overflow: "hidden" }}
      >
        <div
          className="text-white fw-semibold"
          style={{
            whiteSpace: "nowrap",
            display: "inline-block",
            animation: "qd-strip-scroll 140s linear infinite",
            fontSize: "clamp(1.6rem, 3vw, 4.5rem)",
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
