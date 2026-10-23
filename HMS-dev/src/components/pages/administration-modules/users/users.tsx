"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Datatable from "@/core/common/dataTable";
import SearchInput from "@/core/common/dataTable/dataTableSearch";
import axios from "axios";
import { API_BASE_URL } from "@/environment";
import CommonSelect, { type Option } from "@/core/common/common-select/commonSelect";

const ROLE_OPTIONS: Option[] = [
  { value: "ADMIN", label: "Admin" },
  { value: "ABDM_ADMIN", label: "ABDM Admin" },
  { value: "ACCOUNTANT", label: "Accountant" },
  { value: "RECEPTIONIST", label: "Receptionist" },
  { value: "RECEPTIONIST2", label: "Receptionist 2" },
  { value: "DIALYSIS", label: "Dialysis" },
  { value: "PHARMACIST", label: "Pharmacist" },
  { value: "XRAY", label: "Xray" },
];

const normalizeRoleValue = (roleDisplay: string): string => {
  const r = roleDisplay?.trim() ?? "";
  if (r === "—" || !r) return "RECEPTIONIST";
  const upper = r.toUpperCase().replace(/\s+/g, "_");
  const match = ROLE_OPTIONS.find((o) => o.value === upper);
  if (match) return match.value;
  const byLabel = ROLE_OPTIONS.find((o) => o.label.toLowerCase() === r.toLowerCase());
  return byLabel?.value ?? "RECEPTIONIST";
};

interface IRow {
  id: string;
  Name: string;
  Email: string;
  Role: string;
  Status: string;
  CreatedOn: string;
}

