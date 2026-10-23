"use client";

import { useMemo, useState } from "react";
import {
  computeBedSummary,
  type IIpdBed,
  type IIpdBedBlockViewData,
  type IIpdBedSummary,
  type IpdBedStatus,
} from "./ipdBedTypes";
import type { IIpdWardOption } from "./fetchIpdBedBlockView";

const BED_STATUS_STYLES: Record<
  IpdBedStatus,
  { bg: string; label: string; countKey: keyof Pick<IIpdBedSummary, "available" | "occupied" | "reserved" | "maintenance"> }
> = {
  available: { bg: "#5cb85c", label: "Available", countKey: "available" },
  occupied: { bg: "#e8837a", label: "Occupied", countKey: "occupied" },
  reserved: { bg: "#f0a830", label: "Reserved", countKey: "reserved" },
  maintenance: { bg: "#9e9e9e", label: "Maintenance", countKey: "maintenance" },
};

interface IIpdBedSelectionStepProps {
  data: IIpdBedBlockViewData | null;
  loading?: boolean;
  error?: string;
  selectedBedId: string | null;
  onSelectBed: (bed: IIpdBed) => void;
  wardOptions?: IIpdWardOption[];
  selectedWardId?: string | null;
  onWardFilterChange?: (wardId: string | null) => void;
  wardsLoading?: boolean;
  /** Ward card columns in the grid (beds map uses 3). */
  wardGridCols?: 2 | 3;
}

const getWardGridRowClass = (cols: 2 | 3): string =>
  cols === 3
    ? "row row-cols-1 row-cols-md-2 row-cols-lg-3 g-3 g-md-4"
    : "row row-cols-1 row-cols-sm-2 g-3 g-md-4";

const getBedHoverLines = (bed: IIpdBed): string[] => {
  const style = BED_STATUS_STYLES[bed.status];
  const lines: string[] = [`Status: ${style.label}`];
  if (bed.patientName) lines.push(`Patient: ${bed.patientName}`);
  if (bed.patientMrdNo) lines.push(`MRD No.: ${bed.patientMrdNo}`);
  if (bed.dayLabel) lines.push(bed.dayLabel);
  return lines;
};

const buildBedAriaLabel = (bed: IIpdBed): string => {
  const details = getBedHoverLines(bed).join(", ");
  return `Bed ${bed.bedCode}, ${details}`;
};

interface IIpdBedCardProps {
  bed: IIpdBed;
  isSelectable: boolean;
  isSelected: boolean;
  onSelectBed: (bed: IIpdBed) => void;
}

const IpdBedCard = ({ bed, isSelectable, isSelected, onSelectBed }: IIpdBedCardProps) => {
  const style = BED_STATUS_STYLES[bed.status];
  const hoverLines = getBedHoverLines(bed);

  return (
    <div className="ipd-bed-card-wrap position-relative w-100">
      <button
        type="button"
        disabled={!isSelectable}
        onClick={() => isSelectable && onSelectBed(bed)}
        className="ipd-bed-card-btn border-0 rounded-2 text-white d-flex align-items-center justify-content-center w-100"
        style={{
          backgroundColor: style.bg,
          minHeight: "72px",
          padding: "8px 10px",
          cursor: isSelectable ? "pointer" : "not-allowed",
          opacity: isSelectable ? 1 : 0.92,
          boxShadow: isSelected ? "0 0 0 3px var(--primary), 0 0 0 5px #fff" : undefined,
          transform: isSelected ? "scale(1.03)" : undefined,
          transition: "transform 0.15s ease, box-shadow 0.15s ease",
        }}
        aria-label={buildBedAriaLabel(bed)}
        aria-pressed={isSelected}
        aria-describedby={`ipd-bed-tooltip-${bed._id}`}
      >
        <span className="fw-bold fs-14 lh-sm text-center text-break">{bed.bedCode}</span>
      </button>
      <div
        id={`ipd-bed-tooltip-${bed._id}`}
        role="tooltip"
        className="ipd-bed-card-tooltip position-absolute start-50 translate-middle-x text-start rounded-2 shadow"
      >
        {hoverLines.map((line) => (
          <span key={line} className="d-block fs-12 lh-sm">
            {line}
          </span>
        ))}
      </div>
    </div>
  );
};

const formatWardCardTitle = (name: string, charge?: number): string => {
  if (charge == null || !Number.isFinite(charge)) return name;
  return `${name}/${charge.toLocaleString("en-IN")}`;
};

