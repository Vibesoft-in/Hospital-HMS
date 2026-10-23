"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { API_BASE_URL } from "@/environment";
import { Maximize, Minimize } from "tabler-icons-react";

interface IPharmaQueuePatient {
  _id?: string;
  title?: string;
  name?: string;
  mrd?: string;
  phone?: string;
  gender?: string;
  age?: number;
}

interface IPharmaQueueToken {
  _id: string;
  pharmaTokenId: number;
  tokenNumber?: number;
  patientId?: string;
  date: string;
  status: "Created" | "Completed" | "Cancelled" | string;
  mrd?: string;
  patient?: IPharmaQueuePatient;
  createdAt?: string;
  updatedAt?: string;
}

interface IPharmaQueueSummary {
  total: number;
  created: number;
  completed: number;
  cancelled: number;
}

interface IPharmaQueueSsePayload {
  type: "initial" | "token-created" | "status-change" | "date-change" | string;
  date?: string;
  queue?: IPharmaQueueToken[];
  summary?: IPharmaQueueSummary;
  token?: IPharmaQueueToken;
}

/** Normalize for display / row colors (handles `InProgress`, `In Progress`, `PayNow`, etc.). */
const normalizePharmaStatusKey = (status?: string): string =>
  (status ?? "").trim().toLowerCase().replace(/\s+/g, "");

const getPharmaQueueRowBackgroundColor = (status?: string): string => {
  const k = normalizePharmaStatusKey(status);
  if (k === "inprogress") return "#bed75a";
  if (k === "paynow") return "#0d9488";
  return "#3D5C79";
};

const getPharmaQueueRowTextClass = (status?: string): string =>
  normalizePharmaStatusKey(status) === "inprogress" ? "text-dark" : "text-white";

const renderPharmaQueueStatusCell = (status?: string) => {
  const k = normalizePharmaStatusKey(status);
  if (k === "paynow") {
    return (
      <span className="d-inline-flex align-items-center justify-content-center gap-2 flex-wrap">
        <span
          className="fw-bold"
          style={{ fontSize: "clamp(1.25rem, 2.2vw, 6rem)", lineHeight: 1 }}
          aria-hidden
        >
          ₹
        </span>
        <span>In Queue (आप कतार में हैं)</span>
      </span>
    );
  }
  if (k === "inprogress") {
    return (
      <span className="d-inline-flex align-items-baseline justify-content-center gap-2 text-nowrap">
        <span>In progress ( प्रगति में )</span>
       
      </span>
    );
  }
  return <>In Queue (आप कतार में हैं)</>;
};

const normalizeQueueToken = (rawToken: IPharmaQueueToken): IPharmaQueueToken => {
  const normalizedPharmaTokenId = Number(
    rawToken?.pharmaTokenId ??
      rawToken?.tokenNumber ??
      (rawToken as unknown as { pharma_token_id?: number })?.pharma_token_id ??
      0
  );
  const normalizedStatus = String(rawToken?.status ?? "").trim();
  const normalizedPatient = rawToken?.patient
    ? {
        ...rawToken.patient,
        mrd: rawToken.patient?.mrd ?? rawToken?.mrd ?? "",
      }
    : undefined;

  return {
    ...rawToken,
    pharmaTokenId: Number.isFinite(normalizedPharmaTokenId) ? normalizedPharmaTokenId : 0,
    status: normalizedStatus,
    patient: normalizedPatient,
    mrd: rawToken?.mrd ?? normalizedPatient?.mrd ?? "",
  };
};

