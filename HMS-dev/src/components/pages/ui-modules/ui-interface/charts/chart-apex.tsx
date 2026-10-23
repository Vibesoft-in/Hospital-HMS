"use client";
import { useState, type ReactNode } from "react";
// Dynamically import ReactApexChart with SSR disabled
const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });
import type { ApexOptions } from "apexcharts";

const routes = all_routes;

// ErrorBoundary component
import React from "react";
import { all_routes } from "@/routes/all_routes";
import Link from "next/link";
import dynamic from "next/dynamic";
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}
interface ErrorBoundaryState {
  hasError: boolean;
}
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // You can log error here
    console.error("Chart Error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback || <div>Something went wrong rendering the chart.</div>;
    }
    return this.props.children;
  }
}

const ApexchartComponent: React.FC = () => {
  // Use ApexOptions for type safety
  const [sline] = useState<ApexOptions>({
    chart: {
      height: 350,
      type: "line",
      zoom: { enabled: false },
      toolbar: { show: false },
    },
    dataLabels: { enabled: false },
    stroke: { curve: "straight" },
    series: [
      {
        name: "Desktops",
        data: [10, 41, 35, 51, 49, 62, 69, 91, 148],
      },
    ],
    grid: {
      row: {
        colors: ["#f1f2f3", "transparent"],
        opacity: 0.5,
      },
    },
    xaxis: {
      categories: [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep",
      ],
    },
  });

  const [sLineArea] = useState<ApexOptions>({
    chart: { height: 350, type: "area", toolbar: { show: false } },
    dataLabels: { enabled: false },
    stroke: { curve: "smooth" },
    title: { text: "Product Trends by Month", align: "left" },
    series: [
      { name: "series1", data: [31, 40, 28, 51, 42, 109, 100] },
      { name: "series2", data: [11, 32, 45, 32, 34, 52, 41] },
    ],
    xaxis: {
      type: "datetime",
      categories: [
        "2018-09-19T00:00:00",
        "2018-09-19T01:30:00",
        "2018-09-19T02:30:00",
        "2018-09-19T03:30:00",
        "2018-09-19T04:30:00",
        "2018-09-19T05:30:00",
        "2018-09-19T06:30:00",
      ],
    },
    tooltip: { x: { format: "dd/MM/yy HH:mm" } },
  });

  const [sCol] = useState<ApexOptions>({
    chart: { height: 350, type: "bar", toolbar: { show: false } },
    plotOptions: {
      bar: { horizontal: false, columnWidth: "55%" },
    },
    dataLabels: { enabled: false },
    stroke: { show: true, width: 2, colors: ["transparent"] },
    series: [
      { name: "Net Profit", data: [44, 55, 57, 56, 61, 58, 63, 60, 66] },
      { name: "Revenue", data: [76, 85, 101, 98, 87, 105, 91, 114, 94] },
    ],
    xaxis: {
      categories: [
        "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct",
      ],
    },
    yaxis: { title: { text: "$ (thousands)" } },
    fill: { opacity: 1 },
    tooltip: {
      y: {
        formatter: function (val: number) {
          return "$ " + val + " thousands";
        },
      },
    },
  });

  const [sColStacked] = useState<ApexOptions>({
    chart: { height: 350, type: "bar", stacked: true, toolbar: { show: false } },
    responsive: [
      {
        breakpoint: 480,
        options: {
          legend: { position: "bottom", offsetX: -10, offsetY: 0 },
        },
      },
    ],
    plotOptions: { bar: { horizontal: false } },
    series: [
      { name: "PRODUCT A", data: [44, 55, 41, 67, 22, 43] },
      { name: "PRODUCT B", data: [13, 23, 20, 8, 13, 27] },
      { name: "PRODUCT C", data: [11, 17, 15, 15, 21, 14] },
      { name: "PRODUCT D", data: [21, 7, 25, 13, 22, 8] },
    ],
    xaxis: {
      type: "datetime",
      categories: [
        "01/01/2011 GMT",
        "01/02/2011 GMT",
        "01/03/2011 GMT",
        "01/04/2011 GMT",
        "01/05/2011 GMT",
        "01/06/2011 GMT",
      ],
    },
    legend: { position: "right", offsetY: 40 },
    fill: { opacity: 1 },
  });

  const [sBar] = useState<ApexOptions>({
    chart: { height: 350, type: "bar", toolbar: { show: false } },
    plotOptions: { bar: { horizontal: true } },
    dataLabels: { enabled: false },
    series: [
      {
        data: [400, 430, 448, 470, 540, 580, 690, 1100, 1200, 1380],
      },
    ],
    xaxis: {
      categories: [
        "South Korea", "Canada", "United Kingdom", "Netherlands", "Italy",
        "France", "Japan", "United States", "China", "Germany",
      ],
    },
  });

  const [options] = useState<ApexOptions>({
    chart: { height: 350, type: "line", toolbar: { show: false } },
    series: [
      {
        name: "Website Blog",
        type: "column",
        data: [440, 505, 414, 671, 227, 413, 201, 352, 752, 320, 257, 160],
      },
      {
        name: "Social Media",
        type: "line",
        data: [23, 42, 35, 27, 43, 22, 17, 31, 22, 22, 12, 16],
      },
    ],
    stroke: { width: [0, 4] },
    title: { text: "Traffic Sources" },
    labels: [
      "01 Jan 2001", "02 Jan 2001", "03 Jan 2001", "04 Jan 2001",
      "05 Jan 2001", "06 Jan 2001", "07 Jan 2001", "08 Jan 2001",
      "09 Jan 2001", "10 Jan 2001", "11 Jan 2001", "12 Jan 2001",
    ],
    xaxis: { type: "datetime" },
    yaxis: [
      { title: { text: "Website Blog" } },
      { opposite: true, title: { text: "Social Media" } },
    ],
  });

  const [donutChart] = useState<ApexOptions>({
    chart: { height: 350, type: "donut", toolbar: { show: false } },
    series: [44, 55, 41, 17],
    responsive: [
      {
        breakpoint: 480,
        options: {
          chart: { width: 200 },
          legend: { position: "bottom" },
        },
      },
    ],
  });

  const [radialChart] = useState<ApexOptions>({
    chart: { height: 350, type: "radialBar", toolbar: { show: false } },
    plotOptions: {
      radialBar: {
        dataLabels: {
          name: { fontSize: "22px" },
          value: { fontSize: "16px" },
          total: {
            show: true,
            label: "Total",
            formatter: function () {
              return "249";
            },
          },
        },
      },
    },
    series: [44, 55, 67, 83],
    labels: ["Apples", "Oranges", "Bananas", "Berries"],
  });

  return (
    <div className="page-wrapper">
      <div className="content">
         {/* Page Header */}
          <div className="d-flex align-items-sm-center flex-sm-row flex-column gap-2 pb-3">
            <div className="flex-grow-1">
              <h4 className="fs-18 fw-semibold mb-0">Apex Chart</h4>
            </div>
            <div className="text-end">
              <ol className="breadcrumb m-0 py-0">
                <li className="breadcrumb-item">
                  <Link href="#">Home</Link>
                </li>
                <li className="breadcrumb-item">
                  <Link href="#">Chart</Link>
                </li>
                <li className="breadcrumb-item active">Apex Chart</li>
              </ol>
            </div>
          </div>
          {/* End Page Header */}
        <div className="row">
          {/* Chart */}
          <div className="col-md-6">
            <div className="card">
              <div className="card-header">
                <h5 className="card-title">Apex Simple</h5>
              </div>
              <div className="card-body">
                <div id="s-line" />
                <ErrorBoundary>
                  <ReactApexChart
                    options={sLineArea}
                    series={sLineArea.series as ApexAxisChartSeries}
                    type="line"
                    height={350}
                  />
                </ErrorBoundary>
              </div>
            </div>
          </div>
          {/* /Chart */}
          {/* Chart */}
          <div className="col-md-6">
            <div className="card">
              <div className="card-header">
                <h5 className="card-title">Area Chart</h5>
              </div>
              <div className="card-body">
                <div id="s-line-area" />
                <ErrorBoundary>
                  <ReactApexChart
                    options={sline}
                    series={sline.series as ApexAxisChartSeries}
                    type="area"
                    height={350}
                  />
                </ErrorBoundary>
              </div>
            </div>
          </div>
          {/* /Chart */}
          {/* Chart */}
          <div className="col-md-6">
            <div className="card">
              <div className="card-header">
                <h5 className="card-title">Column Chart</h5>
              </div>
              <div className="card-body">
                <div id="s-col" />
                <ErrorBoundary>
                  <ReactApexChart
                    options={sCol}
                    series={sCol.series as ApexAxisChartSeries}
                    type="bar"
                    height={350}
                  />
                </ErrorBoundary>
              </div>
            </div>
          </div>
          {/* /Chart */}
          {/* Chart */}
          <div className="col-md-6">
            <div className="card">
              <div className="card-header">
                <h5 className="card-title">Column Stacked Chart</h5>
              </div>
              <div className="card-body">
                <div id="s-col-stacked" />
                <ErrorBoundary>
                  <ReactApexChart
                    options={sColStacked}
                    series={sColStacked.series as ApexAxisChartSeries}
                    type="bar"
                    height={350}
                  />
                </ErrorBoundary>
              </div>
            </div>
          </div>
          {/* /Chart */}
          {/* Chart */}
          <div className="col-md-6">
            <div className="card">
              <div className="card-header">
                <h5 className="card-title">Bar Chart</h5>
              </div>
              <div className="card-body">
                <div id="s-bar" />
                <ErrorBoundary>
                  <ReactApexChart
                    options={sBar}
                    series={sBar.series as ApexAxisChartSeries}
                    type="bar"
                    height={350}
                  />
                </ErrorBoundary>
              </div>
            </div>
          </div>
          {/* /Chart */}
          {/* Chart */}
          <div className="col-md-6">
            <div className="card">
              <div className="card-header">
                <h5 className="card-title">Mixed Chart</h5>
              </div>
              <div className="card-body">
                <div id="mixed-chart" />
                <ErrorBoundary>
                  <ReactApexChart
                    options={options}
                    series={options.series as ApexAxisChartSeries}
                    type="line"
                    height={350}
                  />
                </ErrorBoundary>
              </div>
            </div>
          </div>
          {/* /Chart */}
          {/* Chart */}
          <div className="col-md-6">
            <div className="card">
              <div className="card-header">
                <h5 className="card-title">Donut Chart</h5>
              </div>
              <div className="card-body">
                <div id="donut-chart" />
                <ErrorBoundary>
                  <ReactApexChart
                    options={donutChart}
                    series={donutChart.series as ApexNonAxisChartSeries}
                    type="donut"
                    height={350}
                  />
                </ErrorBoundary>
              </div>
            </div>
          </div>
          {/* /Chart */}
          {/* Chart */}
          <div className="col-md-6">
            <div className="card">
              <div className="card-header">
                <h5 className="card-title">Radial Chart</h5>
              </div>
              <div className="card-body">
                <div id="radial-chart" />
                <ErrorBoundary>
                  <ReactApexChart
                    options={radialChart}
                    series={radialChart.series as ApexNonAxisChartSeries}
                    type="radialBar"
                    height={350}
                  />
                </ErrorBoundary>
              </div>
            </div>
          </div>
          {/* /Chart */}
        </div>
      </div>
    </div>
  );
};

export default ApexchartComponent;
