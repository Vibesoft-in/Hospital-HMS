"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  searchPatientByAbha,
  type IAbhaPatientSearchResult,
  type TAbhaSearchBy,
} from "@/core/api/abdmFindSearchApi";
import { all_routes } from "@/routes/all_routes";

interface ISearchPatientByAbhaModalProps {
  open: boolean;
  onClose: () => void;
}

const ABHA_ADDRESS_SUFFIX = "@sbx";

const normalizeAbhaAddressLocalPart = (value: string): string =>
  value.replace(/@.*$/i, "").replace(/\s/g, "");

const formatAbhaAddress = (localPart: string): string => {
  const trimmed = normalizeAbhaAddressLocalPart(localPart);
  return trimmed ? `${trimmed}${ABHA_ADDRESS_SUFFIX}` : "";
};

const SearchPatientByAbhaModal = ({ open, onClose }: ISearchPatientByAbhaModalProps) => {
  const router = useRouter();
  const [searchBy, setSearchBy] = useState<TAbhaSearchBy>("abhaAddress");
  const [abhaAddress, setAbhaAddress] = useState("");
  const [abhaNumber, setAbhaNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [patients, setPatients] = useState<IAbhaPatientSearchResult[]>([]);

  useEffect(() => {
    if (!open) return;
    setSearchBy("abhaAddress");
    setAbhaAddress("");
    setAbhaNumber("");
    setLoading(false);
    setError(null);
    setSearched(false);
    setPatients([]);
  }, [open]);

  if (!open) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSearched(false);
    setPatients([]);

    const value =
      searchBy === "abhaAddress" ? formatAbhaAddress(abhaAddress) : abhaNumber.trim();

    if (!value) {
      setError(
        searchBy === "abhaAddress"
          ? "Please enter an ABHA address."
          : "Please enter an ABHA number."
      );
      return;
    }

    setLoading(true);
    try {
      const results = await searchPatientByAbha({ searchBy, value });
      setPatients(results);
      setSearched(true);
    } catch (err: unknown) {
      setPatients([]);
      setSearched(true);
      setError(err instanceof Error ? err.message : "Failed to search patient by ABHA.");
    } finally {
      setLoading(false);
    }
  };

  const handleViewPatient = (patient: IAbhaPatientSearchResult) => {
    if (!patient.patientId) return;
    onClose();
    router.push(`${all_routes.patientDetails}?id=${encodeURIComponent(patient.patientId)}`);
  };

  const handleClose = () => {
    if (loading) return;
    onClose();
  };

  return (
    <>
      <div
        className="modal fade show"
        id="search_patient_by_abha_modal"
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="search_patient_by_abha_title"
        style={{ display: "block" }}
      >
        <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
          <div className="modal-content">
            <form onSubmit={(e) => void handleSearch(e)}>
              <div className="modal-header">
                <h5 className="modal-title fw-bold" id="search_patient_by_abha_title">
                  Search Patient by ABHA
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
                  <label className="form-label fw-medium fs-14">Search by</label>
                  <div className="d-flex flex-wrap gap-3">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="radio"
                        name="abha-search-by"
                        id="abha-search-by-address"
                        checked={searchBy === "abhaAddress"}
                        onChange={() => setSearchBy("abhaAddress")}
                        disabled={loading}
                      />
                      <label className="form-check-label" htmlFor="abha-search-by-address">
                        ABHA Address
                      </label>
                    </div>
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="radio"
                        name="abha-search-by"
                        id="abha-search-by-number"
                        checked={searchBy === "abhaNumber"}
                        onChange={() => setSearchBy("abhaNumber")}
                        disabled={loading}
                      />
                      <label className="form-check-label" htmlFor="abha-search-by-number">
                        ABHA Number
                      </label>
                    </div>
                  </div>
                </div>

                <div className="row g-2 align-items-end mb-3">
                  <div className="col">
                    {searchBy === "abhaAddress" ? (
                      <>
                        <label className="form-label fw-medium fs-14" htmlFor="abha-search-address">
                          ABHA Address <span className="text-danger">*</span>
                        </label>
                        <div className="input-group">
                          <input
                            id="abha-search-address"
                            type="text"
                            className="form-control"
                            placeholder="name"
                            value={abhaAddress}
                            onChange={(e) =>
                              setAbhaAddress(normalizeAbhaAddressLocalPart(e.target.value))
                            }
                            disabled={loading}
                            required
                            autoComplete="off"
                            aria-describedby="abha-search-address-suffix"
                          />
                          <span
                            id="abha-search-address-suffix"
                            className="input-group-text text-muted"
                          >
                            {ABHA_ADDRESS_SUFFIX}
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <label className="form-label fw-medium fs-14" htmlFor="abha-search-number">
                          ABHA Number <span className="text-danger">*</span>
                        </label>
                        <input
                          id="abha-search-number"
                          type="text"
                          className="form-control"
                          placeholder="Enter ABHA number"
                          value={abhaNumber}
                          onChange={(e) => setAbhaNumber(e.target.value)}
                          disabled={loading}
                          required
                          autoComplete="off"
                        />
                      </>
                    )}
                  </div>
                  <div className="col-auto">
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                      {loading ? (
                        <>
                          <span
                            className="spinner-border spinner-border-sm me-1"
                            role="status"
                            aria-hidden="true"
                          />
                          Searching…
                        </>
                      ) : (
                        <>
                          <i className="ti ti-search me-1" />
                          Search
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {searched && !loading ? (
                  patients.length === 0 ? (
                    <div className="alert alert-info py-2 mb-0" role="status">
                      No patient found for this ABHA{" "}
                      {searchBy === "abhaAddress" ? "address" : "number"}.
                    </div>
                  ) : (
                    <div className="d-flex flex-column gap-2">
                      <p className="fw-medium mb-1 fs-14 text-dark">
                        {patients.length} patient{patients.length === 1 ? "" : "s"} found
                      </p>
                      {patients.map((patient) => (
                        <div
                          key={patient.patientId}
                          className="border rounded-2 p-3 bg-light"
                        >
                          <div className="d-flex align-items-start justify-content-between gap-2 flex-wrap">
                            <div className="flex-grow-1">
                              <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                                <h6 className="mb-0 fw-bold text-dark">
                                  {patient.name || "Unknown name"}
                                </h6>
                                {patient.abhaLinked ? (
                                  <span className="badge border badge-soft-success border-success text-success">
                                    ABHA Linked
                                  </span>
                                ) : null}
                              </div>
                              <div className="row g-1 fs-13 text-muted">
                                {patient.mrd ? (
                                  <div className="col-12 col-sm-6">
                                    <span className="fw-medium text-dark">MRD: </span>
                                    {patient.mrd}
                                  </div>
                                ) : null}
                                {patient.phone ? (
                                  <div className="col-12 col-sm-6">
                                    <span className="fw-medium text-dark">Phone: </span>
                                    {patient.phone}
                                  </div>
                                ) : null}
                                {patient.abhaNumber ? (
                                  <div className="col-12 col-md-6">
                                    <span className="fw-medium text-dark">ABHA Number: </span>
                                    {patient.abhaNumber}
                                  </div>
                                ) : null}
                                {patient.abhaAddress ? (
                                  <div className="col-12 col-md-6">
                                    <span className="fw-medium text-dark">ABHA Address: </span>
                                    {patient.abhaAddress}
                                  </div>
                                ) : null}
                                {patient.gender ? (
                                  <div className="col-12 col-sm-4">
                                    <span className="fw-medium text-dark">Gender: </span>
                                    {patient.gender}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                            <button
                              type="button"
                              className="btn btn-sm btn-primary"
                              onClick={() => handleViewPatient(patient)}
                            >
                              View Patient
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ) : null}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-light"
                  onClick={handleClose}
                  disabled={loading}
                >
                  Close
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

export default SearchPatientByAbhaModal;
