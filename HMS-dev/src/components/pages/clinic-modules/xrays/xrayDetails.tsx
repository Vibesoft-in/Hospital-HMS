"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import dayjs from "dayjs";
import DefaultEditor from "react-simple-wysiwyg";
import { API_BASE_URL } from "@/environment";
import { all_routes } from "@/routes/all_routes";
import IpdPatientCompactUpload from "@/components/pages/clinic-modules/ipd-appointments/IpdPatientCompactUpload";

interface IXraySessionPatient {
  _id?: string;
  name?: string;
  mrd?: string;
  age?: number;
  months?: number;
  days?: number;
  gender?: string;
  phone?: string;
}

interface IXraySessionProcedure {
  procedureName?: string;
  department?: string;
}

interface IXraySessionDetail {
  _id: string;
  sessionId?: string;
  patientId?: string;
  tokenDate?: string;
  status?: string;
  reportHtml?: string;
  docUrl?: string;
  patient?: IXraySessionPatient;
  procedure?: IXraySessionProcedure;
}

const DETAIL_LABEL_CLASS = "form-label mb-1 fw-medium text-dark fs-14";
const DETAIL_VALUE_CLASS = "fw-bold text-dark";

const formatPatientAgeForDisplay = (
  years?: number | null,
  months?: number | null,
  days?: number | null
): string | undefined => {
  if (years != null && Number.isFinite(Number(years))) {
    const y = Number(years);
    if (y === 0) {
      const m = months != null ? Number(months) : 0;
      if (m > 0) return `${m} ${m === 1 ? "Month" : "Months"}`;
      if (days != null) return `${days} ${Number(days) === 1 ? "Day" : "Days"}`;
      return undefined;
    }
    return `${y} ${y === 1 ? "Year" : "Years"}`;
  }
  return undefined;
};

const normalizeXrayStatus = (status?: string) => {
  const value = status?.trim();
  if (!value) return "In Progress";
  if (value.toLowerCase() === "inprogress" || value.toLowerCase() === "in-progress") {
    return "In Progress";
  }
  return value;
};

const getXrayStatusBadgeClass = (status?: string) => {
  const normalized = normalizeXrayStatus(status).toLowerCase();
  if (normalized === "completed") return "badge-soft-success";
  if (normalized === "cancelled" || normalized === "canceled") return "badge-soft-danger";
  return "badge-soft-warning text-dark";
};

const getAxiosMessage = (err: unknown, fallback: string): string => {
  if (!axios.isAxiosError(err)) return fallback;
  const data = err.response?.data as { message?: unknown } | undefined;
  return typeof data?.message === "string" ? data.message : fallback;
};

const resolveDocPreviewUrl = (docUrl?: string): string | undefined => {
  const value = docUrl?.trim();
  if (!value) return undefined;
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  return undefined;
};

