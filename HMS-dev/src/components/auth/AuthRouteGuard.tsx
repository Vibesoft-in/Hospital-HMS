"use client";

import NotFoundScreen from "@/components/auth/error-modules/NotFoundScreen";
import { isAuthenticated, isPublicPath } from "@/core/auth/routeGuard";
import { setHmsAuthCookie } from "@/core/auth/sessionCookie";
import { getAccessToken, silentRefresh } from "@/core/auth/inMemoryToken";
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
      const currentPath = pathname ?? "";
      if (isPublicPath(currentPath)) {
        setChecked(true);
        setAuthed(true);
        return;
      }

      const hasAuthUser = typeof window !== "undefined" && Boolean(window.localStorage.getItem("authUser"));
      const hasCookie = typeof document !== "undefined" && document.cookie?.includes("hms_auth=1");

      if (!hasAuthUser && !hasCookie && !getAccessToken()) {
        if (!cancelled) {
          setAuthed(false);
          setChecked(true);
        }
        return;
      }

      let token = getAccessToken();
      if (!token) {
        token = await silentRefresh();
      }
      if (cancelled) return;
      const authenticated = Boolean(token || isAuthenticated());
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
        <div className="text-center">
          <div className="spinner-border text-primary mb-2" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
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
