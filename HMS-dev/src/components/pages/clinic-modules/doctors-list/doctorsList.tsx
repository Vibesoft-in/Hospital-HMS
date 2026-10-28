"use client";

import { DatePicker, Pagination } from "antd";
import { Department, Status } from "@/core/common/selectOption";
import type { Option } from "@/core/common/common-select/commonSelect";
import { all_routes } from "../../../../routes/all_routes";
import { useState, useEffect, useCallback } from "react";
import SearchInput from "@/core/common/dataTable/dataTableSearch";
import Datatable from "@/core/common/dataTable";
import Modals from "../doctors/modals/modals";
import Link from "next/link";
import CommonSelect from "@/core/common/common-select/commonSelect";
import axios from "axios";
import { API_BASE_URL } from "@/environment";
import dayjs from "dayjs";
import { closeFilterDropdown } from "@/core/common/filter/filterDropdownUtils";
import { useFilterDropdownSync } from "@/core/common/filter/useFilterDropdownSync";
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
  createdAt?: string;
  visitTypes: Array<{
    type: string;
    charge: number;
  }>;
}

const STATUS_OPTIONS: Option[] = [
  { value: "", label: "All" },
  ...Status.map((s) => ({ value: s.value, label: s.label })),
];
const DEPARTMENT_OPTIONS: Option[] = [
  { value: "", label: "All" },
  ...Department.filter((d) => d.value).map((d) => ({ value: d.value, label: d.label })),
];

