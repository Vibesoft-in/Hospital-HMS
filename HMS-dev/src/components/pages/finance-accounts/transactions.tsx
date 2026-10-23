"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import SearchInput from "@/core/common/dataTable/dataTableSearch";
import Datatable from "@/core/common/dataTable";
import axios from "axios";
import { API_BASE_URL } from "@/environment";
import { DatePicker } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import CommonSelect, { type Option } from "@/core/common/common-select/commonSelect";
import { Department, Visit_Type } from "@/core/common/selectOption";
import { closeFilterDropdown } from "@/core/common/filter/filterDropdownUtils";
import { useFilterDropdownSync } from "@/core/common/filter/useFilterDropdownSync";

const TRANSACTION_PAYMENT_MODES = ["Cash", "UPI", "Card"] as const;

const SOURCE_TYPE_OPTIONS = [
  { value: "visit", label: "OPD" },
  { value: "daycareAppointment", label: "Daycare" },
  { value: "IPD", label: "IPD" },
] as const;

type SourceType = (typeof SOURCE_TYPE_OPTIONS)[number]["value"];

interface ITransaction {
  _id: string;
  transactionId: string;
  visitId: string;
  transactionType: string;
  amount: number;
  paymentMode: string;
  referenceNo: string;
  transactionDate: string;
  createdAt?: string;
  visitReadableId?: string;
  visitType?: string;
  appointmentType?: string;
  doctorName?: string;
  patientName?: string;
  patientPhone?: string;
}

interface ITableRow {
  id: string;
  TransactionID: string;
  VisitID: string;
  PatientName: string;
  PatientPhone: string;
  Date: string;
  Time: string;
  VisitType: string;
  AppointmentType: string;
  Doctor: string;
  PaymentMode: string;
  Amount: string;
}

interface IDoctor {
  _id: string;
  name: string;
}

const ALL_OPTION: Option = { value: "", label: "All" };

