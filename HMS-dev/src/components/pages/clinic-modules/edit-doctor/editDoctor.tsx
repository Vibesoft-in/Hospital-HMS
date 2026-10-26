"use client";

import { useEffect, useState, useCallback, useId } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { DatePicker, message } from "antd";
import dayjs from "dayjs";
import Select from "react-select";

import { all_routes } from "../../../../routes/all_routes";
import { API_BASE_URL } from "@/environment";
import {
  Blood_Group,
  Department,
  Designation,
  Gender,
  Sessions,
  Queue_Sort_By,
  findDepartmentOption,
} from "@/core/common/selectOption";
import CommonSelect, { type Option } from "@/core/common/common-select/commonSelect";
import IndianPhoneInput from "@/core/common/indianPhoneInput/IndianPhoneInput";
import DoctorAvatar from "@/components/common/DoctorAvatar";
import {
  formatPatientPhoneForApi,
  validateIndianMobilePhone,
} from "@/core/utils/formatPatientPhoneForApi";
import { uploadFileToS3 } from "@/core/utils/uploadFileToS3";
import { broadcastDoctorUpdate } from "@/core/utils/doctorUpdateEvent";
import DialysisSlotsField, {
  type IDialysisSlotForm,
  getDialysisSlotsValidationMessage,
  mapDialysisSlotsToApi,
  mapDialysisSlotsFromApi,
} from "@/components/pages/clinic-modules/doctors/dialysisSlotsField";
import IpdPatientCompactUpload from "@/components/pages/clinic-modules/ipd-appointments/IpdPatientCompactUpload";

interface IToastState {
  type: "success" | "error";
  text: string;
}

const DEFAULT_VISIT_TYPES = [
  { type: "OPD", charge: "" },
  { type: "Emergency", charge: "" },
  { type: "Follow-up", charge: "" },
  { type: "Follow-up report", charge: "" },
  { type: "MR", charge: "" },
  { type: "Day Care", charge: "" },
  { type: "IPD", charge: "" },
];

