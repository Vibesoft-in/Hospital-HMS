"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import { all_routes } from "@/routes/all_routes";
import {
  CONSENT_STATUS_FILTERS,
  getAllConsents,
  getConsentRecordId,
  getConsentStatusBadgeClass,
  type IConsentListItem,
  type IConsentPagination,
  type TConsentStatusFilter,
} from "@/core/api/abdmConsentApi";

const SEARCH_DEBOUNCE_MS = 400;
const DEFAULT_PAGE_SIZE = 10;

const formatDateRange = (from: string | null, to: string | null): string => {
  if (!from && !to) return "—";
  const fromLabel = from ? dayjs(from).format("DD MMM YYYY") : "—";
  const toLabel = to ? dayjs(to).format("DD MMM YYYY") : "—";
  return `${fromLabel} – ${toLabel}`;
};

const EMPTY_PAGINATION: IConsentPagination = {
  total: 0,
  page: 1,
  limit: DEFAULT_PAGE_SIZE,
  totalPages: 1,
  hasNextPage: false,
  hasPrevPage: false,
};

const AbhaConsentListComponent = () => {
  const router = useRouter();
  const [consents, setConsents] = useState<IConsentListItem[]>([]);
  const [pagination, setPagination] = useState<IConsentPagination>(EMPTY_PAGINATION);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TConsentStatusFilter>("ALL");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchText.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  const fetchConsents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getAllConsents({
        page,
        limit,
        status: statusFilter,
        search: debouncedSearch,
      });
      setConsents(result.consents ?? []);
      setPagination(result.pagination ?? EMPTY_PAGINATION);
    } catch (err: unknown) {
      setConsents([]);
      setPagination(EMPTY_PAGINATION);
      setError(err instanceof Error ? err.message : "Failed to fetch consents.");
    } finally {
      setLoading(false);
    }
  }, [page, limit, statusFilter, debouncedSearch]);

  useEffect(() => {
    void fetchConsents();
  }, [fetchConsents]);

  const handleClearSearch = () => {
    setSearchText("");
  };

  const handleOpenConsent = (consent: IConsentListItem) => {
    const consentId = getConsentRecordId(consent);
    if (!consentId) return;
    router.push(`${all_routes.abhaConsent}/${encodeURIComponent(consentId)}`);
  };

  const handlePrevPage = () => {
    if (!pagination.hasPrevPage || loading) return;
    setPage((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    if (!pagination.hasNextPage || loading) return;
    setPage((prev) => prev + 1);
  };

  const rowOffset = (pagination.page - 1) * pagination.limit;

  return (
    <div className="page-wrapper">
      <div className="content">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <div>
            <h4 className="fw-bold mb-1">ABHA Consent</h4>
            <p className="text-muted mb-0">
              View and manage health information consent requests across patients.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-outline-primary"
            onClick={() => void fetchConsents()}
            disabled={loading}
            aria-label="Refresh consents"
          >
            <i className="ti ti-refresh me-1" />
            Refresh
          </button>
        </div>

        <div className="card shadow-sm mb-3">
          <div className="card-body py-3">
            <div className="row g-2 align-items-center">
              <div className="col-12 col-lg">
                <input
                  type="search"
                  className="form-control"
                  placeholder="Search by Patient Name, UHID, ABHA Address or Mobile"
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  aria-label="Search consents"
                />
              </div>
              {searchText ? (
                <div className="col-12 col-sm-auto">
                  <button
                    type="button"
                    className="btn btn-light"
                    onClick={handleClearSearch}
                  >
                    Clear
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="d-flex flex-wrap gap-2 mb-3">
          {CONSENT_STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              className={`btn btn-sm rounded-pill ${
                statusFilter === filter.value
                  ? "btn-primary"
                  : "btn-outline-light border text-dark"
              }`}
              onClick={() => setStatusFilter(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {error ? (
          <div className="alert alert-danger py-2" role="alert">
            {error}
          </div>
        ) : null}

        <div className="card shadow-sm">
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-nowrap table-hover mb-0">
                <thead className="thead-light">
                  <tr>
                    <th>#</th>
                    <th>Patient / ABHA</th>
                    <th>HI Types</th>
                    <th>Date Range</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th className="text-end">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="text-muted py-4 text-center">
                        Loading consents...
                      </td>
                    </tr>
                  ) : !consents.length ? (
                    <tr>
                      <td colSpan={7} className="text-muted py-4 text-center">
                        No consents found.
                      </td>
                    </tr>
                  ) : (
                    consents.map((consent, index) => {
                      const rowKey =
                        getConsentRecordId(consent) ||
                        consent.consentRequestId ||
                        `${consent.status}-${index}`;
                      const createdAt = consent.createdAt || consent.initiatedAt;

                      return (
                        <tr
                          key={rowKey}
                          role="button"
                          tabIndex={0}
                          className="cursor-pointer"
                          onClick={() => handleOpenConsent(consent)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              handleOpenConsent(consent);
                            }
                          }}
                        >
                          <td className="text-dark">{rowOffset + index + 1}</td>
                          <td>
                            <div className="d-flex flex-column">
                              <span className="text-dark fw-medium">
                                {consent.patientName ?? "—"}
                              </span>
                              <span className="text-muted fs-12">
                                {consent.abhaAddress ?? consent.abhaNumber ?? "—"}
                              </span>
                            </div>
                          </td>
                          <td>
                            <div className="d-flex flex-wrap gap-1" style={{ maxWidth: "280px" }}>
                              {consent.hiTypes.length ? (
                                consent.hiTypes.map((hiType) => (
                                  <span
                                    key={`${rowKey}-${hiType}`}
                                    className="badge badge-soft-primary border border-primary text-primary fs-11 fw-medium px-2 py-1 rounded-2"
                                  >
                                    {hiType}
                                  </span>
                                ))
                              ) : (
                                <span className="text-muted">—</span>
                              )}
                            </div>
                          </td>
                          <td className="text-dark">
                            {formatDateRange(consent.dateRangeFrom, consent.dateRangeTo)}
                          </td>
                          <td>
                            <span
                              className={`badge border fs-12 fw-semibold px-2 py-1 rounded-2 ${getConsentStatusBadgeClass(consent.status)}`}
                            >
                              {consent.status ?? "—"}
                            </span>
                          </td>
                          <td className="text-dark">
                            {createdAt ? dayjs(createdAt).format("DD MMM YYYY") : "—"}
                          </td>
                          <td className="text-end">
                            <Link
                              href={`${all_routes.abhaConsent}/${encodeURIComponent(getConsentRecordId(consent) ?? "")}`}
                              className="btn btn-sm btn-light"
                              onClick={(event) => event.stopPropagation()}
                              aria-label="Open consent details"
                            >
                              <i className="ti ti-chevron-right" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {!loading && pagination.total > 0 ? (
              <div className="d-flex flex-column flex-md-row align-items-center justify-content-between gap-2 px-3 py-3 border-top">
                <p className="mb-0 text-muted fs-13">
                  Showing page {pagination.page} of {pagination.totalPages} ({pagination.total}{" "}
                  total consents)
                </p>
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <label className="text-muted fs-13 mb-0" htmlFor="consent-page-size">
                    Rows
                  </label>
                  <select
                    id="consent-page-size"
                    className="form-select form-select-sm"
                    style={{ width: "auto" }}
                    value={limit}
                    onChange={(event) => {
                      setLimit(Number(event.target.value));
                      setPage(1);
                    }}
                    disabled={loading}
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    onClick={handlePrevPage}
                    disabled={!pagination.hasPrevPage || loading}
                    aria-label="Go to previous page"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    onClick={handleNextPage}
                    disabled={!pagination.hasNextPage || loading}
                    aria-label="Go to next page"
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AbhaConsentListComponent;
