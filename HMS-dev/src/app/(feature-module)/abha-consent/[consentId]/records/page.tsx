"use client";

import { Suspense } from "react";
import AbhaConsentFacilityRecordsComponent from "@/components/pages/clinic-modules/abha-consent/abhaConsentFacilityRecords";

function AbhaConsentFacilityRecordsContent() {
  return <AbhaConsentFacilityRecordsComponent />;
}

export default function AbhaConsentFacilityRecordsPage() {
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
      <AbhaConsentFacilityRecordsContent />
    </Suspense>
  );
}
