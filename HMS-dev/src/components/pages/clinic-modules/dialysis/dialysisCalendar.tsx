"use client";

import DialysisSessionsCalendar from "@/components/pages/clinic-modules/dialysis/dialysisSessionsCalendar";

const DialysisCalendarComponent = () => {
  return (
    <div className="page-wrapper">
      <div className="content">
        <div className="d-flex align-items-sm-center flex-sm-row flex-column gap-2 mb-3 pb-3 border-bottom">
          <div className="flex-grow-1">
            <h4 className="fw-bold mb-0">Dialysis Calendar</h4>
          </div>
        </div>
        <DialysisSessionsCalendar />
      </div>
    </div>
  );
};

export default DialysisCalendarComponent;
