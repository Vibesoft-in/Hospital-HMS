"use client";

import { useCallback, useEffect, useMemo, useState, type KeyboardEvent, type MouseEvent } from "react";
import dayjs from "dayjs";
// import ImageWithBasePath from "@/core/imageWithBasePath";
import {
  // deleteFhirHealthRecord,
  downloadFhirHealthRecord,
  getFhirHiTypeLabel,
  // linkFhirHealthRecords,
  listFhirHealthRecords,
} from "@/core/api/fhirHealthRecordApi";
import {
  normalizePatientPhoneNo,
  notifyPatientSms,
} from "@/core/api/abdmSmsNotifyApi";
import type {
  IFhirHealthRecordListItem,
  TFhirSourceType,
} from "@/core/types/fhirHealthRecord";
import ViewHealthRecordModal from "./ViewHealthRecordModal";

interface IProps {
  sourceType: TFhirSourceType;
  sourceId: string;
  refreshKey?: number;
  onEdit?: (fhirRecordId: string) => void;
  /** When false, linking is blocked (patient/visit not ABHA-linked). */
  abhaLinked?: boolean;
  /** Patient mobile number for SMS notify. */
  patientPhone?: string | null;
}

const resolveRecordId = (record: IFhirHealthRecordListItem): string =>
  record._id || record.fhirId || record.id || "";

const resolveRecordDate = (record: IFhirHealthRecordListItem): string => {
  const raw = record.metadata?.date || record.createdAt || record.updatedAt || "";
  if (!raw) return "—";
  const d = dayjs(raw);
  return d.isValid() ? d.format("DD MMM YYYY, HH:mm") : raw;
};

const resolveStatus = (record: IFhirHealthRecordListItem): string => {
  const raw = (record.metadata?.status || record.status || "").trim();
  if (!raw) return record.finalizedAt ? "Final" : "Draft";
  if (raw.toLowerCase() === "final") return "Final";
  if (raw.toLowerCase() === "draft") return "Draft";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
};

// const isFinalStatus = (status: string): boolean => status.toLowerCase().includes("final");

/*
const isRecordDraft = (record: IFhirHealthRecordListItem): boolean => {
  const raw = (record.metadata?.status || record.status || "").trim().toLowerCase();
  if (raw === "draft") return true;
  if (raw.includes("final")) return false;
  if (raw.includes("draft")) return true;
  if (record.finalizedAt) return false;
  return false;
};

const isAlreadyLinkedToAbdm = (record: IFhirHealthRecordListItem): boolean =>
  record.linkedToAbdm === true;

const canSelectRecordForLink = (
  record: IFhirHealthRecordListItem,
  abhaLinked: boolean
): boolean => {
  const recordId = resolveRecordId(record);
  if (!recordId || !abhaLinked) return false;
  if (isRecordDraft(record)) return false;
  if (isAlreadyLinkedToAbdm(record)) return false;
  return true;
};
*/

const statusBadgeClass = (status: string): string => {
  const normalized = status.toLowerCase();
  if (normalized.includes("final")) return "badge bg-success-transparent text-success";
  if (normalized.includes("draft")) return "badge bg-warning-transparent text-warning";
  return "badge bg-light text-dark border";
};

const isRowInteractiveTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("input, button, a, [data-row-action]"));
};

const HealthRecordsList = ({
  sourceType,
  sourceId,
  refreshKey = 0,
  onEdit,
  abhaLinked = false,
  patientPhone,
}: IProps) => {
  const [records, setRecords] = useState<IFhirHealthRecordListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Linking handled by backend
  // const [selectedIds, setSelectedIds] = useState<string[]>([]);
  // const [linking, setLinking] = useState(false);
  // const [linkError, setLinkError] = useState("");
  // const [linkSuccess, setLinkSuccess] = useState("");
  const [viewRecordId, setViewRecordId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState("");
  const [notifying, setNotifying] = useState(false);
  const [notifyError, setNotifyError] = useState("");
  const [notifySuccess, setNotifySuccess] = useState("");
  // const [deleteTarget, setDeleteTarget] = useState<IFhirHealthRecordListItem | null>(null);
  // const [deleting, setDeleting] = useState(false);
  // const [deleteError, setDeleteError] = useState("");
  const limit = 10;

  const normalizedPatientPhone = useMemo(
    () => normalizePatientPhoneNo(patientPhone),
    [patientPhone]
  );

  const fetchRecords = useCallback(
    async (nextPage: number) => {
      if (!sourceId?.trim()) {
        setRecords([]);
        setTotal(0);
        // setSelectedIds([]);
        return;
      }

      setLoading(true);
      setError("");
      try {
        const result = await listFhirHealthRecords(sourceType, sourceId, nextPage, limit);
        setRecords(result.records);
        setTotal(result.total);
        setPage(result.page);
        // setSelectedIds([]);
      } catch (err) {
        setRecords([]);
        setTotal(0);
        // setSelectedIds([]);
        setError(err instanceof Error ? err.message : "Failed to load health records");
      } finally {
        setLoading(false);
      }
    },
    [sourceId, sourceType]
  );

  useEffect(() => {
    setPage(1);
    void fetchRecords(1);
  }, [fetchRecords, refreshKey]);

  /*
  const selectableIds = useMemo(
    () =>
      records
        .filter((record) => canSelectRecordForLink(record, abhaLinked))
        .map((record) => resolveRecordId(record))
        .filter((id): id is string => Boolean(id)),
    [records, abhaLinked]
  );

  useEffect(() => {
    if (abhaLinked) return;
    setSelectedIds([]);
  }, [abhaLinked]);

  const allSelectableSelected =
    selectableIds.length > 0 && selectableIds.every((id) => selectedIds.includes(id));

  const handleToggleSelectAll = () => {
    if (allSelectableSelected) {
      setSelectedIds((prev) => prev.filter((id) => !selectableIds.includes(id)));
      return;
    }
    setSelectedIds((prev) => Array.from(new Set([...prev, ...selectableIds])));
  };

  const handleToggleRow = (recordId: string, checked: boolean) => {
    if (!recordId) return;
    setSelectedIds((prev) => {
      if (checked) {
        if (prev.includes(recordId)) return prev;
        return [...prev, recordId];
      }
      return prev.filter((id) => id !== recordId);
    });
  };

  const handleLinkSelected = async () => {
    if (selectedIds.length === 0 || linking) return;
    setLinking(true);
    setLinkError("");
    setLinkSuccess("");
    try {
      await linkFhirHealthRecords(selectedIds);
      setLinkSuccess(
        `Linked ${selectedIds.length} health record${selectedIds.length === 1 ? "" : "s"} successfully.`
      );
      setSelectedIds([]);
      await fetchRecords(page);
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : "Failed to link health records");
    } finally {
      setLinking(false);
    }
  };
  */

  const handleDownloadRecord = async (recordId: string) => {
    if (!recordId?.trim() || downloadingId) return;
    setDownloadingId(recordId);
    setDownloadError("");
    try {
      await downloadFhirHealthRecord(recordId);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : "Failed to download health record");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleNotifyPatient = async () => {
    if (!normalizedPatientPhone || notifying) return;
    setNotifying(true);
    setNotifyError("");
    setNotifySuccess("");
    try {
      await notifyPatientSms(normalizedPatientPhone);
      setNotifySuccess("Patient notified successfully via SMS.");
    } catch (err) {
      setNotifyError(err instanceof Error ? err.message : "Failed to notify patient");
    } finally {
      setNotifying(false);
    }
  };

  /*
  const handleCloseDeleteModal = () => {
    if (deleting) return;
    setDeleteTarget(null);
    setDeleteError("");
  };

  const handleConfirmDelete = async () => {
    const recordId = deleteTarget ? resolveRecordId(deleteTarget) : "";
    if (!recordId) return;

    setDeleting(true);
    setDeleteError("");
    try {
      await deleteFhirHealthRecord(recordId);
      setDeleteTarget(null);
      const nextPage =
        records.length <= 1 && page > 1 ? page - 1 : page;
      await fetchRecords(nextPage);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete health record");
    } finally {
      setDeleting(false);
    }
  };
  */

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const canPrev = page > 1 && !loading;
  const canNext = page < totalPages && !loading;
  /*
  const deleteTargetId = deleteTarget ? resolveRecordId(deleteTarget) : "";
  const deleteTargetType = deleteTarget
    ? getFhirHiTypeLabel(
        typeof deleteTarget.hiType === "string" ? deleteTarget.hiType : undefined
      )
    : "";
  */

  return (
    <div className="card mt-3 mb-0">
      <div className="card-body p-3">
        <div className="d-flex align-items-center justify-content-between mb-3 gap-2 flex-wrap">
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <h6 className="fw-bold text-primary mb-0">Health Records</h6>
            <button
              type="button"
              className="btn btn-sm btn-outline-primary"
              disabled={!normalizedPatientPhone || notifying}
              title={
                !normalizedPatientPhone
                  ? "Patient phone number is not available"
                  : "Send SMS notification to patient"
              }
              onClick={() => void handleNotifyPatient()}
              aria-label="Notify patient via SMS"
            >
              {notifying ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-1"
                    role="status"
                    aria-hidden="true"
                  />
                  Notifying…
                </>
              ) : (
                <>
                  <i className="ti ti-bell me-1" />
                  Notify
                </>
              )}
            </button>
            {/* Linking handled by backend
            <button
              type="button"
              className="btn btn-sm btn-outline-primary"
              disabled={!abhaLinked || selectedIds.length === 0 || linking}
              title={
                !abhaLinked
                  ? "ABHA must be linked before linking health records"
                  : selectedIds.length === 0
                    ? "Select at least one record"
                    : "Link selected health records"
              }
              onClick={() => void handleLinkSelected()}
              aria-label="Link selected health records"
            >
              {linking ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-1"
                    role="status"
                    aria-hidden="true"
                  />
                  Linking…
                </>
              ) : (
                <>
                  <i className="ti ti-link me-1" />
                  Link{selectedIds.length > 0 ? ` (${selectedIds.length})` : ""}
                </>
              )}
            </button>
            */}
          </div>
          {total > 0 ? (
            <span className="text-muted fs-13">{total} record{total === 1 ? "" : "s"}</span>
          ) : null}
        </div>

        {/* Linking handled by backend
        {linkError ? (
          <div className="alert alert-danger py-2" role="alert">
            {linkError}
          </div>
        ) : null}
        {linkSuccess ? (
          <div className="alert alert-success py-2" role="alert">
            {linkSuccess}
          </div>
        ) : null}
        */}
        {downloadError ? (
          <div className="alert alert-danger py-2" role="alert">
            {downloadError}
          </div>
        ) : null}
        {notifyError ? (
          <div className="alert alert-danger py-2" role="alert">
            {notifyError}
          </div>
        ) : null}
        {notifySuccess ? (
          <div className="alert alert-success py-2" role="alert">
            {notifySuccess}
          </div>
        ) : null}

        {loading ? (
          <div className="d-flex justify-content-center py-4">
            <div className="spinner-border spinner-border-sm text-primary" role="status">
              <span className="visually-hidden">Loading…</span>
            </div>
          </div>
        ) : null}

        {!loading && error ? (
          <div className="alert alert-danger py-2 mb-0" role="alert">
            {error}
          </div>
        ) : null}

        {!loading && !error && records.length === 0 ? (
          <div className="text-center py-4 text-muted">
            <i className="ti ti-file-text fs-48 mb-2 d-block" />
            <p className="mb-0">No health records found</p>
          </div>
        ) : null}

        {!loading && !error && records.length > 0 ? (
          <>
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead>
                  <tr>
                    {/* Linking handled by backend
                    <th className="border-0 fs-13 fw-medium align-middle" style={{ width: "48px" }}>
                      <input
                        type="checkbox"
                        className="form-check-input m-0 border border-2 border-secondary"
                        style={{ width: "1.15rem", height: "1.15rem", cursor: selectableIds.length === 0 || linking ? "not-allowed" : "pointer" }}
                        checked={allSelectableSelected}
                        disabled={selectableIds.length === 0 || linking}
                        onChange={handleToggleSelectAll}
                        aria-label="Select all linkable health records"
                      />
                    </th>
                    */}
                    <th className="border-0 fs-13 fw-medium">Type</th>
                    <th className="border-0 fs-13 fw-medium">Date</th>
                    <th className="border-0 fs-13 fw-medium">Status</th>
                    <th className="border-0 fs-13 fw-medium text-end" style={{ minWidth: "160px" }}>
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record, index) => {
                    const id = resolveRecordId(record) || `row-${index}`;
                    const status = resolveStatus(record);
                    const recordId = resolveRecordId(record);
                    const canEdit = Boolean(recordId);
                    // const isFinal = isFinalStatus(status);
                    // const isDraft = isRecordDraft(record);
                    // const alreadyLinked = isAlreadyLinkedToAbdm(record);
                    // const canSelect = canSelectRecordForLink(record, abhaLinked);
                    // const canDelete = Boolean(recordId) && !isFinal;
                    const typeLabel = getFhirHiTypeLabel(
                      typeof record.hiType === "string" ? record.hiType : undefined
                    );
                    // const checkboxTitle = !abhaLinked
                    //   ? "ABHA must be linked before selecting records"
                    //   : isDraft
                    //     ? "Draft records cannot be linked"
                    //     : alreadyLinked
                    //       ? "Record is already linked to ABDM"
                    //       : "Select record";
                    const handleOpenView = () => {
                      if (!recordId) return;
                      setViewRecordId(recordId);
                    };

                    const handleRowClick = (e: MouseEvent<HTMLTableRowElement>) => {
                      if (isRowInteractiveTarget(e.target)) return;
                      handleOpenView();
                    };

                    const handleRowKeyDown = (e: KeyboardEvent<HTMLTableRowElement>) => {
                      if (!recordId || isRowInteractiveTarget(e.target)) return;
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleOpenView();
                      }
                    };

                    const clickableCellClass = recordId ? "cursor-pointer" : "";

                    return (
                      <tr
                        key={id}
                        role={recordId ? "button" : undefined}
                        tabIndex={recordId ? 0 : -1}
                        aria-label={recordId ? `View ${typeLabel}` : undefined}
                        onClick={handleRowClick}
                        onKeyDown={handleRowKeyDown}
                      >
                        {/* Linking handled by backend
                        <td className={`align-middle ${clickableCellClass}`}>
                          <input
                            type="checkbox"
                            className={`form-check-input m-0 border border-2 ${
                              canSelect ? "border-primary" : "border-secondary"
                            }`}
                            style={{
                              width: "1.15rem",
                              height: "1.15rem",
                              opacity: canSelect ? 1 : 0.45,
                              cursor: !canSelect || linking ? "not-allowed" : "pointer",
                            }}
                            checked={Boolean(recordId) && selectedIds.includes(recordId)}
                            disabled={!canSelect || linking}
                            title={checkboxTitle}
                            onChange={(e) => handleToggleRow(recordId, e.target.checked)}
                            aria-label={`Select ${typeLabel}`}
                          />
                        </td>
                        */}
                        <td className={`fs-14 text-dark fw-medium ${clickableCellClass}`}>{typeLabel}</td>
                        <td className={`fs-14 text-dark ${clickableCellClass}`}>{resolveRecordDate(record)}</td>
                        <td className={`fs-14 ${clickableCellClass}`}>
                          <span className={statusBadgeClass(status)}>{status}</span>
                        </td>
                        <td className="text-end cursor-default" data-row-action>
                          <div className="d-inline-flex align-items-center justify-content-end gap-1 flex-wrap">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary"
                              disabled={!canEdit}
                              title="Edit record"
                              onClick={() => {
                                if (!recordId || !canEdit) return;
                                onEdit?.(recordId);
                              }}
                              aria-label={`Edit ${typeLabel}`}
                            >
                              <i className="ti ti-edit me-1" />
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary"
                              disabled={!recordId || downloadingId === recordId}
                              onClick={() => {
                                if (!recordId) return;
                                void handleDownloadRecord(recordId);
                              }}
                              aria-label={`Download ${typeLabel}`}
                            >
                              {downloadingId === recordId ? (
                                <>
                                  <span
                                    className="spinner-border spinner-border-sm me-1"
                                    role="status"
                                    aria-hidden="true"
                                  />
                                  Downloading…
                                </>
                              ) : (
                                <>
                                  <i className="ti ti-download me-1" />
                                  Download
                                </>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 ? (
              <div className="d-flex align-items-center justify-content-between mt-3 gap-2 flex-wrap">
                <span className="text-muted fs-13">
                  Page {page} of {totalPages}
                </span>
                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary"
                    disabled={!canPrev}
                    onClick={() => void fetchRecords(page - 1)}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary"
                    disabled={!canNext}
                    onClick={() => void fetchRecords(page + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      {/* Delete confirmation modal temporarily disabled
      {deleteTarget && deleteTargetId ? (
        ...
      ) : null}
      */}

      <ViewHealthRecordModal
        open={Boolean(viewRecordId)}
        recordId={viewRecordId}
        onClose={() => setViewRecordId(null)}
      />
    </div>
  );
};

export default HealthRecordsList;
