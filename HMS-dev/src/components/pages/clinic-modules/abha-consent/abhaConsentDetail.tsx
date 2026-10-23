"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import dayjs from "dayjs";
import { all_routes } from "@/routes/all_routes";
import {
  getConsentDetail,
  getConsentHiTypeSummary,
  getConsentStreamPatientId,
  getConsentStatusBadgeClass,
  isConsentGranted,
  isHiTypeInApiResponse,
  type IConsentDetailResult,
  type IConsentHipOption,
} from "@/core/api/abdmConsentApi";

const formatDateTime = (value: string | null): string =>
  value ? dayjs(value).format("DD MMM YYYY, hh:mm a") : "—";

const formatDate = (value: string | null): string =>
  value ? dayjs(value).format("DD MMM YYYY") : "—";

const formatDateRange = (from: string | null, to: string | null): string => {
  if (!from && !to) return "—";
  return `${formatDate(from)} -> ${formatDate(to)}`;
};

const isSameCalendarDay = (a: string | null, b: string | null): boolean => {
  if (!a && !b) return true;
  if (!a || !b) return false;
  const left = dayjs(a);
  const right = dayjs(b);
  if (!left.isValid() || !right.isValid()) return a === b;
  return left.isSame(right, "day");
};

const isSameDateTimeMinute = (a: string | null, b: string | null): boolean => {
  if (!a && !b) return true;
  if (!a || !b) return false;
  const left = dayjs(a);
  const right = dayjs(b);
  if (!left.isValid() || !right.isValid()) return a === b;
  return left.isSame(right, "minute");
};

const isGrantedDateRangeDifferent = (
  requestedFrom: string | null,
  requestedTo: string | null,
  grantedFrom: string | null,
  grantedTo: string | null
): boolean => {
  if (!grantedFrom && !grantedTo) return false;
  return (
    !isSameCalendarDay(requestedFrom, grantedFrom) ||
    !isSameCalendarDay(requestedTo, grantedTo)
  );
};

const isGrantedEraseDifferent = (
  requestedEraseAt: string | null,
  grantedEraseAt: string | null
): boolean => {
  if (!grantedEraseAt) return false;
  return !isSameDateTimeMinute(requestedEraseAt, grantedEraseAt);
};

