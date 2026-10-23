"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import axios from "axios";
import dayjs from "dayjs";
import Datatable from "@/core/common/dataTable";
import { API_BASE_URL } from "@/environment";
import { all_routes } from "@/routes/all_routes";
import { openThermalTokenPrint } from "@/core/utils/thermalTokenPrint";

interface IPharmaTokenApi {
  _id: string;
  pharmaTokenId?: number | string;
  tokenId?: string;
  tokenNo?: number | string;
  tokenNumber?: number | string;
  visitId?: string;
  patientName?: string;
  mrd?: string;
  patientPhone?: string;
  visitType?: string;
  date?: string;
  status?: string;
  createdAt?: string;
  createdDate?: string;
  patient?: {
    mrd?: string;
    title?: string;
    name?: string;
    phone?: string;
    age?: number;
    gender?: string;
  };
}

interface IPharmaTokenRow {
  id: string;
  Pharma_Token_ID: string;
  MRD: string;
  Patient: string;
  Phone: string;
  Age_Gender: string;
  Status: string;
  Date: string;
  _visitType?: string;
  _createdAt?: string;
}

interface IPatientSearchItem {
  _id: string;
  patientId?: string;
  name?: string;
  phone?: string;
  mrd?: string;
  age?: number;
  gender?: string;
}

const PHARMA_APPOINTMENT_STATUSES = [
  "Created",
  "InProgress",
  "PayNow",
  "Completed",
  "Cancelled",
] as const;

type TPharmaAppointmentStatus = (typeof PHARMA_APPOINTMENT_STATUSES)[number];

const mapToPharmaAppointmentStatus = (raw: string | undefined): TPharmaAppointmentStatus => {
  const t = (raw ?? "").trim();
  if (!t) return "Created";
  if (PHARMA_APPOINTMENT_STATUSES.includes(t as TPharmaAppointmentStatus)) {
    return t as TPharmaAppointmentStatus;
  }
  const k = t.toLowerCase().replace(/\s+/g, "");
  if (k === "inprogress" || k === "in-progress") return "InProgress";
  if (k === "paynow" || k === "pay-now") return "PayNow";
  if (k === "completed") return "Completed";
  if (k === "cancelled" || k === "canceled") return "Cancelled";
  if (k === "created") return "Created";
  return "Created";
};

const getPharmaStatusBadgeClass = (status: TPharmaAppointmentStatus): string => {
  switch (status) {
    case "Created":
      return "badge-soft-primary text-primary";
    case "InProgress":
      return "badge-soft-warning text-dark";
    case "PayNow":
      return "badge-soft-info text-info";
    case "Completed":
      return "badge-soft-success text-success";
    case "Cancelled":
      return "badge-soft-danger text-danger";
    default:
      return "badge-soft-secondary text-secondary";
  }
};

/** Row label in UI; PATCH still uses canonical `TPharmaAppointmentStatus`. */
const getPharmaStatusDisplayLabel = (status: TPharmaAppointmentStatus): string => {
  switch (status) {
    case "InProgress":
      return "In progress";
    case "PayNow":
      return "Pay now";
    default:
      return status;
  }
};

