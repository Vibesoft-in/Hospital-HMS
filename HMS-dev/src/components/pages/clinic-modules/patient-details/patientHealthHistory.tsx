"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import dayjs from "dayjs";
import { all_routes } from "@/routes/all_routes";
import CommonSelect, { type Option } from "@/core/common/common-select/commonSelect";
import {
  getConsentById,
  getConsentStatus,
  isConsentGranted,
  type IConsentHipOption,
  type IConsentListItem,
} from "@/core/api/abdmConsentApi";
import {
  streamHealthData,
  type IHealthHistoryItem,
  type THealthStreamConnectionStatus,
} from "@/core/api/abdmHealthDataStreamApi";
import HealthHistoryDetailModal from "./HealthHistoryDetailModal";

const getConsentRecordId = (consent: IConsentListItem): string | null =>
  consent._id?.trim() || null;

const formatConsentOptionLabel = (consent: IConsentListItem): string => {
  const purpose = consent.purpose || consent.purposeCode || "Consent";
  const status = consent.status?.trim() || "Unknown";
  const dateRange =
    consent.dateRangeFrom || consent.dateRangeTo
      ? `${consent.dateRangeFrom ? dayjs(consent.dateRangeFrom).format("DD MMM YYYY") : "—"} – ${consent.dateRangeTo ? dayjs(consent.dateRangeTo).format("DD MMM YYYY") : "—"}`
      : null;
  const requester = consent.requesterName?.trim() || null;

  return [purpose, status, dateRange, requester].filter(Boolean).join(" · ");
};

