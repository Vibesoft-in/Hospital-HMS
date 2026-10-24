"use client";

import { useEffect, useState, useCallback, useMemo, useRef, type ChangeEvent } from "react";
import ImageWithBasePath from "@/core/imageWithBasePath";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Datatable from "@/core/common/dataTable";
import SearchInput from "@/core/common/dataTable/dataTableSearch";
import { all_routes } from "@/routes/all_routes";
import { isAdminRole } from "@/core/auth/roleAccess";
import axios from "axios";
import { API_BASE_URL } from "@/environment";
import dayjs from "dayjs";
import { DatePicker, Tooltip } from "antd";
import CommonSelect, { type Option } from "@/core/common/common-select/commonSelect";
import { formatAgeForListing } from "@/core/common/formatAgeForListing";
import { formatInstantInIST, todayISODateInIST } from "@/core/utils/dayjsIST";
import {
  getDischargeTypeLabel,
  parseDischargeType,
  type TDischargeType,
} from "@/components/pages/clinic-modules/ipd-appointments/ipdDischargeSummaryTypes";
import { getIpdProcedureNamesForListing } from "@/components/pages/clinic-modules/ipd-appointments/ipdProcedureRows";
import { importMedicinesExcel } from "@/core/api/medicineApi";
import { closeFilterDropdown } from "@/core/common/filter/filterDropdownUtils";
import DOMPurify from "isomorphic-dompurify";
import { useFilterDropdownSync } from "@/core/common/filter/useFilterDropdownSync";

interface IDoctor {
  _id: string;
  name: string;
  designation?: string;
}

interface IIpdDoctor {
  _id: string;
  name: string;
  department?: string;
  designation?: string;
}

interface IIpdProcedure {
  procedureId: string;
  procedureName?: string;
  price?: number;
  isCompleted?: boolean;
}

interface IIpdPatient {
  _id: string;
  name?: string;
  age?: number;
  months?: number;
  days?: number;
  gender?: string;
}

interface IIpdBedCharge {
  wardId?: string;
  wardName?: string;
  chargePerDay?: number;
  fromDate?: string;
  toDate?: string;
  days?: number;
  totalCharge?: number;
}

interface IIpdAppointment {
  _id: string;
  ipdId?: string;
  ipdNumber?: string;
  patientId: string;
  doctorId: string;
  ipdChargesType?: string;
  ipdChargesTotal?: number;
  bedChargesType?: string;
  bedChargesTotal?: number;
  bedCharge?: IIpdBedCharge;
  admissionDays?: number;
  procedures?: IIpdProcedure[];
  billingCharges?: Array<{
    type?: string;
    procedureId?: string;
    procedureName?: string;
    price?: number;
    units?: number;
    isCompleted?: boolean;
  }>;
  procedureChargesTotal?: number;
  doctorVisitCharges?: boolean;
  doctorChargesAmount?: number;
  subtotal?: number;
  discount?: number;
  totalPrice?: number;
  appointmentDate?: string;
  admissionDate?: string;
  status?: string;
  isDischarge?: boolean;
  dischargeSummary?: { dischargeType?: string };
  createdAt?: string;
  paymentStatus?: string;
  amountPaid?: number;
  doctor?: IIpdDoctor;
  patient?: IIpdPatient;
}

interface IIpdPagination {
  total?: number;
  totalCount?: number;
}

interface IIpdAppointmentsResponseData {
  appointments?: IIpdAppointment[];
  ipds?: IIpdAppointment[];
  records?: IIpdAppointment[];
  pagination?: IIpdPagination;
  total?: number;
  count?: number;
}

const extractIpdListFromResponse = (
  data: IIpdAppointment[] | IIpdAppointmentsResponseData | undefined
): IIpdAppointment[] => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.ipds)) return data.ipds;
  if (Array.isArray(data.appointments)) return data.appointments;
  if (Array.isArray(data.records)) return data.records;
  return [];
};

interface IRow {
  id: string;
  _doctorId?: string;
  _patientId?: string;
  IPD_ID: string;
  Date: string;
  Time?: string;
  Patient: string;
  Age?: string;
  Gender?: string;
  Doctor: string;
  DoctorDesignation?: string;
  Department: string;
  DepartmentName?: string;
  Days?: number;
  Procedures: string[];
  FinalDiagnosis: string[];
  Total: number;
  Status: string;
  Payment_Status: string;
  IsDischarged: boolean;
  DischargeType?: TDischargeType;
  DischargeTypeLabel?: string;
}

