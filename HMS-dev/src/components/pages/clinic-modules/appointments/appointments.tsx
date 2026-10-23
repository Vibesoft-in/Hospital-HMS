"use client";

import ImageWithBasePath from "@/core/imageWithBasePath";
import { all_routes } from "../../../../routes/all_routes";
import { useState, useEffect, useMemo, useCallback } from "react";
import SearchInput from "@/core/common/dataTable/dataTableSearch";
import Datatable from "@/core/common/dataTable";
import Modals from "./modals/modals";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PrintPrescription from "./printPrescription";
import axios from "axios";
import { API_BASE_URL } from "@/environment";
import dayjs from "dayjs";
import { formatAgeForListing } from "@/core/common/formatAgeForListing";
import { DatePicker } from "antd";
import CommonSelect, { Option } from "@/core/common/common-select/commonSelect";
import { Visit_Type } from "@/core/common/selectOption";
import { openThermalTokenPrint } from "@/core/utils/thermalTokenPrint";
import { formatTokenWithVisitPrefix } from "@/core/utils/tokenPrefix";
import { closeFilterDropdown } from "@/core/common/filter/filterDropdownUtils";
import { useFilterDropdownSync } from "@/core/common/filter/useFilterDropdownSync";

const APPOINTMENT_STATUS_OPTIONS: Option[] = [
  { value: "", label: "All" },
  { value: "Scheduled", label: "Scheduled" },
  { value: "In Progress", label: "In Progress" },
  { value: "Completed", label: "Completed" },
  { value: "Cancelled", label: "Cancelled" },
];

interface IVisit {
  _id: string;
  visitId: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  visitType: string;
  appointmentType: string;
  reason?: string;
  visitDate: string;
  visitTime: string;
  sessionSlot: string;
  tokenNumber: number;
  price: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface IPatient {
  _id: string;
  name: string;
  phone: string;
  organisationName?: string;
  companyName?: string;
  age?: number;
  months?: number;
  days?: number;
  gender?: string;
  dob?: string;
  mrd?: string;
}

interface IDoctor {
  _id: string;
  name: string;
  designation?: string;
}

interface ITransformedAppointment {
  id: string;
  Case_ID: string;
  Token_No: number;
  Date_Time: string;
  Patient: string;
  Phone: string;
  Doctor: string;
  role: string;
  Visit: string;
  Appointment_Type: string;
  Status: string;
  Price: number;
  Age?: string;
  Sex?: string;
  MRD_No?: string;
  createdAt?: string;
  [key: string]: any;
}

const AppointmentsComponent = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"all" | "today">("today");
  const [data, setData] = useState<ITransformedAppointment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [selectedAppointment, setSelectedAppointment] = useState<ITransformedAppointment | null>(null);
  const [selectedAppointmentDetails, setSelectedAppointmentDetails] = useState<any>(null);
  const [showPrint, setShowPrint] = useState(false);

  const handlePrint = (record: any) => {
    setSelectedAppointment(record);
    setShowPrint(true);
  };

  const handlePrintClose = () => {
    setShowPrint(false);
    setSelectedAppointment(null);
  };

  const handleThermalTokenPrint = (record: any) => {
    openThermalTokenPrint({
      caseId: String(record.Case_ID ?? ""),
      tokenNo: record.Token_No ?? "—",
      visitType: String(record.Visit ?? ""),
      patientName: String(record.Patient ?? ""),
      appointmentDateTime: String(record.Date_Time ?? ""),
      doctorName: String(record.Doctor ?? ""),
    });
  };