const UsersListComponent = () => {
  const [rows, setRows] = useState<IRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [searchText, setSearchText] = useState<string>("");
  const [editModalOpen, setEditModalOpen] = useState<boolean>(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editName, setEditName] = useState<string>("");
  const [editRole, setEditRole] = useState<string>("RECEPTIONIST");
  const [editEmail, setEditEmail] = useState<string>("");
  const [editPassword, setEditPassword] = useState<string>("");
  const [editIsActive, setEditIsActive] = useState<boolean>(true);
  const [editSaving, setEditSaving] = useState<boolean>(false);
  const [editError, setEditError] = useState<string>("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);
  const [createName, setCreateName] = useState<string>("");
  const [createEmail, setCreateEmail] = useState<string>("");
  const [createPassword, setCreatePassword] = useState<string>("");
  const [createRole, setCreateRole] = useState<string>("RECEPTIONIST");
  const [createSubmitting, setCreateSubmitting] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string>("");

  const fetchUsers = async () => {
    if (!API_BASE_URL) return;
    try {
      setLoading(true);
      setError("");
      const res = await axios.get(`${API_BASE_URL}/hospital/users`, {
        params: { limit: 20, page: 1 },
      });
      const raw = res.data?.data ?? res.data;
      const list: any[] = Array.isArray(raw?.users)
        ? raw.users
        : Array.isArray(raw)
        ? raw
        : [];

      const mapped: IRow[] = list.map((u) => ({
        id: u._id,
        Name: u.name || u.username || "—",
        Email: u.email || "—",
        Role: u.role || "—",
        Status:
          typeof u.isActive === "boolean"
            ? u.isActive
              ? "Active"
              : "Inactive"
            : u.status || "Active",
        CreatedOn: u.createdAt
          ? new Date(u.createdAt).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
          : "—",
      }));
      setRows(mapped);
    } catch (err: any) {
      console.error("Error fetching users:", err);
      setError(err?.response?.data?.message || "Failed to load users.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
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

  const openCreateModal = () => {
    setCreateName("");
    setCreateEmail("");
    setCreatePassword("");
    setCreateRole("RECEPTIONIST");
    setCreateError("");
    setCreateSubmitting(false);
    setEditModalOpen(false);
    setCreateModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!API_BASE_URL) return;
    try {
      setCreateSubmitting(true);
      setCreateError("");
      await axios.post(`${API_BASE_URL}/hospital/users`, {
        password: createPassword,
        name: createName,
        email: createEmail,
        role: createRole,
      });
      setCreateModalOpen(false);
      await fetchUsers();
    } catch (err: any) {
      console.error("Error creating user:", err);
      setCreateError(err?.response?.data?.message || "Failed to create user.");
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchText(value);
  };

  const handleDelete = async (id: string) => {
    if (!API_BASE_URL) return;
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      setDeletingId(id);
      await axios.delete(`${API_BASE_URL}/hospital/users/${id}`);
      await fetchUsers();
    } catch (err: any) {
      console.error("Error deleting user:", err);
      setError(err?.response?.data?.message || "Failed to delete user.");
    } finally {
      setDeletingId(null);
    }
  };

  const openEditModal = (record: IRow) => {
    setCreateModalOpen(false);
    setEditingUserId(record.id);
    setEditName(record.Name);
    setEditRole(normalizeRoleValue(record.Role));
    setEditEmail(record.Email !== "—" ? record.Email : "");
    setEditPassword("");
    setEditIsActive(record.Status === "Active");
    setEditError("");
    setEditSaving(false);
    setEditModalOpen(true);
  };

  const closePanels = () => {
    setEditModalOpen(false);
    setCreateModalOpen(false);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!API_BASE_URL || !editingUserId) return;
    try {
      setEditSaving(true);
      setEditError("");
      const payload: Record<string, unknown> = {
        name: editName,
        email: editEmail,
        role: editRole,
        isActive: editIsActive,
      };
      const trimmedPw = editPassword.trim();
      if (trimmedPw) payload.password = trimmedPw;

      await axios.patch(`${API_BASE_URL}/hospital/users/${editingUserId}`, payload);
      closePanels();
      setEditingUserId(null);
      await fetchUsers();
    } catch (err: any) {
      console.error("Error updating user:", err);
      setEditError(err?.response?.data?.message || "Failed to update user.");
    } finally {
      setEditSaving(false);
    }
  };

  const columns = [
    {
      title: "Name",
      dataIndex: "Name",
      sorter: (a: IRow, b: IRow) => a.Name.localeCompare(b.Name),
      render: (text: string) => (
        <span className="fw-semibold text-dark">{text}</span>
      ),
    },
    {
      title: "Email",
      dataIndex: "Email",
      sorter: false,
    },
    {
      title: "Role",
      dataIndex: "Role",
      sorter: false,
    },
    {
      title: "Status",
      dataIndex: "Status",
      sorter: false,
      render: (text: string) => (
        <span
          className={`badge border px-2 py-1 fs-13 fw-medium ${
            text === "Active"
              ? "badge-soft-success border-success"
              : "badge-soft-secondary border-secondary"
          }`}
        >
          {text}
        </span>
      ),
    },
    {
      title: "Created On",
      dataIndex: "CreatedOn",
      sorter: false,
    },
    {
      title: "Actions",
      dataIndex: "id",
      sorter: false,
      render: (_: unknown, record: IRow) => (
        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
            className="btn btn-link p-0 text-primary"
            onClick={() => openEditModal(record)}
          >
            <i className="ti ti-edit fs-16" />
          </button>
          <button
            type="button"
            className="btn btn-link p-0 text-danger"
            onClick={() => handleDelete(record.id)}
            disabled={deletingId === record.id}
          >
            <i className="ti ti-trash fs-16" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="page-wrapper">
      <div className="content">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h4 className="fw-bold mb-0">Users</h4>
          <button type="button" className="btn btn-primary" onClick={openCreateModal}>
            <i className="ti ti-plus me-1" />
            Create User
          </button>
        </div>

        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        <div className="d-flex align-items-center justify-content-between flex-wrap row-gap-3 mb-3">
          <div className="search-set">
            <div className="d-flex align-items-center flex-wrap gap-2">
              <div className="table-search d-flex align-items-center mb-0">
                <div className="search-input">
                  <SearchInput value={searchText} onChange={handleSearch} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="table-responsive">
          {loading ? (
            <p className="text-muted mb-0">Loading users…</p>
          ) : (
            <Datatable
              columns={columns}
              dataSource={rows}
              Selection={false}
              searchText={searchText}
            />
          )}
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
      {panelOpen && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100"
          style={{ zIndex: 1040, backgroundColor: "rgba(0, 0, 0, 0.5)" }}
          aria-hidden
          onClick={closePanels}
        />
      )}
      {editModalOpen && (
        <div
          className="offcanvas offcanvas-end show position-fixed"
          style={{
            visibility: "visible",
            width: "min(640px, 100vw - 1rem)",
            zIndex: 1045,
            top: 0,
            right: 0,
            height: "100vh",
          }}
          tabIndex={-1}
          aria-modal="true"
          role="dialog"
          aria-labelledby="edit-user-panel-title"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="offcanvas-header border-bottom">
            <h5 id="edit-user-panel-title" className="offcanvas-title fw-bold">
              Edit User
            </h5>
            <button
              type="button"
              className="btn-close text-reset"
              aria-label="Close"
              onClick={closePanels}
            />
          </div>
          <form onSubmit={handleEditSubmit}>
            <div className="offcanvas-body">
              {editError && (
                <div className="alert alert-danger py-2" role="alert">
                  {editError}
                </div>
              )}
              <div className="row">
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label fw-medium">
                      Name<span className="text-danger ms-1">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label fw-medium">
                      Role<span className="text-danger ms-1">*</span>
                    </label>
                    <CommonSelect
                      options={ROLE_OPTIONS}
                      value={
                        ROLE_OPTIONS.find((o) => o.value === editRole) ??
                        ROLE_OPTIONS.find((o) => o.value === "RECEPTIONIST") ??
                        null
                      }
                      onChange={(opt) => setEditRole(opt?.value ?? "RECEPTIONIST")}
                      placeholder="Select role"
                      className="w-100"
                    />
                  </div>
                </div>
              </div>
              <div className="row">
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label fw-medium">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label fw-medium">New password</label>
                    <input
                      type="password"
                      className="form-control"
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      placeholder="Leave blank to keep current password"
                      autoComplete="new-password"
                    />
                  </div>
                </div>
              </div>
              <div className="form-check mb-0">
                <input
                  id="edit-user-active"
                  type="checkbox"
                  className="form-check-input"
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                />
                <label
                  className="form-check-label ms-1"
                  htmlFor="edit-user-active"
                >
                  Active
                </label>
              </div>
            </div>
            <div className="offcanvas-footer border-top d-flex justify-content-end gap-2 p-3">
              <button
                type="button"
                className="btn btn-light"
                onClick={closePanels}
                disabled={editSaving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={editSaving}
              >
                {editSaving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}
      {createModalOpen && (
        <div
          className="offcanvas offcanvas-end show position-fixed"
          style={{
            visibility: "visible",
            width: "min(640px, 100vw - 1rem)",
            zIndex: 1045,
            top: 0,
            right: 0,
            height: "100vh",
          }}
          tabIndex={-1}
          aria-modal="true"
          role="dialog"
          aria-labelledby="create-user-panel-title"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="offcanvas-header border-bottom">
            <h5 id="create-user-panel-title" className="offcanvas-title fw-bold">
              Create User
            </h5>
            <button
              type="button"
              className="btn-close text-reset"
              aria-label="Close"
              onClick={closePanels}
            />
          </div>
          <form onSubmit={handleCreateSubmit}>
            <div className="offcanvas-body">
              {createError && (
                <div className="alert alert-danger py-2" role="alert">
                  {createError}
                </div>
              )}
              <div className="row">
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label fw-medium">
                      Name<span className="text-danger ms-1">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={createName}
                      onChange={(e) => setCreateName(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label fw-medium">
                      Role<span className="text-danger ms-1">*</span>
                    </label>
                    <CommonSelect
                      options={ROLE_OPTIONS}
                      value={
                        ROLE_OPTIONS.find((o) => o.value === createRole) ??
                        ROLE_OPTIONS.find((o) => o.value === "RECEPTIONIST") ??
                        null
                      }
                      onChange={(opt) => setCreateRole(opt?.value ?? "RECEPTIONIST")}
                      placeholder="Select role"
                      className="w-100"
                    />
                  </div>
                </div>
              </div>
              <div className="row">
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label fw-medium">
                      Email<span className="text-danger ms-1">*</span>
                    </label>
                    <input
                      type="email"
                      className="form-control"
                      value={createEmail}
                      onChange={(e) => setCreateEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label fw-medium">
                      Password<span className="text-danger ms-1">*</span>
                    </label>
                    <input
                      type="password"
                      className="form-control"
                      value={createPassword}
                      onChange={(e) => setCreatePassword(e.target.value)}
                      required
                      autoComplete="new-password"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="offcanvas-footer border-top d-flex justify-content-end gap-2 p-3">
              <button
                type="button"
                className="btn btn-light"
                onClick={closePanels}
                disabled={createSubmitting}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={createSubmitting}>
                {createSubmitting ? "Creating…" : "Create User"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default UsersListComponent;

