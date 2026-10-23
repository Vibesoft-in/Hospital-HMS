"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Datatable from "@/core/common/dataTable";
import SearchInput from "@/core/common/dataTable/dataTableSearch";
import { isAdminRole } from "@/core/auth/roleAccess";
import axios from "axios";
import { API_BASE_URL } from "@/environment";

interface IWardApi {
  _id: string;
  name?: string;
  chargePerDay?: number;
  nursingChargePerDay?: number;
  description?: string;
  metadata?: { floor?: number; wing?: string };
  createdAt?: string;
}

interface IWardRow {
  id: string;
  Name: string;
  ChargePerDay: string;
  NursingChargePerDay: string;
  Description: string;
  Floor: string;
  Wing: string;
  CreatedOn: string;
}

const formatCharge = (value?: number) =>
  typeof value === "number" ? `₹${value.toLocaleString("en-IN")}` : "—";

const renderCellText = (text: string, semibold = false) => (
  <span className={`text-dark ${semibold ? "fw-semibold" : ""}`}>{text}</span>
);

const WardsListComponent = () => {
  const isAdmin = useMemo(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("authUser") : null;
      if (!raw) return false;
      const parsed = JSON.parse(raw) as { role?: string } | null;
      return isAdminRole(parsed?.role);
    } catch {
      return false;
    }
  }, []);
  const [rows, setRows] = useState<IWardRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchText, setSearchText] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createCharge, setCreateCharge] = useState("");
  const [createNursingCharge, setCreateNursingCharge] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createFloor, setCreateFloor] = useState("");
  const [createWing, setCreateWing] = useState("");
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState("");

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCharge, setEditCharge] = useState("");
  const [editNursingCharge, setEditNursingCharge] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editFloor, setEditFloor] = useState("");
  const [editWing, setEditWing] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const mapWardToRow = (w: IWardApi): IWardRow => ({
    id: w._id,
    Name: w.name?.trim() || "—",
    ChargePerDay: formatCharge(w.chargePerDay),
    NursingChargePerDay: formatCharge(w.nursingChargePerDay),
    Description: w.description?.trim() || "—",
    Floor:
      w.metadata?.floor != null && !Number.isNaN(Number(w.metadata.floor))
        ? String(w.metadata.floor)
        : "—",
    Wing: w.metadata?.wing?.trim() || "—",
    CreatedOn: w.createdAt
      ? new Date(w.createdAt).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "—",
  });

  const buildMetadata = (floor: string, wing: string) => {
    const meta: { floor?: number; wing?: string } = {};
    const floorTrim = floor.trim();
    const wingTrim = wing.trim();
    if (floorTrim) {
      const n = Number(floorTrim);
      if (!Number.isNaN(n)) meta.floor = n;
    }
    if (wingTrim) meta.wing = wingTrim;
    return Object.keys(meta).length ? meta : undefined;
  };

  const fetchWards = async () => {
    if (!API_BASE_URL) return;
    try {
      setLoading(true);
      setError("");
      const res = await axios.get(`${API_BASE_URL}/hospital/wards`, {
        params: { limit: 100, page: 1 },
      });
      const raw = res.data?.data ?? res.data;
      const list: IWardApi[] = Array.isArray(raw?.wards)
        ? raw.wards
        : Array.isArray(raw)
          ? raw
          : [];
      setRows(list.map(mapWardToRow));
    } catch (err: unknown) {
      const message =
        axios.isAxiosError(err) && err.response?.data?.message
          ? String(err.response.data.message)
          : "Failed to load wards.";
      setError(message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWards();
  }, []);

  const panelOpen = editModalOpen || createModalOpen;

  useEffect(() => {
    if (!panelOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [panelOpen]);

  const closePanels = () => {
    setEditModalOpen(false);
    setCreateModalOpen(false);
  };

  const openCreateModal = () => {
    setCreateName("");
    setCreateCharge("");
    setCreateNursingCharge("");
    setCreateDescription("");
    setCreateFloor("");
    setCreateWing("");
    setCreateError("");
    setEditModalOpen(false);
    setCreateModalOpen(true);
  };

  const openEditModal = (record: IWardRow) => {
    setCreateModalOpen(false);
    setEditingId(record.id);
    setEditName(record.Name !== "—" ? record.Name : "");
    setEditCharge(
      record.ChargePerDay !== "—"
        ? record.ChargePerDay.replace(/[₹,]/g, "").trim()
        : ""
    );
    setEditNursingCharge(
      record.NursingChargePerDay !== "—"
        ? record.NursingChargePerDay.replace(/[₹,]/g, "").trim()
        : ""
    );
    setEditDescription(record.Description !== "—" ? record.Description : "");
    setEditFloor(record.Floor !== "—" ? record.Floor : "");
    setEditWing(record.Wing !== "—" ? record.Wing : "");
    setEditError("");
    setEditModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!API_BASE_URL) return;
    const charge = Number(createCharge);
    const nursingChargeTrim = createNursingCharge.trim();
    const nursingCharge = nursingChargeTrim ? Number(nursingChargeTrim) : undefined;
    if (!createName.trim() || Number.isNaN(charge)) {
      setCreateError("Name and charge per day are required.");
      return;
    }
    if (nursingChargeTrim && Number.isNaN(nursingCharge)) {
      setCreateError("Nursing charge per day must be a valid number.");
      return;
    }
    try {
      setCreateSubmitting(true);
      setCreateError("");
      await axios.post(`${API_BASE_URL}/hospital/wards`, {
        name: createName.trim(),
        chargePerDay: charge,
        nursingChargePerDay: nursingCharge,
        description: createDescription.trim() || undefined,
        metadata: buildMetadata(createFloor, createWing),
      });
      setCreateModalOpen(false);
      await fetchWards();
    } catch (err: unknown) {
      const message =
        axios.isAxiosError(err) && err.response?.data?.message
          ? String(err.response.data.message)
          : "Failed to create ward.";
      setCreateError(message);
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!API_BASE_URL || !editingId) return;
    const charge = Number(editCharge);
    const nursingChargeTrim = editNursingCharge.trim();
    const nursingCharge = nursingChargeTrim ? Number(nursingChargeTrim) : undefined;
    if (!editName.trim() || Number.isNaN(charge)) {
      setEditError("Name and charge per day are required.");
      return;
    }
    if (nursingChargeTrim && Number.isNaN(nursingCharge)) {
      setEditError("Nursing charge per day must be a valid number.");
      return;
    }
    try {
      setEditSaving(true);
      setEditError("");
      await axios.put(`${API_BASE_URL}/hospital/wards/${editingId}`, {
        name: editName.trim(),
        chargePerDay: charge,
        nursingChargePerDay: nursingCharge,
        description: editDescription.trim() || undefined,
        metadata: buildMetadata(editFloor, editWing),
      });
      closePanels();
      setEditingId(null);
      await fetchWards();
    } catch (err: unknown) {
      const message =
        axios.isAxiosError(err) && err.response?.data?.message
          ? String(err.response.data.message)
          : "Failed to update ward.";
      setEditError(message);
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!API_BASE_URL) return;
    if (!window.confirm("Are you sure you want to delete this ward?")) return;
    try {
      setDeletingId(id);
      await axios.delete(`${API_BASE_URL}/hospital/wards/${id}`);
      await fetchWards();
    } catch (err: unknown) {
      const message =
        axios.isAxiosError(err) && err.response?.data?.message
          ? String(err.response.data.message)
          : "Failed to delete ward.";
      setError(message);
    } finally {
      setDeletingId(null);
    }
  };

  const columnTitle = (label: string) => <span className="text-dark">{label}</span>;

  const columns = [
    {
      title: columnTitle("Name"),
      dataIndex: "Name",
      sorter: false,
      render: (text: string) => renderCellText(text, true),
    },
    {
      title: columnTitle("Charge / Day"),
      dataIndex: "ChargePerDay",
      sorter: false,
      render: (text: string) => renderCellText(text),
    },
    {
      title: columnTitle("Nursing Charge / Day"),
      dataIndex: "NursingChargePerDay",
      sorter: false,
      render: (text: string) => renderCellText(text),
    },
    {
      title: columnTitle("Description"),
      dataIndex: "Description",
      sorter: false,
      render: (text: string) => renderCellText(text),
    },
    {
      title: columnTitle("Floor"),
      dataIndex: "Floor",
      sorter: false,
      render: (text: string) => renderCellText(text),
    },
    {
      title: columnTitle("Wing"),
      dataIndex: "Wing",
      sorter: false,
      render: (text: string) => renderCellText(text),
    },
    {
      title: columnTitle("Created On"),
      dataIndex: "CreatedOn",
      sorter: false,
      render: (text: string) => renderCellText(text),
    },
    {
      title: columnTitle("Actions"),
      dataIndex: "id",
      sorter: false,
      render: (_: unknown, record: IWardRow) => (
        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
            className="btn btn-link p-0 text-primary"
            onClick={() => openEditModal(record)}
            aria-label="Edit ward"
          >
            <i className="ti ti-edit fs-16" />
          </button>
          {isAdmin ? (
            <button
              type="button"
              className="btn btn-link p-0 text-danger"
              onClick={() => handleDelete(record.id)}
              disabled={deletingId === record.id}
              aria-label="Delete ward"
            >
              <i className="ti ti-trash fs-16" />
            </button>
          ) : null}
        </div>
      ),
    },
  ];

  const renderFormFields = (
    name: string,
    setName: (v: string) => void,
    charge: string,
    setCharge: (v: string) => void,
    nursingCharge: string,
    setNursingCharge: (v: string) => void,
    description: string,
    setDescription: (v: string) => void,
    floor: string,
    setFloor: (v: string) => void,
    wing: string,
    setWing: (v: string) => void
  ) => (
    <>
      <div className="mb-3">
        <label className="form-label fw-medium text-dark">
          Name<span className="text-danger ms-1">*</span>
        </label>
        <input
          type="text"
          className="form-control text-dark"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="General Ward A"
          required
        />
      </div>
      <div className="row">
        <div className="col-sm-6">
          <div className="mb-3">
            <label className="form-label fw-medium text-dark">
              Bed charge/day (₹)<span className="text-danger ms-1">*</span>
            </label>
            <input
              type="number"
              min={0}
              className="form-control text-dark"
              value={charge}
              onChange={(e) => setCharge(e.target.value)}
              placeholder="500"
              required
            />
          </div>
        </div>
        <div className="col-sm-6">
          <div className="mb-3">
            <label className="form-label fw-medium text-dark">Nursing charge/day (₹)</label>
            <input
              type="number"
              min={0}
              className="form-control text-dark"
              value={nursingCharge}
              onChange={(e) => setNursingCharge(e.target.value)}
              placeholder="200"
            />
          </div>
        </div>
      </div>
      <div className="mb-3">
        <label className="form-label fw-medium text-dark">Description</label>
        <textarea
          className="form-control text-dark"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ground floor general ward"
        />
      </div>
      <div className="row">
        <div className="col-sm-6">
          <div className="mb-3">
            <label className="form-label fw-medium text-dark">Floor</label>
            <input
              type="number"
              min={0}
              className="form-control text-dark"
              value={floor}
              onChange={(e) => setFloor(e.target.value)}
              placeholder="1"
            />
          </div>
        </div>
        <div className="col-sm-6">
          <div className="mb-3">
            <label className="form-label fw-medium text-dark">Wing</label>
            <input
              type="text"
              className="form-control text-dark"
              value={wing}
              onChange={(e) => setWing(e.target.value)}
              placeholder="East"
            />
          </div>
        </div>
      </div>
    </>
  );

  const offcanvasStyle = {
    visibility: "visible" as const,
    width: "min(640px, 100vw - 1rem)",
    zIndex: 1045,
    top: 0,
    right: 0,
    height: "100vh",
  };

  return (
    <div className="page-wrapper">
      <div className="content text-dark">
        <div className="d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-2 mb-3">
          <h4 className="fw-bold mb-0 text-dark">Wards</h4>
          <button type="button" className="btn btn-primary" onClick={openCreateModal}>
            <i className="ti ti-plus me-1" />
            Add Ward
          </button>
        </div>

        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        <div className="d-flex align-items-center flex-wrap gap-2 mb-3">
          <div className="table-search d-flex align-items-center mb-0">
            <div className="search-input">
              <SearchInput value={searchText} onChange={setSearchText} />
            </div>
          </div>
        </div>

        <div className="table-responsive wards-datatable text-dark">
          {loading ? (
            <p className="text-dark mb-0">Loading wards…</p>
          ) : (
            <Datatable columns={columns} dataSource={rows} Selection={false} searchText={searchText} />
          )}
        </div>
      </div>
      <div className="footer text-center bg-white p-2 border-top">
        <p className="text-dark mb-0">
          2025 ©
          <Link href="#" className="text-dark">
            Preclinic
          </Link>
          , All Rights Reserved
        </p>
      </div>

      {panelOpen && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100"
          style={{ zIndex: 1040, backgroundColor: "rgba(0, 0, 0, 0.5)" }}
          aria-hidden
          onClick={closePanels}
        />
      )}

      {createModalOpen && (
        <div
          className="offcanvas offcanvas-end show position-fixed d-flex flex-column"
          style={offcanvasStyle}
          tabIndex={-1}
          aria-modal="true"
          role="dialog"
          aria-labelledby="create-ward-title"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="offcanvas-header border-bottom">
            <h5 id="create-ward-title" className="offcanvas-title fw-bold text-dark">
              Add Ward
            </h5>
            <button type="button" className="btn-close" aria-label="Close" onClick={closePanels} />
          </div>
          <form onSubmit={handleCreateSubmit} className="d-flex flex-column flex-grow-1 min-h-0">
            <div className="offcanvas-body text-dark flex-grow-1 overflow-y-auto">
              {createError && (
                <div className="alert alert-danger py-2" role="alert">
                  {createError}
                </div>
              )}
              {renderFormFields(
                createName,
                setCreateName,
                createCharge,
                setCreateCharge,
                createNursingCharge,
                setCreateNursingCharge,
                createDescription,
                setCreateDescription,
                createFloor,
                setCreateFloor,
                createWing,
                setCreateWing
              )}
            </div>
            <div className="offcanvas-footer border-top d-flex justify-content-end gap-2 p-3">
              <button type="button" className="btn btn-light" onClick={closePanels} disabled={createSubmitting}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={createSubmitting}>
                {createSubmitting ? "Creating…" : "Create Ward"}
              </button>
            </div>
          </form>
        </div>
      )}

      {editModalOpen && (
        <div
          className="offcanvas offcanvas-end show position-fixed d-flex flex-column"
          style={offcanvasStyle}
          tabIndex={-1}
          aria-modal="true"
          role="dialog"
          aria-labelledby="edit-ward-title"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="offcanvas-header border-bottom">
            <h5 id="edit-ward-title" className="offcanvas-title fw-bold text-dark">
              Edit Ward
            </h5>
            <button type="button" className="btn-close" aria-label="Close" onClick={closePanels} />
          </div>
          <form onSubmit={handleEditSubmit} className="d-flex flex-column flex-grow-1 min-h-0">
            <div className="offcanvas-body text-dark flex-grow-1 overflow-y-auto">
              {editError && (
                <div className="alert alert-danger py-2" role="alert">
                  {editError}
                </div>
              )}
              {renderFormFields(
                editName,
                setEditName,
                editCharge,
                setEditCharge,
                editNursingCharge,
                setEditNursingCharge,
                editDescription,
                setEditDescription,
                editFloor,
                setEditFloor,
                editWing,
                setEditWing
              )}
            </div>
            <div className="offcanvas-footer border-top d-flex justify-content-end gap-2 p-3">
              <button type="button" className="btn btn-light" onClick={closePanels} disabled={editSaving}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={editSaving}>
                {editSaving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default WardsListComponent;
