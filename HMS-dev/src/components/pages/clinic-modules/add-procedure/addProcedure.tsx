"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Department } from "@/core/common/selectOption";
import CommonSelect from "@/core/common/common-select/commonSelect";
import type { Option } from "@/core/common/common-select/commonSelect";
import { all_routes } from "../../../../routes/all_routes";
import Link from "next/link";
import axios from "axios";
import { API_BASE_URL } from "@/environment";

const CATEGORY_OPTIONS: Option[] = [
  { value: "Diagnostic", label: "Diagnostic" },
  { value: "Surgical", label: "Surgical" },
  { value: "Therapeutic", label: "Therapeutic" },
  { value: "Preventive", label: "Preventive" },
  { value: "X-ray", label: "X-ray" },
];

const STATUS_OPTIONS: Option[] = [
  { value: "Active", label: "Active" },
  { value: "Inactive", label: "Inactive" },
];

const TYPE_OPTIONS: Option[] = [
  { value: "both", label: "Both" },
  { value: "daycare", label: "Daycare" },
  { value: "ipd", label: "IPD" },
];

const getProcedureErrorMessage = (err: unknown, fallback: string) => {
  if (!axios.isAxiosError(err)) return fallback;
  const data = err.response?.data as { message?: unknown } | undefined;
  return typeof data?.message === "string" ? data.message : fallback;
};

