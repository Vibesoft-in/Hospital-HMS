"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { all_routes } from "../../../../../routes/all_routes";
import axios from "axios";
import { API_BASE_URL } from "@/environment";
import ImageWithBasePath from "@/core/imageWithBasePath";
import PrintReceipt from "../printReceipt";
import type { IReceiptData, IReceiptTransaction } from "../printReceipt";
import AddHealthRecordForm from "@/components/pages/clinic-modules/health-records/AddHealthRecordForm";
import HealthRecordsList from "@/components/pages/clinic-modules/health-records/HealthRecordsList";
import { SHOW_ABHA_FEATURES } from "@/core/config/featureFlags";
import dayjs from "dayjs";

interface IVisit {
  _id: string;
  visitId: string;
  receiptId?: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  visitType: string;
  appointmentType: string;
  reason?: string;
  visitDate: string;
  visitTime: string;
  sessionSlot: string;
  tokenNumber: number;
  price: number;
  discount?: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  patient?: IPatient;
  doctor?: IDoctor;
  transactions?: ITransaction[];
  amountPaid?: number;
  paymentStatus?: string;
  abhaLinked?: boolean;
}

interface IPatient {
  _id: string;
  mrd?: string;
  title?: string;
  name: string;
  phone: string;
  email?: string;
  dob?: string;
  age?: number;
  gender?: string;
  bloodGroup?: string;
  address?: string;
  abhaLinked?: boolean;
}

interface IDoctor {
  _id: string;
  doctorId?: string;
  name: string;
  designation?: string;
  department?: string;
  medicalLicenseNo?: string;
  email?: string;
  phone?: string;
}

interface ITransaction {
  _id: string;
  transactionId: string;
  visitId: string;
  transactionType: string;
  amount: number;
  paymentMode: string;
  referenceNo?: string;
  transactionDate: string;
  createdAt: string;
  updatedAt: string;
}

type IVisitWithAmountPaid = IVisit & { amountPaid?: number };

const TRANSACTION_PAYMENT_MODES = ["Cash", "UPI", "Card"] as const;

