"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SearchInput from "@/core/common/dataTable/dataTableSearch";
import Datatable from "@/core/common/dataTable";
import Link from "next/link";
import axios from "axios";
import dayjs from "dayjs";
import { API_BASE_URL } from "@/environment";
import { formatAgeForListing } from "@/core/common/formatAgeForListing";
import { all_routes } from "@/routes/all_routes";
import PrintReceipt, {
  type IReceiptData,
} from "@/components/pages/clinic-modules/appointments/printReceipt";
import { enrichDaycareDoctorForReceipt } from "@/components/pages/clinic-modules/appointments/buildDaycareReceiptData";
import { enrichIPDDoctorForReceipt } from "@/components/pages/clinic-modules/appointments/buildIPDReceiptData";
import {
  extractIpdFromGetResponse,
  mapIpdApiToAppointmentDetail,
  type IIpdApiRecord,
} from "@/components/pages/clinic-modules/ipd-appointments/ipdApiHelpers";
import {
  buildDialysisSessionReceiptData,
  type IDialysisSessionReceiptInput,
} from "@/components/pages/clinic-modules/dialysis/buildDialysisSessionReceiptData";
import { formatDialysisSessionDate } from "@/components/pages/clinic-modules/dialysis/resolveDialysisSessionDate";

interface IDialysisAppointmentSummary {
  daycareId?: string;
  appointmentId?: string;
  ipdId?: string;
  receiptId?: string;
  appointmentDate?: string;
  admissionDate?: string;
  procedurePrice?: number;
  totalPrice?: number;
  subtotal?: number;
  discount?: number;
  amountPaid?: number;
  paymentStatus?: string;
  status?: string;
}

interface IDialysisSessionRow {
  _id: string;
  sessionId: string;
  patientId?: string;
  daycareAppointmentId?: string | null;
  ipdId?: string | null;
  status?: string;
  sessionDate?: string;
  createdAt?: string;
  dialysisSessionSource?: string;
  patient?: {
    name?: string;
    title?: string;
    mrd?: string;
    age?: number;
    months?: number;
    days?: number;
    gender?: string;
    phone?: string;
    address?: string;
  };
  procedure?: {
    price?: number;
    procedureName?: string;
  };
  daycareAppointment?: IDialysisAppointmentSummary | null;
  ipdAppointment?: IDialysisAppointmentSummary | null;
}

interface IDialysisPaginationMeta {
  total?: number;
  totalCount?: number;
  count?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
}

interface IDialysisSessionsResponseData {
  sessions?: IDialysisSessionRow[];
  pagination?: IDialysisPaginationMeta;
  total?: number;
  count?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
}

const resolveDialysisTotalCount = (
  data: IDialysisSessionsResponseData | undefined,
  sessionsLength: number
): number => {
  const pagination = data?.pagination;
  if (typeof pagination?.total === "number") return pagination.total;
  if (typeof pagination?.totalCount === "number") return pagination.totalCount;
  if (typeof pagination?.count === "number") return pagination.count;
  if (typeof data?.total === "number") return data.total;
  if (typeof data?.count === "number") return data.count;
  return sessionsLength;
};

const formatDialysisSessionSource = (source?: string) => {
  const normalized = source?.trim().toLowerCase();
  if (normalized === "ipd") return "IPD";
  if (normalized === "daycare") return "Daycare";
  return source?.trim() || "—";
};

const resolveDialysisAppointmentSummary = (session: IDialysisSessionRow) => {
  const source = session.dialysisSessionSource?.trim().toLowerCase();
  if (source === "ipd") return session.ipdAppointment ?? undefined;
  if (source === "daycare") return session.daycareAppointment ?? undefined;
  return session.daycareAppointment ?? session.ipdAppointment ?? undefined;
};

const resolveDialysisProcedureAmount = (session: IDialysisSessionRow) => {
  const appointment = resolveDialysisAppointmentSummary(session);
  return Number(appointment?.procedurePrice ?? session.procedure?.price ?? 0) || 0;
};

const canPrintDialysisReceipt = (session: IDialysisSessionRow) => {
  const source = session.dialysisSessionSource?.trim().toLowerCase();
  if (source === "ipd") return Boolean(session.ipdId);
  if (source === "daycare") return Boolean(session.daycareAppointmentId);
  return Boolean(session.daycareAppointmentId || session.ipdId);
};