const DoctorsListComponent = () => {
  const [doctors, setDoctors] = useState<IDoctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [searchText, setSearchText] = useState<string>("");

  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterDate, setFilterDate] = useState<dayjs.Dayjs | null>(null);
  const [filterDepartment, setFilterDepartment] = useState<string>("");
  const [appliedStatus, setAppliedStatus] = useState<string>("");
  const [appliedDate, setAppliedDate] = useState<string | null>(null);
  const [appliedDepartment, setAppliedDepartment] = useState<string>("");

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const syncFiltersFromApplied = useCallback(() => {
    setFilterStatus(appliedStatus);
    setFilterDepartment(appliedDepartment);
    setFilterDate(appliedDate ? dayjs(appliedDate) : null);
  }, [appliedStatus, appliedDepartment, appliedDate]);

  useFilterDropdownSync("filter-dropdown", syncFiltersFromApplied);

  const handleApplyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setAppliedStatus(filterStatus);
    setAppliedDepartment(filterDepartment);
    setAppliedDate(filterDate ? filterDate.format("YYYY-MM-DD") : null);
    closeFilterDropdown("filter-dropdown");
  };

  const handleClearFilter = () => {
    setPage(1);
    setFilterStatus("");
    setFilterDate(null);
    setFilterDepartment("");
    setAppliedStatus("");
    setAppliedDate(null);
    setAppliedDepartment("");
    closeFilterDropdown("filter-dropdown");
  };

  useEffect(() => {
    fetchDoctors();
  }, [appliedDepartment, appliedStatus, appliedDate, page, limit, searchText]);

  useEffect(() => {
    const handleDoctorUpdated = () => {
      fetchDoctors();
    };
    window.addEventListener("doctor-updated", handleDoctorUpdated);
    return () => {
      window.removeEventListener("doctor-updated", handleDoctorUpdated);
    };
  }, []);

  const fetchDoctors = async (retryCount = 0) => {
    try {
      setLoading(true);
      const params: Record<string, string | number> = { page, limit };
      if (appliedDepartment) params.department = appliedDepartment;
      if (appliedStatus) params.status = appliedStatus.toLowerCase();
      if (appliedDate) params.date = appliedDate;
      if (searchText.trim()) params.search = searchText.trim();

      const response = await axios.get(`${API_BASE_URL}/hospital/doctors`, {
        params,
      });

      if (response.data?.code === 200) {
        const list = response.data.data.doctors ?? [];
        setDoctors(list);

        const pagination = response.data?.data?.pagination;
        if (pagination && typeof pagination === "object") {
          const { currentPage: p = 1, limit: l = 10, count = list.length, hasMore = false, totalCount: apiTotal } = pagination;
          setTotalCount(typeof apiTotal === "number" ? apiTotal : (hasMore ? p * l + 1 : (p - 1) * l + count));
        } else {
          const total = response.data?.data?.total ?? response.data?.data?.count;
          setTotalCount(typeof total === "number" ? total : list.length);
        }
      }
    } catch (error: any) {
      console.error("Error fetching doctors:", error);
      // Auto-retry once after 1.5 seconds if timeout occurred (e.g. backend waking up from cold start)
      if (retryCount === 0 && (error?.code === "ECONNABORTED" || error?.message?.includes("timeout"))) {
        setTimeout(() => fetchDoctors(1), 1500);
        return;
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePaginationChange = (newPage: number, newPageSize: number) => {
    if (newPageSize !== limit) {
      setPage(1);
      setLimit(newPageSize);
    } else {
      setPage(newPage);
    }
  };

  const columns = [
    {
      title: "Doctor ID",
      dataIndex: "doctorId",
      width: 100,
      sorter: false,
      showSorterTooltip: false,
      render: (text: string) => <span className="text-dark fw-medium">{text}</span>,
    },
    {
      title: "Name",
      dataIndex: "name",
      width: 220,
      sorter: false,
      showSorterTooltip: false,
      render: (text: string, record: IDoctor) => (
        <div className="d-flex align-items-center gap-2">
          <DoctorAvatar imageUrl={record.imageUrl} gender={record.gender} size={32} />
          <Link
            href={`/doctor-details?id=${record._id || record.doctorId}`}
            className="text-primary fw-semibold text-decoration-none"
            title="View Doctor Profile"
          >
            {text}
          </Link>
        </div>
      ),
    },
    {
      title: "Department",
      dataIndex: "department",
      width: 170,
      sorter: false,
      showSorterTooltip: false,
      render: (text: string) => <span className="text-dark">{text}</span>,
    },
    {
      title: "Designation",
      dataIndex: "designation",
      width: 150,
      sorter: false,
      showSorterTooltip: false,
      render: (text: string) => <span className="text-dark">{text}</span>,
    },
    {
      title: "Phone",
      dataIndex: "phone",
      width: 140,
      sorter: false,
      showSorterTooltip: false,
      render: (text: string) => <span className="text-dark">{text}</span>,
    },
    {
      title: "Email",
      dataIndex: "email",
      width: 220,
      sorter: false,
      showSorterTooltip: false,
      render: (text: string) => <span className="text-dark">{text}</span>,
    },
    {
      title: "Experience",
      dataIndex: "yearsOfExperience",
      width: 110,
      sorter: false,
      showSorterTooltip: false,
      render: (text: number) => <span className="text-dark">{text} years</span>,
    },
    {
      title: "Action",
      width: 140,
      align: "right" as const,
      sorter: false,
      showSorterTooltip: false,
      render: (_: unknown, record: IDoctor, index: number) => {
        const queueHref = `/qd/${record.doctorId || record._id}`;
        const profileHref = `/doctor-details?id=${record._id || record.doctorId}`;
        const isNearBottom = index >= doctors.length - 2 && doctors.length > 2;

        return (
          <div className="d-flex align-items-center justify-content-end gap-2 flex-nowrap">
            <Link
              href={queueHref}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-soft-primary btn-sm d-inline-flex align-items-center gap-1 text-nowrap"
              title="View queue display"
            >
              <i className="ti ti-presentation fs-14" />
              <span>Queue</span>
            </Link>
            <div className={`dropdown doctor-action-dropdown ${isNearBottom ? "dropup" : ""}`}>
              <button
                type="button"
                className="btn-action-dots"
                data-bs-toggle="dropdown"
                aria-expanded="false"
                title="More actions"
                onClick={(e) => e.stopPropagation()}
              >
                <i className="ti ti-dots-vertical fs-16" />
              </button>
              <ul className="dropdown-menu dropdown-menu-end shadow-sm">
                <li>
                  <Link
                    href={profileHref}
                    className="dropdown-item d-flex align-items-center gap-2 py-2"
                  >
                    <i className="ti ti-user fs-16 text-primary" />
                    <span>View Profile</span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    data-bs-toggle="modal"
                    data-bs-target="#schedule_details"
                    data-doctor-id={record._id}
                    onClick={(e) => e.stopPropagation()}
                    className="dropdown-item d-flex align-items-center gap-2 py-2"
                  >
                    <i className="ti ti-clock fs-16 text-info" />
                    <span>Schedule Details</span>
                  </Link>
                </li>
                <li>
                  <Link
                    href={`${all_routes.editDoctors}?id=${record._id || record.doctorId}`}
                    className="dropdown-item d-flex align-items-center gap-2 py-2"
                  >
                    <i className="ti ti-edit fs-16 text-success" />
                    <span>Edit Doctor</span>
                  </Link>
                </li>
                <li>
                  <hr className="dropdown-divider my-1" />
                </li>
                <li>
                  <Link
                    href="#"
                    data-bs-toggle="modal"
                    data-bs-target="#delete_modal"
                    data-doctor-id={record._id}
                    onClick={(e) => e.stopPropagation()}
                    className="dropdown-item d-flex align-items-center gap-2 py-2 text-danger"
                  >
                    <i className="ti ti-trash fs-16 text-danger" />
                    <span>Delete Doctor</span>
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        );
      },
    },
  ];

  const handleSearch = (value: string) => {
    setSearchText(value);
  };
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
          <div className="d-flex align-items-sm-center justify-content-between flex-sm-row flex-column gap-2 mb-3 pb-3 border-bottom">
            <div className="flex-grow-1 min-w-0">
              <h4 className="fw-bold mb-0 d-flex align-items-center flex-wrap gap-2">
                <span>Doctor List</span>
                <span className="badge badge-soft-primary fs-13 fw-medium">
                  Total Doctors : {totalCount}
                </span>
              </h4>
            </div>
            <div className="d-flex align-items-center flex-wrap gap-2">
              <Link
                href={all_routes.addDoctors}
                className="btn btn-primary fs-13 btn-md text-nowrap"
              >
                <i className="ti ti-plus me-1" />
                New Doctor
              </Link>
            </div>
          </div>
          {/* End Page Header */}
          <div className="d-flex flex-column flex-md-row align-items-stretch align-items-md-center justify-content-between gap-2 mb-3 doctors-list-search-wrapper">
            <div className="search-set w-100 flex-md-grow-1" style={{ maxWidth: "420px" }}>
              <div className="d-flex align-items-center w-100">
                <div className="table-search d-flex align-items-center w-100 mb-0">
                  <div className="search-input w-100">
                    <SearchInput value={searchText} onChange={handleSearch} />
                  </div>
                </div>
              </div>
            </div>
            <div className="d-flex table-dropdown align-items-center justify-content-between justify-content-md-end w-100 w-md-auto gap-2">
              <div className="dropdown">
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
                  style={{ maxWidth: "calc(100vw - 32px)" }}
                >
                  <div className="d-flex align-items-center justify-content-between border-bottom filter-header px-3 py-2">
                    <h4 className="mb-0">Filter</h4>
                    <button
                      type="button"
                      onClick={handleClearFilter}
                      className="btn btn-link link-danger text-decoration-underline p-0"
                    >
                      Clear All
                    </button>
                  </div>
                  <form onSubmit={handleApplyFilter}>
                    <div className="filter-body p-3">
                      <div className="mb-3">
                        <label className="form-label mb-1">Status</label>
                        <CommonSelect
                          options={STATUS_OPTIONS}
                          value={STATUS_OPTIONS.find((o) => o.value === filterStatus) ?? null}
                          onChange={(opt) => setFilterStatus(opt?.value ?? "")}
                          placeholder="All"
                          className="w-100"
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label mb-1">Date</label>
                        <DatePicker
                          className="w-100"
                          format="DD-MM-YYYY"
                          placeholder="Select date"
                          value={filterDate}
                          onChange={(d) => setFilterDate(d)}
                          getPopupContainer={(node) => node?.parentElement ?? document.body}
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label mb-1">Department</label>
                        <CommonSelect
                          options={DEPARTMENT_OPTIONS}
                          value={DEPARTMENT_OPTIONS.find((o) => o.value === filterDepartment) ?? null}
                          onChange={(opt) => setFilterDepartment(opt?.value ?? "")}
                          placeholder="All"
                          className="w-100"
                        />
                      </div>
                    </div>
                    <div className="filter-footer d-flex align-items-center justify-content-end border-top p-2 gap-2">
                      <button type="button" className="btn btn-light btn-md fw-medium" data-filter-close>
                        Close
                      </button>
                      <button type="submit" className="btn btn-primary btn-md fw-medium">
                        Filter
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Table View (>=md) */}
          <div className="table-responsive d-none d-md-block">
            {loading && doctors.length === 0 ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : (
              <Datatable
                columns={columns}
                dataSource={doctors}
                Selection={false}
                searchText={searchText}
                total={totalCount}
                currentPage={page}
                pageSize={limit}
                onPaginationChange={handlePaginationChange}
                loading={loading}
              />
            )}
          </div>

          {/* Mobile & Small Tablet Card-Based View (<md) */}
          <div className="d-md-none">
            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading doctors...</span>
                </div>
              </div>
            ) : doctors.length === 0 ? (
              <div className="card text-center p-4">
                <p className="text-muted mb-0">No doctors found.</p>
              </div>
            ) : (
              <>
                <div className="row g-3">
                  {doctors.map((record) => {
                    const queueHref = `/qd/${record.doctorId || record._id}`;
                    const profileHref = `/doctor-details?id=${record._id || record.doctorId}`;
                    const isActive = record.status?.toLowerCase() === "active";

                    return (
                      <div className="col-12 col-sm-6" key={record._id || record.doctorId}>
                        <div className="card h-100 mb-0 shadow-sm border">
                          <div className="card-body p-3 d-flex flex-column justify-content-between">
                            <div>
                              {/* Doctor Header: Avatar, Name, Department/Specialization, Status */}
                              <div className="d-flex align-items-start gap-3 mb-2">
                                <Link href={profileHref} className="flex-shrink-0">
                                  <DoctorAvatar
                                    imageUrl={record.imageUrl}
                                    gender={record.gender}
                                    size={48}
                                    className="rounded-circle"
                                  />
                                </Link>
                                <div className="flex-grow-1 min-w-0">
                                  <div className="d-flex align-items-start justify-content-between gap-1 mb-1">
                                    <Link
                                      href={profileHref}
                                      className="text-primary fw-semibold text-decoration-none text-truncate d-block fs-14"
                                      title={record.name}
                                    >
                                      {record.name}
                                    </Link>
                                    <span
                                      className={`badge ${
                                        isActive
                                          ? "badge-soft-success"
                                          : "badge-soft-secondary"
                                      } fs-11 flex-shrink-0`}
                                    >
                                      {record.status || "Active"}
                                    </span>
                                  </div>
                                  <div className="text-muted fs-12 text-truncate">
                                    {record.department || record.designation || "General Medicine"}
                                  </div>
                                  <div className="text-muted fs-11 d-flex align-items-center gap-2 mt-1">
                                    <span className="text-dark fw-medium">{record.doctorId}</span>
                                    {record.yearsOfExperience ? (
                                      <>
                                        <span>•</span>
                                        <span>{record.yearsOfExperience} yrs exp</span>
                                      </>
                                    ) : null}
                                  </div>
                                </div>
                              </div>

                              {/* Contact Information */}
                              {(record.phone || record.email) && (
                                <div className="bg-light rounded p-2 mb-3 fs-12">
                                  {record.phone && (
                                    <div className="d-flex align-items-center gap-2 text-muted mb-1 text-truncate">
                                      <i className="ti ti-phone fs-13 text-gray-5 flex-shrink-0" />
                                      <span className="text-truncate">{record.phone}</span>
                                    </div>
                                  )}
                                  {record.email && (
                                    <div className="d-flex align-items-center gap-2 text-muted text-truncate">
                                      <i className="ti ti-mail fs-13 text-gray-5 flex-shrink-0" />
                                      <span className="text-truncate">{record.email}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Bottom: Action Buttons */}
                            <div className="d-flex align-items-center justify-content-between pt-2 border-top flex-wrap gap-2">
                              <Link
                                href={queueHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-soft-primary btn-sm d-inline-flex align-items-center gap-1 text-nowrap"
                                title="View queue display"
                              >
                                <i className="ti ti-presentation fs-15" />
                                <span>Queue</span>
                              </Link>

                              <div className="dropdown doctor-action-dropdown">
                                <button
                                  type="button"
                                  className="btn-action-dots"
                                  data-bs-toggle="dropdown"
                                  aria-expanded="false"
                                  title="More actions"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <i className="ti ti-dots-vertical fs-16" />
                                </button>
                                <ul className="dropdown-menu dropdown-menu-end shadow-sm">
                                  <li>
                                    <Link
                                      href={profileHref}
                                      className="dropdown-item d-flex align-items-center gap-2 py-2"
                                    >
                                      <i className="ti ti-user fs-16 text-primary" />
                                      <span>View Profile</span>
                                    </Link>
                                  </li>
                                  <li>
                                    <Link
                                      href="#"
                                      data-bs-toggle="modal"
                                      data-bs-target="#schedule_details"
                                      data-doctor-id={record._id}
                                      onClick={(e) => e.stopPropagation()}
                                      className="dropdown-item d-flex align-items-center gap-2 py-2"
                                    >
                                      <i className="ti ti-clock fs-16 text-info" />
                                      <span>Schedule Details</span>
                                    </Link>
                                  </li>
                                  <li>
                                    <Link
                                      href={`${all_routes.editDoctors}?id=${record._id || record.doctorId}`}
                                      className="dropdown-item d-flex align-items-center gap-2 py-2"
                                    >
                                      <i className="ti ti-edit fs-16 text-success" />
                                      <span>Edit Doctor</span>
                                    </Link>
                                  </li>
                                  <li>
                                    <hr className="dropdown-divider my-1" />
                                  </li>
                                  <li>
                                    <Link
                                      href="#"
                                      data-bs-toggle="modal"
                                      data-bs-target="#delete_modal"
                                      data-doctor-id={record._id}
                                      onClick={(e) => e.stopPropagation()}
                                      className="dropdown-item d-flex align-items-center gap-2 py-2 text-danger"
                                    >
                                      <i className="ti ti-trash fs-16 text-danger" />
                                      <span>Delete Doctor</span>
                                    </Link>
                                  </li>
                                </ul>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Mobile Pagination */}
                {totalCount > limit && (
                  <div className="d-flex justify-content-center mt-3 pt-2">
                    <Pagination
                      current={page}
                      pageSize={limit}
                      total={totalCount}
                      onChange={handlePaginationChange}
                      showSizeChanger={false}
                      size="small"
                    />
                  </div>
                )}
              </>
            )}
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
      <style jsx global>{`
        .table-responsive {
          overflow-x: auto !important;
          -webkit-overflow-scrolling: touch;
        }
        .table-responsive .ant-table-wrapper {
          overflow-x: auto !important;
        }
        .page-wrapper {
          overflow-x: hidden;
        }
        .doctor-action-dropdown {
          position: relative;
          display: inline-block;
        }
        .doctor-action-dropdown .btn-action-dots {
          width: 30px;
          height: 30px;
          padding: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          border: 1px solid #dcdfe4;
          background: #ffffff;
          color: #4b5563;
          transition: all 0.15s ease-in-out;
          cursor: pointer;
        }
        .doctor-action-dropdown .btn-action-dots:hover,
        .doctor-action-dropdown .btn-action-dots:focus,
        .doctor-action-dropdown .btn-action-dots[aria-expanded="true"] {
          background: #f3f4f6;
          color: #111827;
          border-color: #9ca3af;
        }
        .doctor-action-dropdown .dropdown-menu {
          min-width: 180px;
          padding: 6px;
          margin-top: 2px;
          border: 1px solid rgba(0, 0, 0, 0.08);
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.06);
          border-radius: 8px;
          z-index: 1050;
        }
        /* Open dropdown on hover */
        .doctor-action-dropdown:hover > .dropdown-menu {
          display: block;
        }
        .doctor-action-dropdown.dropup:hover > .dropdown-menu,
        .doctor-action-dropdown.dropup > .dropdown-menu.show {
          top: auto;
          bottom: 100%;
          margin-bottom: 4px;
          margin-top: 0;
        }
        .doctor-action-dropdown .dropdown-item {
          font-size: 13px;
          font-weight: 500;
          padding: 7px 12px;
          border-radius: 6px;
          transition: background-color 0.15s ease;
        }
        .doctor-action-dropdown .dropdown-item:hover {
          background-color: #f3f4f6;
        }
        .doctor-action-dropdown .dropdown-item.text-danger:hover {
          background-color: #fee2e2;
          color: #dc2626 !important;
        }
        .table-responsive .ant-table-tbody > tr:hover,
        .table-responsive .ant-table-tbody > tr:has(.doctor-action-dropdown:hover),
        .table-responsive .ant-table-tbody > tr:has(.dropdown-menu.show) {
          position: relative;
          z-index: 40;
        }
        .table-responsive .ant-table-cell:last-child {
          overflow: visible !important;
        }
        @media (max-width: 767.98px) {
          .doctors-list-search-wrapper .search-set,
          .doctors-list-search-wrapper .table-search,
          .doctors-list-search-wrapper .search-input,
          .doctors-list-search-wrapper .search-input input {
            width: 100% !important;
            max-width: 100% !important;
          }
          .doctors-list-search-wrapper .filter-dropdown {
            max-width: calc(100vw - 32px) !important;
          }
        }
      `}</style>
    </>
  );
};

export default DoctorsListComponent;