const AppointmentDetailsComponent = () => {
  const params = useParams();
  const router = useRouter();
  const visitId = params?.id as string;
  
  const [visit, setVisit] = useState<IVisit | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [showPrintReceipt, setShowPrintReceipt] = useState(false);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [paymentMode, setPaymentMode] = useState<string>("Cash");
  const [amount, setAmount] = useState<string>("0");
  const [submitting, setSubmitting] = useState(false);
  const [transactionModeUpdatingId, setTransactionModeUpdatingId] = useState<string | null>(null);
  const [printTransactionId, setPrintTransactionId] = useState<string | null>(null);
  const [showAddRecord, setShowAddRecord] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [healthRecordsRefreshKey, setHealthRecordsRefreshKey] = useState(0);

  useEffect(() => {
    if (visitId) {
      fetchAppointmentDetails();
    }
  }, [visitId]);

  const fetchAppointmentDetails = async () => {
    try {
      setLoading(true);
      setError("");

      if (!API_BASE_URL) {
        setError("API configuration error");
        return;
      }

      const response = await axios.get(`${API_BASE_URL}/hospital/visits/${visitId}`);

      if (response.data?.code === 200 && response.data?.data?.visit) {
        const visitData = response.data.data.visit as IVisit;
        const responseReceiptId = response.data?.data?.receiptId as string | undefined;
        setVisit({
          ...visitData,
          receiptId: visitData?.receiptId ?? responseReceiptId,
          abhaLinked: visitData?.patient?.abhaLinked === true || visitData?.abhaLinked === true,
        });
      } else {
        setError("Appointment not found");
      }
    } catch (err: any) {
      console.error("Error fetching appointment details:", err);
      setError(err.response?.data?.message || "Failed to load appointment details");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (time: string) => {
    if (!time) return "N/A";
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const calculateAge = (dob: string) => {
    if (!dob) return null;
    const birthDate = dayjs(dob).toDate();
    const today = new Date();
    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    let days = today.getDate() - birthDate.getDate();
    if (days < 0) {
      months--;
      const lastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      days += lastMonth.getDate();
    }
    if (months < 0) {
      years--;
      months += 12;
    }
    return { years, months, days };
  };

  const handleAddTransaction = async () => {
    if (!visit || !API_BASE_URL || submitting) return;
    
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
      const response = await axios.post(`${API_BASE_URL}/hospital/transactions`, {
        visitId: visit._id,
        transactionType: "Payment",
        amount: amountNum,
        paymentMode: paymentMode,
      });

      if (response.data?.code === 200 || response.status >= 200 && response.status < 300) {
        setShowAddTransaction(false);
        setAmount("0");
        setPaymentMode("Cash");
        await fetchAppointmentDetails();
      } else {
        alert(response.data?.message || "Failed to add transaction");
      }
    } catch (err: any) {
      console.error("Error adding transaction:", err);
      alert(err.response?.data?.message || "Failed to add transaction. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setShowAddTransaction(false);
    setAmount("0");
    setPaymentMode("Cash");
  };

  const handleConvertToIpd = () => {
    if (!visit?.patientId || !visit?._id) return;

    const params = new URLSearchParams({
      tab: "ipd",
      patientId: visit.patientId,
      visitMongoId: visit._id,
    });

    if (visit.doctorId?.trim()) {
      params.set("doctorId", visit.doctorId.trim());
    }
    if (visit.reason?.trim()) {
      params.set("reason", visit.reason.trim());
    }

    const visitCode = visit.visitId?.trim() ?? "";
    const datePart = visit.visitDate ? dayjs(visit.visitDate).format("DD MMM YYYY") : "";
    const opdVisitLabel =
      visitCode && datePart ? `${visitCode} — ${datePart}` : visitCode || "OPD Visit";
    params.set("opdVisitLabel", opdVisitLabel);

    router.push(`${all_routes.newAppointment}?${params.toString()}`);
  };

  const handleTransactionPaymentModeChange = async (
    transactionMongoId: string,
    newPaymentMode: string
  ) => {
    if (!API_BASE_URL || !visit) return;
    try {
      setTransactionModeUpdatingId(transactionMongoId);
      await axios.patch(`${API_BASE_URL}/hospital/transactions/${transactionMongoId}`, {
        paymentMode: newPaymentMode,
      });
      setVisit((prev) => {
        if (!prev?.transactions) return prev;
        return {
          ...prev,
          transactions: prev.transactions.map((t) =>
            t._id === transactionMongoId ? { ...t, paymentMode: newPaymentMode } : t
          ),
        };
      });
    } catch (err: any) {
      alert(err?.response?.data?.message ?? "Failed to update payment mode.");
      await fetchAppointmentDetails();
    } finally {
      setTransactionModeUpdatingId(null);
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

  if (error || !visit) {
    return (
      <div className="page-wrapper">
        <div className="content">
          <div className="alert alert-danger">
            <strong>Error:</strong> {error || "Appointment not found"}
          </div>
          <Link href={all_routes.appointments} className="btn btn-primary">
            Back to Appointments
          </Link>
        </div>
      </div>
    );
  }

  const patient = visit.patient;
  const doctor = visit.doctor;
  const transactions = visit.transactions || [];
  const age = patient?.dob ? calculateAge(patient.dob) : null;
  const totalPaid = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  const dueAmount = Math.max(0, (visit.price || 0) - totalPaid);

  const patientAgeUi = (() => {
    const apiYears = patient?.age;
    const apiMonths = (patient as any)?.months as number | undefined;
    const apiDays = (patient as any)?.days as number | undefined;

    if (apiYears != null && Number.isFinite(Number(apiYears))) {
      const y = Number(apiYears);
      if (y === 0) {
        const m = apiMonths != null ? Number(apiMonths) : 0;
        if (m > 0) return `${m} ${m === 1 ? "Month" : "Months"}`;
        if (apiDays != null) return `${apiDays} ${apiDays === 1 ? "Day" : "Days"}`;
        return undefined;
      }
      return `${y} ${y === 1 ? "Year" : "Years"}`;
    }

    if (age) {
      if (age.years === 0) {
        if (age.months > 0) return `${age.months} ${age.months === 1 ? "Month" : "Months"}`;
        return `${age.days} ${age.days === 1 ? "Day" : "Days"}`;
      }
      return `${age.years} ${age.years === 1 ? "Year" : "Years"}`;
    }

    return undefined;
  })();

  const patientAgeReceipt = (() => {
    const apiYears = patient?.age;
    const apiMonths = (patient as any)?.months as number | undefined;
    const apiDays = (patient as any)?.days as number | undefined;

    if (apiYears != null && Number.isFinite(Number(apiYears))) {
      const y = Number(apiYears);
      if (y === 0) {
        const m = apiMonths != null ? Number(apiMonths) : 0;
        if (m > 0) return `${m} ${m === 1 ? "Month" : "Months"}`;
        if (apiDays != null) return `${apiDays} ${apiDays === 1 ? "Day" : "Days"}`;
        return undefined;
      }
      return `${y} ${y === 1 ? "Year" : "Years"}`;
    }

    if (age) {
      if (age.years === 0) {
        if (age.months > 0)
          return `${age.months} ${age.months === 1 ? "Month" : "Months"}`;
        return `${age.days} ${age.days === 1 ? "Day" : "Days"}`;
      }
      return `${age.years} ${age.years === 1 ? "Year" : "Years"}`;
    }

    return undefined;
  })();

  return (
    <div className="page-wrapper">
      <div className="content">
        {/* Header */}
        <div className="mb-4 d-flex flex-wrap align-items-center justify-content-between gap-2">
          <h6 className="fw-bold mb-0 d-flex align-items-center">
            <Link href={all_routes.appointments} className="text-dark">
              <i className="ti ti-chevron-left me-1" />
              Appointments
            </Link>
          </h6>
          <div className="d-flex flex-wrap align-items-center gap-2">
            <button
              type="button"
              className="btn btn-outline-primary btn-sm d-inline-flex align-items-center"
              onClick={handleConvertToIpd}
              disabled={!visit?.patientId || !visit?._id}
            >
              <i className="ti ti-bed me-1" />
              Convert to IPD
            </button>
            {SHOW_ABHA_FEATURES ? (
              <button
                type="button"
                className="btn btn-outline-primary btn-sm d-inline-flex align-items-center"
                onClick={() => {
                  setEditingRecordId(null);
                  setShowAddRecord(true);
                }}
                disabled={!visit?._id}
              >
                <i className="ti ti-file-plus me-1" />
                Add Record
              </button>
            ) : null}
            <button
              type="button"
              className="btn btn-primary btn-sm d-inline-flex align-items-center"
              onClick={() => setShowPrintReceipt(true)}
            >
              <i className="ti ti-receipt me-1" />
              Print Receipt
            </button>
          </div>
        </div>

        {/* Main Content - Two Column Layout */}
        <div className="row">
          {/* Left Column - Appointment Details */}
          <div className="col-lg-7 pe-3">
            {/* Combined Details Card */}
            <div className="card mb-3">
              <div className="card-body p-3">
                {/* Appointment Information Section */}
                <h6 className="fw-bold text-primary mb-3">Appointment Information</h6>
                <div className="row g-2 mb-4">
                  <div className="col-md-3">
                    <div className="mb-2">
                      <label className="form-label mb-1 fw-medium text-dark fs-14">Visit ID</label>
                      <div className="fw-bold text-dark">{visit.visitId}</div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="mb-2">
                      <label className="form-label mb-1 fw-medium text-dark fs-14">Appointment ID</label>
                      <div className="fw-bold text-dark">{visit.appointmentId}</div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="mb-2">
                      <label className="form-label mb-1 fw-medium text-dark fs-14">Appointment Date</label>
                      <div className="fw-bold text-dark">
                        {visit.visitDate ? dayjs(visit.visitDate).format("DD MMM YYYY") : "N/A"}
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="mb-2">
                      <label className="form-label mb-1 fw-medium text-dark fs-14">Time</label>
                      <div className="fw-bold text-dark">{formatTime(visit.visitTime)}</div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="mb-2">
                      <label className="form-label mb-1 fw-medium text-dark fs-14">Session Slot</label>
                      <div className="fw-bold text-dark">{visit.sessionSlot || "N/A"}</div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="mb-2">
                      <label className="form-label mb-1 fw-medium text-dark fs-14">Token Number</label>
                      <div className="fw-bold text-dark">{visit.tokenNumber || "N/A"}</div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="mb-2">
                      <label className="form-label mb-1 fw-medium text-dark fs-14">Visit Type</label>
                      <div className="fw-bold text-dark">{visit.visitType || "N/A"}</div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="mb-2">
                      <label className="form-label mb-1 fw-medium text-dark fs-14">Appointment Type</label>
                      <div className="fw-bold text-dark">{visit.appointmentType || "N/A"}</div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="mb-2">
                      <label className="form-label mb-1 fw-medium text-dark fs-14">Status</label>
                      <div>
                        <span
                          className={`badge ${
                            visit.status === "Completed"
                              ? "badge-soft-success"
                              : visit.status === "Cancelled"
                              ? "badge-soft-danger"
                              : visit.status === "In Progress"
                              ? "badge-soft-warning text-dark"
                              : "badge-soft-primary"
                          }`}
                        >
                          {visit.status || "Scheduled"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Patient Details Section */}
                <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
                  <h6 className="fw-bold text-primary mb-0">Patient Details</h6>
                  <Link
                    href={`${all_routes.patientDetails}?id=${patient?._id ?? visit.patientId ?? ""}`}
                    className={`btn btn-sm d-inline-flex align-items-center ${
                      patient?._id || visit.patientId ? "btn-primary" : "btn-light disabled"
                    }`}
                    aria-disabled={!(patient?._id || visit.patientId)}
                  >
                    <i className="ti ti-user-circle me-1" />
                    Open Profile
                  </Link>
                </div>
                <div className="row g-2 mb-4">
                  <div className="col-md-3">
                    <div className="mb-2">
                      <label className="form-label mb-1 fw-medium text-dark fs-14">Patient Name</label>
                      <div className="fw-bold text-dark">
                        {patient?.title ? `${patient.title} ` : ""}{patient?.name || "N/A"}
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="mb-2">
                      <label className="form-label mb-1 fw-medium text-dark fs-14">Age / Gender</label>
                      <div className="fw-bold text-dark">
                        {patientAgeUi || "N/A"} / {patient?.gender || "N/A"}
                      </div>
                    </div>
                  </div>
                  {patient?.mrd && (
                    <div className="col-md-3">
                      <div className="mb-2">
                        <label className="form-label mb-1 fw-medium text-dark fs-14">MRD</label>
                        <div className="fw-bold text-dark">{patient.mrd}</div>
                      </div>
                    </div>
                  )}
                  <div className="col-md-3">
                    <div className="mb-2">
                      <label className="form-label mb-1 fw-medium text-dark fs-14">Phone</label>
                      <div className="fw-bold text-dark">{patient?.phone || "N/A"}</div>
                    </div>
                  </div>
                  {patient?.email && (
                    <div className="col-md-3">
                      <div className="mb-2">
                        <label className="form-label mb-1 fw-medium text-dark fs-14">Email</label>
                        <div className="fw-bold text-dark">{patient.email}</div>
                      </div>
                    </div>
                  )}
                  {patient?.bloodGroup && (
                    <div className="col-md-3">
                      <div className="mb-2">
                        <label className="form-label mb-1 fw-medium text-dark fs-14">Blood Group</label>
                        <div className="fw-bold text-dark">{patient.bloodGroup}</div>
                      </div>
                    </div>
                  )}
                  {patient?.address && (
                    <div className="col-md-12">
                      <div className="mb-2">
                        <label className="form-label mb-1 fw-medium text-dark fs-14">Address</label>
                        <div className="fw-bold text-dark">{patient.address}</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Doctor Details Section */}
                {doctor && (
                  <>
                    <h6 className="fw-bold text-primary mb-3">Doctor Details</h6>
                    <div className="row g-2">
                      <div className="col-md-4">
                        <div className="mb-2">
                          <label className="form-label mb-1 fw-medium text-dark fs-14">Doctor Name</label>
                          <div className="fw-bold text-dark">{doctor.name}</div>
                        </div>
                      </div>
                      {doctor.designation && (
                        <div className="col-md-4">
                          <div className="mb-2">
                            <label className="form-label mb-1 fw-medium text-dark fs-14">Designation</label>
                            <div className="fw-bold text-dark">{doctor.designation}</div>
                          </div>
                        </div>
                      )}
                      {doctor.department && (
                        <div className="col-md-4">
                          <div className="mb-2">
                            <label className="form-label mb-1 fw-medium text-dark fs-14">Department</label>
                            <div className="fw-bold text-dark">{doctor.department}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Payment History */}
          <div className="col-lg-5 ps-3">
            <div className="card">
              <div className="card-body p-3">
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <h6 className="fw-bold text-primary mb-0">Payment History</h6>
                </div>

                {transactions.length === 0 ? (
                  <div className="text-center py-4 text-muted">
                    <i className="ti ti-receipt fs-48 mb-2 d-block" />
                    <p className="mb-0">No payment transactions found</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover mb-0">
                      <thead>
                        <tr>
                          <th className="border-0 fs-13 fw-medium">ID</th>
                          <th className="border-0 fs-13 fw-medium">Date - Time</th>
                          <th className="border-0 fs-13 fw-medium">Amount</th>
                          <th className="border-0 fs-13 fw-medium">Mode</th>
                          <th className="border-0 fs-13 fw-medium" style={{ width: "40px" }} />
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.map((txn) => (
                          <tr key={txn._id}>
                            <td className="fs-15 text-dark fw-medium">{txn.transactionId}</td>
                            <td className="fs-15 text-dark">
                              {dayjs(txn.transactionDate).format("DD MMM YYYY")}
                              <br />
                              <small className="text-dark">
                                {dayjs(txn.createdAt).format("HH:mm")}
                              </small>
                            </td>
                            <td className="fs-15 text-dark fw-medium">
                              <i className="ti ti-check fs-14 me-1 text-success" />
                              ₹{txn.amount?.toFixed(2) || "0.00"}
                            </td>
                            <td className="fs-15 text-dark">
                              <select
                                className="form-select form-select-sm"
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

                <div className="mt-3  d-flex justify-content-end">
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
            sourceType="Visit"
            sourceId={visit?._id ?? ""}
            refreshKey={healthRecordsRefreshKey}
            abhaLinked={Boolean(visit?.abhaLinked)}
            patientPhone={patient?.phone}
            onEdit={(fhirId) => {
              setEditingRecordId(fhirId);
              setShowAddRecord(true);
            }}
          />
        ) : null}

        {showPrintReceipt && visit && (() => {
          const visitCharge: IReceiptTransaction = {
            _id: visit._id,
            transactionId: "",
            transactionType: undefined,
            amount: visit.price || 0,
            paymentMode: "",
            referenceNo: undefined,
            transactionDate: visit.visitDate || visit.createdAt || "",
            createdAt: visit.createdAt || "",
          };

          const receiptData: IReceiptData = {
            visitId: visit.visitId,
            appointmentId: visit.appointmentId,
            visitDate: visit.visitDate,
            visitTime: visit.visitTime,
            tokenNumber: visit.tokenNumber,
            visitType: visit.visitType,
            appointmentType: visit.appointmentType,
            status: visit.status,
            patientName: patient?.name,
            patientTitle: patient?.title,
            mrd: patient?.mrd,
            age: patientAgeReceipt,
            gender: patient?.gender,
            phone: patient?.phone,
            address: patient?.address,
            doctorName: doctor?.name,
            doctorDepartment: doctor?.department,
            medicalLicenseNo: doctor?.medicalLicenseNo,
            receiptId: visit.receiptId,
            transactions: [visitCharge],
            totalAmount: visit.price || 0,
            discount: visit.discount || 0,
            dueAmount: dueAmount,
            paidAmount: (visit as IVisitWithAmountPaid).amountPaid ?? 0,
          };

          return (
            <PrintReceipt
              receiptData={receiptData}
              onClose={() => setShowPrintReceipt(false)}
            />
          );
        })()}

        {printTransactionId && visit && (() => {
          const txn = transactions.find((t) => t._id === printTransactionId);
          if (!txn) return null;
          const txnReceipt: IReceiptData = {
            visitId: visit.visitId,
            appointmentId: visit.appointmentId,
            visitDate: txn.transactionDate,
            visitTime: visit.visitTime,
            visitType: visit.visitType,
            appointmentType: visit.appointmentType,
            status: visit.status,
            patientName: patient?.name,
            patientTitle: patient?.title,
            mrd: patient?.mrd,
            age: patientAgeReceipt,
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
        })()}

        {/* Add Transaction Modal */}
        {showAddTransaction && visit && (
          <>
            <div className="modal-backdrop fade show" onClick={handleCloseModal} style={{ zIndex: 1050 }} />
            <div className="modal fade show" style={{ display: "block", zIndex: 1055 }} tabIndex={-1} role="dialog">
              <div className="modal-dialog modal-dialog-centered" role="document">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title fw-bold">Add Transaction</h5>
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
                      <div className="text-dark fs-15">
                        ₹{dueAmount.toFixed(2)}
                      </div>
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
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
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
        )}
        {SHOW_ABHA_FEATURES ? (
          <AddHealthRecordForm
            sourceType="Visit"
            sourceId={visit?._id ?? ""}
            authorId={visit?.doctorId ?? visit?.doctor?._id}
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
    </div>
  );
};

export default AppointmentDetailsComponent;
