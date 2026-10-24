"use client";


import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { API_BASE_URL } from "@/environment";
import { DatePicker } from "antd";
import {
  Amount,
  Department,
  Designation,
  Doctor,
  Status,
} from "@/core/common/selectOption";
import ImageWithBasePath from "@/core/imageWithBasePath";
import Modals from "./modals/modals";
import { all_routes } from "../../../../routes/all_routes";
import Link from "next/link";
import CommonSelect from "@/core/common/common-select/commonSelect";
import DoctorAvatar from "@/components/common/DoctorAvatar";

interface IDoctor {
  _id: string;
  doctorId: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  yearsOfExperience: number;
  gender: string;
  imageUrl?: string;
  status?: string;
}

const DoctorsComponent = () => {
  const [doctors, setDoctors] = useState<IDoctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const fetchDoctors = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/hospital/doctors`, {
        params: { limit: 50 },
        withCredentials: true,
      });
      if (res.data?.status === "SUCCESS") {
        setDoctors(res.data.data.doctors || []);
        setTotalCount(res.data.data.pagination?.totalCount || (res.data.data.doctors || []).length);
      }
    } catch (err: any) {
      console.error("Failed to fetch doctors:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  useEffect(() => {
    const handleDoctorUpdated = () => {
      fetchDoctors();
    };
    window.addEventListener("doctor-updated", handleDoctorUpdated);
    return () => {
      window.removeEventListener("doctor-updated", handleDoctorUpdated);
    };
  }, [fetchDoctors]);

  const getModalContainer = () => {
    const modalElement = document.getElementById("modal-datepicker");
    return modalElement ? modalElement : document.body; // Fallback to document.body if modalElement is null
  };

  return (
    <>
      {/* ========================
			Start Page Content
		========================= */}
      <div className="page-wrapper">
        {/* Start Content */}
        <div className="content">
          {/* Start Page Header */}
          <div className="d-flex align-items-sm-center flex-sm-row flex-column gap-2 mb-3">
            <div className="flex-grow-1">
              <h4 className="fw-bold mb-0">
                Doctor Grid
                <span className="badge badge-soft-primary fs-13 fw-medium ms-2">
                  Total Doctors : {totalCount}
                </span>
              </h4>
            </div>
            <div className="text-end d-flex">
              <div className="dropdown me-2">
                <Link
                  href="#"
                  className="btn btn-white bg-white fs-14 py-1 border d-inline-flex text-dark align-items-center"
                  data-bs-toggle="dropdown"
                  data-bs-auto-close="false"
                >
                  <i className="ti ti-filter text-gray-5 me-1" />
                  Filters
                </Link>
                <div
                  className="dropdown-menu dropdown-lg dropdown-menu-end filter-dropdown p-0"
                  id="filter-dropdown"
                >
                  <div className="d-flex align-items-center justify-content-between border-bottom filter-header">
                    <h4 className="mb-0">Filter</h4>
                    <div className="d-flex align-items-center">
                      <Link
                        href="#"
                        className="link-danger text-decoration-underline"
                      >
                        Clear All
                      </Link>
                    </div>
                  </div>
                  <form action="#">
                    <div className="filter-body pb-0">
                      <div className="mb-3">
                        <div className="d-flex align-items-center justify-content-between">
                          <label className="form-label">Doctor</label>
                          <Link href="#" className="link-primary mb-1">
                            Reset
                          </Link>
                        </div>
                        <CommonSelect
                          options={Doctor}
                          className="select"
                          defaultValue={Doctor[0]}
                        />
                      </div>
                      <div className="mb-3">
                        <div className="d-flex align-items-center justify-content-between">
                          <label className="form-label">Designation</label>
                          <Link href="#" className="link-primary mb-1">
                            Reset
                          </Link>
                        </div>
                        <CommonSelect
                          options={Designation}
                          className="select"
                          defaultValue={Designation[0]}
                        />
                      </div>
                      <div className="mb-3">
                        <div className="d-flex align-items-center justify-content-between">
                          <label className="form-label">Department</label>
                          <Link href="#" className="link-primary mb-1">
                            Reset
                          </Link>
                        </div>
                        <CommonSelect
                          options={Department}
                          className="select"
                          placeholder="Search department"
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label mb-1 text-dark fs-14 fw-medium">
                          Date<span className="text-danger">*</span>
                        </label>
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
                          />
                          <span className="input-icon-addon">
                            <i className="ti ti-calendar" />
                          </span>
                        </div>
                      </div>
                      <div className="mb-3">
                        <div className="d-flex align-items-center justify-content-between">
                          <label className="form-label">Amount</label>
                          <Link href="#" className="link-primary mb-1">
                            Reset
                          </Link>
                        </div>
                        <CommonSelect
                          options={Amount}
                          className="select"
                          defaultValue={Amount[0]}
                        />
                      </div>
                      <div className="mb-3">
                        <div className="d-flex align-items-center justify-content-between">
                          <label className="form-label">Status</label>
                          <Link href="#" className="link-primary mb-1">
                            Reset
                          </Link>
                        </div>
                        <CommonSelect
                          options={Status}
                          className="select"
                          defaultValue={Status[0]}
                        />
                      </div>
                    </div>
                    <div className="filter-footer d-flex align-items-center justify-content-end border-top">
                      <Link
                        href="#"
                        className="btn btn-light btn-md me-2"
                        id="close-filter"
                      >
                        Close
                      </Link>
                      <button type="submit" className="btn btn-primary btn-md">
                        Filter
                      </button>
                    </div>
                  </form>
                </div>
              </div>
              <div className="bg-white border shadow-sm rounded px-1 pb-0 text-center d-flex align-items-center justify-content-center">
                <Link
                  href={all_routes.doctorsList}
                  className="bg-white rounded p-1 d-flex align-items-center justify-content-center"
                >
                  <i className="ti ti-list fs-14 text-body" />
                </Link>
                <Link
                  href={all_routes.doctors}
                  className="bg-light rounded p-1 d-flex align-items-center justify-content-center"
                >
                  <i className="ti ti-layout-grid fs-14 text-body" />
                </Link>
              </div>
              <Link
                href={all_routes.addDoctors}
                className="btn btn-primary ms-2 fs-13 btn-md"
              >
                <i className="ti ti-plus me-1" />
                New Doctor
              </Link>
            </div>
          </div>
          {/* End Page Header */}
          <div className="row">
            {loading ? (
              <div className="col-12 text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading doctors...</span>
                </div>
              </div>
            ) : doctors.length === 0 ? (
              <div className="col-12 text-center py-5">
                <p className="text-muted fs-15">No doctors found.</p>
              </div>
            ) : (
              doctors.map((doc) => (
                <div className="col-xl-4 col-md-6" key={doc._id}>
                  <div className="card">
                    <div className="card-body d-flex align-items-center flex-sm-nowrap flex-wrap row-gap-3">
                      <div className="me-3 doctor-profile-img">
                        <Link href={`${all_routes.doctorsDetails}?id=${doc.doctorId || doc._id}`}>
                          <DoctorAvatar
                            imageUrl={doc.imageUrl}
                            gender={doc.gender}
                            size={72}
                            className="rounded"
                          />
                        </Link>
                      </div>
                      <div className="flex-fill">
                        <div className="d-flex align-items-center justify-content-between mb-1">
                          <h6 className="mb-0 fw-semibold text-truncate">
                            <Link href={`${all_routes.doctorsDetails}?id=${doc.doctorId || doc._id}`}>
                              {doc.name}
                            </Link>
                          </h6>
                          <div className="action-item">
                            <Link href="#" data-bs-toggle="dropdown">
                              <i className="ti ti-dots-vertical" />
                            </Link>
                            <ul className="dropdown-menu">
                              <li>
                                <Link
                                  href={all_routes.editDoctors}
                                  className="dropdown-item d-flex align-items-center"
                                >
                                  Edit
                                </Link>
                              </li>
                              <li>
                                <Link
                                  href="#"
                                  className="dropdown-item d-flex align-items-center"
                                  data-bs-toggle="modal"
                                  data-bs-target="#delete_modal"
                                >
                                  Delete
                                </Link>
                              </li>
                            </ul>
                          </div>
                        </div>
                        <span className="d-block mb-1 fs-13 text-muted">
                          {doc.department || "General Medicine"}
                        </span>
                        <p className="mb-2 fs-13 text-muted">
                          {doc.designation || `ID: ${doc.doctorId}`}
                          {doc.yearsOfExperience ? ` • ${doc.yearsOfExperience} yrs exp` : ""}
                        </p>
                        <div className="d-flex align-items-center justify-content-between">
                          <span className={`badge ${doc.status === "Active" ? "badge-soft-success" : "badge-soft-secondary"}`}>
                            {doc.status || "Active"}
                          </span>
                          <Link
                            href={all_routes.appointmentCalendar}
                            className="avatar avatar-xs border text-muted fs-14"
                          >
                            <i className="ti ti-calendar-cog" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="text-center">
            <Link href="#" className="btn btn-white bg-white text-dark fs-13">
              Load More
              <span className="spinner-border spinner-border-sm ms-1" />
            </Link>
          </div>
        </div>
        {/* End Content */}
        {/* Footer Start */}
        <div className="footer text-center bg-white p-2 border-top">
          <p className="text-dark mb-0">
            2025 ©
            <Link href="#" className="link-primary">
              Preclinic
            </Link>
            , All Rights Reserved
          </p>
        </div>
        {/* Footer End */}
      </div>
      {/* ========================
			End Page Content
		========================= */}
      <Modals onDoctorUpdated={() => fetchDoctors()} />
    </>
  );
};

export default DoctorsComponent;