const fetchDialysisReceiptDoctor = async (
  session: IDialysisSessionRow
): Promise<IDialysisSessionReceiptInput["doctor"]> => {
  if (!API_BASE_URL) return undefined;

  const source = session.dialysisSessionSource?.trim().toLowerCase();

  if (source === "daycare" && session.daycareAppointmentId) {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/hospital/daycare-appointments/${session.daycareAppointmentId}`
      );
      const raw = res.data?.data?.daycareAppointment ?? res.data?.data;
      if (!raw || typeof raw !== "object") return undefined;
      const enriched = await enrichDaycareDoctorForReceipt(
        raw as Parameters<typeof enrichDaycareDoctorForReceipt>[0]
      );
      return enriched.doctor;
    } catch {
      return undefined;
    }
  }

  if (source === "ipd" && session.ipdId) {
    try {
      const res = await axios.get(`${API_BASE_URL}/hospital/ipd/${session.ipdId}`);
      const raw = extractIpdFromGetResponse(res.data?.data) as IIpdApiRecord | null;
      if (!raw?._id) return undefined;
      const responseReceiptId = res.data?.data?.receiptId as string | undefined;
      const enriched = await enrichIPDDoctorForReceipt(
        mapIpdApiToAppointmentDetail(raw, responseReceiptId)
      );
      return enriched.doctor;
    } catch {
      return undefined;
    }
  }

  return undefined;
};

const DialysisComponent = () => {
  const [activeTab, setActiveTab] = useState<"all" | "today">("today");
  const [dialysisSessions, setDialysisSessions] = useState<IDialysisSessionRow[]>([]);
  const [dialysisLoading, setDialysisLoading] = useState(false);
  const [dialysisPage, setDialysisPage] = useState(1);
  const [dialysisLimit, setDialysisLimit] = useState(10);
  const [dialysisTotal, setDialysisTotal] = useState(0);
  const [dialysisSearchInput, setDialysisSearchInput] = useState("");
  const [dialysisSearch, setDialysisSearch] = useState("");
  const [dialysisStatusFilter, setDialysisStatusFilter] = useState<string>("");
  const [dialysisStatusUpdatingId, setDialysisStatusUpdatingId] = useState<string | null>(null);
  const [receiptData, setReceiptData] = useState<IReceiptData | null>(null);
  const [showPrintReceipt, setShowPrintReceipt] = useState(false);
  const [printingSessionId, setPrintingSessionId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => setDialysisSearch(dialysisSearchInput.trim()), 400);
    return () => clearTimeout(t);
  }, [dialysisSearchInput]);

  useEffect(() => {
    setDialysisPage(1);
  }, [dialysisSearch, dialysisStatusFilter, activeTab]);

  useEffect(() => {
    const fetchDialysis = async () => {
      if (!API_BASE_URL) return;
      try {
        setDialysisLoading(true);
        const params: Record<string, string | number> = {
          page: dialysisPage,
          limit: dialysisLimit,
        };
        if (activeTab === "today") {
          params.date = dayjs().format("YYYY-MM-DD");
        }
        if (dialysisSearch) params.search = dialysisSearch;
        if (dialysisStatusFilter) params.status = dialysisStatusFilter;

        const res = await axios.get(`${API_BASE_URL}/hospital/dialysis-sessions`, { params });
        if (res.data?.code === 200 && res.data?.data) {
          const data = res.data.data as IDialysisSessionsResponseData;
          const sessions = Array.isArray(data.sessions) ? data.sessions : [];
          setDialysisSessions(sessions);
          setDialysisTotal(resolveDialysisTotalCount(data, sessions.length));
          return;
        }
        setDialysisSessions([]);
        setDialysisTotal(0);
      } catch {
        setDialysisSessions([]);
        setDialysisTotal(0);
      } finally {
        setDialysisLoading(false);
      }
    };
    fetchDialysis();
  }, [activeTab, dialysisPage, dialysisLimit, dialysisSearch, dialysisStatusFilter]);

  const handlePaginationChange = (newPage: number, newPageSize: number) => {
    setDialysisPage(newPage);
    setDialysisLimit(newPageSize);
  };

  const handleTabChange = (tab: "all" | "today") => {
    setActiveTab(tab);
    setDialysisPage(1);
  };

  const handleDialysisStatusChange = async (sessionId: string, newStatus: string) => {
    if (!API_BASE_URL) return;
    try {
      setDialysisStatusUpdatingId(sessionId);
      await axios.put(`${API_BASE_URL}/hospital/dialysis-session/${sessionId}`, {
        status: newStatus,
      });
      setDialysisSessions((prev) =>
        prev.map((session) =>
          session._id === sessionId ? { ...session, status: newStatus } : session
        )
      );
    } catch {
      // Keep previous status if update fails
    } finally {
      setDialysisStatusUpdatingId(null);
    }
  };

  const handlePrintReceipt = async (session: IDialysisSessionRow) => {
    if (!canPrintDialysisReceipt(session)) {
      alert("No linked appointment found for this dialysis session. Receipt is not available.");
      return;
    }
    if (!API_BASE_URL) return;

    setPrintingSessionId(session._id);
    try {
      const doctor = await fetchDialysisReceiptDoctor(session);
      setReceiptData(
        buildDialysisSessionReceiptData({
          ...session,
          doctor,
        })
      );
      setShowPrintReceipt(true);
    } catch {
      alert("Failed to load receipt. Please try again.");
    } finally {
      setPrintingSessionId(null);
    }
  };

  return (
    <div className="page-wrapper">
      <div className="content">
        <div className="d-flex align-items-sm-center flex-sm-row flex-column gap-2 mb-3 pb-3 border-bottom">
          <div className="flex-grow-1">
            <h4 className="fw-bold mb-0">Dialysis</h4>
          </div>
        </div>

        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
          <ul className="nav nav-tabs border-0 mb-0 flex-shrink-0">
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link${activeTab === "all" ? " active" : ""}`}
                onClick={() => handleTabChange("all")}
              >
                All Dialysis
              </button>
            </li>
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link${activeTab === "today" ? " active" : ""}`}
                onClick={() => handleTabChange("today")}
              >
                Today&apos;s Dialysis
              </button>
            </li>
          </ul>
          <div className="d-flex align-items-center flex-wrap gap-2">
            <div className="table-search d-flex align-items-center mb-0">
              <div className="search-input">
                <SearchInput
                  value={dialysisSearchInput}
                  onChange={(value) => setDialysisSearchInput(value)}
                />
              </div>
            </div>
            <select
              className="form-select form-select-sm"
              style={{ width: "auto", minWidth: "10rem" }}
              value={dialysisStatusFilter}
              onChange={(e) => setDialysisStatusFilter(e.target.value)}
              aria-label="Filter by status"
            >
              <option value="">All statuses</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>

        <div className="table-responsive">
          {dialysisLoading ? (
            <p className="text-muted mb-0">Loading dialysis sessions...</p>
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
                  title: "Patient",
                  dataIndex: "patientName",
                  sorter: false,
                  showSorterTooltip: false,
                  render: (_: unknown, record: any) => (
                    <div className="text-dark">
                      <div className="fw-semibold fs-14 text-truncate">{record.patientName}</div>
                      {record.meta ? (
                        <div className="fs-13 text-muted text-truncate">{record.meta}</div>
                      ) : null}
                    </div>
                  ),
                },
                {
                  title: "Phone",
                  dataIndex: "phone",
                  sorter: false,
                  showSorterTooltip: false,
                },
                {
                  title: "Date",
                  dataIndex: "date",
                  sorter: false,
                  showSorterTooltip: false,
                  render: (_: unknown, record: any) => (
                    <div className="text-dark">
                      <div>{record.date}</div>
                      {record.time ? <div className="fs-13 text-muted">{record.time}</div> : null}
                    </div>
                  ),
                },
                {
                  title: "Source",
                  dataIndex: "dialysisSessionSource",
                  sorter: false,
                  showSorterTooltip: false,
                  render: (_: unknown, record: any) => {
                    const source = String(record.dialysisSessionSource ?? "").toLowerCase();
                    const isIpd = source === "ipd";
                    const isDaycare = source === "daycare";
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
                        {formatDialysisSessionSource(record.dialysisSessionSource)}
                      </span>
                    );
                  },
                },
                {
                  title: "Total",
                  dataIndex: "totalAmount",
                  sorter: false,
                  showSorterTooltip: false,
                  render: (value: number, record: any) => {
                    const paymentStatus = record.paymentStatus || "Unpaid";
                    const isPaid = paymentStatus === "Paid";
                    return (
                      <div className="d-flex align-items-center gap-2">
                        <span className="fw-semibold text-dark">₹{(Number(value) || 0).toFixed(2)}</span>
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
                  render: (_: unknown, record: any) => (
                    <select
                      className={`form-select form-select-sm ${
                        record.status === "Completed" ? "text-success" : "text-dark"
                      }`}
                      style={{
                        width: "auto",
                        minWidth: "7rem",
                        backgroundColor:
                          record.status === "Completed" ? "#f0f9f2" : "#fffdf2",
                        borderColor:
                          record.status === "Completed" ? "#d9efdf" : "#fff3cd",
                      }}
                      value={record.status || "In Progress"}
                      disabled={dialysisStatusUpdatingId === record.key}
                      onChange={(e) => handleDialysisStatusChange(record.key, e.target.value)}
                      aria-label="Update status"
                    >
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                    </select>
                  ),
                },
                {
                  title: "",
                  dataIndex: "actions",
                  sorter: false,
                  showSorterTooltip: false,
                  width: 110,
                  render: (_: unknown, record: any) => {
                    const sessionKey = record.key as string;
                    const session = dialysisSessions.find((s) => s._id === sessionKey);
                    const canPrint = Boolean(record.canPrint);
                    const canOpenForm = Boolean(record.patientId);
                    return (
                      <div className="d-flex align-items-center justify-content-end gap-2">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center justify-content-center"
                          title="Open dialysis form"
                          aria-label="Open dialysis form"
                          disabled={!canOpenForm}
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(
                              `${all_routes.dialysisAppointment}?patientId=${record.patientId ?? ""}&sessionId=${sessionKey}`
                            );
                          }}
                        >
                          <i className="ti ti-edit fs-16" />
                        </button>

                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary d-inline-flex align-items-center justify-content-center"
                          title={canPrint ? "Print dialysis receipt" : "No linked appointment"}
                          aria-label="Print dialysis receipt"
                          disabled={!canPrint || printingSessionId === sessionKey}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (session) void handlePrintReceipt(session);
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
              dataSource={dialysisSessions.map((session) => {
                const appointment = resolveDialysisAppointmentSummary(session);
                const discount = Number(appointment?.discount ?? 0) || 0;
                const procedureAmount = resolveDialysisProcedureAmount(session);
                const totalAmount = Math.max(0, procedureAmount - discount);
                const paymentStatus = appointment?.paymentStatus?.trim() || "Unpaid";

                return {
                  key: session._id,
                  patientId: session.patientId,
                  canPrint: canPrintDialysisReceipt(session),
                  sessionId: session.sessionId ?? "-",
                  patientName: session.patient?.name ?? "-",
                  dialysisSessionSource: session.dialysisSessionSource,
                  meta: [
                    formatAgeForListing(
                      session.patient?.age,
                      session.patient?.months,
                      session.patient?.days
                    ),
                    session.patient?.gender || "",
                  ]
                    .filter(Boolean)
                    .join(", "),
                  phone: session.patient?.phone ?? "-",
                  date: formatDialysisSessionDate(session, "DD MMM YYYY") || "-",
                  time: session.sessionDate?.trim()
                    ? ""
                    : session.createdAt
                      ? dayjs(session.createdAt).format("hh:mm A")
                      : "",
                  totalAmount,
                  paymentStatus,
                  status: session.status ?? "-",
                };
              })}
              Selection={false}
              searchText=""
              total={dialysisTotal}
              currentPage={dialysisPage}
              pageSize={dialysisLimit}
              onPaginationChange={handlePaginationChange}
            />
          )}
        </div>

        {showPrintReceipt && receiptData && (
          <PrintReceipt
            receiptData={receiptData}
            onClose={() => {
              setShowPrintReceipt(false);
              setReceiptData(null);
            }}
          />
        )}
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

export default DialysisComponent;
