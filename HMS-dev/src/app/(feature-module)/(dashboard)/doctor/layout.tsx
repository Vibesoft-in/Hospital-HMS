"use client";
import SidebarTwo from "@/core/common/sidebar-two/sidebarTwo";



export default function DoctorDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <SidebarTwo />
      {children}
    </div>
  );
}
