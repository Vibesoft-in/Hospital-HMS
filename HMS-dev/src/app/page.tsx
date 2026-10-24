"use client";

import { setHmsAuthCookie } from "@/core/auth/sessionCookie";
import { getAccessToken, silentRefresh } from "@/core/auth/inMemoryToken";
import { all_routes } from "@/routes/all_routes";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    const navigateTo = (target: string) => {
      try {
        router.replace(target);
      } catch {
        // fallback
      }
      if (typeof window !== "undefined") {
        setTimeout(() => {
          if (window.location.pathname === "/" || window.location.pathname === "") {
            window.location.replace(target);
          }
        }, 120);
      }
    };

    (async () => {
      // 1. If completely unauthenticated, redirect to login immediately
      const userString = typeof window !== "undefined" ? window.localStorage.getItem("authUser") : null;
      let token = getAccessToken();

      if (!token && !userString) {
        navigateTo(all_routes.login);
        return;
      }

      if (!token) {
        token = await silentRefresh();
      }
      if (cancelled) return;

      const freshUserString = typeof window !== "undefined" ? window.localStorage.getItem("authUser") : null;

      if (!token && !freshUserString) {
        navigateTo(all_routes.login);
        return;
      }

      setHmsAuthCookie();

      let role = "";
      try {
        const user = freshUserString ? JSON.parse(freshUserString) : null;
        role = user?.role?.toUpperCase?.() ?? "";
      } catch {
        role = "";
      }

      if (role === "RECEPTIONIST") {
        navigateTo(all_routes.appointments);
        return;
      }

      navigateTo(all_routes.dashboard);
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="d-flex align-items-center justify-content-center vh-100 bg-light">
      <div className="text-center">
        <div className="spinner-border text-primary mb-2" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <div className="text-muted fs-14">Redirecting...</div>
      </div>
    </div>
  );
}
