"use client";

import { useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "@/environment";

interface IDashboardPasswordGateProps {
  children: React.ReactNode;
}

const DashboardPasswordGate = ({ children }: IDashboardPasswordGateProps) => {
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      await axios.post(`${API_BASE_URL}/hospital/dashboard/verify-password`, {
        password,
      });
      setUnlocked(true);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(
          err.response?.data?.message ?? "Incorrect password. Please try again."
        );
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (unlocked) return <>{children}</>;

  return (
    <div className="page-wrapper">
      <div className="content d-flex align-items-center justify-content-center min-vh-100 py-4 px-3">
        <div className="card shadow-sm border-0" style={{ maxWidth: "460px", width: "100%" }}>
          <div className="card-body p-4 p-md-5">
            <div className="text-center mb-4">
              <h4 className="fw-bold mb-1">Dashboard Access</h4>
              <p className="text-muted mb-0">Enter password to unlock dashboard</p>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label htmlFor="dashboard-password" className="form-label">
                  Password
                </label>
                <div className="input-group">
                  <input
                    id="dashboard-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError(null);
                    }}
                    placeholder="Enter dashboard password"
                    className={`form-control ${error ? "is-invalid" : ""}`}
                    autoFocus
                    autoComplete="current-password"
                    aria-label="Dashboard password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="btn btn-outline-secondary"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                {error ? <div className="invalid-feedback d-block">{error}</div> : null}
              </div>

              <button
                type="submit"
                disabled={isLoading || !password.trim()}
                className="btn btn-primary w-100"
              >
                {isLoading ? "Verifying..." : "Unlock Dashboard"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPasswordGate;
