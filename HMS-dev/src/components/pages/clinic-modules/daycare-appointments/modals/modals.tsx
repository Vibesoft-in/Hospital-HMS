"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import CommonSelect, { Option } from "@/core/common/common-select/commonSelect";
import { Title, Gender, Blood_Group } from "@/core/common/selectOption";
import { all_routes } from "@/routes/all_routes";
import axios from "axios";
import { API_BASE_URL } from "@/environment";
import dayjs from "dayjs";

const BED_CHARGES_OPTIONS: Option[] = [
  { value: "private", label: "Private (200/hr)" },
  { value: "semi", label: "Semi-Private (150/hr)" },
  { value: "general", label: "General (100/hr)" },
];

const BED_CHARGES_RATE: Record<string, number> = { private: 200, semi: 150, general: 100 };

interface IDaycareProcedure {
  procedureId: string;
  procedureName?: string;
  price?: number;
}

interface IDaycarePatient {
  _id: string;
  name?: string;
  title?: string;
  phone?: string;
  email?: string;
  gender?: string;
  bloodGroup?: string;
  address?: string;
  dob?: string;
  age?: number;
}

interface IDaycareDetail {
  _id: string;
  patientId: string;
  doctorId: string;
  bedChargesType?: string;
  bedChargesHours?: number;
  bedChargesRate?: number;
  procedures?: IDaycareProcedure[];
  doctorVisitCharges?: boolean;
  discount?: number;
  appointmentDate?: string;
  doctor?: { _id: string; name: string };
  patient?: IDaycarePatient;
}

interface IModalsProps {
  onEditSuccess?: () => void;
}

