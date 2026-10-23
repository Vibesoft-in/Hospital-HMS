"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { all_routes } from "../../../../../routes/all_routes";
import axios from "axios";
import { API_BASE_URL } from "@/environment";
import {
  formatPatientPhoneForApi,
  validateIndianMobilePhone,
} from "@/core/utils/formatPatientPhoneForApi";
import dayjs from "dayjs";
import { DatePicker, TimePicker } from "antd";
import CommonSelect, { Option } from "@/core/common/common-select/commonSelect";
import {
  Title,
  Gender,
  Visit_Type,
  Blood_Group,
} from "@/core/common/selectOption";
import IndianPhoneSearchInput from "@/core/common/indianPhoneInput/IndianPhoneSearchInput";

interface IVisitTypeCharge {
  visitType?: string;
  appointmentType?: string;
  charge: number;
  /** @deprecated use visitType + appointmentType */
  type?: string;
}

interface IWeeklyScheduleDay {
  dayOfWeek: string;
  mr?: boolean;
  slots?: unknown[];
}

interface IDoctor {
  _id: string;
  name: string;
  department?: string;
  sessions?: string[];
  visitTypes?: IVisitTypeCharge[];
  weeklySchedule?: IWeeklyScheduleDay[];
}

const EditAppointmentComponent = () => {
  const params = useParams();
  const router = useRouter();
  const visitId = params?.id as string;

  const getModalContainer = () => {
    return document.body;
  };

  // Edit appointment state
  const [doctors, setDoctors] = useState<IDoctor[]>([]);
  const [doctorOptions, setDoctorOptions] = useState<Option[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<Option | null>(null);
  const [sessionOptions, setSessionOptions] = useState<Option[]>([]);
  const [sessionSlot, setSessionSlot] = useState<Option | null>(null);
  const [visitDate, setVisitDate] = useState<any>(null);
  const [visitTime, setVisitTime] = useState<any>(null);
  const [visitType, setVisitType] = useState<Option | null>(null);
  const [appointmentType, setAppointmentType] = useState<string>("OPD");
  const [reason, setReason] = useState<string>("");
  const [visitStatus, setVisitStatus] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  // Payment
  const [paymentMode, setPaymentMode] = useState<string>("Cash");
  const [total, setTotal] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [amountReceived, setAmountReceived] = useState<number>(0);
  const [amountPaidFromApi, setAmountPaidFromApi] = useState<number>(0); // amount already paid (from visit)
  const finalAmount = total - discount;
  const balance = finalAmount - amountReceived;
  const [showDiscountPasswordDialog, setShowDiscountPasswordDialog] = useState<boolean>(false);
  const [discountPassword, setDiscountPassword] = useState<string>("");
  const [discountPasswordError, setDiscountPasswordError] = useState<string>("");
  const [discountFromApi, setDiscountFromApi] = useState<number>(0);

  // MR option is disabled when doctor has mr: false for the selected visit day
  const isMrDisabledForSelectedDay = useMemo(() => {
    if (!selectedDoctor?.value || !visitDate) return true;
    const doctor = doctors.find((d) => d._id === selectedDoctor.value);
    if (!doctor?.weeklySchedule?.length) return true;
    const dayName = dayjs.isDayjs(visitDate)
      ? visitDate.format("dddd")
      : dayjs(visitDate).format("dddd");
    if (!dayName) return true;
    const daySchedule = doctor.weeklySchedule.find((d) => d.dayOfWeek === dayName);
    return daySchedule?.mr !== true;
  }, [selectedDoctor?.value, visitDate, doctors]);
  const isMrVisitSelected = visitType?.value === "MR";
  const isPaymentModeDisabledForMr = isMrVisitSelected;

  useEffect(() => {
    if (isMrVisitSelected && paymentMode === "Card") {
      setPaymentMode("Cash");
    }
  }, [isMrVisitSelected, paymentMode]);

  // Patient fields
  const [phone, setPhone] = useState<string>("");
  const [title, setTitle] = useState<Option | null>(Title[0] || null);
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [dob, setDob] = useState<any>(null);
  const [ageYears, setAgeYears] = useState<string>("");
  const [ageMonths, setAgeMonths] = useState<string>("");
  const [ageDays, setAgeDays] = useState<string>("");
  const [gender, setGender] = useState<Option | null>(Gender[0] || null);
  const [bloodGroup, setBloodGroup] = useState<Option | null>(Blood_Group[0] || null);
  const [address, setAddress] = useState<string>("");
  const [aadharNo, setAadharNo] = useState<string>("");
  const [ayushmanNo, setAyushmanNo] = useState<string>("");
  const [companyName, setCompanyName] = useState<string>("");
  const [division, setDivision] = useState<string>("");
  const [patientId, setPatientId] = useState<string | null>(null);
  const [attendantName, setAttendantName] = useState<string>("");
  const [attendantRelation, setAttendantRelation] = useState<string>("");

  const fetchDoctors = useCallback(async () => {
    if (!API_BASE_URL) return;
    try {
      const res = await axios.get(`${API_BASE_URL}/hospital/doctors`, { params: { limit: 100 } });
      if (res.data?.code === 200 && res.data?.data?.doctors) {
        const list: IDoctor[] = res.data.data.doctors;
        setDoctors(list);
        setDoctorOptions(list.map((d) => ({ value: d._id, label: d.department ? `${d.name} (${d.department})` : d.name })));
      }
    } catch (e) {
      console.error("Error fetching doctors:", e);
    }
  }, []);

  const fetchVisitForEdit = useCallback(async (id: string) => {
    if (!API_BASE_URL) return;
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(`${API_BASE_URL}/hospital/visits/${id}`);
      if (res.data?.code === 200 && res.data?.data?.visit) {
        const v = res.data.data.visit;
        setPatientId(v.patientId ?? null);
        setVisitStatus((v as { status?: string }).status || "");
        setVisitDate(v.visitDate ? dayjs(v.visitDate) : null);
        setVisitTime(v.visitTime ? dayjs(v.visitTime, "HH:mm") : null);
        setVisitType(Visit_Type.find((vt) => vt.value === v.visitType) || null);
        setAppointmentType(v.appointmentType || "OPD");
        setReason(v.reason || "");
        setAttendantName((v as any).attendantName || "");
        setAttendantRelation((v as any).attendantRelation || "");
        const priceNum = v.price != null ? Number(v.price) : 0;
        const discountNum = v.discount != null ? Number(v.discount) : 0;
        const amountPaid = (v as { amountPaid?: number }).amountPaid != null
          ? Number((v as { amountPaid?: number }).amountPaid)
          : (v as { amountReceived?: number }).amountReceived != null
            ? Number((v as { amountReceived?: number }).amountReceived)
            : 0;
        setTotal(priceNum + discountNum);
        setDiscount(discountNum);
        setDiscountFromApi(discountNum);
        setAmountReceived(amountPaid);
        setAmountPaidFromApi(amountPaid);
        const transactions = (v as { transactions?: Array<{ paymentMode?: string }> }).transactions;
        const lastPaymentMode = transactions?.length
          ? transactions[transactions.length - 1]?.paymentMode
          : undefined;
        setPaymentMode(lastPaymentMode ?? (v as { paymentMode?: string }).paymentMode ?? "Cash");
        
        const docOpt = { value: v.doctorId, label: "" };
        const docRes = await axios.get(`${API_BASE_URL}/hospital/doctors/${v.doctorId}`);
        if (docRes.data?.code === 200 && docRes.data?.data?.doctor) {
          const d = docRes.data.data.doctor;
          docOpt.label = d.department ? `${d.name || "Unknown"} (${d.department})` : (d.name || "Unknown");
          setSelectedDoctor(docOpt);
          const sessions = d.sessions;
          if (sessions?.length) {
            const opts = sessions.map((s: string) => ({ value: s, label: s }));
            setSessionOptions(opts);
            const matchedSession = v.sessionSlot
              ? opts.find((o: Option) => o.value === v.sessionSlot)
              : null;
            setSessionSlot(matchedSession || null);
          } else {
            setSessionOptions([]);
            setSessionSlot(null);
          }
        } else {
          setSelectedDoctor(docOpt);
          setSessionOptions([]);
          setSessionSlot(null);
        }
        
        try {
          const pRes = await axios.get(`${API_BASE_URL}/hospital/patients/${v.patientId}`);
          if (pRes.data?.code === 200 && pRes.data?.data?.patient) {
            const p = pRes.data.data.patient;
            setPhone(p.phone || "");
            setTitle(Title.find((t) => t.value === p.title) || Title[0] || null);
            setName(p.name || "");
            setEmail(p.email || "");
            setDob(p.dob ? dayjs(p.dob) : null);
            setGender(Gender.find((g) => g.value === p.gender) || Gender[0] || null);
            setBloodGroup(Blood_Group.find((bg) => bg.value === p.bloodGroup) || Blood_Group[0] || null);
            setAddress(p.address || "");
            setAadharNo((p as any).aadharNo || "");
            setAyushmanNo((p as any).ayushmanCardNo || "");
            setCompanyName((p as { companyName?: string }).companyName ?? "");
            setDivision((p as { division?: string }).division ?? "");
            if (p.dob) {
              const birthDate = dayjs(p.dob).toDate();
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
              setAgeYears(years.toString());
              setAgeMonths(months.toString());
              setAgeDays(days.toString());
            } else if (p.age != null) {
              setAgeYears(String(p.age));
              const pm = (p as { months?: number }).months;
              const pd = (p as { days?: number }).days;
              if (pm != null) setAgeMonths(String(pm));
              if (pd != null) setAgeDays(String(pd));
            }
          }
        } catch {
          // keep defaults
        }
      } else {
        setError("Appointment not found");
      }
    } catch (e: any) {
      console.error("Error fetching visit:", e);
      setError(e.response?.data?.message || "Failed to load appointment");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visitId) {
      fetchDoctors().then(() => fetchVisitForEdit(visitId));
    }
  }, [visitId, fetchDoctors, fetchVisitForEdit]);

  useEffect(() => {
    if (!selectedDoctor?.value) {
      setSessionOptions([]);
      setSessionSlot(null);
      return;
    }
    const doc = doctors.find((d) => d._id === selectedDoctor.value);
    if (doc?.sessions?.length) {
      const opts = doc.sessions.map((s) => ({ value: s, label: s }));
      setSessionOptions(opts);
      setSessionSlot((prev) =>
        prev && opts.some((o: Option) => o.value === prev.value) ? prev : null
      );
    } else {
      setSessionOptions([]);
      setSessionSlot(null);
    }
  }, [selectedDoctor, doctors]);

  // Recalculate Total from doctor's visitTypes (new shape: visitType, appointmentType, charge)
  const updateTotalFromDoctorCharge = useCallback(() => {
    if (!selectedDoctor?.value) {
      return;
    }
    const doctor = doctors.find((d) => d._id === selectedDoctor.value);
    const visitTypes = doctor?.visitTypes;
    if (!visitTypes?.length) {
      return;
    }
    const selectedVisit = visitType?.value && visitType.value !== "Select" ? visitType.value : null;
    const aptTypeNorm = (v: string) => (v || "").toLowerCase().replace(/\s/g, "");

    let match = visitTypes.find((vt: IVisitTypeCharge) => {
      if (vt.visitType != null && vt.appointmentType != null) {
        if (appointmentType === "Day Care") {
          return vt.visitType === "New" && (vt.appointmentType === "Day care" || vt.appointmentType === "Day Care");
        }
        return (vt.appointmentType === "OPD" || aptTypeNorm(vt.appointmentType) === "opd") && vt.visitType === selectedVisit;
      }
      if (vt.type != null) {
        if (appointmentType === "Day Care") return vt.type === "Day Care";
        return vt.type === (selectedVisit || "New") || (selectedVisit === "New" && vt.type === "OPD");
      }
      return false;
    });

    if (!match && selectedVisit === "New" && appointmentType !== "Day Care") {
      match = visitTypes.find((vt: IVisitTypeCharge) => vt.appointmentType === "OPD" && vt.visitType === "New");
    }
    if (match != null) {
      setTotal(match.charge);
    }
  }, [selectedDoctor, visitType, appointmentType, doctors]);

  useEffect(() => {
    updateTotalFromDoctorCharge();
  }, [updateTotalFromDoctorCharge]);

  const handleEditDoctorChange = (opt: Option | null) => {
    setSelectedDoctor(opt);
    setSessionSlot(null);
  };

  const handleDobChange = (date: any) => {
    setDob(date);
    if (date) {
      const birthDate = dayjs.isDayjs(date) ? date.toDate() : new Date(date);
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
      setAgeYears(years.toString());
      setAgeMonths(months.toString());
      setAgeDays(days.toString());
    } else {
      setAgeYears("");
      setAgeMonths("");
      setAgeDays("");
    }
  };

  const calculatePatientAgeYears = (): number => {
    if (ageYears) {
      const n = parseInt(ageYears, 10);
      return Number.isFinite(n) && !Number.isNaN(n) ? n : 0;
    }
    if (dob) {
      const birthDate = dayjs.isDayjs(dob) ? dob.toDate() : new Date(dob);
      const today = new Date();
      let years = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        years--;
      }
      return years;
    }
    return 0;
  };

  const parseAgeComponent = (s: string): number => {
    const t = s.trim();
    if (t === "") return 0;
    const n = parseInt(t, 10);
    return Number.isFinite(n) && !Number.isNaN(n) ? Math.max(0, n) : 0;
  };

  const canEditDoctorDetails =
    visitStatus === "Scheduled" || visitStatus === "No Show";

  const getDobValue = () => {
    if (!dob) return undefined;
    if (dayjs.isDayjs(dob)) return dob;
    if (typeof dob === "string" || dob instanceof Date) {
      const parsed = dayjs(dob);
      return parsed.isValid() ? parsed : undefined;
    }
    return undefined;
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitId || !API_BASE_URL) return;

    if (patientId && appointmentType === "OPD") {
      const phoneValidation = validateIndianMobilePhone(phone);
      if (!phoneValidation.valid) {
        setError(phoneValidation.message ?? "Invalid phone number.");
        return;
      }
    }

    const hasDiscountMismatch = Math.abs(discount - discountFromApi) > 0.0001;
    if (discount > 0 && hasDiscountMismatch) {
      setDiscountPassword("");
      setDiscountPasswordError("");
      setShowDiscountPasswordDialog(true);
      return;
    }
    doEditSubmit(undefined);
  };

  const doEditSubmit = async (discountPwd: string | undefined) => {
    if (!visitId || !API_BASE_URL) return;
    setLoading(true);
    setError("");
    try {
      const discountNum = Number(discount) || 0;
      const payload: Record<string, unknown> = {
        visitDate: visitDate ? dayjs(visitDate).format("YYYY-MM-DD") : undefined,
        visitTime: visitTime ? (dayjs.isDayjs(visitTime) ? visitTime.format("HH:mm") : dayjs(visitTime).format("HH:mm")) : undefined,
        sessionSlot: sessionSlot?.value,
        visitType: visitType?.value !== "Select" ? visitType?.value : undefined,
        appointmentType: appointmentType,
        reason: reason || undefined,
        attendantName: attendantName || undefined,
        attendantRelation: attendantRelation || undefined,
        discount: discountNum,
        ...(discountNum > 0 && discountPwd !== undefined && discountPwd !== "" && { discountPassword: discountPwd }),
      };
      const remainingAmount = Math.max(0, amountReceived - amountPaidFromApi);
      if (remainingAmount > 0) {
        payload.transaction = {
          transactionType: "Payment",
          amount: remainingAmount,
          paymentMode,
        };
      }
      const res = await axios.patch(`${API_BASE_URL}/hospital/visits/${visitId}`, payload);
      if (res.data?.code === 200 || (res.status >= 200 && res.status < 300)) {
        router.push(all_routes.appointments);
      } else {
        const responseMessage = res.data?.message || "Failed to update appointment";
        if (discountPwd !== undefined && discount > 0) {
          setDiscountPasswordError(String(responseMessage));
          setShowDiscountPasswordDialog(true);
          setError("");
          return;
        }
        setError(responseMessage);
      }
    } catch (err: any) {
      console.error("Error updating visit:", err);
      const apiMessage = err?.response?.data?.message || "Failed to update appointment";
      if (discountPwd !== undefined && discount > 0) {
        setDiscountPasswordError(String(apiMessage));
        setShowDiscountPasswordDialog(true);
        setError("");
        return;
      }
      setError(apiMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDiscountPasswordConfirm = () => {
    if (!discountPassword.trim()) {
      setDiscountPasswordError("Please enter the discount password.");
      return;
    }
    setDiscountPasswordError("");
    doEditSubmit(discountPassword.trim());
  };

  const handleDiscountPasswordCancel = () => {
    setShowDiscountPasswordDialog(false);
    setDiscountPassword("");
    setDiscountPasswordError("");
  };

  if (loading && !visitDate) {
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

  if (error && !visitDate) {
    return (
      <div className="page-wrapper">
        <div className="content">
          <div className="alert alert-danger">
            <strong>Error:</strong> {error}
          </div>
          <Link href={all_routes.appointments} className="btn btn-primary">
            Back to Appointments
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <style
        dangerouslySetInnerHTML={{
          __html: `
          .page-wrapper input::placeholder,
          .page-wrapper textarea::placeholder {
            color: #000 !important;
            opacity: 1;
          }
          .page-wrapper input::-webkit-input-placeholder,
          .page-wrapper textarea::-webkit-input-placeholder {
            color: #000 !important;
          }
          .page-wrapper input::-moz-placeholder,
          .page-wrapper textarea::-moz-placeholder {
            color: #000 !important;
            opacity: 1;
          }
          .page-wrapper input:-ms-input-placeholder,
          .page-wrapper textarea:-ms-input-placeholder {
            color: #000 !important;
          }
          /* Darker borders and black text on form fields only (not section headings) */
          .page-wrapper .card .form-label,
          .page-wrapper .card .form-check-label,
          .page-wrapper .card .form-control,
          .page-wrapper .card .ant-picker,
          .page-wrapper .card .ant-picker-input > input,
          .page-wrapper .card input:not([type="radio"]):not([type="checkbox"]),
          .page-wrapper .card textarea,
          .page-wrapper .card .react-select__single-value {
            border-color: #000 !important;
            color: #000 !important;
          }
          .page-wrapper .card .ant-picker {
            border-color: #000 !important;
          }
          .page-wrapper .card h6.fw-bold.text-primary {
            color: #2E37A4 !important;
          }
          .page-wrapper .card .btn.btn-primary,
          .page-wrapper .card .btn.btn-primary:hover,
          .page-wrapper .card .btn.btn-primary:focus,
          .page-wrapper .card .btn.btn-primary:active,
          .page-wrapper .card .btn.btn-primary:disabled {
            color: #fff !important;
          }
          .page-wrapper .card .react-select__menu .react-select__option--is-focused,
          .page-wrapper .card .react-select__menu .react-select__option--is-selected {
            color: #ffffff !important;
            background-color: #2e37a4 !important;
          }
          .page-wrapper .card .react-select__menu .react-select__option--is-focused *,
          .page-wrapper .card .react-select__menu .react-select__option--is-selected * {
            color: #ffffff !important;
          }
        `,
        }}
      />
      {showDiscountPasswordDialog && (
        <div
          className="modal fade show d-block"
          id="discount-password-modal-edit"
          tabIndex={-1}
          aria-labelledby="discount-password-label-edit"
          aria-modal="true"
          role="dialog"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title" id="discount-password-label-edit">
                  Discount password
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  onClick={handleDiscountPasswordCancel}
                />
              </div>
              <div className="modal-body">
                <label htmlFor="discount-password-input-edit" className="form-label">
                  Enter password to apply discount
                </label>
                {discountPasswordError ? (
                  <div className="alert alert-danger py-2 mb-2" role="alert">
                    {discountPasswordError}
                  </div>
                ) : null}
                <input
                  id="discount-password-input-edit"
                  type="password"
                  className="form-control"
                  value={discountPassword}
                  onChange={(e) => setDiscountPassword(e.target.value)}
                  placeholder="Password"
                  onKeyDown={(e) => e.key === "Enter" && handleDiscountPasswordConfirm()}
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-light" onClick={handleDiscountPasswordCancel}>
                  Cancel
                </button>
                <button type="button" className="btn btn-primary" onClick={handleDiscountPasswordConfirm}>
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="content">
        {/* Header */}
        <div className="mb-4">
          <h6 className="fw-bold mb-0 d-flex align-items-center">
            <Link href={all_routes.appointments} className="text-dark">
              <i className="ti ti-chevron-left me-1" />
              Edit Appointments
            </Link>
          </h6>
        </div>

        {error && (
          <div className="alert alert-danger alert-dismissible fade show mb-3" role="alert">
            <strong>Error:</strong> {error}
            <button
              type="button"
              className="btn-close"
              onClick={() => setError("")}
              aria-label="Close"
            />
          </div>
        )}

        <form onSubmit={handleEditSubmit}>
          <div className="card mb-3">
            <div className="card-body">
              <h6 className="fw-bold text-primary mb-3">Patient Details</h6>
              <div className="row">
                  <div className="col-md-3">
                    <div className="mb-3">
                      <label className="form-label mb-1 fw-medium">Phone Number</label>
                      <IndianPhoneSearchInput
                        value={phone}
                        readOnly
                        disabled
                        className="bg-light"
                        inputClassName="bg-light"
                      />
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="mb-3">
                      <label className="form-label mb-1 fw-medium">Title</label>
                      <CommonSelect options={Title} className="select" value={title} onChange={() => {}} disabled />
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="mb-3">
                      <label className="form-label mb-1 fw-medium">Name</label>
                      <input type="text" className="form-control bg-light" value={name} readOnly disabled />
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="mb-3">
                      <label className="form-label mb-1 fw-medium">Gender</label>
                      <CommonSelect options={Gender} className="select" value={gender} onChange={() => {}} disabled />
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="mb-3">
                      <label className="form-label mb-1 fw-medium">Email</label>
                      <input type="email" className="form-control bg-light" value={email} readOnly disabled />
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="mb-3">
                      <label className="form-label mb-1 fw-medium">DOB</label>
                      <DatePicker
                        className="form-control w-100 bg-light"
                        format="DD-MM-YYYY"
                        getPopupContainer={getModalContainer}
                        value={getDobValue()}
                        onChange={() => {}}
                        allowClear={false}
                        disabled
                      />
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="mb-3">
                      <label className="form-label mb-1 fw-medium">Age (Y/M/D)</label>
                      <div className="row g-1">
                        <div className="col-4">
                          <input type="text" className="form-control bg-light" placeholder="Y" value={ageYears} readOnly disabled />
                        </div>
                        <div className="col-4">
                          <input type="text" className="form-control bg-light" placeholder="M" value={ageMonths} readOnly disabled />
                        </div>
                        <div className="col-4">
                          <input type="text" className="form-control bg-light" placeholder="D" value={ageDays} readOnly disabled />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="mb-3">
                      <label className="form-label mb-1 fw-medium">Blood Group</label>
                      <CommonSelect options={Blood_Group} className="select" value={bloodGroup} onChange={() => {}} disabled />
                    </div>
                  </div>
                  <div className="col-md-5">
                    <div className="mb-3">
                      <label className="form-label mb-1 fw-medium">Address</label>
                      <input type="text" className="form-control bg-light" value={address} readOnly disabled />
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="mb-3">
                      <label className="form-label mb-1 fw-medium">Aadhar No</label>
                      <input type="text" className="form-control bg-light" value={aadharNo} readOnly disabled />
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="mb-3">
                      <label className="form-label mb-1 fw-medium">Ayushman No</label>
                      <input
                        type="text"
                        className="form-control bg-light"
                        value={ayushmanNo}
                        readOnly
                        disabled
                      />
                    </div>
                  </div>
                  <div className="col-12">
                    <div className="row g-2">
                      <div className="col-12 col-sm-6 col-lg-3">
                        <div className="mb-3">
                          <label className="form-label mb-1 fw-medium">Attendant Name</label>
                          <input
                            type="text"
                            className="form-control bg-light"
                            value={attendantName}
                            readOnly
                            disabled
                          />
                        </div>
                      </div>
                      <div className="col-12 col-sm-6 col-lg-3">
                        <div className="mb-3">
                          <label className="form-label mb-1 fw-medium">Relation to Patient</label>
                          <input
                            type="text"
                            className="form-control bg-light"
                            value={attendantRelation}
                            readOnly
                            disabled
                          />
                        </div>
                      </div>
                      <div className="col-12 col-sm-6 col-lg-3">
                        <div className="mb-3">
                          <label className="form-label mb-1 fw-medium">Company</label>
                          <input
                            type="text"
                            className="form-control bg-light"
                            placeholder="Company name"
                            value={companyName}
                            readOnly
                            disabled
                          />
                        </div>
                      </div>
                      <div className="col-12 col-sm-6 col-lg-3">
                        <div className="mb-3">
                          <label className="form-label mb-1 fw-medium">Division</label>
                          <input
                            type="text"
                            className="form-control bg-light"
                            placeholder="Division"
                            value={division}
                            readOnly
                            disabled
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
            </div>
          </div>

          <div className="row mb-3">
            <div className="col-lg-7 pe-lg-3 mb-3 mb-lg-0">
              <div className="card h-100">
                <div className="card-body p-3">
                  <h6 className="fw-bold text-primary mb-2">Doctor Details</h6>
                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label mb-1 fw-medium">Doctor</label>
                        <CommonSelect
                          options={doctorOptions}
                          className="select"
                          value={selectedDoctor}
                          onChange={handleEditDoctorChange}
                          disabled
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label mb-1 fw-medium">Date of Appointment</label>
                        <DatePicker
                          className="form-control w-100"
                          format="DD-MM-YYYY"
                          getPopupContainer={getModalContainer}
                          value={visitDate}
                          onChange={setVisitDate}
                          disabled={!canEditDoctorDetails}
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label mb-1 fw-medium">Session Slot</label>
                        <CommonSelect
                          options={sessionOptions}
                          className="select"
                          value={sessionSlot}
                          onChange={setSessionSlot}
                          disabled={!canEditDoctorDetails || !selectedDoctor}
                          placeholder={!selectedDoctor ? "Select doctor first" : undefined}
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label mb-1 fw-medium">Time</label>
                        <TimePicker
                          className="w-100"
                          format="HH:mm"
                          getPopupContainer={getModalContainer}
                          value={visitTime}
                          onChange={setVisitTime}
                          disabled={!canEditDoctorDetails}
                        />
                      </div>
                    </div>
                    <div className="col-12">
                      <div className="mb-3">
                        <label className="form-label mb-1 fw-medium">Visit Type</label>
                        <div className="d-flex gap-3 flex-wrap">
                          {Visit_Type.filter((v) => v.value !== "Select").map((type) => {
                            const isMrOption = type.value === "MR";
                            const disabled =
                              !canEditDoctorDetails || (isMrOption && isMrDisabledForSelectedDay);
                            return (
                              <div key={type.value} className="form-check">
                                <input
                                  className="form-check-input"
                                  type="radio"
                                  name="editVisitType"
                                  id={`edit-visitType-${type.value}`}
                                  value={type.value}
                                  checked={visitType?.value === type.value}
                                  disabled={disabled}
                                  onChange={(e) => {
                                    const opt = Visit_Type.find((v) => v.value === e.target.value);
                                    if (opt) setVisitType(opt);
                                  }}
                                />
                                <label
                                  className={`form-check-label ${disabled ? "text-muted" : ""}`}
                                  htmlFor={`edit-visitType-${type.value}`}
                                >
                                  {type.label}
                                </label>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-lg-5 ps-lg-3">
              <div className="card h-100">
                <div className="card-body p-3">
                  <h6 className="fw-bold text-primary mb-2">Payment Details</h6>
                      <div className="mb-2 d-flex align-items-center flex-wrap gap-2">
                        <label className="form-label mb-0 fw-medium me-2" style={{ minWidth: "120px" }}>
                          Payment Mode
                        </label>
                        <div className="d-flex gap-3 flex-wrap ms-auto justify-content-end">
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="radio"
                              name="editPaymentMode"
                              id="edit-cash"
                              value="Cash"
                              checked={paymentMode === "Cash"}
                              disabled={isPaymentModeDisabledForMr}
                              onChange={(e) => {
                                if (isPaymentModeDisabledForMr) return;
                                setPaymentMode(e.target.value);
                              }}
                            />
                            <label className="form-check-label" htmlFor="edit-cash">Cash</label>
                          </div>
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="radio"
                              name="editPaymentMode"
                              id="edit-upi"
                              value="UPI"
                              checked={paymentMode === "UPI"}
                              disabled={isPaymentModeDisabledForMr}
                              onChange={(e) => {
                                if (isPaymentModeDisabledForMr) return;
                                setPaymentMode(e.target.value);
                              }}
                            />
                            <label className="form-check-label" htmlFor="edit-upi">UPI</label>
                          </div>
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="radio"
                              name="editPaymentMode"
                              id="edit-card"
                              value="Card"
                              checked={paymentMode === "Card"}
                              disabled={isPaymentModeDisabledForMr}
                              onChange={(e) => {
                                if (isPaymentModeDisabledForMr) return;
                                setPaymentMode(e.target.value);
                              }}
                            />
                            <label
                              className={`form-check-label ${isPaymentModeDisabledForMr ? "text-muted" : ""}`}
                              htmlFor="edit-card"
                            >
                              Card
                            </label>
                          </div>
                        </div>
                      </div>
                      <div className="mb-2 d-flex align-items-center">
                        <label className="form-label mb-0 fw-medium me-2" style={{ minWidth: "120px" }}>Total</label>
                        <div className="form-control bg-light" style={{ pointerEvents: "none" }}>
                          ₹{total.toFixed(2)}
                        </div>
                      </div>
                      <div className="mb-2 d-flex align-items-center">
                        <label className="form-label mb-0 fw-medium me-2" style={{ minWidth: "120px" }}>Discount</label>
                        <input
                          type="number"
                          className="form-control"
                          placeholder="0"
                          value={discount || ""}
                          onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                          onChange={(e) => {
                            if (isMrVisitSelected) return;
                            setDiscount(parseFloat(e.target.value) || 0);
                          }}
                          disabled={isMrVisitSelected}
                          min="0"
                        />
                      </div>
                      <div className="mb-2 d-flex align-items-center">
                        <label className="form-label mb-0 fw-medium me-2" style={{ minWidth: "120px" }}>Final Amount</label>
                        <div className="form-control bg-light" style={{ pointerEvents: "none" }}>
                          ₹{finalAmount.toFixed(2)}
                        </div>
                      </div>
                      <div className="mb-2 d-flex align-items-center">
                        <label className="form-label mb-0 fw-medium me-2" style={{ minWidth: "120px" }}>Amount Received</label>
                        <input
                          type="number"
                          className="form-control"
                          placeholder="0"
                          value={amountReceived || ""}
                          onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                          onChange={(e) => {
                            if (isMrVisitSelected) return;
                            setAmountReceived(parseFloat(e.target.value) || 0);
                          }}
                          disabled={isMrVisitSelected}
                          min="0"
                        />
                      </div>
                      <div className="mb-2 d-flex align-items-center">
                        <label className="form-label mb-0 fw-medium me-2" style={{ minWidth: "120px" }}>Balance</label>
                        <div
                          className="form-control d-flex align-items-center justify-content-between"
                          style={{
                            pointerEvents: "none",
                            backgroundColor: "#fff3cd",
                            borderColor: "#ffc107",
                          }}
                        >
                          <span>₹{balance.toFixed(2)}</span>
                          <i className="ti ti-alert-triangle text-warning fs-16" />
                        </div>
                      </div>
                </div>
              </div>
            </div>
          </div>

          <div className="d-flex justify-content-end gap-2">
            <Link href={all_routes.appointments} className="btn btn-light">
              Cancel
            </Link>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditAppointmentComponent;
