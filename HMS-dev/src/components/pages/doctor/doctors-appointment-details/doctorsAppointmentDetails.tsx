"use client";


import CommonSelect from "@/core/common/common-select/commonSelect";
import PredefinedDatePicker from "@/core/common/datePicker";
import EventCalendar from "@/core/common/event-calendar/eventCalendar";
import { Amount, Department, Designation, Doctor, Status } from "@/core/common/selectOption";
import { all_routes } from "@/routes/all_routes";
import { DatePicker } from "antd";
import Link from "next/link";

const DoctorsAppointmentDetailsComponent = () => {
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
          <div className="d-flex align-items-sm-center flex-sm-row flex-column gap-2 pb-3 mb-3 border-1 border-bottom">
            <div className="flex-grow-1">
              <h4 className="fw-bold mb-0"> Appointment </h4>
            </div>
            <div className="text-end d-flex">
              {/* dropdown*/}
              <div className="dropdown me-1">
                <Link
                  href="#"
                  className="btn btn-md fs-14 fw-normal border bg-white rounded text-dark d-inline-flex align-items-center"
                  data-bs-toggle="dropdown"
                >
                  Export
                  <i className="ti ti-chevron-down ms-2" />
                </Link>
                <ul className="dropdown-menu p-2">
                  <li>
                    <Link className="dropdown-item" href="#">
                      Download as PDF
                    </Link>
                  </li>
                  <li>
                    <Link className="dropdown-item" href="#">
                      Download as Excel
                    </Link>
                  </li>
                </ul>
              </div>
              <div className="bg-white border shadow-sm rounded px-1 pb-0 text-center d-flex align-items-center justify-content-center">
                <Link
                  href={all_routes.doctorsappointments}
                  className="bg-white rounded p-1 d-flex align-items-center justify-content-center"
                >
                  <i className="ti ti-list fs-14 text-dark" />
                </Link>
                <Link
                  href={all_routes.doctorsappointmentdetails}
                  className="bg-light rounded p-1 d-flex align-items-center justify-content-center"
                >
                  <i className="ti ti-calendar-event fs-14 text-body" />
                </Link>
              </div>
              <Link
                href="#"
                className="btn btn-primary ms-2 fs-13 btn-md"
                data-bs-toggle="offcanvas"
                data-bs-target="#new_appointment"
              >
                <i className="ti ti-plus me-1" /> New Appointment
              </Link>
            </div>
          </div>
          {/* End Page Header */}
          {/*  Start Filter */}
          <div className=" d-flex align-items-center justify-content-between flex-wrap row-gap-3">
            <div className="d-flex align-items-center gap-2">
              <div className="search-set mb-3">
                <div className="d-flex align-items-center flex-wrap gap-2">
                  <div className="table-search d-flex align-items-center mb-0">
                    <div className="search-input">
                      <Link href="#" className="btn-searchset" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="d-flex right-content align-items-center flex-wrap mb-3">
                <div className="input-icon-start position-relative">
                  <span className="input-icon-addon text-dark">
                    <i className="ti ti-calendar-event" />
                  </span>
                  <PredefinedDatePicker />
                </div>
              </div>
            </div>
            <div className="d-flex table-dropdown mb-3 pb-1 right-content align-items-center flex-wrap row-gap-3">
              <div className="dropdown me-2">
                <Link
                  href="#"
                  className="bg-white border rounded btn btn-md text-dark fs-14 py-1 align-items-center d-flex fw-normal"
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
                    <h4 className="mb-0 fw-bold">Filter</h4>
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
                          <label className="form-label mb-1">Doctor</label>
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
                          defaultValue={Department[0]}
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
                        className="btn btn-light btn-md me-2 fw-medium"
                        id="close-filter"
                      >
                        Close
                      </Link>
                      <button
                        type="submit"
                        className="btn btn-primary btn-md fw-medium"
                      >
                        Filter
                      </button>
                    </div>
                  </form>
                </div>
              </div>
              <div className="dropdown">
                <Link
                  href="#"
                  className="dropdown-toggle btn bg-white btn-md d-inline-flex align-items-center fw-normal rounded border text-dark px-2 py-1 fs-14"
                  data-bs-toggle="dropdown"
                >
                  <span className="me-1"> Sort By : </span> Recent
                </Link>
                <ul className="dropdown-menu  dropdown-menu-end p-2">
                  <li>
                    <Link href="#" className="dropdown-item rounded-1">
                      Recently Added
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="dropdown-item rounded-1">
                      Ascending
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="dropdown-item rounded-1">
                      Desending
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="dropdown-item rounded-1">
                      Last Month
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="dropdown-item rounded-1">
                      Last 7 Days
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          {/*  End Filter */}
          {/* Start Card */}
          <div className="card mb-0">
            <div className="card-body">
              <div id="calendar">
                <EventCalendar />
              </div>
            </div>
          </div>
          {/* end card */}
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
    </>
  );
};

export default DoctorsAppointmentDetailsComponent;
