"use client";

import AuthRouteGuard from "@/components/auth/AuthRouteGuard";
import FilterDropdownInit from "@/core/common/filter/FilterDropdownInit";
import Sidebar from "@/core/common/sidebar/sidebar";
import { canAccessPath, getDefaultRouteForRole, normalizeRole } from "@/core/auth/roleAccess";
import { all_routes } from "@/routes/all_routes";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function PagesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const authUserRaw = localStorage.getItem("authUser");
    if (!authUserRaw) return;

    let role = "";
    try {
      const authUser = JSON.parse(authUserRaw) as { role?: string } | null;
      role = normalizeRole(authUser?.role);
    } catch {
      role = "";
    }

    if (!pathname) return;

    if (canAccessPath(role, pathname)) return;

    const fallback = getDefaultRouteForRole(role);
    if (fallback === all_routes.login) {
      router.replace(all_routes.login);
      return;
    }
    if (fallback === pathname) return;
    router.replace(fallback);
  }, [pathname, router]);

  return (
    <AuthRouteGuard>
      <div className="main-wrapper">
        <FilterDropdownInit />
        <Sidebar />
        {children}
      </div>
    </AuthRouteGuard>
  );
}
