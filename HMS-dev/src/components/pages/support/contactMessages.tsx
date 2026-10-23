"use client";

import { useState } from "react";
import Link from "next/link";
import ImageWithBasePath from "@/core/imageWithBasePath";
import { ContactMessagesData } from "@/core/json/contactMessagesData";
import Datatable from "@/core/common/dataTable";
import FilterIndex from "@/core/common/filter/filterIndex";
import SearchInput from "@/core/common/dataTable/dataTableSearch";

const ContactMessagesComponent = () => {
  const data = ContactMessagesData;
  const columns = [
    {
      title: "Name",
      dataIndex: "Name",
      render: (text: any, record: any) => (
        <div className="d-flex align-items-center">
          <Link href="#" className="avatar avatar-sm me-2">
            <ImageWithBasePath
              src={`assets/img/users/${record.Image}`}
              alt="product"
              className="rounded-circle"
            />
          </Link>
          <Link href="#" className="fw-medium">
            {text}
          </Link>
        </div>
      ),
      sorter: (a: any, b: any) => a.Name.length - b.Name.length,
    },
    {
      title: "Phone",
      dataIndex: "Phone",
      sorter: (a: any, b: any) => a.Phone.length - b.Phone.length,
    },
    {
      title: "Message",
      dataIndex: "Message",
      sorter: (a: any, b: any) => a.Message.length - b.Message.length,
    },
    {
      title: "Created On",
      dataIndex: "CreatedOn",
      sorter: (a: any, b: any) => a.CreatedOn.length - b.CreatedOn.length,
    },
    {
      title: "",
      render: () => (
        <div className="action-item">
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
                data-bs-target="#edit_contact"
              >
                Edit
              </Link>
            </li>
            <li>
              <Link
                href="#"
                className="dropdown-item d-flex align-items-center"
                data-bs-toggle="modal"
                data-bs-target="#delete_contact"
              >
                Delete
              </Link>
            </li>
          </ul>
        </div>
      ),
    },
  ];
  const [searchText, setSearchText] = useState<string>("");

  const handleSearch = (value: string) => {
    setSearchText(value);
  };
  return (
    <>
      {/* ========================
			Start Page Content
		========================= */}
      <div className="page-wrapper">
        {/* Start Content */}
        <div className="content">
          {/* Page Header */}
          <div className="d-flex align-items-center pb-3 mb-3 border-bottom">
            <div className="d-flex align-items-center">
              <h4 className="fw-bold mb-0 me-2">Contact Message</h4>
              <span className="badge badge-soft-primary border pt-1 px-2 border-primary fw-medium">
                Total Contact Message : 565
              </span>
            </div>
          </div>
          {/* End Page Header */}
          <div className=" d-flex align-items-center justify-content-between flex-wrap row-gap-3">
            <div className="search-set mb-3">
              <div className="d-flex align-items-center flex-wrap gap-2">
                <div className="table-search d-flex align-items-center mb-0">
                  <div className="search-input">
                    <SearchInput value={searchText} onChange={handleSearch} />
                  </div>
                </div>
              </div>
            </div>
            <div className="d-flex table-dropdown mb-3 pb-1 right-content align-items-center flex-wrap row-gap-3">
              <div className="dropdown me-2">
                <Link
                  href="#"
                  className="dropdown-toggle btn bg-white btn-md d-inline-flex align-items-center fw-normal rounded border text-dark px-2 py-1 fs-14"
                  data-bs-toggle="dropdown"
                  data-bs-auto-close="false"
                >
                  <i className="ti ti-filter me-2 fs-14" />
                  Filter
                </Link>
                <div
                  className="dropdown-menu dropdown-lg dropdown-menu-end filter-dropdown"
                  id="filter-dropdown"
                >
                  <div className="d-flex align-items-center justify-content-between border-bottom filter-header">
                    <h4 className="fs-18 fw-bold">Filter</h4>
                    <div className="d-flex align-items-center">
                      <Link
                        href="#"
                        className="link-danger text-decoration-underline me-3"
                      >
                        Clear All
                      </Link>
                    </div>
                  </div>
                  <FilterIndex />
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
                <ul className="dropdown-menu dropdown-menu-end p-2">
                  <li>
                    <Link href="#" className="dropdown-item rounded-1">
                      Recent
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="dropdown-item rounded-1">
                      Oldest
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div className="table-responsive">
            <Datatable
              columns={columns}
              dataSource={data}
              Selection={false}
              searchText={searchText}
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

<>
  {/* Start Edit Contact */}
  <div id="edit_contact" className="modal fade">
    <div className="modal-dialog modal-dialog-centered">
      <div className="modal-content">
        <div className="modal-header">
          <h5 className="text-dark modal-title">Edit New Country</h5>
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
            {/* start row */}
            <div className="row">
              <div className="col-lg-12">
                <div className="mb-2">
                  <label className="form-label">
                    Name<span className="text-danger ms-1">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    defaultValue="John Carter"
                  />
                </div>
              </div>
              {/* end col */}
              <div className="col-lg-6">
                <div className="mb-2">
                  <label className="form-label">
                    Email Address<span className="text-danger ms-1">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    defaultValue="john@example.com"
                  />
                </div>
              </div>
              {/* end col */}
              <div className="col-lg-6">
                <div className="mb-2">
                  <label className="form-label">
                    Phone Number<span className="text-danger ms-1">*</span>
                  </label>
                  <input type="text" className="form-control" id="phone" />
                </div>
              </div>
              {/* end col */}
              <div className="col-lg-12">
                <div className="mb-2">
                  <label className="form-label">Message</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    defaultValue={
                      "Unable to log into my account. Can you assist?"
                    }
                  />
                </div>
              </div>
              {/* end col */}
            </div>
            {/* end row */}
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
  {/* End Edit Contact */}
  {/* Start Delete Modal  */}
  <div className="modal fade" id="delete_contact">
    <div className="modal-dialog modal-dialog-centered modal-sm">
      <div className="modal-content">
        <div className="modal-body text-center position-relative">
          <img
            src="assets/img/bg/delete-modal-bg-01.png"
            alt=""
            className="img-fluid position-absolute top-0 start-0"
          />
          <img
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
            <a
              href="javascript:void(0);"
              className="btn btn-light position-relative z-1 me-3"
              data-bs-dismiss="modal"
            >
              Cancel
            </a>
            <a
              href="javascript:void(0);"
              className="btn btn-danger position-relative z-1"
              data-bs-dismiss="modal"
            >
              Yes, Delete
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
  {/* End Delete Modal  */}
</>

    </>
  );
};

export default ContactMessagesComponent;
