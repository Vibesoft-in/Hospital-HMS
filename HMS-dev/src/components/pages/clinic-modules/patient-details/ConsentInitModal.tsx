"use client";

import { useEffect, useMemo, useState } from "react";
import CommonSelect, { type Option } from "@/core/common/common-select/commonSelect";
import {
  CONSENT_PURPOSE_OPTIONS,
  initConsent,
  validateConsentInitFields,
  type TConsentPurpose,
} from "@/core/api/abdmConsentApi";
import {
  FHIR_HI_TYPE_OPTIONS,
  type TFhirHiType,
} from "@/core/types/fhirHealthRecord";

interface IConsentInitModalProps {
  open: boolean;
  onClose: () => void;
  patientId: string | null;
  abhaAddresses?: string[];
  onSuccess?: () => void;
}

const DEFAULT_REQUESTER_NAME = "JJM Hospital";

const toIsoStartOfDay = (dateStr: string): string => {
  if (!dateStr) return "";
  const date = new Date(`${dateStr}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
};

const toIsoEndOfDay = (dateStr: string): string => {
  if (!dateStr) return "";
  const date = new Date(`${dateStr}T23:59:59.999Z`);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
};

const toIsoDateRangeTo = (dateStr: string): string => {
  if (!dateStr) return "";
  if (dateStr === getTodayDateInputValue()) {
    return new Date().toISOString();
  }
  return toIsoEndOfDay(dateStr);
};

const toDateInputValue = (date: Date): string => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getTodayDateInputValue = (): string => toDateInputValue(new Date());

const getDefaultDateRangeFrom = (): string => "2023-01-01";

const getDefaultDataEraseAt = (): string => {
  const date = new Date();
  date.setUTCMonth(date.getUTCMonth() + 1);
  return toDateInputValue(date);
};

const getAllHiTypes = (): TFhirHiType[] =>
  FHIR_HI_TYPE_OPTIONS.map((option) => option.value);

const ConsentInitModal = ({
  open,
  onClose,
  patientId,
  abhaAddresses = [],
  onSuccess,
}: IConsentInitModalProps) => {
  const [abhaAddress, setAbhaAddress] = useState("");
  const [purposeCode, setPurposeCode] = useState<TConsentPurpose | "">("");
  const [dateRangeFrom, setDateRangeFrom] = useState(getDefaultDateRangeFrom);
  const [dateRangeTo, setDateRangeTo] = useState(getTodayDateInputValue);
  const [dataEraseAt, setDataEraseAt] = useState(getDefaultDataEraseAt);
  const [hiTypes, setHiTypes] = useState<TFhirHiType[]>(getAllHiTypes);
  const [requesterName, setRequesterName] = useState(DEFAULT_REQUESTER_NAME);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abhaAddressOptions: Option[] = useMemo(
    () =>
      abhaAddresses
        .map((address) => address?.trim())
        .filter((address): address is string => Boolean(address))
        .map((address) => ({
          value: address,
          label: address,
        })),
    [abhaAddresses]
  );

  const purposeOptions: Option[] = useMemo(
    () =>
      CONSENT_PURPOSE_OPTIONS.map((option) => ({
        value: option.value,
        label: option.label,
      })),
    []
  );

  const selectedAbhaAddress = useMemo(
    () => abhaAddressOptions.find((option) => option.value === abhaAddress) ?? null,
    [abhaAddress, abhaAddressOptions]
  );

  const selectedPurpose = useMemo(
    () => purposeOptions.find((option) => option.value === purposeCode) ?? null,
    [purposeCode, purposeOptions]
  );

  useEffect(() => {
    if (!open) return;

    const defaultAbhaAddress = abhaAddressOptions[0]?.value ?? "";
    setAbhaAddress(defaultAbhaAddress);
    setPurposeCode("");
    setDateRangeFrom(getDefaultDateRangeFrom());
    setDateRangeTo(getTodayDateInputValue());
    setDataEraseAt(getDefaultDataEraseAt());
    setHiTypes(getAllHiTypes());
    setRequesterName(DEFAULT_REQUESTER_NAME);
    setSubmitting(false);
    setError(null);
  }, [open, patientId, abhaAddressOptions]);

  if (!open) return null;

  const resolvedPatientId = patientId?.trim() ?? "";
  const maxDateRangeTo = getTodayDateInputValue();

  const handleToggleHiType = (value: TFhirHiType) => {
    setHiTypes((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]
    );
  };

  const handleSelectAllHiTypes = () => {
    setHiTypes(FHIR_HI_TYPE_OPTIONS.map((option) => option.value));
  };

  const handleClearHiTypes = () => {
    setHiTypes([]);
  };

  const handleAbhaAddressChange = (option: Option | null) => {
    setAbhaAddress(option?.value ?? "");
  };

  const handlePurposeChange = (option: Option | null) => {
    setPurposeCode((option?.value ?? "") as TConsentPurpose | "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const payload = {
      patientId: resolvedPatientId,
      abhaAddress,
      purposeCode: purposeCode as TConsentPurpose,
      dateRangeFrom: toIsoStartOfDay(dateRangeFrom),
      dateRangeTo: toIsoDateRangeTo(dateRangeTo),
      dataEraseAt: toIsoEndOfDay(dataEraseAt),
      hiTypes,
      requesterName,
    };

    const validationError = validateConsentInitFields(payload);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSubmitting(true);
      await initConsent(payload);
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to initiate consent request.");
    } finally {
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
        id="consent_init_modal"
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="consent_init_title"
        style={{ display: "block" }}
      >
        <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
          <div className="modal-content">
            <form onSubmit={handleSubmit}>
              <div className="modal-header">
                <h5 className="modal-title fw-bold" id="consent_init_title">
                  Initiate ABDM Consent
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

                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <label className="form-label fw-medium fs-14" htmlFor="consent-abha-address">
                      ABHA Address <span className="text-danger">*</span>
                    </label>
                    <CommonSelect
                      instanceId="consent-abha-address"
                      options={abhaAddressOptions}
                      value={selectedAbhaAddress}
                      onChange={handleAbhaAddressChange}
                      placeholder={
                        abhaAddressOptions.length
                          ? "Select ABHA address"
                          : "No ABHA address available"
                      }
                      className="w-100"
                      disabled={submitting || abhaAddressOptions.length === 0}
                    />
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label fw-medium fs-14" htmlFor="consent-purpose">
                      Purpose <span className="text-danger">*</span>
                    </label>
                    <CommonSelect
                      instanceId="consent-purpose"
                      options={purposeOptions}
                      value={selectedPurpose}
                      onChange={handlePurposeChange}
                      placeholder="Select purpose"
                      className="w-100"
                      disabled={submitting}
                    />
                  </div>

                  <div className="col-12 col-md-6">
                    <label className="form-label fw-medium fs-14" htmlFor="consent-requester-name">
                      Requester Name <span className="text-danger">*</span>
                    </label>
                    <input
                      id="consent-requester-name"
                      type="text"
                      className="form-control"
                      placeholder="Enter requester name"
                      value={requesterName}
                      onChange={(e) => setRequesterName(e.target.value)}
                      disabled={submitting}
                      required
                    />
                  </div>

                  <div className="col-12 col-md-4">
                    <label className="form-label fw-medium fs-14" htmlFor="consent-date-from">
                      Date Range From <span className="text-danger">*</span>
                    </label>
                    <input
                      id="consent-date-from"
                      type="date"
                      className="form-control"
                      value={dateRangeFrom}
                      onChange={(e) => setDateRangeFrom(e.target.value)}
                      disabled={submitting}
                      required
                    />
                  </div>

                  <div className="col-12 col-md-4">
                    <label className="form-label fw-medium fs-14" htmlFor="consent-date-to">
                      Date Range To <span className="text-danger">*</span>
                    </label>
                    <input
                      id="consent-date-to"
                      type="date"
                      className="form-control"
                      value={dateRangeTo}
                      onChange={(e) => setDateRangeTo(e.target.value)}
                      min={dateRangeFrom || undefined}
                      max={maxDateRangeTo}
                      disabled={submitting}
                      required
                    />
                  </div>

                  <div className="col-12 col-md-4">
                    <label className="form-label fw-medium fs-14" htmlFor="consent-data-erase-at">
                      Data Erase At <span className="text-danger">*</span>
                    </label>
                    <input
                      id="consent-data-erase-at"
                      type="date"
                      className="form-control"
                      value={dataEraseAt}
                      onChange={(e) => setDataEraseAt(e.target.value)}
                      disabled={submitting}
                      required
                    />
                  </div>

                  <div className="col-12">
                    <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
                      <label className="form-label fw-medium fs-14 mb-0">
                        HI Types <span className="text-danger">*</span>
                      </label>
                      <div className="d-flex align-items-center gap-2">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary"
                          onClick={handleSelectAllHiTypes}
                          disabled={submitting}
                        >
                          Select All
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          onClick={handleClearHiTypes}
                          disabled={submitting || hiTypes.length === 0}
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                    <div className="row g-2">
                      {FHIR_HI_TYPE_OPTIONS.map((option) => {
                        const checked = hiTypes.includes(option.value);
                        const inputId = `consent-hi-type-${option.value}`;
                        return (
                          <div className="col-12 col-sm-6" key={option.value}>
                            <div className="form-check border rounded-2 px-3 py-2 h-100">
                              <input
                                id={inputId}
                                className="form-check-input"
                                type="checkbox"
                                checked={checked}
                                onChange={() => handleToggleHiType(option.value)}
                                disabled={submitting}
                              />
                              <label className="form-check-label ms-1" htmlFor={inputId}>
                                {option.label}
                              </label>
                            </div>
                          </div>
                        );
                      })}
                    </div>
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
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={
                    submitting || !resolvedPatientId || abhaAddressOptions.length === 0
                  }
                >
                  {submitting ? "Initiating..." : "Initiate Consent"}
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

export default ConsentInitModal;
