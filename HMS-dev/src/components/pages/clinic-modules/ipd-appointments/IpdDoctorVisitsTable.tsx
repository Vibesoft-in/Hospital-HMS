"use client";

import type { IIpdDoctorVisitRow } from "@/components/pages/clinic-modules/ipd-appointments/ipdDoctorVisitRows";

interface IIpdDoctorVisitsTableProps {
  visits: IIpdDoctorVisitRow[];
  onIncrementDays: (doctorId: string) => void;
  onDecrementDays: (doctorId: string) => void;
  onRemove: (doctorId: string) => void;
}

const IpdDoctorVisitsTable = ({
  visits,
  onIncrementDays,
  onDecrementDays,
  onRemove,
}: IIpdDoctorVisitsTableProps) => {
  return (
    <div className="border rounded overflow-hidden">
      <div
        className="d-flex border-bottom bg-light px-2 py-1 fw-medium text-dark"
        style={{ fontSize: "0.95rem" }}
      >
        <span className="col-1 text-nowrap">S.No</span>
        <span className="col text-nowrap ps-3">Doctor</span>
        <span className="col-3 text-center text-nowrap">Days</span>
        <span className="col text-end pe-4 text-nowrap">Price</span>
      </div>
      <div
        className="text-dark"
        style={{ maxHeight: "170px", overflowY: "auto", fontSize: "0.95rem" }}
      >
        {visits.length === 0 ? (
          <div className="px-2 py-3 text-center">No visiting doctors added</div>
        ) : (
          visits.map((visit, idx) => (
            <div
              key={visit.doctorId}
              className="d-flex align-items-center border-bottom px-2 py-2"
            >
              <span className="col-1">{idx + 1}</span>
              <span className="col ps-3">{visit.name}</span>
              <span className="col-3 d-flex align-items-center justify-content-center gap-1">
                <button
                  type="button"
                  className="btn btn-sm btn-light border px-2 py-0"
                  aria-label={`Decrease days for ${visit.name}`}
                  onClick={() => onDecrementDays(visit.doctorId)}
                >
                  <i className="ti ti-minus fs-14" />
                </button>
                <span className="fw-semibold text-center" style={{ minWidth: "1.5rem" }}>
                  {visit.days}
                </span>
                <button
                  type="button"
                  className="btn btn-sm btn-light border px-2 py-0"
                  aria-label={`Increase days for ${visit.name}`}
                  onClick={() => onIncrementDays(visit.doctorId)}
                >
                  <i className="ti ti-plus fs-14" />
                </button>
              </span>
              <span className="col d-flex align-items-center justify-content-end gap-1">
                <span>₹{(visit.chargePerDay * visit.days).toFixed(2)}</span>
                <button
                  type="button"
                  className="btn btn-link p-0 text-danger min-w-0"
                  aria-label={`Remove ${visit.name}`}
                  onClick={() => onRemove(visit.doctorId)}
                >
                  <i className="ti ti-trash ps-1 fs-16" />
                </button>
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default IpdDoctorVisitsTable;