const getAxiosMessage = (err: unknown, fallback: string) => {
  if (!axios.isAxiosError(err)) return fallback;
  const data = err.response?.data as { message?: unknown } | undefined;
  return typeof data?.message === "string" ? data.message : fallback;
};

const IpdAppointmentsComponent = () => {
  const router = useRouter();
  const isAdmin = useMemo(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("authUser") : null;
      if (!raw) return false;
      const parsed = JSON.parse(raw) as { role?: string } | null;
      return isAdminRole(parsed?.role);
    } catch {
      return false;
    }
  }, []);
  const [activeTab, setActiveTab] = useState<"all" | "today">("today");
  const [rows, setRows] = useState<IRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [searchText, setSearchText] = useState<string>("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [importingMedicines, setImportingMedicines] = useState(false);
  const medicinesImportInputRef = useRef<HTMLInputElement>(null);
  const [ipdDeleteTarget, setIPDDeleteTarget] = useState<{
    id: string;
    label: string;
  } | null>(null);
  const [ipdDeleteLoading, setIPDDeleteLoading] = useState(false);

  const [doctors, setDoctors] = useState<IDoctor[]>([]);
  const [filterDoctorId, setFilterDoctorId] = useState<string>("");
  const [filterStartDate, setFilterStartDate] = useState<dayjs.Dayjs | null>(null);
  const [filterEndDate, setFilterEndDate] = useState<dayjs.Dayjs | null>(null);

  const [appliedDoctorId, setAppliedDoctorId] = useState<string>("");
  const [appliedStartDate, setAppliedStartDate] = useState<string | null>(null);
  const [appliedEndDate, setAppliedEndDate] = useState<string | null>(null);

  const getIpdQueryParams = useCallback(
    (includePagination: boolean): Record<string, string | number> => {
      const params: Record<string, string | number> = {};
      if (includePagination) {
        params.page = page;
        params.limit = limit;
      }
      if (appliedDoctorId) {
        params.doctorId = appliedDoctorId;
      }
      if (activeTab === "today") {
        const today = todayISODateInIST();
        params.from = today;
        params.to = today;
      } else if (appliedStartDate && appliedEndDate) {
        params.from = appliedStartDate;
        params.to = appliedEndDate;
      }
      const trimmedSearch = searchText.trim();
      if (trimmedSearch) {
        params.search = trimmedSearch;
      }
      return params;
    },
    [
      activeTab,
      page,
      limit,
      searchText,
      appliedDoctorId,
      appliedStartDate,
      appliedEndDate,
    ]
  );

  const getIpdExportParams = useCallback((): Record<string, string> => {
    const params: Record<string, string> = {};
    if (appliedDoctorId) {
      params.doctorId = appliedDoctorId;
    }
    if (activeTab === "today") {
      const today = todayISODateInIST();
      params.from = today;
      params.to = today;
    } else if (appliedStartDate && appliedEndDate) {
      params.from = appliedStartDate;
      params.to = appliedEndDate;
    }
    return params;
  }, [activeTab, appliedDoctorId, appliedStartDate, appliedEndDate]);

  const handleExportIpd = async () => {
    if (!API_BASE_URL) return;
    setExporting(true);
    try {
      const params = getIpdExportParams();
      const response = await axios.get(`${API_BASE_URL}/hospital/ipd/export`, {
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
        `ipd-export-${dayjs().format("YYYY-MM-DD-HHmm")}.xlsx`;
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
      const data = ax.response?.data;
      if (data instanceof Blob) {
        try {
          const text = await data.text();
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

  const handleImportMedicinesClick = () => {
    medicinesImportInputRef.current?.click();
  };

  const handleMedicinesFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith(".xlsx") && !fileName.endsWith(".xls")) {
      alert("Please upload an Excel file (.xlsx or .xls).");
      return;
    }

    setImportingMedicines(true);
    try {
      const message = await importMedicinesExcel(file);
      alert(message);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to import medicines.");
    } finally {
      setImportingMedicines(false);
    }
  };

  const fetchIpdAppointments = async () => {
    if (!API_BASE_URL) return;
    try {
      setLoading(true);
      setError("");
      const params = getIpdQueryParams(true);
      const res = await axios.get(`${API_BASE_URL}/hospital/ipd`, { params });
      const ok = res.data?.code === 200 || (res.status >= 200 && res.status < 300);
      if (ok && res.data?.data != null) {
        const raw = res.data.data as IIpdAppointment[] | IIpdAppointmentsResponseData;
        const list = extractIpdListFromResponse(raw);

        const pagination = Array.isArray(raw) ? undefined : raw?.pagination;
        if (pagination && typeof pagination === "object") {
          const total =
            typeof pagination.total === "number"
              ? pagination.total
              : typeof pagination.totalCount === "number"
                ? pagination.totalCount
                : list.length;
          setTotalCount(total);
        } else {
          const fallbackTotal = Array.isArray(raw) ? undefined : raw?.total ?? raw?.count;
          setTotalCount(typeof fallbackTotal === "number" ? fallbackTotal : list.length);
        }

        if (!list.length) {
          setRows([]);
          setError("");
          return;
        }
        const mapped: IRow[] = list.map((item) => {
          const dateStr = (item.admissionDate ?? item.appointmentDate)
            ? dayjs(item.admissionDate ?? item.appointmentDate).format("DD MMM YYYY")
            : "";
          const timeStr = formatInstantInIST(item.createdAt, "hh:mm A");
          const doctorName = item.doctor?.name ?? "";
          const doctorDesignation = item.doctor?.designation ?? "";
          const dept = item.ipdChargesType || item.bedChargesType || "";
          const deptName = item.doctor?.department || "";
          const patientName = item.patient?.name ?? "";
          const age = formatAgeForListing(
            item.patient?.age,
            item.patient?.months,
            item.patient?.days
          );
          const gender = item.patient?.gender;
          const proceduresList = getIpdProcedureNamesForListing(item);
          const finalDiagnosisList = getIpdProcedureNamesForListing(item, { onlyCompleted: true });
          const dischargeType = parseDischargeType(item.dischargeSummary?.dischargeType);

          return {
            id: item._id,
            _doctorId: item.doctor?._id || item.doctorId,
            _patientId: item.patient?._id || item.patientId,
            IPD_ID: item.ipdId ?? item.ipdNumber ?? "",
            Date: dateStr,
            Time: timeStr,
            Patient: patientName,
            Age: age,
            Gender: gender,
            Doctor: doctorName,
            DoctorDesignation: doctorDesignation,
            Department: dept,
            DepartmentName: deptName,
            Days: item.admissionDays,
            Procedures: proceduresList,
            FinalDiagnosis: finalDiagnosisList,
            Total: item.totalPrice ?? 0,
            Status: item.status || "",
            Payment_Status: item.paymentStatus || "",
            IsDischarged: Boolean(item.isDischarge),
            DischargeType: dischargeType,
            DischargeTypeLabel: dischargeType ? getDischargeTypeLabel(dischargeType) : undefined,
          };
        });
        setRows(mapped);
      } else {
        setRows([]);
        setTotalCount(0);
        setError(res.data?.message || "Failed to load ipd appointments.");
      }
    } catch (err: unknown) {
      setRows([]);
      setTotalCount(0);
      setError(getAxiosMessage(err, "Failed to load ipd appointments."));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDeleteIpd = async () => {
    const targetId = ipdDeleteTarget?.id;
    if (!targetId || !API_BASE_URL) return;
    setIPDDeleteLoading(true);
    try {
      const res = await axios.delete(
        `${API_BASE_URL}/hospital/ipd/${targetId}`
      );
      if (res.data?.code === 200 || res.status === 200 || res.status === 204) {
        setIPDDeleteTarget(null);
        await fetchIpdAppointments();
      } else {
        alert(res.data?.message ?? "Failed to delete ipd appointment.");
      }
    } catch (err: unknown) {
      console.error("Delete ipd appointment:", err);
      alert(getAxiosMessage(err, "Failed to delete ipd appointment."));
    } finally {
      setIPDDeleteLoading(false);
    }
  };

  useEffect(() => {
    void fetchIpdAppointments();
  }, [
    activeTab,
    page,
    limit,
    searchText,
    appliedDoctorId,
    appliedStartDate,
    appliedEndDate,
  ]);

  useEffect(() => {
    if (!API_BASE_URL) return;
    axios
      .get(`${API_BASE_URL}/hospital/doctors`, { params: { limit: 100 } })
      .then((res) => {
        if (res.data?.code === 200 && res.data?.data?.doctors) {
          setDoctors(res.data.data.doctors);
        }
      })
      .catch(() => {});
  }, []);

  const doctorOptions: Option[] = useMemo(
    () => [{ value: "", label: "All" }, ...doctors.map((d) => ({ value: d._id, label: d.name }))],
    [doctors]
  );

  const syncFiltersFromApplied = useCallback(() => {
    setFilterDoctorId(appliedDoctorId);
    setFilterStartDate(appliedStartDate ? dayjs(appliedStartDate) : null);
    setFilterEndDate(appliedEndDate ? dayjs(appliedEndDate) : null);
  }, [appliedDoctorId, appliedStartDate, appliedEndDate]);

  useFilterDropdownSync("ipd-filter-dropdown", syncFiltersFromApplied);

  const handleApplyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setAppliedDoctorId(filterDoctorId);
    if (filterStartDate && filterEndDate) {
      setActiveTab("all");
      setAppliedStartDate(filterStartDate.format("YYYY-MM-DD"));
      setAppliedEndDate(filterEndDate.format("YYYY-MM-DD"));
    } else {
      setAppliedStartDate(null);
      setAppliedEndDate(null);
    }
    closeFilterDropdown("ipd-filter-dropdown");
  };

  const handleClearFilter = () => {
    setPage(1);
    setFilterDoctorId("");
    setFilterStartDate(null);
    setFilterEndDate(null);
    setAppliedDoctorId("");
    setAppliedStartDate(null);
    setAppliedEndDate(null);
    closeFilterDropdown("ipd-filter-dropdown");
  };

  const columns = [
    {
      title: "IPD ID",
      dataIndex: "IPD_ID",
      sorter: false,
      showSorterTooltip: false,
      width: 130,
      onCell: () => ({
        style: {
          whiteSpace: "normal",
          wordBreak: "break-word",
          verticalAlign: "top",
          maxWidth: 130,
        },
      }),
      render: (text: string, record: IRow) => (
        <div className="d-flex flex-column gap-1" style={{ maxWidth: 130 }}>
          <span className="text-dark fw-semibold">{text || "—"}</span>
          {record.IsDischarged ? (
            <div className="d-flex flex-wrap align-items-center gap-1">
              <span className="badge badge-soft-success border border-success fs-10 px-2 py-1 w-fit-content">
                Discharged
              </span>
              {record.DischargeType && record.DischargeType !== "Normal" ? (
                <span
                  className="badge badge-soft-info border border-info fs-10 px-2 py-1 w-fit-content"
                  title={record.DischargeTypeLabel}
                >
                  {record.DischargeType}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      ),
    },
    {
      title: "Date",
      dataIndex: "Date",
      sorter: false,
      showSorterTooltip: false,
      render: (text: string, record: IRow) => (
        <div className="text-dark">
          <div>{text}</div>
          {record.Time && <div className="fs-13 text-muted">{record.Time}</div>}
        </div>
      ),
    },
    {
      title: "Patient",
      dataIndex: "Patient",
      sorter: false,
      showSorterTooltip: false,
      render: (text: string, record: IRow) => {
        const meta = [record.Age != null ? `${record.Age}` : "", record.Gender || ""]
          .filter(Boolean)
          .join(", ");
        return (
          <div className="text-dark">
            {record._patientId ? (
              <Link
                href={`${all_routes.patientDetails}?id=${record._patientId}`}
                className="fw-semibold text-dark"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!record?._patientId) return;
                  router.push(`${all_routes.patientDetails}?id=${record._patientId}`);
                }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                {text}
              </Link>
            ) : (
              <div className="fw-semibold">{text}</div>
            )}
            {meta && <div className="fs-13 text-muted">{meta}</div>}
          </div>
        );
      },
    },
    {
      title: "Doctor",
      dataIndex: "Doctor",
      sorter: false,
      showSorterTooltip: false,
      ellipsis: false,
      minWidth: 132,
      onCell: () => ({
        style: {
          whiteSpace: "normal",
          wordBreak: "break-word",
          verticalAlign: "top",
        },
      }),
      render: (text: string, record: IRow) => (
        <div style={{ minWidth: 0, maxWidth: "100%", lineHeight: 1.3 }}>
          <span className="fw-semibold text-dark fs-14" style={{ wordBreak: "break-word" }}>
            {text || "—"}
          </span>
          {record.DoctorDesignation ? (
            <p className="mb-0 mt-1 fs-13 text-muted" style={{ wordBreak: "break-word" }}>
              {record.DoctorDesignation}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      title: "Department",
      dataIndex: "Department",
      sorter: false,
      showSorterTooltip: false,
      render: (text: string, record: IRow) => {
        const hasBedType = Boolean(text);
        const hasDeptName = Boolean(record.DepartmentName);
        if (!hasBedType && !hasDeptName) return "-";
        return (
          <div className="text-dark">
           {hasDeptName && (
              <div className="fs-15 mt-1">{record.DepartmentName}</div>
            )}
            {hasBedType && (
              <span className="badge badge-soft-primary border border-primary px-2 py-1 fs-12 me-1">
                {text}
              </span>
            )}
           
          </div>
        );
      },
    },
    {
      title: "Days Of Admission",
      dataIndex: "Days",
      sorter: false,
      showSorterTooltip: false,
      render: (value: number | undefined) => (
        <span className="text-dark fw-medium">
          {value != null ? value : "—"}
        </span>
      ),
    },
    {
      title: "Provisional Diagnosis",
      dataIndex: "Procedures",
      sorter: false,
      showSorterTooltip: false,
      render: (_: unknown, record: IRow) => {
        const procedures = record.Procedures ?? [];
        if (!procedures.length) return "—";
        const [first, ...rest] = procedures;
        const moreCount = rest.length;
        return (
          <div className="d-flex flex-column align-items-start gap-1 text-dark">
            <span className="fs-13">{first}</span>
            {moreCount > 0 ? (
              <Tooltip
                placement="bottomLeft"
                color="#ffffff"
                styles={{
                  body: {
                    color: "#212529",
                    boxShadow: "0 4px 14px rgba(0, 0, 0, 0.1)",
                    border: "1px solid #e9ecef",
                    padding: "8px 12px",
                  },
                }}
                title={
                  <ul className="mb-0 ps-3 text-start text-dark">
                    {rest.map((name, idx) => (
                      <li key={`${name}-${idx}`}>{name}</li>
                    ))}
                  </ul>
                }
              >
                <span
                  className="badge badge-soft-secondary border border-secondary fs-12 fw-medium px-2 py-1"
                  style={{ cursor: "default" }}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  +{moreCount} more
                </span>
              </Tooltip>
            ) : null}
          </div>
        );
      },
    },
    {
      title: "Final Diagnosis",
      dataIndex: "FinalDiagnosis",
      sorter: false,
      showSorterTooltip: false,
      render: (_: unknown, record: IRow) => {
        const procedures = record.FinalDiagnosis ?? [];
        if (!procedures.length) return "—";
        const [first, ...rest] = procedures;
        const moreCount = rest.length;
        return (
          <div className="d-flex flex-column align-items-start gap-1 text-dark">
            <span className="fs-13">{first}</span>
            {moreCount > 0 ? (
              <Tooltip
                placement="bottomLeft"
                color="#ffffff"
                styles={{
                  body: {
                    color: "#212529",
                    boxShadow: "0 4px 14px rgba(0, 0, 0, 0.1)",
                    border: "1px solid #e9ecef",
                    padding: "8px 12px",
                  },
                }}
                title={
                  <ul className="mb-0 ps-3 text-start text-dark">
                    {rest.map((name, idx) => (
                      <li key={`${name}-${idx}`}>{name}</li>
                    ))}
                  </ul>
                }
              >
                <span
                  className="badge badge-soft-primary border border-primary fs-12 fw-medium px-2 py-1"
                  style={{ cursor: "default" }}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  +{moreCount} more
                </span>
              </Tooltip>
            ) : null}
          </div>
        );
      },
    },
    {
      title: "Total",
      dataIndex: "Total",
      sorter: false,
      showSorterTooltip: false,
      render: (value: number, record: IRow) => {
        const paymentStatus = record.Payment_Status || "Unpaid";
        const isPaid = paymentStatus === "Paid";
        return (
          <div className="d-flex align-items-center gap-2">
            <span className="fw-semibold text-dark">₹{(value ?? 0).toFixed(2)}</span>
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
      title: "",
      sorter: false,
      showSorterTooltip: false,
      render: (_: unknown, record: IRow) => {
        const isLocked = record.IsDischarged;
        return (
          <div className="d-flex align-items-center gap-2">
            <Link
              className={isLocked ? "text-muted pe-none" : "text-primary"}
              href={isLocked ? "#" : `${all_routes.editIpdAppointment}/${record.id}`}
              onClick={(e) => {
                e.stopPropagation();
                if (isLocked) e.preventDefault();
              }}
              aria-disabled={isLocked}
              title={isLocked ? "Edit disabled for discharged IPD" : "Edit ipd appointment"}
            >
              <i className="ti ti-edit fs-16" />
            </Link>
            {isAdmin ? (
              <button
                type="button"
                className={`btn btn-link p-0 border-0 ${isLocked ? "text-muted" : "text-danger"}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isLocked) return;
                  setIPDDeleteTarget({
                    id: String(record.id ?? ""),
                    label: String(record.IPD_ID ?? record.id ?? ""),
                  });
                }}
                title={isLocked ? "Delete disabled for discharged IPD" : "Delete ipd appointment"}
                aria-label={isLocked ? "Delete disabled for discharged IPD" : "Delete ipd appointment"}
                disabled={isLocked}
              >
                <i className="ti ti-trash fs-16" />
              </button>
            ) : null}
          </div>
        );
      },
    },
  ];

  const handleSearch = (value: string) => {
    setSearchText(value);
    setPage(1);
  };

  const handleTabChange = (tab: "all" | "today") => {
    setActiveTab(tab);
    setPage(1);
  };

  const handlePaginationChange = (newPage: number, newPageSize: number) => {
    setPage(newPage);
    setLimit(newPageSize);
  };

  const handleRowClick = (record: IRow) => {
    if (!record?.id) return;
    router.push(`${all_routes.ipdAppointmentDetails}/${record.id}`);
  };

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: DOMPurify.sanitize(`
          .datatable .ant-table-tbody > tr > td {
            color: #000 !important;
          }
          .datatable .ant-table-thead > tr > th {
            color: #000 !important;
          }
        `),
        }}
      />
      <div className="page-wrapper">
        <div className="content">
          <div className="d-flex align-items-sm-center flex-sm-row flex-column gap-2 pb-3 mb-3 border-bottom">
            <div className="flex-grow-1">
              <h4 className="fw-bold mb-0">IPD Appointments</h4>
            </div>
            <div className="text-end d-flex align-items-center flex-wrap justify-content-end gap-2">
              <input
                ref={medicinesImportInputRef}
                type="file"
                accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                className="d-none"
                onChange={(e) => void handleMedicinesFileChange(e)}
                aria-hidden
                tabIndex={-1}
              />
              <button
                type="button"
                className="btn btn-outline-primary fs-13 btn-md"
                onClick={handleImportMedicinesClick}
                disabled={importingMedicines || !API_BASE_URL}
                aria-busy={importingMedicines}
              >
                <i className="ti ti-upload me-1" aria-hidden />
                {importingMedicines ? "Importing…" : "Import Medicines"}
              </button>
              <button
                type="button"
                className="btn btn-outline-primary fs-13 btn-md"
                onClick={() => void handleExportIpd()}
                disabled={exporting || !API_BASE_URL}
                aria-busy={exporting}
              >
                <i className="ti ti-download me-1" aria-hidden />
                {exporting ? "Exporting…" : "Export"}
              </button>
              <Link
                href={`${all_routes.newAppointment}?tab=ipd`}
                className="btn btn-primary fs-13 btn-md"
              >
                <i className="ti ti-plus me-1" />
                New Appointment
              </Link>
            </div>
          </div>

          {error && (
            <div className="alert alert-danger mb-3" role="alert">
              {error}
            </div>
          )}

          <div className="d-flex align-items-center justify-content-between flex-wrap row-gap-3">
            <ul className="nav nav-tabs border-0 mb-3 flex-shrink-0">
              <li className="nav-item">
                <button
                  type="button"
                  className={`nav-link${activeTab === "all" ? " active" : ""}`}
                  onClick={() => handleTabChange("all")}
                >
                  All Appointments
                </button>
              </li>
              <li className="nav-item">
                <button
                  type="button"
                  className={`nav-link${activeTab === "today" ? " active" : ""}`}
                  onClick={() => handleTabChange("today")}
                >
                  Today&apos;s Appointments
                </button>
              </li>
            </ul>
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <div className="search-input">
                <SearchInput value={searchText} onChange={handleSearch} />
              </div>
              <div className="d-flex table-dropdown right-content align-items-center flex-wrap row-gap-3">
                <div className="dropdown me-2">
                  <Link
                    href="#"
                    className="bg-white border rounded btn btn-md text-dark fs-14 py-1 align-items-center d-flex fw-normal"
                    data-bs-toggle="dropdown"
                    data-bs-auto-close="false"
                  >
                    <i className="ti ti-filter text-gray-5 me-1" />
                    Filters
                  </Link>
                  <div
                    className="dropdown-menu dropdown-lg dropdown-menu-end filter-dropdown p-0"
                    id="ipd-filter-dropdown"
                  >
                    <div className="d-flex align-items-center justify-content-between border-bottom filter-header px-3 py-2">
                      <h4 className="mb-0 fw-bold">Filter</h4>
                      <button
                        type="button"
                        onClick={handleClearFilter}
                        className="btn btn-link link-danger text-decoration-underline p-0"
                      >
                        Clear All
                      </button>
                    </div>
                    <form onSubmit={handleApplyFilter}>
                      <div className="filter-body p-3">
                        <div className="mb-3">
                          <label className="form-label mb-1">Doctor</label>
                          <CommonSelect
                            options={doctorOptions}
                            value={doctorOptions.find((o) => o.value === filterDoctorId) ?? null}
                            onChange={(opt) => setFilterDoctorId(opt?.value ?? "")}
                            placeholder="All"
                            className="w-100"
                          />
                        </div>
                        <div className="mb-3">
                          <label className="form-label mb-1">Date range</label>
                          <div className="row g-2">
                            <div className="col-6">
                              <DatePicker
                                className="w-100"
                                format="DD-MM-YYYY"
                                placeholder="Start"
                                value={filterStartDate}
                                onChange={(d) => setFilterStartDate(d)}
                                getPopupContainer={(node) => node?.parentElement ?? document.body}
                              />
                            </div>
                            <div className="col-6">
                              <DatePicker
                                className="w-100"
                                format="DD-MM-YYYY"
                                placeholder="End"
                                value={filterEndDate}
                                onChange={(d) => setFilterEndDate(d)}
                                getPopupContainer={(node) => node?.parentElement ?? document.body}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="filter-footer d-flex align-items-center justify-content-end border-top p-2 gap-2">
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
          </div>

          <div className="table-responsive">
            {loading ? (
              <p className="text-muted mb-0">Loading ipd appointments…</p>
            ) : (
              <Datatable
                columns={columns}
                dataSource={rows}
                Selection={false}
                // Server-side search: Datatable must not client-filter the current page.
                searchText={""}
                onRowClick={handleRowClick}
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
            2025 ©
            <Link href="#" className="link-primary">
              Preclinic
            </Link>
            , All Rights Reserved
          </p>
        </div>
      </div>

      {ipdDeleteTarget ? (
        <div
          className="modal fade show d-block"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete_ipd_modal_title"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIPDDeleteTarget(null);
          }}
        >
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content">
              <div className="modal-body text-center position-relative z-1">
                <ImageWithBasePath
                  src="assets/img/bg/delete-modal-bg-01.png"
                  alt=""
                  className="img-fluid position-absolute top-0 start-0 z-n1"
                />
                <ImageWithBasePath
                  src="assets/img/bg/delete-modal-bg-02.png"
                  alt=""
                  className="img-fluid position-absolute bottom-0 end-0 z-n1"
                />
                <div className="mb-3">
                  <span className="avatar avatar-lg bg-danger text-white">
                    <i className="ti ti-trash fs-24" aria-hidden />
                  </span>
                </div>
                <h5 id="delete_ipd_modal_title" className="fw-bold mb-1">
                  Delete this IPD appointment?
                </h5>
                <p className="mb-3 text-muted small">
                  IPD ID: {ipdDeleteTarget.label}. This action cannot be undone.
                </p>
                <div className="d-flex justify-content-center flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-light"
                    onClick={() => setIPDDeleteTarget(null)}
                    disabled={ipdDeleteLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => void handleConfirmDeleteIpd()}
                    disabled={ipdDeleteLoading}
                  >
                    {ipdDeleteLoading ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default IpdAppointmentsComponent;

