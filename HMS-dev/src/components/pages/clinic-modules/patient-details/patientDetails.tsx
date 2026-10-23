"use client";


import { all_routes } from "../../../../routes/all_routes";
import { useState, useEffect, useRef, useCallback } from "react";
import Datatable from "@/core/common/dataTable";
import Modals from "./modals/modals";
import ConsentInitModal from "./ConsentInitModal";
// import GenerateLinkTokenModal from "./GenerateLinkTokenModal";
import UnlinkAbhaConfirmModal from "./UnlinkAbhaConfirmModal";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { API_BASE_URL, PATHLAB_PORTAL_BASE_URL } from "@/environment";
import dayjs from "dayjs";
import { formatInstantInIST } from "@/core/utils/dayjsIST";
import { formatDialysisSessionDate } from "@/components/pages/clinic-modules/dialysis/resolveDialysisSessionDate";
import { Marital_Status } from "@/core/common/selectOption";
import { getPatientMaritalStatus } from "@/core/utils/patientMaritalStatus";
import {
  getConsentStatus,
  getConsentStatusBadgeClass,
  type IConsentListItem,
} from "@/core/api/abdmConsentApi";
import { SHOW_ABHA_FEATURES } from "@/core/config/featureFlags";

interface IPathlabCase {
  _id: string;
  caseId: string;
  status?: string;
  createdAt?: string;
  totalAmount?: number;
  finalAmount?: number;
  amountStatus?: string;
}

interface IPatientTransaction {
  _id: string;
  transactionId: string;
  visitId?: string;
  transactionType: string;
  amount: number;
  paymentMode: string;
  referenceNo?: string;
  transactionDate: string;
  createdAt?: string;
  updatedAt?: string;
}

interface IAbhaSpecificDetails {
  dob?: string;
  gender?: string;
  address?: string;
  aadharNo?: string;
}

interface IPatient {
  _id: string;
  mrd: string;
  title: string;
  name: string;
  phone: string;
  email: string;
  age: number;
  months?: number;
  days?: number;
  gender: string;
  bloodGroup: string;
  address: string;
  aadharNo: string;
  aadharS3Url?: string;
  otherDocsS3Urls?: string[];
  maritalStatus?: string;
  occupation?: string;
  drugSensitivity?: string;
  ayushmanCardNo?: string;
  ayushmanCardS3Url?: string;
  imageS3Url?: string;
  emergencyContacts?: Array<{
    name: string;
    number: string;
  }>;
  dob?: string;
  createdAt?: string;
  updatedAt?: string;
  pathlabCases?: IPathlabCase[];
  isMRPatient?: boolean;
  companyName?: string;
  division?: string;
  abhaAddress?: string;
  abhaNumber?: string;
  abhaLinked?: boolean;
  allAbhaAddresses?: string[];
  abhaSpecificDetails?: IAbhaSpecificDetails;
}

const normalizeAllAbhaAddresses = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const addresses = value
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (item && typeof item === "object") {
        const obj = item as Record<string, unknown>;
        const address =
          (typeof obj.abhaAddress === "string" ? obj.abhaAddress : "") ||
          (typeof obj.address === "string" ? obj.address : "") ||
          (typeof obj.value === "string" ? obj.value : "");
        return address.trim();
      }
      return "";
    })
    .filter(Boolean);
  return [...new Set(addresses)];
};

interface IVisitDoctorEmbed {
  _id?: string;
  name?: string;
  designation?: string;
}

interface IVisit {
  _id: string;
  visitId: string;
  patientId: string;
  doctorId: string;
  visitType: string;
  appointmentType: string;
  visitDate: string;
  visitTime: string;
  sessionSlot: string;
  status: string;
  doctor?: IVisitDoctorEmbed;
}

interface IDoctor {
  _id: string;
  name: string;
  designation: string;
}

interface IAppointment {
  id: string;
  Case_ID: string;
  Date_Time: string;
  Doctor: string;
  role: string;
  Mode: string;
  Status: string;
}

interface IDialysisSession {
  _id: string;
  sessionId: string;
  patientId: string;
  status?: string;
  sessionDate?: string;
  createdAt?: string;
  updatedAt?: string;
  generalInformation?: {
    actualWeightLoss?: number;
    postHdWeightToday?: number;
  };
  vascularAccess?: {
    type?: string;
  };
}

interface IDialysisPaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface ITransactionsPaginationMeta {
  currentPage: number;
  limit: number;
  skip: number;
  count: number;
  totalCount: number;
  hasMore: boolean;
}

interface IPatientIpdDoctor {
  _id?: string;
  name?: string;
  designation?: string;
}

interface IPatientIpdRecord {
  _id: string;
  ipdId?: string;
  ipdNumber?: string;
  admissionDate?: string;
  appointmentDate?: string;
  status?: string;
  paymentStatus?: string;
  totalPrice?: number;
  isDischarge?: boolean;
  createdAt?: string;
  doctor?: IPatientIpdDoctor;
}

interface IPatientIpdRow {
  id: string;
  IPD_ID: string;
  Date: string;
  Time: string;
  Doctor: string;
  DoctorDesignation: string;
  Status: string;
  Payment_Status: string;
  Total: number;
  IsDischarged: boolean;
}

const extractPatientIpdsFromResponse = (
  data: IPatientIpdRecord[] | { ipds?: IPatientIpdRecord[]; appointments?: IPatientIpdRecord[]; records?: IPatientIpdRecord[] } | undefined
): IPatientIpdRecord[] => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.ipds)) return data.ipds;
  if (Array.isArray(data.appointments)) return data.appointments;
  if (Array.isArray(data.records)) return data.records;
  return [];
};

