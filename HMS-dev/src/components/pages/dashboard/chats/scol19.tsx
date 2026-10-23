"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface ISCol19ChartProps {
  categories?: string[];
  series?: ApexAxisChartSeries;
}

const SCol19Chart = ({ categories, series }: ISCol19ChartProps) => {
  const defaultCategories = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const seriesColors = ["#28a745", "#1E90FF", "#ffc107", "#dc3545", "#6c757d"];

  const chartOptions = useMemo<any>(() => ({
    chart: {
      type: "bar",
      height: 250,
      stacked: true,
      toolbar: { show: false },
      sparkline: { enabled: false },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "25%",
        borderRadius: 3,
        distributed: false,
      },
    },
    dataLabels: { enabled: false },
    stroke: {
      show: true,
      width: 0,
      colors: ["#fff"],
    },
    colors: seriesColors,
    xaxis: {
      categories: categories ?? defaultCategories,
      labels: { style: { fontSize: "14px" } },
      axisBorder: { show: false },
      axisTicks: { show: false },
      tickPlacement: "between",
    },
    yaxis: {
      labels: {
        style: { fontSize: "14px" },
        offsetX: -10,
      },
    },
    legend: { position: "bottom" },
    grid: {
      show: true,
      strokeDashArray: 4,
      padding: { left: 0, right: -10 },
    },
    tooltip: {
      enabled: true,
      shared: true,
      intersect: false,
      custom: ({ series: s, dataPointIndex, w }: { series: number[][]; dataPointIndex: number; w: any }) => {
        const cats = w.globals.categoryLabels ?? w.globals.labels ?? [];
        const label = cats[dataPointIndex] ?? "";
        let html = `<div style="padding:8px 12px;font-size:13px"><strong>${label}</strong>`;
        s.forEach((seriesData: number[], idx: number) => {
          const name = w.globals.seriesNames[idx] ?? "";
          const color = seriesColors[idx] ?? "#000";
          html += `<div style="display:flex;align-items:center;gap:6px;margin-top:4px"><span style="width:10px;height:10px;border-radius:50%;background:${color};display:inline-block"></span>${name}: <strong>${seriesData[dataPointIndex] ?? 0}</strong></div>`;
        });
        html += `</div>`;
        return html;
      },
    },
  }), [categories]);

  const defaultSeries: ApexAxisChartSeries = [
    { name: "Completed", data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { name: "Scheduled", data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { name: "In Progress", data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { name: "Cancelled", data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { name: "No Show", data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  ];

  return (
    <div id="s-col-19">
      <Chart options={chartOptions} series={series ?? defaultSeries} type="bar" height={250} />
    </div>
  );
};

export default SCol19Chart;