const PharmaTokensComponent = () => {
  const [data, setData] = useState<IPharmaTokenRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [statusUpdates, setStatusUpdates] = useState<Record<string, string>>({});
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");
  const [patientSearchText, setPatientSearchText] = useState("");
  const [patientSearchLoading, setPatientSearchLoading] = useState(false);
  const [patientSearchResults, setPatientSearchResults] = useState<IPatientSearchItem[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<IPatientSearchItem | null>(null);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);

  const handleFetchPharmaTokens = useCallback(async () => {
    if (!API_BASE_URL) return;
    try {
      setLoading(true);
      setError("");
      const params: Record<string, string | number> = {
        page,
        limit,
      };

      const response = await axios.get(`${API_BASE_URL}/hospital/pharma-tokens`, { params });
      const payload = response.data?.data ?? {};
      const tokens: IPharmaTokenApi[] = Array.isArray(payload?.tokens)
        ? payload.tokens
        : Array.isArray(payload?.pharmaTokens)
          ? payload.pharmaTokens
          : Array.isArray(payload?.list)
            ? payload.list
            : [];

      const pagination = payload?.pagination;
      if (pagination && typeof pagination === "object") {
        const apiTotal =
          typeof pagination.totalCount === "number"
            ? pagination.totalCount
            : typeof pagination.total === "number"
              ? pagination.total
              : undefined;
        setTotalCount(typeof apiTotal === "number" ? apiTotal : tokens.length);
      } else {
        setTotalCount(typeof payload?.count === "number" ? payload.count : tokens.length);
      }

      const rows: IPharmaTokenRow[] = tokens.map((token) => {
        const created = token.createdAt || token.createdDate || "";
        const formattedDate = token.date
          ? dayjs(token.date).format("DD MMM YYYY")
          : created
            ? dayjs(created).format("DD MMM YYYY")
            : "—";
        const tokenNumber =
          token.pharmaTokenId ??
          token.tokenNo ??
          token.tokenNumber ??
          token.tokenId ??
          "—";
        return {
          id: token._id,
          Pharma_Token_ID: String(tokenNumber),
          MRD: token.mrd || token.patient?.mrd || "—",
          Patient: token.patientName || token.patient?.name || "—",
          Phone: token.patientPhone || token.patient?.phone || "—",
          Age_Gender:
            token.patient?.age != null || token.patient?.gender
              ? `${token.patient?.age ?? "—"} / ${token.patient?.gender ?? "—"}`
              : "—",
          Status: token.status || "—",
          Date: formattedDate,
          _visitType: token.visitType,
          _createdAt: created || token.date,
        };
      });

      setData(rows);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load pharma tokens");
      setData([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    handleFetchPharmaTokens();
  }, [handleFetchPharmaTokens]);

  const handlePaginationChange = (newPage: number, newPageSize: number) => {
    setPage(newPage);
    setLimit(newPageSize);
  };

  const handleCreatePharmaToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!API_BASE_URL) return;
    if (!selectedPatient?._id) {
      setCreateError("Please select a patient.");
      return;
    }

    try {
      setCreateLoading(true);
      setCreateError("");
      const selectedPatientId = selectedPatient.patientId ?? selectedPatient._id;
      await axios.post(`${API_BASE_URL}/hospital/pharma-tokens`, {
        patientId: selectedPatientId,
      });

      setPatientSearchText("");
      setSelectedPatient(null);
      setPatientSearchResults([]);
      setShowPatientDropdown(false);
      setPage(1);
      await handleFetchPharmaTokens();
    } catch (err: any) {
      setCreateError(err?.response?.data?.message || "Failed to create pharma token.");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleUpdatePharmaTokenStatus = async (tokenMongoId: string, newStatus: string) => {
    if (!API_BASE_URL || !tokenMongoId) return;
    try {
      setStatusUpdatingId(tokenMongoId);
      await axios.patch(`${API_BASE_URL}/hospital/pharma-tokens/${tokenMongoId}`, {
        status: newStatus,
      });
      setStatusUpdates((prev) => ({ ...prev, [tokenMongoId]: newStatus }));
      setData((prev) =>
        prev.map((row) => (row.id === tokenMongoId ? { ...row, Status: newStatus } : row))
      );
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to update status.");
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const handleSearchPatients = useCallback(async (query: string) => {
    if (!API_BASE_URL) return;
    const trimmed = query.trim();
    if (!trimmed) {
      setPatientSearchResults([]);
      return;
    }

    try {
      setPatientSearchLoading(true);
      const response = await axios.get(`${API_BASE_URL}/hospital/patients`, {
        params: { search: trimmed, limit: 10 },
      });
      const payload = response.data?.data ?? {};
      const patients: IPatientSearchItem[] = Array.isArray(payload?.patients)
        ? payload.patients
        : Array.isArray(payload?.list)
          ? payload.list
          : [];
      setPatientSearchResults(patients);
    } catch {
      setPatientSearchResults([]);
    } finally {
      setPatientSearchLoading(false);
    }
  }, []);

  const handleThermalTokenPrint = (record: IPharmaTokenRow) => {
    openThermalTokenPrint({
      caseId: String(record?.Pharma_Token_ID ?? ""),
      tokenNo: record?.Pharma_Token_ID ?? "—",
      visitType: String(record?._visitType ?? ""),
      tokenTitle: "Pharma",
      useVisitPrefix: false,
      paperWidthMm: 58,
      slipWidthMm: 50,
      patientName: String(record?.Patient ?? ""),
      appointmentDateTime: String(record?.Date ?? ""),
      doctorName: "Pharmacy Counter",
    });
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearchPatients(patientSearchText);
    }, 300);
    return () => clearTimeout(timer);
  }, [patientSearchText, handleSearchPatients]);

  const columns = [
    {
      title: "Pharma Token ID",
      dataIndex: "Pharma_Token_ID",
      render: (text: string) => <span className="text-dark fw-semibold">{text}</span>,
    },
    {
      title: "MRD",
      dataIndex: "MRD",
      render: (text: string) => <span className="text-dark">{text}</span>,
    },
    {
      title: "Patient Name",
      dataIndex: "Patient",
      render: (_: string, record: IPharmaTokenRow) => (
        <div>
          <div className="text-dark fw-medium">{record.Patient}</div>
          <div className="text-dark fs-13">{record.Phone}</div>
        </div>
      ),
    },
    {
      title: "Age / Gender",
      dataIndex: "Age_Gender",
      render: (text: string) => <span className="text-dark">{text}</span>,
    },
    {
      title: "Date",
      dataIndex: "Date",
      render: (text: string) => <span className="text-dark">{text}</span>,
    },
    {
      title: "Status",
      dataIndex: "Status",
      width: 148,
      render: (_text: string, record: IPharmaTokenRow) => {
        const currentRaw = statusUpdates[record.id] ?? record.Status;
        const currentStatus = mapToPharmaAppointmentStatus(
          currentRaw === "—" ? undefined : currentRaw
        );
        const isUpdating = statusUpdatingId === record.id;

        return (
          <div className="dropdown" onClick={(e) => e.stopPropagation()}>
            {isUpdating ? (
              <span className="d-inline-flex align-items-center gap-2 text-muted">
                <span className="spinner-border spinner-border-sm" role="status" />
                <span className="visually-hidden">Updating status</span>
              </span>
            ) : (
              <>
                <button
                  type="button"
                  className={`btn btn-sm fs-13 badge ${getPharmaStatusBadgeClass(
                    currentStatus
                  )} rounded fw-medium dropdown-toggle`}
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                  aria-label="Pharma appointment status"
                  title={currentStatus}
                >
                  {getPharmaStatusDisplayLabel(currentStatus)}
                </button>
                <ul className="dropdown-menu">
                  {PHARMA_APPOINTMENT_STATUSES.map((option) => (
                    <li key={option}>
                      <Link
                        className="dropdown-item"
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          if (isUpdating || option === currentStatus) return;
                          void handleUpdatePharmaTokenStatus(record.id, option);
                          const dropdown = e.currentTarget.closest(".dropdown");
                          if (dropdown) {
                            const button = dropdown.querySelector(
                              '[data-bs-toggle="dropdown"]'
                            ) as HTMLElement | null;
                            const menu = dropdown.querySelector(".dropdown-menu") as HTMLElement | null;
                            if (button && menu) {
                              button.setAttribute("aria-expanded", "false");
                              button.classList.remove("show");
                              menu.classList.remove("show");
                            }
                          }
                        }}
                      >
                        {getPharmaStatusDisplayLabel(option)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        );
      },
    },
    {
      title: "",
      dataIndex: "actions",
      render: (_: string, record: IPharmaTokenRow) => (
        <button
          type="button"
          className="btn btn-link text-dark p-0 border-0"
          onClick={(e) => {
            e.stopPropagation();
            handleThermalTokenPrint(record);
          }}
          title="Print token (thermal printer)"
          aria-label="Print token for thermal printer"
        >
          <i className="ti ti-printer fs-16" />
        </button>
      ),
    },
  ];

  return (
    <div className="page-wrapper">
      <div className="content">
        <div className="d-flex align-items-sm-center flex-sm-row flex-column gap-2 pb-3 mb-3 border-1 border-bottom">
          <div className="flex-grow-1">
            <h4 className="fw-semibold mb-0">
              Pharma Appointments
              <span className="badge badge-soft-primary fw-medium border py-1 px-2 border-primary fs-13 ms-2">
                Total : {totalCount}
              </span>
            </h4>
          </div>
          <div className="text-end d-flex align-items-center flex-wrap justify-content-end gap-2">
            <Link
              href={all_routes.pharmaTokenQueue}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline-primary fs-13 btn-md"
            >
              <i className="ti ti-list-details me-1" />
              Queue
            </Link>
          </div>
        </div>

        <div className="card border shadow-none mb-3">
          <div className="card-body p-3 p-md-4">
            <h5 className="fw-semibold mb-3 fs-16">Create pharma token</h5>
            <form onSubmit={handleCreatePharmaToken}>
              {createError ? (
                <div className="alert alert-danger mb-3" role="alert">
                  {createError}
                </div>
              ) : null}
              <div className="row g-3">
                <div className="col-12">
                  <label className="form-label mb-1 fw-medium">
                    Search patient <span className="text-danger ms-1">*</span>
                  </label>
                  <div className="position-relative">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Search by name / phone / MRD"
                      value={patientSearchText}
                      onChange={(e) => {
                        setPatientSearchText(e.target.value);
                        setShowPatientDropdown(true);
                        setSelectedPatient(null);
                      }}
                      onFocus={() => setShowPatientDropdown(true)}
                    />
                    {showPatientDropdown && patientSearchText.trim() ? (
                      <div
                        className="dropdown-menu show w-100 mt-1 p-0"
                        style={{ maxHeight: "16rem", overflowY: "auto", position: "absolute" }}
                      >
                        {patientSearchLoading ? (
                          <div className="px-3 py-2 text-muted">Searching...</div>
                        ) : patientSearchResults.length > 0 ? (
                          patientSearchResults.map((patient) => (
                            <button
                              key={patient._id}
                              type="button"
                              className="dropdown-item py-2"
                              onClick={() => {
                                setSelectedPatient(patient);
                                setPatientSearchText(
                                  [patient.name, patient.mrd ? `(${patient.mrd})` : ""]
                                    .filter(Boolean)
                                    .join(" ")
                                );
                                setShowPatientDropdown(false);
                              }}
                            >
                              <div className="fw-medium text-dark">{patient.name || "—"}</div>
                              <div className="fs-12 text-muted">
                                MRD: {patient.mrd || "—"} | Phone: {patient.phone || "—"}
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-muted">No patients found</div>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
                {selectedPatient ? (
                  <div className="col-12">
                    <div className="border rounded p-3 bg-light">
                      <h6 className="mb-2 fw-semibold fs-14">Selected patient</h6>
                      <div className="row g-2">
                        <div className="col-sm-6">
                          <div className="text-muted fs-12">Name</div>
                          <div className="text-dark">{selectedPatient.name || "—"}</div>
                        </div>
                        <div className="col-sm-6">
                          <div className="text-muted fs-12">MRD</div>
                          <div className="text-dark">{selectedPatient.mrd || "—"}</div>
                        </div>
                        <div className="col-sm-6">
                          <div className="text-muted fs-12">Phone</div>
                          <div className="text-dark">{selectedPatient.phone || "—"}</div>
                        </div>
                        <div className="col-sm-6">
                          <div className="text-muted fs-12">Age / Gender</div>
                          <div className="text-dark">
                            {selectedPatient.age != null ? selectedPatient.age : "—"} /{" "}
                            {selectedPatient.gender || "—"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
                <div className="col-12">
                  <div className="d-flex flex-column flex-sm-row align-items-stretch align-items-sm-center justify-content-sm-end gap-2">
                    <button
                      type="button"
                      className="btn btn-light btn-md order-2 order-sm-1"
                      onClick={() => {
                        setPatientSearchText("");
                        setSelectedPatient(null);
                        setPatientSearchResults([]);
                        setShowPatientDropdown(false);
                        setCreateError("");
                      }}
                    >
                      Clear
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary btn-md order-1 order-sm-2"
                      disabled={createLoading}
                    >
                      {createLoading ? "Creating..." : "Create token"}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>

        {error && (
          <div className="alert alert-danger mb-3" role="alert">
            <strong>Error:</strong> {error}
          </div>
        )}

        <div className="table-responsive">
          {loading ? (
            <div className="text-center p-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-2 text-muted">Loading pharma tokens...</p>
            </div>
          ) : (
            <Datatable
              columns={columns}
              dataSource={data}
              Selection={false}
              searchText=""
              total={totalCount}
              currentPage={page}
              pageSize={limit}
              onPaginationChange={handlePaginationChange}
            />
          )}
        </div>
      </div>
      <div className="footer text-center bg-white p-2 border-top">
        <p className="text-dark mb-0">
          2025 ©{" "}
          <Link href="#" className="link-primary">
            Preclinic
          </Link>
          , All Rights Reserved
        </p>
      </div>
    </div>
  );
};

export default PharmaTokensComponent;
