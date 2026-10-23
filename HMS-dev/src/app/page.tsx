"use client";

import { isSharedAuthEnabled, syncHospitalSessionFromSharedCookie } from "@/core/auth/sharedAuth";
import { setHmsAuthCookie } from "@/core/auth/sessionCookie";
import { all_routes } from "@/routes/all_routes";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled && isSharedAuthEnabled() && !localStorage.getItem("authToken")) {
        await syncHospitalSessionFromSharedCookie();
      }
      if (cancelled) return;

      const authToken = localStorage.getItem("authToken");
      const userString = localStorage.getItem("authUser");

      if (!authToken) {
        router.replace(all_routes.login);
        return;
      }

      setHmsAuthCookie();

      let role = "";
      try {
        const user = userString ? JSON.parse(userString) : null;
        role = user?.role?.toUpperCase?.() ?? "";
      } catch {
        role = "";
      }

      if (role === "RECEPTIONIST") {
        router.replace(all_routes.appointments);
        return;
      }

      router.replace(all_routes.dashboard);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="d-flex align-items-center justify-content-center vh-100">
      <span className="text-muted">Loading...</span>
    </div>
  );
}
