"use client";

import { DatePicker } from "antd";
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

  const fetchDoctors = async () => {
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
    } catch (error) {
      console.error("Error fetching doctors:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePaginationChange = (newPage: number, newPageSize: number) => {
    setPage(newPage);
    setLimit(newPageSize);
  };

  const columns = [
    {
      title: "Doctor ID",
      dataIndex: "doctorId",
      sorter: false,
      showSorterTooltip: false,
      render: (text: string) => <span className="text-dark">{text}</span>,
    },
    {
      title: "Name",
      dataIndex: "name",
      sorter: false,
      showSorterTooltip: false,
      render: (text: string, record: IDoctor) => (
        <Link
          href={`/doctor-details?id=${record._id || record.doctorId}`}
          className="text-primary fw-semibold text-decoration-none"
          title="View Doctor Profile"
        >
          {text}
        </Link>
      ),
    },
    {
      title: "Department",
      dataIndex: "department",
      sorter: false,
      showSorterTooltip: false,
      render: (text: string) => <span className="text-dark">{text}</span>,
    },
    {
      title: "Designation",
      dataIndex: "designation",
      sorter: false,
      showSorterTooltip: false,
      render: (text: string) => <span className="text-dark">{text}</span>,
    },
    {
      title: "Phone",
      dataIndex: "phone",
      sorter: false,
      showSorterTooltip: false,
      render: (text: string) => <span className="text-dark">{text}</span>,
    },
    {
      title: "Email",
      dataIndex: "email",
      sorter: false,
      showSorterTooltip: false,
      render: (text: string) => <span className="text-dark">{text}</span>,
    },
    {
      title: "Experience",
      dataIndex: "yearsOfExperience",
      sorter: false,
      showSorterTooltip: false,
      render: (text: number) => <span className="text-dark">{text} years</span>,
    },
    {
      title: "",
      sorter: false,
      showSorterTooltip: false,
      render: (_: unknown, record: IDoctor) => {
        const queueHref = `/qd/${record.doctorId || record._id}`;
        const profileHref = `/doctor-details?id=${record._id || record.doctorId}`;
        return (
          <div className="d-flex align-items-center gap-2">
            <Link
              href={queueHref}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-soft-primary btn-sm d-inline-flex align-items-center gap-1"
              title="View queue display"
            >
              <i className="ti ti-presentation fs-16" />
              <span className="d-none d-sm-inline">Queue</span>
            </Link>
            <div className="action-item">
              <Link
                href={profileHref}
                title="View Doctor Profile"
              >
                <i className="ti ti-user fs-16" />
              </Link>
            </div>
            <div className="action-item">
              <Link
                href="#"
                data-bs-toggle="modal"
                data-bs-target="#schedule_details"
                data-doctor-id={record._id}
                onClick={(e) => e.stopPropagation()}
                title="Schedule"
              >
                <i className="ti ti-clock fs-16" />
              </Link>
            </div>
            <div className="action-item">
              <Link
                href="#"
                data-bs-toggle="offcanvas"
                data-bs-target="#edit_doctor"
                data-doctor-id={record._id}
                title="Edit"
              >
                <i className="ti ti-edit fs-16" />
              </Link>
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
          <div className="d-flex align-items-sm-center flex-sm-row flex-column gap-2 mb-3 pb-3 border-bottom">
            <div className="flex-grow-1">
              <h4 className="fw-bold mb-0">
                Doctor List
                <span className="badge badge-soft-primary fs-13 fw-medium ms-2">
                  Total Doctors : {totalCount}
                </span>
              </h4>
            </div>
            <div className="text-end d-flex">
              {/* dropdown*/}
              {/* <div className="dropdown me-1">
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
              </div> */}
              {/* <div className="bg-white border shadow-sm rounded px-1 pb-0 text-center d-flex align-items-center justify-content-center">
                <Link
                  href={all_routes.doctorsList}
                  className="bg-light rounded p-1 d-flex align-items-center justify-content-center"
                >
                  <i className="ti ti-list fs-14 text-dark" />
                </Link>
                <Link
                  href={all_routes.doctors}
                  className="bg-white rounded p-1 d-flex align-items-center justify-content-center"
                >
                  <i className="ti ti-layout-grid fs-14 text-body" />
                </Link>
              </div> */}
              {/* Commented out modal trigger - redirecting to add doctor page instead */}
              {/* <Link
                href="#"
                className="btn btn-primary ms-2 fs-13 btn-md"
                data-bs-toggle="offcanvas"
                data-bs-target="#add_doctor"
              >
                <i className="ti ti-plus me-1" />
                New Doctor
              </Link> */}
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
          <div className="table-responsive">
            {loading ? (
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
              />
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
      <Modals />
    </>
  );
};

export default DoctorsListComponent;
