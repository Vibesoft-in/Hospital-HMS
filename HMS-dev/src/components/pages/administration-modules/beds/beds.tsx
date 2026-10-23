"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Datatable from "@/core/common/dataTable";
import CommonSelect, { type Option } from "@/core/common/common-select/commonSelect";
import { isAdminRole } from "@/core/auth/roleAccess";
import axios from "axios";
import { API_BASE_URL } from "@/environment";
import IpdBedSelectionStep from "@/components/pages/clinic-modules/ipd-appointments/ipd-bed-selection/IpdBedSelectionStep";
import {
  fetchIpdBedBlockView,
  fetchIpdWardOptions,
  type IIpdWardOption,
} from "@/components/pages/clinic-modules/ipd-appointments/ipd-bed-selection/fetchIpdBedBlockView";
import type { IIpdBed, IIpdBedBlockViewData } from "@/components/pages/clinic-modules/ipd-appointments/ipd-bed-selection/ipdBedTypes";

type BedTab = "map" | "list";

interface IWardOption {
  _id: string;
  name?: string;
}

interface ICurrentPatientDetails {
  name?: string;
  mrd?: string;
  ipdId?: string;
  contact?: string;
  admittedAt?: string;
}

interface IBedApi {
  _id: string;
  bedId?: string;
  bedNumber?: string;
  bedCode?: string;
  wardId?: string | { _id?: string; name?: string };
  ward?: { _id?: string; name?: string };
  status?: string;
  currentPatientDetails?: ICurrentPatientDetails | null;
}

interface IBedRow {
  id: string;
  BedNumber: string;
  Ward: string;
  WardId: string;
  Status: string;
  PatientName: string;
  Contact: string;
  Mrd: string;
}

const BED_STATUS_OPTIONS: Option[] = [
  { value: "Available", label: "Available" },
  { value: "Occupied", label: "Occupied" },
  { value: "Reserved", label: "Reserved" },
  { value: "Maintenance", label: "Maintenance" },
];

const normalizeBedStatusForApi = (raw?: string): string => {
  const key = raw?.trim().toLowerCase() ?? "";
  const map: Record<string, string> = {
    available: "Available",
    occupied: "Occupied",
    reserved: "Reserved",
    maintenance: "Maintenance",
  };
  return map[key] ?? "Available";
};

