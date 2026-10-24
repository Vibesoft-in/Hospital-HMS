"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import ImageWithBasePath from "@/core/imageWithBasePath";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Datatable from "@/core/common/dataTable";
import SearchInput from "@/core/common/dataTable/dataTableSearch";
import { all_routes } from "@/routes/all_routes";
import axios from "axios";
import { API_BASE_URL } from "@/environment";
import dayjs from "dayjs";
import { DatePicker } from "antd";
import Select, { components, type OptionProps } from "react-select";
import CommonSelect, { type Option } from "@/core/common/common-select/commonSelect";
import { formatAgeForListing } from "@/core/common/formatAgeForListing";
import { formatInstantInIST, todayISODateInIST } from "@/core/utils/dayjsIST";
import { closeFilterDropdown } from "@/core/common/filter/filterDropdownUtils";
import { useFilterDropdownSync } from "@/core/common/filter/useFilterDropdownSync";
import DOMPurify from "isomorphic-dompurify";

interface IDoctor {
  _id: string;
  name: string;
  designation?: string;
}

interface IDaycareDoctor {
  _id: string;
  name: string;
  department?: string;
  designation?: string;
}

interface IDaycareProcedure {
  procedureId: string;
  procedureName?: string;
  price?: number;
}

interface IDaycarePatient {
  _id: string;
  name?: string;
  age?: number;
  months?: number;
  days?: number;
  gender?: string;
}

interface IDaycareAppointment {
  _id: string;
  daycareId: string;
  patientId: string;
  doctorId: string;
  daycareChargesType?: string;
  daycareChargesTotal?: number;
  bedChargesType?: string;
  bedChargesTotal?: number;
  procedures?: IDaycareProcedure[];
  procedureChargesTotal?: number;
  doctorVisitCharges?: boolean;
  doctorChargesAmount?: number;
  subtotal?: number;
  discount?: number;
  totalPrice?: number;
  appointmentDate?: string;
  status?: string;
  createdAt?: string;
  paymentStatus?: string;
  amountPaid?: number;
  doctor?: IDaycareDoctor;
  patient?: IDaycarePatient;
}

interface IProcedureCategoryItem {
  category?: string;
  name?: string;
  value?: string;
  label?: string;
}

interface IDaycarePagination {
  total?: number;
  totalCount?: number;
}

interface IDaycareAppointmentsResponseData {
  appointments?: IDaycareAppointment[];
  pagination?: IDaycarePagination;
  total?: number;
  count?: number;
}

interface IRow {
  id: string;
  _doctorId?: string;
  _patientId?: string;
  Daycare_ID: string;
  Date: string;
  Time?: string;
  Patient: string;
  Age?: string;
  Gender?: string;
  Doctor: string;
  DoctorDesignation?: string;
  Department: string;
  DepartmentName?: string;
  Procedures: string[];
  Total: number;
  Status: string;
  Payment_Status: string;
}

const getAxiosMessage = (err: unknown, fallback: string) => {
  if (!axios.isAxiosError(err)) return fallback;
  const data = err.response?.data as { message?: unknown } | undefined;
  return typeof data?.message === "string" ? data.message : fallback;
};

const ProcedureFilterOption = (props: OptionProps<Option, true>) => {
  const { data, isSelected } = props;
  return (
    <components.Option {...props}>
      <div className="d-flex align-items-center justify-content-between gap-2 w-100">
        <span>{data?.label ?? "—"}</span>
        {isSelected ? (
          <i className="ti ti-check fs-14 flex-shrink-0" aria-hidden />
        ) : (
          <span className="flex-shrink-0" style={{ width: 14 }} aria-hidden />
        )}
      </div>
    </components.Option>
  );
};

