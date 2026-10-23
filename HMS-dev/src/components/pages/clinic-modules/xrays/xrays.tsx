"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Datatable from "@/core/common/dataTable";
import Link from "next/link";
import axios from "axios";
import dayjs from "dayjs";
import { API_BASE_URL } from "@/environment";
import { formatAgeForListing } from "@/core/common/formatAgeForListing";
import { all_routes } from "@/routes/all_routes";
import PrintXrayReport, {
  buildPrintXrayReportData,
  type IPrintXrayReportData,
} from "@/components/pages/clinic-modules/xrays/printXrayReport";

interface IXraySessionPatient {
  name?: string;
  mrd?: string;
  age?: number;
  months?: number;
  days?: number;
  gender?: string;
  phone?: string;
}

interface IXraySessionProcedure {
  procedureName?: string;
  department?: string;
}

interface IXrayAppointmentSummary {
  daycareId?: string;
  ipdId?: string;
  appointmentId?: string;
  receiptId?: string;
  procedurePrice?: number;
  totalPrice?: number;
  discount?: number;
  amountPaid?: number;
  paymentStatus?: string;
}

interface IXraySessionRow {
  _id: string;
  sessionId?: string;
  xrayTokenId?: number | string;
  tokenDate?: string;
  source?: string;
  daycareAppointmentId?: string | null;
  ipdId?: string | null;
  status?: string;
  patient?: IXraySessionPatient;
  procedure?: IXraySessionProcedure;
  daycareAppointment?: IXrayAppointmentSummary | null;
  ipdAppointment?: IXrayAppointmentSummary | null;
}

interface IXrayPaginationMeta {
  currentPage?: number;
  limit?: number;
  totalCount?: number;
  hasMore?: boolean;
  total?: number;
  totalPages?: number;
}

interface IXraySessionsResponseData {
  sessions?: IXraySessionRow[];
  pagination?: IXrayPaginationMeta;
}

const normalizeXrayStatus = (status?: string) => {
  const value = status?.trim();
  if (!value || value === "—") return "Pending";
  if (value.toLowerCase() === "inprogress" || value.toLowerCase() === "in-progress") {
    return "In Progress";
  }
  if (value.toLowerCase() === "pending") return "Pending";
  return value;
};

const getXrayStatusSelectStyle = (status: string) => {
  if (status === "Completed") {
    return {
      className: "text-success",
      backgroundColor: "#f0f9f2",
      borderColor: "#d9efdf",
    };
  }
  if (status === "Pending") {
    return {
      className: "text-primary",
      backgroundColor: "#eef4fb",
      borderColor: "#c5d9f0",
    };
  }
  return {
    className: "text-dark",
    backgroundColor: "#fffdf2",
    borderColor: "#fff3cd",
  };
};

const resolveTotalCount = (
  data: IXraySessionsResponseData | undefined,
  sessionsLength: number
): number => {
  const pagination = data?.pagination;
  if (typeof pagination?.totalCount === "number") return pagination.totalCount;
  if (typeof pagination?.total === "number") return pagination.total;
  return sessionsLength;
};

const formatXraySessionSource = (source?: string) => {
  const normalized = source?.trim().toLowerCase();
  if (normalized === "ipd") return "IPD";
  if (normalized === "daycare") return "Daycare";
  return source?.trim() || "—";
};

const resolveXrayAppointmentSummary = (session: IXraySessionRow) => {
  const source = session.source?.trim().toLowerCase();
  if (source === "ipd") return session.ipdAppointment ?? undefined;
  if (source === "daycare") return session.daycareAppointment ?? undefined;
  return session.daycareAppointment ?? session.ipdAppointment ?? undefined;
};

const resolveXrayTotalAmount = (session: IXraySessionRow) => {
  const appointment = resolveXrayAppointmentSummary(session);
  return Number(appointment?.totalPrice ?? 0) || 0;
};

