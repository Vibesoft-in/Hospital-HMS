"use client";

import { useState, useEffect, useCallback } from "react";
import CommonSelect from "@/core/common/common-select/commonSelect";
import type { Option } from "@/core/common/common-select/commonSelect";
import { Department } from "@/core/common/selectOption";
import ImageWithBasePath from "@/core/imageWithBasePath";
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

interface IModalsProps {
  onDeleteConfirm?: () => void;
  deleteLoading?: boolean;
  onEditSuccess?: () => void;
}

interface IBootstrapOffcanvasInstance {
  hide?: () => void;
}

interface IBootstrapWindow extends Window {
  bootstrap?: {
    Offcanvas?: {
      getInstance?: (element: HTMLElement) => IBootstrapOffcanvasInstance | null;
    };
  };
}

const getProcedureErrorMessage = (err: unknown, fallback: string) => {
  if (!axios.isAxiosError(err)) return fallback;
  const data = err.response?.data as { message?: unknown } | undefined;
  return typeof data?.message === "string" ? data.message : err.message || fallback;
};

const Modals = ({ onDeleteConfirm, deleteLoading, onEditSuccess }: IModalsProps) => {
  const [procedureId, setProcedureId] = useState<string | null>(null);
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
  const [editLoading, setEditLoading] = useState(false);
  const [editFetchLoading, setEditFetchLoading] = useState(false);
  const [editError, setEditError] = useState("");

  const resetEditForm = useCallback(() => {
    setProcedureName("");
    setDepartment(null);
    setCategory(null);
    setStatus(STATUS_OPTIONS[0]);
    setProcedureType(TYPE_OPTIONS[0]);
    setPrice("");
    setDescription("");
    setIsPackage(false);
    setIsXray(false);
    setIsUltrasound(false);
    setIsDialysis(false);
    setProcedureId(null);
    setEditError("");
  }, []);

  const fetchProcedure = useCallback(async (id: string) => {
    if (!API_BASE_URL) return;
    try {
      setEditFetchLoading(true);
      setEditError("");
      const res = await axios.get(`${API_BASE_URL}/hospital/procedures/${id}`);
      const data = res.data?.data?.procedure ?? res.data?.data;
      if (!data) {
        setEditError("Procedure not found.");
        return;
      }
      setProcedureName(data.procedureName ?? "");
      setDepartment(
        Department.find((d) => d.value === (data.department ?? data.category)) ?? null
      );
      setCategory(
        CATEGORY_OPTIONS.find((c) => c.value === data.category) ?? null
      );
      setStatus(
        STATUS_OPTIONS.find((s) => s.value === data.status) ?? STATUS_OPTIONS[0]
      );
      setProcedureType(
        TYPE_OPTIONS.find((t) => t.value === data.type) ?? TYPE_OPTIONS[0]
      );
      setPrice(data.price != null || data.basePrice != null ? String(data.price ?? data.basePrice) : "");
      setDescription(data.description ?? "");
      setIsPackage(Boolean(data.isPackage));
      setIsXray(Boolean(data.isXray));
      setIsUltrasound(Boolean(data.isUltrasound));
      setIsDialysis(Boolean(data.isDialysis));
    } catch {
      setEditError("Failed to load procedure.");
    } finally {
      setEditFetchLoading(false);
    }
  }, []);

  useEffect(() => {
    const handleEditClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest(
        '[data-bs-target="#edit_procedure"][data-procedure-id]'
      ) as HTMLElement | null;
      if (!link) return;
      const id = link.getAttribute("data-procedure-id");
      if (!id) return;
      resetEditForm();
      setProcedureId(id);
      fetchProcedure(id);
    };
    document.addEventListener("click", handleEditClick);
    return () => document.removeEventListener("click", handleEditClick);
  }, [fetchProcedure, resetEditForm]);

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError("");
    if (!procedureId || !API_BASE_URL) return;
    if (!procedureName.trim()) {
      setEditError("Procedure name is required.");
      return;
    }
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) {
      setEditError("Please enter a valid price.");
      return;
    }
    setEditLoading(true);
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
      const res = await axios.patch(
        `${API_BASE_URL}/hospital/procedures/${procedureId}`,
        payload
      );
      const statusOk = res && res.status >= 200 && res.status < 300;
      const codeOk = res?.data && (res.data.code === 200 || res.data.code === "200");
      const msgOk = res?.data?.message?.toLowerCase?.().includes("success");
      if (statusOk || codeOk || msgOk) {
        setEditError("");
        const offcanvasEl = document.getElementById("edit_procedure");
        if (offcanvasEl) {
          const offcanvasApi = (window as IBootstrapWindow).bootstrap?.Offcanvas;
          const instance = offcanvasApi?.getInstance
            ? offcanvasApi.getInstance(offcanvasEl)
            : null;
          if (instance && typeof instance.hide === "function") {
            instance.hide();
          } else {
            const closeBtn = offcanvasEl.querySelector<HTMLElement>("[data-bs-dismiss=\"offcanvas\"]");
            closeBtn?.click();
          }
        }
        onEditSuccess?.();
      } else {
        setEditError(res?.data?.message ?? "Failed to update procedure.");
      }
    } catch (err: unknown) {
      setEditError(getProcedureErrorMessage(err, "Failed to update procedure."));
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <>
      {/* Start Add Modal */}
      <div id="add_procedure" className="modal fade">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h4 className="text-dark modal-title fw-bold">New Procedure</h4>
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
                    Procedure Name<span className="text-danger ms-1">*</span>
                  </label>
                  <input type="text" className="form-control" />
                </div>
                <div className="mb-3">
                  <label className="form-label">
                    Department<span className="text-danger ms-1">*</span>
                  </label>
                  <CommonSelect
                    options={Department}
                    className="select"
                    defaultValue={Department[0]}
                  />
                </div>
                <div className="mb-0">
                  <label className="form-label">
                    Price<span className="text-danger ms-1">*</span>
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
                  Add New Procedure
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      {/* End Add Modal */}
      {/* Start Edit Procedure Offcanvas */}
      <div
        className="offcanvas offcanvas-offset offcanvas-end offcanvas-large"
        tabIndex={-1}
        id="edit_procedure"
        style={{ width: "900px" }}
      >
        <div className="offcanvas-header d-block pb-0 px-0">
          <div className="border-bottom d-flex align-items-center justify-content-between pb-3 px-3">
            <h5 className="offcanvas-title fs-18 fw-bold">Edit Procedure</h5>
            <button
              type="button"
              className="btn-close custom-btn-close opacity-100"
              data-bs-dismiss="offcanvas"
              aria-label="Close"
            >
              <i className="ti ti-x fs-16 text-dark" />
            </button>
          </div>
        </div>
        <div className="offcanvas-body p-0">
          <form onSubmit={handleEditSubmit}>
            <div className="p-3 pb-0">
              {editError && (
                <div className="alert alert-danger mb-3" role="alert">
                  {editError}
                </div>
              )}
              {editFetchLoading ? (
                <p className="text-muted mb-0">Loading procedure…</p>
              ) : (
                <>
                  <div className="row g-2">
                    <div className="col-12 col-md-6 col-lg-2">
                      <div className="mb-3">
                        <label className="form-label mb-1 fw-medium">
                          Procedure Name<span className="text-danger ms-1">*</span>
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
                        <label className="form-label mb-1 fw-medium">Department</label>
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
                        <label className="form-label mb-1 fw-medium">Category</label>
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
                        <label className="form-label mb-1 fw-medium">Status</label>
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
                        <label className="form-label mb-1 fw-medium">Type</label>
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
                        <label className="form-label mb-1 fw-medium" htmlFor="edit-procedure-is-package">
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
                              id="edit-procedure-is-package"
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
                        <label className="form-label mb-1 fw-medium" htmlFor="edit-procedure-is-xray">
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
                              id="edit-procedure-is-xray"
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
                        <label className="form-label mb-1 fw-medium" htmlFor="edit-procedure-is-dialysis">
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
                              id="edit-procedure-is-dialysis"
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
                          <label className="form-label mb-1 fw-medium" htmlFor="edit-procedure-is-ultrasound">
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
                                id="edit-procedure-is-ultrasound"
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
                        <label className="form-label mb-1 fw-medium">
                          Price<span className="text-danger ms-1">*</span>
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
                          <span className="input-group-text bg-transparent text-dark fs-14">₹</span>
                        </div>
                      </div>
                    </div>
                    <div className="col-12">
                      <div className="mb-3">
                        <label className="form-label mb-1 fw-medium">Description</label>
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
                </>
              )}
            </div>
            <div className="offcanvas-footer mb-1 p-3 border-1 border-top">
              <div className="d-flex justify-content-end gap-2">
                <button
                  type="button"
                  className="btn btn-light"
                  data-bs-dismiss="offcanvas"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={editLoading || editFetchLoading}
                >
                  {editLoading ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
      {/* End Edit Procedure Offcanvas */}
      {/* Start Delete Modal */}
      <div className="modal fade" id="delete_procedure">
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
                <button
                  type="button"
                  id="delete_procedure_cancel"
                  className="btn btn-light position-relative z-1 me-3"
                  data-bs-dismiss="modal"
                  aria-label="Cancel"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger position-relative z-1"
                  onClick={() => onDeleteConfirm?.()}
                  disabled={deleteLoading}
                >
                  {deleteLoading ? "Deleting…" : "Yes, Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* End Delete Modal */}
    </>
  );
};

export default Modals;
