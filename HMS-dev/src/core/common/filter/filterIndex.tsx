"use client";

import Link from "next/link";
import { DatePicker, Select } from "antd";
import {
  Amount,
  Department,
  Designation,
  Doctor,
  Status,
} from "../selectOption";
import CommonSelect from "../common-select/commonSelect";
import { closeFilterDropdown } from "./filterDropdownUtils";

const FilterIndexComponent = () => {
  const getModalContainer = () => {
    const modalElement = document.getElementById("modal-datepicker");
    return modalElement ? modalElement : document.body;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const menuId =
      e.currentTarget.closest<HTMLElement>(".filter-dropdown")?.id ?? "filter-dropdown";
    closeFilterDropdown(menuId);
  };

  return (
    <>
      <form onSubmit={handleSubmit}>
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
          <button
            type="button"
            className="btn btn-light btn-md me-2 fw-medium"
            data-filter-close
          >
            Close
          </button>
          <button type="submit" className="btn btn-primary btn-md fw-medium">
            Filter
          </button>
        </div>
      </form>
    </>
  );
};

export default FilterIndexComponent;