const PharmaTokenQueueComponent = () => {
  const [queue, setQueue] = useState<IPharmaQueueToken[]>([]);
  const [summary, setSummary] = useState<IPharmaQueueSummary>({
    total: 0,
    created: 0,
    completed: 0,
    cancelled: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDelayRef = useRef(2000);

  const toggleFullscreen = useCallback(() => {
    const element = containerRef.current;
    if (!element) return;
    if (!document.fullscreenElement) {
      element.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
      return;
    }
    document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
  }, []);

  const sortedQueue = useMemo(
    () => [...queue].sort((a, b) => (a.pharmaTokenId ?? 0) - (b.pharmaTokenId ?? 0)),
    [queue]
  );

  const isTerminalQueueStatus = (status?: string): boolean => {
    const normalizedStatus = status?.toLowerCase().trim() ?? "";
    return normalizedStatus === "completed" || normalizedStatus === "cancelled" || normalizedStatus === "canceled";
  };

  const visibleQueue = useMemo(
    () => sortedQueue.filter((item) => !isTerminalQueueStatus(item?.status)),
    [sortedQueue]
  );

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (!API_BASE_URL) return;

    let destroyed = false;
    setLoading(true);
    setError("");

    const connect = () => {
      if (destroyed) return;

      eventSourceRef.current?.close();
      const streamUrl = `${API_BASE_URL}/hospital/pharma-tokens/stream`;
      const eventSource = new EventSource(streamUrl);
      eventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        if (destroyed) return;
        reconnectDelayRef.current = 2000;
        try {
          const payload = JSON.parse(event.data) as IPharmaQueueSsePayload;
          if (!payload || typeof payload !== "object") return;

          if (Array.isArray(payload.queue)) {
            setQueue(payload.queue.map((item) => normalizeQueueToken(item)));
          }
          if (payload.summary) {
            setSummary({
              total: Number(payload.summary.total) || 0,
              created: Number(payload.summary.created) || 0,
              completed: Number(payload.summary.completed) || 0,
              cancelled: Number(payload.summary.cancelled) || 0,
            });
          }
          setError("");
          setLoading(false);
        } catch {
          // Ignore malformed/non-JSON SSE chunks
        }
      };

      eventSource.onerror = () => {
        if (destroyed) return;
        eventSource.close();
        eventSourceRef.current = null;
        setLoading((prev) => prev);
        setError("Connection lost. Reconnecting...");
        const delay = Math.min(reconnectDelayRef.current, 30000);
        reconnectDelayRef.current = delay * 2;
        reconnectTimerRef.current = setTimeout(connect, delay);
      };
    };

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
  }, []);

  if (loading && sortedQueue.length === 0) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error && sortedQueue.length === 0) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <p className="text-danger mb-0">{error}</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="min-vh-100 w-100 d-flex flex-column bg-white position-relative">
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

      <div className="bg-white border-bottom py-1 px-3 px-md-4 px-lg-5 px-xl-6 d-flex align-items-center w-100">
        <img
          src="/JJM Logo.png"
          alt="JJM Hospital"
          className="flex-shrink-0 me-3"
          style={{ height: "clamp(40px, 4vw, 150px)", width: "auto", objectFit: "contain" }}
        />
        <h1 className="mb-0 fw-bold text-dark flex-grow-1 text-center" style={{ fontSize: "clamp(1rem, 2vw, 6rem)" }}>
          JJM Hospital
        </h1>
      </div>
      <div className="bg-primary text-white py-1 px-3 px-md-4 px-lg-5 px-xl-6 text-center w-100" style={{ fontSize: "clamp(0.75rem, 1.2vw, 3rem)" }}>
        <span className="text-nowrap">Pharma Tokens Live Queue</span>
      </div>

      <div className="flex-grow-1 d-flex flex-column flex-md-row align-items-stretch p-2 p-md-3 p-lg-4 p-xl-4 gap-3 gap-md-4 gap-xl-4 w-100 overflow-hidden">
        <div
          className="flex-shrink-0 w-100 rounded-3 border bg-white shadow-sm text-center order-2 order-md-1 d-flex flex-column"
          style={{
            maxWidth: "clamp(240px, 22%, 420px)",
            padding: "clamp(0.35rem, 0.9vw, 1.5rem)",
            height: "71vh",
          }}
        >
          <div
            className="bg-light flex-grow-1 overflow-hidden rounded-2 mx-auto position-relative w-100"
            style={{
              minHeight: 0,
            }}
          >
            <Image
              src="/pharmacy-health-banner.png"
              alt="Pharmacy display"
              fill
              sizes="(max-width: 768px) 200px, 25vw"
              style={{ objectFit: "cover", objectPosition: "top" }}
              priority={false}
            />
          </div>
        </div>

        <div
          className="flex-grow-1 min-w-0 rounded-3 border shadow-sm order-1 order-md-2"
          style={{ minWidth: "0", height: "71vh" }}
        >
          <div className="table-responsive w-100">
            <table className="table mb-0 w-100">
              <thead className="table-dark position-sticky top-0 z-1">
                <tr>
                  <th className="text-center" style={{ padding: "clamp(0.5rem, 1.5vw, 4rem) clamp(0.75rem, 2vw, 5rem)", fontSize: "clamp(0.875rem, 1.5vw, 5rem)" }}>
                    Token No
                  </th>
                  <th className="text-center" style={{ padding: "clamp(0.5rem, 1.5vw, 4rem) clamp(0.75rem, 2vw, 5rem)", fontSize: "clamp(0.875rem, 1.5vw, 5rem)" }}>
                    Status
                  </th>
                  <th className="text-center" style={{ padding: "clamp(0.5rem, 1.5vw, 4rem) clamp(0.75rem, 2vw, 5rem)", fontSize: "clamp(0.875rem, 1.5vw, 5rem)" }}>
                    MRD No
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleQueue.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center text-muted" style={{ padding: "clamp(2rem, 4vw, 8rem)", fontSize: "clamp(0.875rem, 1.5vw, 5rem)" }}>
                      No tokens in queue
                    </td>
                  </tr>
                ) : (
                  visibleQueue.map((item, index) => (
                    <tr key={item?._id || `${item?.pharmaTokenId}-${index}`}>
                      <td
                        className={`fw-semibold align-middle text-center ${getPharmaQueueRowTextClass(item?.status)}`}
                        style={{
                          backgroundColor: getPharmaQueueRowBackgroundColor(item?.status),
                          padding: "clamp(0.75rem, 2vw, 6rem) clamp(0.75rem, 2vw, 5rem)",
                          fontSize: "clamp(1rem, 1.8vw, 5.5rem)",
                        }}
                      >
                        {String(
                          item?.pharmaTokenId ??
                            item?.tokenNumber ??
                            ((item as unknown as { pharma_token_id?: number })?.pharma_token_id ?? "—")
                        )}
                      </td>
                      <td
                        className={`align-middle fw-medium text-center ${getPharmaQueueRowTextClass(item?.status)}`}
                        style={{
                          backgroundColor: getPharmaQueueRowBackgroundColor(item?.status),
                          padding: "clamp(0.75rem, 2vw, 6rem) clamp(0.75rem, 2vw, 5rem)",
                          fontSize: "clamp(1rem, 1.8vw, 5.5rem)",
                        }}
                      >
                        {renderPharmaQueueStatusCell(item?.status)}
                      </td>
                      <td
                        className={`align-middle fw-medium text-center ${getPharmaQueueRowTextClass(item?.status)}`}
                        style={{
                          backgroundColor: getPharmaQueueRowBackgroundColor(item?.status),
                          padding: "clamp(0.75rem, 2vw, 6rem) clamp(0.75rem, 2vw, 5rem)",
                          fontSize: "clamp(1rem, 1.8vw, 5.5rem)",
                        }}
                      >
                        {item?.patient?.mrd ||
                          item?.mrd ||
                          ((item as unknown as { patientMrd?: string })?.patientMrd ?? "—")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="w-100 py-2 mt-0" style={{ backgroundColor: "#704E8E", overflow: "hidden" }}>
        <div
          className="text-white fw-semibold"
          style={{
            whiteSpace: "nowrap",
            display: "inline-block",
            animation: "qd-strip-scroll 140s linear infinite",
            fontSize: "clamp(1.6rem, 3vw, 4.5rem)",
          }}
        >
          Welcome to JJM Hospital Pharma Counter&nbsp;•&nbsp;
          Please wait for your token number&nbsp;•&nbsp;
          Tokens are served in order&nbsp;•&nbsp;
          Completed and cancelled tokens are removed from live queue&nbsp;•&nbsp;
          Welcome to JJM Hospital Pharma Counter&nbsp;•&nbsp;
          Please wait for your token number&nbsp;•&nbsp;
          Tokens are served in order&nbsp;•&nbsp;
          Completed and cancelled tokens are removed from live queue
        </div>
      </div>

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

export default PharmaTokenQueueComponent;
