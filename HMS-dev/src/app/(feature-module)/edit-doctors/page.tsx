"use client";

import { Suspense } from "react";
import EditDoctorComponent from "@/components/pages/clinic-modules/edit-doctor/editDoctor";

export default function EditDoctorsPage () {
  return (
    <Suspense
      fallback={
        <div className="page-wrapper d-flex align-items-center justify-content-center" style={{ minHeight: "60vh" }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      }
    >
      <EditDoctorComponent />
    </Suspense>
  );
}