const EditDoctorComponent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const idFromParam = searchParams.get("id") || searchParams.get("doctorId");
  const sessionsInstanceId = useId();

  // Resolved Doctor Mongo ID & readable ID
  const [actualDoctorId, setActualDoctorId] = useState<string>("");
  const [doctorReadableId, setDoctorReadableId] = useState<string>("");

  // Loading & error states
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [toast, setToast] = useState<IToastState | null>(null);

  // Form states
  const [name, setName] = useState<string>("");
  const [phone, setPhone] = useState<string | undefined>();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [dob, setDob] = useState<dayjs.Dayjs | null>(null);
  const [gender, setGender] = useState<Option | null>(Gender[0] || null);
  const [bloodGroup, setBloodGroup] = useState<Option | null>(Blood_Group[0] || null);
  const [yearsOfExperience, setYearsOfExperience] = useState<string>("");
  const [department, setDepartment] = useState<Option | null>(null);
  const [designation, setDesignation] = useState<Option | null>(Designation[0] || null);
  const [medicalLicenseNo, setMedicalLicenseNo] = useState<string>("");
  const [opdNumber, setOpdNumber] = useState<string>("");
  const [maxAppointmentsPerSlot, setMaxAppointmentsPerSlot] = useState<string>("4");
  const [queueSortBy, setQueueSortBy] = useState<Option | null>(Queue_Sort_By[0] || null);
  const [sessions, setSessions] = useState<Option[]>([]);
  const [address, setAddress] = useState<string>("");
  const [visitTypes, setVisitTypes] = useState(DEFAULT_VISIT_TYPES);
  const [dialysisSlots, setDialysisSlots] = useState<IDialysisSlotForm[]>([]);

  // Photos & Posters
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string>("");
  const [savedImageUrl, setSavedImageUrl] = useState<string>("");
  const [photoRemoved, setPhotoRemoved] = useState<boolean>(false);

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(photoFile);
    setPhotoPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [existingPosterUrl, setExistingPosterUrl] = useState<string>("");
  const [savedPosterUrl, setSavedPosterUrl] = useState<string>("");
  const [posterRemoved, setPosterRemoved] = useState<boolean>(false);

  const getModalContainer = () => {
    const modalElement = document.getElementById("modal-datepicker");
    return modalElement ? modalElement : document.body;
  };

  const handleVisitTypeChange = (index: number, charge: string) => {
    const updated = [...visitTypes];
    updated[index].charge = charge;
    setVisitTypes(updated);
  };

  const populateDoctorData = useCallback((doctor: any) => {
    setActualDoctorId(doctor._id || "");
    setDoctorReadableId(doctor.doctorId || "");
    setName(doctor.name || "");
    setPhone(doctor.phone || undefined);
    setEmail(doctor.email || "");
    setPassword("");
    setDob(doctor.dob && dayjs(doctor.dob).isValid() ? dayjs(doctor.dob) : null);
    setGender(Gender.find((g) => g.value === doctor.gender) || Gender[0] || null);
    setBloodGroup(
      Blood_Group.find((bg) => bg.value === doctor.bloodGroup) || Blood_Group[0] || null
    );
    setYearsOfExperience(
      doctor.yearsOfExperience != null ? String(doctor.yearsOfExperience) : ""
    );
    setDepartment(findDepartmentOption(doctor.department));
    setDesignation(
      Designation.find((d) => d.value === doctor.designation) || Designation[0] || null
    );
    setMedicalLicenseNo(doctor.medicalLicenseNo || "");
    setOpdNumber(doctor.opdNumber || "");
    setMaxAppointmentsPerSlot(
      doctor.maxAppointmentsPerSlot != null ? String(doctor.maxAppointmentsPerSlot) : "4"
    );
    setQueueSortBy(
      Queue_Sort_By.find((option) => option.value === doctor.queueSortBy) ||
        Queue_Sort_By[0] ||
        null
    );
    setAddress(doctor.address || "");

    const imgUrl = doctor.imageUrl ?? "";
    const pUrl = doctor.posterUrl ?? "";
    setExistingImageUrl(imgUrl);
    setSavedImageUrl(imgUrl);
    setExistingPosterUrl(pUrl);
    setSavedPosterUrl(pUrl);
    setPhotoRemoved(false);
    setPosterRemoved(false);
    setPhotoFile(null);
    setPosterFile(null);

    // Map sessions
    if (doctor.sessions && Array.isArray(doctor.sessions)) {
      const mappedSessions = doctor.sessions
        .map((s: string) => {
          const lower = (s || "").toLowerCase();
          if (lower === "noon" || lower === "afternoon") return "Afternoon";
          return (s || "").charAt(0).toUpperCase() + (s || "").slice(1).toLowerCase();
        })
        .map((s: string) => Sessions.find((se) => se.value === s))
        .filter(Boolean) as Option[];
      setSessions(mappedSessions);
    } else {
      setSessions(
        [
          Sessions.find((s) => s.value === "Morning"),
          Sessions.find((s) => s.value === "Afternoon"),
          Sessions.find((s) => s.value === "Evening"),
        ].filter(Boolean) as Option[]
      );
    }

    // Map visit types
    if (doctor.visitTypes && Array.isArray(doctor.visitTypes)) {
      const mappedVisitTypes = DEFAULT_VISIT_TYPES.map((vt) => {
        const found = doctor.visitTypes.find((v: any) => {
          if (v.visitType != null && v.appointmentType != null) {
            if (vt.type === "OPD") return v.visitType === "New" && v.appointmentType === "OPD";
            if (vt.type === "Day Care")
              return v.visitType === "New" && v.appointmentType === "Day Care";
            if (vt.type === "IPD") return v.visitType === "New" && v.appointmentType === "IPD";
            if (vt.type === "Follow-up report")
              return v.visitType === "Follow-up-report" && v.appointmentType === "OPD";
            return v.visitType === vt.type && v.appointmentType === "OPD";
          }
          return v.type === vt.type;
        });
        return found && found.charge != null
          ? { type: vt.type, charge: found.charge.toString() }
          : vt;
      });
      setVisitTypes(mappedVisitTypes);
    } else {
      setVisitTypes(DEFAULT_VISIT_TYPES);
    }

    setDialysisSlots(mapDialysisSlotsFromApi(doctor.dialysisSlots));
  }, []);

  // Fetch doctor on mount or when idFromParam changes
  useEffect(() => {
    let isMounted = true;

    if (!idFromParam) {
      setLoading(false);
      setFetchError("No doctor ID provided in the URL.");
      return;
    }

    const fetchDoctor = async () => {
      setLoading(true);
      setFetchError(null);

      try {
        if (!API_BASE_URL) {
          throw new Error("API_BASE_URL is not configured.");
        }

        let doctorData: any = null;

        try {
          const res = await axios.get(`${API_BASE_URL}/hospital/doctors/${idFromParam}`);
          doctorData = res.data?.data?.doctor || res.data?.data || res.data?.doctor || null;
        } catch (firstErr) {
          // If searching by doctor readable ID fallback
          try {
            const fallbackRes = await axios.get(
              `${API_BASE_URL}/hospital/doctors/search/doctorId/${idFromParam}`
            );
            doctorData =
              fallbackRes.data?.data?.doctor ||
              fallbackRes.data?.data ||
              fallbackRes.data?.doctor ||
              null;
          } catch {
            throw firstErr;
          }
        }

        if (isMounted) {
          if (doctorData) {
            populateDoctorData(doctorData);
          } else {
            setFetchError("Doctor details could not be found.");
          }
        }
      } catch (err: any) {
        if (isMounted) {
          console.error("Error fetching doctor details:", err);
          const msg =
            err.response?.data?.message ||
            err.response?.data?.error ||
            err.message ||
            "Unable to load doctor profile. Please verify doctor ID.";
          setFetchError(msg);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchDoctor();

    return () => {
      isMounted = false;
    };
  }, [idFromParam, populateDoctorData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const targetId = actualDoctorId || idFromParam;
    if (!targetId) {
      message.error("Doctor ID is missing.");
      setToast({ type: "error", text: "Doctor ID is missing." });
      return;
    }

    if (!name.trim()) {
      message.error("Name is required.");
      setToast({ type: "error", text: "Name is required." });
      return;
    }

    if (!phone?.trim()) {
      message.error("Phone number is required.");
      setToast({ type: "error", text: "Phone number is required." });
      return;
    }

    const phoneValidation = validateIndianMobilePhone(phone);
    if (!phoneValidation.valid) {
      const errorMsg = phoneValidation.message || "Please enter a valid 10-digit Indian phone number.";
      message.error(errorMsg);
      setToast({ type: "error", text: errorMsg });
      return;
    }

    if (!email.trim()) {
      message.error("Email address is required.");
      setToast({ type: "error", text: "Email address is required." });
      return;
    }

    const validSessions = sessions
      .filter((s) => s.value && s.value !== "Select")
      .map((s) => s.value);
    if (validSessions.length === 0) {
      message.error("Please select at least one session.");
      setToast({ type: "error", text: "Please select at least one session." });
      return;
    }

    const dialysisSlotsError = getDialysisSlotsValidationMessage(dialysisSlots);
    if (dialysisSlotsError) {
      message.error(dialysisSlotsError);
      setToast({ type: "error", text: dialysisSlotsError });
      return;
    }

    try {
      if (!API_BASE_URL) {
        throw new Error("API_BASE_URL is not configured.");
      }

      setSaving(true);
      setToast(null);

      // Map visit types to API shape
      const visitTypesData = visitTypes
        .filter((vt) => vt.charge && vt.charge.trim() !== "")
        .map((vt) => {
          const charge = parseFloat(vt.charge) || 0;
          if (vt.type === "OPD") return { visitType: "New", appointmentType: "OPD", charge };
          if (vt.type === "Day Care")
            return { visitType: "New", appointmentType: "Day Care", charge };
          if (vt.type === "IPD") return { visitType: "New", appointmentType: "IPD", charge };
          if (vt.type === "Follow-up report")
            return { visitType: "Follow-up-report", appointmentType: "OPD", charge };
          return { visitType: vt.type, appointmentType: "OPD", charge };
        });

      const doctorData: Record<string, unknown> = {
        name: name.trim(),
        phone: formatPatientPhoneForApi(phone),
        email: email.trim(),
        yearsOfExperience: parseInt(yearsOfExperience, 10) || 0,
        department: department?.value && department.value !== "Select" ? department.value : "",
        designation: designation?.value && designation.value !== "Select" ? designation.value : "",
        medicalLicenseNo: medicalLicenseNo.trim(),
        opdNumber: opdNumber.trim(),
        gender: gender?.value && gender.value !== "Select" ? gender.value : "",
        bloodGroup: bloodGroup?.value && bloodGroup.value !== "Select" ? bloodGroup.value : undefined,
        address: address.trim() || undefined,
        visitTypes: visitTypesData,
        sessions: validSessions,
        maxAppointmentsPerSlot: parseInt(maxAppointmentsPerSlot, 10) || 4,
        queueSortBy: queueSortBy?.value === "time" ? "time" : "token",
        dialysisSlots: mapDialysisSlotsToApi(dialysisSlots),
      };

      if (password.trim()) {
        doctorData.password = password.trim();
      }

      if (dob && dayjs.isDayjs(dob) && dob.isValid()) {
        doctorData.dob = dob.format("YYYY-MM-DD");
      }

      // Upload profile image if a new one was selected
      if (photoFile) {
        try {
          const uploadedImageUrl = await uploadFileToS3(photoFile, "doctors_profile");
          if (uploadedImageUrl) {
            doctorData.imageUrl = uploadedImageUrl.trim();
          }
        } catch (uploadErr) {
          console.warn("Photo upload warning, proceeding with update:", uploadErr);
        }
      } else if (photoRemoved && savedImageUrl.trim()) {
        doctorData.imageUrl = "";
      }

      // Upload poster if a new one was selected
      if (posterFile) {
        try {
          const uploadedPosterUrl = await uploadFileToS3(posterFile, "doctors_posters");
          if (uploadedPosterUrl) {
            doctorData.posterUrl = uploadedPosterUrl.trim();
          }
        } catch (uploadErr) {
          console.warn("Poster upload warning, proceeding with update:", uploadErr);
        }
      } else if (posterRemoved && savedPosterUrl.trim()) {
        doctorData.posterUrl = "";
      }

      const response = await axios.patch(
        `${API_BASE_URL}/hospital/doctors/${targetId}`,
        doctorData
      );

      const isSuccess = response.status >= 200 && response.status < 300;
      const hasSuccessCode = response.data?.code === 200;

      if (isSuccess || hasSuccessCode) {
        const finalImageUrl =
          (doctorData.imageUrl as string) !== undefined
            ? (doctorData.imageUrl as string)
            : savedImageUrl;

        broadcastDoctorUpdate({
          doctorId: targetId,
          imageUrl: finalImageUrl,
          doctorData: { ...doctorData, _id: targetId, doctorId: doctorReadableId },
        });

        message.success("Doctor details updated successfully!");
        setToast({
          type: "success",
          text: "Doctor details updated successfully! Redirecting to doctor list...",
        });

        setTimeout(() => {
          router.push(all_routes.doctorsList);
        }, 1200);
      } else {
        const errorMsg = response.data?.message || "Failed to update doctor.";
        message.error(errorMsg);
        setToast({ type: "error", text: errorMsg });
        setSaving(false);
      }
    } catch (error: any) {
      console.error("Error updating doctor:", error);
      const errorMsg =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "Failed to update doctor. Please verify all required fields.";
      message.error(errorMsg);
      setToast({ type: "error", text: errorMsg });
      setSaving(false);
    }
  };

  return (
    <>
      {/* Toast Alert Banner */}
      {toast && (
        <div className="position-fixed top-0 end-0 p-3" style={{ zIndex: 99999 }}>
          <div
            className={`alert ${
              toast.type === "success" ? "alert-success" : "alert-danger"
            } d-flex align-items-center gap-2 shadow-lg mb-0 border-0 rounded-3 py-2 px-3`}
            role="alert"
          >
            <i
              className={`ti ${
                toast.type === "success" ? "ti-circle-check" : "ti-alert-circle"
              } fs-20`}
            />
            <div className="fw-medium">{toast.text}</div>
            <button
              type="button"
              className="btn-close ms-2"
              onClick={() => setToast(null)}
              aria-label="Close"
            />
          </div>
        </div>
      )}

      <div className="page-wrapper">
        <div className="content">
          <div className="row">
            <div className="col-12 col-xl-11 mx-auto">
              {/* Page Header */}
              <div className="d-flex align-items-sm-center flex-sm-row flex-column gap-2 mb-3">
                <div className="flex-grow-1">
                  <h6 className="fw-bold mb-0 d-flex align-items-center">
                    <Link
                      href={all_routes.doctorsList}
                      className="text-dark d-inline-flex align-items-center gap-1"
                    >
                      <i className="ti ti-chevron-left me-1 fs-14" />
                      Back to Doctor List
                    </Link>
                  </h6>
                </div>
                {doctorReadableId && (
                  <span className="badge badge-soft-primary fs-13 fw-semibold">
                    Doctor ID: {doctorReadableId}
                  </span>
                )}
              </div>

              {/* Loading State */}
              {loading ? (
                <div className="card shadow-sm border-0 py-5 text-center">
                  <div className="spinner-border text-primary mx-auto mb-3" role="status">
                    <span className="visually-hidden">Loading doctor details...</span>
                  </div>
                  <h6 className="text-dark fw-semibold mb-1">Loading Doctor Profile</h6>
                  <p className="text-muted mb-0 fs-13">Fetching doctor information from server...</p>
                </div>
              ) : fetchError ? (
                /* Error State */
                <div className="card shadow-sm border-0 py-5 text-center">
                  <i className="ti ti-alert-circle text-danger fs-36 mb-2" />
                  <h5 className="fw-bold text-dark">{fetchError}</h5>
                  <p className="text-muted mb-3 fs-14">
                    Please return to the Doctors List and select a valid doctor to edit.
                  </p>
                  <div>
                    <Link href={all_routes.doctorsList} className="btn btn-primary btn-sm">
                      Go to Doctor List
                    </Link>
                  </div>
                </div>
              ) : (
                /* Edit Form Card */
                <div className="card shadow-sm border-0">
                  <div className="card-body p-4">
                    {/* Header Banner */}
                    <div className="d-flex align-items-center justify-content-between pb-3 mb-4 border-bottom">
                      <div className="d-flex align-items-center gap-3">
                        <DoctorAvatar
                          imageUrl={
                            photoPreviewUrl || (!photoRemoved ? existingImageUrl : undefined)
                          }
                          gender={gender?.value || "Male"}
                          size={64}
                          shape="rounded"
                          className="shadow-sm border"
                        />
                        <div>
                          <h4 className="fw-bold text-dark mb-1">
                            {name ? `Edit: ${name}` : "Edit Doctor"}
                          </h4>
                          <div className="d-flex align-items-center gap-2 text-muted fs-13">
                            <span>{department?.label || "General Medicine"}</span>
                            <span>•</span>
                            <span>{designation?.label || "Consultant"}</span>
                            {doctorReadableId && (
                              <>
                                <span>•</span>
                                <span className="text-primary fw-medium">{doctorReadableId}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <form onSubmit={handleSubmit}>
                      {/* Section: General & Contact Information */}
                      <div className="mb-4">
                        <div className="d-flex align-items-center gap-2 mb-3 pb-2 border-bottom">
                          <i className="ti ti-user-check text-primary fs-18" />
                          <h6 className="fw-bold mb-0 text-dark fs-15">
                            General &amp; Contact Information
                          </h6>
                        </div>

                        <div className="row g-3">
                          <div className="col-lg-4 col-md-6">
                            <label className="form-label fw-medium">
                              Full Name <span className="text-danger">*</span>
                            </label>
                            <input
                              type="text"
                              className="form-control"
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              placeholder="e.g. Dr. John Doe"
                              required
                            />
                          </div>

                          <div className="col-lg-4 col-md-6">
                            <label className="form-label fw-medium">
                              Phone Number <span className="text-danger">*</span>
                            </label>
                            <IndianPhoneInput
                              defaultCountry="IN"
                              value={phone}
                              onChange={setPhone}
                              placeholder="10-digit mobile number"
                              required
                            />
                          </div>

                          <div className="col-lg-4 col-md-6">
                            <label className="form-label fw-medium">
                              Email Address <span className="text-danger">*</span>
                            </label>
                            <input
                              type="email"
                              className="form-control"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              placeholder="doctor@hospital.com"
                              autoComplete="email"
                              required
                            />
                          </div>

                          <div className="col-lg-4 col-md-6">
                            <label className="form-label fw-medium">New Password</label>
                            <input
                              type="password"
                              className="form-control"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              placeholder="Leave blank to keep unchanged"
                              autoComplete="new-password"
                            />
                          </div>

                          <div className="col-lg-4 col-md-6">
                            <label className="form-label fw-medium">Date of Birth</label>
                            <div className="input-icon-end position-relative">
                              <DatePicker
                                className="form-control datetimepicker"
                                format={{
                                  format: "DD-MM-YYYY",
                                  type: "mask",
                                }}
                                getPopupContainer={getModalContainer}
                                placeholder="DD-MM-YYYY"
                                suffixIcon={null}
                                value={dob}
                                onChange={setDob}
                                allowClear
                              />
                              <span className="input-icon-addon">
                                <i className="ti ti-calendar" />
                              </span>
                            </div>
                          </div>

                          <div className="col-lg-2 col-md-3">
                            <label className="form-label fw-medium">Gender</label>
                            <CommonSelect
                              options={Gender}
                              className="select"
                              value={gender}
                              onChange={setGender}
                            />
                          </div>

                          <div className="col-lg-2 col-md-3">
                            <label className="form-label fw-medium">Blood Group</label>
                            <CommonSelect
                              options={Blood_Group}
                              className="select"
                              value={bloodGroup}
                              onChange={setBloodGroup}
                            />
                          </div>

                          <div className="col-lg-2 col-md-3">
                            <label className="form-label fw-medium">Years of Exp</label>
                            <input
                              type="number"
                              className="form-control"
                              value={yearsOfExperience}
                              onChange={(e) => setYearsOfExperience(e.target.value)}
                              min="0"
                              placeholder="0"
                            />
                          </div>

                          <div className="col-lg-3 col-md-5">
                            <label className="form-label fw-medium">
                              Department <span className="text-danger">*</span>
                            </label>
                            <CommonSelect
                              options={Department}
                              className="select"
                              value={department}
                              onChange={setDepartment}
                              placeholder="Select department"
                            />
                          </div>

                          <div className="col-lg-3 col-md-4">
                            <label className="form-label fw-medium">Designation</label>
                            <CommonSelect
                              options={Designation}
                              className="select"
                              value={designation}
                              onChange={setDesignation}
                            />
                          </div>

                          <div className="col-lg-4 col-md-6">
                            <label className="form-label fw-medium">Medical License No</label>
                            <input
                              type="text"
                              className="form-control"
                              value={medicalLicenseNo}
                              onChange={(e) => setMedicalLicenseNo(e.target.value)}
                              placeholder="e.g. MED-89472"
                            />
                          </div>

                          <div className="col-lg-2 col-md-3">
                            <label className="form-label fw-medium">OPD Room No.</label>
                            <input
                              type="text"
                              className="form-control"
                              value={opdNumber}
                              onChange={(e) => setOpdNumber(e.target.value)}
                              placeholder="Room / OPD #"
                            />
                          </div>

                          <div className="col-lg-2 col-md-3">
                            <label className="form-label fw-medium text-nowrap">
                              Max Appts/Slot
                            </label>
                            <input
                              type="number"
                              className="form-control"
                              value={maxAppointmentsPerSlot}
                              onChange={(e) => setMaxAppointmentsPerSlot(e.target.value)}
                              min="1"
                              placeholder="4"
                            />
                          </div>

                          <div className="col-lg-3 col-md-4">
                            <label className="form-label fw-medium">Queue TV Sorting</label>
                            <CommonSelect
                              options={Queue_Sort_By}
                              className="select"
                              value={queueSortBy}
                              onChange={setQueueSortBy}
                            />
                          </div>

                          <div className="col-lg-5 col-md-8">
                            <label className="form-label fw-medium">
                              Sessions <span className="text-danger">*</span>
                            </label>
                            <Select
                              isMulti
                              options={Sessions.filter((s) => s.value !== "Select")}
                              value={sessions}
                              onChange={(selected) => setSessions(selected as Option[])}
                              classNamePrefix="react-select"
                              className="select"
                              placeholder="Select sessions (Morning, Afternoon, Evening)"
                              instanceId={sessionsInstanceId}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Section: Visit Types & Charges */}
                      <div className="mb-4">
                        <div className="d-flex align-items-center gap-2 mb-3 pb-2 border-bottom">
                          <i className="ti ti-currency-rupee text-primary fs-18" />
                          <h6 className="fw-bold mb-0 text-dark fs-15">
                            Visit Types &amp; Consultation Charges
                          </h6>
                        </div>

                        <div className="row g-3">
                          <div className="col-lg-7">
                            <div className="table-responsive rounded border">
                              <table className="table table-sm table-hover mb-0">
                                <thead className="table-light">
                                  <tr>
                                    <th className="text-dark fw-semibold ps-3 py-2">Visit Type</th>
                                    <th className="text-dark fw-semibold py-2">Consultation Charge</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {visitTypes.map((vt, index) => (
                                    <tr key={vt.type}>
                                      <td className="text-dark fw-medium align-middle ps-3 py-2">
                                        {vt.type}
                                      </td>
                                      <td className="py-2" style={{ maxWidth: "200px" }}>
                                        <div className="input-group input-group-sm">
                                          <span className="input-group-text bg-white text-muted">
                                            ₹
                                          </span>
                                          <input
                                            type="number"
                                            className="form-control"
                                            value={vt.charge}
                                            onChange={(e) =>
                                              handleVisitTypeChange(index, e.target.value)
                                            }
                                            placeholder="0"
                                            min="0"
                                          />
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          <div className="col-lg-5">
                            <div className="mb-3">
                              <label className="form-label fw-medium">Clinic / Residential Address</label>
                              <textarea
                                className="form-control"
                                rows={4}
                                placeholder="Enter doctor's full address"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Section: Photos & Posters */}
                      <div className="mb-4">
                        <div className="d-flex align-items-center gap-2 mb-3 pb-2 border-bottom">
                          <i className="ti ti-photo text-primary fs-18" />
                          <h6 className="fw-bold mb-0 text-dark fs-15">
                            Profile Image &amp; Display Poster
                          </h6>
                        </div>

                        <div className="row g-3">
                          <div className="col-md-6">
                            <IpdPatientCompactUpload
                              label="Profile Image"
                              placeholder="Upload doctor avatar photo"
                              hint="JPG, PNG or WebP"
                              accept="image/jpeg,image/png,image/jpg,image/webp"
                              file={photoFile}
                              previewUrl={!photoRemoved ? existingImageUrl || undefined : undefined}
                              onFileChange={(file) => {
                                setPhotoFile(file);
                                if (file) setPhotoRemoved(false);
                              }}
                              onClear={() => {
                                setPhotoFile(null);
                                setExistingImageUrl("");
                                setPhotoRemoved(true);
                              }}
                            />
                          </div>

                          <div className="col-md-6">
                            <IpdPatientCompactUpload
                              label="Queue TV Display Poster"
                              placeholder="Upload queue TV background poster"
                              hint="JPG, PNG or WebP"
                              accept="image/jpeg,image/png,image/jpg,image/webp"
                              file={posterFile}
                              previewUrl={!posterRemoved ? existingPosterUrl || undefined : undefined}
                              onFileChange={(file) => {
                                setPosterFile(file);
                                if (file) setPosterRemoved(false);
                              }}
                              onClear={() => {
                                setPosterFile(null);
                                setExistingPosterUrl("");
                                setPosterRemoved(true);
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Section: Dialysis Slots */}
                      <div className="mb-4">
                        <DialysisSlotsField
                          slots={dialysisSlots}
                          onChange={setDialysisSlots}
                        />
                      </div>

                      {/* Form Actions Footer */}
                      <div className="d-flex align-items-center justify-content-end gap-2 pt-3 border-top">
                        <Link
                          href={all_routes.doctorsList}
                          className="btn btn-light px-4 py-2"
                        >
                          Cancel
                        </Link>
                        <button
                          type="submit"
                          className="btn btn-primary px-4 py-2 d-inline-flex align-items-center gap-2"
                          disabled={saving}
                        >
                          {saving && (
                            <span className="spinner-border spinner-border-sm" role="status" />
                          )}
                          <span>{saving ? "Saving Changes..." : "Save Changes"}</span>
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="footer text-center bg-white p-2 border-top">
          <p className="text-dark mb-0">
            2025 ©{" "}
            <Link href="#" className="link-primary">
              Preclinic
            </Link>
            , All Rights Reserved
          </p>
        </div>
      </div>
    </>
  );
};

export default EditDoctorComponent;
