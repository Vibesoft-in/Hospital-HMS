"use client";

import { useState, useEffect, useCallback } from "react";
import ImageWithBasePath from "@/core/imageWithBasePath";
import { all_routes } from "../../../../../routes/all_routes";
import Link from "next/link";
import dayjs from "dayjs";
import { DatePicker, TimePicker } from "antd";
import CommonSelect, { Option } from "@/core/common/common-select/commonSelect";
import {
  Visit_Type,
  Title,
  Gender,
  Blood_Group,
  Appointment_Type,
} from "@/core/common/selectOption";
import IndianPhoneInput from "@/core/common/indianPhoneInput/IndianPhoneInput";
import axios from "axios";
import { API_BASE_URL } from "@/environment";

const STATUS_OPTIONS: Option[] = [
  { value: "Scheduled", label: "Scheduled" },
  { value: "In Progress", label: "In Progress" },
  { value: "Completed", label: "Completed" },
  { value: "Cancelled", label: "Cancelled" },
  { value: "No Show", label: "No Show" },
];

interface IDoctor {
  _id: string;
  name: string;
  sessions?: string[];
}

interface IModalsProps {
  appointment?: {
    visit?: any;
    patient?: any;
    doctor?: any;
  } | null;
  appointmentRecord?: any;
}

