"use client";

import { useEffect, useState } from "react";
import { fetchAbhaScanAndShareQr } from "@/core/api/abdmScanAndShareApi";

interface IGenerateAbhaQrModalProps {
  open: boolean;
  onClose: () => void;
}

const GenerateAbhaQrModal = ({
  open,
  onClose,
}: IGenerateAbhaQrModalProps) => {
  const [counterId, setCounterId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [qrBlob, setQrBlob] = useState<Blob | null>(null);

  useEffect(() => {
    if (!open) return;

    setCounterId("");
    setLoading(false);
    setError(null);
    setQrBlob(null);
    setQrUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, [open]);

  useEffect(() => {
    return () => {
      if (qrUrl) URL.revokeObjectURL(qrUrl);
    };
  }, [qrUrl]);

  if (!open) return null;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = counterId.trim();
    if (!trimmed) {
      setError("Please enter a counter ID.");
      return;
    }

    setLoading(true);
    try {
      const blob = await fetchAbhaScanAndShareQr(trimmed);
      setQrUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(blob);
      });
      setQrBlob(blob);
    } catch (err: unknown) {
      setQrBlob(null);
      setQrUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setError(err instanceof Error ? err.message : "Failed to generate ABHA QR.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!qrBlob || !qrUrl) return;
    const link = document.createElement("a");
    link.href = qrUrl;
    link.download = `abha-qr-${counterId.trim() || "counter"}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleClose = () => {
    if (loading) return;
    onClose();
  };

  return (
    <>
      <div
        className="modal fade show"
        id="generate_abha_qr_modal"
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="generate_abha_qr_title"
        style={{ display: "block" }}
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <form onSubmit={(e) => void handleGenerate(e)}>
              <div className="modal-header">
                <h5 className="modal-title fw-bold" id="generate_abha_qr_title">
                  Generate ABHA QR
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  onClick={handleClose}
                  disabled={loading}
                />
              </div>
              <div className="modal-body">
                {error ? (
                  <div className="alert alert-danger py-2" role="alert">
                    {error}
                  </div>
                ) : null}

                <div className="mb-3">
                  <label className="form-label fw-medium fs-14" htmlFor="abha-qr-counter-id">
                    Counter ID <span className="text-danger">*</span>
                  </label>
                  <input
                    id="abha-qr-counter-id"
                    type="text"
                    className="form-control"
                    placeholder="Enter counter ID"
                    value={counterId}
                    onChange={(e) => setCounterId(e.target.value)}
                    disabled={loading}
                    required
                    autoComplete="off"
                  />
                </div>

                {qrUrl ? (
                  <div className="text-center border rounded p-3 bg-light">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrUrl}
                      alt={`ABHA QR for counter ${counterId.trim()}`}
                      className="img-fluid"
                      style={{ maxWidth: 280, maxHeight: 280 }}
                    />
                  </div>
                ) : null}
              </div>
              <div className="modal-footer flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-light"
                  onClick={handleClose}
                  disabled={loading}
                >
                  Cancel
                </button>
                {qrUrl ? (
                  <>
                    <button
                      type="button"
                      className="btn btn-outline-primary"
                      onClick={handleDownload}
                      disabled={loading || !qrBlob}
                    >
                      <i className="ti ti-download me-1" />
                      Download
                    </button>
                  </>
                ) : (
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm me-1"
                          role="status"
                          aria-hidden="true"
                        />
                        Generating…
                      </>
                    ) : (
                      "Generate QR"
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" onClick={handleClose} />
    </>
  );
};

export default GenerateAbhaQrModal;