const uploadXrayDoc = async (file: File): Promise<{ docUrl: string; previewUrl?: string }> => {
  if (!API_BASE_URL) {
    throw new Error("API configuration error");
  }

  const formData = new FormData();
  formData.append("file", file);
  const res = await axios.post(`${API_BASE_URL}/upload/pathlab?folder=hospital/xray`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  const data = res.data?.data;
  const signedUrl = typeof data?.signedUrl === "string" ? data.signedUrl.split("?")[0] : "";
  const originalUrl =
    typeof data?.originalUrl === "string"
      ? data.originalUrl.split("?")[0]
      : typeof data?.url === "string"
        ? data.url.split("?")[0]
        : "";

  const previewUrl = signedUrl || originalUrl || undefined;

  if (typeof data?.path === "string" && data.path.trim()) {
    return { docUrl: data.path.trim(), previewUrl };
  }
  if (typeof data?.key === "string" && data.key.trim()) {
    return { docUrl: data.key.trim(), previewUrl };
  }

  const fromUrl = previewUrl ?? "";
  if (fromUrl) {
    const marker = "hospital/xray/";
    const idx = fromUrl.indexOf(marker);
    if (idx >= 0) {
      return { docUrl: fromUrl.slice(idx), previewUrl };
    }
    return { docUrl: fromUrl, previewUrl };
  }

  throw new Error("Failed to upload X-ray file.");
};

const XrayDetailsComponent = () => {
  const params = useParams();
  const router = useRouter();
  const sessionId = typeof params?.id === "string" ? params.id : "";

  const [session, setSession] = useState<IXraySessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [reportHtml, setReportHtml] = useState("");
  const [docUrl, setDocUrl] = useState("");
  const [savedDocUrl, setSavedDocUrl] = useState("");
  const [docPreviewUrl, setDocPreviewUrl] = useState("");
  const [reportFile, setReportFile] = useState<File | null>(null);

  const fetchSession = useCallback(async () => {
    if (!API_BASE_URL || !sessionId) return;
    try {
      setLoading(true);
      setError("");
      const res = await axios.get(`${API_BASE_URL}/hospital/xray-session/${sessionId}`);
      const isOk =
        res.data?.success === true ||
        res.data?.code === 200 ||
        (res.status >= 200 && res.status < 300 && res.data?.data);

      if (!isOk) {
        setSession(null);
        setError(res.data?.message ?? "Failed to load X-ray session.");
        return;
      }

      const data = (res.data?.data?.session ?? res.data?.data ?? null) as IXraySessionDetail | null;
      if (!data?._id) {
        setSession(null);
        setError("X-ray session not found.");
        return;
      }

      const loadedDocUrl = data.docUrl?.trim() ?? "";

      setSession(data);
      setReportHtml(data.reportHtml ?? "");
      setDocUrl(loadedDocUrl);
      setSavedDocUrl(loadedDocUrl);
      setDocPreviewUrl(
        resolveDocPreviewUrl(loadedDocUrl) ??
          (loadedDocUrl.startsWith("http://") || loadedDocUrl.startsWith("https://")
            ? loadedDocUrl
            : "")
      );
      setReportFile(null);
    } catch (err: unknown) {
      setSession(null);
      setError(getAxiosMessage(err, "Failed to load X-ray session."));
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const handleReportFileChange = (file: File | null) => {
    setReportFile(file);
    if (file) {
      setDocPreviewUrl("");
    }
  };

  const handleClearDoc = () => {
    setDocUrl("");
    setDocPreviewUrl("");
    setReportFile(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!API_BASE_URL || !sessionId) return;

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload: {
        reportHtml: string;
        docUrl?: string;
      } = {
        reportHtml: reportHtml.trim(),
      };

      let nextDocUrl = docUrl.trim();
      let nextPreviewUrl = docPreviewUrl;

      if (reportFile) {
        const uploaded = await uploadXrayDoc(reportFile);
        nextDocUrl = uploaded.docUrl;
        nextPreviewUrl = uploaded.previewUrl ?? resolveDocPreviewUrl(uploaded.docUrl) ?? "";
        payload.docUrl = nextDocUrl;
      } else if (savedDocUrl && !docUrl.trim()) {
        payload.docUrl = "";
        nextDocUrl = "";
        nextPreviewUrl = "";
      }

      const res = await axios.put(`${API_BASE_URL}/hospital/xray-session/${sessionId}`, payload);
      const isOk =
        res.data?.success === true ||
        res.data?.code === 200 ||
        (res.status >= 200 && res.status < 300);

      if (!isOk) {
        setError(res.data?.message ?? "Failed to save X-ray report.");
        return;
      }

      setDocUrl(nextDocUrl);
      setSavedDocUrl(nextDocUrl);
      setDocPreviewUrl(nextPreviewUrl);
      setReportFile(null);
      setSuccess("X-ray report saved successfully.");
      await fetchSession();
    } catch (err: unknown) {
      setError(getAxiosMessage(err, "Failed to save X-ray report."));
    } finally {
      setSaving(false);
    }
  };

  const patientName = session?.patient?.name?.trim() || "N/A";
  const patientAgeUi = formatPatientAgeForDisplay(
    session?.patient?.age,
    session?.patient?.months,
    session?.patient?.days
  );
  const patientProfileId = session?.patient?._id ?? session?.patientId ?? "";
  const sessionStatus = normalizeXrayStatus(session?.status);
  const tokenDate = session?.tokenDate
    ? dayjs(session.tokenDate).format("DD MMM YYYY")
    : "N/A";

  if (loading) {
    return (
      <div className="page-wrapper xray-details-page">
        <div className="content">
          <div className="d-flex justify-content-center align-items-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="page-wrapper xray-details-page">
        <div className="content">
          <div className="alert alert-danger">
            <strong>Error:</strong> {error || "X-ray session not found"}
          </div>
          <Link href={all_routes.xrays} className="btn btn-primary">
            Back to Xrays
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper xray-details-page">
      <style
        dangerouslySetInnerHTML={{
          __html: `
          .xray-details-page .xray-upload-panel {
            background: #fff;
            border: 1px solid #e9ecef;
            border-radius: 12px;
            padding: 1rem;
            height: 100%;
          }
          .xray-details-page .xray-report-editor {
            border: 1px solid #dee2e6;
            border-radius: 12px;
            overflow: hidden;
            background: #fff;
            box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04);
          }
          .xray-details-page .xray-report-editor .editor.pages-editor {
            height: auto;
            min-height: 320px;
          }
          .xray-details-page .xray-report-editor .rsw-editor {
            display: flex;
            flex-direction: column;
          }
          .xray-details-page .xray-report-editor .rsw-toolbar {
            background: #f5f6f8;
            border-bottom: 1px solid #e9ecef;
            padding: 8px 10px;
            gap: 4px;
          }
          .xray-details-page .xray-report-editor .rsw-btn {
            min-width: 34px;
            height: 34px;
            border-radius: 8px;
            border: 1px solid transparent;
            color: #212529;
            background: transparent;
            transition: background-color 0.15s ease, border-color 0.15s ease;
          }
          .xray-details-page .xray-report-editor .rsw-btn:hover {
            background: #fff;
            border-color: #dee2e6;
          }
          .xray-details-page .xray-report-editor .rsw-ce {
            min-height: 280px;
            padding: 1rem 1.15rem;
            color: #000 !important;
            font-size: 14px;
            line-height: 1.65;
            background: #fff;
            white-space: pre-wrap;
            word-break: break-word;
          }
          .xray-details-page .xray-report-editor .rsw-ce:focus {
            outline: none;
          }
          .xray-details-page .xray-report-editor .rsw-ce * {
            color: #000;
          }
          .xray-details-page .xray-view-file-link {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            margin-top: 10px;
            font-size: 13px;
            font-weight: 500;
            text-decoration: none;
          }
          .xray-details-page .form-section-title {
            color: #000;
            font-weight: 600;
            margin-bottom: 0.35rem;
          }
          .xray-details-page .form-section-hint {
            color: #6c757d;
            font-size: 12px;
            margin-bottom: 0.75rem;
          }
        `,
        }}
      />
      <div className="content">
        <div className="mb-4 d-flex flex-wrap align-items-center justify-content-between gap-2">
          <h6 className="fw-bold mb-0 d-flex align-items-center">
            <Link href={all_routes.xrays} className="text-dark">
              <i className="ti ti-chevron-left me-1" />
              Xrays
            </Link>
          </h6>
        </div>

        <div className="card mb-3">
          <div className="card-body p-3">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
              <h6 className="fw-bold text-primary mb-0">X-ray Information</h6>
              <span className={`badge ${getXrayStatusBadgeClass(session.status)}`}>
                {sessionStatus}
              </span>
            </div>

            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
              <h6 className="fw-bold text-primary mb-0">Patient Details</h6>
              <Link
                href={`${all_routes.patientDetails}?id=${patientProfileId}`}
                className={`btn btn-sm d-inline-flex align-items-center ${
                  patientProfileId ? "btn-primary" : "btn-light disabled"
                }`}
                aria-disabled={!patientProfileId}
              >
                <i className="ti ti-user-circle me-1" />
                Open Profile
              </Link>
            </div>

            <div className="row g-2 mb-3">
              <div className="col-md-3 col-sm-6">
                <label className={DETAIL_LABEL_CLASS}>Session ID</label>
                <div className={DETAIL_VALUE_CLASS}>{session.sessionId || "—"}</div>
              </div>
              <div className="col-md-3 col-sm-6">
                <label className={DETAIL_LABEL_CLASS}>Procedure</label>
                <div className={DETAIL_VALUE_CLASS}>
                  {session.procedure?.procedureName || "N/A"}
                </div>
                <div className="text-muted fs-13">{tokenDate}</div>
              </div>
              {session.procedure?.department ? (
                <div className="col-md-3 col-sm-6">
                  <label className={DETAIL_LABEL_CLASS}>Department</label>
                  <div className={DETAIL_VALUE_CLASS}>{session.procedure.department}</div>
                </div>
              ) : null}
              <div className="col-md-3 col-sm-6">
                <label className={DETAIL_LABEL_CLASS}>Patient Name</label>
                <div className={DETAIL_VALUE_CLASS}>{patientName}</div>
              </div>
              <div className="col-md-3 col-sm-6">
                <label className={DETAIL_LABEL_CLASS}>Age / Gender</label>
                <div className={DETAIL_VALUE_CLASS}>
                  {patientAgeUi || "N/A"} / {session.patient?.gender || "N/A"}
                </div>
              </div>
              {session.patient?.mrd ? (
                <div className="col-md-3 col-sm-6">
                  <label className={DETAIL_LABEL_CLASS}>MRD</label>
                  <div className={DETAIL_VALUE_CLASS}>{session.patient.mrd}</div>
                </div>
              ) : null}
              <div className="col-md-3 col-sm-6">
                <label className={DETAIL_LABEL_CLASS}>Phone</label>
                <div className={DETAIL_VALUE_CLASS}>{session.patient?.phone || "N/A"}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="card mb-3">
          <div className="card-body p-3 p-md-4">
            <h6 className="fw-bold text-primary mb-3">Report Details</h6>

            {error ? (
              <div className="alert alert-danger mb-3" role="alert">
                {error}
              </div>
            ) : null}
            {success ? (
              <div className="alert alert-success mb-3" role="alert">
                {success}
              </div>
            ) : null}

            <form onSubmit={handleSave}>
                <div className="row g-4">
                  <div className="col-12 col-lg-4 col-xl-3">
                    <div className="xray-upload-panel">
                      <p className="form-section-title mb-2">X-ray file</p>
                      <IpdPatientCompactUpload
                        label="X-ray file"
                        placeholder="Upload file"
                        hint="Jpg / Png / Pdf"
                        accept="image/jpeg,image/png,image/jpg,application/pdf"
                        file={reportFile}
                        previewUrl={docPreviewUrl || undefined}
                        onFileChange={handleReportFileChange}
                        onClear={handleClearDoc}
                      />
                      {docPreviewUrl && !reportFile ? (
                        <a
                          href={docPreviewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="xray-view-file-link link-primary"
                        >
                          <i className="ti ti-external-link fs-14" aria-hidden />
                          View uploaded file
                        </a>
                      ) : null}
                    </div>
                  </div>

                  <div className="col-12 col-lg-8 col-xl-9">
                    <p className="form-section-title">Report</p>
                   
                    <div className="xray-report-editor">
                      <DefaultEditor
                        className="editor pages-editor w-100"
                        value={reportHtml}
                        onChange={(e) => setReportHtml(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="d-flex justify-content-end flex-wrap gap-2 mt-4 pt-3 border-top">
                  <button
                    type="button"
                    className="btn btn-light"
                    onClick={() => router.push(all_routes.xrays)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? "Saving…" : "Save Report"}
                  </button>
                </div>
              </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default XrayDetailsComponent;
