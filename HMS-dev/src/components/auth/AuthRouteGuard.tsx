"use client";

import NotFoundScreen from "@/components/auth/error-modules/NotFoundScreen";
import { isAuthenticated, isPublicPath } from "@/core/auth/routeGuard";
import { setHmsAuthCookie } from "@/core/auth/sessionCookie";
import { isSharedAuthEnabled, syncHospitalSessionFromSharedCookie } from "@/core/auth/sharedAuth";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

interface IAuthRouteGuardProps {
  children: React.ReactNode;
}

const AuthRouteGuard = ({ children }: IAuthRouteGuardProps) => {
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const verifySession = async () => {
      if (isSharedAuthEnabled() && !localStorage.getItem("authToken")) {
        await syncHospitalSessionFromSharedCookie();
      }
      if (cancelled) return;
      const authenticated = isAuthenticated();
      if (authenticated) {
        setHmsAuthCookie();
      }
      setAuthed(authenticated);
      setChecked(true);
    };

    void verifySession();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (!checked) {
    return (
      <div className="auth-bg d-flex align-items-center justify-content-center min-vh-100">
        <span className="text-muted">Loading...</span>
      </div>
    );
  }

  const currentPath = pathname ?? "";
  if (!isPublicPath(currentPath) && !authed) {
    return <NotFoundScreen />;
  }

  return <>{children}</>;
};

export default AuthRouteGuard;
