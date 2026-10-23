"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import dayjs from "dayjs";
import { all_routes } from "@/routes/all_routes";
import {
  streamHealthData,
  type IHealthHistoryItem,
  type THealthStreamConnectionStatus,
} from "@/core/api/abdmHealthDataStreamApi";
import HealthHistoryDetailModal from "@/components/pages/clinic-modules/patient-details/HealthHistoryDetailModal";

const AbhaConsentFacilityRecordsComponent = () => {
  const params = useParams();
  const searchParams = useSearchParams();

  const consentId = typeof params?.consentId === "string" ? params.consentId.trim() : "";
  const patientId = searchParams.get("patientId")?.trim() ?? "";
  const consentArtifactId = searchParams.get("consentArtifactId")?.trim() ?? "";
  const hipName = searchParams.get("hipName")?.trim() ?? "Facility";

  const [items, setItems] = useState<IHealthHistoryItem[]>([]);
  const [connectionStatus, setConnectionStatus] =
    useState<THealthStreamConnectionStatus>("idle");
  const [streamInfo, setStreamInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<IHealthHistoryItem | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const isStreaming =
    connectionStatus === "connecting" || connectionStatus === "streaming";

  const statusLabel = useMemo(() => {
    switch (connectionStatus) {
      case "connecting":
        return "Connecting...";
      case "streaming":
        return "Streaming...";
      case "completed":
        return "Completed";
      case "error":
        return "Error";
      default:
        return "Idle";
    }
  }, [connectionStatus]);

  const handleFetchHistory = useCallback(async () => {
    if (!patientId) {
      setError("Patient ID is missing. Ask backend to include hospitalPatientId in consent response.");
      setConnectionStatus("error");
      return;
    }
    if (!consentArtifactId) {
      setError("Facility consent artifact ID is missing.");
      setConnectionStatus("error");
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setItems([]);
    setError(null);
    setStreamInfo(null);
    setConnectionStatus("connecting");

    try {
      await streamHealthData(
        { patientId, consentArtifactId },
        {
          signal: controller.signal,
          onStatus: (status, message) => {
            if (!controller.signal.aborted) {
              setConnectionStatus(status);
              if (message?.trim() && status !== "streaming") {
                setStreamInfo(message.trim());
              } else if (message?.trim() && status === "streaming") {
                setStreamInfo((prev) =>
                  prev?.startsWith("Received ") ? prev : message.trim()
                );
              }
              if (status === "error" && message?.trim()) {
                setError(message.trim());
              }
            }
          },
          onInfo: (message) => {
            if (!controller.signal.aborted && message?.trim()) {
              setStreamInfo((prev) =>
                prev?.startsWith("Received ") ? prev : message.trim()
              );
            }
          },
          onItems: (incoming) => {
            if (controller.signal.aborted) return;
            setItems((prev) => {
              const existingIds = new Set(prev.map((item) => item.id));
              const toAdd = incoming.filter(
                (item) => Boolean(item?.id) && !existingIds.has(item.id)
              );
              if (!toAdd.length) return prev;
              return [...prev, ...toAdd];
            });
          },
        }
      );
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      if (err instanceof DOMException && err.name === "AbortError") return;
      setConnectionStatus("error");
      setError(err instanceof Error ? err.message : "Failed to stream health history.");
    }
  }, [patientId, consentArtifactId]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (items.length > 0) {
      setStreamInfo(
        `Received ${items.length} health record${items.length === 1 ? "" : "s"}...`
      );
    }
  }, [items.length]);

  useEffect(() => {
    if (patientId && consentArtifactId) {
      void handleFetchHistory();
    }
  }, [patientId, consentArtifactId, handleFetchHistory]);

  const handleOpenDetails = (item: IHealthHistoryItem) => {
    setSelectedItem(item);
  };

  const handleCloseDetails = () => {
    setSelectedItem(null);
  };

  return (
    <>
      <div className="page-wrapper">
        <div className="content">
          <div className="mb-3">
            <Link
              href={`${all_routes.abhaConsent}/${encodeURIComponent(consentId)}`}
              className="btn btn-light mb-2"
            >
              <i className="ti ti-arrow-left me-1" />
              Back
            </Link>
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
              <div>
                <h4 className="fw-bold mb-1">{hipName}</h4>
                <p className="text-muted mb-0">Health records from linked facility</p>
              </div>
              <div className="d-flex align-items-center gap-2">
                <span
                  className={`badge border fs-12 fw-semibold px-2 py-1 rounded-2 ${
                    connectionStatus === "completed"
                      ? "badge-soft-success border-success text-success"
                      : connectionStatus === "error"
                        ? "badge-soft-danger border-danger text-danger"
                        : connectionStatus === "idle"
                          ? "badge-soft-secondary border-secondary text-secondary"
                          : "badge-soft-warning border-warning text-warning"
                  }`}
                >
                  {statusLabel}
                </span>
                <button
                  type="button"
                  className="btn btn-outline-primary"
                  onClick={() => void handleFetchHistory()}
                  disabled={isStreaming || !patientId || !consentArtifactId}
                >
                  <i className="ti ti-refresh me-1" />
                  {isStreaming ? "Fetching..." : "Refresh"}
                </button>
              </div>
            </div>
          </div>

          {!patientId ? (
            <div className="alert alert-warning py-2" role="alert">
              Patient ID is not available for this consent. Records cannot be loaded until
              backend includes hospitalPatientId in the consent API response.
            </div>
          ) : null}

          {streamInfo ? (
            <div className="alert alert-info py-2" role="status">
              {streamInfo}
            </div>
          ) : null}

          {error ? (
            <div className="alert alert-danger py-2" role="alert">
              {error}
            </div>
          ) : null}

          <div className="table-responsive">
            {!items.length ? (
              <p className="text-muted mb-0">
                {isStreaming
                  ? streamInfo || "Waiting for health history records..."
                  : !patientId
                    ? "Patient ID required to load records."
                    : connectionStatus === "idle"
                      ? "Loading health history..."
                      : "No health history records found."}
              </p>
            ) : (
              <table className="table table-nowrap table-hover">
                <thead className="thead-light">
                  <tr>
                    <th>Title</th>
                    <th>Patient</th>
                    <th>Doctor</th>
                    <th>Department</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      role="button"
                      tabIndex={0}
                      className="cursor-pointer"
                      aria-label={`Open details for ${item.title}`}
                      onClick={() => handleOpenDetails(item)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          handleOpenDetails(item);
                        }
                      }}
                    >
                      <td>
                        <span className="text-dark fw-medium">{item.title}</span>
                      </td>
                      <td className="text-dark">{item.patientName ?? "—"}</td>
                      <td className="text-dark">{item.practitionerName ?? "—"}</td>
                      <td className="text-dark">{item.organizationName ?? "—"}</td>
                      <td className="text-dark">
                        {item.createdAt
                          ? dayjs(item.createdAt).format("DD MMM YYYY, HH:mm")
                          : "—"}
                      </td>
                      <td className="text-dark text-capitalize">{item.status ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <HealthHistoryDetailModal
        open={Boolean(selectedItem)}
        onClose={handleCloseDetails}
        item={selectedItem?.raw ?? null}
        title={selectedItem?.title ?? "Health History Details"}
      />
    </>
  );
};

export default AbhaConsentFacilityRecordsComponent;
