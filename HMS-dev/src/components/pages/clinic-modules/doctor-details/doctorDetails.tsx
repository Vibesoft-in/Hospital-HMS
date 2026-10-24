"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import { all_routes } from "../../../../routes/all_routes";
import { API_BASE_URL } from "@/environment";
import DoctorAvatar from "@/components/common/DoctorAvatar";

interface IVisitType {
  visitType: string;
  appointmentType: string;
  charge: number;
}

interface IDialysisSlot {
  name: string;
  startTime: string;
  endTime: string;
  maxAppointments: number;
  isActive?: boolean;
}

interface IDoctorDetails {
  _id?: string;
  doctorId?: string;
  name?: string;
  email?: string;
  phone?: string;
  department?: string;
  designation?: string;
  opdNumber?: string;
  medicalLicenseNo?: string;
  yearsOfExperience?: number;
  dob?: string;
  gender?: string;
  bloodGroup?: string;
  address?: string;
  posterUrl?: string;
  imageUrl?: string;
  sessions?: string[];
  visitTypes?: IVisitType[];
  dialysisSlots?: IDialysisSlot[];
  maxAppointmentsPerSlot?: number;
  queueSortBy?: string;
  createdAt?: string;
}

const DoctorDetailsComponent = () => {
  const searchParams = useSearchParams();
  const idFromParam = searchParams.get("id") || searchParams.get("doctorId");

  const [doctor, setDoctor] = useState<IDoctorDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchDoctor = async () => {
      setLoading(true);
      setError(null);

      try {
        let doctorData: IDoctorDetails | null = null;

        if (idFromParam) {
          // Fetch specific doctor by id or doctorId
          const res = await axios.get(`${API_BASE_URL}/hospital/doctors/${idFromParam}`);
          doctorData = res.data?.data?.doctor || res.data?.data || res.data?.doctor || null;
        } else {
          // Fallback to first doctor if no id parameter
          const res = await axios.get(`${API_BASE_URL}/hospital/doctors`, {
            params: { limit: 1 },
          });
          const list = res.data?.data?.doctors || res.data?.data || [];
          if (list.length > 0) {
            doctorData = list[0];
          }
        }

        if (isMounted) {
          if (doctorData) {
            setDoctor(doctorData);
          } else {
            setError("Doctor details not found.");
          }
        }
      } catch (err: any) {
        if (isMounted) {
          console.error("Error fetching doctor details:", err);
          setError(
            err?.response?.data?.message ||
            err?.message ||
            "Unable to load doctor profile. Please try again."
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchDoctor();

    const handleDoctorUpdated = (e: any) => {
      const updatedId = e?.detail?.doctorId;
      if (!updatedId || updatedId === idFromParam || updatedId === doctor?._id || updatedId === doctor?.doctorId) {
        fetchDoctor();
      }
    };
    window.addEventListener("doctor-updated", handleDoctorUpdated);

    return () => {
      isMounted = false;
      window.removeEventListener("doctor-updated", handleDoctorUpdated);
    };
  }, [idFromParam]);

  const rawName = doctor?.name?.trim() || "";
  const displayName = rawName ? (rawName.startsWith("Dr.") ? rawName : `Dr. ${rawName}`) : "Doctor Profile";
  const initials = rawName
    ? rawName
        .replace(/^Dr\.\s*/i, "")
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((n) => n[0].toUpperCase())
        .join("")
    : "DR";

  const posterImage = doctor?.posterUrl || doctor?.imageUrl;

  return (
    <div className="page-wrapper">
      <div className="content pb-4">
        {/* Page Header */}
        <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">
          <h6 className="fw-semibold fs-15 mb-0">
            <Link href={all_routes.doctorsList} className="text-dark d-inline-flex align-items-center gap-1">
              <i className="ti ti-chevron-left fs-16" />
              Back to Doctors List
            </Link>
          </h6>

          {doctor && (
            <div className="d-flex align-items-center gap-2">
              <Link
                href={`/qd/${doctor.doctorId || doctor._id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline-primary btn-sm d-inline-flex align-items-center gap-1"
                title="Open Live Queue Display"
              >
                <i className="ti ti-presentation fs-16" />
                Live Queue TV
              </Link>
            </div>
          )}
        </div>

        {loading ? (
          <div className="card shadow-sm border-0 py-5 text-center">
            <div className="spinner-border text-primary mx-auto mb-2" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="text-muted mb-0">Loading doctor profile...</p>
          </div>
        ) : error || !doctor ? (
          <div className="card shadow-sm border-0 py-5 text-center">
            <i className="ti ti-alert-circle text-danger fs-36 mb-2" />
            <h5 className="fw-bold text-dark">{error || "Doctor Not Found"}</h5>
            <p className="text-muted mb-3">Please select a valid doctor from the Doctors List.</p>
            <div>
              <Link href={all_routes.doctorsList} className="btn btn-primary btn-sm">
                View Doctor List
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* Doctor Hero Card */}
            <div className="card shadow-sm border-0 mb-4 overflow-hidden">
              <div className="card-body p-4">
                <div className="d-flex align-items-start align-items-sm-center flex-column flex-sm-row gap-4">
                  {/* Doctor Avatar / Poster */}
                  <div className="flex-shrink-0">
                    <DoctorAvatar
                      imageUrl={posterImage}
                      gender={doctor?.gender}
                      shape="rounded"
                      style={{ width: "120px", height: "140px" }}
                      className="shadow-sm border"
                      alt={displayName}
                    />
                  </div>

                  {/* Doctor Quick Info */}
                  <div className="flex-grow-1 min-w-0">
                    <div className="d-flex align-items-center flex-wrap gap-2 mb-1">
                      <h4 className="fw-bold text-dark mb-0">{displayName}</h4>
                      {doctor.doctorId && (
                        <span className="badge bg-light text-primary border fw-semibold fs-12">
                          {doctor.doctorId}
                        </span>
                      )}
                      <span className="badge badge-soft-success fw-medium fs-12">Active</span>
                    </div>

                    <div className="d-flex align-items-center flex-wrap gap-2 mb-3">
                      {doctor.department && (
                        <span className="badge bg-primary-subtle text-primary fw-medium fs-13">
                          <i className="ti ti-stethoscope me-1" />
                          {doctor.department}
                        </span>
                      )}
                      {doctor.designation && (
                        <span className="badge bg-secondary-subtle text-secondary fw-medium fs-13">
                          <i className="ti ti-briefcase me-1" />
                          {doctor.designation}
                        </span>
                      )}
                      {doctor.opdNumber && (
                        <span className="badge bg-info-subtle text-info fw-medium fs-13">
                          <i className="ti ti-door me-1" />
                          OPD Chamber: {doctor.opdNumber}
                        </span>
                      )}
                    </div>

                    {/* Summary row */}
                    <div className="row g-3 pt-2 border-top">
                      {doctor.yearsOfExperience != null && (
                        <div className="col-auto">
                          <div className="d-flex align-items-center gap-2">
                            <span className="avatar avatar-sm bg-light text-primary rounded-circle">
                              <i className="ti ti-award fs-16" />
                            </span>
                            <div>
                              <p className="text-muted fs-11 mb-0">Experience</p>
                              <p className="fw-semibold text-dark fs-13 mb-0">
                                {doctor.yearsOfExperience} Years
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      {doctor.phone && (
                        <div className="col-auto">
                          <div className="d-flex align-items-center gap-2">
                            <span className="avatar avatar-sm bg-light text-success rounded-circle">
                              <i className="ti ti-phone fs-16" />
                            </span>
                            <div>
                              <p className="text-muted fs-11 mb-0">Phone</p>
                              <p className="fw-semibold text-dark fs-13 mb-0">{doctor.phone}</p>
                            </div>
                          </div>
                        </div>
                      )}
                      {doctor.email && (
                        <div className="col-auto">
                          <div className="d-flex align-items-center gap-2">
                            <span className="avatar avatar-sm bg-light text-danger rounded-circle">
                              <i className="ti ti-mail fs-16" />
                            </span>
                            <div>
                              <p className="text-muted fs-11 mb-0">Email</p>
                              <p className="fw-semibold text-dark fs-13 mb-0 text-truncate" style={{ maxWidth: "220px" }}>
                                {doctor.email}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Info Cards */}
            <div className="row g-4">
              {/* Left Column: Personal & Clinical Profile */}
              <div className="col-lg-6">
                <div className="card shadow-sm border-0 h-100">
                  <div className="card-header bg-white border-bottom py-3">
                    <h5 className="card-title fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                      <i className="ti ti-user-check text-primary fs-18" />
                      Doctor Information
                    </h5>
                  </div>
                  <div className="card-body p-4">
                    <div className="table-responsive">
                      <table className="table table-borderless table-sm mb-0">
                        <tbody>
                          <tr>
                            <td className="text-muted fs-13 py-2" style={{ width: "40%" }}>Full Name</td>
                            <td className="fw-semibold text-dark fs-13 py-2">{displayName}</td>
                          </tr>
                          {doctor.department && (
                            <tr>
                              <td className="text-muted fs-13 py-2">Department</td>
                              <td className="fw-semibold text-dark fs-13 py-2">{doctor.department}</td>
                            </tr>
                          )}
                          {doctor.designation && (
                            <tr>
                              <td className="text-muted fs-13 py-2">Designation</td>
                              <td className="fw-semibold text-dark fs-13 py-2">{doctor.designation}</td>
                            </tr>
                          )}
                          {doctor.medicalLicenseNo && (
                            <tr>
                              <td className="text-muted fs-13 py-2">Medical License No</td>
                              <td className="fw-semibold text-dark fs-13 py-2">{doctor.medicalLicenseNo}</td>
                            </tr>
                          )}
                          {doctor.opdNumber && (
                            <tr>
                              <td className="text-muted fs-13 py-2">OPD Room / Chamber</td>
                              <td className="fw-semibold text-dark fs-13 py-2">Room {doctor.opdNumber}</td>
                            </tr>
                          )}
                          {doctor.yearsOfExperience != null && (
                            <tr>
                              <td className="text-muted fs-13 py-2">Years of Experience</td>
                              <td className="fw-semibold text-dark fs-13 py-2">{doctor.yearsOfExperience} Years</td>
                            </tr>
                          )}
                          {doctor.phone && (
                            <tr>
                              <td className="text-muted fs-13 py-2">Phone Number</td>
                              <td className="fw-semibold text-dark fs-13 py-2">{doctor.phone}</td>
                            </tr>
                          )}
                          {doctor.email && (
                            <tr>
                              <td className="text-muted fs-13 py-2">Email Address</td>
                              <td className="fw-semibold text-dark fs-13 py-2">{doctor.email}</td>
                            </tr>
                          )}
                          {doctor.gender && (
                            <tr>
                              <td className="text-muted fs-13 py-2">Gender</td>
                              <td className="fw-semibold text-dark fs-13 py-2">{doctor.gender}</td>
                            </tr>
                          )}
                          {doctor.dob && (
                            <tr>
                              <td className="text-muted fs-13 py-2">Date of Birth</td>
                              <td className="fw-semibold text-dark fs-13 py-2">{doctor.dob}</td>
                            </tr>
                          )}
                          {doctor.bloodGroup && (
                            <tr>
                              <td className="text-muted fs-13 py-2">Blood Group</td>
                              <td className="fw-semibold text-dark fs-13 py-2">{doctor.bloodGroup}</td>
                            </tr>
                          )}
                          {doctor.address && (
                            <tr>
                              <td className="text-muted fs-13 py-2">Address</td>
                              <td className="fw-semibold text-dark fs-13 py-2">{doctor.address}</td>
                            </tr>
                          )}
                          {doctor.maxAppointmentsPerSlot != null && (
                            <tr>
                              <td className="text-muted fs-13 py-2">Max Appts / Slot</td>
                              <td className="fw-semibold text-dark fs-13 py-2">{doctor.maxAppointmentsPerSlot}</td>
                            </tr>
                          )}
                          {doctor.queueSortBy && (
                            <tr>
                              <td className="text-muted fs-13 py-2">Queue Display Order</td>
                              <td className="fw-semibold text-dark fs-13 py-2 text-capitalize">
                                {doctor.queueSortBy === "time" ? "Appointment Time" : "Token Number"}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Sessions & Consultation Charges */}
              <div className="col-lg-6">
                <div className="d-flex flex-column gap-4">
                  {/* Sessions & Duty Timing Card */}
                  <div className="card shadow-sm border-0">
                    <div className="card-header bg-white border-bottom py-3">
                      <h5 className="card-title fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                        <i className="ti ti-clock-check text-primary fs-18" />
                        Sessions & Schedule
                      </h5>
                    </div>
                    <div className="card-body p-4">
                      {doctor.sessions && doctor.sessions.length > 0 ? (
                        <div className="d-flex flex-wrap gap-2">
                          {doctor.sessions.map((session, idx) => (
                            <span
                              key={idx}
                              className="badge bg-light text-dark border px-3 py-2 fs-13 fw-semibold d-inline-flex align-items-center gap-1"
                            >
                              <i className="ti ti-sun text-warning fs-14" />
                              {session}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted mb-0 fs-13">All Day Session</p>
                      )}
                    </div>
                  </div>

                  {/* Visit & Consultation Charges Card */}
                  <div className="card shadow-sm border-0">
                    <div className="card-header bg-white border-bottom py-3">
                      <h5 className="card-title fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                        <i className="ti ti-receipt-2 text-primary fs-18" />
                        Visit Types & Consultation Charges
                      </h5>
                    </div>
                    <div className="card-body p-4">
                      {doctor.visitTypes && doctor.visitTypes.length > 0 ? (
                        <div className="table-responsive">
                          <table className="table table-bordered table-hover mb-0">
                            <thead className="table-light">
                              <tr>
                                <th className="fs-13 fw-semibold text-dark">Visit Type</th>
                                <th className="fs-13 fw-semibold text-dark">Category</th>
                                <th className="fs-13 fw-semibold text-end text-dark">Consultation Fee</th>
                              </tr>
                            </thead>
                            <tbody>
                              {doctor.visitTypes.map((vt, idx) => (
                                <tr key={idx}>
                                  <td className="fw-semibold text-dark fs-13 align-middle">
                                    {vt.visitType === "New" ? "New Patient Consultation" : vt.visitType}
                                  </td>
                                  <td className="text-muted fs-13 align-middle">{vt.appointmentType}</td>
                                  <td className="fw-bold text-success fs-14 text-end align-middle">
                                    ₹{vt.charge}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-muted mb-0 fs-13">No charges configured.</p>
                      )}
                    </div>
                  </div>

                  {/* Dialysis Slots Card (Only if configured) */}
                  {doctor.dialysisSlots && doctor.dialysisSlots.length > 0 && (
                    <div className="card shadow-sm border-0">
                      <div className="card-header bg-white border-bottom py-3">
                        <h5 className="card-title fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                          <i className="ti ti-droplet text-danger fs-18" />
                          Dialysis Slots
                        </h5>
                      </div>
                      <div className="card-body p-4">
                        <div className="table-responsive">
                          <table className="table table-bordered mb-0">
                            <thead className="table-light">
                              <tr>
                                <th className="fs-13 text-dark">Slot Name</th>
                                <th className="fs-13 text-dark">Timing</th>
                                <th className="fs-13 text-center text-dark">Max Patients</th>
                              </tr>
                            </thead>
                            <tbody>
                              {doctor.dialysisSlots.map((slot, idx) => (
                                <tr key={idx}>
                                  <td className="fw-semibold text-dark fs-13">{slot.name}</td>
                                  <td className="text-muted fs-13">
                                    {slot.startTime} - {slot.endTime}
                                  </td>
                                  <td className="text-center fw-bold text-primary fs-13">
                                    {slot.maxAppointments}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DoctorDetailsComponent;
