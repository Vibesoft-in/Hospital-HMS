"use client";

import { useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "@/environment";

interface IChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: "account" | "dashboard";
  onDashboardPasswordUpdated?: (newPassword?: string) => void;
}

export default function ChangePasswordModal({
  isOpen,
  onClose,
  defaultTab = "dashboard",
  onDashboardPasswordUpdated,
}: IChangePasswordModalProps) {
  const [activeTab, setActiveTab] = useState<"account" | "dashboard">(defaultTab);

  // Account Password State
  const [currentAccountPassword, setCurrentAccountPassword] = useState("");
  const [newAccountPassword, setNewAccountPassword] = useState("");
  const [confirmAccountPassword, setConfirmAccountPassword] = useState("");
  const [showAccountPass, setShowAccountPass] = useState(false);
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [accountSuccess, setAccountSuccess] = useState<string | null>(null);

  // Dashboard Password State
  const [currentDashboardPassword, setCurrentDashboardPassword] = useState("");
  const [newDashboardPassword, setNewDashboardPassword] = useState("");
  const [confirmDashboardPassword, setConfirmDashboardPassword] = useState("");
  const [showDashboardPass, setShowDashboardPass] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [dashboardSuccess, setDashboardSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccountError(null);
    setAccountSuccess(null);

    if (!currentAccountPassword) {
      setAccountError("Please enter your current account password.");
      return;
    }
    if (newAccountPassword.length < 8) {
      setAccountError("New password must be at least 8 characters long.");
      return;
    }
    if (newAccountPassword !== confirmAccountPassword) {
      setAccountError("New passwords do not match.");
      return;
    }

    setAccountLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/hospital/auth/me/change-password`, {
        currentPassword: currentAccountPassword,
        newPassword: newAccountPassword,
      });

      setAccountSuccess("Account password changed successfully!");
      setCurrentAccountPassword("");
      setNewAccountPassword("");
      setConfirmAccountPassword("");
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to change account password. Please try again.";
      setAccountError(msg);
    } finally {
      setAccountLoading(false);
    }
  };

  const handleDashboardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDashboardError(null);
    setDashboardSuccess(null);

    if (newDashboardPassword.length < 4) {
      setDashboardError("New dashboard password must be at least 4 characters long.");
      return;
    }
    if (newDashboardPassword !== confirmDashboardPassword) {
      setDashboardError("New dashboard passwords do not match.");
      return;
    }

    setDashboardLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/hospital/dashboard/change-password`, {
        currentPassword: currentDashboardPassword.trim() || undefined,
        newPassword: newDashboardPassword.trim(),
      });

      setDashboardSuccess("Dashboard password updated successfully!");
      if (onDashboardPasswordUpdated) {
        onDashboardPasswordUpdated(newDashboardPassword.trim());
      }
      setCurrentDashboardPassword("");
      setNewDashboardPassword("");
      setConfirmDashboardPassword("");
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to change dashboard password. Please verify your current password.";
      setDashboardError(msg);
    } finally {
      setDashboardLoading(false);
    }
  };

  return (
    <div
      className="modal fade show d-block"
      tabIndex={-1}
      style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1060 }}
    >
      <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: "480px" }}>
        <div className="modal-content shadow-lg border-0 rounded-3">
          <div className="modal-header border-bottom pb-2">
            <h5 className="modal-title fw-bold d-flex align-items-center gap-2">
              <i className="ti ti-shield-lock text-primary fs-20" />
              Change Password
            </h5>
            <button
              type="button"
              className="btn-close"
              aria-label="Close"
              onClick={onClose}
            />
          </div>

          <div className="modal-body p-4">
            {/* Tabs */}
            <ul className="nav nav-pills nav-fill mb-3 bg-light p-1 rounded-2">
              <li className="nav-item">
                <button
                  type="button"
                  className={`nav-link py-2 fs-13 fw-semibold ${
                    activeTab === "dashboard" ? "active bg-primary text-white" : "text-dark"
                  }`}
                  onClick={() => {
                    setActiveTab("dashboard");
                    setDashboardError(null);
                    setDashboardSuccess(null);
                  }}
                >
                  <i className="ti ti-layout-dashboard me-1" />
                  Dashboard Password
                </button>
              </li>
              <li className="nav-item">
                <button
                  type="button"
                  className={`nav-link py-2 fs-13 fw-semibold ${
                    activeTab === "account" ? "active bg-primary text-white" : "text-dark"
                  }`}
                  onClick={() => {
                    setActiveTab("account");
                    setAccountError(null);
                    setAccountSuccess(null);
                  }}
                >
                  <i className="ti ti-user me-1" />
                  Account Password
                </button>
              </li>
            </ul>

            {/* Dashboard Password Form */}
            {activeTab === "dashboard" && (
              <form onSubmit={handleDashboardSubmit}>
                <p className="text-muted fs-13 mb-3">
                  Update the password required to unlock and view dashboard financial & revenue statistics.
                </p>

                {dashboardSuccess && (
                  <div className="alert alert-success fs-13 py-2 px-3 mb-3">
                    <i className="ti ti-check me-1" />
                    {dashboardSuccess}
                  </div>
                )}
                {dashboardError && (
                  <div className="alert alert-danger fs-13 py-2 px-3 mb-3">
                    <i className="ti ti-alert-circle me-1" />
                    {dashboardError}
                  </div>
                )}

                <div className="mb-3">
                  <label className="form-label fs-13 fw-semibold">
                    Current Dashboard Password
                  </label>
                  <input
                    type={showDashboardPass ? "text" : "password"}
                    className="form-control"
                    placeholder="Enter current dashboard password"
                    value={currentDashboardPassword}
                    onChange={(e) => setCurrentDashboardPassword(e.target.value)}
                  />
                  <span className="text-muted fs-11">
                    (Optional for logged-in Admin accounts)
                  </span>
                </div>

                <div className="mb-3">
                  <label className="form-label fs-13 fw-semibold">
                    New Dashboard Password <span className="text-danger">*</span>
                  </label>
                  <input
                    type={showDashboardPass ? "text" : "password"}
                    className="form-control"
                    placeholder="Enter new dashboard password"
                    value={newDashboardPassword}
                    onChange={(e) => setNewDashboardPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label fs-13 fw-semibold">
                    Confirm New Dashboard Password <span className="text-danger">*</span>
                  </label>
                  <input
                    type={showDashboardPass ? "text" : "password"}
                    className="form-control"
                    placeholder="Confirm new dashboard password"
                    value={confirmDashboardPassword}
                    onChange={(e) => setConfirmDashboardPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="form-check mb-3">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="showDashboardPassCheck"
                    checked={showDashboardPass}
                    onChange={(e) => setShowDashboardPass(e.target.checked)}
                  />
                  <label
                    className="form-check-label fs-13"
                    htmlFor="showDashboardPassCheck"
                  >
                    Show Passwords
                  </label>
                </div>

                <div className="d-flex justify-content-end gap-2 pt-2 border-top">
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm px-3"
                    onClick={onClose}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={dashboardLoading || !newDashboardPassword}
                    className="btn btn-primary btn-sm px-3"
                  >
                    {dashboardLoading ? "Saving..." : "Update Dashboard Password"}
                  </button>
                </div>
              </form>
            )}

            {/* Account Password Form */}
            {activeTab === "account" && (
              <form onSubmit={handleAccountSubmit}>
                <p className="text-muted fs-13 mb-3">
                  Update your admin user account login password.
                </p>

                {accountSuccess && (
                  <div className="alert alert-success fs-13 py-2 px-3 mb-3">
                    <i className="ti ti-check me-1" />
                    {accountSuccess}
                  </div>
                )}
                {accountError && (
                  <div className="alert alert-danger fs-13 py-2 px-3 mb-3">
                    <i className="ti ti-alert-circle me-1" />
                    {accountError}
                  </div>
                )}

                <div className="mb-3">
                  <label className="form-label fs-13 fw-semibold">
                    Current Account Password <span className="text-danger">*</span>
                  </label>
                  <input
                    type={showAccountPass ? "text" : "password"}
                    className="form-control"
                    placeholder="Enter current account password"
                    value={currentAccountPassword}
                    onChange={(e) => setCurrentAccountPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label fs-13 fw-semibold">
                    New Account Password <span className="text-danger">*</span>
                  </label>
                  <input
                    type={showAccountPass ? "text" : "password"}
                    className="form-control"
                    placeholder="At least 8 characters"
                    value={newAccountPassword}
                    onChange={(e) => setNewAccountPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label fs-13 fw-semibold">
                    Confirm New Account Password <span className="text-danger">*</span>
                  </label>
                  <input
                    type={showAccountPass ? "text" : "password"}
                    className="form-control"
                    placeholder="Confirm new account password"
                    value={confirmAccountPassword}
                    onChange={(e) => setConfirmAccountPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="form-check mb-3">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="showAccountPassCheck"
                    checked={showAccountPass}
                    onChange={(e) => setShowAccountPass(e.target.checked)}
                  />
                  <label
                    className="form-check-label fs-13"
                    htmlFor="showAccountPassCheck"
                  >
                    Show Passwords
                  </label>
                </div>

                <div className="d-flex justify-content-end gap-2 pt-2 border-top">
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm px-3"
                    onClick={onClose}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={accountLoading || !newAccountPassword}
                    className="btn btn-primary btn-sm px-3"
                  >
                    {accountLoading ? "Saving..." : "Update Account Password"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