interface IIpdWardBedCardProps {
  wardId: string;
  wardName: string;
  chargePerDay?: number;
  beds: IIpdBed[];
  selectedBedId: string | null;
  onSelectBed: (bed: IIpdBed) => void;
}

const IpdWardBedCard = ({
  wardId,
  wardName,
  chargePerDay,
  beds,
  selectedBedId,
  onSelectBed,
}: IIpdWardBedCardProps) => (
  <div className="ipd-ward-bed-card h-100 border rounded-3 p-3 p-sm-4 bg-white shadow-sm">
    <h6 className="fw-bold text-dark mb-3 mb-sm-4 fs-14 text-capitalize lh-sm">
      {formatWardCardTitle(wardName, chargePerDay)}
    </h6>
    <div className="ipd-ward-beds-grid" role="list" aria-label={`${wardName} beds`}>
      {beds.map((bed) => {
        const isSelectable = bed.status === "available";
        const isSelected = selectedBedId === bed._id;
        return (
          <div key={`${wardId}-${bed._id}`} className="ipd-ward-beds-grid__item" role="listitem">
            <IpdBedCard
              bed={bed}
              isSelectable={isSelectable}
              isSelected={isSelected}
              onSelectBed={onSelectBed}
            />
          </div>
        );
      })}
    </div>
  </div>
);

const shellClass = "px-3 px-md-4 pt-1 pb-4 w-100";

const EMPTY_BED_SUMMARY: IIpdBedSummary = {
  total: 0,
  available: 0,
  occupied: 0,
  reserved: 0,
  maintenance: 0,
  occupancyPercent: 0,
};

interface IBedStatusLegendProps {
  summary: IIpdBedSummary;
  activeStatus: IpdBedStatus | null;
  onStatusFilter: (status: IpdBedStatus | null) => void;
}

const BedStatusLegend = ({ summary, activeStatus, onStatusFilter }: IBedStatusLegendProps) => (
  <div className="d-flex flex-wrap justify-content-center align-items-center gap-2 gap-md-3 mb-3">
    {(Object.keys(BED_STATUS_STYLES) as IpdBedStatus[]).filter((s) => s !== "reserved").map((status) => {
      const style = BED_STATUS_STYLES[status];
      const count = summary[style.countKey] ?? 0;
      const isActive = activeStatus === status;
      return (
        <button
          key={status}
          type="button"
          onClick={() => onStatusFilter(isActive ? null : status)}
          className={`d-flex align-items-center gap-1 rounded-pill px-2 py-1 fs-12 fw-medium text-nowrap ${
            isActive ? "text-white" : "bg-white text-dark"
          }`}
          style={{
            cursor: "pointer",
            backgroundColor: isActive ? style.bg : undefined,
            border: isActive ? `1px solid ${style.bg}` : "1px solid #dee2e6",
            lineHeight: 1.4,
            transition: "all 0.2s ease",
          }}
          aria-pressed={isActive}
        >
          <span
            className="rounded-circle d-inline-block flex-shrink-0"
            style={{
              width: 8,
              height: 8,
              backgroundColor: isActive ? "#fff" : style.bg,
            }}
            aria-hidden
          />
          {style.label} ({count})
        </button>
      );
    })}
    {activeStatus ? (
      <button
        type="button"
        onClick={() => onStatusFilter(null)}
        className="btn btn-sm btn-outline-secondary rounded-pill fs-12 fw-medium px-2 py-1"
        style={{ lineHeight: 1.4 }}
      >
        <i className="ti ti-x me-1" style={{ fontSize: 10 }} aria-hidden />
        Clear
      </button>
    ) : null}
    <span className="d-none d-md-inline text-muted">|</span>
    <span className="fs-13 text-dark fw-medium text-nowrap">
      Total <span className="fw-bold">({summary.total})</span>
    </span>
    <span className="fs-13 text-muted text-nowrap">
      Occupancy <span className="fw-bold text-dark">{summary.occupancyPercent}%</span>
    </span>
  </div>
);

interface IIpdBedWardFilterProps {
  wardOptions?: IIpdWardOption[];
  selectedWardId?: string | null;
  onWardFilterChange?: (wardId: string | null) => void;
  wardsLoading?: boolean;
}

const wardPillClass = (active: boolean) =>
  `btn btn-sm rounded-pill flex-shrink-0 fs-12 fw-medium px-2 py-1 ${
    active ? "btn-primary" : "btn-outline-primary"
  }`;