const PatientHealthHistoryComponent = () => {
  const searchParams = useSearchParams();
  const patientId = searchParams.get("patientId")?.trim() ?? "";

  const [consents, setConsents] = useState<IConsentListItem[]>([]);
  const [consentsLoading, setConsentsLoading] = useState(false);
  const [consentsError, setConsentsError] = useState<string | null>(null);
  const [selectedConsentRecordId, setSelectedConsentRecordId] = useState("");
  const [hipOptions, setHipOptions] = useState<IConsentHipOption[]>([]);
  const [hipsLoading, setHipsLoading] = useState(false);
  const [hipsError, setHipsError] = useState<string | null>(null);
  const [selectedConsentArtifactId, setSelectedConsentArtifactId] = useState("");
  const [items, setItems] = useState<IHealthHistoryItem[]>([]);
  const [connectionStatus, setConnectionStatus] =
    useState<THealthStreamConnectionStatus>("idle");
  const [streamInfo, setStreamInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<IHealthHistoryItem | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const hipFetchAbortRef = useRef<AbortController | null>(null);

  const isStreaming =
    connectionStatus === "connecting" || connectionStatus === "streaming";

  const grantedConsents = useMemo(
    () => consents.filter((item) => isConsentGranted(item.status)),
    [consents]
  );

  const consentOptions = useMemo(
    () =>
      grantedConsents
        .map((consent) => ({
          consent,
          value: getConsentRecordId(consent),
        }))
        .filter((option): option is { consent: IConsentListItem; value: string } =>
          Boolean(option.value)
        ),
    [grantedConsents]
  );

  const consentSelectOptions = useMemo<Option[]>(
    () =>
      consentOptions.map(({ consent, value }) => ({
        value,
        label: formatConsentOptionLabel(consent),
      })),
    [consentOptions]
  );

  const selectedConsentOption = useMemo(
    () => consentSelectOptions.find((option) => option.value === selectedConsentRecordId) ?? null,
    [consentSelectOptions, selectedConsentRecordId]
  );

  const hipSelectOptions = useMemo<Option[]>(
    () =>
      hipOptions.map((hip) => ({
        value: hip.consentArtifactId,
        label: hip.hipName,
      })),
    [hipOptions]
  );

  const selectedHipOption = useMemo(
    () =>
      hipSelectOptions.find((option) => option.value === selectedConsentArtifactId) ?? null,
    [hipSelectOptions, selectedConsentArtifactId]
  );

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

  const resetStreamState = () => {
    abortRef.current?.abort();
    setItems([]);
    setError(null);
    setStreamInfo(null);
    setConnectionStatus("idle");
  };

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      hipFetchAbortRef.current?.abort();
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
    resetStreamState();
    setSelectedConsentRecordId("");
    setHipOptions([]);
    setHipsError(null);
    setSelectedConsentArtifactId("");
    setHipsLoading(false);

    if (!patientId) {
      setConsents([]);
      setConsentsError("Patient ID is missing.");
      return;
    }

    let cancelled = false;
    const fetchConsents = async () => {
      setConsentsLoading(true);
      setConsentsError(null);
      try {
        const result = await getConsentStatus(patientId);
        if (cancelled) return;
        setConsents(result.consents ?? []);
      } catch (err: unknown) {
        if (cancelled) return;
        setConsents([]);
        setConsentsError(
          err instanceof Error ? err.message : "Failed to fetch consents."
        );
      } finally {
        if (!cancelled) setConsentsLoading(false);
      }
    };

    void fetchConsents();

    return () => {
      cancelled = true;
    };
  }, [patientId]);

  const handleFetchHistory = useCallback(
    async (consentArtifactIdOverride?: string) => {
      const consentArtifactId = (consentArtifactIdOverride ?? selectedConsentArtifactId)?.trim();

      if (!patientId) {
        setError("Patient ID is missing.");
        setConnectionStatus("error");
        return;
      }
      if (!consentArtifactId) {
        setError("Please select a facility.");
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
          {
            patientId,
            consentArtifactId,
          },
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
    },
    [patientId, selectedConsentArtifactId]
  );

  const handleConsentChange = (option: Option | null) => {
    const value = option?.value?.trim() ?? "";

    resetStreamState();
    hipFetchAbortRef.current?.abort();
    setSelectedConsentRecordId(value);
    setHipOptions([]);
    setSelectedConsentArtifactId("");
    setHipsError(null);

    if (!value) {
      setHipsLoading(false);
      return;
    }

    const controller = new AbortController();
    hipFetchAbortRef.current = controller;
    setHipsLoading(true);

    void (async () => {
      try {
        const hips = await getConsentById(value);
        if (controller.signal.aborted) return;
        setHipOptions(hips);
        if (!hips.length) {
          setHipsError("No facilities found for this consent.");
        }
      } catch (err: unknown) {
        if (controller.signal.aborted) return;
        setHipOptions([]);
        setHipsError(
          err instanceof Error ? err.message : "Failed to fetch facilities."
        );
      } finally {
        if (!controller.signal.aborted) setHipsLoading(false);
      }
    })();
  };

  const handleHipChange = (option: Option | null) => {
    const value = option?.value?.trim() ?? "";

    resetStreamState();
    setSelectedConsentArtifactId(value);

    if (!value) return;
    void handleFetchHistory(value);
  };

  const handleOpenDetails = (item: IHealthHistoryItem) => {
    setSelectedItem(item);
  };

  const handleCloseDetails = () => {
    setSelectedItem(null);
  };

  const consentPlaceholder = consentsLoading
    ? "Loading consents..."
    : consentSelectOptions.length
      ? "Select consent"
      : "No granted consents found";

  const facilityPlaceholder = !selectedConsentRecordId
    ? "Select consent first"
    : hipsLoading
      ? "Loading facilities..."
      : hipSelectOptions.length
        ? "Select facility"
        : "No facilities found";

  return (
    <>
      <div className="page-wrapper">
        <div className="content">
          <div className="mb-3">
            <Link
              href={`${all_routes.patientDetails}?id=${encodeURIComponent(patientId)}`}
              className="btn btn-light mb-2"
              aria-label="Back to patient details"
            >
              <i className="ti ti-arrow-left me-1" />
              Back
            </Link>
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
              <div>
                <h4 className="fw-bold mb-1">Patient Health History</h4>
                <p className="text-muted mb-0">
                  ABDM health data for this patient
                  {patientId ? " — select a consent and facility to load records" : ""}.
                </p>
              </div>
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
            </div>
          </div>

          <div className="card shadow-sm mb-3">
            <div className="card-body py-3">
              <div className="row g-2 align-items-end">
                <div className="col-12 col-md-4">
                  <label className="form-label fw-medium fs-14" htmlFor="history-consent-select">
                    Consent <span className="text-danger">*</span>
                  </label>
                  <CommonSelect
                    instanceId="history-consent-select"
                    className="w-100"
                    options={consentSelectOptions}
                    value={selectedConsentOption}
                    onChange={handleConsentChange}
                    placeholder={consentPlaceholder}
                    disabled={isStreaming || consentsLoading || !consentSelectOptions.length}
                    isLoading={consentsLoading}
                  />
                </div>
                <div className="col-12 col-md-4">
                  <label className="form-label fw-medium fs-14" htmlFor="history-facility-select">
                    Facilities <span className="text-danger">*</span>
                  </label>
                  <CommonSelect
                    instanceId="history-facility-select"
                    className="w-100"
                    options={hipSelectOptions}
                    value={selectedHipOption}
                    onChange={handleHipChange}
                    placeholder={facilityPlaceholder}
                    disabled={
                      isStreaming ||
                      hipsLoading ||
                      !selectedConsentRecordId ||
                      !hipSelectOptions.length
                    }
                    isLoading={hipsLoading}
                  />
                </div>
                <div className="col-12 col-md-4">
                  <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
                    <div>
                      <span className="text-muted fs-12 d-block">Records</span>
                      <span className="text-dark fw-medium">{items.length}</span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-outline-primary text-nowrap"
                      onClick={() => void handleFetchHistory()}
                      disabled={isStreaming || !patientId || !selectedConsentArtifactId}
                      aria-label="Refresh health history"
                    >
                      <i className="ti ti-refresh me-1" />
                      {isStreaming ? "Fetching..." : "Refresh"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {consentsError ? (
            <div className="alert alert-danger py-2" role="alert">
              {consentsError}
            </div>
          ) : null}

          {hipsError ? (
            <div className="alert alert-danger py-2" role="alert">
              {hipsError}
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
                  : consentsLoading
                    ? "Loading consents..."
                    : hipsLoading
                      ? "Loading facilities..."
                      : connectionStatus === "idle"
                        ? selectedConsentRecordId
                          ? "Select a facility to load health history."
                          : "Select a granted consent to load health history."
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
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
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

export default PatientHealthHistoryComponent;