const Modals = ({ onEditSuccess }: IModalsProps) => {
  const [daycareId, setDaycareId] = useState<string | null>(null);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [patient, setPatient] = useState<IDaycarePatient | null>(null);
  const [doctorOptions, setDoctorOptions] = useState<Option[]>([]);
  const [doctorSearchLoading, setDoctorSearchLoading] = useState(false);
  const [proceduresOptions, setProceduresOptions] = useState<Option[]>([]);
  const [procedurePriceById, setProcedurePriceById] = useState<Record<string, number>>({});
  const [proceduresLoading, setProceduresLoading] = useState(false);

  const [selectedDoctor, setSelectedDoctor] = useState<Option | null>(null);
  const [bedChargesType, setBedChargesType] = useState<Option | null>(null);
  const [bedChargesHours, setBedChargesHours] = useState<number>(1);
  const [doctorVisitCharges, setDoctorVisitCharges] = useState<"Yes" | "No">("No");
  const [addedProcedures, setAddedProcedures] = useState<Array<{ id: string; name: string; price: number }>>([]);
  const [addProcedureSelect, setAddProcedureSelect] = useState<Option | null>(null);
  const [discount, setDiscount] = useState<number>(0);
  const [appointmentDate, setAppointmentDate] = useState<string>("");

  const [fetchLoading, setFetchLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState("");

  const bedChargesRate = bedChargesType?.value ? (BED_CHARGES_RATE[bedChargesType.value] ?? 0) : 0;

  const fetchDoctors = useCallback(async (search = "") => {
    if (!API_BASE_URL) return;
    setDoctorSearchLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/hospital/doctors`, {
        params: { limit: 20, search: search || undefined },
      });
      const list = res.data?.data?.doctors ?? res.data?.data ?? [];
      const arr = Array.isArray(list) ? list : [];
      setDoctorOptions(
        arr.map((d: { _id: string; name?: string }) => ({ value: d._id, label: d.name ?? "—" }))
      );
    } catch {
      setDoctorOptions([]);
    } finally {
      setDoctorSearchLoading(false);
    }
  }, []);

  const fetchProcedures = useCallback(async (search = "") => {
    if (!API_BASE_URL) return;
    setProceduresLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/hospital/procedures`, {
        params: { search: search || undefined, type: "daycare,both" },
      });
      const list = res.data?.data?.procedures ?? res.data?.data ?? [];
      const arr = Array.isArray(list) ? list : [];
      setProceduresOptions(
        arr.map((p: { _id: string; procedureName?: string; price?: number; basePrice?: number }) => ({
          value: p._id,
          label: p.procedureName ?? "—",
        }))
      );
      const priceMap: Record<string, number> = {};
      arr.forEach((p: { _id: string; price?: number; basePrice?: number }) => {
        priceMap[p._id] = p.price ?? p.basePrice ?? 0;
      });
      setProcedurePriceById((prev) => ({ ...prev, ...priceMap }));
    } catch {
      setProceduresOptions([]);
      setProcedurePriceById({});
    } finally {
      setProceduresLoading(false);
    }
  }, []);

  const fetchDaycare = useCallback(async (id: string) => {
    if (!API_BASE_URL) return;
    setFetchLoading(true);
    setError("");
    try {
      const res = await axios.get(`${API_BASE_URL}/hospital/daycare-appointments/${id}`);
      const raw = res.data?.data?.daycareAppointment ?? res.data?.data;
      const data = raw as IDaycareDetail | undefined;
      if (!data) {
        setError("Daycare appointment not found.");
        return;
      }

      setPatientId(data.patientId ?? null);
      if (data.patient) {
        setPatient(data.patient as IDaycarePatient);
      } else if (data.patientId) {
        try {
          const pRes = await axios.get(`${API_BASE_URL}/hospital/patients/${data.patientId}`);
          const pData = pRes.data?.data?.patient ?? pRes.data?.data;
          if (pData) setPatient({ _id: data.patientId, ...pData } as IDaycarePatient);
          else setPatient(null);
        } catch {
          setPatient(null);
        }
      } else {
        setPatient(null);
      }
      setSelectedDoctor(
        data.doctor
          ? { value: data.doctor._id, label: data.doctor.name ?? "" }
          : null
      );

      const bt = (data.bedChargesType ?? "").toLowerCase();
      const bedOption =
        BED_CHARGES_OPTIONS.find(
          (o) =>
            o.value === bt ||
            o.label.toLowerCase().startsWith((data.bedChargesType ?? "").toLowerCase())
        ) ?? BED_CHARGES_OPTIONS[0];
      setBedChargesType(bedOption);
      setBedChargesHours(
        data.bedChargesHours != null && data.bedChargesHours > 0 ? data.bedChargesHours : 1
      );
      setDoctorVisitCharges(data.doctorVisitCharges ? "Yes" : "No");

      const procs = (data.procedures ?? []).map((p) => ({
        id: p.procedureId ?? (p as any)._id,
        name: p.procedureName ?? "—",
        price: p.price ?? 0,
      }));
      setAddedProcedures(procs);
      setDiscount(data.discount ?? 0);
      setAppointmentDate(
        data.appointmentDate ? dayjs(data.appointmentDate).format("YYYY-MM-DD") : ""
      );
    } catch {
      setError("Failed to load daycare appointment.");
    } finally {
      setFetchLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDoctors();
    fetchProcedures();
  }, [fetchDoctors, fetchProcedures]);

  useEffect(() => {
    const handleEditClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest(
        '[data-bs-target="#edit_daycare_modal"][data-daycare-id]'
      ) as HTMLElement | null;
      if (!link) return;
      const id = link.getAttribute("data-daycare-id");
      if (!id) return;
      setDaycareId(id);
      setError("");
      fetchDaycare(id);
    };
    document.addEventListener("click", handleEditClick);
    return () => document.removeEventListener("click", handleEditClick);
  }, [fetchDaycare]);

  const handleModalHide = useCallback(() => {
    setDaycareId(null);
    setPatient(null);
    setError("");
  }, []);

  const patientTitleLabel = patient?.title ? (Title.find((t) => t.value === patient.title)?.label ?? patient.title) : "";
  const patientGenderLabel = patient?.gender ? (Gender.find((g) => g.value === patient.gender)?.label ?? patient.gender) : "";
  const patientBloodLabel = patient?.bloodGroup ? (Blood_Group.find((b) => b.value === patient.bloodGroup)?.label ?? patient.bloodGroup) : "";
  const patientDobFormatted = patient?.dob ? dayjs(patient.dob).format("DD-MM-YYYY") : "";
  const patientAgeDisplay = patient?.age != null ? String(patient.age) : (patient?.dob ? String(dayjs().diff(dayjs(patient.dob), "year")) : "");

  const handleAddProcedure = (option: Option | null) => {
    if (!option?.value || procedurePriceById[option.value] == null) return;
    const price = procedurePriceById[option.value] ?? 0;
    setAddedProcedures((prev) => {
      if (prev.some((p) => p.id === option.value)) return prev;
      return [...prev, { id: option.value, name: option.label, price }];
    });
    setAddProcedureSelect(null);
  };

  const handleRemoveProcedure = (id: string) => {
    setAddedProcedures((prev) => prev.filter((p) => p.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!daycareId || !API_BASE_URL) return;
    if (!selectedDoctor?.value) {
      setError("Please select a doctor.");
      return;
    }
    const bedChargesTypeLabel = bedChargesType?.label?.split("(")[0]?.trim() ?? "";
    const procedureIds = addedProcedures
      .map((p) => p.id)
      .filter((id) => Boolean(id) && procedurePriceById[id] != null);
    const uniqueProcedureIds = Array.from(new Set(procedureIds));

    setSubmitLoading(true);
    try {
      const payload = {
        ...(patientId && { patientId }),
        doctorId: selectedDoctor.value,
        bedChargesType: bedChargesTypeLabel || undefined,
        bedChargesHours: bedChargesHours || 1,
        bedChargesRate: bedChargesRate || 0,
        procedureIds: uniqueProcedureIds,
        doctorVisitCharges: doctorVisitCharges === "Yes",
        discount: discount ?? 0,
        appointmentDate: appointmentDate || undefined,
      };
      const res = await axios.put(
        `${API_BASE_URL}/hospital/daycare-appointments/${daycareId}`,
        payload
      );
      const ok = res?.status >= 200 && res?.status < 300;
      const codeOk = res?.data?.code === 200 || res?.data?.code === "200";
      if (ok || codeOk) {
        const modalEl = document.getElementById("edit_daycare_modal");
        if (modalEl) {
          const Modal = (window as any).bootstrap?.Modal;
          const instance = Modal?.getInstance?.(modalEl);
          if (instance?.hide) instance.hide();
          else modalEl.querySelector<HTMLElement>('[data-bs-dismiss="modal"]')?.click();
        }
        onEditSuccess?.();
      } else {
        setError(res?.data?.message ?? "Failed to update daycare appointment.");
      }
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Failed to update daycare appointment.");
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div
      className="modal fade"
      id="edit_daycare_modal"
      tabIndex={-1}
      aria-labelledby="edit_daycare_modal_label"
      aria-hidden="true"
      data-bs-backdrop="static"
      onBlur={handleModalHide}
    >
      <div className="modal-dialog modal-lg modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title fw-bold" id="edit_daycare_modal_label">
              Edit Daycare Appointment
            </h5>
            <button
              type="button"
              className="btn-close"
              data-bs-dismiss="modal"
              aria-label="Close"
            />
          </div>
          <div className="modal-body">
            {fetchLoading ? (
              <div className="text-center py-4">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} id="edit_daycare_form">
                {error && (
                  <div className="alert alert-danger py-2 mb-3" role="alert">
                    {error}
                  </div>
                )}
                {/* Patient Details – read-only, same as OPD edit */}
                <div className="p-0 mb-3">
                  <h6 className="fw-bold text-primary mb-3">Patient Details</h6>
                  <div className="row">
                    <div className="col-md-3">
                      <div className="mb-3">
                        <label className="form-label mb-1 fw-medium">Phone Number</label>
                        <input type="text" className="form-control bg-light" value={patient?.phone ?? ""} readOnly disabled />
                      </div>
                    </div>
                    <div className="col-md-2">
                      <div className="mb-3">
                        <label className="form-label mb-1 fw-medium">Title</label>
                        <input type="text" className="form-control bg-light" value={patientTitleLabel} readOnly disabled />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label mb-1 fw-medium">Name</label>
                        {patient?._id ? (
                          <Link
                            href={`${all_routes.patientDetails}?id=${patient._id}`}
                            className="form-control bg-light border-0 py-2 text-decoration-none text-dark d-flex align-items-center"
                            style={{ cursor: "pointer" }}
                          >
                            <span className="flex-grow-1 text-start">{patient?.name ?? "—"}</span>
                            <i className="ti ti-arrow-right fs-12 ms-1" />
                          </Link>
                        ) : (
                          <input type="text" className="form-control bg-light" value={patient?.name ?? ""} readOnly disabled />
                        )}
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="mb-3">
                        <label className="form-label mb-1 fw-medium">Gender</label>
                        <input type="text" className="form-control bg-light" value={patientGenderLabel} readOnly disabled />
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="mb-3">
                        <label className="form-label mb-1 fw-medium">Email</label>
                        <input type="text" className="form-control bg-light" value={patient?.email ?? ""} readOnly disabled />
                      </div>
                    </div>
                    <div className="col-md-2">
                      <div className="mb-3">
                        <label className="form-label mb-1 fw-medium">DOB</label>
                        <input type="text" className="form-control bg-light" value={patientDobFormatted} readOnly disabled />
                      </div>
                    </div>
                    <div className="col-md-2">
                      <div className="mb-3">
                        <label className="form-label mb-1 fw-medium">Age</label>
                        <input type="text" className="form-control bg-light" value={patientAgeDisplay} readOnly disabled />
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="mb-3">
                        <label className="form-label mb-1 fw-medium">Blood Group</label>
                        <input type="text" className="form-control bg-light" value={patientBloodLabel} readOnly disabled />
                      </div>
                    </div>
                    <div className="col-md-12">
                      <div className="mb-3">
                        <label className="form-label mb-1 fw-medium">Address</label>
                        <input type="text" className="form-control bg-light" value={patient?.address ?? ""} readOnly disabled />
                      </div>
                    </div>
                  </div>
                </div>
                {/* Day Care Details – editable */}
                <div className="p-0 mb-0">
                  <h6 className="fw-bold text-primary mb-3">Day Care Details</h6>
                </div>
                <div className="row">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label fw-medium">Consulting Doc <span className="text-danger">*</span></label>
                      <CommonSelect
                        options={doctorOptions}
                        value={selectedDoctor}
                        onChange={setSelectedDoctor}
                        onInputChange={(v) => fetchDoctors(v)}
                        isLoading={doctorSearchLoading}
                        placeholder="Search doctor..."
                      />
                    </div>
                    <div className="mb-3">
                      <div className="d-flex align-items-end gap-2 flex-wrap">
                        <div style={{ width: "62%", minWidth: 0 }}>
                          <label className="form-label fw-medium d-block">Daycare Charges Type</label>
                          <CommonSelect
                            options={BED_CHARGES_OPTIONS}
                            value={bedChargesType}
                            onChange={setBedChargesType}
                            placeholder="Select..."
                          />
                        </div>
                        <div style={{ width: "35%", minWidth: 0 }}>
                          <label className="form-label fw-medium d-block">Hours</label>
                          <input
                            type="number"
                            className="form-control"
                            min={0}
                            step={1}
                            value={bedChargesHours === 0 ? "" : bedChargesHours}
                            onChange={(e) => {
                              if (e.target.value === "") setBedChargesHours(0);
                              else {
                                const v = parseFloat(e.target.value);
                                if (!Number.isNaN(v) && v >= 0) setBedChargesHours(v);
                              }
                            }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="mb-3">
                      <label className="form-label fw-medium">Doctor Visit Charges</label>
                      <div className="d-flex gap-3 flex-wrap">
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="radio"
                            name="editDaycareDvc"
                            value="Yes"
                            checked={doctorVisitCharges === "Yes"}
                            onChange={() => setDoctorVisitCharges("Yes")}
                          />
                          <label className="form-check-label">Yes</label>
                        </div>
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="radio"
                            name="editDaycareDvc"
                            value="No"
                            checked={doctorVisitCharges === "No"}
                            onChange={() => setDoctorVisitCharges("No")}
                          />
                          <label className="form-check-label">No</label>
                        </div>
                      </div>
                    </div>
                    <div className="mb-3">
                      <label className="form-label fw-medium">Appointment Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={appointmentDate}
                        onChange={(e) => setAppointmentDate(e.target.value)}
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label fw-medium">Discount</label>
                      <input
                        type="number"
                        className="form-control"
                        min={0}
                        value={discount || ""}
                        onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="mb-2">
                      <label className="form-label fw-medium">Add Procedures</label>
                      <CommonSelect
                        options={proceduresOptions}
                        value={addProcedureSelect}
                        onChange={handleAddProcedure}
                        onInputChange={(v) => fetchProcedures(v)}
                        placeholder="Search procedure..."
                        isLoading={proceduresLoading}
                      />
                    </div>
                    <div className="border rounded overflow-hidden">
                      <div className="d-flex border-bottom bg-light px-2 py-1 fw-medium text-dark small">
                        <span className="col-1">S.No</span>
                        <span className="col">Procedure</span>
                        <span className="col text-end">Price</span>
                      </div>
                      <div className="text-dark small" style={{ maxHeight: "200px", overflowY: "auto" }}>
                        {addedProcedures.length === 0 ? (
                          <div className="px-2 py-3 text-center text-muted">No procedures added</div>
                        ) : (
                          addedProcedures.map((proc, idx) => (
                            <div key={proc.id} className="d-flex align-items-center border-bottom px-2 py-2">
                              <span className="col-1">{idx + 1}</span>
                              <span className="col">{proc.name}</span>
                              <span className="col d-flex align-items-center justify-content-end gap-1">
                                <span>{proc.price}</span>
                                <button
                                  type="button"
                                  className="btn btn-link p-0 text-danger min-w-0"
                                  aria-label="Remove"
                                  onClick={() => handleRemoveProcedure(proc.id)}
                                >
                                  <i className="ti ti-trash fs-16" />
                                </button>
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            )}
          </div>
          {!fetchLoading && (
            <div className="modal-footer">
              <button type="button" className="btn btn-light" data-bs-dismiss="modal">
                Cancel
              </button>
              <button
                type="submit"
                form="edit_daycare_form"
                className="btn btn-primary"
                disabled={submitLoading}
              >
                {submitLoading ? "Saving..." : "Save"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modals;
