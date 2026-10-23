"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });
import SCol2Chart from "../chats/scol2";
import SCol3Chart from "../chats/scol3";
import SCol4Chart from "../chats/scol4";
import SCol19Chart from "../chats/scol19";
import CircleChart from "../chats/circleChart";
import RevenueChart from "../chats/revenueChart";
import VisitRevenueChart from "../chats/visitRevenueChart";
import DaycareRevenueChart from "../chats/daycareRevenueChart";
import Link from "next/link";
import { all_routes } from "@/routes/all_routes";
import axios from "axios";
import { API_BASE_URL } from "@/environment";
import dayjs from "dayjs";
import GenerateAbhaQrModal from "./GenerateAbhaQrModal";
import AbhaScannedUsersDrawer from "./AbhaScannedUsersDrawer";
import { SHOW_ABHA_FEATURES } from "@/core/config/featureFlags";

interface IOverviewMetric {
  total: number;
  growthRate: string;
}

interface IDashboardOverviewData {
  doctors: IOverviewMetric;
  patients: IOverviewMetric;
  visits: IOverviewMetric;
  revenue: IOverviewMetric;
}

interface IRecentTransaction {
  _id: string;
  transactionId: string;
  visitId: string;
  transactionType: string;
  amount: number;
  paymentMode: string;
  transactionDate: string;
  patientName: string;
  serviceName: string;
}

interface IVisitStatsSummary {
  all: number;
  scheduled: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  noShow: number;
}

interface IVisitStatsPeriodData {
  period: string;
  date?: string;
  scheduled: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  noShow: number;
}

interface IDaycareStatsSummary {
  all: number;
  scheduled: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  noShow: number;
}

interface IDaycareStatsPeriodData {
  period: string;
  date?: string;
  scheduled: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  noShow: number;
}

