"use client";

import SettingsSidebar from "@/core/common/settings-sidebar/settingsSidebar"
import { Input_Type, Module } from "@/core/common/selectOption";
import CommonSelect from "@/core/common/common-select/commonSelect";
import ImageWithBasePath from "@/core/imageWithBasePath";
import Link from "next/link";

const CustomFieldsSettingsComponent = () => {
  return (
    <>
      {/* ========================
			Start Page Content
		========================= */}
      <div className="page-wrapper">
        {/* Start Content */}
        <div className="content">
          {/* Page Header */}
          <div className="mb-3 border-bottom pb-3">
            <h4 className="fw-bold mb-0">Settings</h4>
          </div>
          {/* End Page Header */}
          <div className="card">
            <div className="card-body p-0">
              <div className="settings-wrapper d-flex">
                {/* Start Settings Sidebar */}
                <SettingsSidebar/>
                {/* End Settings Sidebar */}
                <div className="card flex-fill mb-0 border-0 bg-light-500 shadow-none">
                  <div className="card-header border-bottom px-0 mx-3">
                    <div className="d-flex align-items-center justify-content-between">
                      <h5 className="fw-bold">Custom Field</h5>
                      <Link
                        href="#"
                        className="btn btn-primary"
                        data-bs-toggle="modal"
                        data-bs-target="#add_reason"
                      >
                        <i className="ti ti-plus me-1" />
                        New Custom Field
                      </Link>
                    </div>
                  </div>
                  <div className="card-body px-0 mx-3">
                    {/* Table List */}
                    <div className="table-responsive border">
                      <table className="table table-nowrap">
                        <thead className="tablehead-light">
                          <tr>
                            <th>Module</th>
                            <th>Label</th>
                            <th>Type</th>
                            <th>Default Value</th>
                            <th>Required</th>
                            <th>Status</th>
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>Patient</td>
                            <td>Preferred Language</td>
                            <td>Select</td>
                            <td>English</td>
                            <td>
                              <div className="form-check form-switch ps-0">
                                <input
                                  className="form-check-input m-0"
                                  type="checkbox"
                                  defaultChecked
                                />
                              </div>
                            </td>
                            <td>
                              <span className="badge bg-soft-success fs-13 fw-medium text-success d-inline-flex align-items-center">
                                <i className="ti ti-point-filled" />
                                Active
                              </span>
                            </td>
                            <td className="action-item">
                              <Link
                                href="#"
                                data-bs-toggle="dropdown"
                                className="btn p-1 btn-white border"
                              >
                                <i className="ti ti-dots-vertical" />
                              </Link>
                              <ul className="dropdown-menu p-2">
                                <li>
                                  <Link
                                    href="#"
                                    className="dropdown-item d-flex align-items-center"
                                    data-bs-toggle="modal"
                                    data-bs-target="#edit_reason"
                                  >
                                    Edit
                                  </Link>
                                </li>
                                <li>
                                  <Link
                                    href="#"
                                    className="dropdown-item d-flex align-items-center"
                                    data-bs-toggle="modal"
                                    data-bs-target="#delete_reason"
                                  >
                                    Delete
                                  </Link>
                                </li>
                              </ul>
                            </td>
                          </tr>
                          <tr>
                            <td>Staff</td>
                            <td>Job Type</td>
                            <td>Text</td>
                            <td>Full Time</td>
                            <td>
                              <div className="form-check form-switch ps-0">
                                <input
                                  className="form-check-input m-0"
                                  type="checkbox"
                                  defaultChecked
                                />
                              </div>
                            </td>
                            <td>
                              <span className="badge bg-soft-success fs-13 fw-medium text-success d-inline-flex align-items-center">
                                <i className="ti ti-point-filled" />
                                Active
                              </span>
                            </td>
                            <td className="action-item">
                              <Link
                                href="#"
                                data-bs-toggle="dropdown"
                                className="btn p-1 btn-white border"
                              >
                                <i className="ti ti-dots-vertical" />
                              </Link>
                              <ul className="dropdown-menu p-2">
                                <li>
                                  <Link
                                    href="#"
                                    className="dropdown-item d-flex align-items-center"
                                    data-bs-toggle="modal"
                                    data-bs-target="#edit_reason"
                                  >
                                    Edit
                                  </Link>
                                </li>
                                <li>
                                  <Link
                                    href="#"
                                    className="dropdown-item d-flex align-items-center"
                                    data-bs-toggle="modal"
                                    data-bs-target="#delete_reason"
                                  >
                                    Delete
                                  </Link>
                                </li>
                              </ul>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    {/* /Table List */}
                  </div>
                </div>
              </div>
            </div>
            {/* end card body */}
          </div>
          {/* end card */}
        </div>
        {/* End Content */}
        {/* Footer Start */}
        <div className="footer text-center bg-white p-2 border-top">
          <p className="text-dark mb-0">
            2025 ©{" "}
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
      {/* Start Add Categories */}
      <div id="add_reason" className="modal fade">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="text-dark modal-title fw-bold">
                Add Custom Field
              </h5>
              <button
                type="button"
                className="btn-close btn-close-modal custom-btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
              >
                <i className="ti ti-x" />
              </button>
            </div>
            <form>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">
                    Module<span className="text-danger ms-1">*</span>
                  </label>
                  <CommonSelect
                    options={Module}
                    className="select"
                    defaultValue={Module[0]}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">
                    Input Type<span className="text-danger ms-1">*</span>
                  </label>
                  <CommonSelect
                    options={Input_Type}
                    className="select"
                    defaultValue={Input_Type[0]}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">
                    Label<span className="text-danger ms-1">*</span>
                  </label>
                  <input type="text" className="form-control" />
                </div>
                <div className="mb-3">
                  <label className="form-label">
                    Default Value<span className="text-danger ms-1">*</span>
                  </label>
                  <input type="text" className="form-control" />
                </div>
                <div className="mb-0">
                  <div className="d-flex align-items-center justify-content-between">
                    <label className="form-label">Required</label>
                    <div className="form-check form-switch ps-0">
                      <input
                        className="form-check-input m-0"
                        type="checkbox"
                        defaultChecked
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer d-flex align-items-center gap-1">
                <button
                  type="button"
                  className="btn btn-white border"
                  data-bs-dismiss="modal"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Add Custom Field
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      {/* End Add Categories */}
      {/* Start Edit Categories */}
      <div id="edit_reason" className="modal fade">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="text-dark modal-title fw-bold">
                Edit Custom Field
              </h5>
              <button
                type="button"
                className="btn-close btn-close-modal custom-btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
              >
                <i className="ti ti-x" />
              </button>
            </div>
            <form>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">
                    Module<span className="text-danger ms-1">*</span>
                  </label>
                  <CommonSelect
                    options={Module}
                    className="select"
                    defaultValue={Module[1]}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">
                    Input Type<span className="text-danger ms-1">*</span>
                  </label>
                  <CommonSelect
                    options={Input_Type}
                    className="select"
                    defaultValue={Input_Type[1]}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">
                    Label<span className="text-danger ms-1">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    defaultValue="Preferred Language"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">
                    Default Value<span className="text-danger ms-1">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    defaultValue="English"
                  />
                </div>
                <div className="mb-3">
                  <div className="d-flex align-items-center justify-content-between">
                    <label className="form-label">Required</label>
                    <div className="form-check form-switch ps-0">
                      <input
                        className="form-check-input m-0"
                        type="checkbox"
                        defaultChecked
                      />
                    </div>
                  </div>
                </div>
                <div className="mb-0">
                  <div className="d-flex align-items-center justify-content-between">
                    <label className="form-label">Status</label>
                    <div className="form-check form-switch ps-0">
                      <input
                        className="form-check-input m-0"
                        type="checkbox"
                        defaultChecked
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer d-flex align-items-center gap-1">
                <button
                  type="button"
                  className="btn btn-white border"
                  data-bs-dismiss="modal"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      {/* End Edit Categories */}
      {/* Start Delete Modal  */}
      <div className="modal fade" id="delete_reason">
        <div className="modal-dialog modal-dialog-centered modal-sm">
          <div className="modal-content">
            <div className="modal-body text-center position-relative">
              <ImageWithBasePath
                src="assets/img/bg/delete-modal-bg-01.png"
                alt=""
                className="img-fluid position-absolute top-0 start-0"
              />
              <ImageWithBasePath
                src="assets/img/bg/delete-modal-bg-02.png"
                alt=""
                className="img-fluid position-absolute bottom-0 end-0"
              />
              <div className="mb-3">
                <span className="avatar avatar-lg bg-danger text-white">
                  <i className="ti ti-trash fs-24" />
                </span>
              </div>
              <h5 className="fw-bold mb-1">Delete Confirmation</h5>
              <p className="mb-3">Are you sure want to delete?</p>
              <div className="d-flex justify-content-center">
                <Link
                  href="#"
                  className="btn btn-light position-relative z-1 me-3"
                  data-bs-dismiss="modal"
                >
                  Cancel
                </Link>
                <Link
                  href="#"
                  className="btn btn-danger position-relative z-1"
                >
                  Yes, Delete
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* End Delete Modal  */}
    </>
  );
};

export default CustomFieldsSettingsComponent;