const BedsListComponent = () => {
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
  const [activeTab, setActiveTab] = useState<BedTab>("list");

  const [rows, setRows] = useState<IBedRow[]>([]);
  const [wardOptions, setWardOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filterWardId, setFilterWardId] = useState<string>("");
  const [appliedWardId, setAppliedWardId] = useState<string>("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);

  const [bedBlockData, setBedBlockData] = useState<IIpdBedBlockViewData | null>(null);
  const [bedMapWardOptions, setBedMapWardOptions] = useState<IIpdWardOption[]>([]);
  const [bedMapWardFilter, setBedMapWardFilter] = useState<string | null>(null);
  const [bedMapLoading, setBedMapLoading] = useState(false);
  const [bedMapWardsLoading, setBedMapWardsLoading] = useState(false);
  const [bedMapError, setBedMapError] = useState("");

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createBedNumber, setCreateBedNumber] = useState("");
  const [createWardId, setCreateWardId] = useState("");
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState("");

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBedNumber, setEditBedNumber] = useState("");
  const [editWardId, setEditWardId] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const wardSelectOptions = useMemo(
    () => wardOptions,
    [wardOptions]
  );

  const wardFilterOptions = useMemo(
    () => [{ value: "", label: "All Wards" }, ...wardOptions],
    [wardOptions]
  );

  const resolveWardName = (bed: IBedApi, wardNameById: Map<string, string>) => {
    if (bed.ward?.name) return bed.ward.name;
    const wardIdRaw = bed.wardId;
    if (wardIdRaw && typeof wardIdRaw === "object" && wardIdRaw.name) return wardIdRaw.name;
    const id =
      typeof wardIdRaw === "string"
        ? wardIdRaw
        : wardIdRaw?._id ?? bed.ward?._id ?? "";
    return id ? wardNameById.get(id) ?? "—" : "—";
  };

  const resolveWardId = (bed: IBedApi) => {
    if (typeof bed.wardId === "string") return bed.wardId;
    if (bed.wardId && typeof bed.wardId === "object" && bed.wardId._id) return bed.wardId._id;
    return bed.ward?._id ?? "";
  };

  const fetchWardsForSelect = async () => {
    if (!API_BASE_URL) return;
    try {
      const res = await axios.get(`${API_BASE_URL}/hospital/wards`, {
        params: { limit: 200, page: 1 },
      });
      const raw = res.data?.data ?? res.data;
      const list: IWardOption[] = Array.isArray(raw?.wards)
        ? raw.wards
        : Array.isArray(raw)
          ? raw
          : [];
      setWardOptions(
        list.map((w) => ({
          value: w._id,
          label: w.name?.trim() || w._id,
        }))
      );
    } catch {
      setWardOptions([]);
    }
  };

  const fetchBeds = async (silent = false) => {
    if (!API_BASE_URL) return;
    try {
      if (!silent) setLoading(true);
      setError("");
      const params: Record<string, string | number> = { limit: 200, page: 1 };
      if (appliedWardId) {
        params.wardId = appliedWardId;
      }
      const [bedsRes, wardsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/hospital/beds`, { params }),
        axios.get(`${API_BASE_URL}/hospital/wards`, { params: { limit: 200, page: 1 } }),
      ]);

      const wardsRaw = wardsRes.data?.data ?? wardsRes.data;
      const wardsList: IWardOption[] = Array.isArray(wardsRaw?.wards)
        ? wardsRaw.wards
        : Array.isArray(wardsRaw)
          ? wardsRaw
          : [];
      const wardNameById = new Map(
        wardsList.map((w) => [w._id, w.name?.trim() || w._id])
      );

      const bedsRaw = bedsRes.data?.data ?? bedsRes.data;
      const list: IBedApi[] = Array.isArray(bedsRaw?.beds)
        ? bedsRaw.beds
        : Array.isArray(bedsRaw)
          ? bedsRaw
          : [];

      setRows(
        list.map((b) => {
          const wardId = resolveWardId(b);
          const status = normalizeBedStatusForApi(b.status);
          const patient = b.currentPatientDetails;
          return {
            id: b._id,
            BedNumber:
              b.bedNumber?.trim() || b.bedId?.trim() || b.bedCode?.trim() || "—",
            Ward: resolveWardName(b, wardNameById),
            WardId: wardId,
            Status: status,
            PatientName: patient?.name?.trim() || "—",
            Contact: patient?.contact?.trim() || "—",
            Mrd: patient?.mrd?.trim() || "—",
          };
        })
      );
    } catch (err: unknown) {
      const message =
        axios.isAxiosError(err) && err.response?.data?.message
          ? String(err.response.data.message)
          : "Failed to load beds.";
      setError(message);
      setRows([]);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const loadBedMap = useCallback(async (wardId?: string | null) => {
    setBedMapLoading(true);
    setBedMapError("");
    try {
      const data = await fetchIpdBedBlockView(wardId);
      setBedBlockData(data);
    } catch {
      setBedMapError("Failed to load bed map.");
    } finally {
      setBedMapLoading(false);
    }
  }, []);

  const loadBedMapWards = useCallback(async () => {
    setBedMapWardsLoading(true);
    try {
      const opts = await fetchIpdWardOptions();
      setBedMapWardOptions(opts);
    } catch {
      setBedMapWardOptions([]);
    } finally {
      setBedMapWardsLoading(false);
    }
  }, []);

  const handleBedMapWardFilter = useCallback(
    (wardId: string | null) => {
      setBedMapWardFilter(wardId);
      void loadBedMap(wardId);
    },
    [loadBedMap]
  );

  const handleWardFilterChange = (option: Option | null) => {
    setFilterWardId(option?.value ?? "");
  };

  const handleApplyWardFilter = () => {
    setAppliedWardId(filterWardId);
  };

  useEffect(() => {
    fetchWardsForSelect();
    void loadBedMap();
    void loadBedMapWards();
  }, []);

  useEffect(() => {
    void fetchBeds();
  }, [appliedWardId]);

  const handleBedMapRefresh = useCallback(() => {
    void loadBedMap(bedMapWardFilter);
  }, [loadBedMap, bedMapWardFilter]);

  const handleBedMapNoOp = useCallback((_bed: IIpdBed) => {}, []);

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
    setCreateBedNumber("");
    setCreateWardId(wardSelectOptions[0]?.value ?? "");
    setCreateError("");
    setEditModalOpen(false);
    setCreateModalOpen(true);
  };

  const openEditModal = (record: IBedRow) => {
    setCreateModalOpen(false);
    setEditingId(record.id);
    setEditBedNumber(record.BedNumber !== "—" ? record.BedNumber : "");
    setEditWardId(record.WardId || wardSelectOptions[0]?.value || "");
    setEditError("");
    setEditModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!API_BASE_URL) return;
    if (!createBedNumber.trim() || !createWardId) {
      setCreateError("Bed number and ward are required.");
      return;
    }
    try {
      setCreateSubmitting(true);
      setCreateError("");
      await axios.post(`${API_BASE_URL}/hospital/beds`, {
        bedNumber: createBedNumber.trim(),
        wardId: createWardId,
      });
      setCreateModalOpen(false);
      await fetchBeds();
      void loadBedMap(bedMapWardFilter);
    } catch (err: unknown) {
      const message =
        axios.isAxiosError(err) && err.response?.data?.message
          ? String(err.response.data.message)
          : "Failed to create bed.";
      setCreateError(message);
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!API_BASE_URL || !editingId) return;
    if (!editBedNumber.trim() || !editWardId) {
      setEditError("Bed number and ward are required.");
      return;
    }
    try {
      setEditSaving(true);
      setEditError("");
      await axios.put(`${API_BASE_URL}/hospital/beds/${editingId}`, {
        bedNumber: editBedNumber.trim(),
        wardId: editWardId,
      });
      closePanels();
      setEditingId(null);
      await fetchBeds();
      void loadBedMap(bedMapWardFilter);
    } catch (err: unknown) {
      const message =
        axios.isAxiosError(err) && err.response?.data?.message
          ? String(err.response.data.message)
          : "Failed to update bed.";
      setEditError(message);
    } finally {
      setEditSaving(false);
    }
  };

  const handleStatusChange = async (bedId: string, newStatus: string) => {
    if (!API_BASE_URL) return;
    const previous = rows.find((r) => r.id === bedId);
    if (!previous || previous.Status === newStatus) return;

    setStatusUpdatingId(bedId);
    setRows((current) =>
      current.map((r) => (r.id === bedId ? { ...r, Status: newStatus } : r))
    );

    try {
      await axios.put(`${API_BASE_URL}/hospital/beds/${bedId}`, {
        status: newStatus,
      });
      await fetchBeds(true);
      void loadBedMap(bedMapWardFilter);
    } catch (err: unknown) {
      setRows((current) =>
        current.map((r) =>
          r.id === bedId ? { ...r, Status: previous.Status } : r
        )
      );
      const message =
        axios.isAxiosError(err) && err.response?.data?.message
          ? String(err.response.data.message)
          : "Failed to update bed status.";
      setError(message);
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!API_BASE_URL) return;
    if (!window.confirm("Are you sure you want to delete this bed?")) return;
    try {
      setDeletingId(id);
      await axios.delete(`${API_BASE_URL}/hospital/beds/${id}`);
      await fetchBeds();
      void loadBedMap(bedMapWardFilter);
    } catch (err: unknown) {
      const message =
        axios.isAxiosError(err) && err.response?.data?.message
          ? String(err.response.data.message)
          : "Failed to delete bed.";
      setError(message);
    } finally {
      setDeletingId(null);
    }
  };

  const columns = [
    {
      title: "Bed Number",
      dataIndex: "BedNumber",
      sorter: false,
      render: (text: string) => <span className="fw-semibold text-dark">{text}</span>,
    },
    {
      title: "Ward",
      dataIndex: "Ward",
      sorter: false,
      render: (text: string) => <span className="text-dark">{text}</span>,
    },
    {
      title: "Patient Name",
      dataIndex: "PatientName",
      sorter: false,
      render: (text: string, record: IBedRow) =>
        text !== "—" ? (
          <div className="d-flex flex-column">
            <span className="fw-medium text-dark">{text}</span>
            {record.Contact !== "—" && (
              <span className="text-dark fs-13 mt-1">{record.Contact}</span>
            )}
          </div>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
    {
      title: "MRD No.",
      dataIndex: "Mrd",
      sorter: false,
      render: (text: string) =>
        text !== "—" ? (
          <span className="text-dark">{text}</span>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
    {
      title: "Maintenance",
      dataIndex: "Status",
      sorter: false,
      render: (text: string, record: IBedRow) => {
        const isMaintenance = text === "Maintenance";
        const isUpdating = statusUpdatingId === record.id;
        return (
          <div
            className="d-inline-block"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="form-check form-switch mb-0">
              <input
                type="checkbox"
                role="switch"
                className="form-check-input"
                checked={isMaintenance}
                disabled={isUpdating}
                onChange={() => {
                  void handleStatusChange(record.id, isMaintenance ? "Available" : "Maintenance");
                }}
                aria-label={`Toggle maintenance for ${record.BedNumber}`}
              />
            </div>
          </div>
        );
      },
    },
    {
      title: "Actions",
      dataIndex: "id",
      sorter: false,
      render: (_: unknown, record: IBedRow) => (
        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
            className="btn btn-link p-0 text-primary"
            onClick={() => openEditModal(record)}
            aria-label="Edit bed"
          >
            <i className="ti ti-edit fs-16" />
          </button>
          {isAdmin ? (
            <button
              type="button"
              className="btn btn-link p-0 text-danger"
              onClick={() => handleDelete(record.id)}
              disabled={deletingId === record.id}
              aria-label="Delete bed"
            >
              <i className="ti ti-trash fs-16" />
            </button>
          ) : null}
        </div>
      ),
    },
  ];

  const selectedWardOption = (wardId: string) =>
    wardSelectOptions.find((o) => o.value === wardId) ?? null;

  const offcanvasStyle = {
    visibility: "visible" as const,
    width: "min(480px, 100vw - 1rem)",
    zIndex: 1045,
    top: 0,
    right: 0,
    height: "100vh",
  };

  const bedForm = (
    bedNumber: string,
    setBedNumber: (v: string) => void,
    wardId: string,
    setWardId: (v: string) => void
  ) => (
    <>
      <div className="mb-3">
        <label className="form-label fw-medium">
          Bed number<span className="text-danger ms-1">*</span>
        </label>
        <input
          type="text"
          className="form-control"
          value={bedNumber}
          onChange={(e) => setBedNumber(e.target.value)}
          placeholder="GA-101"
          required
        />
      </div>
      <div className="mb-3">
        <label className="form-label fw-medium">
          Ward<span className="text-danger ms-1">*</span>
        </label>
        {wardSelectOptions.length ? (
          <CommonSelect
            options={wardSelectOptions}
            value={selectedWardOption(wardId)}
            onChange={(opt) => setWardId(opt?.value ?? "")}
            placeholder="Select ward"
            className="w-100"
          />
        ) : (
          <p className="text-muted small mb-0">
            No wards found. Create a ward first from the Wards page.
          </p>
        )}
      </div>
    </>
  );

  return (
    <div className="page-wrapper">
      <div className="content">
        <div className="d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-2 mb-3">
          <h4 className="fw-bold mb-0">Beds</h4>
          <button
            type="button"
            className="btn btn-primary"
            onClick={openCreateModal}
            disabled={!wardSelectOptions.length}
          >
            <i className="ti ti-plus me-1" />
            Add Bed
          </button>
        </div>

        <div className="d-flex align-items-center justify-content-between flex-wrap row-gap-3 mb-3">
          <ul className="nav nav-tabs border-0 mb-0 flex-shrink-0" role="tablist">
            <li className="nav-item" role="presentation">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "map"}
                className={`nav-link d-flex align-items-center gap-1 ${activeTab === "map" ? "active" : ""}`}
                onClick={() => setActiveTab("map")}
              >
                <i className="ti ti-layout-grid fs-16" />
                Bed Map
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "list"}
                className={`nav-link d-flex align-items-center gap-1 ${activeTab === "list" ? "active" : ""}`}
                onClick={() => setActiveTab("list")}
              >
                <i className="ti ti-list fs-16" />
                List
              </button>
            </li>
          </ul>
          {activeTab === "list" ? (
            <div className="d-flex align-items-center flex-nowrap gap-2 ms-auto">
              <div className="flex-shrink-0" style={{ width: "150px" }}>
                <CommonSelect
                  options={wardFilterOptions}
                  value={
                    wardFilterOptions.find((o) => o.value === filterWardId) ??
                    wardFilterOptions[0] ??
                    null
                  }
                  onChange={handleWardFilterChange}
                  placeholder="All Wards"
                  className="w-100"
                />
              </div>
              <button
                type="button"
                className="btn btn-primary btn-sm fw-medium flex-shrink-0"
                onClick={handleApplyWardFilter}
              >
                Filter
              </button>
            </div>
          ) : null}
        </div>

        {activeTab === "map" ? (
          <div className="card border shadow-none mb-0">
            <div className="card-body p-0">
              <IpdBedSelectionStep
                data={bedBlockData}
                loading={bedMapLoading}
                error={bedMapError}
                selectedBedId={null}
                onSelectBed={handleBedMapNoOp}
                wardOptions={bedMapWardOptions}
                selectedWardId={bedMapWardFilter}
                onWardFilterChange={handleBedMapWardFilter}
                wardsLoading={bedMapWardsLoading}
                wardGridCols={3}
              />
            </div>
          </div>
        ) : (
          <>
            {error && (
              <div className="alert alert-danger" role="alert">
                {error}
              </div>
            )}

            <div className="table-responsive">
              {loading ? (
                <p className="text-muted mb-0">Loading beds…</p>
              ) : (
                <Datatable columns={columns} dataSource={rows} Selection={false} searchText="" />
              )}
            </div>
          </>
        )}
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
          className="offcanvas offcanvas-end show position-fixed"
          style={offcanvasStyle}
          tabIndex={-1}
          aria-modal="true"
          role="dialog"
          aria-labelledby="create-bed-title"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="offcanvas-header border-bottom">
            <h5 id="create-bed-title" className="offcanvas-title fw-bold">
              Add Bed
            </h5>
            <button type="button" className="btn-close" aria-label="Close" onClick={closePanels} />
          </div>
          <form onSubmit={handleCreateSubmit}>
            <div className="offcanvas-body">
              {createError && (
                <div className="alert alert-danger py-2" role="alert">
                  {createError}
                </div>
              )}
              {bedForm(createBedNumber, setCreateBedNumber, createWardId, setCreateWardId)}
            </div>
            <div className="offcanvas-footer border-top d-flex justify-content-end gap-2 p-3">
              <button type="button" className="btn btn-light" onClick={closePanels} disabled={createSubmitting}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={createSubmitting || !wardSelectOptions.length}
              >
                {createSubmitting ? "Creating…" : "Create Bed"}
              </button>
            </div>
          </form>
        </div>
      )}

      {editModalOpen && (
        <div
          className="offcanvas offcanvas-end show position-fixed"
          style={offcanvasStyle}
          tabIndex={-1}
          aria-modal="true"
          role="dialog"
          aria-labelledby="edit-bed-title"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="offcanvas-header border-bottom">
            <h5 id="edit-bed-title" className="offcanvas-title fw-bold">
              Edit Bed
            </h5>
            <button type="button" className="btn-close" aria-label="Close" onClick={closePanels} />
          </div>
          <form onSubmit={handleEditSubmit}>
            <div className="offcanvas-body">
              {editError && (
                <div className="alert alert-danger py-2" role="alert">
                  {editError}
                </div>
              )}
              {bedForm(editBedNumber, setEditBedNumber, editWardId, setEditWardId)}
            </div>
            <div className="offcanvas-footer border-top d-flex justify-content-end gap-2 p-3">
              <button type="button" className="btn btn-light" onClick={closePanels} disabled={editSaving}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={editSaving || !wardSelectOptions.length}
              >
                {editSaving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default BedsListComponent;