const DashboardComponent = () => {
  const [overview, setOverview] = useState<IDashboardOverviewData | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [abhaQrModalOpen, setAbhaQrModalOpen] = useState(false);
  const [abhaScannedUsersOpen, setAbhaScannedUsersOpen] = useState(false);

  const [sColChart] = useState<any>({
    chart: {
      width: 80,
      height: 54,
      type: "bar",
      toolbar: { show: false },
      sparkline: { enabled: true },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "70%",
        borderRadius: 3,
        endingShape: "rounded",
      },
    },
    dataLabels: { enabled: false },
    stroke: { show: false },
    xaxis: {
      labels: { show: false },
      axisTicks: { show: false },
      axisBorder: { show: false },
    },
    yaxis: { show: false },
    grid: { show: false },
    tooltip: { enabled: false },
    colors: [
      "#2E37A4", // default color
      "#2E37A4",
      "#2E37A4",
      "#2E37A4",
      "#FF955A", // highlighted bar
      "#2E37A4",
      "#2E37A4",
    ],
    fill: {
      type: "solid",
    },
  });

  const series = [
    {
      name: "Data",
      data: [40, 15, 60, 15, 90, 20, 70], // y-values
    },
  ];

  const [recentAppointments, setRecentAppointments] = useState<
    {
      id: string;
      doctorName: string;
      patientName: string;
      dateTime: string;
      appointmentType: string;
      status: string;
    }[]
  >([]);

  const [recentLoading, setRecentLoading] = useState(false);

  const [recentTransactions, setRecentTransactions] = useState<IRecentTransaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(true);

  const [visitStatsSummary, setVisitStatsSummary] = useState<IVisitStatsSummary>({ all: 0, scheduled: 0, inProgress: 0, completed: 0, cancelled: 0, noShow: 0 });
  const [visitStatsPeriodData, setVisitStatsPeriodData] = useState<IVisitStatsPeriodData[]>([]);
  const [visitStatsPeriod, setVisitStatsPeriod] = useState<"daily" | "weekly" | "monthly" | "yearly">("daily");
  const [visitStatsFrom, setVisitStatsFrom] = useState<string>("");
  const [visitStatsTo, setVisitStatsTo] = useState<string>("");
  const [daycareStatsSummary, setDaycareStatsSummary] = useState<IDaycareStatsSummary>({
    all: 0,
    scheduled: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
    noShow: 0,
  });
  const [daycareStatsPeriodData, setDaycareStatsPeriodData] = useState<IDaycareStatsPeriodData[]>([]);
  const [daycareStatsPeriod, setDaycareStatsPeriod] = useState<"daily" | "weekly" | "monthly" | "yearly">("monthly");
  const [daycareStatsFrom, setDaycareStatsFrom] = useState<string>("");
  const [daycareStatsTo, setDaycareStatsTo] = useState<string>("");

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "Scheduled":
        return "badge-soft-primary text-primary border border-primary";
      case "In Progress":
        return "badge-soft-warning text-warning border border-warning";
      case "Completed":
        return "badge-soft-success text-success border border-success";
      case "Cancelled":
        return "badge-soft-danger text-danger border border-danger";
      case "No Show":
        return "badge-soft-secondary text-secondary border border-secondary";
      default:
        return "badge-soft-secondary text-secondary border border-secondary";
    }
  };

  useEffect(() => {
    const fetchOverview = async () => {
      if (!API_BASE_URL) return;
      try {
        setOverviewLoading(true);
        const response = await axios.get(`${API_BASE_URL}/hospital/dashboard/overview`);
        if (response.data?.code === 200 && response.data?.data) {
          setOverview(response.data.data as IDashboardOverviewData);
        } else {
          setOverview(null);
        }
      } catch {
        setOverview(null);
      } finally {
        setOverviewLoading(false);
      }
    };

    fetchOverview();
  }, []);

  useEffect(() => {
    const fetchRecentVisits = async () => {
      if (!API_BASE_URL) return;
      try {
        setRecentLoading(true);
        const response = await axios.get(`${API_BASE_URL}/hospital/dashboard/recent-visits`, {
          params: { limit: 6 },
        });
        if (response.data?.code === 200 && Array.isArray(response.data?.data?.visits)) {
          const visits = response.data.data.visits as Array<{
            _id: string;
            visitId?: string;
            doctorName?: string;
            patientName?: string;
            dateTime?: string;
            appointmentType?: string;
            status?: string;
          }>;
          const mapped = visits.map((visit) => ({
            id: visit._id,
            doctorName: visit.doctorName ?? "Unknown Doctor",
            patientName: visit.patientName ?? "Unknown Patient",
            dateTime: visit.dateTime ? dayjs(visit.dateTime).format("DD MMM YYYY") : "",
            appointmentType: visit.appointmentType ?? "OPD",
            status: visit.status ?? "Scheduled",
          }));
          setRecentAppointments(mapped);
        } else {
          setRecentAppointments([]);
        }
      } catch {
        setRecentAppointments([]);
      } finally {
        setRecentLoading(false);
      }
    };

    fetchRecentVisits();
  }, []);

  useEffect(() => {
    const fetchRecentTransactions = async () => {
      if (!API_BASE_URL) return;
      try {
        setTransactionsLoading(true);
        const response = await axios.get(`${API_BASE_URL}/hospital/dashboard/recent-transactions`, {
          params: { limit: 5 },
        });
        if (response.data?.code === 200 && Array.isArray(response.data?.data?.transactions)) {
          setRecentTransactions(response.data.data.transactions as IRecentTransaction[]);
        } else {
          setRecentTransactions([]);
        }
      } catch {
        setRecentTransactions([]);
      } finally {
        setTransactionsLoading(false);
      }
    };

    fetchRecentTransactions();
  }, []);

  useEffect(() => {
    const fetchVisitStatistics = async () => {
      if (!API_BASE_URL) return;
      try {
        const params: Record<string, string> = { period: visitStatsPeriod };
        if (visitStatsFrom) params.from = visitStatsFrom;
        if (visitStatsTo) params.to = visitStatsTo;
        const response = await axios.get(`${API_BASE_URL}/hospital/dashboard/visit-statistics`, {
          params,
        });
        if (response.data?.code === 200 && response.data?.data) {
          const { summary, periodData } = response.data.data;
          if (summary) setVisitStatsSummary(summary);
          if (Array.isArray(periodData)) setVisitStatsPeriodData(periodData);
        }
      } catch {
        // keep defaults
      }
    };
    fetchVisitStatistics();
  }, [visitStatsPeriod, visitStatsFrom, visitStatsTo]);

  useEffect(() => {
    const toNumber = (value: unknown): number => {
      const num = Number(value);
      return Number.isFinite(num) ? num : 0;
    };

    const fetchDaycareStatistics = async () => {
      if (!API_BASE_URL) return;
      try {
        const params: Record<string, string> = { range: daycareStatsPeriod };
        if (daycareStatsFrom) params.from = daycareStatsFrom;
        if (daycareStatsTo) params.to = daycareStatsTo;
        const response = await axios.get(
          `${API_BASE_URL}/hospital/dashboard/daycare-statistics`,
          { params }
        );

        const data = response?.data?.data;
        if (!data) return;

        const summary = data?.summary ?? data?.totals ?? {};
        setDaycareStatsSummary({
          all: toNumber(summary?.all ?? summary?.total ?? summary?.totalVisits),
          scheduled: toNumber(summary?.scheduled),
          inProgress: toNumber(summary?.inProgress ?? summary?.inprogress),
          completed: toNumber(summary?.completed),
          cancelled: toNumber(summary?.cancelled ?? summary?.canceled),
          noShow: toNumber(summary?.noShow ?? summary?.no_show),
        });

        const rawPeriodData = Array.isArray(data?.periodData)
          ? data.periodData
          : Array.isArray(data?.chartData)
            ? data.chartData
            : [];

        const mappedPeriodData: IDaycareStatsPeriodData[] = rawPeriodData.map((item: Record<string, unknown>) => ({
          period: String(item?.period ?? item?.label ?? item?.month ?? ""),
          date: item?.date != null ? String(item.date) : undefined,
          scheduled: toNumber(item?.scheduled),
          inProgress: toNumber(item?.inProgress ?? item?.inprogress),
          completed: toNumber(item?.completed),
          cancelled: toNumber(item?.cancelled ?? item?.canceled),
          noShow: toNumber(item?.noShow ?? item?.no_show),
        }));
        setDaycareStatsPeriodData(mappedPeriodData);
      } catch {
        // keep defaults
      }
    };

    fetchDaycareStatistics();
  }, [daycareStatsPeriod, daycareStatsFrom, daycareStatsTo]);

  const visitStatsCategories = visitStatsPeriodData.map((d) =>
    visitStatsPeriod === "daily" ? d.date || d.period : d.period
  );
  const visitStatsSeries: ApexAxisChartSeries = [
    { name: "Completed", data: visitStatsPeriodData.map((d) => d.completed) },
    { name: "Scheduled", data: visitStatsPeriodData.map((d) => d.scheduled) },
    { name: "In Progress", data: visitStatsPeriodData.map((d) => d.inProgress) },
    { name: "Cancelled", data: visitStatsPeriodData.map((d) => d.cancelled) },
    { name: "No Show", data: visitStatsPeriodData.map((d) => d.noShow) },
  ];

  const daycareStatsCategories = daycareStatsPeriodData.map((d) =>
    daycareStatsPeriod === "daily" ? d.date || d.period : d.period
  );
  const daycareStatsSeries: ApexAxisChartSeries = [
    { name: "Completed", data: daycareStatsPeriodData.map((d) => d.completed) },
    { name: "Scheduled", data: daycareStatsPeriodData.map((d) => d.scheduled) },
    { name: "In Progress", data: daycareStatsPeriodData.map((d) => d.inProgress) },
    { name: "Cancelled", data: daycareStatsPeriodData.map((d) => d.cancelled) },
    { name: "No Show", data: daycareStatsPeriodData.map((d) => d.noShow) },
  ];

  const formatRevenue = (total: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(total);

  const formatTransactionDate = (dateStr: string) =>
    dateStr ? dayjs(dateStr).format("DD MMM YYYY, HH:mm") : "—";

  return (
    <>
      {/* ========================
			Start Page Content
		========================= */}
      <div className="page-wrapper">
        {/* Start Content */}
        <div className="content pb-0">
          {/* Page Header */}
          <div className="d-flex align-items-sm-center justify-content-between flex-wrap gap-2 mb-4">
            <div>
              <h4 className="fw-bold mb-0">Admin Dashboard </h4>
            </div>
            <div className="d-flex align-items-center flex-wrap gap-2">
              <Link
                href={all_routes.newAppointment}
                className="btn btn-primary d-inline-flex align-items-center"
              >
                <i className="ti ti-plus me-1" />
                New Appointment
              </Link>
              <Link
                href="/qd/DOC00031"
                className="btn btn-primary d-inline-flex align-items-center"
              >
                <i className="ti ti-list me-1" />
                Queue
              </Link>
              {SHOW_ABHA_FEATURES ? (
                <>
                  <button
                    type="button"
                    className="btn btn-outline-primary d-inline-flex align-items-center"
                    onClick={() => setAbhaQrModalOpen(true)}
                  >
                    <i className="ti ti-qrcode me-1" />
                    Generate ABHA QR
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-primary d-inline-flex align-items-center"
                    onClick={() => setAbhaScannedUsersOpen(true)}
                  >
                    <i className="ti ti-users me-1" />
                    Show Scanned Users
                  </button>
                </>
              ) : null}
            </div>
          </div>
          {/* End Page Header */}
          {/* start row */}
          <div className="row">
            <div className="col-xl-3 col-md-6">
              <div className="border card rounded-2 shadow-sm">
                <div className="card-body">
                  <div className="d-flex align-items-center mb-2">
                    <span className="avatar bg-primary rounded-circle">
                      <i className="ti ti-calendar-heart fs-24" />
                    </span>
                  </div>
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <p className="mb-1">Doctors</p>
                      <h3 className="fw-bold mb-0">{overviewLoading ? "—" : (overview?.doctors?.total ?? 0)}</h3>
                    </div>
                    <div>
                      <div id="s-col" className="chart-set">
                        <Chart
                          options={sColChart}
                          series={series}
                          type="bar"
                          width={80}
                          height={54}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* end col */}
            <div className="col-xl-3 col-md-6">
              <div className="border card rounded-2 shadow-sm">
                <div className="card-body">
                  <div className="d-flex align-items-center mb-2">
                    <span className="avatar bg-danger rounded-circle">
                      <i className="ti ti-calendar-heart fs-24" />
                    </span>
                  </div>
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <p className="mb-1">Patients</p>
                      <h3 className="fw-bold mb-0">{overviewLoading ? "—" : (overview?.patients?.total ?? 0)}</h3>
                    </div>
                    <div>
                      <div id="s-col-2" className="chart-set">
                        <SCol2Chart />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* end col */}
            <div className="col-xl-3 col-md-6">
              <div className="border card rounded-2 shadow-sm">
                <div className="card-body">
                  <div className="d-flex align-items-center mb-2">
                    <span className="avatar bg-info rounded-circle">
                      <i className="ti ti-calendar-heart fs-24" />
                    </span>
                  </div>
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <p className="mb-1">Visits</p>
                      <h3 className="fw-bold mb-0">{overviewLoading ? "—" : (overview?.visits?.total ?? 0)}</h3>
                    </div>
                    <div>
                      <div id="s-col-3" className="chart-set">
                        <SCol3Chart />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* end col */}
            <div className="col-xl-3 col-md-6">
              <div className="border card rounded-2 shadow-sm">
                <div className="card-body">
                  <div className="d-flex align-items-center mb-2">
                    <span className="avatar bg-success rounded-circle">
                      <i className="ti ti-calendar-heart fs-24" />
                    </span>
                  </div>
                  <div className="d-flex align-items-center justify-content-between overflow-hidden">
                    <div>
                      <p className="mb-1">Revenue</p>
                      <h3 className="fw-bold mb-0 text-truncate">
                        {overviewLoading ? "—" : formatRevenue(overview?.revenue?.total ?? 0)}
                      </h3>
                    </div>
                    <div>
                      <div id="s-col-4" className="chart-set">
                        <SCol4Chart />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* end col */}
          </div>
          {/* end row */}
          {/* row start */}
          <div className="row">
            {/* col start */}
            <div className="col-xl-12">
              {/* card start */}
              <div className="card shadow-sm flex-fill w-100">
                <div className="card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
                  <h5 className="fw-bold mb-0">Appointment Statistics</h5>
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <div className="d-flex align-items-center gap-2">
                      <label className="mb-0 fs-13 text-muted">From</label>
                      <input
                        type="date"
                        className="form-control form-control-sm"
                        value={visitStatsFrom}
                        onChange={(e) => setVisitStatsFrom(e.target.value)}
                      />
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <label className="mb-0 fs-13 text-muted">To</label>
                      <input
                        type="date"
                        className="form-control form-control-sm"
                        value={visitStatsTo}
                        onChange={(e) => setVisitStatsTo(e.target.value)}
                      />
                    </div>
                    <div className="dropdown">
                      <button
                        type="button"
                        className="btn btn-sm px-2 border shadow-sm btn-outline-white d-inline-flex align-items-center"
                        data-bs-toggle="dropdown"
                      >
                        {visitStatsPeriod === "daily" ? "Daily" : visitStatsPeriod === "weekly" ? "Weekly" : visitStatsPeriod === "monthly" ? "Monthly" : "Yearly"} <i className="ti ti-chevron-down ms-1" />
                      </button>
                      <ul className="dropdown-menu">
                        <li><button className="dropdown-item" onClick={() => setVisitStatsPeriod("daily")}>Daily</button></li>
                        <li><button className="dropdown-item" onClick={() => setVisitStatsPeriod("weekly")}>Weekly</button></li>
                        <li><button className="dropdown-item" onClick={() => setVisitStatsPeriod("monthly")}>Monthly</button></li>
                        <li><button className="dropdown-item" onClick={() => setVisitStatsPeriod("yearly")}>Yearly</button></li>
                      </ul>
                    </div>
                  </div>
                </div>
                <div className="card-body pb-0">
                  <div className="row row-gap-3 mb-2">
                    <div className="col-md-2 col-sm-6">
                      <div className="bg-light border p-2 text-center rounded-2">
                        <p className="mb-1 text-truncate"><i className="ti ti-point-filled me-1 text-primary" />All</p>
                        <h5 className="fw-bold mb-0">{visitStatsSummary.all}</h5>
                      </div>
                    </div>
                    <div className="col-md-2 col-sm-6">
                      <div className="bg-light border p-2 text-center rounded-2">
                        <p className="mb-1 text-truncate"><i className="ti ti-point-filled me-1 text-info" />Scheduled</p>
                        <h5 className="fw-bold mb-0">{visitStatsSummary.scheduled}</h5>
                      </div>
                    </div>
                    <div className="col-md-2 col-sm-6">
                      <div className="bg-light border p-2 text-center rounded-2">
                        <p className="mb-1 text-truncate"><i className="ti ti-point-filled me-1 text-warning" />In Progress</p>
                        <h5 className="fw-bold mb-0">{visitStatsSummary.inProgress}</h5>
                      </div>
                    </div>
                    <div className="col-md-2 col-sm-6">
                      <div className="bg-light border p-2 text-center rounded-2">
                        <p className="mb-1 text-truncate"><i className="ti ti-point-filled me-1 text-success" />Completed</p>
                        <h5 className="fw-bold mb-0">{visitStatsSummary.completed}</h5>
                      </div>
                    </div>
                    <div className="col-md-2 col-sm-6">
                      <div className="bg-light border p-2 text-center rounded-2">
                        <p className="mb-1 text-truncate"><i className="ti ti-point-filled me-1 text-danger" />Cancelled</p>
                        <h5 className="fw-bold mb-0">{visitStatsSummary.cancelled}</h5>
                      </div>
                    </div>
                    <div className="col-md-2 col-sm-6">
                      <div className="bg-light border p-2 text-center rounded-2">
                        <p className="mb-1 text-truncate"><i className="ti ti-point-filled me-1 text-secondary" />No Show</p>
                        <h5 className="fw-bold mb-0">{visitStatsSummary.noShow}</h5>
                      </div>
                    </div>
                  </div>
                  <div className="chart-set" id="s-col-19">
                    <SCol19Chart categories={visitStatsCategories} series={visitStatsSeries} />
                  </div>
                </div>
              </div>
              {/* card end */}
            </div>
            {/* col end */}
          </div>
          {/* end row - chart only */}
          <div className="row">
            <div className="col-xl-12">
              <div className="card shadow-sm flex-fill w-100">
                <div className="card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
                  <h5 className="fw-bold mb-0">Daycare Statistics</h5>
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <div className="d-flex align-items-center gap-2">
                      <label className="mb-0 fs-13 text-muted">From</label>
                      <input
                        type="date"
                        className="form-control form-control-sm"
                        value={daycareStatsFrom}
                        onChange={(e) => setDaycareStatsFrom(e.target.value)}
                      />
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <label className="mb-0 fs-13 text-muted">To</label>
                      <input
                        type="date"
                        className="form-control form-control-sm"
                        value={daycareStatsTo}
                        onChange={(e) => setDaycareStatsTo(e.target.value)}
                      />
                    </div>
                    <div className="dropdown">
                      <button
                        type="button"
                        className="btn btn-sm px-2 border shadow-sm btn-outline-white d-inline-flex align-items-center"
                        data-bs-toggle="dropdown"
                      >
                        {daycareStatsPeriod === "daily" ? "Daily" : daycareStatsPeriod === "weekly" ? "Weekly" : daycareStatsPeriod === "monthly" ? "Monthly" : "Yearly"} <i className="ti ti-chevron-down ms-1" />
                      </button>
                      <ul className="dropdown-menu">
                        <li><button className="dropdown-item" onClick={() => setDaycareStatsPeriod("daily")}>Daily</button></li>
                        <li><button className="dropdown-item" onClick={() => setDaycareStatsPeriod("weekly")}>Weekly</button></li>
                        <li><button className="dropdown-item" onClick={() => setDaycareStatsPeriod("monthly")}>Monthly</button></li>
                        <li><button className="dropdown-item" onClick={() => setDaycareStatsPeriod("yearly")}>Yearly</button></li>
                      </ul>
                    </div>
                  </div>
                </div>
                <div className="card-body pb-0">
                  <div className="row row-gap-3 mb-2">
                    <div className="col-md-2 col-sm-6">
                      <div className="bg-light border p-2 text-center rounded-2">
                        <p className="mb-1 text-truncate"><i className="ti ti-point-filled me-1 text-primary" />All</p>
                        <h5 className="fw-bold mb-0">{daycareStatsSummary.all}</h5>
                      </div>
                    </div>
                    <div className="col-md-2 col-sm-6">
                      <div className="bg-light border p-2 text-center rounded-2">
                        <p className="mb-1 text-truncate"><i className="ti ti-point-filled me-1 text-info" />Scheduled</p>
                        <h5 className="fw-bold mb-0">{daycareStatsSummary.scheduled}</h5>
                      </div>
                    </div>
                    <div className="col-md-2 col-sm-6">
                      <div className="bg-light border p-2 text-center rounded-2">
                        <p className="mb-1 text-truncate"><i className="ti ti-point-filled me-1 text-warning" />In Progress</p>
                        <h5 className="fw-bold mb-0">{daycareStatsSummary.inProgress}</h5>
                      </div>
                    </div>
                    <div className="col-md-2 col-sm-6">
                      <div className="bg-light border p-2 text-center rounded-2">
                        <p className="mb-1 text-truncate"><i className="ti ti-point-filled me-1 text-success" />Completed</p>
                        <h5 className="fw-bold mb-0">{daycareStatsSummary.completed}</h5>
                      </div>
                    </div>
                    <div className="col-md-2 col-sm-6">
                      <div className="bg-light border p-2 text-center rounded-2">
                        <p className="mb-1 text-truncate"><i className="ti ti-point-filled me-1 text-danger" />Cancelled</p>
                        <h5 className="fw-bold mb-0">{daycareStatsSummary.cancelled}</h5>
                      </div>
                    </div>
                    <div className="col-md-2 col-sm-6">
                      <div className="bg-light border p-2 text-center rounded-2">
                        <p className="mb-1 text-truncate"><i className="ti ti-point-filled me-1 text-secondary" />No Show</p>
                        <h5 className="fw-bold mb-0">{daycareStatsSummary.noShow}</h5>
                      </div>
                    </div>
                  </div>
                  <div className="chart-set" id="s-col-19-daycare">
                    <SCol19Chart categories={daycareStatsCategories} series={daycareStatsSeries} />
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* end row - daycare chart */}
          {/* Revenue Statistics
          <div className="row mb-3">
            <div className="col-12">
              <RevenueChart />
            </div>
          </div>
          */}
          {/* Visit Revenue Statistics */}
          <div className="row mb-3">
            <div className="col-12">
              <VisitRevenueChart />
            </div>
          </div>
          {/* Daycare Revenue Statistics */}
          <div className="row mb-3">
            <div className="col-12">
              <DaycareRevenueChart />
            </div>
          </div>
          {/* start row - Recent Transactions */}
          <div className="row">
            <div className="col-12 d-flex">
              <div className="card shadow-sm flex-fill w-100">
                <div className="card-header">
                  <h5 className="fw-bold mb-0">Recent Transactions</h5>
                </div>
                <div className="card-body">
                  {transactionsLoading ? (
                    <p className="mb-0 text-muted">Loading…</p>
                  ) : recentTransactions.length === 0 ? (
                    <p className="mb-0 text-muted">No recent transactions</p>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-sm align-middle mb-0">
                        <thead>
                          <tr>
                            <th>Transaction ID</th>
                            <th>Patient</th>
                            <th>Date</th>
                            <th>Payment</th>
                            <th className="text-end">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recentTransactions.map((txn) => (
                            <tr key={txn._id}>
                              <td className="fw-semibold text-dark">{txn.transactionId || "—"}</td>
                              <td>{txn.patientName || "—"}</td>
                              <td>{formatTransactionDate(txn.transactionDate)}</td>
                              <td>{txn.paymentMode || "—"}</td>
                              <td className="text-end fw-semibold text-success">
                                {formatRevenue(txn.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {/* col end */}
          </div>
          {/* end row */}
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
      {SHOW_ABHA_FEATURES ? (
        <>
          <GenerateAbhaQrModal
            open={abhaQrModalOpen}
            onClose={() => setAbhaQrModalOpen(false)}
          />
          <AbhaScannedUsersDrawer
            open={abhaScannedUsersOpen}
            onClose={() => setAbhaScannedUsersOpen(false)}
          />
        </>
      ) : null}
    </>
  );
};

export default DashboardComponent;
