"use client";


import Sidebarthree from "@/core/common/sidebarthree/sidebarthree";

export default function PatientDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <Sidebarthree />
      {children}
    </div>
  );
}
