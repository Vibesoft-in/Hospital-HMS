"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { all_routes } from "@/routes/all_routes";
import { isAdminRole } from "@/core/auth/roleAccess";
import axios from "axios";
import { API_BASE_URL, PATHLAB_PORTAL_BASE_URL } from "@/environment";
import dayjs from "dayjs";
import PrintReceipt, { type IReceiptData } from "@/components/pages/clinic-modules/appointments/printReceipt";
import {
  buildIPDReceiptData,
  buildPathlabReceiptsFromIPD,
  enrichIPDDoctorForReceipt,
  resolveIpdGrossTotal,
  type IIpdAppointmentDetail,
} from "@/components/pages/clinic-modules/appointments/buildIPDReceiptData";
import {
  extractIpdFromGetResponse,
  isIpdDischarged,
  mapIpdApiToAppointmentDetail,
  type IIpdApiRecord,
} from "@/components/pages/clinic-modules/ipd-appointments/ipdApiHelpers";
import IpdDischargeSummaryForm from "@/components/pages/clinic-modules/ipd-appointments/IpdDischargeSummaryForm";
import {
  buildDischargeSummaryPayload,
  normalizeDischargeSummaryFromApi,
  validateDischargeSummaryForm,
} from "@/components/pages/clinic-modules/ipd-appointments/ipdDischargeSummaryTypes";
import PrintDischargeSummary, {
  buildPrintDischargeSummaryData,
} from "@/components/pages/clinic-modules/ipd-appointments/printDischargeSummary";
import AddHealthRecordForm from "@/components/pages/clinic-modules/health-records/AddHealthRecordForm";
import HealthRecordsList from "@/components/pages/clinic-modules/health-records/HealthRecordsList";
import { SHOW_ABHA_FEATURES } from "@/core/config/featureFlags";
import ImageWithBasePath from "@/core/imageWithBasePath";

const TRANSACTION_PAYMENT_MODES = ["Cash", "UPI", "Card"] as const;

const DETAIL_LABEL_CLASS = "form-label mb-1 fw-medium text-dark fs-14";
const DETAIL_VALUE_CLASS = "fw-bold text-dark";
const PAYMENT_VALUE_CLASS = "text-dark";
const DETAIL_TABLE_HEAD_CLASS = "table-light";

const formatPatientAgeForDisplay = (
  years?: number | null,
  months?: number | null,
  days?: number | null
): string | undefined => {
  if (years != null && Number.isFinite(Number(years))) {
    const y = Number(years);
    if (y === 0) {
      const m = months != null ? Number(months) : 0;
      if (m > 0) return `${m} ${m === 1 ? "Month" : "Months"}`;
      if (days != null) return `${days} ${Number(days) === 1 ? "Day" : "Days"}`;
      return undefined;
    }
    return `${y} ${y === 1 ? "Year" : "Years"}`;
  }
  return undefined;
};