const XraysComponent = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"all" | "today">("today");
  const [sessions, setSessions] = useState<IXraySessionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [printData, setPrintData] = useState<IPrintXrayReportData | null>(null);
  const [showPrint, setShowPrint] = useState(false);
  const [printingSessionId, setPrintingSessionId] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  const fetchXraySessions = useCallback(async () => {
    if (!API_BASE_URL) return;
    try {
      setLoading(true);
      setError("");
      const params: Record<string, string | number> = {
        page,
        limit,
      };
      if (activeTab === "today") {
        params.date = dayjs().format("YYYY-MM-DD");
      }

      const res = await axios.get(`${API_BASE_URL}/hospital/xray-sessions`, { params });
      const isOk =
        res.data?.success === true ||
        res.data?.code === 200 ||
        (res.status >= 200 && res.status < 300 && res.data?.data);

      if (!isOk) {
        setSessions([]);
        setTotalCount(0);
        setError(res.data?.message ?? "Failed to load X-ray sessions.");
        return;
      }

      const data = (res.data?.data ?? {}) as IXraySessionsResponseData;
      const list = Array.isArray(data.sessions) ? data.sessions : [];
      setSessions(list);
      setTotalCount(resolveTotalCount(data, list.length));
    } catch (err: unknown) {
      const message =
        axios.isAxiosError(err) && typeof err.response?.data?.message === "string"
          ? err.response.data.message
          : "Failed to load X-ray sessions.";
      setError(message);
      setSessions([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [activeTab, page, limit]);

  useEffect(() => {
    fetchXraySessions();
  }, [fetchXraySessions]);

  const handlePaginationChange = (newPage: number, newPageSize: number) => {
    setPage(newPage);
    setLimit(newPageSize);
  };

  const handleTabChange = (tab: "all" | "today") => {
    setActiveTab(tab);
    setPage(1);
  };

  const handleXrayStatusChange = async (sessionId: string, newStatus: string) => {
    if (!API_BASE_URL) return;
    try {
      setStatusUpdatingId(sessionId);
      await axios.put(`${API_BASE_URL}/hospital/xray-session/${sessionId}`, {
        status: newStatus,
      });
      setSessions((prev) =>
        prev.map((session) =>
          session._id === sessionId ? { ...session, status: newStatus } : session
        )
      );
    } catch {
      // Keep previous status if update fails
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const handlePrintReport = async (sessionMongoId: string) => {
    if (!API_BASE_URL) return;
    try {
      setPrintingSessionId(sessionMongoId);
      const res = await axios.get(`${API_BASE_URL}/hospital/xray-session/${sessionMongoId}`);
      const isOk =
        res.data?.success === true ||
        res.data?.code === 200 ||
        (res.status >= 200 && res.status < 300 && res.data?.data);

      if (!isOk) {
        alert(res.data?.message ?? "Failed to load X-ray report.");
        return;
      }

      const data = res.data?.data?.session ?? res.data?.data;
      if (!data?.reportHtml?.trim()) {
        alert("No report available to print. Please save the report first.");
        return;
      }

      setPrintData(buildPrintXrayReportData(data));
      setShowPrint(true);
    } catch {
      alert("Failed to load X-ray report for printing.");
    } finally {
      setPrintingSessionId(null);
    }
  };

  const tableData = sessions.map((session) => {
    const ageGender = [
      formatAgeForListing(session.patient?.age, session.patient?.months, session.patient?.days),
      session.patient?.gender ?? "",
    ]
      .filter(Boolean)
      .join(", ");

    const formattedDate = session.tokenDate
      ? dayjs(session.tokenDate).format("DD MMM YYYY")
      : "—";

    const appointment = resolveXrayAppointmentSummary(session);
    const totalAmount = resolveXrayTotalAmount(session);
    const paymentStatus = appointment?.paymentStatus?.trim() || "Unpaid";

    return {
      key: session._id,
      sessionId: session.sessionId ?? "—",
      patientName: session.patient?.name ?? "—",
      mrd: session.patient?.mrd ?? "—",
      meta: ageGender || undefined,
      procedureName: session.procedure?.procedureName ?? "—",
      department: session.procedure?.department ?? "—",
      tokenDate: formattedDate,
      source: session.source,
      totalAmount,
      paymentStatus,
      status: normalizeXrayStatus(session.status),
    };
  });

  return (
    <div className="page-wrapper">
      <div className="content">
        <div className="d-flex align-items-sm-center flex-sm-row flex-column gap-2 mb-3 pb-3 border-bottom">
          <div className="flex-grow-1">
            <h4 className="fw-bold mb-0">
              Xrays
              <span className="badge badge-soft-primary border border-primary fs-13 fw-medium ms-2">
                Total : {loading ? "…" : totalCount}
              </span>
            </h4>
          </div>
          <div className="text-end d-flex align-items-center flex-wrap justify-content-end gap-2">
            <Link
              href={all_routes.xrayTokenQueue}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline-primary fs-13 btn-md"
            >
              <i className="ti ti-list-details me-1" />
              Queue
            </Link>
          </div>
        </div>

        <div className="d-flex align-items-center mb-3">
          <ul className="nav nav-tabs border-0 mb-0 flex-shrink-0">
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link${activeTab === "all" ? " active" : ""}`}
                onClick={() => handleTabChange("all")}
              >
                All Xrays
              </button>
            </li>
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link${activeTab === "today" ? " active" : ""}`}
                onClick={() => handleTabChange("today")}
              >
                Today&apos;s Xrays
              </button>
            </li>
          </ul>
        </div>

        {error ? (
          <div className="alert alert-danger mb-3" role="alert">
            {error}
          </div>
        ) : null}

        <div className="table-responsive">
          {loading ? (
            <p className="text-muted mb-0">Loading X-ray sessions…</p>
          ) : (
            <Datatable
              columns={[
                {
                  title: "Session ID",
                  dataIndex: "sessionId",
                  sorter: false,
                  showSorterTooltip: false,
                },
                {
                  title: "MRD",
                  dataIndex: "mrd",
                  sorter: false,
                  showSorterTooltip: false,
                },
                {
                  title: "Patient",
                  dataIndex: "patientName",
                  sorter: false,
                  showSorterTooltip: false,
                  render: (_: unknown, record: (typeof tableData)[number]) => (
                    <div className="text-dark">
                      <div className="fw-semibold fs-14 text-truncate">{record.patientName}</div>
                      {record.meta ? (
                        <div className="fs-13 text-muted text-truncate">{record.meta}</div>
                      ) : null}
                    </div>
                  ),
                },
                {
                  title: "Procedure",
                  dataIndex: "procedureName",
                  sorter: false,
                  showSorterTooltip: false,
                  render: (_: unknown, record: (typeof tableData)[number]) => (
                    <div className="text-dark">
                      <div className="fw-medium fs-14 text-truncate">{record.procedureName}</div>
                      <div className="fs-13 text-muted text-truncate">{record.tokenDate}</div>
                      {record.department !== "—" ? (
                        <div className="fs-13 text-muted text-truncate">{record.department}</div>
                      ) : null}
                    </div>
                  ),
                },
                {
                  title: "Source",
                  dataIndex: "source",
                  sorter: false,
                  showSorterTooltip: false,
                  render: (_: unknown, record: (typeof tableData)[number]) => {
                    const normalizedSource = String(record.source ?? "").toLowerCase();
                    const isIpd = normalizedSource === "ipd";
                    const isDaycare = normalizedSource === "daycare";
                    return (
                      <span
                        className={`badge border px-2 py-1 fs-13 fw-medium ${
                          isIpd
                            ? "badge-soft-primary border-primary"
                            : isDaycare
                              ? "badge-soft-info border-info"
                              : "badge-soft-secondary border-secondary"
                        }`}
                      >
                        {formatXraySessionSource(record.source)}
                      </span>
                    );
                  },
                },
                {
                  title: "Total",
                  dataIndex: "totalAmount",
                  sorter: false,
                  showSorterTooltip: false,
                  render: (value: number, record: (typeof tableData)[number]) => {
                    const paymentStatus = record.paymentStatus || "Unpaid";
                    const isPaid = paymentStatus === "Paid";
                    return (
                      <div className="d-flex align-items-center gap-2">
                        <span className="fw-semibold text-dark">
                          ₹{(Number(value) || 0).toFixed(2)}
                        </span>
                        <span
                          className={`d-inline-flex align-items-center justify-content-center rounded-circle ${
                            isPaid ? "bg-success" : "bg-warning"
                          }`}
                          style={{ width: "15px", height: "15px", minWidth: "15px" }}
                        >
                          <i className="ti ti-check fs-10 text-white" />
                        </span>
                      </div>
                    );
                  },
                },
                {
                  title: "Status",
                  dataIndex: "status",
                  sorter: false,
                  showSorterTooltip: false,
                  render: (_: unknown, record: (typeof tableData)[number]) => {
                    const statusStyle = getXrayStatusSelectStyle(record.status);
                    return (
                    <select
                      className={`form-select form-select-sm ${statusStyle.className}`}
                      style={{
                        width: "auto",
                        minWidth: "7rem",
                        backgroundColor: statusStyle.backgroundColor,
                        borderColor: statusStyle.borderColor,
                      }}
                      value={record.status}
                      disabled={statusUpdatingId === record.key}
                      onChange={(e) => handleXrayStatusChange(record.key, e.target.value)}
                      aria-label="Update status"
                    >
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                    </select>
                    );
                  },
                },
                {
                  title: "",
                  dataIndex: "actions",
                  sorter: false,
                  showSorterTooltip: false,
                  width: 110,
                  render: (_: unknown, record: (typeof tableData)[number]) => {
                    const sessionKey = record.key;
                    return (
                      <div className="d-flex align-items-center justify-content-end gap-2">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center justify-content-center"
                          title="Open X-ray details"
                          aria-label="Open X-ray details"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`${all_routes.xrayDetails}/${sessionKey}`);
                          }}
                        >
                          <i className="ti ti-edit fs-16" />
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary d-inline-flex align-items-center justify-content-center"
                          title="Print X-ray report"
                          aria-label="Print X-ray report"
                          disabled={printingSessionId === sessionKey}
                          onClick={(e) => {
                            e.stopPropagation();
                            void handlePrintReport(sessionKey);
                          }}
                        >
                          {printingSessionId === sessionKey ? (
                            <span
                              className="spinner-border spinner-border-sm"
                              role="status"
                              aria-hidden="true"
                            />
                          ) : (
                            <i className="ti ti-printer fs-16" />
                          )}
                        </button>
                      </div>
                    );
                  },
                },
              ]}
              dataSource={tableData}
              Selection={false}
              searchText=""
              total={totalCount}
              currentPage={page}
              pageSize={limit}
              onPaginationChange={handlePaginationChange}
            />
          )}
        </div>

        {showPrint && printData ? (
          <PrintXrayReport
            reportData={printData}
            onClose={() => {
              setShowPrint(false);
              setPrintData(null);
            }}
          />
        ) : null}
      </div>
      <div className="footer text-center bg-white p-2 border-top">
        <p className="text-dark mb-0">
          2025 ©
          <Link href="#" className="link-primary">
            Preclinic
          </Link>
          , All Rights Reserved
        </p>
      </div>
    </div>
  );
};

export default XraysComponent;