  const [statusUpdates, setStatusUpdates] = useState<Record<string, string>>({});
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);

  // Filter state (form)
  const [doctors, setDoctors] = useState<IDoctor[]>([]);
  const [filterDoctorId, setFilterDoctorId] = useState<string>("");
  const [filterVisitType, setFilterVisitType] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterDate, setFilterDate] = useState<dayjs.Dayjs | null>(null);
  const [createdDateFrom, setCreatedDateFrom] = useState<dayjs.Dayjs | null>(null);
  const [createdDateTo, setCreatedDateTo] = useState<dayjs.Dayjs | null>(null);
  // Applied filters (when user clicks Filter) - sent to server
  const [appliedDoctorId, setAppliedDoctorId] = useState<string>("");
  const [appliedVisitType, setAppliedVisitType] = useState<string>("");
  const [appliedStatus, setAppliedStatus] = useState<string>("");
  const [appliedDate, setAppliedDate] = useState<string | null>(null);
  const [appliedCreatedFrom, setAppliedCreatedFrom] = useState<string | null>(null);
  const [appliedCreatedTo, setAppliedCreatedTo] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [searchText, setSearchText] = useState<string>("");
  const [exporting, setExporting] = useState(false);
  const [visitDeleteTarget, setVisitDeleteTarget] = useState<{
    id: string;
    label: string;
  } | null>(null);
  const [visitDeleteLoading, setVisitDeleteLoading] = useState(false);

  /** Same filter/query shape as GET /hospital/visits; omit pagination for export. */
  const getVisitsQueryParams = useCallback(
    (includePagination: boolean): Record<string, string | number> => {
      const params: Record<string, string | number> = {};
      if (includePagination) {
        params.page = page;
        params.limit = limit;
      }
      if (appliedStatus) params.status = appliedStatus;
      if (appliedVisitType) params.visitType = appliedVisitType;
      if (appliedDoctorId) params.doctorId = appliedDoctorId;
      const effectiveDate = activeTab === "today" ? dayjs().format("YYYY-MM-DD") : appliedDate;
      if (effectiveDate) params.date = effectiveDate;
      if (appliedCreatedFrom) params.createdFrom = appliedCreatedFrom;
      if (appliedCreatedTo) params.createdTo = appliedCreatedTo;
      const trimmedSearch = searchText.trim();
      if (trimmedSearch) params.search = trimmedSearch;
      return params;
    },
    [
      page,
      limit,
      activeTab,
      appliedStatus,
      appliedVisitType,
      appliedDoctorId,
      appliedDate,
      appliedCreatedFrom,
      appliedCreatedTo,
      searchText,
    ]
  );

  const handleExportVisits = async () => {
    if (!API_BASE_URL) return;
    setExporting(true);
    try {
      const params = getVisitsQueryParams(false);
      const response = await axios.get(`${API_BASE_URL}/hospital/visits/export`, {
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
        `visits-export-${dayjs().format("YYYY-MM-DD-HHmm")}.xlsx`;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: Blob; status?: number } };
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

  const handleStatusChange = async (record: ITransformedAppointment, newStatus: string) => {
    const visitId = record.id;
    if (!visitId || !API_BASE_URL) return;

    setStatusUpdatingId(visitId);
    try {
      const response = await axios.patch(
        `${API_BASE_URL}/hospital/visits/${visitId}`,
        { status: newStatus }
      );
      if (response.data?.code === 200 || response.status >= 200) {
        setStatusUpdates((prev) => ({
          ...prev,
          [visitId]: newStatus,
        }));
        // Refresh list without full-page loader
        fetchAppointments(false);
      } else {
        console.error("Failed to update status:", response.data);
        alert("Failed to update status. Please try again.");
      }
    } catch (err: any) {
      console.error("Error updating visit status:", err);
      alert(err.response?.data?.message || "Failed to update status. Please try again.");
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const getStatusForRecord = (record: any) => {
    return statusUpdates[record.id] || record.Status;
  };

  const handleTabChange = (tab: "all" | "today") => {
    setActiveTab(tab);
    setPage(1);
  };

  const handlePaginationChange = (newPage: number, newPageSize: number) => {
    setPage(newPage);
    setLimit(newPageSize);
  };

  useEffect(() => {
    fetchAppointments();
  }, [
    activeTab,
    appliedDoctorId,
    appliedVisitType,
    appliedStatus,
    appliedDate,
    appliedCreatedFrom,
    appliedCreatedTo,
    page,
    limit,
    searchText,
  ]);

  useEffect(() => {
    if (!API_BASE_URL) return;
    axios.get(`${API_BASE_URL}/hospital/doctors`, { params: { limit: 100 } }).then((res) => {
      if (res.data?.code === 200 && res.data?.data?.doctors) {
        setDoctors(res.data.data.doctors);
      }
    }).catch(() => {});
  }, []);

  const doctorOptions: Option[] = useMemo(
    () => [{ value: "", label: "All" }, ...doctors.map((d) => ({ value: d._id, label: d.name }))],
    [doctors]
  );
  const visitTypeOptions: Option[] = useMemo(
    () => [{ value: "", label: "All" }, ...Visit_Type.filter((v) => v.value !== "Select").map((v) => ({ value: v.value, label: v.label }))],
    []
  );

  const syncFiltersFromApplied = useCallback(() => {
    setFilterDoctorId(appliedDoctorId);
    setFilterVisitType(appliedVisitType);
    setFilterStatus(appliedStatus);
    setFilterDate(appliedDate ? dayjs(appliedDate) : null);
    setCreatedDateFrom(appliedCreatedFrom ? dayjs(appliedCreatedFrom) : null);
    setCreatedDateTo(appliedCreatedTo ? dayjs(appliedCreatedTo) : null);
  }, [
    appliedDoctorId,
    appliedVisitType,
    appliedStatus,
    appliedDate,
    appliedCreatedFrom,
    appliedCreatedTo,
  ]);

  useFilterDropdownSync("filter-dropdown", syncFiltersFromApplied);

  const handleApplyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setAppliedDoctorId(filterDoctorId);
    setAppliedVisitType(filterVisitType);
    setAppliedStatus(filterStatus);
    setAppliedDate(filterDate ? filterDate.format("YYYY-MM-DD") : null);
    setAppliedCreatedFrom(createdDateFrom ? createdDateFrom.format("YYYY-MM-DD") : null);
    setAppliedCreatedTo(createdDateTo ? createdDateTo.format("YYYY-MM-DD") : null);
    closeFilterDropdown("filter-dropdown");
  };

  const handleClearFilter = () => {
    setPage(1);
    setFilterDoctorId("");
    setFilterVisitType("");
    setFilterStatus("");
    setFilterDate(null);
    setCreatedDateFrom(null);
    setCreatedDateTo(null);
    setAppliedDoctorId("");
    setAppliedVisitType("");
    setAppliedStatus("");
    setAppliedDate(null);
    setAppliedCreatedFrom(null);
    setAppliedCreatedTo(null);
    closeFilterDropdown("filter-dropdown");
  };

  const fetchAppointments = async (showLoader: boolean = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      }
      setError("");
      
      if (!API_BASE_URL) {
        console.error("API_BASE_URL is undefined. Check .env.local file.");
        setError("API configuration error");
        return;
      }

      const params = getVisitsQueryParams(true);

      const response = await axios.get(`${API_BASE_URL}/hospital/visits`, {
        params,
      });

      if (response.data?.code === 200 && response.data?.data?.visits) {
        const visits: IVisit[] = response.data.data.visits;
        const pagination = response.data?.data?.pagination;
        if (pagination && typeof pagination === "object") {
          const { currentPage: p = 1, limit: l = 10, count = visits.length, hasMore = false, totalCount: apiTotal } = pagination;
          setTotalCount(typeof apiTotal === "number" ? apiTotal : (hasMore ? p * l + 1 : (p - 1) * l + count));
        } else {
          const total = response.data?.data?.total ?? response.data?.data?.count;
          setTotalCount(typeof total === "number" ? total : visits.length);
        }

        // Build row data using embedded patient & doctor info
        const transformedData = await Promise.all(
          visits.map(async (visit) => {
            const embeddedPatient = (visit as any).patient as
              | {
                  _id?: string;
                  name?: string;
                  title?: string;
                  phone?: string;
                  organisationName?: string;
                  organisation_name?: string;
                  companyName?: string;
                  age?: number;
                  months?: number;
                  days?: number;
                  gender?: string;
                  dob?: string;
                  mrd?: string;
                }
              | undefined;

            const patient: IPatient | null = embeddedPatient
              ? {
                  _id: embeddedPatient._id || visit.patientId,
                  name: embeddedPatient.name || "",
                  phone: embeddedPatient.phone || "",
                  organisationName:
                    embeddedPatient.organisationName ||
                    embeddedPatient.organisation_name ||
                    "",
                  companyName: embeddedPatient.companyName?.trim()
                    ? embeddedPatient.companyName.trim()
                    : undefined,
                  age: embeddedPatient.age,
                  months: embeddedPatient.months,
                  days: embeddedPatient.days,
                  gender: embeddedPatient.gender,
                  dob: embeddedPatient.dob,
                  mrd: embeddedPatient.mrd,
                }
              : null;

            const embeddedDoctor = (visit as any).doctor as
              | {
                  _id?: string;
                  name?: string;
                  department?: string;
                  designation?: string;
                }
              | undefined;

            const doctor: IDoctor | null = embeddedDoctor
              ? {
                  _id: embeddedDoctor._id || visit.doctorId,
                  name: embeddedDoctor.name || "",
                  designation: embeddedDoctor.designation,
                }
              : null;
            const doctorDepartment = embeddedDoctor?.department || "";

            const visitDate = visit.visitDate ? dayjs(visit.visitDate).format("DD MMM YYYY") : "";
            const visitTime = visit.visitTime || "";
            const dateTime = visitDate && visitTime ? `${visitDate} - ${visitTime}` : visitDate || visitTime;

            const ageDisplay = formatAgeForListing(
              patient?.age,
              patient?.months,
              patient?.days
            );
            const companyLabel =
              patient?.companyName?.trim() || patient?.organisationName?.trim() || "";

            return {
              id: visit._id,
              Case_ID: visit.visitId || visit._id,
              Token_No: visit.tokenNumber || 0,
              Date_Time: dateTime,
              Patient: [embeddedPatient?.title, patient?.name].filter(Boolean).join(" ") || "Unknown Patient",
              Phone: patient?.phone || "",
              Organisation_name: patient?.organisationName || "",
              _companyLabel: companyLabel,
              Doctor: doctor?.name || "Unknown Doctor",
              role: doctor?.designation || "",
              _department: doctorDepartment,
              _visitDate: visitDate,
              _visitTime: visitTime,
              Visit: visit.visitType || "",
              Appointment_Type: visit.appointmentType || "",
              Status: visit.status || "Scheduled",
              Price: visit.price || 0,
              _discount: (visit as { discount?: number }).discount ?? 0,
              PaymentStatus: (visit as any).paymentStatus || "Unpaid",
              Age: ageDisplay,
              Sex: patient?.gender,
              MRD_No: patient?.mrd,
              _visitId: visit.visitId,
              _appointmentId: visit.appointmentId,
              _patientId: visit.patientId,
              _doctorId: visit.doctorId,
              _reason: visit.reason,
              _sessionSlot: visit.sessionSlot,
              createdAt: visit.createdAt,
            } as ITransformedAppointment;
          })
        );

        setData(transformedData);
      } else {
        setError("Failed to fetch appointments");
        console.error("Failed to fetch appointments:", response.data);
      }
    } catch (error: any) {
      console.error("Error fetching appointments:", error);
      setError(error.response?.data?.message || "An error occurred while fetching appointments");
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  };

  const handleConfirmDeleteVisit = async () => {
    const targetId = visitDeleteTarget?.id;
    if (!targetId || !API_BASE_URL) return;
    setVisitDeleteLoading(true);
    try {
      const res = await axios.delete(`${API_BASE_URL}/hospital/visits/${targetId}`);
      if (res.data?.code === 200 || res.status === 200 || res.status === 204) {
        setVisitDeleteTarget(null);
        await fetchAppointments(false);
      } else {
        alert(res.data?.message ?? "Failed to delete appointment.");
      }
    } catch (err: any) {
      console.error("Delete visit:", err);
      alert(err?.response?.data?.message ?? "Failed to delete appointment.");
    } finally {
      setVisitDeleteLoading(false);
    }
  };

  const columns = [
    {
      title: "Case ID",
      dataIndex: "Case_ID",
      sorter: false,
      showSorterTooltip: false,
      render: (text: string, record: any) => (
        <div>
          <div className="text-dark mb-1">{text}</div>
          <span className="fs-13 badge badge-soft-primary text-primary rounded fw-medium">
            Token No: {formatTokenWithVisitPrefix(record.Token_No, record.Visit)}
          </span>
        </div>
      ),
    },
    {
      title: "Appointment date",
      dataIndex: "Date_Time",
      sorter: false,
      showSorterTooltip: false,
      render: (text: string) => {
        const parts = text.split(" - ");
        const date = parts[0] || "";
        const time = parts[1] || "";
        return (
          <div>
            <div className="text-dark">{date}</div>
            <div className="text-dark fs-13">{time}</div>
          </div>
        );
      },
    },
    {
      title: "Patient",
      dataIndex: "Patient",
      sorter: false,
      showSorterTooltip: false,
      render: (text: any, record: any) => {
        const ageStr = record.Age ?? "";
        const g = typeof record.Sex === "string" ? record.Sex.trim() : "";
        const ageGenderLine =
          ageStr && g ? `${ageStr}, ${g}` : ageStr ? ageStr : g || "";
        const company = typeof record._companyLabel === "string" ? record._companyLabel.trim() : "";
        return (
          <div className="text-dark">
            <Link
              href={`${all_routes.patientDetails}?id=${record._patientId || ""}`}
              className="text-dark fw-semibold d-inline-block"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!record?._patientId) return;
                router.push(`${all_routes.patientDetails}?id=${record._patientId}`);
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div>{text}</div>
              {record.Phone ? (
                <span className="text-body fs-13 fw-normal d-block">{record.Phone}</span>
              ) : null}
            </Link>
            {ageGenderLine ? (
              <div className="fs-13 text-muted">{ageGenderLine}</div>
            ) : null}
            {company ? (
              <div className="mt-1">
                <span className="badge badge-soft-secondary border border-secondary text-secondary fs-12 fw-medium px-2 py-1 rounded-2">
                  {company}
                </span>
              </div>
            ) : null}
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
      render: (text: any, record: any) => (
        <div style={{ minWidth: 0, maxWidth: "100%", lineHeight: 1.3 }}>
          <span className="fw-semibold text-dark fs-14" style={{ wordBreak: "break-word" }}>
            {text || "—"}
          </span>
          {record.role ? (
            <p className="mb-0 mt-1 fs-13 text-muted" style={{ wordBreak: "break-word" }}>
              {record.role}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      title: "Visit",
      dataIndex: "Visit",
      sorter: false,
      showSorterTooltip: false,
      width: 120,
      render: (text: any, record: any) => {
        const visitValue = record?.Visit || "New";
        const isEmergencyVisit = String(visitValue).toLowerCase() === "emergency";
        return (
          <div style={{ maxWidth: 110, whiteSpace: "normal", wordBreak: "break-word", lineHeight: 1.25 }}>
            {isEmergencyVisit ? (
              <span className="badge bg-danger text-white fw-medium">{visitValue}</span>
            ) : (
              <div className="text-dark">{visitValue}</div>
            )}
            <div className="text-body fs-13 fw-normal">{record.Appointment_Type || record.Mode || "OPD"}</div>
          </div>
        );
      },
    },
    {
      title: "Amount",
      dataIndex: "Price",
      sorter: false,
      showSorterTooltip: false,
      render: (text: number, record: any) => {
        const paymentStatus = record.PaymentStatus || "Unpaid";
        const isPaid = paymentStatus === "Paid";
        const amount = (record.Price ?? 0) - (record._discount ?? 0);
        return (
          <div className="d-flex align-items-center gap-2">
            <span className="fw-semibold text-dark">
              ₹{amount.toFixed(2)}
            </span>
            <span 
              className={`d-inline-flex align-items-center justify-content-center rounded-circle ${isPaid ? "bg-success" : "bg-warning"}`}
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
      dataIndex: "Status",
      sorter: false,
      showSorterTooltip: false,
      render: (text: string, record: any) => {
        const currentStatus = getStatusForRecord(record);
        const statusOptions = [
          "Scheduled",
          "In Progress",
          "Completed",
          "Cancelled",
          "No Show",
        ];

        const getStatusClass = (status: string) => {
          switch (status) {
            case "Scheduled":
              return "badge-soft-primary text-primary";
            case "In Progress":
              return "badge-soft-warning text-dark";
            case "Completed":
              return "badge-soft-success text-success";
            case "Cancelled":
              return "badge-soft-danger text-danger";
            case "No Show":
              return "badge-soft-secondary text-secondary";
            default:
              return "badge-soft-secondary text-secondary";
          }
        };

        const isUpdating = statusUpdatingId === record.id;

        return (
          <div className="dropdown" onClick={(e) => e.stopPropagation()}>
            <button
              className={`btn btn-sm fs-13 badge ${getStatusClass(currentStatus)} rounded fw-medium dropdown-toggle`}
              type="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
              disabled={isUpdating}
            >
              {isUpdating ? "Updating..." : currentStatus}
            </button>
            <ul className="dropdown-menu">
              {statusOptions.map((option) => (
                <li key={option}>
                  <Link
                    className="dropdown-item"
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (isUpdating) return;
                      handleStatusChange(record, option);
                      // Close dropdown by removing show classes
                      const dropdown = e.currentTarget.closest('.dropdown');
                      if (dropdown) {
                        const button = dropdown.querySelector('[data-bs-toggle="dropdown"]') as HTMLElement;
                        const menu = dropdown.querySelector('.dropdown-menu') as HTMLElement;
                        if (button && menu) {
                          button.setAttribute('aria-expanded', 'false');
                          button.classList.remove('show');
                          menu.classList.remove('show');
                        }
                      }
                    }}
                  >
                    {option}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        );
      },
    },
    {
      title: "",
      sorter: false,
      showSorterTooltip: false,
      render: (text: any, record: any) => (
        <div className="d-flex align-items-center gap-2">
          <Link
            className="text-primary"
            href={`${all_routes.editAppointment}/${record.id}`}
            onClick={(e) => e.stopPropagation()}
          >
            <i className="ti ti-edit fs-16" />
          </Link>
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
          <Link
            href="#"
            className="text-success"
            onClick={(e) => {
              e.stopPropagation();
              handlePrint(record);
            }}
            title="Download/Print Prescription"
          >
            <i className="ti ti-download fs-16" />
          </Link>
          <button
            type="button"
            className="btn btn-link text-danger p-0 border-0"
            onClick={(e) => {
              e.stopPropagation();
              setVisitDeleteTarget({
                id: String(record.id ?? ""),
                label: String(record.Case_ID ?? record.id ?? ""),
              });
            }}
            title="Delete visit"
            aria-label="Delete visit"
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

  const handleRowClick = async (record: any) => {
    // Navigate to appointment details page
    router.push(`${all_routes.appointmentDetails}/${record.id}`);
  };

  return (
    <>
      {/* Hidden buttons to trigger modals/offcanvas */}
      <button
        id="view_details_trigger"
        data-bs-toggle="offcanvas"
        data-bs-target="#view_details"
        style={{ display: 'none' }}
        aria-hidden="true"
      />
      {/* ========================
			Start Page Content
		========================= */}
      <div className="page-wrapper">
        {/* Start Content */}
        <div className="content">
          {/* Start Page Header */}
          <div className="d-flex align-items-sm-center flex-sm-row flex-column gap-2 pb-3 mb-3 border-1 border-bottom">
            <div className="flex-grow-1">
              <h4 className="fw-semibold mb-0"> Appointment </h4>
            </div>
            <div className="text-end d-flex align-items-center flex-wrap justify-content-end gap-2">
              <div className="bg-white border shadow-sm rounded px-1 pb-0 text-center d-flex align-items-center justify-content-center">
                <Link
                  href={all_routes.appointments}
                  className="bg-light rounded p-1 d-flex align-items-center justify-content-center"
                >
                  <i className="ti ti-list fs-14 text-dark" />
                </Link>
                <Link
                  href={all_routes.appointmentCalendar}
                  className="bg-white rounded p-1 d-flex align-items-center justify-content-center"
                >
                  <i className="ti ti-calendar-event fs-14 text-body" />
                </Link>
              </div>
              <button
                type="button"
                className="btn btn-outline-primary fs-13 btn-md"
                onClick={() => void handleExportVisits()}
                disabled={exporting || !API_BASE_URL}
                aria-busy={exporting}
              >
                <i className="ti ti-download me-1" aria-hidden />
                {exporting ? "Exporting…" : "Export"}
              </button>
              <Link
                href={all_routes.newAppointment}
                className="btn btn-primary fs-13 btn-md"
              >
                <i className="ti ti-plus me-1" /> New Appointment
              </Link>
            </div>
          </div>
          {/* End Page Header */}
          {/*  Tabs + Search + Filter row */}
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
            {/* Tabs */}
            <ul className="nav nav-tabs border-0 mb-0 flex-shrink-0">
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
            {/* Search + Filter */}
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
                  id="filter-dropdown"
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
                        <label className="form-label mb-1">Visit Type</label>
                        <CommonSelect
                          options={visitTypeOptions}
                          value={visitTypeOptions.find((o) => o.value === filterVisitType) ?? null}
                          onChange={(opt) => setFilterVisitType(opt?.value ?? "")}
                          placeholder="All"
                          className="w-100"
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label mb-1">Status</label>
                        <CommonSelect
                          options={APPOINTMENT_STATUS_OPTIONS}
                          value={APPOINTMENT_STATUS_OPTIONS.find((o) => o.value === filterStatus) ?? null}
                          onChange={(opt) => setFilterStatus(opt?.value ?? "")}
                          placeholder="All"
                          className="w-100"
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label mb-1">Date (Visit)</label>
                        <DatePicker
                          className="w-100"
                          format="DD-MM-YYYY"
                          placeholder="Select date"
                          value={filterDate}
                          onChange={(d) => setFilterDate(d)}
                          getPopupContainer={(node) => node?.parentElement ?? document.body}
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label mb-1">Created Date Range</label>
                        <div className="row g-2">
                          <div className="col-6">
                            <DatePicker
                              className="w-100"
                              format="DD-MM-YYYY"
                              placeholder="From"
                              value={createdDateFrom}
                              onChange={(d) => setCreatedDateFrom(d)}
                              getPopupContainer={(node) => node?.parentElement ?? document.body}
                            />
                          </div>
                          <div className="col-6">
                            <DatePicker
                              className="w-100"
                              format="DD-MM-YYYY"
                              placeholder="To"
                              value={createdDateTo}
                              onChange={(d) => setCreatedDateTo(d)}
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
          {/*  End Filter */}
          {/*  Start Table */}
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
                <p className="mt-2 text-muted">Loading appointments...</p>
              </div>
            ) : (
              <Datatable
                columns={columns}
                dataSource={data}
                Selection={false}
                searchText={searchText}
                onRowClick={handleRowClick}
                total={totalCount}
                currentPage={page}
                pageSize={limit}
                onPaginationChange={handlePaginationChange}
              />
            )}
          </div>
          {/*  End Table */}
        </div>
        {/* End Content */}
        {/* Footer Start */}
        <div className="footer text-center bg-white p-2 border-top">
          <p className="text-dark mb-0">
            2025 ©
            <Link href="#" className="link-primary">
              Preclinic
            </Link>
            , All Rights Reserved
          </p>
        </div>
        {/* Footer End */}
      </div>
      {/* ========================
			End Page Content
		========================= */}
      <Modals 
        appointment={selectedAppointmentDetails}
        appointmentRecord={selectedAppointment}
      />
      {showPrint && selectedAppointment && (
        <PrintPrescription
          appointmentData={selectedAppointment}
          onClose={handlePrintClose}
        />
      )}

      {visitDeleteTarget ? (
        <div
          className="modal fade show d-block"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete_visit_modal_title"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setVisitDeleteTarget(null);
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
                <h5 id="delete_visit_modal_title" className="fw-bold mb-1">
                  Delete this appointment?
                </h5>
                <p className="mb-3 text-muted small">
                  Case ID: {visitDeleteTarget.label}. This action cannot be undone.
                </p>
                <div className="d-flex justify-content-center flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-light"
                    onClick={() => setVisitDeleteTarget(null)}
                    disabled={visitDeleteLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => void handleConfirmDeleteVisit()}
                    disabled={visitDeleteLoading}
                  >
                    {visitDeleteLoading ? "Deleting…" : "Delete"}
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

export default AppointmentsComponent;
