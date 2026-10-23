"use client";

import { RoleandPermissionData } from "@/core/json/roleandPermissionData";
import Datatable from "@/core/common/dataTable";
import { all_routes } from "../../../../../routes/all_routes";
import Link from "next/link";
import CommonSelect from "@/core/common/common-select/commonSelect";
import { StatusActive } from "@/core/common/selectOption";
import ImageWithBasePath from "@/core/imageWithBasePath";

const RolesAndPermissionsComponent = () => {
  const data = RoleandPermissionData;
  const columns = [
    {
      title: "Role",
      dataIndex: "Role",
      sorter: (a: any, b: any) => a.Role.length - b.Role.length,
    },
    {
      title: "Created On",
      dataIndex: "Created_On",
      sorter: (a: any, b: any) => a.Created_On.length - b.Created_On.length,
    },
    {
      title: "Status",
      dataIndex: "Status",
      render: (text: string) => (
        <span
          className={`badge ${
            text === "Active" ? "badge-soft-success" : "badge-soft-danger"
          }  border ${
            text === "Active" ? "border-success" : "border-danger"
          } border-success px-2 py-1 fs-13 fw-medium`}
        >
          {text}
        </span>
      ),
    },
    {
      title: "",
      render: () => (
        <Link
          href={all_routes.permissions}
          className="btn btn-white border text-dark"
        >
          <i className="ti ti-shield-half me-1" />
          Permissions
        </Link>
      ),
    },
    {
      title: "",
      render: () => (
        <div className="action-item">
          <Link href="#" data-bs-toggle="dropdown">
            <i className="ti ti-dots-vertical" />
          </Link>
          <ul className="dropdown-menu p-2">
            <li>
              <Link
                href="#"
                className="dropdown-item d-flex align-items-center"
                data-bs-toggle="modal"
                data-bs-target="#edit_role"
              >
                Edit
              </Link>
            </li>
            <li>
              <Link
                href="#"
                className="dropdown-item d-flex align-items-center"
                data-bs-toggle="modal"
                data-bs-target="#delete_role"
              >
                Delete
              </Link>
            </li>
          </ul>
        </div>
      ),
      sorter: (a: any, b: any) => a.Status.length - b.Status.length,
    },
  ];

  return (
    <>
      {/* ========================
			Start Page Content
		========================= */}
      <div className="page-wrapper">
        {/* Start Content */}
        <div className="content">
          {/* Start Page Header */}
          <div className="d-flex align-items-sm-center flex-sm-row flex-column gap-2 mb-3 pb-3 border-bottom">
            <div className="flex-grow-1">
              <h4 className="fw-bold mb-0">Roles</h4>
            </div>
            <div className="text-end d-flex">
              <Link
                href="#"
                className="btn btn-primary ms-2 fs-13 btn-md"
                data-bs-toggle="modal"
                data-bs-target="#add_role"
              >
                <i className="ti ti-plus me-1" />
                New Role
              </Link>
            </div>
          </div>
          {/* End Page Header */}
          <div className="table-responsive">
            <Datatable
              columns={columns}
              dataSource={data}
              Selection={false}
              searchText={""}
            />
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

      {/* Start Add Modal */}
      <div id="add_role" className="modal fade">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="text-dark modal-title fw-bold">New Role</h4>
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
                <div className="mb-0">
                  <label className="form-label">
                    Role<span className="text-danger ms-1">*</span>
                  </label>
                  <input type="text" className="form-control" />
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
                  Add New Role
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      {/* End Add Modal */}
      {/* Start Add Modal */}
      <div id="edit_role" className="modal fade">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="text-dark modal-title fw-bold">Edit Role</h4>
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
                    Role<span className="text-danger ms-1">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    defaultValue="Doctor"
                  />
                </div>
                <div className="mb-0">
                  <label className="form-label">
                    Status<span className="text-danger ms-1">*</span>
                  </label>
                  <CommonSelect
                    options={StatusActive}
                    className="select"
                    defaultValue={StatusActive[1]}
                  />
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
      {/* End Add Modal */}
      {/* Start Delete Modal  */}
      <div className="modal fade" id="delete_role">
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
                <span className="avatar avatar-lg bg-danger text-white">
                  <i className="ti ti-trash fs-24" />
                </span>
              </div>
              <h5 className="fw-bold mb-1">Delete Confirmation</h5>
              <p className="mb-3">Are you sure want to delete?</p>
              <div className="d-flex justify-content-center">
                <Link
                  href="javascript:void(0);"
                  className="btn btn-light position-relative z-1 me-3"
                  data-bs-dismiss="modal"
                >
                  Cancel
                </Link>
                <Link
                  href={all_routes.rolesPermissions}
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

export default RolesAndPermissionsComponent;
