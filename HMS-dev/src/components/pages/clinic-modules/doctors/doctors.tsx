"use client";


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

const DoctorsComponent = () => {
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
                  Total Doctors : 565
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
            <div className="col-xl-4 col-md-6">
              <div className="card">
                <div className="card-body d-flex align-items-center flex-sm-nowrap flex-wrap row-gap-3">
                  <div className="me-3 doctor-profile-img">
                    <Link href={all_routes.doctorsDetails}>
                      <ImageWithBasePath
                        src="assets/img/doctors/doctor-01.jpg"
                        className="rounded"
                        alt=""
                      />
                    </Link>
                  </div>
                  <div className="flex-fill">
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <h6 className="mb-0 fw-semibold">
                        <Link href={all_routes.doctorsDetails}>
                          Dr. Mick Thompson
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
                    <span className="d-block mb-2 fs-13">Cardiologist</span>
                    <p className="mb-2 fs-13">Available : Mon, 20 Jan 2025</p>
                    <div className="d-flex align-items-center justify-content-between">
                      <h6 className="text-primary fs-14 mb-0">
                        <span className="text-muted fs-13 fw-normal">
                          Starts From :
                        </span>
                        $499
                      </h6>
                      <Link
                        href={all_routes.appointmentCalendar}
                        className="avatar avatar-xs border text-muted fs-14"
                      >
                        <i className="ti ti-calendar-cog" />
                      </Link>
                    </div>
                  </div>
                </div>
                {/* end card body */}
              </div>
              {/* end card */}
            </div>
            {/* end col */}
            <div className="col-xl-4 col-md-6">
              <div className="card">
                <div className="card-body d-flex align-items-center flex-sm-nowrap flex-wrap row-gap-3">
                  <div className="me-3 doctor-profile-img">
                    <Link href={all_routes.doctorsDetails}>
                      <ImageWithBasePath
                        src="assets/img/doctors/doctor-02.jpg"
                        className="rounded"
                        alt=""
                      />
                    </Link>
                  </div>
                  <div className="flex-fill">
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <h6 className="mb-0 fw-semibold">
                        <Link href={all_routes.doctorsDetails}>
                          Dr. Sarah Johnson
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
                    <span className="d-block mb-2 fs-13">
                      Orthopedic Surgeon
                    </span>
                    <p className="mb-2 fs-13">Available : Wed, 22 Jan 2025</p>
                    <div className="d-flex align-items-center justify-content-between">
                      <h6 className="text-primary fs-14 mb-0">
                        <span className="text-muted fs-13 fw-normal">
                          Starts From :
                        </span>
                        $450
                      </h6>
                      <Link
                        href={all_routes.appointmentCalendar}
                        className="avatar avatar-xs border text-muted fs-14"
                      >
                        <i className="ti ti-calendar-cog" />
                      </Link>
                    </div>
                  </div>
                </div>
                {/* end card body */}
              </div>
              {/* end card */}
            </div>
            {/* end col */}
            <div className="col-xl-4 col-md-6">
              <div className="card">
                <div className="card-body d-flex align-items-center flex-sm-nowrap flex-wrap row-gap-3">
                  <div className="me-3 doctor-profile-img">
                    <Link href={all_routes.doctorsDetails}>
                      <ImageWithBasePath
                        src="assets/img/doctors/doctor-03.jpg"
                        className="rounded"
                        alt=""
                      />
                    </Link>
                  </div>
                  <div className="flex-fill">
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <h6 className="mb-0 fw-semibold">
                        <Link href={all_routes.doctorsDetails}>
                          Dr. Emily Carter
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
                    <span className="d-block mb-2 fs-13">Pediatrician</span>
                    <p className="mb-2 fs-13">Available : Fri, 24 Jan 2025</p>
                    <div className="d-flex align-items-center justify-content-between">
                      <h6 className="text-primary fs-14 mb-0">
                        <span className="text-muted fs-13 fw-normal">
                          Starts From :
                        </span>
                        $300
                      </h6>
                      <Link
                        href={all_routes.appointmentCalendar}
                        className="avatar avatar-xs border text-muted fs-14"
                      >
                        <i className="ti ti-calendar-cog" />
                      </Link>
                    </div>
                  </div>
                </div>
                {/* end card body */}
              </div>
              {/* end card */}
            </div>
            {/* end col */}
            <div className="col-xl-4 col-md-6">
              <div className="card">
                <div className="card-body d-flex align-items-center flex-sm-nowrap flex-wrap row-gap-3">
                  <div className="me-3 doctor-profile-img">
                    <Link href={all_routes.doctorsDetails}>
                      <ImageWithBasePath
                        src="assets/img/doctors/doctor-04.jpg"
                        className="rounded"
                        alt=""
                      />
                    </Link>
                  </div>
                  <div className="flex-fill">
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <h6 className="mb-0 fw-semibold">
                        <Link href={all_routes.doctorsDetails}>Dr. David Lee</Link>
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
                    <span className="d-block mb-2 fs-13">Gynecologist</span>
                    <p className="mb-2 fs-13">Available : Tue, 21 Jan 2025</p>
                    <div className="d-flex align-items-center justify-content-between">
                      <h6 className="text-primary fs-14 mb-0">
                        <span className="text-muted fs-13 fw-normal">
                          Starts From :
                        </span>
                        $250
                      </h6>
                      <Link
                        href={all_routes.appointmentCalendar}
                        className="avatar avatar-xs border text-muted fs-14"
                      >
                        <i className="ti ti-calendar-cog" />
                      </Link>
                    </div>
                  </div>
                </div>
                {/* end card body */}
              </div>
              {/* end card */}
            </div>
            {/* end col */}
            <div className="col-xl-4 col-md-6">
              <div className="card">
                <div className="card-body d-flex align-items-center flex-sm-nowrap flex-wrap row-gap-3">
                  <div className="me-3 doctor-profile-img">
                    <Link href={all_routes.doctorsDetails}>
                      <ImageWithBasePath
                        src="assets/img/doctors/doctor-05.jpg"
                        className="rounded"
                        alt=""
                      />
                    </Link>
                  </div>
                  <div className="flex-fill">
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <h6 className="mb-0 fw-semibold">
                        <Link href={all_routes.doctorsDetails}>Dr. Anna Kim</Link>
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
                    <span className="d-block mb-2 fs-13">Psychiatrist</span>
                    <p className="mb-2 fs-13">Available : Mon, 27 Jan 2025</p>
                    <div className="d-flex align-items-center justify-content-between">
                      <h6 className="text-primary fs-14 mb-0">
                        <span className="text-muted fs-13 fw-normal">
                          Starts From :
                        </span>
                        $350
                      </h6>
                      <Link
                        href={all_routes.appointmentCalendar}
                        className="avatar avatar-xs border text-muted fs-14"
                      >
                        <i className="ti ti-calendar-cog" />
                      </Link>
                    </div>
                  </div>
                </div>
                {/* end card body */}
              </div>
              {/* end card */}
            </div>
            {/* end col */}
            <div className="col-xl-4 col-md-6">
              <div className="card">
                <div className="card-body d-flex align-items-center flex-sm-nowrap flex-wrap row-gap-3">
                  <div className="me-3 doctor-profile-img">
                    <Link href={all_routes.doctorsDetails}>
                      <ImageWithBasePath
                        src="assets/img/doctors/doctor-06.jpg"
                        className="rounded"
                        alt=""
                      />
                    </Link>
                  </div>
                  <div className="flex-fill">
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <h6 className="mb-0 fw-semibold">
                        <Link href={all_routes.doctorsDetails}>
                          Dr. John Smith
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
                    <span className="d-block mb-2 fs-13">Neurosurgeon</span>
                    <p className="mb-2 fs-13">Available : Thu, Jan 30, 2025</p>
                    <div className="d-flex align-items-center justify-content-between">
                      <h6 className="text-primary fs-14 mb-0">
                        <span className="text-muted fs-13 fw-normal">
                          Starts From :
                        </span>
                        $499
                      </h6>
                      <Link
                        href={all_routes.appointmentCalendar}
                        className="avatar avatar-xs border text-muted fs-14"
                      >
                        <i className="ti ti-calendar-cog" />
                      </Link>
                    </div>
                  </div>
                </div>
                {/* end card body */}
              </div>
              {/* end card */}
            </div>
            {/* end col */}
            <div className="col-xl-4 col-md-6">
              <div className="card">
                <div className="card-body d-flex align-items-center flex-sm-nowrap flex-wrap row-gap-3">
                  <div className="me-3 doctor-profile-img">
                    <Link href={all_routes.doctorsDetails}>
                      <ImageWithBasePath
                        src="assets/img/doctors/doctor-07.jpg"
                        className="rounded"
                        alt=""
                      />
                    </Link>
                  </div>
                  <div className="flex-fill">
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <h6 className="mb-0 fw-semibold">
                        <Link href={all_routes.doctorsDetails}>
                          Dr. Lisa White
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
                    <span className="d-block mb-2 fs-13">Oncologist</span>
                    <p className="mb-2 fs-13">Available : Sat, 25 Jan 2025</p>
                    <div className="d-flex align-items-center justify-content-between">
                      <h6 className="text-primary fs-14 mb-0">
                        <span className="text-muted fs-13 fw-normal">
                          Starts From :
                        </span>
                        $200
                      </h6>
                      <Link
                        href={all_routes.appointmentCalendar}
                        className="avatar avatar-xs border text-muted fs-14"
                      >
                        <i className="ti ti-calendar-cog" />
                      </Link>
                    </div>
                  </div>
                </div>
                {/* end card body */}
              </div>
              {/* end card */}
            </div>
            {/* end col */}
            <div className="col-xl-4 col-md-6">
              <div className="card">
                <div className="card-body d-flex align-items-center flex-sm-nowrap flex-wrap row-gap-3">
                  <div className="me-3 doctor-profile-img">
                    <Link href={all_routes.doctorsDetails}>
                      <ImageWithBasePath
                        src="assets/img/doctors/doctor-08.jpg"
                        className="rounded"
                        alt=""
                      />
                    </Link>
                  </div>
                  <div className="flex-fill">
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <h6 className="mb-0 fw-semibold">
                        <Link href={all_routes.doctorsDetails}>
                          Dr. Patricia Brown
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
                    <span className="d-block mb-2 fs-13">Pulmonologist</span>
                    <p className="mb-2 fs-13">Available : Sun, 01 Feb 2025</p>
                    <div className="d-flex align-items-center justify-content-between">
                      <h6 className="text-primary fs-14 mb-0">
                        <span className="text-muted fs-13 fw-normal">
                          Starts From :
                        </span>
                        $450
                      </h6>
                      <Link
                        href={all_routes.appointmentCalendar}
                        className="avatar avatar-xs border text-muted fs-14"
                      >
                        <i className="ti ti-calendar-cog" />
                      </Link>
                    </div>
                  </div>
                </div>
                {/* end card body */}
              </div>
              {/* end card */}
            </div>
            {/* end col */}
            <div className="col-xl-4 col-md-6">
              <div className="card">
                <div className="card-body d-flex align-items-center flex-sm-nowrap flex-wrap row-gap-3">
                  <div className="me-3 doctor-profile-img">
                    <Link href={all_routes.doctorsDetails}>
                      <ImageWithBasePath
                        src="assets/img/doctors/doctor-09.jpg"
                        className="rounded"
                        alt=""
                      />
                    </Link>
                  </div>
                  <div className="flex-fill">
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <h6 className="mb-0 fw-semibold">
                        <Link href={all_routes.doctorsDetails}>
                          Dr. Rachel Green
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
                    <span className="d-block mb-2 fs-13">Urologist</span>
                    <p className="mb-2 fs-13">Available : Tue, 28 Jan 2025</p>
                    <div className="d-flex align-items-center justify-content-between">
                      <h6 className="text-primary fs-14 mb-0">
                        <span className="text-muted fs-13 fw-normal">
                          Starts From :
                        </span>
                        $400
                      </h6>
                      <Link
                        href={all_routes.appointmentCalendar}
                        className="avatar avatar-xs border text-muted fs-14"
                      >
                        <i className="ti ti-calendar-cog" />
                      </Link>
                    </div>
                  </div>
                </div>
                {/* end card body */}
              </div>
              {/* end card */}
            </div>
            {/* end col */}
            <div className="col-xl-4 col-md-6">
              <div className="card">
                <div className="card-body d-flex align-items-center flex-sm-nowrap flex-wrap row-gap-3">
                  <div className="me-3 doctor-profile-img">
                    <Link href={all_routes.doctorsDetails}>
                      <ImageWithBasePath
                        src="assets/img/doctors/doctor-10.jpg"
                        className="rounded"
                        alt=""
                      />
                    </Link>
                  </div>
                  <div className="flex-fill">
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <h6 className="mb-0 fw-semibold">
                        <Link href={all_routes.doctorsDetails}>
                          Dr. Michael Smith
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
                    <span className="d-block mb-2 fs-13">Cardiologist</span>
                    <p className="mb-2 fs-13">Available : Thu, 05 Feb 2025</p>
                    <div className="d-flex align-items-center justify-content-between">
                      <h6 className="text-primary fs-14 mb-0">
                        <span className="text-muted fs-13 fw-normal">
                          Starts From :
                        </span>
                        $300
                      </h6>
                      <Link
                        href={all_routes.appointmentCalendar}
                        className="avatar avatar-xs border text-muted fs-14"
                      >
                        <i className="ti ti-calendar-cog" />
                      </Link>
                    </div>
                  </div>
                </div>
                {/* end card body */}
              </div>
              {/* end card */}
            </div>
            {/* end col */}
            <div className="col-xl-4 col-md-6">
              <div className="card">
                <div className="card-body d-flex align-items-center flex-sm-nowrap flex-wrap row-gap-3">
                  <div className="me-3 doctor-profile-img">
                    <Link href={all_routes.doctorsDetails}>
                      <ImageWithBasePath
                        src="assets/img/doctors/doctor-11.jpg"
                        className="rounded"
                        alt=""
                      />
                    </Link>
                  </div>
                  <div className="flex-fill">
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <h6 className="mb-0 fw-semibold">
                        <Link href={all_routes.doctorsDetails}>
                          Dr. Sarah Johnson
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
                    <span className="d-block mb-2 fs-13">Surgeon</span>
                    <p className="mb-2 fs-13">Available : Mon, 09 Feb 2025</p>
                    <div className="d-flex align-items-center justify-content-between">
                      <h6 className="text-primary fs-14 mb-0">
                        <span className="text-muted fs-13 fw-normal">
                          Starts From :
                        </span>
                        $500
                      </h6>
                      <Link
                        href={all_routes.appointmentCalendar}
                        className="avatar avatar-xs border text-muted fs-14"
                      >
                        <i className="ti ti-calendar-cog" />
                      </Link>
                    </div>
                  </div>
                </div>
                {/* end card body */}
              </div>
              {/* end card */}
            </div>
            {/* end col */}
            <div className="col-xl-4 col-md-6">
              <div className="card">
                <div className="card-body d-flex align-items-center flex-sm-nowrap flex-wrap row-gap-3">
                  <div className="me-3 doctor-profile-img">
                    <Link href={all_routes.doctorsDetails}>
                      <ImageWithBasePath
                        src="assets/img/doctors/doctor-12.jpg"
                        className="rounded"
                        alt=""
                      />
                    </Link>
                  </div>
                  <div className="flex-fill">
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <h6 className="mb-0 fw-semibold">
                        <Link href={all_routes.doctorsDetails}>
                          Dr. Adrian White
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
                    <span className="d-block mb-2 fs-13">Practitioner</span>
                    <p className="mb-2 fs-13">Available : Sat, 25 Jan 2025</p>
                    <div className="d-flex align-items-center justify-content-between">
                      <h6 className="text-primary fs-14 mb-0">
                        <span className="text-muted fs-13 fw-normal">
                          Starts From :
                        </span>
                        $200
                      </h6>
                      <Link
                        href={all_routes.appointmentCalendar}
                        className="avatar avatar-xs border text-muted fs-14"
                      >
                        <i className="ti ti-calendar-cog" />
                      </Link>
                    </div>
                  </div>
                </div>
                {/* end card body */}
              </div>
              {/* end card */}
            </div>
            {/* end col */}
            <div className="col-xl-4 col-md-6">
              <div className="card">
                <div className="card-body d-flex align-items-center flex-sm-nowrap flex-wrap row-gap-3">
                  <div className="me-3 doctor-profile-img">
                    <Link href={all_routes.doctorsDetails}>
                      <ImageWithBasePath
                        src="assets/img/doctors/doctor-13.jpg"
                        className="rounded"
                        alt=""
                      />
                    </Link>
                  </div>
                  <div className="flex-fill">
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <h6 className="mb-0 fw-semibold">
                        <Link href={all_routes.doctorsDetails}>Dr. Ken Clark</Link>
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
                    <span className="d-block mb-2 fs-13">Dermatologist</span>
                    <p className="mb-2 fs-13">Available : Wed, 12 Feb 2025</p>
                    <div className="d-flex align-items-center justify-content-between">
                      <h6 className="text-primary fs-14 mb-0">
                        <span className="text-muted fs-13 fw-normal">
                          Starts From :
                        </span>
                        $350
                      </h6>
                      <Link
                        href={all_routes.appointmentCalendar}
                        className="avatar avatar-xs border text-muted fs-14"
                      >
                        <i className="ti ti-calendar-cog" />
                      </Link>
                    </div>
                  </div>
                </div>
                {/* end card body */}
              </div>
              {/* end card */}
            </div>
            {/* end col */}
            <div className="col-xl-4 col-md-6">
              <div className="card">
                <div className="card-body d-flex align-items-center flex-sm-nowrap flex-wrap row-gap-3">
                  <div className="me-3 doctor-profile-img">
                    <Link href={all_routes.doctorsDetails}>
                      <ImageWithBasePath
                        src="assets/img/doctors/doctor-14.jpg"
                        className="rounded"
                        alt=""
                      />
                    </Link>
                  </div>
                  <div className="flex-fill">
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <h6 className="mb-0 fw-semibold">
                        <Link href={all_routes.doctorsDetails}>
                          Dr. Oliver King
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
                    <span className="d-block mb-2 fs-13">Orthopedist</span>
                    <p className="mb-2 fs-13">Available : Fri, 14 Feb 2025</p>
                    <div className="d-flex align-items-center justify-content-between">
                      <h6 className="text-primary fs-14 mb-0">
                        <span className="text-muted fs-13 fw-normal">
                          Starts From :
                        </span>
                        $600
                      </h6>
                      <Link
                        href={all_routes.appointmentCalendar}
                        className="avatar avatar-xs border text-muted fs-14"
                      >
                        <i className="ti ti-calendar-cog" />
                      </Link>
                    </div>
                  </div>
                </div>
                {/* end card body */}
              </div>
              {/* end card */}
            </div>
            {/* end col */}
            <div className="col-xl-4 col-md-6">
              <div className="card">
                <div className="card-body d-flex align-items-center flex-sm-nowrap flex-wrap row-gap-3">
                  <div className="me-3 doctor-profile-img">
                    <Link href={all_routes.doctorsDetails}>
                      <ImageWithBasePath
                        src="assets/img/doctors/doctor-15.jpg"
                        className="rounded"
                        alt=""
                      />
                    </Link>
                  </div>
                  <div className="flex-fill">
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <h6 className="mb-0 fw-semibold">
                        <Link href={all_routes.doctorsDetails}>
                          Dr. Avan Davis
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
                    <span className="d-block mb-2 fs-13">Endocrinologist</span>
                    <p className="mb-2 fs-13">Available : Tue, 17 Feb 2025</p>
                    <div className="d-flex align-items-center justify-content-between">
                      <h6 className="text-primary fs-14 mb-0">
                        <span className="text-muted fs-13 fw-normal">
                          Starts From :
                        </span>
                        $375
                      </h6>
                      <Link
                        href={all_routes.appointmentCalendar}
                        className="avatar avatar-xs border text-muted fs-14"
                      >
                        <i className="ti ti-calendar-cog" />
                      </Link>
                    </div>
                  </div>
                </div>
                {/* end card body */}
              </div>
              {/* end card */}
            </div>
            {/* end col */}
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
      <Modals />
    </>
  );
};

export default DoctorsComponent;
