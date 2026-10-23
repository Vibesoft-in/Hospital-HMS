"use client";


import { Suspense } from "react";
import PatientDetailsComponent from "@/components/pages/clinic-modules/patient-details/patientDetails";

function PatientDetailsContent() {
  return <PatientDetailsComponent />;
}

export default function PatientDetailsPage () {
  return (
    <Suspense fallback={<div className="page-wrapper"><div className="content"><div className="text-center py-5">Loading...</div></div></div>}>
      <PatientDetailsContent />
    </Suspense>
  );
}
