"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "@/environment";
import {
  generateLinkToken,
  getLinkTokenStatus,
  validateLinkTokenFields,
} from "@/core/utils/abhaLinkApi";

export interface ILinkTokenPatientPrefill {
  _id: string;
  name?: string;
  gender?: string;
  dob?: string;
  age?: number;
  abhaAddress?: string;
  abhaNumber?: string;
}

interface IGenerateLinkTokenModalProps {
  open: boolean;
  onClose: () => void;
  patient: ILinkTokenPatientPrefill | null;
  onTokenReady?: () => void;
}

const GENDER_OPTIONS = [
  { value: "M", label: "Male (M)" },
  { value: "F", label: "Female (F)" },
  { value: "O", label: "Others (O)" },
];

const ABHA_ADDRESS_SUFFIX = "@sbx";

const normalizeAbhaAddressLocalPart = (value: string): string =>
  value.replace(/@.*$/i, "").replace(/\s/g, "");

const formatAbhaAddress = (localPart: string): string => {
  const trimmed = normalizeAbhaAddressLocalPart(localPart);
  return trimmed ? `${trimmed}${ABHA_ADDRESS_SUFFIX}` : "";
};

const LINK_STATUS_POLL_ATTEMPTS = 5;
const LINK_STATUS_POLL_INTERVAL_MS = 2500;

interface ILinkTokenStatusResponse {
  message?: string;
  status?: string;
  data?: {
    message?: string;
    status?: string;
    hasValidToken?: boolean;
    lastError?: string | null;
  };
}

const wait = (durationMs: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, durationMs));

const hasValidLinkToken = (response: unknown): boolean => {
  const result = response as ILinkTokenStatusResponse | null;
  return Boolean(result?.data?.hasValidToken);
};

const getStatusMessage = (response: unknown): string => {
  const result = response as ILinkTokenStatusResponse | null;
  if (result?.data?.hasValidToken) {
    return "Valid link token is ready.";
  }
  if (result?.data?.lastError?.trim()) {
    return result.data.lastError.trim();
  }
  return (
    result?.data?.message?.trim() ||
    result?.data?.status?.trim() ||
    result?.message?.trim() ||
    result?.status?.trim() ||
    ""
  );
};

const getRequestErrorMessage = (error: unknown, fallback: string): string => {
  if (!axios.isAxiosError(error)) return fallback;
  return error.response?.data?.message || error.response?.data?.error || fallback;
};