const SummarySection = ({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) => (
  <div className="col-12 col-lg-4">
    <div className="h-100 border rounded-3 p-2 p-md-3 bg-white">
      <div className="d-flex align-items-center gap-2 mb-2">
        <span className="avatar avatar-sm bg-primary-transparent rounded-circle d-inline-flex align-items-center justify-content-center">
          <i className={`ti ${icon} text-primary`} />
        </span>
        <h6 className="mb-0 text-primary fw-semibold text-uppercase fs-12">{title}</h6>
      </div>
      <div className="d-flex flex-column">{children}</div>
    </div>
  </div>
);

const DetailField = ({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) => (
  <div className="row gx-2 align-items-start py-1">
    <div className="col-5 col-sm-5 text-black text-uppercase fs-11 lh-sm pe-1">
      {label}
    </div>
    <div
      className={`col-7 col-sm-7 fs-13 text-end text-break lh-sm ${
        highlight ? "fw-semibold" : "text-black"
      }`}
      style={highlight ? { color: "#8b4513" } : undefined}
      title={highlight ? "Differs from requested value" : undefined}
    >
      {value}
    </div>
  </div>
);

const PatientSummary = ({
  consent,
}: {
  consent: NonNullable<IConsentDetailResult["consent"]>;
}) => {
  const name = consent.patientName?.trim() ?? "";
  const uhidDob = [consent.uhid, consent.patientDob ? formatDate(consent.patientDob) : null]
    .filter(Boolean)
    .join(" • ");
  const abha = consent.abhaAddress?.trim() || consent.abhaNumber?.trim() || "";
  const mobile = consent.patientMobile?.trim() ?? "";
  const address = consent.patientAddress?.trim() ?? "";

  if (!name && !uhidDob && !abha && !mobile && !address) {
    return <span className="text-muted">—</span>;
  }

  return (
    <>
      {name ? <h5 className="fw-bold mb-1">{name}</h5> : null}
      {uhidDob ? <p className="text-muted fs-13 mb-1">{uhidDob}</p> : null}
      {abha ? (
        <p className="mb-1 fs-13 text-dark">
          <i className="ti ti-mail me-1 text-muted" />
          {abha}
        </p>
      ) : null}
      {mobile ? (
        <p className="mb-1 fs-13 text-dark">
          <i className="ti ti-phone me-1 text-muted" />
          {mobile}
        </p>
      ) : null}
      {address ? (
        <p className="mb-0 fs-13 text-dark">
          <i className="ti ti-map-pin me-1 text-muted" />
          {address}
        </p>
      ) : null}
    </>
  );
};

const HiTypesSection = ({
  consent,
}: {
  consent: NonNullable<IConsentDetailResult["consent"]>;
}) => {
  const { displayHiTypes, apiHiTypes, absentHiTypes } = getConsentHiTypeSummary(consent);

  const showAbsentWarning = absentHiTypes.length > 0;

  return (
    <>
      <div className="d-flex flex-wrap align-items-center gap-2">
        <span className="text-muted text-uppercase fs-11 fw-semibold me-1">HI Types</span>
        {displayHiTypes.map((hiType) => {
          const inApi = isHiTypeInApiResponse(hiType, apiHiTypes);

          return (
            <span
              key={hiType}
              className={
                inApi
                  ? "badge badge-soft-primary border border-primary text-primary fs-12 fw-medium px-2 py-1 rounded-2"
                  : "badge border fs-12 fw-medium px-2 py-1 rounded-2"
              }
              style={
                inApi
                  ? undefined
                  : {
                      backgroundColor: "#f8f9fa",
                      color: "#6c757d",
                      borderColor: "#dee2e6",
                    }
              }
            >
              {hiType}
            </span>
          );
        })}
      </div>
      {showAbsentWarning ? (
        <div
          className="d-flex align-items-center gap-2 py-2 px-3 mt-2 mb-0 rounded-2"
          style={{ backgroundColor: "#faf0e4", color: "#8b4513" }}
          role="status"
        >
          <span
            className="d-inline-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
            style={{
              width: "18px",
              height: "18px",
              backgroundColor: "#8b4513",
              color: "#faf0e4",
              fontSize: "11px",
              fontWeight: 700,
            }}
            aria-hidden="true"
          >
            !
          </span>
          <span className="fs-13">
            {absentHiTypes.length} of {displayHiTypes.length} requested HI types not
            granted:{" "}
            <span className="fw-bold">{absentHiTypes.join(", ")}</span>
          </span>
        </div>
      ) : null}
    </>
  );
};

const AbhaConsentDetailComponent = () => {
  const params = useParams();
  const router = useRouter();
  const consentId = typeof params?.consentId === "string" ? params.consentId.trim() : "";

  const [detail, setDetail] = useState<IConsentDetailResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!consentId) {
      setError("Consent ID is missing.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await getConsentDetail(consentId);
      setDetail(result);
      if (!result.consent && !result.hips.length) {
        setError("Consent details not found.");
      }
    } catch (err: unknown) {
      setDetail(null);
      setError(err instanceof Error ? err.message : "Failed to fetch consent details.");
    } finally {
      setLoading(false);
    }
  }, [consentId]);

  useEffect(() => {
    void fetchDetail();
  }, [fetchDetail]);

  const consent = detail?.consent ?? null;
  const hips = detail?.hips ?? [];

  const purposeLabel = useMemo(() => {
    if (!consent) return "—";
    const purpose = consent.purpose ?? "";
    const code = consent.purposeCode ?? "";
    if (purpose && code) return `${purpose} (${code})`;
    return purpose || code || "—";
  }, [consent]);

  const handleOpenFacility = (hip: IConsentHipOption) => {
    if (!consentId || !hip.consentArtifactId) return;

    const query = new URLSearchParams({
      consentArtifactId: hip.consentArtifactId,
      hipName: hip.hipName,
    });

    if (consent) {
      const streamPatientId = getConsentStreamPatientId(consent);
      if (streamPatientId) {
        query.set("patientId", streamPatientId);
      }
    }

    router.push(
      `${all_routes.abhaConsent}/${encodeURIComponent(consentId)}/records?${query.toString()}`
    );
  };

  if (!consentId) {
    return (
      <div className="page-wrapper">
        <div className="content">
          <div className="alert alert-danger">Consent ID is missing.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <div className="content">
        <div className="mb-3">
          <Link href={all_routes.abhaConsent} className="btn btn-light mb-2">
            <i className="ti ti-arrow-left me-1" />
            Back
          </Link>
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
            <div>
              <h4 className="fw-bold mb-1">HIU Consent Detail</h4>
              <p className="text-muted mb-0">ID: {consentId}</p>
            </div>
            <div className="d-flex align-items-center gap-2">
              {consent?.status ? (
                <span
                  className={`badge border fs-12 fw-semibold px-2 py-1 rounded-2 ${getConsentStatusBadgeClass(consent.status)}`}
                >
                  {consent.status}
                </span>
              ) : null}
              <button
                type="button"
                className="btn btn-outline-primary"
                onClick={() => void fetchDetail()}
                disabled={loading}
                aria-label="Refresh consent details"
              >
                <i className="ti ti-refresh" />
              </button>
            </div>
          </div>
        </div>

        {error ? (
          <div className="alert alert-danger py-2" role="alert">
            {error}
          </div>
        ) : null}

        {loading && !consent ? (
          <div className="text-muted py-4">Loading consent details...</div>
        ) : consent ? (
          <>
            <div className="row g-2 mb-2">
              <SummarySection title="Patient" icon="ti-user">
                <PatientSummary consent={consent} />
              </SummarySection>

              <SummarySection title="Consent" icon="ti-file-description">
                <DetailField label="Purpose" value={purposeLabel} />
                <DetailField
                  label="Requested HIP"
                  value={consent.hipName ?? consent.requesterName ?? "Any Facility"}
                />
                <DetailField
                  label="Artefacts"
                  value={String(hips.length || consent.careContexts.length || 0)}
                />
                <DetailField
                  label="Consent Created At"
                  value={formatDateTime(consent.createdAt || consent.initiatedAt)}
                />
                <DetailField
                  label="Consent Granted On"
                  value={formatDateTime(consent.grantedAt)}
                />
              </SummarySection>

              <SummarySection title="Validity" icon="ti-calendar">
                <DetailField
                  label="Request Date Range"
                  value={formatDateRange(consent.dateRangeFrom, consent.dateRangeTo)}
                />
                <DetailField
                  label="Request Erased On"
                  value={formatDateTime(consent.dataEraseAt)}
                />
                <DetailField
                  label="Granted Date Range"
                  value={formatDateRange(
                    consent.grantedDateRangeFrom,
                    consent.grantedDateRangeTo
                  )}
                  highlight={isGrantedDateRangeDifferent(
                    consent.dateRangeFrom,
                    consent.dateRangeTo,
                    consent.grantedDateRangeFrom,
                    consent.grantedDateRangeTo
                  )}
                />
                <DetailField
                  label="Granted Erase On"
                  value={formatDateTime(consent.grantedDataEraseAt)}
                  highlight={isGrantedEraseDifferent(
                    consent.dataEraseAt,
                    consent.grantedDataEraseAt
                  )}
                />
              </SummarySection>
            </div>

            <div className="card shadow-sm mb-2">
              <div className="card-body py-2 px-3">
                <HiTypesSection consent={consent} />
              </div>
            </div>

            <div className="card shadow-sm">
              <div className="card-header bg-white border-bottom">
                <h6 className="mb-0 fw-semibold">
                  Linked HIPs <span className="text-muted">({hips.length})</span>
                </h6>
              </div>
              <div className="card-body p-0">
                {loading ? (
                  <div className="text-muted p-4">Loading facilities...</div>
                ) : !hips.length ? (
                  <div className="text-muted p-4">
                    {isConsentGranted(consent.status)
                      ? "No linked facilities found for this consent."
                      : "Facilities will appear once consent is granted."}
                  </div>
                ) : (
                  <div className="list-group list-group-flush">
                    {hips.map((hip) => (
                      <button
                        key={`${hip.consentArtifactId}-${hip.hipName}`}
                        type="button"
                        className="list-group-item list-group-item-action d-flex align-items-center justify-content-between gap-3 py-2"
                        onClick={() => handleOpenFacility(hip)}
                      >
                        <div className="text-start">
                          <div className="d-flex align-items-center flex-wrap gap-2 mb-1">
                            <span className="fw-semibold text-dark">{hip.hipName}</span>
                            {consent.status ? (
                              <span
                                className={`badge border fs-11 fw-semibold px-2 py-1 rounded-2 ${getConsentStatusBadgeClass(consent.status)}`}
                              >
                                {consent.status}
                              </span>
                            ) : null}
                          </div>
                          <div className="text-muted fs-12">
                            {[hip.hipId, `${consent.careContexts.length} CC`]
                              .filter(Boolean)
                              .join(" • ")}
                          </div>
                        </div>
                        <i className="ti ti-chevron-right text-muted" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default AbhaConsentDetailComponent;
