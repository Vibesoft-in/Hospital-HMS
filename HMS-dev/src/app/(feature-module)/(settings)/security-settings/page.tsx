"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { all_routes } from "@/routes/all_routes";
import SecuritySettingsComponent from "@/components/pages/settings/account-settings/security-settings/securitySettings";

export default function SecuritySettings() {
  const router = useRouter();
  const reduxRole = useSelector((state: any) => state.auth?.user?.role);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    let role = (reduxRole || "").trim().toUpperCase();
    if (!role) {
      try {
        const raw = typeof window !== "undefined" ? (localStorage.getItem("authUser") || localStorage.getItem("hospitalUser")) : null;
        if (raw) {
          const parsed = JSON.parse(raw);
          role = (parsed?.role || "").trim().toUpperCase();
        }
      } catch {}
    }

    if (role === "ADMIN") {
      setIsAdmin(true);
      return;
    }

    setIsAdmin(false);
    router.replace(all_routes.dashboard || "/dashboard");
  }, [reduxRole, router]);

  if (isAdmin !== true) {
    return null;
  }

  return (
    <div>
      <SecuritySettingsComponent />
    </div>
  );
}
