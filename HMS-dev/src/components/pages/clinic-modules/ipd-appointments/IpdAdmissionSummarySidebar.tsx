"use client";

import type { ReactNode } from "react";
import type { IIpdBedBlockViewData } from "@/components/pages/clinic-modules/ipd-appointments/ipd-bed-selection/ipdBedTypes";
import type { IIpdWardOption } from "@/components/pages/clinic-modules/ipd-appointments/ipd-bed-selection/fetchIpdBedBlockView";

export interface IIpdSummaryPatient {
  title?: string;
  name?: string;
  phone?: string;
  gender?: string;
  ageYears?: string;
  bloodGroup?: string;
  drugSensitivity?: string;
  isNewPatient?: boolean;
}

export interface IIpdSummaryAdmission {
  consultingDoctor?: string;
  admissionDate?: string;
  reason?: string;
  isMlc?: boolean;
}

export interface IIpdSummaryBed {
  bedCode?: string;
  wardName?: string;
  ratePerDay?: number;
  nursingChargePerDay?: number;
}

interface ISummaryCardProps {
  icon: string;
  title: string;
  badge?: ReactNode;
  children: ReactNode;
}

interface IIpdAdmissionSummarySidebarProps {
  patient?: IIpdSummaryPatient;
  admission?: IIpdSummaryAdmission;
  bed?: IIpdSummaryBed;
  payment?: ReactNode;
}

const getInitials = (name?: string): string => {
  const trimmed = name?.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
};

const formatPatientMeta = (patient?: IIpdSummaryPatient): string => {
  const parts = [
    patient?.gender?.trim(),
    patient?.ageYears?.trim() ? `${patient.ageYears.trim()}y` : "",
  ].filter(Boolean);
  return parts.join(" · ");
};

const formatPatientBloodGroup = (patient?: IIpdSummaryPatient): string | null => {
  const blood = patient?.bloodGroup?.trim();
  return blood || null;
};

const formatRate = (rate?: number): string | null => {
  if (rate == null || !Number.isFinite(rate)) return null;
  return `₹${rate.toLocaleString("en-IN")}/day`;
};

const SummaryCard = ({ icon, title, badge, children }: ISummaryCardProps) => (
  <div className="card border rounded-3 shadow-none mb-0">
    <div className="card-body p-3 text-dark">
      <div className="d-flex align-items-center justify-content-between gap-2 mb-2 pb-2 border-bottom">
        <div className="d-flex align-items-center gap-2 min-w-0">
          <i className={`${icon} text-primary fs-16`} aria-hidden />
          <span className="text-dark text-uppercase fs-12 fw-medium">{title}</span>
        </div>
        {badge ?? null}
      </div>
      {children}
    </div>
  </div>
);

const SummaryRow = ({
  label,
  value,
  valueClassName = "",
  hideIfEmpty = false,
}: {
  label: string;
  value?: string | null;
  valueClassName?: string;
  hideIfEmpty?: boolean;
}) => {
  if (hideIfEmpty && !value?.trim()) return null;
  return (
    <div className="d-flex justify-content-between align-items-start gap-3 py-1">
      <span className="text-dark fs-13 flex-shrink-0">{label}</span>
      <span className={`text-dark fs-13 text-end ${valueClassName}`.trim()}>
        {value?.trim() || "—"}
      </span>
    </div>
  );
};

export const resolveIpdBedSummary = (
  bedBlockData: IIpdBedBlockViewData | null | undefined,
  bedId: string | null | undefined,
  bedCode?: string | null,
  wardOptions: IIpdWardOption[] = []
): IIpdSummaryBed => {
  if (!bedId) {
    return { bedCode: bedCode?.trim() || undefined };
  }

  let resolvedCode = bedCode?.trim() || undefined;
  let wardName: string | undefined;
  let ratePerDay: number | undefined;
  let nursingChargePerDay: number | undefined;

  bedBlockData?.wards?.forEach((ward) => {
    const bed = ward.beds.find((item) => item._id === bedId);
    if (!bed) return;
    resolvedCode = bed.bedCode;
    wardName = ward.name;
    const wardOption = wardOptions.find((option) => option.value === ward._id);
    ratePerDay = ward.chargePerDay ?? wardOption?.chargePerDay;
    nursingChargePerDay = ward.nursingChargePerDay ?? wardOption?.nursingChargePerDay;
  });

  return { bedCode: resolvedCode, wardName, ratePerDay, nursingChargePerDay };
};

const IpdAdmissionSummarySidebar = ({
  patient,
  admission,
  bed,
  payment,
}: IIpdAdmissionSummarySidebarProps) => {
  const displayName = [patient?.title, patient?.name].filter(Boolean).join(" ").trim();
  const patientPhone = patient?.phone?.trim() || null;
  const patientMeta = formatPatientMeta(patient);
  const patientBloodGroup = formatPatientBloodGroup(patient);
  const rateLabel = formatRate(bed?.ratePerDay);
  const bedLine = [bed?.bedCode, bed?.wardName].filter(Boolean).join(" · ");

  return (
    <div className="d-flex flex-column gap-2">
      {payment ? (
        <SummaryCard icon="ti ti-credit-card" title="Payment">
          {payment}
        </SummaryCard>
      ) : null}

      <SummaryCard
        icon="ti ti-user"
        title="Patient"
        badge={
          patient?.isNewPatient ? (
            <span className="badge badge-soft-success border border-success fs-11 px-2 py-1">
              NEW
            </span>
          ) : null
        }
      >
        <div className="d-flex align-items-start gap-3 pt-1">
          <span className="avatar avatar-md rounded-circle bg-primary-transparent text-primary fw-medium flex-shrink-0">
            {getInitials(patient?.name)}
          </span>
          <div className="flex-grow-1 min-w-0">
            <div className="d-flex flex-wrap align-items-baseline justify-content-between gap-x-2 gap-y-1">
              <span className="text-dark fs-13 min-w-0">{displayName || "—"}</span>
              {patientPhone ? (
                <span className="text-dark fs-13 flex-shrink-0">{patientPhone}</span>
              ) : null}
            </div>
            {patientMeta ? (
              <div className="text-dark fs-13 mt-1">{patientMeta}</div>
            ) : null}
            {patientBloodGroup ? (
              <div className="text-dark fs-13 mt-1">{patientBloodGroup}</div>
            ) : null}
            {patient?.drugSensitivity?.trim() ? (
              <div className="d-flex align-items-center gap-1 mt-2 text-dark fs-13">
                <i className="ti ti-alert-triangle text-warning flex-shrink-0" aria-hidden />
                <span>{patient.drugSensitivity.trim()}</span>
              </div>
            ) : null}
          </div>
        </div>
      </SummaryCard>

      <SummaryCard
        icon="ti ti-stethoscope"
        title="Admission"
        badge={
          admission?.isMlc ? (
            <span className="badge badge-soft-warning border border-warning fs-11 px-2 py-1">
              MLC
            </span>
          ) : null
        }
      >
        <div className="d-flex flex-column">
          <SummaryRow label="Doctor" value={admission?.consultingDoctor} hideIfEmpty />
          <SummaryRow label="Admitted" value={admission?.admissionDate} hideIfEmpty />
          <SummaryRow label="Reason" value={admission?.reason} hideIfEmpty />
        </div>
      </SummaryCard>

      <SummaryCard icon="ti ti-bed" title="Bed">
        <div className="d-flex flex-column">
          <SummaryRow label="Bed" value={bedLine || undefined} />
          <SummaryRow label="Rate" value={rateLabel} />
        </div>
      </SummaryCard>
    </div>
  );
};

export default IpdAdmissionSummarySidebar;