const TransactionsListComponent = () => {
  const [data, setData] = useState<ITableRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [totalCount, setTotalCount] = useState<number>(0);
  const [searchText, setSearchText] = useState<string>("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [exporting, setExporting] = useState(false);
  const [doctors, setDoctors] = useState<IDoctor[]>([]);

  const [filterDoctorId, setFilterDoctorId] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("");
  const [filterVisitType, setFilterVisitType] = useState("");
  const [filterSourceType, setFilterSourceType] = useState<string>("");
  const [filterPaymentMode, setFilterPaymentMode] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState<Dayjs | null>(null);
  const [filterDateTo, setFilterDateTo] = useState<Dayjs | null>(null);

  const [appliedDoctorId, setAppliedDoctorId] = useState("");
  const [appliedDepartment, setAppliedDepartment] = useState("");
  const [appliedVisitType, setAppliedVisitType] = useState("");
  const [appliedSourceType, setAppliedSourceType] = useState<string>("");
  const [appliedPaymentMode, setAppliedPaymentMode] = useState("");
  const [appliedDateFrom, setAppliedDateFrom] = useState<string | null>(null);
  const [appliedDateTo, setAppliedDateTo] = useState<string | null>(null);

  const doctorOptions: Option[] = useMemo(
    () => [ALL_OPTION, ...doctors.map((d) => ({ value: d._id, label: d.name }))],
    [doctors]
  );

  const departmentOptions: Option[] = useMemo(
    () => [ALL_OPTION, ...Department.map((d) => ({ value: d.value, label: d.label }))],
    []
  );

  const paymentOptions: Option[] = useMemo(
    () => [
      ALL_OPTION,
      ...TRANSACTION_PAYMENT_MODES.map((m) => ({ value: m, label: m })),
    ],
    []
  );

  const visitTypeOptions: Option[] = useMemo(
    () => [
      ALL_OPTION,
      ...Visit_Type.filter((v) => v.value !== "Select").map((v) => ({
        value: v.value,
        label: v.label,
      })),
    ],
    []
  );

  const sourceTypeOptions: Option[] = useMemo(
    () => [ALL_OPTION, ...SOURCE_TYPE_OPTIONS.map((v) => ({ value: v.value, label: v.label }))],
    []
  );

  const searchParams = useSearchParams();
  const sourceTypeParam = searchParams?.get("sourceType");

  useEffect(() => {
    const allowed = new Set<SourceType>(SOURCE_TYPE_OPTIONS.map((v) => v.value));
    const next =
      sourceTypeParam && allowed.has(sourceTypeParam as SourceType) ? sourceTypeParam : "";
    setFilterSourceType(next);
    setAppliedSourceType(next);
    setPage(1);
  }, [sourceTypeParam]);

  const getTransactionsQueryParams = useCallback(
    (includePagination: boolean): Record<string, string | number> => {
      const params: Record<string, string | number> = {};
      if (includePagination) {
        params.page = page;
        params.limit = limit;
      }
      const trimmed = searchText.trim();
      if (trimmed) params.search = trimmed;
      if (appliedDoctorId) params.doctorId = appliedDoctorId;
      if (appliedDepartment) params.department = appliedDepartment;
      if (appliedVisitType) params.visitType = appliedVisitType;
      if (appliedSourceType) params.sourceType = appliedSourceType;
      if (appliedPaymentMode) params.paymentMode = appliedPaymentMode;
      if (appliedDateFrom) params.dateFrom = appliedDateFrom;
      if (appliedDateTo) params.dateTo = appliedDateTo;
      return params;
    },
    [
      page,
      limit,
      searchText,
      appliedDoctorId,
      appliedDepartment,
      appliedVisitType,
      appliedSourceType,
      appliedPaymentMode,
      appliedDateFrom,
      appliedDateTo,
    ]
  );

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      if (!API_BASE_URL) {
        setError("API configuration error");
        setLoading(false);
        return;
      }
      const params = getTransactionsQueryParams(true);
      const response = await axios.get(`${API_BASE_URL}/hospital/transactions`, {
        params,
      });
      if (response.data?.code === 200 && response.data?.data?.transactions) {
        const transactions: ITransaction[] = response.data.data.transactions;
        const raw = response.data.data as Record<string, unknown>;
        const pagination = raw?.pagination as Record<string, number> | undefined;
        if (pagination && typeof pagination === "object") {
          const apiTotal =
            typeof pagination.totalCount === "number"
              ? pagination.totalCount
              : typeof pagination.total === "number"
                ? pagination.total
                : undefined;
          setTotalCount(
            typeof apiTotal === "number" ? apiTotal : (raw.count as number) ?? transactions.length
          );
        } else {
          setTotalCount(
            typeof raw.count === "number" ? (raw.count as number) : transactions.length
          );
        }
        const formatTime = (iso: string | undefined) => {
          if (!iso) return "";
          try {
            const d = new Date(iso);
            return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
          } catch {
            return "";
          }
        };
        const rows: ITableRow[] = transactions.map((t) => ({
          id: t._id,
          TransactionID: t.transactionId ?? "",
          VisitID: t.visitReadableId ? t.visitReadableId : "—",
          PatientName: t.patientName ?? "—",
          PatientPhone: t.patientPhone ?? "—",
          Date: t.transactionDate ?? "",
          Time: formatTime(t.createdAt),
          VisitType: t.visitType ?? "—",
          AppointmentType: t.appointmentType ?? "—",
          Doctor: t.doctorName ?? "—",
          PaymentMode: t.paymentMode ?? "",
          Amount: t.amount != null ? `₹${Number(t.amount).toLocaleString()}` : "—",
        }));
        setData(rows);
      } else {
        setError("Failed to load transactions");
        setData([]);
      }
    } catch (err: unknown) {
      console.error("Error fetching transactions:", err);
      const ax = err as { response?: { data?: { message?: string } } };
      setError(ax.response?.data?.message || "Failed to load transactions");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [getTransactionsQueryParams]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    if (!API_BASE_URL) return;
    axios
      .get(`${API_BASE_URL}/hospital/doctors`, { params: { limit: 100 } })
      .then((res) => {
        if (res.data?.code === 200 && res.data?.data?.doctors) {
          setDoctors(res.data.data.doctors as IDoctor[]);
        }
      })
      .catch(() => {});
  }, []);

  const handleExportTransactions = async () => {
    if (!API_BASE_URL) return;
    setExporting(true);
    try {
      const params = getTransactionsQueryParams(false);
      const response = await axios.get(`${API_BASE_URL}/hospital/transactions/export`, {
        params,
        responseType: "blob",
      });
      const blob = response.data as Blob;
      const contentType = String(response.headers["content-type"] ?? "");
      if (contentType.includes("application/json")) {
        const text = await blob.text();
        try {
          const parsed = JSON.parse(text) as { message?: string };
          alert(parsed?.message ?? "Export failed.");
        } catch {
          alert("Export failed.");
        }
        return;
      }
      const cd = response.headers["content-disposition"] as string | undefined;
      const match = cd?.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i) ?? cd?.match(/filename="([^"]+)"/i);
      const fromHeader = match?.[1]?.trim();
      const filename =
        (fromHeader ? decodeURIComponent(fromHeader) : null) ||
        `transactions-export-${dayjs().format("YYYY-MM-DD-HHmm")}.xlsx`;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: Blob } };
      const blobErr = ax.response?.data;
      if (blobErr instanceof Blob) {
        try {
          const text = await blobErr.text();
          const parsed = JSON.parse(text) as { message?: string };
          alert(parsed?.message ?? "Export failed.");
        } catch {
          alert("Export failed.");
        }
      } else {
        alert("Export failed. Please try again.");
      }
    } finally {
      setExporting(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchText(value);
    setPage(1);
  };

  const syncFiltersFromApplied = useCallback(() => {
    setFilterDoctorId(appliedDoctorId);
    setFilterDepartment(appliedDepartment);
    setFilterVisitType(appliedVisitType);
    setFilterSourceType(appliedSourceType);
    setFilterPaymentMode(appliedPaymentMode);
    setFilterDateFrom(appliedDateFrom ? dayjs(appliedDateFrom) : null);
    setFilterDateTo(appliedDateTo ? dayjs(appliedDateTo) : null);
  }, [
    appliedDoctorId,
    appliedDepartment,
    appliedVisitType,
    appliedSourceType,
    appliedPaymentMode,
    appliedDateFrom,
    appliedDateTo,
  ]);

  useFilterDropdownSync("filter-dropdown", syncFiltersFromApplied);

  const handleApplyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setAppliedDoctorId(filterDoctorId);
    setAppliedDepartment(filterDepartment);
    setAppliedVisitType(filterVisitType);
    setAppliedSourceType(filterSourceType);
    setAppliedPaymentMode(filterPaymentMode);
    setAppliedDateFrom(filterDateFrom ? filterDateFrom.format("YYYY-MM-DD") : null);
    setAppliedDateTo(filterDateTo ? filterDateTo.format("YYYY-MM-DD") : null);
    closeFilterDropdown("filter-dropdown");
  };

  const handleClearFilters = () => {
    setPage(1);
    setFilterDoctorId("");
    setFilterDepartment("");
    setFilterVisitType("");
    setFilterSourceType("");
    setFilterPaymentMode("");
    setFilterDateFrom(null);
    setFilterDateTo(null);
    setAppliedDoctorId("");
    setAppliedDepartment("");
    setAppliedVisitType("");
    setAppliedSourceType("");
    setAppliedPaymentMode("");
    setAppliedDateFrom(null);
    setAppliedDateTo(null);
    closeFilterDropdown("filter-dropdown");
  };

  const handlePaginationChange = (newPage: number, newPageSize: number) => {
    setPage(newPage);
    setLimit(newPageSize);
  };

  const getModalContainer = () => {
    const el = document.getElementById("filter-dropdown");
    return el ?? document.body;
  };

  const optionByValue = (options: Option[], value: string): Option =>
    options.find((o) => o.value === value) ?? ALL_OPTION;

  const columns = [
    {
      title: "Transaction ID",
      dataIndex: "TransactionID",
      render: (text: string) => (
        <span className="text-dark fw-semibold">{text}</span>
      ),
    },
    {
      title: "Case ID",
      dataIndex: "VisitID",
      render: (text: string) => <span className="text-dark">{text}</span>,
    },
    {
      title: "Patient",
      dataIndex: "PatientName",
      render: (_: string, record: ITableRow) => (
        <div>
          <div className="text-dark fw-medium">{record.PatientName}</div>
          <div className="text-dark fs-13">{record.PatientPhone}</div>
        </div>
      ),
    },
    {
      title: "Visit Type",
      dataIndex: "VisitType",
      render: (_: string, record: ITableRow) => (
        <div>
          <div className="text-dark">{record.VisitType}</div>
          <div className="text-dark fs-13">{record.AppointmentType}</div>
        </div>
      ),
    },
    {
      title: "Doctor",
      dataIndex: "Doctor",
      render: (text: string) => <span className="text-dark">{text}</span>,
    },
    {
      title: "Payment Mode",
      dataIndex: "PaymentMode",
      render: (text: string) => <span className="text-dark">{text}</span>,
    },
    {
      title: "Amount",
      dataIndex: "Amount",
      render: (text: string) => <span className="text-dark fw-medium">{text}</span>,
    },
    {
      title: "Date",
      dataIndex: "Date",
      render: (text: string, record: ITableRow) => (
        <div>
          <div className="text-dark">{text}</div>
          {record.Time && <div className="text-dark fs-13">{record.Time}</div>}
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="page-wrapper">
        <div className="content">
          <div className="d-flex align-items-sm-center flex-sm-row flex-column gap-2 pb-3 mb-3 border-1 border-bottom">
            <div className="flex-grow-1">
              <h4 className="fw-bold mb-0">
                Transactions{" "}
                <span className="badge badge-soft-primary fw-medium border py-1 px-2 border-primary fs-13 ms-1">
                  Total Transactions : {totalCount}
                </span>
              </h4>
            </div>
            <div className="text-end d-flex align-items-center flex-wrap justify-content-end gap-2">
              <button
                type="button"
                className="btn btn-outline-primary fs-13 btn-md"
                onClick={() => void handleExportTransactions()}
                disabled={exporting || !API_BASE_URL}
                aria-busy={exporting}
              >
                <i className="ti ti-download me-1" aria-hidden />
                {exporting ? "Exporting…" : "Export"}
              </button>
            </div>
          </div>

          <div className="d-flex align-items-center justify-content-between flex-wrap row-gap-3">
            <div className="d-flex align-items-center gap-2">
              <div className="search-set mb-3">
                <div className="d-flex align-items-center flex-wrap gap-2">
                  <div className="table-search d-flex align-items-center mb-0">
                    <div className="search-input">
                      <SearchInput value={searchText} onChange={handleSearch} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="d-flex table-dropdown mb-3 pb-1 right-content align-items-center flex-wrap row-gap-3">
              <div className="dropdown me-2">
                <button
                  type="button"
                  className="bg-white border rounded btn btn-md text-dark fs-14 py-1 align-items-center d-flex fw-normal"
                  data-bs-toggle="dropdown"
                  data-bs-auto-close="false"
                >
                  <i className="ti ti-filter text-gray-5 me-1" />
                  Filters
                </button>
                <div
                  className="dropdown-menu dropdown-lg dropdown-menu-end filter-dropdown p-0"
                  id="filter-dropdown"
                >
                  <div className="d-flex align-items-center justify-content-between border-bottom filter-header px-3 py-2">
                    <h4 className="mb-0 fw-bold">Filter</h4>
                    <button
                      type="button"
                      className="btn btn-link link-danger text-decoration-underline p-0"
                      onClick={handleClearFilters}
                    >
                      Clear All
                    </button>
                  </div>
                  <form onSubmit={handleApplyFilter}>
                    <div className="filter-body pb-0 px-3 pt-2">
                      <div className="mb-3">
                        <label className="form-label mb-1 text-dark fs-14 fw-medium">Doctor</label>
                        <CommonSelect
                          options={doctorOptions}
                          value={optionByValue(doctorOptions, filterDoctorId)}
                          onChange={(opt) => setFilterDoctorId(opt?.value ?? "")}
                          className="select"
                          placeholder="All"
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label mb-1 text-dark fs-14 fw-medium">Department</label>
                        <CommonSelect
                          options={departmentOptions}
                          value={optionByValue(departmentOptions, filterDepartment)}
                          onChange={(opt) => setFilterDepartment(opt?.value ?? "")}
                          className="select"
                          placeholder="All"
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label mb-1 text-dark fs-14 fw-medium">Payment mode</label>
                        <CommonSelect
                          options={paymentOptions}
                          value={optionByValue(paymentOptions, filterPaymentMode)}
                          onChange={(opt) => setFilterPaymentMode(opt?.value ?? "")}
                          className="select"
                          placeholder="All"
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label mb-1 text-dark fs-14 fw-medium">Visit Type</label>
                        <CommonSelect
                          options={visitTypeOptions}
                          value={optionByValue(visitTypeOptions, filterVisitType)}
                          onChange={(opt) => setFilterVisitType(opt?.value ?? "")}
                          className="select"
                          placeholder="All"
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label mb-1 text-dark fs-14 fw-medium">Appointment type</label>
                        <CommonSelect
                          options={sourceTypeOptions}
                          value={optionByValue(sourceTypeOptions, filterSourceType)}
                          onChange={(opt) => setFilterSourceType(opt?.value ?? "")}
                          className="select"
                          placeholder="All"
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label mb-1 text-dark fs-14 fw-medium">
                          Transaction date range
                        </label>
                        <div className="row g-2">
                          <div className="col-6">
                            <DatePicker
                              className="form-control datetimepicker w-100"
                              format={{ format: "DD-MM-YYYY", type: "mask" }}
                              getPopupContainer={getModalContainer}
                              placeholder="From"
                              suffixIcon={null}
                              value={filterDateFrom}
                              onChange={(d) => setFilterDateFrom(d)}
                              allowClear
                            />
                          </div>
                          <div className="col-6">
                            <DatePicker
                              className="form-control datetimepicker w-100"
                              format={{ format: "DD-MM-YYYY", type: "mask" }}
                              getPopupContainer={getModalContainer}
                              placeholder="To"
                              suffixIcon={null}
                              value={filterDateTo}
                              onChange={(d) => setFilterDateTo(d)}
                              allowClear
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="filter-footer d-flex align-items-center justify-content-end border-top px-3 py-2 gap-2">
                      <button type="button" className="btn btn-light btn-md fw-medium" data-filter-close>
                        Close
                      </button>
                      <button type="submit" className="btn btn-primary btn-md fw-medium">
                        Filter
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="alert alert-danger mb-3" role="alert">
              {error}
            </div>
          )}

          <div className="table-responsive">
            {loading ? (
              <div className="d-flex justify-content-center align-items-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
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
    </>
  );
};

export default TransactionsListComponent;