export const IpdBedWardFilter = ({
  wardOptions = [],
  selectedWardId = null,
  onWardFilterChange,
  wardsLoading = false,
}: IIpdBedWardFilterProps) => {
  const handleSelect = (wardId: string | null) => {
    if (!onWardFilterChange || wardsLoading) return;
    onWardFilterChange(wardId);
  };

  if (!onWardFilterChange) return null;

  return (
    <div
      className="d-flex flex-nowrap gap-1 gap-sm-2 overflow-auto w-100"
      role="tablist"
      aria-label="Filter by ward"
    >
      <button
        type="button"
        role="tab"
        aria-selected={!selectedWardId}
        disabled={wardsLoading}
        onClick={() => handleSelect(null)}
        className={wardPillClass(!selectedWardId)}
      >
        All
      </button>
      {wardOptions.map((ward) => {
        const isActive = selectedWardId === ward.value;
        return (
          <button
            key={ward.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            disabled={wardsLoading}
            onClick={() => handleSelect(ward.value)}
            className={wardPillClass(isActive)}
          >
            {ward.label}
          </button>
        );
      })}
      {wardsLoading ? (
        <span className="d-flex align-items-center px-2 flex-shrink-0">
          <span className="spinner-border spinner-border-sm text-primary" role="status" aria-hidden />
        </span>
      ) : null}
    </div>
  );
};

const IpdBedSelectionStep = ({
  data,
  loading = false,
  error = "",
  selectedBedId,
  onSelectBed,
  wardOptions = [],
  selectedWardId = null,
  onWardFilterChange,
  wardsLoading = false,
  wardGridCols = 2,
}: IIpdBedSelectionStepProps) => {
  const [statusFilter, setStatusFilter] = useState<IpdBedStatus | null>(null);

  const wardChargeById = useMemo(
    () =>
      Object.fromEntries(
        wardOptions
          .filter((w) => w.chargePerDay != null)
          .map((w) => [w.value, w.chargePerDay as number])
      ),
    [wardOptions]
  );

  const summary = useMemo((): IIpdBedSummary => {
    if (data?.summary) return data.summary;
    if (data?.wards?.length) return computeBedSummary(data.wards);
    return EMPTY_BED_SUMMARY;
  }, [data]);

  const filteredWards = useMemo(() => {
    if (!statusFilter || !data?.wards) return data?.wards ?? [];
    return data.wards
      .map((ward) => ({
        ...ward,
        beds: ward.beds.filter((bed) => bed.status === statusFilter),
      }))
      .filter((ward) => ward.beds.length > 0);
  }, [data, statusFilter]);

  const hasWards = filteredWards.length > 0;

  return (
    <div className={shellClass}>
      <div className="mb-3">
        <BedStatusLegend summary={summary} activeStatus={statusFilter} onStatusFilter={setStatusFilter} />
        <IpdBedWardFilter
          wardOptions={wardOptions}
          selectedWardId={selectedWardId}
          onWardFilterChange={onWardFilterChange}
          wardsLoading={wardsLoading || loading}
        />
      </div>

      {loading ? (
        <div className="d-flex justify-content-center align-items-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading beds…</span>
          </div>
        </div>
      ) : !hasWards ? (
        <>
          {error ? (
            <div className="alert alert-warning py-2 mb-0">{error}</div>
          ) : statusFilter ? (
            <div className="alert alert-info mb-0">
              No <span className="fw-semibold">{statusFilter}</span> beds to display.
            </div>
          ) : (
            <div className="alert alert-info mb-0">No beds available to display.</div>
          )}
        </>
      ) : (
        <>
          {error ? <div className="alert alert-warning py-2 mb-3">{error}</div> : null}
          <div className={getWardGridRowClass(wardGridCols)}>
            {filteredWards.map((ward) => {
              const chargePerDay = ward.chargePerDay ?? wardChargeById[ward._id];
              return (
                <div key={ward._id} className="col d-flex">
                  <IpdWardBedCard
                    wardId={ward._id}
                    wardName={ward.name}
                    chargePerDay={chargePerDay}
                    beds={ward.beds}
                    selectedBedId={selectedBedId}
                    onSelectBed={onSelectBed}
                  />
                </div>
              );
            })}
          </div>

          {selectedBedId ? (
            <div className="mt-3 text-center">
              <span className="badge badge-soft-primary border border-primary text-primary fs-13 px-3 py-2">
                Selected:{" "}
                {data?.wards
                  .flatMap((w) => w.beds)
                  .find((b) => b._id === selectedBedId)?.bedCode ?? selectedBedId}
              </span>
            </div>
          ) : (
            <p className="text-center text-muted fs-13 mb-0 mt-3">
              Select an available (green) bed to continue.
            </p>
          )}
        </>
      )}
    </div>
  );
};

export default IpdBedSelectionStep;
