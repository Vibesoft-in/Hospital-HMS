"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "@/environment";
import ImageWithBasePath from "@/core/imageWithBasePath";
import { unlinkAbha } from "@/core/utils/abhaLinkApi";

interface IUnlinkAbhaConfirmModalProps {
  open: boolean;
  onClose: () => void;
  patientId: string | null;
  patientName?: string;
  onUnlinked?: () => void;
}

const UnlinkAbhaConfirmModal = ({
  open,
  onClose,
  patientId,
  patientName,
  onUnlinked,
}: IUnlinkAbhaConfirmModalProps) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSubmitting(false);
    setError(null);
  }, [open]);

  if (!open) return null;

  const resolvedPatientId = patientId?.trim() ?? "";
  const trimmedPatientName = patientName?.trim();

  const handleConfirm = async () => {
    setError(null);
    if (!resolvedPatientId) {
      setError("Patient ID is required.");
      return;
    }
    if (!API_BASE_URL) {
      setError("API base URL is not configured.");
      return;
    }

    setSubmitting(true);
    try {
      await unlinkAbha(API_BASE_URL, resolvedPatientId);
      onUnlinked?.();
      onClose();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.message || "Failed to unlink ABHA.");
      } else {
        setError(err instanceof Error ? err.message : "Failed to unlink ABHA.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (submitting) return;
    onClose();
  };

  return (
    <div
      className="modal fade show d-block"
      id="unlink_abha_confirm_modal"
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="unlink_abha_confirm_title"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className="modal-dialog modal-dialog-centered w-100 px-3"
        style={{ maxWidth: 560 }}
      >
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
                <i className="ti ti-unlink fs-24" aria-hidden />
              </span>
            </div>
            <h5 id="unlink_abha_confirm_title" className="fw-bold mb-1">
              Unlink ABHA
            </h5>
            {error ? (
              <div className="alert alert-danger py-2 mb-3" role="alert">
                {error}
              </div>
            ) : null}
            <p className="mb-3 text-muted small">
              Are you sure you want to unlink ABHA
              {trimmedPatientName ? (
                <>
                  {" "}
                  for <strong className="text-dark">{trimmedPatientName}</strong>
                </>
              ) : null}
              ? This action cannot be undone.
            </p>
            <div className="d-flex justify-content-center flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-light"
                onClick={handleClose}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => void handleConfirm()}
                disabled={submitting || !resolvedPatientId}
              >
                {submitting ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-1"
                      role="status"
                      aria-hidden="true"
                    />
                    Unlinking…
                  </>
                ) : (
                  "Unlink ABHA"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnlinkAbhaConfirmModal;
