"use client";

import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  fetchAbdmPhrVisits,
  type IPhrVisitsPagination,
} from "@/core/api/abdmScanAndShareApi";

interface IAbhaScannedUsersDrawerProps {
  open: boolean;
  onClose: () => void;
}

interface IScannedUserListItem {
  id: string;
  name: string;
  mobile: string;
  gender: string;
  scanTime: string;
}

const OFFCANVAS_STYLE = {
  visibility: "visible" as const,
  width: "min(560px, 100vw - 1rem)",
  zIndex: 1045,
  top: 0,
  right: 0,
  height: "100vh",
};

const asText = (value: unknown): string => {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
};

const formatDateTime = (value: unknown): string => {
  const raw = asText(value);
  if (!raw) return "—";
  const parsed = dayjs(raw);
  if (!parsed.isValid()) return raw;
  return parsed.format("DD MMM YYYY, hh:mm A");
};

const readFallback = (record: Record<string, unknown>, keys: string[]): string => {
  for (const key of keys) {
    const val = asText(record?.[key]);
    if (val) return val;
  }
  return "";
};

const mapVisitRecord = (record: Record<string, unknown>, index: number): IScannedUserListItem => {
  const name = readFallback(record, ["patientName", "name", "fullName", "patient"]);
  const mobile = readFallback(record, ["mobile", "phone", "phoneNumber", "patientMobile"]);
  const gender = readFallback(record, ["gender", "sex"]);
  const scanTime = readFallback(record, ["scannedAt", "visitDate", "createdAt", "dateTime"]);
  const id =
    readFallback(record, ["_id", "id", "visitId", "transactionId"]) || `visit-${index + 1}`;

  return {
    id,
    name: name || "Unknown",
    mobile: mobile || "—",
    gender: gender || "—",
    scanTime: formatDateTime(scanTime),
  };
};

const AbhaScannedUsersDrawer = ({ open, onClose }: IAbhaScannedUsersDrawerProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState<Record<string, unknown>[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<IPhrVisitsPagination>({
    total: 0,
    currentPage: 1,
    limit: 20,
    totalPages: 0,
  });

  useEffect(() => {
    if (!open) return;

    const loadScannedUsers = async (page: number) => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetchAbdmPhrVisits(page, pagination?.limit ?? 20);
        setRecords(Array.isArray(response?.visits) ? response.visits : []);
        setPagination(response?.pagination ?? pagination);
      } catch (err: unknown) {
        setRecords([]);
        setPagination((prev) => ({ ...prev, total: 0, totalPages: 0 }));
        setError(err instanceof Error ? err.message : "Failed to load scanned ABHA users.");
      } finally {
        setLoading(false);
      }
    };

    void loadScannedUsers(currentPage);
  }, [open, currentPage]);

  const users = useMemo(
    () =>
      records
        .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
        .map((record, index) => mapVisitRecord(record, index)),
    [records]
  );

  if (!open) return null;

  return (
    <>
      <div
        className="offcanvas-backdrop fade show"
        onClick={onClose}
        style={{ zIndex: 1040 }}
        aria-hidden="true"
      />
      <div
        className="offcanvas offcanvas-end show d-flex flex-column"
        style={OFFCANVAS_STYLE}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="abha_scanned_users_title"
      >
        <div className="offcanvas-header border-bottom">
          <div>
            <h5 id="abha_scanned_users_title" className="offcanvas-title fw-bold text-dark mb-1">
              Scanned ABHA Users
            </h5>
          </div>
          <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />
        </div>

        <div className="offcanvas-body p-0 d-flex flex-column">
          <div className="p-3 border-bottom">
            <button
              type="button"
              className="btn btn-sm btn-outline-primary"
              onClick={() => {
                if (loading) return;
                setRecords([]);
                setError(null);
                setLoading(true);
                void fetchAbdmPhrVisits(currentPage, pagination?.limit ?? 20)
                  .then((response) => {
                    setRecords(Array.isArray(response?.visits) ? response.visits : []);
                    setPagination(response?.pagination ?? pagination);
                  })
                  .catch((err: unknown) => {
                    setError(
                      err instanceof Error ? err.message : "Failed to load scanned ABHA users."
                    );
                  })
                  .finally(() => setLoading(false));
              }}
              disabled={loading}
            >
              <i className="ti ti-refresh me-1" />
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="p-4 text-center text-muted">Loading scanned users…</div>
          ) : error ? (
            <div className="p-3">
              <div className="alert alert-danger mb-0" role="alert">
                {error}
              </div>
            </div>
          ) : users.length === 0 ? (
            <div className="p-4 text-center text-muted">No users scanned yet for today.</div>
          ) : (
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="ps-3">Name</th>
                    <th>Mobile</th>
                    <th>Gender</th>
                    <th className="pe-3">Scan Time</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="ps-3 fw-semibold text-dark">{user.name}</td>
                      <td>{user.mobile}</td>
                      <td className="text-capitalize">{user.gender}</td>
                      <td className="pe-3">{user.scanTime}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="d-flex justify-content-between align-items-center border-top p-3 mt-auto">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={loading || currentPage <= 1}
            >
              <i className="ti ti-chevron-left me-1" />
              Previous
            </button>
            <span className="text-muted fs-13">
              Page {pagination?.currentPage ?? currentPage}
            </span>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => setCurrentPage((prev) => prev + 1)}
              disabled={
                loading ||
                (pagination?.totalPages > 0 && currentPage >= pagination.totalPages) ||
                (pagination?.total === 0 && currentPage >= 1)
              }
            >
              Next
              <i className="ti ti-chevron-right ms-1" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default AbhaScannedUsersDrawer;