const GenerateLinkTokenModal = ({
  open,
  onClose,
  patient,
  onTokenReady,
}: IGenerateLinkTokenModalProps) => {
  const [abhaAddress, setAbhaAddress] = useState("");
  const [abhaNumber, setAbhaNumber] = useState("");
  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const [yearOfBirth, setYearOfBirth] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    setAbhaAddress("");
    setAbhaNumber("");
    setName("");
    setGender("");
    setYearOfBirth("");
    setSubmitting(false);
    setCheckingStatus(false);
    setError(null);
    setSuccess(null);
  }, [open]);

  if (!open) return null;

  const patientId = patient?._id ?? "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const validationError = validateLinkTokenFields({
      patientId,
      abhaAddress: formatAbhaAddress(abhaAddress),
      abhaNumber,
      name: name.trim().toUpperCase(),
      gender,
      yearOfBirth,
    });
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!API_BASE_URL) {
      setError("API base URL is not configured.");
      return;
    }

    try {
      setSubmitting(true);
      setCheckingStatus(true);
      setSuccess("Generating link token…");

      // 200 or 202 both mean we should start status polling immediately.
      await generateLinkToken(API_BASE_URL, {
        patientId,
        abhaAddress: formatAbhaAddress(abhaAddress),
        abhaNumber,
        name: name.trim().toUpperCase(),
        gender,
        yearOfBirth,
      });

      setSuccess("Link token request accepted. Checking linking status…");

      let latestStatusResponse: unknown = null;
      let statusPollingError: unknown = null;
      let tokenReady = false;

      // Poll immediately (no delay on first attempt), then retry.
      for (let attempt = 0; attempt < LINK_STATUS_POLL_ATTEMPTS; attempt += 1) {
        if (attempt > 0) {
          await wait(LINK_STATUS_POLL_INTERVAL_MS);
        }

        try {
          latestStatusResponse = await getLinkTokenStatus(API_BASE_URL, patientId);
          statusPollingError = null;
          if (hasValidLinkToken(latestStatusResponse)) {
            tokenReady = true;
            onTokenReady?.();
            break;
          }
        } catch (statusError: unknown) {
          statusPollingError = statusError;
        }
      }

      setCheckingStatus(false);

      if (!tokenReady && statusPollingError) {
        setError(
          getRequestErrorMessage(
            statusPollingError,
            "Token generated, but the linking status could not be retrieved."
          )
        );
        setSubmitting(false);
        return;
      }

      onClose();
    } catch (err: unknown) {
      setError(getRequestErrorMessage(err, "Failed to generate link token."));
      setCheckingStatus(false);
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (submitting) return;
    onClose();
  };

  return (
    <>
      <div
        className="modal fade show"
        id="generate_link_token_modal"
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="generate_link_token_title"
        style={{ display: "block" }}
      >
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <form onSubmit={handleSubmit}>
              <div className="modal-header">
                <h5 className="modal-title fw-bold" id="generate_link_token_title">
                  Generate Linking Token
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  onClick={handleClose}
                  disabled={submitting}
                />
              </div>
              <div className="modal-body">
                {error ? (
                  <div className="alert alert-danger py-2" role="alert">
                    {error}
                  </div>
                ) : null}
                {success ? (
                  <div className="alert alert-success py-2" role="alert">
                    {success}
                  </div>
                ) : null}

                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <label className="form-label fw-medium fs-14" htmlFor="link-token-abha-address">
                      ABHA Address <span className="text-danger">*</span>
                    </label>
                    <div className="input-group">
                      <input
                        id="link-token-abha-address"
                        type="text"
                        className="form-control"
                        placeholder="name"
                        value={abhaAddress}
                        onChange={(e) =>
                          setAbhaAddress(normalizeAbhaAddressLocalPart(e.target.value))
                        }
                        disabled={submitting}
                        required
                        autoComplete="off"
                        aria-describedby="link-token-abha-address-suffix"
                      />
                      <span
                        id="link-token-abha-address-suffix"
                        className="input-group-text text-muted"
                      >
                        {ABHA_ADDRESS_SUFFIX}
                      </span>
                    </div>
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label fw-medium fs-14" htmlFor="link-token-abha-number">
                      ABHA Number <span className="text-danger">*</span>
                    </label>
                    <input
                      id="link-token-abha-number"
                      type="text"
                      className="form-control"
                      placeholder="Enter ABHA number"
                      value={abhaNumber}
                      onChange={(e) => setAbhaNumber(e.target.value)}
                      disabled={submitting}
                      required
                    />
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label fw-medium fs-14" htmlFor="link-token-name">
                      Name <span className="text-danger">*</span>
                    </label>
                    <input
                      id="link-token-name"
                      type="text"
                      className="form-control"
                      placeholder="Patient name"
                      value={name}
                      onChange={(e) => setName(e.target.value.toUpperCase())}
                      disabled={submitting}
                      required
                    />
                  </div>

                  <div className="col-12 col-md-3">
                    <label className="form-label fw-medium fs-14" htmlFor="link-token-gender">
                      Gender <span className="text-danger">*</span>
                    </label>
                    <select
                      id="link-token-gender"
                      className="form-select"
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      disabled={submitting}
                      required
                    >
                      <option value="">Select</option>
                      {GENDER_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-12 col-md-3">
                    <label className="form-label fw-medium fs-14" htmlFor="link-token-yob">
                      Year of Birth <span className="text-danger">*</span>
                    </label>
                    <input
                      id="link-token-yob"
                      type="number"
                      className="form-control"
                      placeholder="YYYY"
                      min={1900}
                      max={new Date().getFullYear()}
                      value={yearOfBirth}
                      onChange={(e) => setYearOfBirth(e.target.value)}
                      disabled={submitting}
                      required
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-light"
                  onClick={handleClose}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting || !patientId}>
                  {checkingStatus ? "Checking Status..." : submitting ? "Generating..." : "Generate Token"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" onClick={handleClose} />
    </>
  );
};

export default GenerateLinkTokenModal;