const IpdAppointmentDetailsComponent = () => {
  const params = useParams();
  const id = params?.id as string;

  const [ipd, setIpd] = useState<IIpdAppointmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [showPrintReceipt, setShowPrintReceipt] = useState(false);
  const [paymentMode, setPaymentMode] = useState<string>("Cash");
  const [amount, setAmount] = useState<string>("0");
  const [submitting, setSubmitting] = useState(false);
  const [transactionModeUpdatingId, setTransactionModeUpdatingId] = useState<string | null>(null);
  const [printTransactionId, setPrintTransactionId] = useState<string | null>(null);
  const [showDischargeSummary, setShowDischargeSummary] = useState(false);
  const [showPrintDischargeSummary, setShowPrintDischargeSummary] = useState(false);
  const [showFinalDischargeConfirm, setShowFinalDischargeConfirm] = useState(false);
  const [savingFinalDischarge, setSavingFinalDischarge] = useState(false);
  const [dischargeSummaryRaw, setDischargeSummaryRaw] = useState<unknown>(null);
  const [showAddRecord, setShowAddRecord] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [healthRecordsRefreshKey, setHealthRecordsRefreshKey] = useState(0);

  const isAdmin = useMemo(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("authUser") : null;
      if (!raw) return false;
      const parsed = JSON.parse(raw) as { role?: string } | null;
      return isAdminRole(parsed?.role);
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    if (id) {
      void fetchIPDDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchIPDDetails = async () => {
    try {
      setLoading(true);
      setError("");
      if (!API_BASE_URL) {
        setError("API configuration error");
        return;
      }
      const res = await axios.get(`${API_BASE_URL}/hospital/ipd/${id}`);
      const ok = res.data?.code === 200 || (res.status >= 200 && res.status < 300);
      const raw = extractIpdFromGetResponse(res.data?.data) as IIpdApiRecord | null;
      if (!ok || !raw?._id) {
        setError(res.data?.message ?? "IPD admission not found");
        return;
      }

      const responseReceiptId = res.data?.data?.receiptId as string | undefined;
      let next = mapIpdApiToAppointmentDetail(raw, responseReceiptId);

      if (!next.patient && next.patientId) {
        try {
          const pRes = await axios.get(`${API_BASE_URL}/hospital/patients/${next.patientId}`);
          const pData = pRes.data?.data?.patient ?? pRes.data?.data;
          if (pData && typeof pData === "object") {
            next = { ...next, patient: { ...(pData as IIpdAppointmentDetail["patient"]), _id: next.patientId } };
          }
        } catch {
          /* optional patient fetch */
        }
      }

      next = await enrichIPDDoctorForReceipt(next);
      setIpd(next);
      setDischargeSummaryRaw((raw as { dischargeSummary?: unknown })?.dischargeSummary ?? null);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to load IPD admission";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="content">
          <div className="d-flex justify-content-center align-items-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !ipd) {
    return (
      <div className="page-wrapper">
        <div className="content">
          <div className="alert alert-danger">
            <strong>Error:</strong> {error || "IPD admission not found"}
          </div>
          <Link href={all_routes.ipdAppointments} className="btn btn-primary">
            Back to IPD Appointments
          </Link>
        </div>
      </div>
    );
  }

  const doctor = ipd.doctor;
  const patient = ipd.patient;
  const transactions = ipd.transactions || [];
  const grossTotal = resolveIpdGrossTotal(ipd);
  const discountAmount = ipd.discount ?? 0;
  const netTotal = Math.max(0, grossTotal - discountAmount);
  const totalPaidFromTx = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalPaid = ipd.amountPaid != null ? ipd.amountPaid : totalPaidFromTx;
  const dueAmount = Math.max(0, netTotal - totalPaid);
  const bedChargesPrice =
    ipd.bedChargesTotal ??
    (Number.isFinite(Number(ipd.bedCharge?.totalCharge)) ? Number(ipd.bedCharge?.totalCharge) : 0);
  const bedChargeDays = Math.max(1, Number(ipd.bedCharge?.days) || 1);
  const bedChargeName = ipd.bedCharge?.wardName?.trim()
    ? `Bed Charges - ${ipd.bedCharge.wardName.trim()}`
    : "Bed Charges";
  const admissionDateLabel = ipd.admissionDate ?? ipd.appointmentDate;
  const patientAgeUi = formatPatientAgeForDisplay(
    patient?.age,
    patient?.months,
    patient?.days
  );
  const bedNumber = ipd.bed?.bedNumber ?? ipd.bed?.bedCode;
  const wardName = ipd.bed?.ward?.name;
  const bedRate =
    ipd.bed?.ward?.chargePerDay != null && Number.isFinite(Number(ipd.bed.ward.chargePerDay))
      ? `₹${Number(ipd.bed.ward.chargePerDay).toLocaleString("en-IN")}/day`
      : null;
  const isMlc = Boolean(ipd.mlc ?? ipd.isMlc);
  const reasonLabel = (ipd.reason ?? ipd.notes ?? "").trim() || "—";
  const isDischarged = isIpdDischarged(ipd);

  const handleCreateCase = () => {
    if (!patient) return;

    const params = new URLSearchParams({
      phone: patient?.phone ?? "",
      title: patient?.title ?? "",
      name: patient?.name ?? "",
      center: "JJM",
      ipdId: ipd.ipdId?.trim() || ipd._id || "",
    });

    window.open(
      `${PATHLAB_PORTAL_BASE_URL}/new-appointment?${params.toString()}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const handlePrintDischargeSummary = () => {
    if (!dischargeSummaryRaw || typeof dischargeSummaryRaw !== "object") {
      alert("No discharge summary found. Please create and save a discharge summary first.");
      return;
    }
    const printData = buildPrintDischargeSummaryData(ipd, dischargeSummaryRaw);
    if (!printData) return;
    setShowPrintDischargeSummary(true);
  };

  const handleSaveFinalDischarge = () => {
    if (!API_BASE_URL || !ipd?._id) return;
    if (!dischargeSummaryRaw || typeof dischargeSummaryRaw !== "object") {
      alert("No discharge summary found. Please create and save a discharge summary first.");
      return;
    }
    const form = normalizeDischargeSummaryFromApi(dischargeSummaryRaw);
    const validationError = form ? validateDischargeSummaryForm(form) : "No discharge summary found.";
    if (validationError) {
      alert(validationError);
      return;
    }
    setShowFinalDischargeConfirm(true);
  };

  const handleConfirmSaveFinalDischarge = async () => {
    if (!API_BASE_URL || !ipd?._id) return;
    const form = normalizeDischargeSummaryFromApi(dischargeSummaryRaw);
    if (!form) {
      alert("No discharge summary found. Please create and save a discharge summary first.");
      return;
    }
    try {
      setSavingFinalDischarge(true);
      setShowFinalDischargeConfirm(false);
      const payload = buildDischargeSummaryPayload(form);
      await axios.put(`${API_BASE_URL}/hospital/ipd/${ipd._id}/discharge-summary`, payload);
      const res = await axios.post(`${API_BASE_URL}/hospital/ipd/${ipd._id}/discharge`, payload);
      if (res.data?.code === 200 || (res.status >= 200 && res.status < 300)) {
        await fetchIPDDetails();
      } else {
        alert(res.data?.message ?? "Failed to complete discharge.");
      }
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to complete discharge.";
      alert(message);
    } finally {
      setSavingFinalDischarge(false);
    }
  };

  const handleAddTransaction = async () => {
    if (!ipd || !API_BASE_URL || submitting) return;

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    if (!paymentMode || paymentMode === "Select") {
      alert("Please select a payment mode");
      return;
    }

    try {
      setSubmitting(true);
      const res = await axios.post(`${API_BASE_URL}/hospital/transactions`, {
        visitId: ipd._id,
        transactionType: "Payment",
        amount: amountNum,
        paymentMode,
      });
      if (res.data?.code === 200 || (res.status >= 200 && res.status < 300)) {
        setShowAddTransaction(false);
        setAmount("0");
        setPaymentMode("Cash");
        await fetchIPDDetails();
      } else {
        alert(res.data?.message || "Failed to add transaction");
      }
    } catch (err: unknown) {
      console.error("Error adding ipd transaction:", err);
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to add transaction. Please try again.";
      alert(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setShowAddTransaction(false);
    setAmount("0");
    setPaymentMode("Cash");
  };

  const handleTransactionPaymentModeChange = async (
    transactionMongoId: string,
    newPaymentMode: string
  ) => {
    if (!API_BASE_URL || !ipd) return;
    try {
      setTransactionModeUpdatingId(transactionMongoId);
      await axios.patch(`${API_BASE_URL}/hospital/transactions/${transactionMongoId}`, {
        paymentMode: newPaymentMode,
      });
      setIpd((prev) => {
        if (!prev?.transactions) return prev;
        return {
          ...prev,
          transactions: prev.transactions.map((t) =>
            t._id === transactionMongoId ? { ...t, paymentMode: newPaymentMode } : t
          ),
        };
      });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to update payment mode.";
      alert(message);
      await fetchIPDDetails();
    } finally {
      setTransactionModeUpdatingId(null);
    }
  };

  return (
    <div className="page-wrapper">
      <div className="content">
        <div className="mb-4 d-flex flex-wrap align-items-center justify-content-between gap-2">
          <h6 className="fw-bold mb-0 d-flex align-items-center">
            <Link href={all_routes.ipdAppointments} className="text-dark">
              <i className="ti ti-chevron-left me-1" />
              IPD Appointments
            </Link>
          </h6>

          <div className="d-flex flex-wrap align-items-center gap-2">
            {SHOW_ABHA_FEATURES ? (
              <button
                type="button"
                className="btn btn-outline-primary btn-sm d-inline-flex align-items-center"
                onClick={() => {
                  setEditingRecordId(null);
                  setShowAddRecord(true);
                }}
                disabled={!ipd?._id}
              >
                <i className="ti ti-file-plus me-1" />
                Add Record
              </button>
            ) : null}
            <button
              type="button"
              className="btn btn-outline-primary btn-sm d-inline-flex align-items-center"
              onClick={handleCreateCase}
              disabled={!patient}
              aria-label="Create Pathlab Case"
            >
              <i className="ti ti-plus me-1" />
              Create Case
            </button>
            {isDischarged ? (
              <button
                type="button"
                className="btn btn-outline-primary btn-sm d-inline-flex align-items-center"
                disabled
                title="Edit disabled for discharged IPD"
                aria-label="Edit disabled for discharged IPD"
              >
                <i className="ti ti-edit me-1" />
                Edit
              </button>
            ) : (
              <Link
                href={`${all_routes.editIpdAppointment}/${ipd._id}`}
                className="btn btn-outline-primary btn-sm d-inline-flex align-items-center"
              >
                <i className="ti ti-edit me-1" />
                Edit
              </Link>
            )}
            <button
              type="button"
              className="btn btn-outline-primary btn-sm d-inline-flex align-items-center"
              onClick={() => setShowDischargeSummary(true)}
            >
              <i className="ti ti-file-text me-1" />
              Discharge Summary
            </button>
            <button
              type="button"
              className="btn btn-outline-primary btn-sm d-inline-flex align-items-center"
              onClick={handlePrintDischargeSummary}
            >
              <i className="ti ti-printer me-1" />
              Print Discharge Summary
            </button>
            {!isDischarged ? (
              <button
                type="button"
                className="btn btn-primary btn-sm d-inline-flex align-items-center"
                onClick={handleSaveFinalDischarge}
                disabled={savingFinalDischarge}
              >
                {savingFinalDischarge ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-1"
                      role="status"
                      aria-hidden="true"
                    />
                    Discharging…
                  </>
                ) : (
                  <>
                    <i className="ti ti-check me-1" />
                    Save Final Discharge
                  </>
                )}
              </button>
            ) : null}
            <button
              type="button"
              className="btn btn-primary btn-sm d-inline-flex align-items-center"
              onClick={() => setShowPrintReceipt(true)}
            >
              <i className="ti ti-receipt me-1" />
              Print IPD Summary
            </button>
          </div>
        </div>

        <div className="row">
          <div className="col-lg-7 pe-lg-3">
            <div className="card mb-3">
              <div className="card-body p-3">
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                  <h6 className="fw-bold text-primary mb-0">IPD Information</h6>
                  <div className="d-flex align-items-center flex-wrap gap-2">
                    <span
                      className={`badge ${
                        ipd.status === "Completed"
                          ? "badge-soft-success"
                          : ipd.status === "Cancelled"
                            ? "badge-soft-danger"
                            : ipd.status === "In Progress"
                              ? "badge-soft-warning text-dark"
                              : "badge-soft-primary"
                      }`}
                    >
                      {ipd.status || "Admitted"}
                    </span>
                    {isMlc ? (
                      <span className="badge badge-soft-warning border border-warning fs-12 px-2 py-1">
                        MLC
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
                  <h6 className="fw-bold text-primary mb-0">Patient Details</h6>
                  <Link
                    href={`${all_routes.patientDetails}?id=${patient?._id ?? ipd.patientId ?? ""}`}
                    className={`btn btn-sm d-inline-flex align-items-center ${
                      patient?._id || ipd.patientId ? "btn-primary" : "btn-light disabled"
                    }`}
                    aria-disabled={!(patient?._id || ipd.patientId)}
                  >
                    <i className="ti ti-user-circle me-1" />
                    Open Profile
                  </Link>
                </div>

                <div className="row g-2 mb-3">
                  <div className="col-md-3 col-sm-6">
                    <label className={DETAIL_LABEL_CLASS}>Patient Name</label>
                    <div className={DETAIL_VALUE_CLASS}>
                      {patient?.title ? `${patient.title} ` : ""}
                      {patient?.name || "N/A"}
                    </div>
                  </div>
                  <div className="col-md-3 col-sm-6">
                    <label className={DETAIL_LABEL_CLASS}>Age / Gender</label>
                    <div className={DETAIL_VALUE_CLASS}>
                      {patientAgeUi || "N/A"} / {patient?.gender || "N/A"}
                    </div>
                  </div>
                  {patient?.mrd ? (
                    <div className="col-md-3 col-sm-6">
                      <label className={DETAIL_LABEL_CLASS}>MRD</label>
                      <div className={DETAIL_VALUE_CLASS}>{patient.mrd}</div>
                    </div>
                  ) : null}
                  <div className="col-md-3 col-sm-6">
                    <label className={DETAIL_LABEL_CLASS}>Phone</label>
                    <div className={DETAIL_VALUE_CLASS}>{patient?.phone || "N/A"}</div>
                  </div>
                  <div className="col-md-3 col-sm-6">
                    <label className={DETAIL_LABEL_CLASS}>IPD ID</label>
                    <div className={DETAIL_VALUE_CLASS}>{ipd.ipdId || "—"}</div>
                  </div>
                  <div className="col-md-3 col-sm-6">
                    <label className={DETAIL_LABEL_CLASS}>Admission Date</label>
                    <div className={DETAIL_VALUE_CLASS}>
                      {admissionDateLabel
                        ? dayjs(admissionDateLabel).format("DD MMM YYYY")
                        : "N/A"}
                    </div>
                  </div>
                </div>

                <div className="row g-2 mb-3">
                  {(bedNumber || wardName || bedRate) ? (
                    <div className="col-md-3 col-sm-6 d-flex align-items-end">
                      <div
                        className="rounded-2 text-white d-inline-flex flex-column justify-content-center"
                        style={{
                          backgroundColor: "#e8837a",
                          padding: "12px 16px",
                        }}
                      >
                        <span className="fw-bold fs-14 lh-sm">{bedNumber || "—"}</span>
                        {wardName ? (
                          <span className="fs-12 mt-1 opacity-95 lh-sm">{wardName}</span>
                        ) : null}
                        {bedRate ? (
                          <span className="fs-12 mt-1 opacity-90 lh-sm">{bedRate}</span>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                  <div className="col-md-3 col-sm-6">
                    <label className={DETAIL_LABEL_CLASS}>Reason for Admission</label>
                    <div className={DETAIL_VALUE_CLASS}>{reasonLabel}</div>
                  </div>
                </div>

                {doctor ? (
                  <div className="row g-2 mb-3">
                    <div className="col-md-4 col-sm-6">
                      <label className={DETAIL_LABEL_CLASS}>Consulting Doctor</label>
                      <div className={DETAIL_VALUE_CLASS}>{doctor.name}</div>
                    </div>
                    {doctor.designation ? (
                      <div className="col-md-4 col-sm-6">
                        <label className={DETAIL_LABEL_CLASS}>Designation</label>
                        <div className={DETAIL_VALUE_CLASS}>{doctor.designation}</div>
                      </div>
                    ) : null}
                    {doctor.department ? (
                      <div className="col-md-4 col-sm-6">
                        <label className={DETAIL_LABEL_CLASS}>Department</label>
                        <div className={DETAIL_VALUE_CLASS}>{doctor.department}</div>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {((ipd.procedures && ipd.procedures.length > 0) ||
                  (ipd.doctorVisits && ipd.doctorVisits.length > 0) ||
                  bedChargesPrice > 0) ? (
                  <div className="mt-2">
                    <h6 className="fw-bold text-primary mb-2">Charges</h6>
                    <div className="table-responsive">
                      <table className="table table-sm mb-0">
                        <thead className={DETAIL_TABLE_HEAD_CLASS}>
                          <tr>
                            <th style={{ width: "60px" }} className={`${DETAIL_LABEL_CLASS} border-0`}>
                              S.No
                            </th>
                            <th className={`${DETAIL_LABEL_CLASS} border-0`}>Name</th>
                            <th className={`${DETAIL_LABEL_CLASS} border-0 text-center`} style={{ width: "80px" }}>
                              Units
                            </th>
                            <th className={`${DETAIL_LABEL_CLASS} border-0 text-end`}>Price</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(ipd.procedures ?? []).map((proc, index) => (
                            <tr key={`proc-${proc.procedureId || index}`}>
                              <td className={DETAIL_VALUE_CLASS}>{index + 1}</td>
                              <td className={DETAIL_VALUE_CLASS}>
                                {proc.procedureName || "N/A"}
                                {proc.category ? (
                                  <span className="badge badge-soft-primary border border-primary fs-10 px-2 py-1 ms-2">{proc.category}</span>
                                ) : null}
                              </td>
                              <td className={`text-center ${DETAIL_VALUE_CLASS}`}>
                                {proc.units ?? 1}
                              </td>
                              <td className={`text-end ${DETAIL_VALUE_CLASS}`}>
                                ₹{(proc.price ?? 0).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                          {(ipd.doctorVisits ?? []).map((visit, index) => (
                            <tr key={`doc-${index}-${visit.doctorId}`}>
                              <td className={DETAIL_VALUE_CLASS}>{(ipd.procedures?.length ?? 0) + index + 1}</td>
                              <td className={DETAIL_VALUE_CLASS}>
                                {visit.doctorName || "N/A"}
                              </td>
                              <td className={`text-center ${DETAIL_VALUE_CLASS}`}>{visit.days}</td>
                              <td className={`text-end ${DETAIL_VALUE_CLASS}`}>
                                ₹{(visit.price ?? 0).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                          {bedChargesPrice > 0 ? (
                            <tr key="bed-charges">
                              <td className={DETAIL_VALUE_CLASS}>
                                {(ipd.procedures?.length ?? 0) + (ipd.doctorVisits?.length ?? 0) + 1}
                              </td>
                              <td className={DETAIL_VALUE_CLASS}>{bedChargeName}</td>
                              <td className={`text-center ${DETAIL_VALUE_CLASS}`}>{bedChargeDays}</td>
                              <td className={`text-end ${DETAIL_VALUE_CLASS}`}>
                                ₹{bedChargesPrice.toFixed(2)}
                              </td>
                            </tr>
                          ) : null}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}

                <div className="d-flex align-items-start justify-content-between flex-wrap gap-2 mt-3 pt-2 border-top">
                  <div>
                    <label className={`${DETAIL_LABEL_CLASS} d-block mb-0`}>Total</label>
                    <div className={DETAIL_VALUE_CLASS}>₹{grossTotal.toFixed(2)}</div>
                  </div>
                  {discountAmount > 0 ? (
                    <div>
                      <label className={`${DETAIL_LABEL_CLASS} d-block mb-0`}>Discount</label>
                      <div className={DETAIL_VALUE_CLASS}>₹{discountAmount.toFixed(2)}</div>
                    </div>
                  ) : null}
                  <div>
                    <label className={`${DETAIL_LABEL_CLASS} d-block mb-0`}>Paid</label>
                    <div className="fw-bold text-success">₹{totalPaid.toFixed(2)}</div>
                  </div>
                  <div>
                    <label className={`${DETAIL_LABEL_CLASS} d-block mb-0`}>Due</label>
                    <div className={`fw-bold ${dueAmount > 0 ? "text-danger" : "text-dark"}`}>₹{dueAmount.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-lg-5 ps-lg-3">
            <div className="card">
              <div className="card-body p-3">
                <h6 className="fw-bold text-primary mb-2">Payment History</h6>
                {transactions.length === 0 ? (
                  <div className="text-center py-4 text-muted">
                    <i className="ti ti-receipt fs-48 mb-2 d-block" />
                    <p className="mb-0">No payment transactions found</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover mb-0">
                      <thead className={DETAIL_TABLE_HEAD_CLASS}>
                        <tr>
                          <th className="border-0 fs-13 fw-medium text-dark">ID</th>
                          <th className="border-0 fs-13 fw-medium text-dark">Date - Time</th>
                          <th className="border-0 fs-13 fw-medium text-dark">Amount</th>
                          <th className="border-0 fs-13 fw-medium text-dark">Mode</th>
                          <th className="border-0 fs-13 fw-medium text-dark" style={{ width: "40px" }} />
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.map((txn) => (
                          <tr key={txn._id}>
                            <td className={`fs-15 ${PAYMENT_VALUE_CLASS} fw-medium`}>{txn.transactionId}</td>
                            <td className={`fs-15 ${PAYMENT_VALUE_CLASS}`}>
                              {dayjs(txn.transactionDate).format("DD MMM YYYY")}
                              <br />
                              <small className={PAYMENT_VALUE_CLASS}>
                                {dayjs(txn.createdAt).format("HH:mm")}
                              </small>
                            </td>
                            <td className={`fs-15 ${PAYMENT_VALUE_CLASS} fw-medium`}>
                              <i className="ti ti-check fs-14 me-1 text-success" />
                              ₹{txn.amount?.toFixed(2) || "0.00"}
                            </td>
                            <td className={`fs-15 ${PAYMENT_VALUE_CLASS}`}>
                              {isAdmin ? (
                                <select
                                  className="form-select form-select-sm text-dark"
                                  style={{ minWidth: "6.5rem", maxWidth: "10rem" }}
                                  value={
                                    TRANSACTION_PAYMENT_MODES.includes(
                                      txn.paymentMode as (typeof TRANSACTION_PAYMENT_MODES)[number]
                                    )
                                      ? txn.paymentMode
                                      : txn.paymentMode || "Cash"
                                  }
                                  disabled={transactionModeUpdatingId === txn._id}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    if (v === txn.paymentMode) return;
                                    void handleTransactionPaymentModeChange(txn._id, v);
                                  }}
                                  aria-label="Payment mode"
                                >
                                  {txn.paymentMode &&
                                  !TRANSACTION_PAYMENT_MODES.includes(
                                    txn.paymentMode as (typeof TRANSACTION_PAYMENT_MODES)[number]
                                  ) ? (
                                    <option value={txn.paymentMode}>{txn.paymentMode}</option>
                                  ) : null}
                                  {TRANSACTION_PAYMENT_MODES.map((m) => (
                                    <option key={m} value={m}>
                                      {m}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <span className="fw-medium">{txn.paymentMode || "—"}</span>
                              )}
                            </td>
                            <td>
                              <button
                                type="button"
                                className="btn btn-link p-0 text-primary"
                                onClick={() => setPrintTransactionId(txn._id)}
                                aria-label={`Print receipt for ${txn.transactionId}`}
                              >
                                <i className="ti ti-download fs-16" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="mt-3 d-flex justify-content-end">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setShowAddTransaction(true)}
                  >
                    <i className="ti ti-plus me-1" />
                    Add Transaction
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {SHOW_ABHA_FEATURES ? (
          <HealthRecordsList
            sourceType="IPD"
            sourceId={ipd?._id ?? ""}
            refreshKey={healthRecordsRefreshKey}
            abhaLinked={Boolean(ipd?.abhaLinked)}
            patientPhone={patient?.phone}
            onEdit={(fhirId) => {
              setEditingRecordId(fhirId);
              setShowAddRecord(true);
            }}
          />
        ) : null}
      </div>

      <IpdDischargeSummaryForm
        ipdId={ipd._id}
        ipdStatus={ipd.status}
        initialSummary={dischargeSummaryRaw}
        open={showDischargeSummary}
        onClose={() => setShowDischargeSummary(false)}
        onDischargeComplete={fetchIPDDetails}
      />

      {showPrintReceipt && ipd ? (
        <PrintReceipt
          receiptData={buildIPDReceiptData(ipd, dueAmount)}
          pathlabReceiptData={buildPathlabReceiptsFromIPD(ipd)}
          onClose={() => setShowPrintReceipt(false)}
        />
      ) : null}

      {showPrintDischargeSummary && ipd ? (() => {
        const summaryPrintData = buildPrintDischargeSummaryData(ipd, dischargeSummaryRaw);
        if (!summaryPrintData) return null;
        return (
          <PrintDischargeSummary
            summaryData={summaryPrintData}
            onClose={() => setShowPrintDischargeSummary(false)}
          />
        );
      })() : null}

      {printTransactionId && ipd ? (() => {
        const txn = transactions.find((t) => t._id === printTransactionId);
        if (!txn) return null;
        const txnReceipt: IReceiptData = {
          visitId: ipd.ipdId,
          appointmentId: ipd.appointmentId,
          visitDate: txn.transactionDate,
          visitType: "IPD",
          appointmentType: "IPD",
          status: ipd.status,
          patientName: patient?.name,
          patientTitle: patient?.title,
          mrd: patient?.mrd,
          age: patientAgeUi,
          gender: patient?.gender,
          phone: patient?.phone,
          address: patient?.address,
          doctorName: doctor?.name,
          doctorDepartment: doctor?.department,
          medicalLicenseNo: doctor?.medicalLicenseNo,
          receiptId: txn.transactionId,
          transactions: [{
            _id: txn._id,
            transactionId: txn.transactionId,
            transactionType: "Payment",
            amount: txn.amount,
            paymentMode: txn.paymentMode,
            transactionDate: txn.transactionDate,
            createdAt: txn.createdAt,
          }],
          totalAmount: txn.amount,
          discount: 0,
          dueAmount: 0,
          paidAmount: txn.amount,
        };
        return (
          <PrintReceipt
            receiptData={txnReceipt}
            onClose={() => setPrintTransactionId(null)}
          />
        );
      })() : null}

      {showFinalDischargeConfirm ? (
        <div
          className="modal fade show d-block"
          role="dialog"
          aria-modal="true"
          aria-labelledby="final_discharge_confirm_title"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", zIndex: 1060 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowFinalDischargeConfirm(false);
          }}
        >
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content">
              <div className="modal-body text-center position-relative z-1">
                <ImageWithBasePath
                  src="assets/img/bg/delete-modal-bg-01.png"
                  alt=""
                  className="img-fluid position-absolute top-0 start-0 z-n1"
                />
                <ImageWithBasePath
                  src="assets/img/bg/delete-modal-bg-02.png"
                  alt=""
                  className="img-fluid position-absolute bottom-0 end-0 z-n1"
                />
                <div className="mb-3">
                  <span className="avatar avatar-lg bg-warning text-white">
                    <i className="ti ti-alert-triangle fs-24" aria-hidden />
                  </span>
                </div>
                <h5 id="final_discharge_confirm_title" className="fw-bold mb-1">
                  Save final discharge?
                </h5>
                <p className="mb-3 text-muted small">
                  This will complete the IPD admission and cannot be undone from this form.
                </p>
                <div className="d-flex justify-content-center flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-light"
                    onClick={() => setShowFinalDischargeConfirm(false)}
                    disabled={savingFinalDischarge}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleConfirmSaveFinalDischarge}
                    disabled={savingFinalDischarge}
                  >
                    {savingFinalDischarge ? "Saving…" : "Confirm"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showAddTransaction && ipd ? (
        <>
          <div
            className="modal-backdrop fade show"
            onClick={handleCloseModal}
            style={{ zIndex: 1050 }}
          />
          <div
            className="modal fade show"
            style={{ display: "block", zIndex: 1055 }}
            tabIndex={-1}
            role="dialog"
          >
            <div className="modal-dialog modal-dialog-centered" role="document">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title fw-bold text-dark">Add Transaction</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={handleCloseModal}
                    aria-label="Close"
                  />
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label mb-2 fw-medium text-dark">
                      Mode<span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select"
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value)}
                    >
                      <option value="Select">Select</option>
                      <option value="Cash">Cash</option>
                      <option value="Card">Card</option>
                      <option value="UPI">UPI</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label mb-2 fw-medium text-dark">
                      Amount Received<span className="text-danger">*</span>
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="mb-0">
                    <label className="form-label mb-2 fw-medium text-dark">Due</label>
                    <div className="text-dark fs-15">₹{dueAmount.toFixed(2)}</div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-light"
                    onClick={handleCloseModal}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleAddTransaction}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm me-2"
                          role="status"
                          aria-hidden="true"
                        />
                        Adding...
                      </>
                    ) : (
                      "Add"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
      {SHOW_ABHA_FEATURES ? (
        <AddHealthRecordForm
          sourceType="IPD"
          sourceId={ipd?._id ?? ""}
          authorId={ipd?.doctorId ?? doctor?._id}
          editRecordId={editingRecordId}
          open={showAddRecord}
          onClose={() => {
            setShowAddRecord(false);
            setEditingRecordId(null);
          }}
          onSaved={() => setHealthRecordsRefreshKey((k) => k + 1)}
        />
      ) : null}
    </div>
  );
};

export default IpdAppointmentDetailsComponent;
