"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { API_BASE_URL } from "@/environment";
import { all_routes } from "@/routes/all_routes";
import DOMPurify from "isomorphic-dompurify";

interface IProcedureDetail {
  _id: string;
  procedureId?: string;
  procedureName?: string;
  department?: string;
  category?: string;
  status?: string;
  type?: string;
  isPackage?: boolean;
  isDialysis?: boolean;
  price?: number;
  description?: string;
}

const formatBoolean = (value?: boolean) => (value ? "Yes" : "No");

const formatType = (type?: string) => {
  const typeLabels: Record<string, string> = {
    both: "Both",
    daycare: "Daycare",
    ipd: "IPD",
  };
  if (!type) return "—";
  return typeLabels[type] ?? type;
};

const formatCurrency = (value?: number) =>
  value != null ? `₹${value}` : "—";

const ProcedureDetailsContent = () => {
  const searchParams = useSearchParams();
  const procedureId = searchParams.get("id");
  const [procedure, setProcedure] = useState<IProcedureDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!procedureId) {
      setLoading(false);
      setError("No procedure ID provided.");
      return;
    }
    const fetchProcedure = async () => {
      if (!API_BASE_URL) {
        setError("API configuration error.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError("");
        const res = await axios.get(`${API_BASE_URL}/hospital/procedures/${procedureId}`);
        if (res.data?.code === 200 && res.data?.data) {
          const data = res.data.data?.procedure ?? res.data.data;
          setProcedure(data as IProcedureDetail);
        } else {
          setError("Procedure not found.");
        }
      } catch {
        setError("Failed to load procedure.");
      } finally {
        setLoading(false);
      }
    };
    fetchProcedure();
  }, [procedureId]);

  if (loading) {
    return (
      <div className="page-wrapper">
        <div className="content">
          <div className="row">
            <div className="col-12">
              <div className="text-center py-5">
                <p className="text-muted mb-0">Loading procedure…</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !procedure) {
    return (
      <div className="page-wrapper">
        <div className="content">
          <div className="row">
            <div className="col-12">
              <div className="alert alert-danger mb-3">{error || "Procedure not found."}</div>
              <Link href={all_routes.procedures} className="btn btn-light">
                <i className="ti ti-chevron-left me-1" />
                Back to Procedures
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <style
        dangerouslySetInnerHTML={{
          __html: DOMPurify.sanitize(`
          .page-wrapper .card .form-label,
          .page-wrapper .card p {
            color: #000 !important;
          }
        `),
        }}
      />
      <div className="content">
        <div className="row">
          <div className="col-12">
            <div className="d-flex align-items-sm-center flex-sm-row flex-column gap-2 mb-3 pb-3 border-bottom">
              <div className="flex-grow-1">
                <h6 className="fw-bold mb-0 d-flex align-items-center">
                  <Link href={all_routes.procedures} className="text-dark">
                    <i className="ti ti-chevron-left me-1 fs-14" />
                    Procedures
                  </Link>
                </h6>
              </div>
              <Link href={all_routes.addProcedure} className="btn btn-primary btn-sm">
                <i className="ti ti-plus me-1" />
                New Procedure
              </Link>
            </div>
            <div className="card shadow-sm">
              <div className="card-header d-flex align-items-center justify-content-between">
                <h5 className="fw-bold mb-0 text-primary">
                  {procedure.procedureName ?? "Procedure Details"}
                </h5>
                <span
                  className={`badge ${
                    procedure.status === "Active"
                      ? "badge-soft-success border-success"
                      : "badge-soft-danger border-danger"
                  } border px-2 py-1 fs-13 fw-medium`}
                >
                  {procedure.status ?? "—"}
                </span>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-6 col-lg-4 mb-3">
                    <label className="form-label text-muted small mb-1">Procedure Name</label>
                    <p className="mb-0 fw-medium">{procedure.procedureName ?? "—"}</p>
                  </div>
                  <div className="col-md-6 col-lg-4 mb-3">
                    <label className="form-label text-muted small mb-1">Department</label>
                    <p className="mb-0 fw-medium">{procedure.department ?? "—"}</p>
                  </div>
                  <div className="col-md-6 col-lg-4 mb-3">
                    <label className="form-label text-muted small mb-1">Category</label>
                    <p className="mb-0 fw-medium">{procedure.category ?? "—"}</p>
                  </div>
                  <div className="col-md-6 col-lg-4 mb-3">
                    <label className="form-label text-muted small mb-1">Type</label>
                    <p className="mb-0 fw-medium">{formatType(procedure.type)}</p>
                  </div>
                  <div className="col-md-6 col-lg-4 mb-3">
                    <label className="form-label text-muted small mb-1">Package</label>
                    <p className="mb-0 fw-medium">{formatBoolean(procedure.isPackage)}</p>
                  </div>
                  <div className="col-md-6 col-lg-4 mb-3">
                    <label className="form-label text-muted small mb-1">Dialysis</label>
                    <p className="mb-0 fw-medium">{formatBoolean(procedure.isDialysis)}</p>
                  </div>
                  <div className="col-md-6 col-lg-4 mb-3">
                    <label className="form-label text-muted small mb-1">Price</label>
                    <p className="mb-0 fw-medium">{formatCurrency(procedure.price)}</p>
                  </div>
                  <div className="col-12 mb-3">
                    <label className="form-label text-muted small mb-1">Description</label>
                    <p className="mb-0 fw-medium">{procedure.description ?? "—"}</p>
                  </div>
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
    </div>
  );
};

const ProcedureDetailsComponent = () => (
  <Suspense
    fallback={
      <div className="page-wrapper">
        <div className="content">
          <div className="text-center py-5">
            <p className="text-muted mb-0">Loading…</p>
          </div>
        </div>
      </div>
    }
  >
    <ProcedureDetailsContent />
  </Suspense>
);

export default ProcedureDetailsComponent;
