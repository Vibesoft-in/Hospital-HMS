"use client";

import { useState } from "react";
import Link from "next/link";
import axios from "axios";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "@/environment";
import { all_routes } from "../../../../routes/all_routes";
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

const CreateUserComponent = () => {
  const [password, setPassword] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [role, setRole] = useState<string>("RECEPTIONIST");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!API_BASE_URL) return;
    try {
      setSubmitting(true);
      setError("");
      setSuccess("");
      await axios.post(`${API_BASE_URL}/hospital/users`, {
        password,
        name,
        email,
        role,
      });
      setSuccess("User created successfully.");
      setPassword("");
      setName("");
      setEmail("");
      setRole("RECEPTIONIST");
      router.push(all_routes.users);
    } catch (err: any) {
      console.error("Error creating user:", err);
      setError(err?.response?.data?.message || "Failed to create user.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-wrapper">
      <div className="content">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <div>
            <h4 className="fw-bold mb-0">Create User</h4>
          </div>
          <Link href={all_routes.users} className="btn btn-light">
            <i className="ti ti-arrow-left me-1" />
            Back to Users
          </Link>
        </div>

        <div className="card shadow-sm">
          <div className="card-body">
            {error && (
              <div className="alert alert-danger" role="alert">
                {error}
              </div>
            )}
            {success && (
              <div className="alert alert-success" role="alert">
                {success}
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <div className="row">
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label fw-medium">
                      Name<span className="text-danger ms-1">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
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
                        ROLE_OPTIONS.find((o) => o.value === role) ??
                        ROLE_OPTIONS.find((o) => o.value === "RECEPTIONIST") ??
                        null
                      }
                      onChange={(opt) => setRole(opt?.value ?? "RECEPTIONIST")}
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
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
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
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>
              <div className="d-flex justify-content-end mt-3">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? "Creating…" : "Create User"}
                </button>
              </div>
            </form>
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
  );
};

export default CreateUserComponent;