const PatientDetailsComponent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientId =
    searchParams.get("id")?.trim() ||
    searchParams.get("patientId")?.trim() ||
    null;
  const [patient, setPatient] = useState<IPatient | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [appointments, setAppointments] = useState<IAppointment[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState<boolean>(false);
  const [dialysisSessions, setDialysisSessions] = useState<IDialysisSession[]>([]);
  const [dialysisLoading, setDialysisLoading] = useState<boolean>(false);
  const [dialysisStatusUpdatingId, setDialysisStatusUpdatingId] = useState<string | null>(null);
  const [dialysisPagination, setDialysisPagination] = useState<IDialysisPaginationMeta>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [patientTransactions, setPatientTransactions] = useState<IPatientTransaction[]>([]);
  const [patientTransactionsLoading, setPatientTransactionsLoading] = useState<boolean>(false);
  const [transactionsPagination, setTransactionsPagination] = useState<ITransactionsPaginationMeta>({
    currentPage: 1,
    limit: 10,
    skip: 0,
    count: 0,
    totalCount: 0,
    hasMore: false,
  });
  const [patientIpds, setPatientIpds] = useState<IPatientIpdRow[]>([]);
  const [patientIpdsLoading, setPatientIpdsLoading] = useState<boolean>(false);

  type TabKey = "appointments" | "ipd" | "transactions" | "dialysis" | "pathlab-cases" | "consents";
  const [activeTab, setActiveTab] = useState<TabKey>("appointments");
  const fetchedTabsRef = useRef<Set<TabKey>>(new Set());
  // const [linkTokenModalOpen, setLinkTokenModalOpen] = useState(false);
  const [consentInitModalOpen, setConsentInitModalOpen] = useState(false);
  const [unlinkAbhaModalOpen, setUnlinkAbhaModalOpen] = useState(false);
  const [consentStatus, setConsentStatus] = useState<string | null>(null);
  const [consents, setConsents] = useState<IConsentListItem[]>([]);

  const showConsentsTab =
    SHOW_ABHA_FEATURES && (consents.length > 0 || Boolean(consentStatus?.trim()));

  useEffect(() => {
    if (patientId) {
      fetchedTabsRef.current = new Set();
      fetchPatientDetails();
      fetchAppointments();
      if (SHOW_ABHA_FEATURES) {
        fetchConsentStatus(patientId);
      }
      fetchedTabsRef.current.add("appointments");
    } else {
      setLoading(false);
      setPatient(null);
      setConsentStatus(null);
      setConsents([]);
    }
  }, [patientId]);

  useEffect(() => {
    if (!showConsentsTab && activeTab === "consents") {
      setActiveTab("appointments");
    }
  }, [showConsentsTab, activeTab]);

  const fetchConsentStatus = async (id: string) => {
    if (!id?.trim()) {
      setConsentStatus(null);
      setConsents([]);
      return;
    }
    try {
      const result = await getConsentStatus(id);
      setConsentStatus(result.status);
      setConsents(result.consents);
    } catch {
      setConsentStatus(null);
      setConsents([]);
    }
  };

  const handleTabChange = useCallback((tab: TabKey) => {
    setActiveTab(tab);
    if (!patientId || fetchedTabsRef.current.has(tab)) return;
    fetchedTabsRef.current.add(tab);

    switch (tab) {
      case "appointments":
        fetchAppointments();
        break;
      case "ipd":
        fetchPatientIpds();
        break;
      case "transactions":
        fetchPatientTransactions(1);
        break;
      case "dialysis":
        fetchDialysisSessions(1);
        break;
      case "pathlab-cases":
        break;
      case "consents":
        break;
    }
  }, [patientId]);

  const fetchPatientDetails = async () => {
    try {
      setLoading(true);
      if (!API_BASE_URL) {
        console.error("API_BASE_URL is undefined. Check .env.local file.");
        return;
      }

      const response = await axios.get(`${API_BASE_URL}/hospital/patients/${patientId}`);
      
      if (response.data?.code === 200 && response.data?.data?.patient) {
        const rawPatient = response.data.data.patient;
        setPatient({
          ...rawPatient,
          allAbhaAddresses: normalizeAllAbhaAddresses(rawPatient?.allAbhaAddresses),
        });
      } else {
        console.error("Failed to fetch patient details:", response.data);
      }
    } catch (error: any) {
      console.error("Error fetching patient details:", error);
      console.error("Error details:", error.response?.data);
    } finally {
      setLoading(false);
    }
  };

  const fetchDoctorsByIdMap = async (): Promise<Record<string, IDoctor>> => {
    if (!API_BASE_URL) return {};
    try {
      const res = await axios.get(`${API_BASE_URL}/hospital/doctors`, {
        params: { limit: 500 },
      });
      const list = res.data?.data?.doctors ?? res.data?.data ?? [];
      if (!Array.isArray(list)) return {};
      return list.reduce<Record<string, IDoctor>>((acc, d: { _id?: string; name?: string; designation?: string }) => {
        if (!d?._id) return acc;
        acc[d._id] = {
          _id: d._id,
          name: d.name ?? "",
          designation: d.designation ?? "",
        };
        return acc;
      }, {});
    } catch {
      return {};
    }
  };

  const resolveDoctorForVisit = (
    visit: IVisit,
    doctorsById: Record<string, IDoctor>
  ): IDoctor | null => {
    const embedded = visit.doctor;
    if (embedded?.name) {
      return {
        _id: embedded._id ?? visit.doctorId ?? "",
        name: embedded.name,
        designation: embedded.designation ?? "",
      };
    }
    const doctorId = visit.doctorId?.trim();
    if (doctorId && doctorsById[doctorId]) {
      return doctorsById[doctorId];
    }
    return null;
  };

  const fetchAppointments = async () => {
    try {
      if (!patientId || !API_BASE_URL) {
        return;
      }

      setAppointmentsLoading(true);
      const [visitsResponse, doctorsById] = await Promise.all([
        axios.get(`${API_BASE_URL}/hospital/visits/patient/${patientId}`),
        fetchDoctorsByIdMap(),
      ]);

      if (visitsResponse.data?.code === 200 && visitsResponse.data?.data?.visits) {
        const visits: IVisit[] = visitsResponse.data.data.visits;

        const transformedAppointments = visits.map((visit) => {
          const doctor = resolveDoctorForVisit(visit, doctorsById);
          const visitDate = visit.visitDate ? dayjs(visit.visitDate).format("DD MMM YYYY") : "";
          const visitTime = visit.visitTime || "";
          const dateTime = visitDate && visitTime ? `${visitDate} - ${visitTime}` : visitDate || visitTime;

          return {
            id: visit._id,
            Case_ID: visit.visitId || visit._id,
            Date_Time: dateTime,
            Doctor: doctor?.name || "Unknown Doctor",
            role: doctor?.designation || "",
            Mode: visit.appointmentType || "In-person",
            Status: visit.status || "Scheduled",
          } as IAppointment;
        });

        setAppointments(transformedAppointments);
      } else {
        setAppointments([]);
      }
    } catch (error: unknown) {
      console.error("Error fetching appointments:", error);
      setAppointments([]);
    } finally {
      setAppointmentsLoading(false);
    }
  };

  const fetchDialysisSessions = useCallback(async (page = 1) => {
    if (!patientId || !API_BASE_URL) return;
    try {
      setDialysisLoading(true);
      const response = await axios.get(
        `${API_BASE_URL}/hospital/dialysis-session/patient/${patientId}`,
        {
          params: {
            page,
            limit: dialysisPagination.limit,
          },
        }
      );
      const rawData = response.data?.data;
      const parsedPage = Number(rawData?.page) || page;
      const parsedLimit = Number(rawData?.limit) || dialysisPagination.limit;
      const parsedTotalPages = Number(rawData?.totalPages) || 1;
      const parsedTotal = Number(rawData?.total) || 0;
      if (
        response.data?.code === 200 &&
        Array.isArray(rawData?.sessions)
      ) {
        setDialysisSessions(rawData.sessions as IDialysisSession[]);
        setDialysisPagination({
          total: parsedTotal,
          page: parsedPage,
          limit: parsedLimit,
          totalPages: parsedTotalPages,
          hasNextPage: Boolean(rawData?.hasNextPage),
          hasPrevPage: Boolean(rawData?.hasPrevPage),
        });
      } else {
        setDialysisSessions([]);
        setDialysisPagination((prev) => ({
          ...prev,
          page,
          total: 0,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: page > 1,
        }));
      }
    } catch {
      setDialysisSessions([]);
      setDialysisPagination((prev) => ({
        ...prev,
        page,
        total: 0,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: page > 1,
      }));
    } finally {
      setDialysisLoading(false);
    }
  }, [patientId, dialysisPagination.limit]);

  const fetchPatientIpds = async () => {
    if (!patientId || !API_BASE_URL) return;
    try {
      setPatientIpdsLoading(true);
      const response = await axios.get(`${API_BASE_URL}/hospital/ipd`, {
        params: { patientId },
      });
      const ok =
        response.data?.code === 200 ||
        (response.status >= 200 && response.status < 300);
      if (ok && response.data?.data != null) {
        const list = extractPatientIpdsFromResponse(response.data.data);
        setPatientIpds(
          list.map((item) => {
            const dateStr = (item.admissionDate ?? item.appointmentDate)
              ? dayjs(item.admissionDate ?? item.appointmentDate).format("DD MMM YYYY")
              : "";
            const timeStr = formatInstantInIST(item.createdAt, "hh:mm A");
            return {
              id: item._id,
              IPD_ID: item.ipdId ?? item.ipdNumber ?? "—",
              Date: dateStr,
              Time: timeStr,
              Doctor: item.doctor?.name ?? "—",
              DoctorDesignation: item.doctor?.designation ?? "",
              Status: item.status ?? "—",
              Payment_Status: item.paymentStatus ?? "—",
              Total: item.totalPrice ?? 0,
              IsDischarged: Boolean(item.isDischarge),
            };
          })
        );
      } else {
        setPatientIpds([]);
      }
    } catch {
      setPatientIpds([]);
    } finally {
      setPatientIpdsLoading(false);
    }
  };

  const handlePatientIpdRowClick = (record: IPatientIpdRow) => {
    if (!record?.id) return;
    router.push(`${all_routes.ipdAppointmentDetails}/${record.id}`);
  };

  const fetchPatientTransactions = async (page = 1) => {
    if (!patientId || !API_BASE_URL) return;
    try {
      setPatientTransactionsLoading(true);
      const response = await axios.get(
        `${API_BASE_URL}/hospital/transactions`,
        { params: { patientId, page, limit: transactionsPagination.limit } }
      );
      if (response.data?.code === 200) {
        const raw = response.data?.data ?? response.data;
        const list = Array.isArray(raw?.transactions)
          ? raw.transactions
          : Array.isArray(raw)
          ? raw
          : [];
        const pagination = raw?.pagination ?? {};
        const parsedLimit = Number(pagination?.limit) || transactionsPagination.limit;
        const parsedCurrentPage = Number(pagination?.currentPage) || page;
        const parsedCount = Number(pagination?.count) || list.length;
        const parsedTotalCount = Number(pagination?.totalCount) || 0;
        const parsedSkip = Number(pagination?.skip) || 0;
        const parsedHasMore = Boolean(pagination?.hasMore);
        setPatientTransactions(list as IPatientTransaction[]);
        setTransactionsPagination({
          currentPage: parsedCurrentPage,
          limit: parsedLimit,
          skip: parsedSkip,
          count: parsedCount,
          totalCount: parsedTotalCount,
          hasMore: parsedHasMore,
        });
      } else {
        setPatientTransactions([]);
        setTransactionsPagination((prev) => ({
          ...prev,
          currentPage: page,
          skip: Math.max(0, (page - 1) * prev.limit),
          count: 0,
          totalCount: 0,
          hasMore: false,
        }));
      }
    } catch {
      setPatientTransactions([]);
      setTransactionsPagination((prev) => ({
        ...prev,
        currentPage: page,
        skip: Math.max(0, (page - 1) * prev.limit),
        count: 0,
        totalCount: 0,
        hasMore: false,
      }));
    } finally {
      setPatientTransactionsLoading(false);
    }
  };

  const handleDialysisStatusChange = async (sessionId: string, newStatus: string) => {
    if (!API_BASE_URL) return;
    try {
      setDialysisStatusUpdatingId(sessionId);
      await axios.put(
        `${API_BASE_URL}/hospital/dialysis-session/${sessionId}`,
        { status: newStatus }
      );
      setDialysisSessions((prev) =>
        prev.map((s) => (s._id === sessionId ? { ...s, status: newStatus } : s))
      );
    } catch {
      // Optionally show toast; keep list unchanged
    } finally {
      setDialysisStatusUpdatingId(null);
    }
  };

  const formatAadhar = (aadhar?: string): string => {
    if (!aadhar) return "N/A";
    // Format as XXXX XXXX XXXX
    return aadhar.replace(/(\d{4})(\d{4})(\d{4})/, "$1 $2 $3");
  };

  const handleOpenDocument = (url?: string) => {
    if (!url?.trim()) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const patientDocuments = patient
    ? [
        ...(patient.imageS3Url
          ? [{ name: "Profile Photo", url: patient.imageS3Url }]
          : []),
        ...(patient.aadharS3Url
          ? [{ name: "Aadhaar Card", url: patient.aadharS3Url }]
          : []),
        ...(patient.ayushmanCardS3Url
          ? [{ name: "Ayushman Card", url: patient.ayushmanCardS3Url }]
          : []),
        ...(patient.otherDocsS3Urls ?? []).map((url) => ({
          name: "Other Docs",
          url,
        })),
      ]
    : [];

  const patientMaritalStatusValue = getPatientMaritalStatus(patient);
  const patientMaritalLabel = patientMaritalStatusValue
    ? Marital_Status.find((m) => m.value === patientMaritalStatusValue)?.label ??
      patientMaritalStatusValue
    : "";

  const patientAbhaAddresses =
    patient?.allAbhaAddresses?.length
      ? patient.allAbhaAddresses
      : patient?.abhaAddress?.trim()
        ? [patient.abhaAddress.trim()]
        : [];

  const isAbhaLinked = patient?.abhaLinked === true;
  const abhaSpecific = patient?.abhaSpecificDetails;
  const displayDob =
    (isAbhaLinked ? abhaSpecific?.dob?.trim() : "") || patient?.dob || "";
  const displayGender =
    (isAbhaLinked ? abhaSpecific?.gender?.trim() : "") || patient?.gender || "";
  const displayAddress =
    (isAbhaLinked ? abhaSpecific?.address?.trim() : "") || patient?.address || "";
  const displayAadharNo =
    (isAbhaLinked ? abhaSpecific?.aadharNo?.trim() : "") || patient?.aadharNo || "";

  const appointmentColumns = [
    {
      title: "Case ID",
      dataIndex: "Case_ID",
      sorter: false,
      showSorterTooltip: false,
      render: (text: string) => <span className="text-dark">{text}</span>,
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
      title: "Doctor",
      dataIndex: "Doctor",
      sorter: false,
      showSorterTooltip: false,
      render: (text: any, record: any) => (
        <div className="d-flex align-items-center">
          <div>
            <h6 className="fs-14 mb-1 text-truncate">
             
                {text}
          
            </h6>
            <p className="mb-0 fs-13 text-truncate text-dark">{record.role}</p>
          </div>
        </div>
      ),
    },
    {
      title: "Mode",
      dataIndex: "Mode",
      sorter: false,
      showSorterTooltip: false,
      render: (text: string) => <span className="text-dark">{text}</span>,
    },
    {
      title: "Status",
      dataIndex: "Status",
      sorter: false,
      showSorterTooltip: false,
      render: (text: string) => (
        <span
          className={`fs-13 badge ${
            text === "Checked Out"
              ? "badge-soft-info text-info"
              : text === "Checked In"
              ? "badge-soft-warning text-warning"
              : text === "Cancelled"
              ? "badge-soft-danger text-danger"
              : text === "Schedule"
              ? "badge-soft-primary text-primary"
              : "badge-soft-success text-success"
          }  rounded  fw-medium`}
        >
          {text}
        </span>
      ),
    },
    {
      title: "",
      sorter: false,
      showSorterTooltip: false,
      render: (text: any, record: any) => (
        <div className="d-flex align-items-center gap-2">
          <Link 
            href="#" 
            className="text-primary"
            onClick={(e) => {
              e.stopPropagation();
              // Handle edit action
            }}
          >
            <i className="ti ti-edit fs-16" />
          </Link>
          <Link
            href="#"
            className="text-danger"
            onClick={(e) => {
              e.stopPropagation();
              // Handle delete action - trigger modal using hidden button
              const triggerButton = document.querySelector('#delete_modal_trigger') as HTMLElement;
              if (triggerButton) {
                triggerButton.click();
              }
            }}
          >
            <i className="ti ti-x fs-16" />
          </Link>
        </div>
      ),
    },
  ];

  const handleCreateCase = () => {
    if (!patient) return;

    const phone = patient?.phone ?? "";
    const title = patient?.title ?? "";
    const name = patient?.name ?? "";

    const params = new URLSearchParams({
      phone,
      title,
      name,
      center: "JJM",
    });

    window.open(
      `${PATHLAB_PORTAL_BASE_URL}/new-appointment?${params.toString()}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const handlePathlabCaseRowClick = (pathlabCase: IPathlabCase) => {
    const reportId = pathlabCase?._id ?? "";
    if (!reportId) return;
    window.open(
      `${PATHLAB_PORTAL_BASE_URL}/reports/view-report/${reportId}`,
      "_blank",
      "noopener,noreferrer"
    );
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
      <button
        id="delete_modal_trigger"
        data-bs-toggle="modal"
        data-bs-target="#delete_modal"
        style={{ display: 'none' }}
        aria-hidden="true"
      />
      {/* ========================
			Start Page Content
		========================= */}
      <div className="page-wrapper">
        {/* Start Content */}
        <div className="content">
          {/* page header start */}
          <div className="mb-4">
            <h6 className="fw-bold mb-0 d-flex align-items-center">
              <Link href={all_routes.patients} className="text-dark">
                <i className="ti ti-chevron-left me-1" />
                Patients
              </Link>
            </h6>
          </div>
          {/* page header end */}
          {/* card start */}
          <div className="card">
            <div className="d-sm-flex align-items-start p-3">
              {patient?.imageS3Url ? (
                <div className="flex-shrink-0 me-3 mb-3 mb-sm-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={patient.imageS3Url}
                    alt={`${patient.title ?? ""} ${patient.name ?? "Patient"}`.trim()}
                    className="object-fit-cover border rounded-0"
                    style={{ width: "72px", height: "72px" }}
                  />
                </div>
              ) : null}
              <div className="flex-grow-1 w-100">
                <p className="text-dark mb-1">{loading ? "Loading..." : patient?.mrd || "N/A"}</p>
                <h5 className="mb-1 d-flex align-items-center flex-wrap gap-2">
                  <Link href="#" className="fw-bold text-dark">
                    {loading ? "Loading..." : patient ? `${patient.title} ${patient.name}` : "Patient not found"}
                  </Link>
                  {!loading && patient?.isMRPatient ? (
                    <span className="badge badge-soft-primary border border-primary text-primary fs-12 fw-semibold px-2 py-1 rounded-2">
                      MR
                    </span>
                  ) : null}
                  {SHOW_ABHA_FEATURES && !loading && patient?.abhaLinked ? (
                    <span className="badge badge-soft-success border border-success text-success fs-12 fw-semibold px-2 py-1 rounded-2">
                      ABHA Linked
                    </span>
                  ) : null}
                </h5>
                {!loading &&
                patient?.isMRPatient &&
                (patient.companyName?.trim() || patient.division?.trim()) ? (
                  <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                    {patient.companyName?.trim() ? (
                      <span className="badge badge-soft-secondary border border-secondary text-secondary fs-12 fw-medium px-2 py-1 rounded-2">
                        {patient.companyName.trim()}
                      </span>
                    ) : null}
                    {patient.division?.trim() ? (
                      <span className="badge badge-soft-secondary border border-secondary text-secondary fs-12 fw-medium px-2 py-1 rounded-2">
                        Division · {patient.division.trim()}
                      </span>
                    ) : null}
                  </div>
                ) : null}
                {displayAddress ? <p className="mb-3 text-dark">{displayAddress}</p> : null}
                <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                  <p className="mb-0 d-inline-flex align-items-center">
                    <i className="ti ti-phone me-1 text-dark" />
                    <span className="text-dark">Phone :</span>
                    <span className="text-dark ms-1">{loading ? "Loading..." : patient?.phone || "N/A"}</span>
                  </p>
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    {SHOW_ABHA_FEATURES && patient?.abhaLinked ? (
                      <>
                        {/* Linking handled by backend
                        <button
                          type="button"
                          className="btn btn-outline-primary text-nowrap"
                          onClick={() => setLinkTokenModalOpen(true)}
                          disabled={loading || !patient}
                          aria-label="Generate Linking Token"
                        >
                          <i className="ti ti-link me-1" />
                          Linking Token
                        </button>
                        */}

                        <button
                          type="button"
                          className="btn btn-outline-danger text-nowrap"
                          onClick={() => setUnlinkAbhaModalOpen(true)}
                          disabled={loading || !patient}
                          aria-label="Unlink ABHA"
                        >
                          <i className="ti ti-unlink me-1" />
                          Unlink ABHA
                        </button>

                        <button
                          type="button"
                          className="btn btn-outline-primary text-nowrap"
                          onClick={() => setConsentInitModalOpen(true)}
                          disabled={loading || !patient}
                          aria-label="Initiate ABDM Consent"
                        >
                          <i className="ti ti-file-check me-1" />
                          Consent
                        </button>

                        <Link
                          href={`${all_routes.patientHealthHistory}?patientId=${encodeURIComponent(patientId ?? patient?._id ?? "")}`}
                          className={`btn btn-outline-primary text-nowrap${loading || !patient ? " disabled" : ""}`}
                          aria-label="Open patient health history"
                          aria-disabled={loading || !patient}
                          onClick={(e) => {
                            if (loading || !patient) e.preventDefault();
                          }}
                        >
                          <i className="ti ti-history me-1" />
                          History
                        </Link>
                      </>
                    ) : null}

                    <button
                      type="button"
                      className="btn btn-outline-primary text-nowrap"
                      onClick={handleCreateCase}
                      disabled={loading || !patient}
                      aria-label="Create Pathlab Case"
                    >
                      <i className="ti ti-plus me-1" />
                      Create Case
                    </button>

                    <Link
                      href={`${all_routes.dialysisAppointment}?patientId=${patientId ?? ""}`}
                      className="btn btn-primary text-nowrap"
                    >
                      <i className="ti ti-droplet me-1" />
                      Dialysis
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* card end */}
          {/* row start */}
          <div className="row">
            <div className="col-xl-5 d-flex">
              <div className="card shadow-sm flex-fill w-100">
                <div className="card-header">
                  <h5 className="fw-bold mb-0 text-dark">
                    <i className="ti ti-user-star me-1" />
                    About
                  </h5>
                </div>
                <div className="card-body pb-0">
                  <div className="row g-2">
                    <div className="col-sm-6">
                      <div className="d-flex align-items-center mb-3">
                        <span className="avatar rounded-circle bg-light text-dark flex-shrink-0 me-1" style={{ width: '32px', height: '32px' }}>
                          <i className={`ti ti-gender-${displayGender?.toLowerCase() === 'male' ? 'male' : displayGender?.toLowerCase() === 'female' ? 'female' : 'gender-male'} fs-14`} />
                        </span>
                        <div className="flex-grow-1">
                          <h6 className="fs-13 fw-bold mb-1 text-dark">Gender</h6>
                          <p className="mb-0 text-dark">{displayGender || "N/A"}</p>
                        </div>
                      </div>
                    </div>
                    <div className="col-sm-6">
                      <div className="d-flex align-items-center mb-3">
                        <span className="avatar rounded-circle bg-light text-dark flex-shrink-0 me-1" style={{ width: '32px', height: '32px' }}>
                          <i className="ti ti-mail fs-14" />
                        </span>
                        <div className="flex-grow-1">
                          <h6 className="fs-13 fw-bold mb-1 text-dark">Email Address</h6>
                          <p className="mb-0 text-break text-dark">{patient?.email || "N/A"}</p>
                        </div>
                      </div>
                    </div>
                    {displayDob ? (
                      <div className="col-sm-6">
                        <div className="d-flex align-items-center mb-3">
                          <span className="avatar rounded-circle bg-light text-dark flex-shrink-0 me-1" style={{ width: '32px', height: '32px' }}>
                            <i className="ti ti-calendar-event fs-14" />
                          </span>
                          <div className="flex-grow-1">
                            <h6 className="fs-13 fw-bold mb-1 text-dark">DOB</h6>
                            <p className="mb-0 text-dark">{dayjs(displayDob).format("DD MMM YYYY")}</p>
                          </div>
                        </div>
                      </div>
                    ) : null}
                    <div className="col-sm-6">
                      <div className="d-flex align-items-center mb-3">
                        <span className="avatar rounded-circle bg-light text-dark flex-shrink-0 me-1" style={{ width: '32px', height: '32px' }}>
                          <i className="ti ti-calendar fs-14" />
                        </span>
                        <div className="flex-grow-1">
                          <h6 className="fs-13 fw-bold mb-1 text-dark">Age</h6>
                          <p className="mb-0 text-nowrap text-dark">
                            {patient?.age != null
                              ? patient.age === 0
                                ? (patient.months != null && patient.months > 0
                                    ? `${patient.months} Months`
                                    : patient.days != null
                                      ? `${patient.days} Days`
                                      : "0 Years")
                                : `${patient.age} Years`
                              : "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>
                    {displayAadharNo ? (
                      <div className="col-sm-6">
                        <div className="d-flex align-items-center mb-3">
                          <span className="avatar rounded-circle bg-light text-dark flex-shrink-0 me-1" style={{ width: '32px', height: '32px' }}>
                            <i className="ti ti-id fs-14" />
                          </span>
                          <div className="flex-grow-1">
                            <h6 className="fs-13 fw-bold mb-1 text-dark">Aadhaar Number</h6>
                            <p className="mb-0 text-dark">{formatAadhar(displayAadharNo)}</p>
                          </div>
                        </div>
                      </div>
                    ) : null}
                    {patient?.bloodGroup && (
                      <div className="col-sm-6">
                        <div className="d-flex align-items-center mb-3">
                          <span className="avatar rounded-circle bg-light text-dark flex-shrink-0 me-1" style={{ width: '32px', height: '32px' }}>
                            <i className="ti ti-droplet fs-14" />
                          </span>
                          <div className="flex-grow-1">
                            <h6 className="fs-13 fw-bold mb-1 text-dark">Blood Group</h6>
                            <p className="mb-0 text-dark">{patient.bloodGroup}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    {patientMaritalLabel ? (
                      <div className="col-sm-6">
                        <div className="d-flex align-items-center mb-3">
                          <span className="avatar rounded-circle bg-light text-dark flex-shrink-0 me-1" style={{ width: "32px", height: "32px" }}>
                            <i className="ti ti-heart fs-14" />
                          </span>
                          <div className="flex-grow-1">
                            <h6 className="fs-13 fw-bold mb-1 text-dark">Marital Status</h6>
                            <p className="mb-0 text-dark">{patientMaritalLabel}</p>
                          </div>
                        </div>
                      </div>
                    ) : null}
                    {patient?.occupation?.trim() ? (
                      <div className="col-sm-6">
                        <div className="d-flex align-items-center mb-3">
                          <span className="avatar rounded-circle bg-light text-dark flex-shrink-0 me-1" style={{ width: "32px", height: "32px" }}>
                            <i className="ti ti-briefcase fs-14" />
                          </span>
                          <div className="flex-grow-1">
                            <h6 className="fs-13 fw-bold mb-1 text-dark">Occupation</h6>
                            <p className="mb-0 text-dark">{patient.occupation.trim()}</p>
                          </div>
                        </div>
                      </div>
                    ) : null}
                    {patient?.drugSensitivity?.trim() ? (
                      <div className="col-sm-6">
                        <div className="d-flex align-items-center mb-3">
                          <span className="avatar rounded-circle bg-light text-dark flex-shrink-0 me-1" style={{ width: "32px", height: "32px" }}>
                            <i className="ti ti-pill fs-14" />
                          </span>
                          <div className="flex-grow-1">
                            <h6 className="fs-13 fw-bold mb-1 text-dark">Drug Sensitivity</h6>
                            <p className="mb-0 text-dark">{patient.drugSensitivity.trim()}</p>
                          </div>
                        </div>
                      </div>
                    ) : null}
                    {patient?.ayushmanCardNo?.trim() ? (
                      <div className="col-sm-6">
                        <div className="d-flex align-items-center mb-3">
                          <span className="avatar rounded-circle bg-light text-dark flex-shrink-0 me-1" style={{ width: "32px", height: "32px" }}>
                            <i className="ti ti-id-badge fs-14" />
                          </span>
                          <div className="flex-grow-1">
                            <h6 className="fs-13 fw-bold mb-1 text-dark">Ayushman Card No.</h6>
                            <p className="mb-0 text-dark">{patient.ayushmanCardNo.trim()}</p>
                          </div>
                        </div>
                      </div>
                    ) : null}
                    {SHOW_ABHA_FEATURES && (patient?.abhaNumber?.trim() || patientAbhaAddresses.length > 0) ? (
                      <div className="col-sm-12 border-top pt-3 mt-2">
                        <h6 className="fs-14 fw-bold text-dark mb-2">ABHA Details</h6>
                        {patient?.abhaNumber?.trim() ? (
                          <div className="d-flex align-items-start mb-3">
                            <span
                              className="avatar rounded-circle bg-light text-dark flex-shrink-0 me-1"
                              style={{ width: "32px", height: "32px" }}
                            >
                              <i className="ti ti-id fs-14" />
                            </span>
                            <div className="flex-grow-1 min-w-0">
                              <h6 className="fs-13 fw-bold mb-1 text-dark">ABHA Number</h6>
                              <p className="mb-0 text-dark text-break">{patient.abhaNumber.trim()}</p>
                            </div>
                          </div>
                        ) : null}
                        {patientAbhaAddresses.length > 0 ? (
                          <div className="d-flex align-items-start mb-3">
                            <span
                              className="avatar rounded-circle bg-light text-dark flex-shrink-0 me-1"
                              style={{ width: "32px", height: "32px" }}
                            >
                              <i className="ti ti-at fs-14" />
                            </span>
                            <div className="flex-grow-1 min-w-0">
                              <h6 className="fs-13 fw-bold mb-2 text-dark">
                                ABHA {patientAbhaAddresses.length > 1 ? "Addresses" : "Address"}
                              </h6>
                              <div className="d-flex flex-wrap gap-2">
                                {patientAbhaAddresses.map((address) => (
                                  <span
                                    key={address}
                                    className="badge badge-soft-success border border-success text-success fs-12 fw-medium px-2 py-1 rounded-2 text-break"
                                  >
                                    {address}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                    {patient?.emergencyContacts && patient.emergencyContacts.length > 0 && (
                      <div className="col-sm-12 border-top pt-3 mt-2">
                        <h6 className="fs-14 fw-bold  text-dark">Emergency Contact</h6>
                        <div className="d-flex py-2 align-items-center">
                          <span className="avatar rounded-circle bg-light text-dark flex-shrink-0 me-2" style={{ width: '32px', height: '32px' }}>
                            <i className="ti ti-user fs-14" />
                          </span>
                          <div className="flex-grow-1  d-flex align-items-center justify-content-between">
                            <span className="text-dark fw-medium">{patient.emergencyContacts[0].name}</span>
                            <span className="text-dark fw-medium">{patient.emergencyContacts[0].number}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="col-xl-7 d-flex">
              <div className="card shadow-sm flex-fill w-100">
                <div className="card-header">
                  <h5 className="fw-bold mb-0 text-dark">
                    <i className="ti ti-files me-1" />
                    Documents
                  </h5>
                </div>
                <div className="card-body pb-0">
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead>
                        <tr>
                          <th className="text-dark">Document Name</th>
                          <th className="text-dark">Upload Date</th>
                          <th className="text-dark">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {patientDocuments.length > 0 ? (
                          patientDocuments.map((doc) => (
                            <tr key={`${doc.name}-${doc.url}`}>
                              <td>
                                <div className="d-flex align-items-center">
                                  <span className="avatar rounded-circle bg-light text-dark flex-shrink-0 me-2">
                                    <i className="ti ti-file-text fs-16" />
                                  </span>
                                  <span className="fw-semibold text-dark">{doc.name}</span>
                                </div>
                              </td>
                              <td className="text-dark">
                                {patient?.createdAt
                                  ? dayjs(patient.createdAt).format("DD MMM YYYY")
                                  : "N/A"}
                              </td>
                              <td>
                                <div className="d-flex align-items-center gap-2 flex-wrap">
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-primary"
                                    onClick={() => handleOpenDocument(doc.url)}
                                    aria-label={`View ${doc.name}`}
                                  >
                                    <i className="ti ti-external-link me-1" />
                                    View
                                  </button>
                                  <Link
                                    href={doc.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-sm btn-outline-secondary"
                                    aria-label={`Download ${doc.name}`}
                                  >
                                    <i className="ti ti-download me-1" />
                                    Download
                                  </Link>
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={3} className="text-center text-dark py-4">
                              No documents available
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* row end */}
          {/* tab start */}
          <ul className="nav nav-tabs nav-bordered mb-3">
            {(
              [
                { key: "appointments", label: "Appointments" },
                { key: "ipd", label: "IPD" },
                { key: "transactions", label: "Transactions" },
                { key: "dialysis", label: "Dialysis" },
                { key: "pathlab-cases", label: "Pathlab Cases" },
                ...(showConsentsTab
                  ? ([{ key: "consents", label: "Consents" }] as const)
                  : []),
              ] as ReadonlyArray<{ key: TabKey; label: string }>
            ).map(({ key, label }) => (
              <li key={key} className="nav-item">
                <button
                  type="button"
                  className={`nav-link bg-transparent${activeTab === key ? " active" : ""}`}
                  onClick={() => handleTabChange(key)}
                  aria-selected={activeTab === key}
                >
                  <span>{label}</span>
                </button>
              </li>
            ))}
          </ul>
          {/* tab end */}
          {/* tab content start */}
          <div className="tab-content">
            <div className={`tab-pane${activeTab === "appointments" ? " show active" : ""}`} id="appointments">
              {/*  Start Filter */}
              <div className="d-none align-items-center justify-content-between flex-wrap">
                <div className="d-flex align-items-center gap-2">
                  {/* Search / date filters removed for Appointments tab */}
                </div>
                <div className="d-flex table-dropdown mb-3 right-content align-items-center flex-wrap row-gap-3">
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
                    <div className="dropdown-menu dropdown-lg dropdown-menu-end filter-dropdown p-0">
                      <div className="d-flex align-items-center justify-content-between border-bottom filter-header">
                        <h4 className="mb-0 fw-bold">Filter</h4>
                        <div className="d-flex align-items-center">
                          <Link
                            href="#"
                            className="link-danger text-decoration-underline"
                          >
                            Clear All
                          </Link>
                        </div>
                      </div>
                      <form action="#">
                        <div className="filter-body pb-0">
                          <div className="mb-3">
                            <div className="d-flex align-items-center justify-content-between">
                              <label className="form-label">Doctor</label>
                              <Link href="#" className="link-primary mb-1">
                                Reset
                              </Link>
                            </div>
                            <div className="dropdown">
                              <Link
                                href="#"
                                className="dropdown-toggle btn bg-white  d-flex align-items-center justify-content-start fs-13 p-2 fw-normal border"
                                data-bs-toggle="dropdown"
                                data-bs-auto-close="false"
                                aria-expanded="true"
                              >
                                Select{" "}
                                <i className="ti ti-chevron-down ms-auto" />
                              </Link>
                              <div className="dropdown-menu shadow-lg w-100 dropdown-info p-3">
                                <div className="mb-3">
                                  <div className="input-icon-start input-icon position-relative">
                                    <span className="input-icon-addon fs-12">
                                      <i className="ti ti-search" />
                                    </span>
                                    <input
                                      type="text"
                                      className="form-control form-control-md"
                                      placeholder="Search"
                                    />
                                  </div>
                                </div>
                                <ul className="mb-3">
                                  <li className="mb-1">
                                    <label className="dropdown-item px-2 d-flex align-items-center text-dark">
                                      <input
                                        className="form-check-input m-0 me-2"
                                        type="checkbox"
                                      />
                                      Dr. Mick Thompson
                                    </label>
                                  </li>
                                  <li className="mb-1">
                                    <label className="dropdown-item px-2 d-flex align-items-center text-dark">
                                      <input
                                        className="form-check-input m-0 me-2"
                                        type="checkbox"
                                      />
                                      Dr. Sarah Johnson
                                    </label>
                                  </li>
                                  <li className="mb-1">
                                    <label className="dropdown-item px-2 d-flex align-items-center text-dark">
                                      <input
                                        className="form-check-input m-0 me-2"
                                        type="checkbox"
                                      />
                                      Dr. Emily Carter
                                    </label>
                                  </li>
                                  <li className="mb-1">
                                    <label className="dropdown-item px-2 d-flex align-items-center text-dark">
                                      <input
                                        className="form-check-input m-0 me-2"
                                        type="checkbox"
                                      />
                                      Dr. David Lee
                                    </label>
                                  </li>
                                  <li className="mb-0">
                                    <label className="dropdown-item px-2 d-flex align-items-center text-dark">
                                      <input
                                        className="form-check-input m-0 me-2"
                                        type="checkbox"
                                      />
                                      Dr. Anna Kim
                                    </label>
                                  </li>
                                </ul>
                                <div className="row g-2">
                                  <div className="col-6">
                                    <Link
                                      href="#"
                                      className="btn btn-outline-white w-100 close-filter"
                                    >
                                      Cancel
                                    </Link>
                                  </div>
                                  <div className="col-6">
                                    <Link
                                      href="#"
                                      className="btn btn-primary w-100"
                                    >
                                      Select
                                    </Link>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="mb-3">
                            <div className="d-flex align-items-center justify-content-between">
                              <label className="form-label">Designation</label>
                              <Link href="#" className="link-primary mb-1">
                                Reset
                              </Link>
                            </div>
                            <div className="dropdown">
                              <Link
                                href="#"
                                className="dropdown-toggle btn bg-white  d-flex align-items-center justify-content-start fs-13 p-2 fw-normal border"
                                data-bs-toggle="dropdown"
                                data-bs-auto-close="false"
                                aria-expanded="true"
                              >
                                Select{" "}
                                <i className="ti ti-chevron-down ms-auto" />
                              </Link>
                              <div className="dropdown-menu shadow-lg w-100 dropdown-info p-3">
                                <div className="mb-3">
                                  <div className="input-icon-start input-icon position-relative">
                                    <span className="input-icon-addon fs-12">
                                      <i className="ti ti-search" />
                                    </span>
                                    <input
                                      type="text"
                                      className="form-control form-control-md"
                                      placeholder="Search"
                                    />
                                  </div>
                                </div>
                                <ul className="mb-3">
                                  <li className="mb-1">
                                    <label className="dropdown-item px-2 d-flex align-items-center text-dark">
                                      <input
                                        className="form-check-input m-0 me-2"
                                        type="checkbox"
                                      />
                                      Cardiologist
                                    </label>
                                  </li>
                                  <li className="mb-1">
                                    <label className="dropdown-item px-2 d-flex align-items-center text-dark">
                                      <input
                                        className="form-check-input m-0 me-2"
                                        type="checkbox"
                                      />
                                      Orthopedic Surgeon
                                    </label>
                                  </li>
                                  <li className="mb-1">
                                    <label className="dropdown-item px-2 d-flex align-items-center text-dark">
                                      <input
                                        className="form-check-input m-0 me-2"
                                        type="checkbox"
                                      />
                                      Pediatrician
                                    </label>
                                  </li>
                                  <li className="mb-1">
                                    <label className="dropdown-item px-2 d-flex align-items-center text-dark">
                                      <input
                                        className="form-check-input m-0 me-2"
                                        type="checkbox"
                                      />
                                      Gynecologist
                                    </label>
                                  </li>
                                  <li className="mb-1">
                                    <label className="dropdown-item px-2 d-flex align-items-center text-dark">
                                      <input
                                        className="form-check-input m-0 me-2"
                                        type="checkbox"
                                      />
                                      Psychiatrist
                                    </label>
                                  </li>
                                  <li className="mb-1">
                                    <label className="dropdown-item px-2 d-flex align-items-center text-dark">
                                      <input
                                        className="form-check-input m-0 me-2"
                                        type="checkbox"
                                      />
                                      Neurosurgeon
                                    </label>
                                  </li>
                                  <li className="mb-1">
                                    <label className="dropdown-item px-2 d-flex align-items-center text-dark">
                                      <input
                                        className="form-check-input m-0 me-2"
                                        type="checkbox"
                                      />
                                      Oncologist
                                    </label>
                                  </li>
                                  <li className="mb-1">
                                    <label className="dropdown-item px-2 d-flex align-items-center text-dark">
                                      <input
                                        className="form-check-input m-0 me-2"
                                        type="checkbox"
                                      />
                                      Pulmonologist
                                    </label>
                                  </li>
                                  <li className="mb-1">
                                    <label className="dropdown-item px-2 d-flex align-items-center text-dark">
                                      <input
                                        className="form-check-input m-0 me-2"
                                        type="checkbox"
                                      />
                                      Urologist
                                    </label>
                                  </li>
                                  <li className="mb-1">
                                    <label className="dropdown-item px-2 d-flex align-items-center text-dark">
                                      <input
                                        className="form-check-input m-0 me-2"
                                        type="checkbox"
                                      />
                                      Dermatologist
                                    </label>
                                  </li>
                                </ul>
                                <div className="row g-2">
                                  <div className="col-6">
                                    <Link
                                      href="#"
                                      className="btn btn-outline-white w-100 close-filter"
                                    >
                                      Cancel
                                    </Link>
                                  </div>
                                  <div className="col-6">
                                    <Link
                                      href="#"
                                      className="btn btn-primary w-100"
                                    >
                                      Select
                                    </Link>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="mb-3">
                            <div className="d-flex align-items-center justify-content-between">
                              <label className="form-label">Mode</label>
                              <Link href="#" className="link-primary mb-1">
                                Reset
                              </Link>
                            </div>
                            <div className="dropdown">
                              <Link
                                href="#"
                                className="dropdown-toggle btn bg-white  d-flex align-items-center justify-content-start fs-13 p-2 fw-normal border"
                                data-bs-toggle="dropdown"
                                data-bs-auto-close="false"
                                aria-expanded="true"
                              >
                                Select{" "}
                                <i className="ti ti-chevron-down ms-auto" />
                              </Link>
                              <div className="dropdown-menu shadow-lg w-100 dropdown-info p-3">
                                <div className="mb-3">
                                  <div className="input-icon-start input-icon position-relative">
                                    <span className="input-icon-addon fs-12">
                                      <i className="ti ti-search" />
                                    </span>
                                    <input
                                      type="text"
                                      className="form-control form-control-md"
                                      placeholder="Search"
                                    />
                                  </div>
                                </div>
                                <ul className="mb-3">
                                  <li className="mb-1">
                                    <label className="dropdown-item px-2 d-flex align-items-center text-dark">
                                      <input
                                        className="form-check-input m-0 me-2"
                                        type="checkbox"
                                      />
                                      In Person
                                    </label>
                                  </li>
                                  <li className="mb-0">
                                    <label className="dropdown-item px-2 d-flex align-items-center text-dark">
                                      <input
                                        className="form-check-input m-0 me-2"
                                        type="checkbox"
                                      />
                                      Online
                                    </label>
                                  </li>
                                </ul>
                                <div className="row g-2">
                                  <div className="col-6">
                                    <Link
                                      href="#"
                                      className="btn btn-outline-white w-100 close-filter"
                                    >
                                      Cancel
                                    </Link>
                                  </div>
                                  <div className="col-6">
                                    <Link
                                      href="#"
                                      className="btn btn-primary w-100"
                                    >
                                      Select
                                    </Link>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          {/* Date filter removed */}
                          <div className="mb-3">
                            <div className="d-flex align-items-center justify-content-between">
                              <label className="form-label">Status</label>
                              <Link href="#" className="link-primary mb-1">
                                Reset
                              </Link>
                            </div>
                            <div className="dropdown">
                              <Link
                                href="#"
                                className="dropdown-toggle btn bg-white  d-flex align-items-center justify-content-start fs-13 p-2 fw-normal border"
                                data-bs-toggle="dropdown"
                                data-bs-auto-close="false"
                                aria-expanded="true"
                              >
                                Select{" "}
                                <i className="ti ti-chevron-down ms-auto" />
                              </Link>
                              <div className="dropdown-menu shadow-lg w-100 dropdown-info p-3">
                                <div className="mb-3">
                                  <div className="input-icon-start input-icon position-relative">
                                    <span className="input-icon-addon fs-12">
                                      <i className="ti ti-search" />
                                    </span>
                                    <input
                                      type="text"
                                      className="form-control form-control-md"
                                      placeholder="Search"
                                    />
                                  </div>
                                </div>
                                <ul className="mb-3">
                                  <li className="mb-1">
                                    <label className="dropdown-item px-2 d-flex align-items-center text-dark">
                                      <input
                                        className="form-check-input m-0 me-2"
                                        type="checkbox"
                                      />
                                      Checked Out
                                    </label>
                                  </li>
                                  <li className="mb-0">
                                    <label className="dropdown-item px-2 d-flex align-items-center text-dark">
                                      <input
                                        className="form-check-input m-0 me-2"
                                        type="checkbox"
                                      />
                                      Checked In
                                    </label>
                                  </li>
                                  <li className="mb-0">
                                    <label className="dropdown-item px-2 d-flex align-items-center text-dark">
                                      <input
                                        className="form-check-input m-0 me-2"
                                        type="checkbox"
                                      />
                                      Cancelled
                                    </label>
                                  </li>
                                  <li className="mb-0">
                                    <label className="dropdown-item px-2 d-flex align-items-center text-dark">
                                      <input
                                        className="form-check-input m-0 me-2"
                                        type="checkbox"
                                      />
                                      Schedule
                                    </label>
                                  </li>
                                  <li className="mb-0">
                                    <label className="dropdown-item px-2 d-flex align-items-center text-dark">
                                      <input
                                        className="form-check-input m-0 me-2"
                                        type="checkbox"
                                      />
                                      Confirmed
                                    </label>
                                  </li>
                                </ul>
                                <div className="row g-2">
                                  <div className="col-6">
                                    <Link
                                      href="#"
                                      className="btn btn-outline-white w-100 close-filter"
                                    >
                                      Cancel
                                    </Link>
                                  </div>
                                  <div className="col-6">
                                    <Link
                                      href="#"
                                      className="btn btn-primary w-100"
                                    >
                                      Select
                                    </Link>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="filter-footer d-flex align-items-center justify-content-end border-top">
                          <Link
                            href="#"
                            className="btn btn-light btn-md me-2 fw-medium close-filter"
                          >
                            Close
                          </Link>
                          <button
                            type="submit"
                            className="btn btn-primary btn-md fw-medium"
                          >
                            Filter
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
              {/*  End Filter */}
              {/*  Start Table */}
              <div className="table-responsive">
                {appointmentsLoading ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                ) : (
                  <Datatable
                    columns={appointmentColumns}
                    dataSource={appointments}
                    Selection={false}
                    searchText=""
                  />
                )}
              </div>
              {/*  End Table */}
            </div>
            <div className={`tab-pane${activeTab === "ipd" ? " show active" : ""}`} id="ipd">
              <div className="table-responsive">
                {patientIpdsLoading ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                ) : patientIpds.length === 0 ? (
                  <p className="text-muted mb-0">No IPD records found.</p>
                ) : (
                  <table className="table table-nowrap table-hover">
                    <thead className="thead-light">
                      <tr>
                        <th className="no-sort">IPD ID</th>
                        <th>Date</th>
                        <th>Doctor</th>
                        <th>Status</th>
                        <th>Payment</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {patientIpds.map((ipd) => (
                        <tr
                          key={ipd.id}
                          role="button"
                          tabIndex={0}
                          className="cursor-pointer"
                          style={{ cursor: "pointer" }}
                          onClick={() => handlePatientIpdRowClick(ipd)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handlePatientIpdRowClick(ipd);
                            }
                          }}
                          aria-label={`Open IPD record ${ipd.IPD_ID}`}
                        >
                          <td>
                            <div className="d-flex flex-column gap-1">
                              <span className="text-dark fw-medium">{ipd.IPD_ID}</span>
                              {ipd.IsDischarged ? (
                                <span className="badge badge-soft-success border border-success fs-10 px-2 py-1 w-fit-content">
                                  Discharged
                                </span>
                              ) : null}
                            </div>
                          </td>
                          <td className="text-dark">
                            <div>{ipd.Date || "—"}</div>
                            {ipd.Time ? <div className="fs-13 text-muted">{ipd.Time}</div> : null}
                          </td>
                          <td className="text-dark">
                            <div className="fw-medium">{ipd.Doctor}</div>
                            {ipd.DoctorDesignation ? (
                              <div className="fs-13 text-muted">{ipd.DoctorDesignation}</div>
                            ) : null}
                          </td>
                          <td>
                            <span className="badge badge-soft-primary text-primary fs-13 py-1 rounded fw-medium">
                              {ipd.Status}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`badge fs-13 py-1 rounded fw-medium ${
                                ipd.Payment_Status === "Paid"
                                  ? "badge-soft-success text-success"
                                  : "badge-soft-warning text-warning"
                              }`}
                            >
                              {ipd.Payment_Status}
                            </span>
                          </td>
                          <td className="text-dark fw-medium">
                            ₹{ipd.Total.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
            <div className={`tab-pane${activeTab === "transactions" ? " show active" : ""}`} id="transactions">
              {/*  Start Filter */}
              <div className="d-none align-items-center justify-content-between flex-wrap">
                <div className="d-flex align-items-center gap-2">
                  {/* Search / date filters removed for Transactions tab */}
                </div>
                <div className="d-flex table-dropdown mb-3 right-content align-items-center flex-wrap row-gap-3">
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
                    <div className="dropdown-menu dropdown-lg dropdown-menu-end filter-dropdown p-0">
                      <div className="d-flex align-items-center justify-content-between border-bottom filter-header">
                        <h4 className="mb-0 fw-bold">Filter</h4>
                        <div className="d-flex align-items-center">
                          <Link
                            href="#"
                            className="link-danger text-decoration-underline"
                          >
                            Clear All
                          </Link>
                        </div>
                      </div>
                      <form action="#">
                        <div className="filter-body pb-0">
                          <div className="mb-3">
                            <div className="d-flex align-items-center justify-content-between">
                              <label className="form-label">
                                Transaction ID
                              </label>
                              <Link href="#" className="link-primary mb-1">
                                Reset
                              </Link>
                            </div>
                            <div className="dropdown">
                              <Link
                                href="#"
                                className="dropdown-toggle btn bg-white  d-flex align-items-center justify-content-start fs-13 p-2 fw-normal border"
                                data-bs-toggle="dropdown"
                                data-bs-auto-close="false"
                                aria-expanded="true"
                              >
                                Select{" "}
                                <i className="ti ti-chevron-down ms-auto" />
                              </Link>
                              <div className="dropdown-menu shadow-lg w-100 dropdown-info p-3">
                                <div className="mb-3">
                                  <div className="input-icon-start input-icon position-relative">
                                    <span className="input-icon-addon fs-12">
                                      <i className="ti ti-search" />
                                    </span>
                                    <input
                                      type="text"
                                      className="form-control form-control-md"
                                      placeholder="Search"
                                    />
                                  </div>
                                </div>
                                <ul className="mb-3">
                                  <li className="mb-1">
                                    <label className="dropdown-item px-2 d-flex align-items-center text-dark">
                                      <input
                                        className="form-check-input m-0 me-2"
                                        type="checkbox"
                                      />
                                      #TNX0025
                                    </label>
                                  </li>
                                  <li className="mb-1">
                                    <label className="dropdown-item px-2 d-flex align-items-center text-dark">
                                      <input
                                        className="form-check-input m-0 me-2"
                                        type="checkbox"
                                      />
                                      #TNX0024
                                    </label>
                                  </li>
                                  <li className="mb-1">
                                    <label className="dropdown-item px-2 d-flex align-items-center text-dark">
                                      <input
                                        className="form-check-input m-0 me-2"
                                        type="checkbox"
                                      />
                                      #TNX0023
                                    </label>
                                  </li>
                                  <li className="mb-1">
                                    <label className="dropdown-item px-2 d-flex align-items-center text-dark">
                                      <input
                                        className="form-check-input m-0 me-2"
                                        type="checkbox"
                                      />
                                      #TNX0022
                                    </label>
                                  </li>
                                  <li className="mb-1">
                                    <label className="dropdown-item px-2 d-flex align-items-center text-dark">
                                      <input
                                        className="form-check-input m-0 me-2"
                                        type="checkbox"
                                      />
                                      #TNX0021
                                    </label>
                                  </li>
                                  <li className="mb-1">
                                    <label className="dropdown-item px-2 d-flex align-items-center text-dark">
                                      <input
                                        className="form-check-input m-0 me-2"
                                        type="checkbox"
                                      />
                                      #TNX0020
                                    </label>
                                  </li>
                                  <li className="mb-1">
                                    <label className="dropdown-item px-2 d-flex align-items-center text-dark">
                                      <input
                                        className="form-check-input m-0 me-2"
                                        type="checkbox"
                                      />
                                      #TNX0019
                                    </label>
                                  </li>
                                </ul>
                                <div className="row g-2">
                                  <div className="col-6">
                                    <Link
                                      href="#"
                                      className="btn btn-outline-white w-100 close-filter"
                                    >
                                      Cancel
                                    </Link>
                                  </div>
                                  <div className="col-6">
                                    <Link
                                      href="#"
                                      className="btn btn-primary w-100"
                                    >
                                      Select
                                    </Link>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="mb-3">
                            <div className="d-flex align-items-center justify-content-between">
                              <label className="form-label">Description</label>
                              <Link href="#" className="link-primary mb-1">
                                Reset
                              </Link>
                            </div>
                            <div className="dropdown">
                              <Link
                                href="#"
                                className="dropdown-toggle btn bg-white  d-flex align-items-center justify-content-start fs-13 p-2 fw-normal border"
                                data-bs-toggle="dropdown"
                                data-bs-auto-close="false"
                                aria-expanded="true"
                              >
                                Select{" "}
                                <i className="ti ti-chevron-down ms-auto" />
                              </Link>
                              <div className="dropdown-menu shadow-lg w-100 dropdown-info p-3">
                                <div className="mb-3">
                                  <div className="input-icon-start input-icon position-relative">
                                    <span className="input-icon-addon fs-12">
                                      <i className="ti ti-search" />
                                    </span>
                                    <input
                                      type="text"
                                      className="form-control form-control-md"
                                      placeholder="Search"
                                    />
                                  </div>
                                </div>
                                <ul className="mb-3">
                                  <li className="mb-1">
                                    <label className="dropdown-item px-2 d-flex align-items-center text-dark">
                                      <input
                                        className="form-check-input m-0 me-2"
                                        type="checkbox"
                                      />
                                      General Consultation
                                    </label>
                                  </li>
                                  <li className="mb-1">
                                    <label className="dropdown-item px-2 d-flex align-items-center text-dark">
                                      <input
                                        className="form-check-input m-0 me-2"
                                        type="checkbox"
                                      />
                                      Dental Cleaning
                                    </label>
                                  </li>
                                  <li className="mb-1">
                                    <label className="dropdown-item px-2 d-flex align-items-center text-dark">
                                      <input
                                        className="form-check-input m-0 me-2"
                                        type="checkbox"
                                      />
                                      Eye Checkup
                                    </label>
                                  </li>
                                  <li className="mb-1">
                                    <label className="dropdown-item px-2 d-flex align-items-center text-dark">
                                      <input
                                        className="form-check-input m-0 me-2"
                                        type="checkbox"
                                      />
                                      X-Ray
                                    </label>
                                  </li>
                                  <li className="mb-1">
                                    <label className="dropdown-item px-2 d-flex align-items-center text-dark">
                                      <input
                                        className="form-check-input m-0 me-2"
                                        type="checkbox"
                                      />
                                      Physiotherapy Session
                                    </label>
                                  </li>
                                  <li className="mb-1">
                                    <label className="dropdown-item px-2 d-flex align-items-center text-dark">
                                      <input
                                        className="form-check-input m-0 me-2"
                                        type="checkbox"
                                      />
                                      Cardiac Screening
                                    </label>
                                  </li>
                                  <li className="mb-1">
                                    <label className="dropdown-item px-2 d-flex align-items-center text-dark">
                                      <input
                                        className="form-check-input m-0 me-2"
                                        type="checkbox"
                                      />
                                      Skin Allergy Test
                                    </label>
                                  </li>
                                </ul>
                                <div className="row g-2">
                                  <div className="col-6">
                                    <Link
                                      href="#"
                                      className="btn btn-outline-white w-100 close-filter"
                                    >
                                      Cancel
                                    </Link>
                                  </div>
                                  <div className="col-6">
                                    <Link
                                      href="#"
                                      className="btn btn-primary w-100"
                                    >
                                      Select
                                    </Link>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="mb-3">
                            <label className="form-label mb-1 text-dark fs-14 fw-medium">
                              Date<span className="text-danger">*</span>
                            </label>
                            <div className="input-icon-end position-relative">
                              <input
                                type="text"
                                className="form-control datetimepicker"
                                placeholder="dd/mm/yyyy"
                              />
                              <span className="input-icon-addon">
                                <i className="ti ti-calendar" />
                              </span>
                            </div>
                          </div>
                          <div className="mb-3">
                            <div className="d-flex align-items-center justify-content-between">
                              <label className="form-label">
                                Payment Method
                              </label>
                              <Link href="#" className="link-primary mb-1">
                                Reset
                              </Link>
                            </div>
                            <div className="dropdown">
                              <Link
                                href="#"
                                className="dropdown-toggle btn bg-white  d-flex align-items-center justify-content-start fs-13 p-2 fw-normal border"
                                data-bs-toggle="dropdown"
                                data-bs-auto-close="false"
                                aria-expanded="true"
                              >
                                Select{" "}
                                <i className="ti ti-chevron-down ms-auto" />
                              </Link>
                              <div className="dropdown-menu shadow-lg w-100 dropdown-info p-3">
                                <div className="mb-3">
                                  <div className="input-icon-start input-icon position-relative">
                                    <span className="input-icon-addon fs-12">
                                      <i className="ti ti-search" />
                                    </span>
                                    <input
                                      type="text"
                                      className="form-control form-control-md"
                                      placeholder="Search"
                                    />
                                  </div>
                                </div>
                                <ul className="mb-3">
                                  <li className="mb-1">
                                    <label className="dropdown-item px-2 d-flex align-items-center text-dark">
                                      <input
                                        className="form-check-input m-0 me-2"
                                        type="checkbox"
                                      />
                                      PayPal
                                    </label>
                                  </li>
                                  <li className="mb-0">
                                    <label className="dropdown-item px-2 d-flex align-items-center text-dark">
                                      <input
                                        className="form-check-input m-0 me-2"
                                        type="checkbox"
                                      />
                                      Debit Card
                                    </label>
                                  </li>
                                  <li className="mb-0">
                                    <label className="dropdown-item px-2 d-flex align-items-center text-dark">
                                      <input
                                        className="form-check-input m-0 me-2"
                                        type="checkbox"
                                      />
                                      Cheque
                                    </label>
                                  </li>
                                </ul>
                                <div className="row g-2">
                                  <div className="col-6">
                                    <Link
                                      href="#"
                                      className="btn btn-outline-white w-100 close-filter"
                                    >
                                      Cancel
                                    </Link>
                                  </div>
                                  <div className="col-6">
                                    <Link
                                      href="#"
                                      className="btn btn-primary w-100"
                                    >
                                      Select
                                    </Link>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="mb-3">
                            <label className="form-label">Amount</label>
                            <div className="dropdown">
                              <Link
                                href="#"
                                className="dropdown-toggle form-control"
                                data-bs-toggle="dropdown"
                                data-bs-auto-close="false"
                                aria-expanded="true"
                              >
                                Select
                              </Link>
                              <div className="dropdown-menu shadow-lg w-100 dropdown-info p-3">
                                <div className="filter-range">
                                  <input type="text" id="range_03" />
                                  <p>
                                    Range :
                                    <span className="text-gray-9">
                                      $200 - $5695
                                    </span>
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="mb-3">
                            <div className="d-flex align-items-center justify-content-between">
                              <label className="form-label">Status</label>
                              <Link href="#" className="link-primary mb-1">
                                Reset
                              </Link>
                            </div>
                            <div className="dropdown">
                              <Link
                                href="#"
                                className="dropdown-toggle btn bg-white  d-flex align-items-center justify-content-start fs-13 p-2 fw-normal border"
                                data-bs-toggle="dropdown"
                                data-bs-auto-close="false"
                                aria-expanded="true"
                              >
                                Select{" "}
                                <i className="ti ti-chevron-down ms-auto" />
                              </Link>
                              <div className="dropdown-menu shadow-lg w-100 dropdown-info p-3">
                                <div className="mb-3">
                                  <div className="input-icon-start input-icon position-relative">
                                    <span className="input-icon-addon fs-12">
                                      <i className="ti ti-search" />
                                    </span>
                                    <input
                                      type="text"
                                      className="form-control form-control-md"
                                      placeholder="Search"
                                    />
                                  </div>
                                </div>
                                <ul className="mb-3">
                                  <li className="mb-1">
                                    <label className="dropdown-item px-2 d-flex align-items-center text-dark">
                                      <input
                                        className="form-check-input m-0 me-2"
                                        type="checkbox"
                                      />
                                      Completed
                                    </label>
                                  </li>
                                  <li className="mb-0">
                                    <label className="dropdown-item px-2 d-flex align-items-center text-dark">
                                      <input
                                        className="form-check-input m-0 me-2"
                                        type="checkbox"
                                      />
                                      Pending
                                    </label>
                                  </li>
                                </ul>
                                <div className="row g-2">
                                  <div className="col-6">
                                    <Link
                                      href="#"
                                      className="btn btn-outline-white w-100 filter-close"
                                    >
                                      Cancel
                                    </Link>
                                  </div>
                                  <div className="col-6">
                                    <Link
                                      href="#"
                                      className="btn btn-primary w-100"
                                    >
                                      Select
                                    </Link>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="filter-footer d-flex align-items-center justify-content-end border-top">
                          <Link
                            href="#"
                            className="btn btn-light btn-md me-2 fw-medium close-filter"
                          >
                            Close
                          </Link>
                          <button
                            type="submit"
                            className="btn btn-primary btn-md fw-medium"
                          >
                            Filter
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
              {/*  End Filter */}
              {/*  Start Table */}
              <div className="table-responsive">
                {patientTransactionsLoading ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                ) : patientTransactions.length === 0 ? (
                  <p className="text-muted mb-0 py-4">No transactions found.</p>
                ) : (
                  <table className="table table-nowrap datatable">
                    <thead className="thead-light">
                      <tr>
                        <th className="no-sort">Transaction ID</th>
                        <th>Description</th>
                        <th>Paid Date</th>
                        <th>Payment Method</th>
                        <th>Amount</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {patientTransactions.map((txn) => (
                        <tr key={txn._id}>
                          <td>
                            <span className="text-dark fw-medium">{txn.transactionId ?? "—"}</span>
                          </td>
                          <td className="text-dark">{txn.transactionType ?? "—"}</td>
                          <td className="text-dark">
                            {txn.transactionDate
                              ? dayjs(txn.transactionDate).format("DD MMM YYYY")
                              : txn.createdAt
                              ? dayjs(txn.createdAt).format("DD MMM YYYY")
                              : "—"}
                          </td>
                          <td className="text-dark">{txn.paymentMode ?? "—"}</td>
                          <td className="text-dark fw-medium">
                            ₹{(txn.amount ?? 0).toFixed(2)}
                          </td>
                          <td>
                            <span className="badge fs-13 badge-soft-success rounded text-success fw-medium border border-success">
                              Completed
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              {!patientTransactionsLoading && patientTransactions.length > 0 ? (
                <div className="d-flex flex-column flex-md-row align-items-center justify-content-between gap-2 mt-3">
                  <p className="mb-0 text-muted fs-13">
                    Showing page {transactionsPagination.currentPage} ({transactionsPagination.totalCount} total transactions)
                  </p>
                  <div className="d-flex align-items-center gap-2">
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() =>
                        fetchPatientTransactions(transactionsPagination.currentPage - 1)
                      }
                      disabled={transactionsPagination.currentPage <= 1 || patientTransactionsLoading}
                      aria-label="Go to previous transactions page"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() =>
                        fetchPatientTransactions(transactionsPagination.currentPage + 1)
                      }
                      disabled={!transactionsPagination.hasMore || patientTransactionsLoading}
                      aria-label="Go to next transactions page"
                    >
                      Next
                    </button>
                  </div>
                </div>
              ) : null}
              {/*  End Table */}
            </div>
            <div className={`tab-pane${activeTab === "dialysis" ? " show active" : ""}`} id="dialysis">
              <div className="table-responsive">
                {dialysisLoading ? (
                  <p className="text-muted mb-0">Loading dialysis sessions…</p>
                ) : dialysisSessions.length === 0 ? (
                  <p className="text-muted mb-0">No dialysis sessions found.</p>
                ) : (
                  <table className="table table-nowrap table-hover">
                    <thead className="thead-light">
                      <tr>
                        <th className="no-sort">Session ID</th>
                        <th>Date</th>
                        <th>Actual Weight Loss (kg)</th>
                        <th>Post HD Weight (kg)</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dialysisSessions.map((session) => (
                        <tr
                          key={session._id}
                          role="button"
                          tabIndex={0}
                          className="cursor-pointer"
                          style={{ cursor: "pointer" }}
                          onClick={() =>
                            router.push(
                              `${all_routes.dialysisAppointment}?patientId=${patientId ?? ""}&sessionId=${session._id}`
                            )
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              router.push(
                                `${all_routes.dialysisAppointment}?patientId=${patientId ?? ""}&sessionId=${session._id}`
                              );
                            }
                          }}
                        >
                          <td>
                            <span className="text-dark fw-medium">
                              {session.sessionId ?? "—"}
                            </span>
                          </td>
                          <td className="text-dark">
                            {formatDialysisSessionDate(
                              session,
                              session.sessionDate?.trim() ? "DD MMM YYYY" : "DD MMM YYYY, HH:mm"
                            ) || "—"}
                          </td>
                          <td className="text-dark">
                            {session.generalInformation?.actualWeightLoss ?? "—"}
                          </td>
                          <td className="text-dark">
                            {session.generalInformation?.postHdWeightToday ?? "—"}
                          </td>
                          <td onClick={(e) => e.stopPropagation()}>
                            <select
                              className={`form-select form-select-sm ${session.status === "Completed" ? "text-success" : "text-warning"}`}
                              style={{ width: "auto", minWidth: "7rem" }}
                              value={session.status ?? ""}
                              disabled={dialysisStatusUpdatingId === session._id}
                              onChange={(e) =>
                                handleDialysisStatusChange(session._id, e.target.value)
                              }
                              aria-label="Update status"
                            >
                              <option value="In Progress">In Progress</option>
                              <option value="Completed">Completed</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              {!dialysisLoading && dialysisSessions.length > 0 ? (
                <div className="d-flex flex-column flex-md-row align-items-center justify-content-between gap-2 mt-3">
                  <p className="mb-0 text-muted fs-13">
                    Showing page {dialysisPagination.page} of {dialysisPagination.totalPages} ({dialysisPagination.total} total sessions)
                  </p>
                  <div className="d-flex align-items-center gap-2">
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => fetchDialysisSessions(dialysisPagination.page - 1)}
                      disabled={!dialysisPagination.hasPrevPage || dialysisLoading}
                      aria-label="Go to previous dialysis sessions page"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => fetchDialysisSessions(dialysisPagination.page + 1)}
                      disabled={!dialysisPagination.hasNextPage || dialysisLoading}
                      aria-label="Go to next dialysis sessions page"
                    >
                      Next
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
            <div className={`tab-pane${activeTab === "pathlab-cases" ? " show active" : ""}`} id="pathlab-cases">
              <div className="table-responsive">
                {!patient?.pathlabCases?.length ? (
                  <p className="text-muted mb-0">No pathlab cases found.</p>
                ) : (
                  <table className="table table-nowrap table-hover">
                    <thead className="thead-light">
                      <tr>
                        <th className="no-sort">Case ID</th>
                        <th>Status</th>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>Amount Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {patient.pathlabCases.map((pc) => (
                        <tr
                          key={pc._id}
                          onClick={() => handlePathlabCaseRowClick(pc)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handlePathlabCaseRowClick(pc);
                            }
                          }}
                          role="button"
                          tabIndex={0}
                          aria-label={`Open pathlab report ${pc.caseId ?? "case"}`}
                          className="cursor-pointer"
                        >
                          <td>
                            <span className="text-dark fw-medium">{pc.caseId ?? "—"}</span>
                          </td>
                          <td className="text-dark">{pc.status ?? "—"}</td>
                          <td className="text-dark">
                            {pc.createdAt ? dayjs(pc.createdAt).format("DD MMM YYYY, HH:mm") : "—"}
                          </td>
                          <td className="text-dark">
                            {pc.finalAmount != null ? `₹${pc.finalAmount.toFixed(2)}` : pc.totalAmount != null ? `₹${pc.totalAmount.toFixed(2)}` : "—"}
                          </td>
                          <td>
                            <span
                              className={`badge fs-13 py-1 rounded fw-medium ${
                                pc.amountStatus === "Paid"
                                  ? "badge-soft-success text-success"
                                  : "badge-soft-warning text-warning"
                              }`}
                            >
                              {pc.amountStatus ?? "—"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
            {showConsentsTab ? (
              <div className={`tab-pane${activeTab === "consents" ? " show active" : ""}`} id="consents">
                <div className="table-responsive">
                  {!consents.length ? (
                    <p className="text-muted mb-0">No consents found.</p>
                  ) : (
                    <table className="table table-nowrap table-hover">
                      <thead className="thead-light">
                        <tr>
                          <th>Status</th>
                          <th>Purpose</th>
                          <th>Requester</th>
                          <th>HI Types</th>
                          <th>Date Range</th>
                          <th>Data Erase At</th>
                          <th>Granted At</th>
                          <th>Care Contexts</th>
                        </tr>
                      </thead>
                      <tbody>
                        {consents.map((consent) => {
                          const rowKey =
                            consent.consentId ||
                            consent.consentRequestId ||
                            consent.outboundRequestId ||
                            `${consent.status}-${consent.grantedAt}`;
                          return (
                            <tr key={rowKey}>
                              <td>
                                <span
                                  className={`badge border fs-12 fw-semibold px-2 py-1 rounded-2 ${getConsentStatusBadgeClass(consent.status)}`}
                                >
                                  {consent.status ?? "—"}
                                </span>
                              </td>
                              <td className="text-dark">{consent.purpose ?? "—"}</td>
                              <td className="text-dark">
                                {consent.requesterName ?? consent.hipName ?? "—"}
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
                                {consent.dateRangeFrom || consent.dateRangeTo
                                  ? `${consent.dateRangeFrom ? dayjs(consent.dateRangeFrom).format("DD MMM YYYY") : "—"} – ${consent.dateRangeTo ? dayjs(consent.dateRangeTo).format("DD MMM YYYY") : "—"}`
                                  : "—"}
                              </td>
                              <td className="text-dark">
                                {consent.dataEraseAt
                                  ? dayjs(consent.dataEraseAt).format("DD MMM YYYY")
                                  : "—"}
                              </td>
                              <td className="text-dark">
                                {consent.grantedAt
                                  ? dayjs(consent.grantedAt).format("DD MMM YYYY, HH:mm")
                                  : "—"}
                              </td>
                              <td className="text-dark">{consent.careContexts.length || 0}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            ) : null}
          </div>
          {/* tab content end */}
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
      <Modals />
      {/* Linking handled by backend
      <GenerateLinkTokenModal
        open={linkTokenModalOpen}
        onClose={() => setLinkTokenModalOpen(false)}
        patient={patient}
        onTokenReady={() =>
          setPatient((prev) => (prev ? { ...prev, abhaLinked: true } : prev))
        }
      />
      */}
      {SHOW_ABHA_FEATURES ? (
        <>
          <UnlinkAbhaConfirmModal
            open={unlinkAbhaModalOpen}
            onClose={() => setUnlinkAbhaModalOpen(false)}
            patientId={patient?._id ?? patientId}
            patientName={patient ? `${patient.title ?? ""} ${patient.name ?? ""}`.trim() : undefined}
            onUnlinked={() =>
              setPatient((prev) => (prev ? { ...prev, abhaLinked: false } : prev))
            }
          />
          <ConsentInitModal
            open={consentInitModalOpen}
            onClose={() => setConsentInitModalOpen(false)}
            patientId={patient?._id ?? patientId}
            abhaAddresses={patientAbhaAddresses}
            onSuccess={() => {
              const id = patient?._id ?? patientId;
              if (id) fetchConsentStatus(id);
            }}
          />
        </>
      ) : null}
    </>
  );
};

export default PatientDetailsComponent;
