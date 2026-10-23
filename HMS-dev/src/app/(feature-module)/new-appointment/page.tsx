"use client";

import { Suspense } from "react";
import NewAppointmentComponent from "@/components/pages/clinic-modules/new-appointment/newAppointment";

export default function NewAppointmentPage() {
  return (
    <div>
      <Suspense fallback={<div className="p-4 text-muted">Loading…</div>}>
        <NewAppointmentComponent />
      </Suspense>
    </div>
  );
}
