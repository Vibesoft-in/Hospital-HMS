"use client";

import DashboardComponent from "@/components/pages/dashboard/dashboard/dashboard";
import DashboardPasswordGate from "@/components/pages/dashboard/dashboard/DashboardPasswordGate";

export default function AdminDashboard() {
  return (
    <DashboardPasswordGate>
      <DashboardComponent />
    </DashboardPasswordGate>
  );
}