const Modals = ({ appointment, appointmentRecord }: IModalsProps) => {
  const visit = appointment?.visit;
  const patient = appointment?.patient;
  const doctor = appointment?.doctor;

  const getModalContainer = () => {
    const el = document.getElementById("modal-datepicker-edit-appointment");
    return el || document.body;
  };

  // Edit appointment state – same as add appointment
  const [editVisitId, setEditVisitId] = useState<string | null>(null);
  const [editPatientId, setEditPatientId] = useState<string | null>(null);
  const [doctors, setDoctors] = useState<IDoctor[]>([]);
  const [doctorOptions, setDoctorOptions] = useState<Option[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<Option | null>(null);
  const [sessionOptions, setSessionOptions] = useState<Option[]>([]);
  const [sessionSlot, setSessionSlot] = useState<Option | null>(null);
  const [visitDate, setVisitDate] = useState<any>(null);
  const [visitTime, setVisitTime] = useState<any>(null);
  const [visitType, setVisitType] = useState<Option | null>(Visit_Type[0]);
  const [appointmentType, setAppointmentType] = useState<string>("OPD");
  const [reason, setReason] = useState<string>("");
  const [status, setStatus] = useState<Option | null>(STATUS_OPTIONS[0]);
  const [editLoading, setEditLoading] = useState<boolean>(false);
  // Patient (same fields as add appointment)
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
  const [emergencyContactName, setEmergencyContactName] = useState<string>("");
  const [emergencyPhone, setEmergencyPhone] = useState<string>("");
  // Payment (same as add appointment)
  const [paymentMode, setPaymentMode] = useState<string>("Cash");
  const [total, setTotal] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [amountReceived, setAmountReceived] = useState<number>(0);
  const finalAmount = total - discount;

  const resetEditForm = useCallback(() => {
    setEditVisitId(null);
    setEditPatientId(null);
    setSelectedDoctor(null);
    setSessionOptions([]);
    setSessionSlot(null);
    setVisitDate(null);
    setVisitTime(null);
    setVisitType(Visit_Type[0]);
    setAppointmentType("OPD");
    setReason("");
    setStatus(STATUS_OPTIONS[0]);
    setPhone("");
    setTitle(Title[0] || null);
    setName("");
    setEmail("");
    setDob(null);
    setAgeYears("");
    setAgeMonths("");
    setAgeDays("");
    setGender(Gender[0] || null);
    setBloodGroup(Blood_Group[0] || null);
    setAddress("");
    setEmergencyContactName("");
    setEmergencyPhone("");
    setPaymentMode("Cash");
    setTotal(0);
    setDiscount(0);
    setAmountReceived(0);
  }, []);

  const fetchDoctors = useCallback(async () => {
    if (!API_BASE_URL) return;
    try {
      const res = await axios.get(`${API_BASE_URL}/hospital/doctors`, { params: { limit: 100 } });
      if (res.data?.code === 200 && res.data?.data?.doctors) {
        const list: IDoctor[] = res.data.data.doctors;
        setDoctors(list);
        setDoctorOptions(list.map((d) => ({ value: d._id, label: d.name })));
      }
    } catch (e) {
      console.error("Error fetching doctors:", e);
    }
  }, []);

  const fetchVisitForEdit = useCallback(async (visitId: string) => {
    if (!API_BASE_URL) return;
    setEditLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/hospital/visits/${visitId}`);
      if (res.data?.code === 200 && res.data?.data?.visit) {
        const v = res.data.data.visit;
        setEditVisitId(visitId);
        setEditPatientId(v.patientId || null);
        setVisitDate(v.visitDate ? dayjs(v.visitDate) : null);
        setVisitTime(v.visitTime ? dayjs(v.visitTime, "HH:mm") : null);
        setVisitType(Visit_Type.find((vt) => vt.value === v.visitType) || Visit_Type[0]);
        setAppointmentType(v.appointmentType || "OPD");
        setReason(v.reason || "");
        setStatus(STATUS_OPTIONS.find((s) => s.value === v.status) || STATUS_OPTIONS[0]);
        const priceNum = v.price != null ? Number(v.price) : 0;
        const discountNum = v.discount != null ? Number(v.discount) : 0;
        const receivedNum = v.amountReceived != null ? Number(v.amountReceived) : 0;
        setTotal(priceNum + discountNum);
        setDiscount(discountNum);
        setAmountReceived(receivedNum);
        setPaymentMode(v.paymentMode || "Cash");
        const docOpt = { value: v.doctorId, label: "" };
        const docRes = await axios.get(`${API_BASE_URL}/hospital/doctors/${v.doctorId}`);
        if (docRes.data?.code === 200 && docRes.data?.data?.doctor) {
          const d = docRes.data.data.doctor;
          docOpt.label = d.name || "Unknown";
          setSelectedDoctor(docOpt);
          const sessions = d.sessions;
          if (sessions?.length) {
            const opts = sessions.map((s: string) => ({ value: s, label: s }));
            setSessionOptions(opts);
            setSessionSlot(opts.find((o: Option) => o.value === v.sessionSlot) || opts[0] || null);
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
            }
            if (p.emergencyContacts?.length) {
              setEmergencyContactName(p.emergencyContacts[0].name || "");
              setEmergencyPhone(p.emergencyContacts[0].number || "");
            }
          }
        } catch {
          // keep defaults
        }
      }
    } catch (e) {
      console.error("Error fetching visit:", e);
    } finally {
      setEditLoading(false);
    }
  }, []);

  useEffect(() => {
    const editEl = document.getElementById("edit_appointment");
    if (!editEl) return;
    const handleShow = (e: Event) => {
      const related = (e as any).relatedTarget;
      const visitId = related?.getAttribute?.("data-visit-id") || (window as any).__currentEditVisitId;
      if (visitId) {
        resetEditForm();
        fetchDoctors().then(() => fetchVisitForEdit(visitId));
      }
    };
    editEl.addEventListener("show.bs.offcanvas", handleShow);
    return () => editEl.removeEventListener("show.bs.offcanvas", handleShow);
  }, [fetchVisitForEdit, fetchDoctors, resetEditForm]);


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
      setSessionSlot((prev) => (prev && opts.some((o: Option) => o.value === prev?.value) ? prev : opts[0] || null));
    } else {
      setSessionOptions([]);
      setSessionSlot(null);
    }
  }, [selectedDoctor, doctors]);

  const handleEditDoctorChange = (opt: Option | null) => {
    setSelectedDoctor(opt);
    setSessionSlot(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editVisitId || !API_BASE_URL) return;
    setEditLoading(true);
    try {
      const payload = {
        visitDate: visitDate ? dayjs(visitDate).format("YYYY-MM-DD") : undefined,
        visitTime: visitTime ? (dayjs.isDayjs(visitTime) ? visitTime.format("HH:mm") : dayjs(visitTime).format("HH:mm")) : undefined,
        sessionSlot: sessionSlot?.value,
        visitType: visitType?.value !== "Select" ? visitType?.value : undefined,
        appointmentType: appointmentType,
        // reason: reason || undefined,
        status: status?.value,
        doctorId: selectedDoctor?.value,
      };
      const res = await axios.patch(`${API_BASE_URL}/hospital/visits/${editVisitId}`, payload);
      if (res.data?.code === 200 || (res.status >= 200 && res.status < 300)) {
        const offcanvasEl = document.getElementById("edit_appointment");
        if (offcanvasEl) {
          const inst = (window as any).bootstrap?.Offcanvas?.getInstance(offcanvasEl);
          inst?.hide();
        }
        window.location.reload();
      }
    } catch (err) {
      console.error("Error updating visit:", err);
    } finally {
      setEditLoading(false);
    }
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

  const getDobValue = () => {
    if (!dob) return undefined;
    if (dayjs.isDayjs(dob)) return dob;
    if (typeof dob === "string" || dob instanceof Date) {
      const parsed = dayjs(dob);
      return parsed.isValid() ? parsed : undefined;
    }
    return undefined;
  };


  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    return dayjs(dateStr).format("dddd, DD MMM YYYY");
  };

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return "N/A";
    return dayjs(timeStr, "HH:mm").format("hh:mm A");
  };

  return (
    <>
      {/* Start View Details */}
      <div
        className="offcanvas offcanvas-offset offcanvas-end"
        tabIndex={-1}
        id="view_details"
        style={{ width: '800px' }}
      >
        <div className="offcanvas-header d-block pb-0 px-0">
          <div className="border-bottom d-flex align-items-center justify-content-between pb-3 px-3">
            <h5 className="offcanvas-title fs-18 fw-bold">
              Appointment Details
              <span className="badge badge-soft-primary border pt-1 px-2 border-primary fw-medium ms-2">
                {visit?.visitId || appointmentRecord?._visitId || appointmentRecord?.Case_ID || "N/A"}
              </span>
            </h5>
            <button
              type="button"
              className="btn-close custom-btn-close opacity-100"
              data-bs-dismiss="offcanvas"
              aria-label="Close"
            >
              <i className="ti ti-x fs-16 text-dark" />
            </button>
          </div>
        </div>
        <div className="offcanvas-body pt-0 px-0">
          {/* Doctor Information Section */}
          <h6 className="bg-light py-2 px-3 fw-bold mb-0 text-black">Doctor Information</h6>
          <div className="px-3 py-2 border-bottom">
            <div className="row g-2">
              <div className="col-md-8">
                <div className="mb-2">
                  <label className="form-label mb-1 fw-medium text-black fs-14">Doctor Name</label>
                  <Link 
                    href={`${all_routes.doctordetails}?id=${doctor?._id || visit?.doctorId || ""}`}
                    className="form-control bg-white border-0 py-1 px-0 fs-16 fw-medium text-decoration-none text-black d-block"
                    style={{ textAlign: 'left' }}
                  >
                    {doctor?.name || "Unknown Doctor"}
                  </Link>
                </div>
              </div>
              <div className="col-md-4">
                <div className="mb-2">
                  <label className="form-label mb-1 fw-medium text-black fs-14">Designation</label>
                  <div className="form-control bg-white border-0 py-1 px-0 fs-16 fw-medium text-black" style={{ textAlign: 'left' }}>
                    {doctor?.designation || "N/A"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Appointment Information Section */}
          <h6 className="bg-light py-2 px-3 fw-bold mb-0 text-black">Appointment Information</h6>
          <div className="px-3 py-2 border-bottom">
            <div className="row g-2">
              <div className="col-md-3">
                <div className="mb-2">
                  <label className="form-label mb-1 fw-medium text-black fs-14">Visit ID</label>
                  <div className="form-control bg-white border-0 py-1 px-0 fs-16 fw-medium text-black" style={{ textAlign: 'left' }}>
                    {visit?.visitId || appointmentRecord?._visitId || appointmentRecord?.Case_ID || "N/A"}
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="mb-2">
                  <label className="form-label mb-1 fw-medium text-black fs-14">Appointment ID</label>
                  <div className="form-control bg-white border-0 py-1 px-0 fs-16 fw-medium text-black" style={{ textAlign: 'left' }}>
                    {visit?.appointmentId || appointmentRecord?._appointmentId || "N/A"}
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="mb-2">
                  <label className="form-label mb-1 fw-medium text-black fs-14">Appointment Date</label>
                  <div className="form-control bg-white border-0 py-1 px-0 fs-16 fw-medium text-black" style={{ textAlign: 'left' }}>
                    {visit?.visitDate ? dayjs(visit.visitDate).format("DD MMM YYYY") : appointmentRecord?.Date_Time?.split(" - ")[0] || "N/A"}
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="mb-2">
                  <label className="form-label mb-1 fw-medium text-black fs-14">Time</label>
                  <div className="form-control bg-white border-0 py-1 px-0 fs-16 fw-medium text-black" style={{ textAlign: 'left' }}>
                    {visit?.visitTime ? formatTime(visit.visitTime) : appointmentRecord?.Date_Time?.split(" - ")[1] || "N/A"}
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="mb-2">
                  <label className="form-label mb-1 fw-medium text-black fs-14">Session Slot</label>
                  <div className="form-control bg-white border-0 py-1 px-0 fs-16 fw-medium text-black" style={{ textAlign: 'left' }}>
                    {visit?.sessionSlot || appointmentRecord?._sessionSlot || "N/A"}
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="mb-2">
                  <label className="form-label mb-1 fw-medium text-black fs-14">Token Number</label>
                  <div className="form-control bg-white border-0 py-1 px-0 fs-16 fw-medium text-black" style={{ textAlign: 'left' }}>
                    {visit?.tokenNumber || appointmentRecord?.Token_No || "N/A"}
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="mb-2">
                  <label className="form-label mb-1 fw-medium text-black fs-14">Appointment Type</label>
                  <div className="form-control bg-white border-0 py-1 px-0 fs-16 fw-medium text-black" style={{ textAlign: 'left' }}>
                    {visit?.appointmentType || appointmentRecord?.Appointment_Type || "N/A"}
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="mb-2">
                  <label className="form-label mb-1 fw-medium text-black fs-14">Visit Type</label>
                  <div className="form-control bg-white border-0 py-1 px-0 fs-16 fw-medium text-black" style={{ textAlign: 'left' }}>
                    {visit?.visitType || appointmentRecord?.Visit || "N/A"}
                  </div>
                </div>
              </div>
              {visit?.reason && (
                <div className="col-md-12">
                  <div className="mb-2">
                    <label className="form-label mb-1 fw-medium text-black fs-14">Reason for Visit</label>
                    <div className="form-control bg-white border-0 py-1 px-0 fs-16 fw-medium text-black" style={{ minHeight: '40px', textAlign: 'left' }}>
                      {visit.reason}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Patient Information Section */}
          <h6 className="bg-light py-2 px-3 fw-bold mb-0 text-black">Patient Information</h6>
          <div className="px-3 py-2 border-bottom">
            <div className="row g-2">
              <div className="col-md-4">
                <div className="mb-2">
                  <label className="form-label mb-1 fw-medium text-black fs-14">Patient Name</label>
                  <Link 
                    href={`${all_routes.patientDetails}?id=${patient?._id || visit?.patientId || ""}`}
                    className="form-control bg-white border-0 py-1 px-0 fs-16 fw-medium text-decoration-none text-black d-flex align-items-center"
                    style={{ textAlign: 'left' }}
                  >
                    <span className="flex-grow-1 text-start">{patient?.name || appointmentRecord?.Patient || "Unknown Patient"}</span>
                    <i className="ti ti-arrow-right fs-12 text-black ms-1" />
                  </Link>
                </div>
              </div>
              {patient?.phone && (
                <div className="col-md-4">
                  <div className="mb-2">
                    <label className="form-label mb-1 fw-medium text-black fs-14">Phone Number</label>
                    <div className="form-control bg-white border-0 py-1 px-0 fs-16 fw-medium text-black" style={{ textAlign: 'left' }}>
                      {patient.phone}
                    </div>
                  </div>
                </div>
              )}
              {patient?.email && (
                <div className="col-md-4">
                  <div className="mb-2">
                    <label className="form-label mb-1 fw-medium text-black fs-14">Email</label>
                    <div className="form-control bg-white border-0 py-1 px-0 fs-16 fw-medium text-black" style={{ textAlign: 'left' }}>
                      {patient.email}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Payment & Status Section */}
          <h6 className="bg-light py-2 px-3 fw-bold mb-0 text-black">Payment & Status</h6>
          <div className="px-3 py-2">
            <div className="row g-2">
              {visit?.price && (
                <div className="col-md-9">
                  <div className="mb-2">
                    <label className="form-label mb-1 fw-medium text-black fs-14">Price</label>
                    <div className="form-control bg-white border-0 py-1 px-0 fs-16 fw-bold text-black" style={{ textAlign: 'left' }}>
                      ₹{visit.price.toFixed(2)}
                    </div>
                  </div>
                </div>
              )}
              <div className="col-md-3">
                <div className="mb-2">
                  <label className="form-label mb-1 fw-medium text-black fs-14">Status</label>
                  <div className="form-control bg-white border-0 py-1 px-0 fs-16 fw-medium text-black" style={{ textAlign: 'left' }}>
                    {visit?.status || appointmentRecord?.Status || "Scheduled"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* End View Details */}
      {/* Start Edit Appointment (like Patient/Doctor edit offcanvas) */}
      <div id="modal-datepicker-edit-appointment" />
      <div
        className="offcanvas offcanvas-offset offcanvas-end offcanvas-large"
        tabIndex={-1}
        id="edit_appointment"
        style={{ width: "900px" }}
      >
        <div className="offcanvas-header d-block pb-0 px-0">
          <div className="border-bottom d-flex align-items-center justify-content-between pb-3 px-3">
            <h5 className="offcanvas-title fs-18 fw-bold">Edit Appointment</h5>
            <button
              type="button"
              className="btn-close custom-btn-close opacity-100"
              data-bs-dismiss="offcanvas"
              aria-label="Close"
            >
              <i className="ti ti-x fs-16 text-dark" />
            </button>
          </div>
        </div>
        <div className="offcanvas-body p-0">
          {editLoading && !editVisitId ? (
            <div className="d-flex justify-content-center align-items-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : (
            <form onSubmit={handleEditSubmit}>
              {/* Patient Details – same as add appointment */}
              <div className="p-3 pb-0">
                <h6 className="fw-bold text-primary mb-3">Patient Details</h6>
                <div className="row">
                  <div className="col-md-3">
                    <div className="mb-3">
                      <label className="form-label mb-1 fw-medium">Phone Number</label>
                      <IndianPhoneInput
                        defaultCountry="IN"
                        value={phone}
                        onChange={(value) => setPhone(value || "")}
                        className="form-control"
                      />
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="mb-3">
                      <label className="form-label mb-1 fw-medium">Title</label>
                      <CommonSelect options={Title} className="select" value={title} onChange={setTitle} />
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="mb-3">
                      <label className="form-label mb-1 fw-medium">Name</label>
                      <input type="text" className="form-control" value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="mb-3">
                      <label className="form-label mb-1 fw-medium">Gender</label>
                      <CommonSelect options={Gender} className="select" value={gender} onChange={setGender} />
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="mb-3">
                      <label className="form-label mb-1 fw-medium">Email</label>
                      <input type="email" className="form-control" value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="mb-3">
                      <label className="form-label mb-1 fw-medium">DOB</label>
                      <DatePicker
                        className="form-control w-100"
                        format="DD-MM-YYYY"
                        getPopupContainer={getModalContainer}
                        value={getDobValue()}
                        onChange={handleDobChange}
                        allowClear
                      />
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="mb-3">
                      <label className="form-label mb-1 fw-medium">Age (Y/M/D)</label>
                      <div className="row g-1">
                        <div className="col-4">
                          <input type="text" className="form-control" placeholder="Y" value={ageYears} onChange={(e) => setAgeYears(e.target.value)} />
                        </div>
                        <div className="col-4">
                          <input type="text" className="form-control" placeholder="M" value={ageMonths} onChange={(e) => setAgeMonths(e.target.value)} />
                        </div>
                        <div className="col-4">
                          <input type="text" className="form-control" placeholder="D" value={ageDays} onChange={(e) => setAgeDays(e.target.value)} />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="mb-3">
                      <label className="form-label mb-1 fw-medium">Blood Group</label>
                      <CommonSelect options={Blood_Group} className="select" value={bloodGroup} onChange={setBloodGroup} />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label mb-1 fw-medium">Address</label>
                      <input type="text" className="form-control" value={address} onChange={(e) => setAddress(e.target.value)} />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label mb-1 fw-medium">Emergency Contact Name</label>
                      <input type="text" className="form-control" value={emergencyContactName} onChange={(e) => setEmergencyContactName(e.target.value)} />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label mb-1 fw-medium">Emergency Contact Phone</label>
                      <IndianPhoneInput defaultCountry="IN" value={emergencyPhone} onChange={(value) => setEmergencyPhone(value || "")} className="form-control" />
                    </div>
                  </div>
                </div>
              </div>
              {/* Doctor Details – same as add appointment */}
              <div className="p-3 pb-0">
                <h6 className="fw-bold text-primary mb-3">Doctor Details</h6>
                <div className="row">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label mb-1 fw-medium">Doctor</label>
                      <CommonSelect options={doctorOptions} className="select" value={selectedDoctor} onChange={handleEditDoctorChange} disabled />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label mb-1 fw-medium">Date of Appointment</label>
                      <DatePicker className="form-control w-100" format="DD-MM-YYYY" getPopupContainer={getModalContainer} value={visitDate} onChange={setVisitDate} />
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
                        disabled={!selectedDoctor}
                        placeholder={!selectedDoctor ? "Select doctor first" : undefined}
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label mb-1 fw-medium">Time</label>
                      <TimePicker className="w-100" format="HH:mm" getPopupContainer={getModalContainer} value={visitTime} onChange={setVisitTime} />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label mb-2 fw-medium">Appointment Type</label>
                      <div className="d-flex gap-3 flex-wrap">
                        {Appointment_Type.map((type) => (
                          <div key={type.value} className="form-check">
                            <input
                              className="form-check-input"
                              type="radio"
                              name="editAppointmentType"
                              id={`edit-apt-${type.value}`}
                              value={type.value}
                              checked={appointmentType === type.value}
                              onChange={(e) => setAppointmentType(e.target.value)}
                            />
                            <label className="form-check-label" htmlFor={`edit-apt-${type.value}`}>{type.label}</label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label mb-1 fw-medium">Visit Type</label>
                      <div className="d-flex gap-3 flex-wrap">
                        {Visit_Type.filter((v) => v.value !== "Select").map((type) => (
                          <div key={type.value} className="form-check">
                            <input
                              className="form-check-input"
                              type="radio"
                              name="editVisitType"
                              id={`edit-visitType-${type.value}`}
                              value={type.value}
                              checked={visitType?.value === type.value}
                              onChange={(e) => {
                                const opt = Visit_Type.find((v) => v.value === e.target.value);
                                if (opt) setVisitType(opt);
                              }}
                            />
                            <label className="form-check-label" htmlFor={`edit-visitType-${type.value}`}>
                              {type.label}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  {/* <div className="col-12">
                    <div className="mb-3">
                      <label className="form-label mb-1 fw-medium">Reason for Visit</label>
                      <input type="text" className="form-control" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for visit" />
                    </div>
                  </div> */}
                </div>
              </div>
              {/* Status only – no payment details in edit */}
              <div className="p-3 pb-0">
                <div className="row">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label mb-1 fw-medium">Status</label>
                      <CommonSelect options={STATUS_OPTIONS} className="select" value={status} onChange={setStatus} />
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-3 d-flex justify-content-end gap-2 border-top">
                <button type="button" className="btn btn-light" data-bs-dismiss="offcanvas">Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={editLoading}>
                  {editLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
      {/* End Edit Appointment */}
      {/* Start Cancel Modal  */}
    </>
  );
};

export default Modals;
