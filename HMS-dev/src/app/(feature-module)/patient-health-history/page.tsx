"use client";

import { Suspense } from "react";
import PatientHealthHistoryComponent from "@/components/pages/clinic-modules/patient-details/patientHealthHistory";

function PatientHealthHistoryContent() {
  return <PatientHealthHistoryComponent />;
}

export default function PatientHealthHistoryPage() {
  return (
    <Suspense
      fallback={
        <div className="page-wrapper">
          <div className="content">
            <div className="text-center py-5">Loading...</div>
          </div>
        </div>
      }
    >
      <PatientHealthHistoryContent />
    </Suspense>
  );
}
