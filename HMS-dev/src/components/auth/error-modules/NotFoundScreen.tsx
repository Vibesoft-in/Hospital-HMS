"use client";

import PranaOSBrand from "@/core/common/pranaos-brand/PranaOSBrand";
import { isAuthenticated } from "@/core/auth/routeGuard";
import { all_routes } from "@/routes/all_routes";
import Link from "next/link";
import { useEffect, useState } from "react";

interface INotFoundScreenProps {
  backHref?: string;
  backLabel?: string;
}

const NotFoundScreen = ({ backHref, backLabel }: INotFoundScreenProps) => {
  const [resolvedBackHref, setResolvedBackHref] = useState(backHref ?? all_routes.login);
  const [resolvedBackLabel, setResolvedBackLabel] = useState(backLabel ?? "Back to Login");

  useEffect(() => {
    if (backHref) {
      setResolvedBackHref(backHref);
      setResolvedBackLabel(backLabel ?? "Go Back");
      return;
    }

    if (isAuthenticated()) {
      setResolvedBackHref(all_routes.dashboard);
      setResolvedBackLabel("Back to Dashboard");
      return;
    }

    setResolvedBackHref(all_routes.login);
    setResolvedBackLabel("Back to Login");
  }, [backHref, backLabel]);

  return (
    <div className="auth-bg position-relative overflow-hidden min-vh-100">
      <div className="container-fuild position-relative z-1">
        <div className="w-100 overflow-hidden position-relative flex-wrap d-block min-vh-100">
          <div className="row justify-content-center align-items-center min-vh-100 overflow-auto flex-wrap py-4 px-3">
            <div className="col-12 col-sm-10 col-md-8 col-lg-6 col-xl-5">
              <div className="d-flex flex-column align-items-center justify-content-center text-center">
                <div className="mx-auto mb-4">
                  <PranaOSBrand size="lg" />
                </div>

                <div
                  className="d-flex align-items-center justify-content-center rounded-circle bg-primary-subtle text-primary mb-4"
                  style={{ width: 120, height: 120 }}
                  aria-hidden="true"
                >
                  <i className="ti ti-file-off fs-1" />
                </div>

                <h4 className="mb-2 fw-bold">Oops, something went wrong</h4>
                <p className="fs-14 text-muted mb-4 px-2">
                  Error 404 — Page not found. Sorry, the page you are looking for does not exist or
                  has been moved.
                </p>

                <Link href={resolvedBackHref} className="btn btn-primary d-inline-flex align-items-center">
                  <i className="ti ti-chevron-left me-2" />
                  {resolvedBackLabel}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFoundScreen;