const DaycareAppointmentsComponent = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"all" | "today">("today");
  const [rows, setRows] = useState<IRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [searchText, setSearchText] = useState<string>("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [daycareDeleteTarget, setDaycareDeleteTarget] = useState<{
    id: string;
    label: string;
  } | null>(null);
  const [daycareDeleteLoading, setDaycareDeleteLoading] = useState(false);

  const [doctors, setDoctors] = useState<IDoctor[]>([]);
  const [filterDoctorId, setFilterDoctorId] = useState<string>("");
  const [filterProcedureCategory, setFilterProcedureCategory] = useState<string>("");
  const [filterProcedureIds, setFilterProcedureIds] = useState<Option[]>([]);
  const [filterDate, setFilterDate] = useState<dayjs.Dayjs | null>(null);
  const [filterStartDate, setFilterStartDate] = useState<dayjs.Dayjs | null>(null);
  const [filterEndDate, setFilterEndDate] = useState<dayjs.Dayjs | null>(null);
  const [procedureCategories, setProcedureCategories] = useState<string[]>([]);
  const [procedureCategoriesLoading, setProcedureCategoriesLoading] = useState(false);
  const [procedureOptions, setProcedureOptions] = useState<Option[]>([]);
  const [proceduresLoading, setProceduresLoading] = useState(false);
  const procedureSearchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [appliedDoctorId, setAppliedDoctorId] = useState<string>("");
  const [appliedProcedureCategory, setAppliedProcedureCategory] = useState<string>("");
  const [appliedProcedureIds, setAppliedProcedureIds] = useState<Option[]>([]);
  const [appliedDate, setAppliedDate] = useState<string | null>(null);
  const [appliedStartDate, setAppliedStartDate] = useState<string | null>(null);
  const [appliedEndDate, setAppliedEndDate] = useState<string | null>(null);

  const getDaycareQueryParams = useCallback(
    (includePagination: boolean): Record<string, string | number> => {
      const params: Record<string, string | number> = {};
      if (includePagination) {
        params.page = page;
        params.limit = limit;
      }
      if (appliedDoctorId) {
        params.doctorId = appliedDoctorId;
      }
      if (appliedProcedureCategory) {
        params.procedureCategory = appliedProcedureCategory;
      }
      const procedureIdValues = appliedProcedureIds
        .map((opt) => opt?.value)
        .filter((id): id is string => Boolean(id));
      if (procedureIdValues.length > 0) {
        params.procedureIds = procedureIdValues.join(",");
      }
      if (activeTab === "today") {
        params.date = todayISODateInIST();
      } else {
        const hasRange = Boolean(appliedStartDate && appliedEndDate);
        if (hasRange) {
          params.startDate = appliedStartDate ?? "";
          params.endDate = appliedEndDate ?? "";
        } else if (appliedDate) {
          params.date = appliedDate;
        }
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
      appliedProcedureCategory,
      appliedProcedureIds,
      appliedDate,
      appliedStartDate,
      appliedEndDate,
    ]
  );

  const handleExportDaycare = async () => {
    if (!API_BASE_URL) return;
    setExporting(true);
    try {
      const params = getDaycareQueryParams(false);
      const response = await axios.get(`${API_BASE_URL}/hospital/daycare-appointments/export`, {
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
        `daycare-appointments-export-${dayjs().format("YYYY-MM-DD-HHmm")}.xlsx`;
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

  const fetchDaycareAppointments = useCallback(async () => {
      if (!API_BASE_URL) return;
      try {
        setLoading(true);
        setError("");
        const params = getDaycareQueryParams(true);
        const res = await axios.get(`${API_BASE_URL}/hospital/daycare-appointments`, { params });
        if (res.data?.code === 200 && res.data?.data) {
          const raw = res.data.data as IDaycareAppointment[] | IDaycareAppointmentsResponseData;
          const list: IDaycareAppointment[] = Array.isArray(raw)
            ? raw
            : Array.isArray(raw.appointments)
            ? raw.appointments
            : [];

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
            const dateStr = item.appointmentDate
              ? dayjs(item.appointmentDate).format("DD MMM YYYY")
              : "";
            const timeStr = formatInstantInIST(item.createdAt, "hh:mm A");
            const doctorName = item.doctor?.name ?? "";
            const doctorDesignation = item.doctor?.designation ?? "";
            const dept = item.daycareChargesType || item.bedChargesType || "";
            const deptName = item.doctor?.department || "";
            const patientName = item.patient?.name ?? "";
            const age = formatAgeForListing(
              item.patient?.age,
              item.patient?.months,
              item.patient?.days
            );
            const gender = item.patient?.gender;
            const proceduresList =
              item.procedures && item.procedures.length
                ? item.procedures.map((p) => p.procedureName || "").filter(Boolean)
                : [];

            return {
              id: item._id,
              _doctorId: item.doctor?._id || item.doctorId,
              _patientId: item.patient?._id || item.patientId,
              Daycare_ID: item.daycareId,
              Date: dateStr,
              Time: timeStr,
              Patient: patientName,
              Age: age,
              Gender: gender,
              Doctor: doctorName,
              DoctorDesignation: doctorDesignation,
              Department: dept,
              DepartmentName: deptName,
              Procedures: proceduresList,
              Total: item.totalPrice ?? 0,
              Status: item.status || "",
              Payment_Status: item.paymentStatus || "",
            };
          });
          setRows(mapped);
        } else {
          setRows([]);
          setTotalCount(0);
          setError(res.data?.message || "Failed to load daycare appointments.");
        }
      } catch (err: unknown) {
        setRows([]);
        setTotalCount(0);
        setError(getAxiosMessage(err, "Failed to load daycare appointments."));
      } finally {
        setLoading(false);
      }
  }, [getDaycareQueryParams]);

  const handleConfirmDeleteDaycare = async () => {
    const targetId = daycareDeleteTarget?.id;
    if (!targetId || !API_BASE_URL) return;
    setDaycareDeleteLoading(true);
    try {
      const res = await axios.delete(
        `${API_BASE_URL}/hospital/daycare-appointments/${targetId}`
      );
      if (res.data?.code === 200 || res.status === 200 || res.status === 204) {
        setDaycareDeleteTarget(null);
        await fetchDaycareAppointments();
      } else {
        alert(res.data?.message ?? "Failed to delete daycare appointment.");
      }
    } catch (err: unknown) {
      console.error("Delete daycare appointment:", err);
      alert(getAxiosMessage(err, "Failed to delete daycare appointment."));
    } finally {
      setDaycareDeleteLoading(false);
    }
  };

  useEffect(() => {
    fetchDaycareAppointments();
  }, [fetchDaycareAppointments]);

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

  useEffect(() => {
    if (!API_BASE_URL) return;
    setProcedureCategoriesLoading(true);
    axios
      .get(`${API_BASE_URL}/hospital/procedures/categories`)
      .then((res) => {
        const rawCategories = res.data?.data?.categories ?? res.data?.data ?? [];
        const list = Array.isArray(rawCategories) ? rawCategories : [];
        const categoryNames = list
          .map((item: string | IProcedureCategoryItem) => {
            if (typeof item === "string") return item;
            return item?.category ?? item?.name ?? item?.value ?? item?.label ?? "";
          })
          .map((category: string) => category.trim())
          .filter(Boolean);
        setProcedureCategories([...new Set(categoryNames)]);
      })
      .catch(() => {
        setProcedureCategories([]);
      })
      .finally(() => {
        setProcedureCategoriesLoading(false);
      });
  }, []);

  const fetchDaycareProcedures = useCallback(async (search = "") => {
    if (!API_BASE_URL) return;
    try {
      setProceduresLoading(true);
      const res = await axios.get(`${API_BASE_URL}/hospital/procedures`, {
        params: { search: search || undefined, type: "daycare,both" },
      });
      if (res.data?.code === 200 && Array.isArray(res.data?.data?.procedures)) {
        const list = res.data.data.procedures as Array<{
          _id: string;
          procedureName?: string;
        }>;
        setProcedureOptions(
          list.map((p) => ({
            value: p._id,
            label: p.procedureName ?? "—",
          }))
        );
      } else {
        setProcedureOptions([]);
      }
    } catch {
      setProcedureOptions([]);
    } finally {
      setProceduresLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDaycareProcedures();
    return () => {
      if (procedureSearchDebounceRef.current) {
        clearTimeout(procedureSearchDebounceRef.current);
        procedureSearchDebounceRef.current = null;
      }
    };
  }, [fetchDaycareProcedures]);

  const handleProcedureInputChange = useCallback(
    (value: string) => {
      if (procedureSearchDebounceRef.current) {
        clearTimeout(procedureSearchDebounceRef.current);
        procedureSearchDebounceRef.current = null;
      }
      procedureSearchDebounceRef.current = setTimeout(() => {
        void fetchDaycareProcedures(value);
      }, 300);
    },
    [fetchDaycareProcedures]
  );

  const doctorOptions: Option[] = useMemo(
    () => [{ value: "", label: "All" }, ...doctors.map((d) => ({ value: d._id, label: d.name }))],
    [doctors]
  );

  const procedureCategoryOptions: Option[] = useMemo(
    () => [
      { value: "", label: "All" },
      ...procedureCategories.map((category) => ({ value: category, label: category })),
    ],
    [procedureCategories]
  );

  const procedureSelectOptions = useMemo(() => {
    const byValue = new Map<string, Option>();
    procedureOptions.forEach((opt) => {
      if (opt?.value) byValue.set(opt.value, opt);
    });
    filterProcedureIds.forEach((opt) => {
      if (opt?.value && !byValue.has(opt.value)) byValue.set(opt.value, opt);
    });
    return Array.from(byValue.values());
  }, [procedureOptions, filterProcedureIds]);

  const syncFiltersFromApplied = useCallback(() => {
    setFilterDoctorId(appliedDoctorId);
    setFilterProcedureCategory(appliedProcedureCategory);
    setFilterProcedureIds(appliedProcedureIds);
    setFilterDate(appliedDate ? dayjs(appliedDate) : null);
    setFilterStartDate(appliedStartDate ? dayjs(appliedStartDate) : null);
    setFilterEndDate(appliedEndDate ? dayjs(appliedEndDate) : null);
  }, [
    appliedDoctorId,
    appliedProcedureCategory,
    appliedProcedureIds,
    appliedDate,
    appliedStartDate,
    appliedEndDate,
  ]);

  useFilterDropdownSync("daycare-filter-dropdown", syncFiltersFromApplied);

  const handleApplyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setAppliedDoctorId(filterDoctorId);
    setAppliedProcedureCategory(filterProcedureCategory);
    setAppliedProcedureIds(filterProcedureIds);
    const hasRange = filterStartDate && filterEndDate;
    if (hasRange) {
      setAppliedStartDate(filterStartDate.format("YYYY-MM-DD"));
      setAppliedEndDate(filterEndDate.format("YYYY-MM-DD"));
      setAppliedDate(null);
    } else {
      setAppliedStartDate(null);
      setAppliedEndDate(null);
      setAppliedDate(filterDate ? filterDate.format("YYYY-MM-DD") : null);
    }
    closeFilterDropdown("daycare-filter-dropdown");
  };

  const handleClearFilter = () => {
    setPage(1);
    setFilterDoctorId("");
    setFilterProcedureCategory("");
    setFilterProcedureIds([]);
    setFilterDate(null);
    setFilterStartDate(null);
    setFilterEndDate(null);
    setAppliedDoctorId("");
    setAppliedProcedureCategory("");
    setAppliedProcedureIds([]);
    setAppliedDate(null);
    setAppliedStartDate(null);
    setAppliedEndDate(null);
    closeFilterDropdown("daycare-filter-dropdown");
  };

  const columns = [
    {
      title: "Daycare ID",
      dataIndex: "Daycare_ID",
      sorter: false,
      showSorterTooltip: false,
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
      title: "Procedures",
      dataIndex: "Procedures",
      sorter: false,
      showSorterTooltip: false,
      render: (_: unknown, record: IRow) => {
        const procedures = record.Procedures ?? [];
        if (!procedures.length) return "-";
        return (
          <div className="d-flex flex-column gap-1 text-dark">
            {procedures.map((name, idx) => (
              <span key={`${name}-${idx}`} className="fs-13">
                {name}
              </span>
            ))}
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
      render: (_: unknown, record: IRow) => (
        <div className="d-flex align-items-center gap-2">
          <Link
            className="text-primary"
            href={`${all_routes.editDaycareAppointment}/${record.id}`}
            onClick={(e) => e.stopPropagation()}
          >
            <i className="ti ti-edit fs-16" />
          </Link>
          <button
            type="button"
            className="btn btn-link text-danger p-0 border-0"
            onClick={(e) => {
              e.stopPropagation();
              setDaycareDeleteTarget({
                id: String(record.id ?? ""),
                label: String(record.Daycare_ID ?? record.id ?? ""),
              });
            }}
            title="Delete daycare appointment"
            aria-label="Delete daycare appointment"
          >
            <i className="ti ti-trash fs-16" />
          </button>
        </div>
      ),
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
    router.push(`${all_routes.daycareAppointmentDetails}/${record.id}`);
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
              <h4 className="fw-bold mb-0">Daycare Appointments</h4>
            </div>
            <div className="text-end d-flex align-items-center flex-wrap justify-content-end gap-2">
              <button
                type="button"
                className="btn btn-outline-primary fs-13 btn-md"
                onClick={() => void handleExportDaycare()}
                disabled={exporting || !API_BASE_URL}
                aria-busy={exporting}
              >
                <i className="ti ti-download me-1" aria-hidden />
                {exporting ? "Exporting…" : "Export"}
              </button>
              <Link
                href={`${all_routes.newAppointment}?tab=daycare`}
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
                    id="daycare-filter-dropdown"
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
                          <label className="form-label mb-1">Category</label>
                          <CommonSelect
                            options={procedureCategoryOptions}
                            value={
                              procedureCategoryOptions.find(
                                (o) => o.value === filterProcedureCategory
                              ) ?? null
                            }
                            onChange={(opt) => setFilterProcedureCategory(opt?.value ?? "")}
                            placeholder="All"
                            className="w-100"
                            isLoading={procedureCategoriesLoading}
                          />
                        </div>
                        <div className="mb-3">
                          <label className="form-label mb-1">Procedures</label>
                          <div
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Select
                              isMulti
                              closeMenuOnSelect={false}
                              blurInputOnSelect={false}
                              hideSelectedOptions={false}
                              options={procedureSelectOptions}
                              value={filterProcedureIds}
                              onChange={(selected) =>
                                setFilterProcedureIds((selected as Option[] | null) ?? [])
                              }
                              onInputChange={(value, actionMeta) => {
                                if (actionMeta.action !== "input-change") return;
                                handleProcedureInputChange(value);
                              }}
                              onMenuOpen={() => {
                                if (!procedureOptions.length) void fetchDaycareProcedures();
                              }}
                              isLoading={proceduresLoading}
                              placeholder="Select procedures"
                              classNamePrefix="react-select"
                              className="select w-100"
                              instanceId="daycare-filter-procedures-select"
                              components={{ Option: ProcedureFilterOption }}
                              menuPortalTarget={typeof window !== "undefined" ? document.body : null}
                              menuPosition="fixed"
                              styles={{
                                menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                                menu: (base) => ({ ...base, zIndex: 9999 }),
                                option: (base, state) => ({
                                  ...base,
                                  backgroundColor:
                                    state.isSelected || state.isFocused ? "#2e37a4" : "white",
                                  color: state.isSelected || state.isFocused ? "#ffffff" : "#333",
                                  cursor: "pointer",
                                  ":active": {
                                    ...base[":active"],
                                    backgroundColor: "#2e37a4",
                                    color: "#ffffff",
                                  },
                                }),
                              }}
                            />
                          </div>
                        </div>
                        <div className="mb-3">
                          <label className="form-label mb-1">Date (appointment)</label>
                          <DatePicker
                            className="w-100"
                            format="DD-MM-YYYY"
                            placeholder="Single day"
                            value={filterDate}
                            onChange={(d) => {
                              setFilterDate(d);
                              if (d) {
                                setFilterStartDate(null);
                                setFilterEndDate(null);
                              }
                            }}
                            getPopupContainer={(node) => node?.parentElement ?? document.body}
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
                                onChange={(d) => {
                                  setFilterStartDate(d);
                                  if (d) setFilterDate(null);
                                }}
                                getPopupContainer={(node) => node?.parentElement ?? document.body}
                              />
                            </div>
                            <div className="col-6">
                              <DatePicker
                                className="w-100"
                                format="DD-MM-YYYY"
                                placeholder="End"
                                value={filterEndDate}
                                onChange={(d) => {
                                  setFilterEndDate(d);
                                  if (d) setFilterDate(null);
                                }}
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
              <p className="text-muted mb-0">Loading daycare appointments…</p>
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

      {daycareDeleteTarget ? (
        <div
          className="modal fade show d-block"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete_daycare_modal_title"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setDaycareDeleteTarget(null);
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
                <h5 id="delete_daycare_modal_title" className="fw-bold mb-1">
                  Delete this daycare appointment?
                </h5>
                <p className="mb-3 text-muted small">
                  Daycare ID: {daycareDeleteTarget.label}. This action cannot be undone.
                </p>
                <div className="d-flex justify-content-center flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-light"
                    onClick={() => setDaycareDeleteTarget(null)}
                    disabled={daycareDeleteLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => void handleConfirmDeleteDaycare()}
                    disabled={daycareDeleteLoading}
                  >
                    {daycareDeleteLoading ? "Deleting…" : "Delete"}
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

export default DaycareAppointmentsComponent;