const AddProcedureComponent = () => {
  const router = useRouter();
  const [procedureName, setProcedureName] = useState("");
  const [department, setDepartment] = useState<Option | null>(null);
  const [category, setCategory] = useState<Option | null>(null);
  const [status, setStatus] = useState<Option | null>(STATUS_OPTIONS[0]);
  const [procedureType, setProcedureType] = useState<Option | null>(TYPE_OPTIONS[0]);
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [isPackage, setIsPackage] = useState(false);
  const [isXray, setIsXray] = useState(false);
  const [isUltrasound, setIsUltrasound] = useState(false);
  const [isDialysis, setIsDialysis] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    if (!API_BASE_URL) {
      setError("API configuration error.");
      return;
    }
    if (!procedureName.trim()) {
      setError("Procedure name is required.");
      return;
    }
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) {
      setError("Please enter a valid price.");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        procedureName: procedureName.trim(),
        department: department?.value || undefined,
        category: category?.value || undefined,
        status: status?.value ?? "Active",
        type: procedureType?.value ?? "both",
        price: priceNum,
        isPackage,
        isXray,
        isUltrasound: isXray ? isUltrasound : false,
        isDialysis,
        metaData: "",
        description: description.trim() || undefined,
      };
      const res = await axios.post(`${API_BASE_URL}/hospital/procedures`, payload);
      const isSuccess =
        (res?.status >= 200 && res?.status < 300) || res?.data?.code === 200;
      if (isSuccess) {
        setError("");
        setSuccess(true);
        router.push(all_routes.procedures);
      } else {
        setError(res?.data?.message ?? "Failed to add procedure.");
      }
    } catch (err: unknown) {
      setError(getProcedureErrorMessage(err, "Failed to add procedure."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="page-wrapper">
        <div className="content">
          <div className="row">
            <div className="col-12">
              <div className="d-flex align-items-sm-center flex-sm-row flex-column gap-2 mb-3">
                <div className="flex-grow-1">
                  <h6 className="fw-bold mb-0 d-flex align-items-center">
                    <Link href={all_routes.procedures}>
                      <i className="ti ti-chevron-left me-1 fs-14" />
                      Procedures
                    </Link>
                  </h6>
                </div>
              </div>
              <div className="card">
                <div className="card-body">
                  <div className="border-bottom d-flex align-items-center justify-content-between pb-3 mb-3">
                    <h5 className="offcanvas-title fs-18 fw-bold text-primary">
                      New Procedure
                    </h5>
                  </div>
                  {error && (
                    <div className="alert alert-danger mb-3" role="alert">
                      {error}
                    </div>
                  )}
                  {success && (
                    <div className="alert alert-success mb-3" role="alert">
                      Procedure added successfully. Redirecting…
                    </div>
                  )}
                  <form onSubmit={handleSubmit}>
                    <div className="pb-0">
                      <div className="row g-2">
                        <div className="col-12 col-md-6 col-lg-2">
                          <div className="mb-3">
                            <label className="form-label">
                              Procedure Name
                              <span className="text-danger ms-1">*</span>
                            </label>
                            <input
                              type="text"
                              className="form-control"
                              value={procedureName}
                              onChange={(e) => setProcedureName(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="col-6 col-md-4 col-lg-2">
                          <div className="mb-3">
                            <label className="form-label">Department</label>
                            <CommonSelect
                              options={Department}
                              className="select"
                              value={department}
                              onChange={setDepartment}
                            />
                          </div>
                        </div>
                        <div className="col-6 col-md-4 col-lg-2">
                          <div className="mb-3">
                            <label className="form-label">Category</label>
                            <CommonSelect
                              options={CATEGORY_OPTIONS}
                              className="select"
                              value={category}
                              onChange={setCategory}
                            />
                          </div>
                        </div>
                        <div className="col-6 col-md-4 col-lg-2">
                          <div className="mb-3">
                            <label className="form-label">Status</label>
                            <CommonSelect
                              options={STATUS_OPTIONS}
                              className="select"
                              value={status}
                              onChange={setStatus}
                            />
                          </div>
                        </div>
                        <div className="col-6 col-md-4 col-lg-2">
                          <div className="mb-3">
                            <label className="form-label">Type</label>
                            <CommonSelect
                              options={TYPE_OPTIONS}
                              className="select"
                              value={procedureType}
                              onChange={setProcedureType}
                            />
                          </div>
                        </div>
                        <div className="col-6 col-md-3 col-lg-1" style={{ minWidth: 88, maxWidth: 100 }}>
                          <div className="mb-3">
                            <label className="form-label" htmlFor="add-procedure-is-package">
                              Package
                            </label>
                            <div
                              className="d-flex align-items-center"
                              style={{ minHeight: 38 }}
                            >
                              <div className="form-check form-switch mb-0">
                                <input
                                  className="form-check-input"
                                  type="checkbox"
                                  role="switch"
                                  id="add-procedure-is-package"
                                  checked={isPackage}
                                  onChange={(e) => setIsPackage(e.target.checked)}
                                  aria-label="Mark as package"
                                />
                                <span className="form-check-label ms-1">
                                  {isPackage ? "Yes" : "No"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="col-6 col-md-3 col-lg-1" style={{ minWidth: 88, maxWidth: 100 }}>
                          <div className="mb-3">
                            <label className="form-label" htmlFor="add-procedure-is-xray">
                              X Ray
                            </label>
                            <div
                              className="d-flex align-items-center"
                              style={{ minHeight: 38 }}
                            >
                              <div className="form-check form-switch mb-0">
                                <input
                                  className="form-check-input"
                                  type="checkbox"
                                  role="switch"
                                  id="add-procedure-is-xray"
                                  checked={isXray}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    setIsXray(checked);
                                    if (!checked) setIsUltrasound(false);
                                  }}
                                  aria-label="Mark as X ray"
                                />
                                <span className="form-check-label ms-1">
                                  {isXray ? "Yes" : "No"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="col-6 col-md-3 col-lg-1" style={{ minWidth: 88, maxWidth: 110 }}>
                          <div className="mb-3">
                            <label className="form-label" htmlFor="add-procedure-is-dialysis">
                              Dialysis
                            </label>
                            <div
                              className="d-flex align-items-center"
                              style={{ minHeight: 38 }}
                            >
                              <div className="form-check form-switch mb-0">
                                <input
                                  className="form-check-input"
                                  type="checkbox"
                                  role="switch"
                                  id="add-procedure-is-dialysis"
                                  checked={isDialysis}
                                  onChange={(e) => setIsDialysis(e.target.checked)}
                                  aria-label="Mark as dialysis"
                                />
                                <span className="form-check-label ms-1">
                                  {isDialysis ? "Yes" : "No"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        {isXray ? (
                          <div className="col-6 col-md-3 col-lg-1" style={{ minWidth: 100, maxWidth: 120 }}>
                            <div className="mb-3">
                              <label className="form-label" htmlFor="add-procedure-is-ultrasound">
                                Ultrasound
                              </label>
                              <div
                                className="d-flex align-items-center"
                                style={{ minHeight: 38 }}
                              >
                                <div className="form-check form-switch mb-0">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    role="switch"
                                    id="add-procedure-is-ultrasound"
                                    checked={isUltrasound}
                                    onChange={(e) => setIsUltrasound(e.target.checked)}
                                    aria-label="Mark as ultrasound"
                                  />
                                  <span className="form-check-label ms-1">
                                    {isUltrasound ? "Yes" : "No"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : null}
                        <div className="col-6 col-md-3 col-lg-1" style={{ minWidth: 100, maxWidth: 130 }}>
                          <div className="mb-3">
                            <label className="form-label">
                              Price
                              <span className="text-danger ms-1">*</span>
                            </label>
                            <div className="input-group">
                              <input
                                type="number"
                                className="form-control"
                                min="0"
                                step="0.01"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                              />
                              <span className="input-group-text bg-transparent text-dark fs-14">
                                ₹
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="col-12">
                          <div className="mb-3">
                            <label className="form-label">Description</label>
                            <textarea
                              className="form-control"
                              rows={4}
                              placeholder="Enter procedure description"
                              value={description}
                              onChange={(e) => setDescription(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="d-flex justify-content-end gap-2">
                      <Link
                        href={all_routes.procedures}
                        className="btn btn-light btm-md"
                      >
                        Cancel
                      </Link>
                      <button
                        type="submit"
                        className="btn btn-primary btm-md"
                        disabled={loading}
                      >
                        {loading ? "Adding…" : "Add Procedure"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="footer text-center bg-white p-2 border-top">
          <p className="text-dark mb-0">
            2025 ©
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

export default AddProcedureComponent;
