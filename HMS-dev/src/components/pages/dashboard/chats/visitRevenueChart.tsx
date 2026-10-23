"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import axios from "axios";
import { API_BASE_URL } from "@/environment";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface IVisitRevenuePeriodData {
  period: string;
  date?: string;
  revenue: number;
}

interface IVisitRevenueStatsResponse {
  code: number;
  data?: {
    summary?: { total: number };
    periodData?: IVisitRevenuePeriodData[];
    range?: string;
  };
}

interface IDoctorFilterItem {
  _id: string;
  name?: string;
  department?: string;
}

const VisitRevenueChart = () => {
  const [range, setRange] = useState<"daily" | "weekly" | "monthly" | "yearly">("monthly");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [doctorOptions, setDoctorOptions] = useState<IDoctorFilterItem[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
  const [periodData, setPeriodData] = useState<IVisitRevenuePeriodData[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleFetchDoctors = useCallback(async () => {
    if (!API_BASE_URL) return;
    try {
      const res = await axios.get(`${API_BASE_URL}/hospital/doctors`, {
        params: { limit: 50 },
      });
      const doctors = Array.isArray(res.data?.data?.doctors)
        ? (res.data.data.doctors as IDoctorFilterItem[])
        : [];
      setDoctorOptions(doctors);
    } catch {
      setDoctorOptions([]);
    }
  }, []);

  useEffect(() => {
    handleFetchDoctors();
  }, [handleFetchDoctors]);

  const handleFetchVisitRevenueStats = useCallback(async () => {
    if (!API_BASE_URL) return;
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = { range };
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;
      if (selectedDoctorId) params.doctorId = selectedDoctorId;
      const res = await axios.get<IVisitRevenueStatsResponse>(
        `${API_BASE_URL}/hospital/dashboard/visit-revenue-statistics`,
        { params }
      );
      if (res.data?.code === 200 && res.data?.data) {
        setPeriodData(res.data.data.periodData ?? []);
        setTotal(res.data.data.summary?.total ?? 0);
      } else {
        setPeriodData([]);
        setTotal(0);
      }
    } catch {
      setPeriodData([]);
      setTotal(0);
      setError("Failed to load visit revenue statistics.");
    } finally {
      setLoading(false);
    }
  }, [range, fromDate, toDate, selectedDoctorId]);

  useEffect(() => {
    handleFetchVisitRevenueStats();
  }, [handleFetchVisitRevenueStats]);

  const categories = periodData.map((d) =>
    range === "daily" ? d.date || d.period : d.period
  );
  const series = [
    {
      name: "Revenue",
      data: periodData.map((d) => d.revenue),
    },
  ];

  const chartOptions = {
    chart: {
      height: 280,
      type: "area" as const,
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    stroke: {
      width: 2,
      curve: "smooth" as const,
    },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.4,
        opacityTo: 0.1,
        stops: [0, 100],
      },
    },
    dataLabels: { enabled: false },
    colors: ["#2E37A4"],
    xaxis: {
      categories,
      labels: {
        style: { fontSize: "12px" },
        rotate: -45,
      },
    },
    yaxis: {
      min: 0,
      labels: {
        style: { fontSize: "12px" },
        formatter: (val: number) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`,
      },
    },
    tooltip: {
      custom: ({ series: chartSeries, dataPointIndex }: any) => {
        const revenue = chartSeries?.[0]?.[dataPointIndex] ?? 0;
        const point = periodData?.[dataPointIndex];
        const dateStr = point?.date != null ? String(point.date).trim() : "";
        const periodStr = point?.period != null ? String(point.period).trim() : "";
        const receivedDate = dateStr || periodStr || "—";
        return `<div class="apex-tooltip p-2">
          <div>Date: ${receivedDate}</div>
          <div>Revenue: ₹${Number(revenue).toLocaleString("en-IN")}</div>
        </div>`;
      },
      y: {
        formatter: (val: number) => `₹${val?.toLocaleString("en-IN") ?? 0}`,
      },
    },
    grid: {
      borderColor: "#eee",
      strokeDashArray: 4,
      padding: { left: 0, right: 0 },
    },
  };

  const formatTotal = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
  const selectedDoctorLabel =
    doctorOptions.find((doctor) => doctor?._id === selectedDoctorId)?.name?.trim() || "All doctors";

  if (loading) {
    return (
      <div className="card shadow-sm">
        <div className="card-header d-flex align-items-center justify-content-between">
          <h5 className="fw-bold mb-0">Visit Revenue Statistics</h5>
        </div>
        <div className="card-body d-flex align-items-center justify-content-center" style={{ minHeight: 320 }}>
          <p className="text-muted mb-0">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card shadow-sm">
      <div className="card-header d-flex align-items-center justify-content-between flex-wrap gap-2">
        <h5 className="fw-bold mb-0">Visit Revenue Statistics</h5>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <div className="d-flex align-items-center gap-2">
            <label className="mb-0 fs-13 text-muted">Doctor</label>
            <div className="dropdown">
              <button
                type="button"
                className="btn btn-sm px-2 border shadow-sm btn-outline-white d-inline-flex align-items-center justify-content-between text-start"
                data-bs-toggle="dropdown"
                aria-label="Filter visit revenue by doctor"
                style={{ width: "220px" }}
              >
                <span className="text-truncate d-inline-block" style={{ maxWidth: "176px" }}>
                  {selectedDoctorLabel}
                </span>
                <i className="ti ti-chevron-down ms-1 flex-shrink-0" />
              </button>
              <ul className="dropdown-menu" style={{ width: "260px", maxWidth: "90vw" }}>
                <li>
                  <button
                    type="button"
                    className={`dropdown-item ${selectedDoctorId ? "" : "active"}`}
                    onClick={() => setSelectedDoctorId("")}
                  >
                    All doctors
                  </button>
                </li>
                {doctorOptions.map((doctor) => (
                  <li key={doctor._id}>
                    <button
                      type="button"
                      className={`dropdown-item ${selectedDoctorId === doctor._id ? "active" : ""}`}
                      onClick={() => setSelectedDoctorId(doctor._id)}
                      style={{ whiteSpace: "normal", lineHeight: 1.25 }}
                    >
                      {doctor?.department
                        ? `${doctor?.name ?? "Unknown"} (${doctor.department})`
                        : doctor?.name ?? "Unknown"}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="d-flex align-items-center gap-2">
            <label className="mb-0 fs-13 text-muted">From</label>
            <input
              type="date"
              className="form-control form-control-sm"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div className="d-flex align-items-center gap-2">
            <label className="mb-0 fs-13 text-muted">To</label>
            <input
              type="date"
              className="form-control form-control-sm"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
          <div className="dropdown">
            <button
              type="button"
              className="btn btn-sm px-2 border shadow-sm btn-outline-white d-inline-flex align-items-center"
              data-bs-toggle="dropdown"
            >
              {range === "daily" ? "Daily" : range === "weekly" ? "Weekly" : range === "monthly" ? "Monthly" : "Yearly"}{" "}
              <i className="ti ti-chevron-down ms-1" />
            </button>
            <ul className="dropdown-menu dropdown-menu-end">
              <li>
                <button type="button" className="dropdown-item" onClick={() => setRange("daily")}>
                  Daily
                </button>
              </li>
              <li>
                <button type="button" className="dropdown-item" onClick={() => setRange("weekly")}>
                  Weekly
                </button>
              </li>
              <li>
                <button type="button" className="dropdown-item" onClick={() => setRange("monthly")}>
                  Monthly
                </button>
              </li>
              <li>
                <button type="button" className="dropdown-item" onClick={() => setRange("yearly")}>
                  Yearly
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <div className="card-body">
        {error && (
          <div className="alert alert-danger py-2 mb-3" role="alert">
            {error}
          </div>
        )}
        {periodData.length > 0 ? (
          <>
            <div className="mb-3">
              <span className="text-muted fs-13">Total: </span>
              <span className="fw-bold fs-18 text-primary">{formatTotal(total)}</span>
            </div>
            <div className="chart-set" id="visit-revenue-chart">
              <Chart options={chartOptions} series={series} type="area" height={280} />
            </div>
          </>
        ) : (
          <div className="d-flex align-items-center justify-content-center text-muted" style={{ minHeight: 280 }}>
            No visit revenue data available.
          </div>
        )}
      </div>
    </div>
  );
};

export default VisitRevenueChart;
