"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import CommonSelect, { Option } from "@/core/common/common-select/commonSelect";
import { Title, Gender, Blood_Group } from "@/core/common/selectOption";
import { all_routes } from "@/routes/all_routes";
import axios from "axios";
interface IVisitTypeCharge {
  visitType?: string;
  appointmentType?: string;
  charge: number;
  type?: string;
}

interface IDoctor {
  _id: string;
  name: string;
  visitTypes?: IVisitTypeCharge[];
}
import { API_BASE_URL } from "@/environment";
import dayjs from "dayjs";
import { DatePicker } from "antd";
import IndianPhoneSearchInput from "@/core/common/indianPhoneInput/IndianPhoneSearchInput";
import {
  buildDaycareProceduresPayload,
  fetchDoctorDialysisSlots,
  isDialysisProcedureName,
  toDialysisSlotSelectOptions,
  type IDoctorDialysisSlot,
} from "@/components/pages/clinic-modules/daycare-appointments/daycareDialysisSlots";

const BED_CHARGES_OPTIONS: Option[] = [
  { value: "none", label: "None" },
  { value: "private", label: "Private (200/hr)" },
  { value: "semi", label: "Semi-Private (150/hr)" },
  { value: "general", label: "General (100/hr)" },
  { value: "custom", label: "Custom" },
];

const BED_CHARGES_RATE: Record<string, number> = { none: 0, private: 200, semi: 150, general: 100 };

interface IDaycareProcedure {
  procedureId: string;
  procedureName?: string;
  price?: number;
  slotId?: string;
  sessionDate?: string;
  isDialysis?: boolean;
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

interface IDaycareDoctor {
  _id: string;
  name: string;
}

interface IDaycareTransaction {
  _id: string;
  amount?: number;
  paymentMode?: string;
  createdAt?: string;
  transactionDate?: string;
}

interface IDaycareDetail {
  _id: string;
  patientId: string;
  doctorId: string;
  daycareChargesType?: string;
  daycareChargesHours?: number;
  daycareChargesRate?: number;
  customDaycareRate?: number;
  bedChargesType?: string;
  bedChargesHours?: number;
  bedChargesRate?: number;
  procedures?: IDaycareProcedure[];
  doctorVisitCharges?: boolean;
  discount?: number;
  appointmentDate?: string;
  doctor?: IDaycareDoctor;
  patient?: IDaycarePatient;
  amountPaid?: number;
  transactions?: IDaycareTransaction[];
}

const EditDaycareAppointmentComponent = () => {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [loading, setLoading] = useState<boolean>(false);
  const [submitLoading, setSubmitLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const [daycareId, setDaycareId] = useState<string | null>(null);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [patient, setPatient] = useState<IDaycarePatient | null>(null);

  const [doctorOptions, setDoctorOptions] = useState<Option[]>([]);
  const [doctors, setDoctors] = useState<IDoctor[]>([]);
  const [doctorSearchLoading, setDoctorSearchLoading] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Option | null>(null);

  const [bedChargesType, setBedChargesType] = useState<Option | null>(null);
  const [bedChargesHours, setBedChargesHours] = useState<number>(1);
  const [customDaycareRate, setCustomDaycareRate] = useState<number>(0);
  const [doctorVisitCharges, setDoctorVisitCharges] = useState<"Yes" | "No">("No");

  const [proceduresOptions, setProceduresOptions] = useState<Option[]>([]);
  const [procedurePriceById, setProcedurePriceById] = useState<Record<string, number>>({});
  const [proceduresLoading, setProceduresLoading] = useState(false);
  const [addedProcedures, setAddedProcedures] = useState<
    Array<{ id: string; name: string; price: number; isDialysis?: boolean }>
  >([]);
  const [addProcedureSelect, setAddProcedureSelect] = useState<Option | null>(null);
  const [procedureIsDialysisById, setProcedureIsDialysisById] = useState<Record<string, boolean>>({});
  const [dialysisSlots, setDialysisSlots] = useState<IDoctorDialysisSlot[]>([]);
  const [dialysisSlot, setDialysisSlot] = useState<Option | null>(null);
  const [dialysisSlotsLoading, setDialysisSlotsLoading] = useState(false);

  const [paymentMode, setPaymentMode] = useState<string>("Cash");
  const [amountReceived, setAmountReceived] = useState<number>(0);
  const [amountPaidFromApi, setAmountPaidFromApi] = useState<number>(0);

  const [discount, setDiscount] = useState<number>(0);
  const [discountFromApi, setDiscountFromApi] = useState<number>(0);
  const [discountPassword, setDiscountPassword] = useState<string>("");
  const [discountPasswordError, setDiscountPasswordError] = useState<string>("");
  const [showDiscountPasswordDialog, setShowDiscountPasswordDialog] = useState<boolean>(false);
  const [appointmentDate, setAppointmentDate] = useState<string>("");

  const isCustomDaycareCharges = bedChargesType?.value === "custom";
  const bedChargesRateStandard =
    bedChargesType?.value && !isCustomDaycareCharges
      ? (BED_CHARGES_RATE[bedChargesType.value] ?? 0)
      : 0;
  const bedChargesTotal = isCustomDaycareCharges
    ? Math.max(0, Number(customDaycareRate) || 0)
    : bedChargesRateStandard * (bedChargesHours > 0 ? bedChargesHours : 1);
  const proceduresTotal = addedProcedures.reduce((sum, p) => sum + p.price, 0);
  const [daycareDoctorCharge, setDaycareDoctorCharge] = useState<number>(0);
  const docVisitAmount = doctorVisitCharges === "Yes" ? daycareDoctorCharge : 0;
  const subtotal = bedChargesTotal + proceduresTotal + docVisitAmount;
  const netTotal = subtotal - (discount || 0);
  const balance = netTotal - (amountReceived || 0);

  const fetchDoctors = useCallback(
    async (search = "") => {
      if (!API_BASE_URL) return;
      setDoctorSearchLoading(true);
      try {
        const res = await axios.get(`${API_BASE_URL}/hospital/doctors`, {
          params: { limit: 50, search: search || undefined },
        });
        const list = res.data?.data?.doctors ?? res.data?.data ?? [];
        const arr = Array.isArray(list) ? (list as IDoctor[]) : [];
        setDoctors(arr);
        setDoctorOptions(
          arr.map((d) => ({ value: d._id, label: d.name ?? "—" }))
        );
      } catch {
        setDoctorOptions([]);
      } finally {
        setDoctorSearchLoading(false);
      }
    },
    []
  );

  const procedureSearchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        arr.map((p: { _id: string; procedureName?: string; category?: string; price?: number; basePrice?: number; isDialysis?: boolean }) => ({
          value: p._id,
          label: p.procedureName ?? "—",
        }))
      );
      const priceMap: Record<string, number> = {};
      const dialysisMap: Record<string, boolean> = {};
      arr.forEach((p: { _id: string; procedureName?: string; category?: string; price?: number; basePrice?: number; isDialysis?: boolean }) => {
        priceMap[p._id] = p.price ?? p.basePrice ?? 0;
        dialysisMap[p._id] =
          p.isDialysis === true || isDialysisProcedureName(p.procedureName, p.category);
      });
      setProcedurePriceById((prev) => ({ ...prev, ...priceMap }));
      setProcedureIsDialysisById((prev) => ({ ...prev, ...dialysisMap }));
    } catch {
      setProceduresOptions([]);
      setProcedurePriceById({});
    } finally {
      setProceduresLoading(false);
    }
  }, []);

  const fetchDaycare = useCallback(
    async (daycareIdParam: string) => {
      if (!API_BASE_URL) return;
      setLoading(true);
      setError("");
      try {
        const res = await axios.get(`${API_BASE_URL}/hospital/daycare-appointments/${daycareIdParam}`);
        const raw = res.data?.data?.daycareAppointment ?? res.data?.data;
        const data = raw as IDaycareDetail | undefined;
        if (!data) {
          setError("Daycare appointment not found.");
          return;
        }

        setDaycareId(data._id);
        setPatientId(data.patientId ?? null);

        if (data.patient) {
          setPatient(data.patient as IDaycarePatient);
        } else if (data.patientId) {
          try {
            const pRes = await axios.get(`${API_BASE_URL}/hospital/patients/${data.patientId}`);
            const pData = pRes.data?.data?.patient ?? pRes.data?.data;
            if (pData) setPatient({ _id: data.patientId, ...(pData as any) } as IDaycarePatient);
          } catch {
            setPatient(null);
          }
        } else {
          setPatient(null);
        }

        if (data.doctor) {
          setSelectedDoctor({ value: data.doctor._id, label: data.doctor.name ?? "" });
        } else if (data.doctorId) {
          const match = doctors.find((d) => d._id === data.doctorId);
          setSelectedDoctor({
            value: data.doctorId,
            label: match?.name ?? "",
          });
        } else {
          setSelectedDoctor(null);
        }

        const rawChargesType = (data.daycareChargesType ?? data.bedChargesType ?? "").trim();
        const bt = rawChargesType.toLowerCase();
        const bedOption =
          bt === "custom"
            ? BED_CHARGES_OPTIONS.find((o) => o.value === "custom") ?? BED_CHARGES_OPTIONS[0]
            : BED_CHARGES_OPTIONS.find(
                (o) =>
                  o.value === bt ||
                  o.label.toLowerCase().startsWith(rawChargesType.toLowerCase())
              ) ?? BED_CHARGES_OPTIONS[0];
        setBedChargesType(bedOption);
        if (bt === "custom") {
          setCustomDaycareRate(
            Number(data.customDaycareRate ?? data.daycareChargesRate ?? data.bedChargesRate ?? 0) || 0
          );
          setBedChargesHours(1);
        } else {
          setCustomDaycareRate(0);
          setBedChargesHours(
            (data as any).daycareChargesHours != null && (data as any).daycareChargesHours > 0
              ? (data as any).daycareChargesHours
              : data.bedChargesHours != null && data.bedChargesHours > 0
                ? data.bedChargesHours
                : 1
          );
        }
        setDoctorVisitCharges(data.doctorVisitCharges ? "Yes" : "No");

        const procs = (data.procedures ?? []).map((p) => ({
          id: p.procedureId ?? (p as { _id?: string })._id,
          name: p.procedureName ?? "—",
          price: p.price ?? 0,
          isDialysis:
            Boolean(p.isDialysis) ||
            isDialysisProcedureName(p.procedureName) ||
            Boolean(p.slotId),
        }));
        setAddedProcedures(procs);
        const existingSlotId = (data.procedures ?? []).find(
          (p) => (p as { slotId?: string }).slotId
        ) as { slotId?: string } | undefined;
        if (existingSlotId?.slotId) {
          setDialysisSlot({ value: existingSlotId.slotId, label: "Selected slot" });
        } else {
          setDialysisSlot(null);
        }
        setDiscount(data.discount ?? 0);
        setDiscountFromApi(data.discount ?? 0);
        setAppointmentDate(
          data.appointmentDate ? dayjs(data.appointmentDate).format("YYYY-MM-DD") : ""
        );

        // doctor charge for daycare (from API if present)
        const apiDoctorCharge =
          (data as any).doctorChargesAmount != null
            ? Number((data as any).doctorChargesAmount)
            : 0;
        setDaycareDoctorCharge(apiDoctorCharge);

        const txTotal = Array.isArray(data.transactions)
          ? data.transactions.reduce((sum, t) => sum + (Number(t?.amount) || 0), 0)
          : 0;
        const paid = data.amountPaid != null ? Number(data.amountPaid) : txTotal;
        setAmountPaidFromApi(paid);
        setAmountReceived(paid);
        const lastMode = Array.isArray(data.transactions) && data.transactions.length
          ? data.transactions[data.transactions.length - 1]?.paymentMode
          : undefined;
        setPaymentMode(lastMode ?? "Cash");
      } catch (err: any) {
        setError(err?.response?.data?.message ?? "Failed to load daycare appointment.");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!id) return;
    fetchDoctors();
    fetchProcedures();
    fetchDaycare(id);
  }, [id, fetchDoctors, fetchProcedures, fetchDaycare]);

  // If no doctor charge came from API, try to derive it from doctor's visitTypes (same logic as create)
  useEffect(() => {
    if (!selectedDoctor?.value || daycareDoctorCharge > 0) return;
    const doctor = doctors.find((d) => d._id === selectedDoctor.value);
    const visitTypes = doctor?.visitTypes;
    if (!visitTypes?.length) return;
    const match = visitTypes.find((vt) => {
      if (vt.visitType != null && vt.appointmentType != null) {
        return (
          vt.visitType === "New" &&
          (vt.appointmentType === "Day care" || vt.appointmentType === "Day Care")
        );
      }
      if (vt.type != null) return vt.type === "Day Care";
      return false;
    });
    if (match?.charge != null) {
      setDaycareDoctorCharge(match.charge);
    }
  }, [selectedDoctor?.value, doctors, daycareDoctorCharge]);

  useEffect(() => {
    const doctorId = selectedDoctor?.value;
    if (!doctorId) {
      setDialysisSlots([]);
      setDialysisSlotsLoading(false);
      return;
    }
    let cancelled = false;
    const loadSlots = async () => {
      setDialysisSlotsLoading(true);
      try {
        const slots = await fetchDoctorDialysisSlots(doctorId);
        if (cancelled) return;
        setDialysisSlots(slots);
        setDialysisSlot((prev) => {
          if (!prev?.value) return prev;
          const match = slots.find((slot) => slot._id === prev.value);
          if (!match) return prev;
          const options = toDialysisSlotSelectOptions([match]);
          return options[0] ?? prev;
        });
      } catch {
        if (!cancelled) setDialysisSlots([]);
      } finally {
        if (!cancelled) setDialysisSlotsLoading(false);
      }
    };
    void loadSlots();
    return () => {
      cancelled = true;
    };
  }, [selectedDoctor?.value]);

  const handleProcedureInputChange = useCallback(
    (value: string) => {
      if (procedureSearchDebounceRef.current) {
        clearTimeout(procedureSearchDebounceRef.current);
        procedureSearchDebounceRef.current = null;
      }
      procedureSearchDebounceRef.current = setTimeout(() => {
        void fetchProcedures(value);
      }, 300);
    },
    [fetchProcedures]
  );

  const handleAddProcedure = (option: Option | null) => {
    if (!option?.value || procedurePriceById[option.value] == null) return;
    const price = procedurePriceById[option.value] ?? 0;
    const isDialysis =
      procedureIsDialysisById[option.value] === true ||
      isDialysisProcedureName(option.label);
    setAddedProcedures((prev) => {
      if (prev.some((p) => p.id === option.value)) return prev;
      return [...prev, { id: option.value, name: option.label, price, isDialysis }];
    });
    setAddProcedureSelect(null);
  };

  const handleRemoveProcedure = (id: string) => {
    setAddedProcedures((prev) => prev.filter((p) => p.id !== id));
  };

  const doDaycareSubmit = async (discountPwd: string | undefined) => {
    if (!daycareId || !API_BASE_URL || !selectedDoctor?.value) return;
    const bedChargesTypeLabel = bedChargesType?.label?.split("(")[0]?.trim() ?? "";
    const isCustomCharges = bedChargesType?.value === "custom";
    const standardBedRate =
      bedChargesType?.value && !isCustomCharges
        ? (BED_CHARGES_RATE[bedChargesType.value] ?? 0)
        : 0;
    const daycareChargesFields = isCustomCharges
      ? {
          daycareChargesType: "Custom" as const,
          customDaycareRate: Math.max(0, Number(customDaycareRate) || 0),
        }
      : {
          daycareChargesType: bedChargesTypeLabel || undefined,
          daycareChargesHours: bedChargesHours || 1,
          bedChargesType: bedChargesTypeLabel || undefined,
          bedChargesHours: bedChargesHours || 1,
          bedChargesRate: standardBedRate || 0,
        };
    const procedureIds = addedProcedures
      .map((p) => p.id)
      .filter((pid) => Boolean(pid) && procedurePriceById[pid] != null);
    const uniqueProcedureIds = Array.from(new Set(procedureIds));
    const hasDialysisProcedure = addedProcedures.some(
      (proc) => proc.isDialysis || isDialysisProcedureName(proc.name)
    );
    if (!appointmentDate) {
      setError("Please select an appointment date.");
      return;
    }
    if (hasDialysisProcedure) {
      if (!dialysisSlot?.value) {
        setError("Please select a dialysis slot for the dialysis procedure.");
        return;
      }
    }
    const discountNum = Number(discount) || 0;

    setSubmitLoading(true);
    setError("");
    try {
      const remainingAmount = Math.max(
        0,
        (Number(amountReceived) || 0) - (Number(amountPaidFromApi) || 0)
      );
      const payload = {
        ...(patientId && { patientId }),
        doctorId: selectedDoctor.value,
        ...daycareChargesFields,
        appointmentDate,
        ...(hasDialysisProcedure
          ? {
              procedures: buildDaycareProceduresPayload(
                addedProcedures,
                dialysisSlot?.value,
                appointmentDate
              ),
            }
          : { procedureIds: uniqueProcedureIds }),
        doctorVisitCharges: doctorVisitCharges === "Yes",
        discount: discountNum,
        ...(discountNum > 0 && discountPwd !== undefined && discountPwd !== "" && { discountPassword: discountPwd }),
      };
      const res = await axios.put(
        `${API_BASE_URL}/hospital/daycare-appointments/${daycareId}`,
        payload
      );
      const ok = res?.status >= 200 && res?.status < 300;
      const codeOk = res?.data?.code === 200 || res?.data?.code === "200";
      if (ok || codeOk) {
        if (remainingAmount > 0) {
          try {
            await axios.post(`${API_BASE_URL}/hospital/transactions`, {
              visitId: daycareId,
              transactionType: "Payment",
              amount: remainingAmount,
              paymentMode,
            });
          } catch (txErr) {
            console.error("Daycare updated but transaction failed:", txErr);
          }
        }
        router.push(all_routes.daycareAppointments);
      } else {
        const responseMessage = res?.data?.message ?? "Failed to update daycare appointment.";
        if (discountPwd !== undefined && discount > 0) {
          setDiscountPasswordError(String(responseMessage));
          setShowDiscountPasswordDialog(true);
          setError("");
          return;
        }
        setError(responseMessage);
      }
    } catch (err: any) {
      const apiMessage =
        err?.response?.data?.message ?? "Failed to update daycare appointment.";
      if (discountPwd !== undefined && discount > 0) {
        setDiscountPasswordError(String(apiMessage));
        setShowDiscountPasswordDialog(true);
        setError("");
        return;
      }
      setError(apiMessage);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!daycareId || !API_BASE_URL) return;
    if (!selectedDoctor?.value) {
      setError("Please select a doctor.");
      return;
    }
    const hasDiscountMismatch = Math.abs(discount - discountFromApi) > 0.0001;
    if (discount > 0 && hasDiscountMismatch) {
      setDiscountPassword("");
      setDiscountPasswordError("");
      setShowDiscountPasswordDialog(true);
      return;
    }
    void doDaycareSubmit(undefined);
  };

  const handleDiscountPasswordConfirm = () => {
    if (!discountPassword.trim()) {
      setDiscountPasswordError("Please enter the discount password.");
      return;
    }
    setDiscountPasswordError("");
    void doDaycareSubmit(discountPassword.trim());
  };

  const handleDiscountPasswordCancel = () => {
    setShowDiscountPasswordDialog(false);
    setDiscountPassword("");
    setDiscountPasswordError("");
  };

  const patientTitleLabel = patient?.title
    ? Title.find((t) => t.value === patient.title)?.label ?? patient.title
    : "";
  const patientGenderLabel = patient?.gender
    ? Gender.find((g) => g.value === patient.gender)?.label ?? patient.gender
    : "";
  const patientBloodLabel = patient?.bloodGroup
    ? Blood_Group.find((b) => b.value === patient.bloodGroup)?.label ?? patient.bloodGroup
    : "";
  const patientDobFormatted = patient?.dob ? dayjs(patient.dob).format("DD-MM-YYYY") : "";
  const patientAgeDisplay =
    patient?.age != null
      ? String(patient.age)
      : patient?.dob
      ? String(dayjs().diff(dayjs(patient.dob), "year"))
      : "";

  return (
    <div className="page-wrapper">
      {showDiscountPasswordDialog && (
        <div
          className="modal fade show d-block"
          id="edit-daycare-discount-password-modal"
          tabIndex={-1}
          aria-labelledby="edit-daycare-discount-password-label"
          aria-modal="true"
          role="dialog"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title" id="edit-daycare-discount-password-label">
                  Discount password
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  onClick={handleDiscountPasswordCancel}
                />
              </div>
              <div className="modal-body">
                <label htmlFor="edit-daycare-discount-password-input" className="form-label">
                  Enter password to apply discount
                </label>
                {discountPasswordError ? (
                  <div className="alert alert-danger py-2 mb-2" role="alert">
                    {discountPasswordError}
                  </div>
                ) : null}
                <input
                  id="edit-daycare-discount-password-input"
                  type="password"
                  className="form-control"
                  value={discountPassword}
                  onChange={(e) => setDiscountPassword(e.target.value)}
                  placeholder="Password"
                  onKeyDown={(e) => e.key === "Enter" && handleDiscountPasswordConfirm()}
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-light" onClick={handleDiscountPasswordCancel}>
                  Cancel
                </button>
                <button type="button" className="btn btn-primary" onClick={handleDiscountPasswordConfirm}>
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="content">
        <div className="mb-4">
          <h6 className="fw-bold mb-0 d-flex align-items-center">
            <Link href={all_routes.daycareAppointments} className="text-dark">
              <i className="ti ti-chevron-left me-1" />
              Edit Daycare Appointments
            </Link>
          </h6>
        </div>

        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        {loading ? (
          <div className="d-flex justify-content-center align-items-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="card mb-3">
              <div className="card-body">
                <h6 className="fw-bold text-primary mb-3">Patient Details</h6>
                <div className="row">
                  <div className="col-md-3">
                    <div className="mb-3">
                      <label className="form-label mb-1 fw-medium">Phone Number</label>
                      <IndianPhoneSearchInput
                        value={patient?.phone ?? ""}
                        readOnly
                        disabled
                        className="bg-light"
                        inputClassName="bg-light"
                      />
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="mb-3">
                      <label className="form-label mb-1 fw-medium">Title</label>
                      <input
                        type="text"
                        className="form-control bg-light"
                        value={patientTitleLabel}
                        readOnly
                        disabled
                      />
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
                          <span className="flex-grow-1 text-start">
                            {patient?.name ?? "—"}
                          </span>
                          <i className="ti ti-arrow-right fs-12 ms-1" />
                        </Link>
                      ) : (
                        <input
                          type="text"
                          className="form-control bg-light"
                          value={patient?.name ?? ""}
                          readOnly
                          disabled
                        />
                      )}
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="mb-3">
                      <label className="form-label mb-1 fw-medium">Gender</label>
                      <input
                        type="text"
                        className="form-control bg-light"
                        value={patientGenderLabel}
                        readOnly
                        disabled
                      />
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="mb-3">
                      <label className="form-label mb-1 fw-medium">Email</label>
                      <input
                        type="text"
                        className="form-control bg-light"
                        value={patient?.email ?? ""}
                        readOnly
                        disabled
                      />
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="mb-3">
                      <label className="form-label mb-1 fw-medium">DOB</label>
                      <input
                        type="text"
                        className="form-control bg-light"
                        value={patientDobFormatted}
                        readOnly
                        disabled
                      />
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="mb-3">
                      <label className="form-label mb-1 fw-medium">Age</label>
                      <input
                        type="text"
                        className="form-control bg-light"
                        value={patientAgeDisplay}
                        readOnly
                        disabled
                      />
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="mb-3">
                      <label className="form-label mb-1 fw-medium">Blood Group</label>
                      <input
                        type="text"
                        className="form-control bg-light"
                        value={patientBloodLabel}
                        readOnly
                        disabled
                      />
                    </div>
                  </div>
                  <div className="col-md-5">
                    <div className="mb-3">
                      <label className="form-label mb-1 fw-medium">Address</label>
                      <input
                        type="text"
                        className="form-control bg-light"
                        value={patient?.address ?? ""}
                        readOnly
                        disabled
                      />
                    </div>
                    <div className="row g-2">
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label mb-1 fw-medium">Relation to Patient</label>
                          <input
                            type="text"
                            className="form-control bg-light"
                            value={(patient as any)?.attendantRelation ?? ""}
                            readOnly
                            disabled
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label mb-1 fw-medium">Attendant Name</label>
                          <input
                            type="text"
                            className="form-control bg-light"
                            value={(patient as any)?.attendantName ?? ""}
                            readOnly
                            disabled
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-7">
                    <div className="row g-2">
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label mb-1 fw-medium">Aadhar No</label>
                          <input
                            type="text"
                            className="form-control bg-light"
                            value={(patient as any)?.aadharNo ?? ""}
                            readOnly
                            disabled
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label mb-1 fw-medium">Ayushman No</label>
                          <input
                            type="text"
                            className="form-control bg-light"
                            value={(patient as any)?.ayushmanCardNo ?? (patient as any)?.ayushmanNo ?? ""}
                            readOnly
                            disabled
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="row mb-3">
              <div className="col-lg-7 pe-3">
                <div className="card h-100">
                  <div className="card-body p-3">
                    <h6 className="fw-bold text-primary mb-2">Day Care Details</h6>
                    <div className="row">
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label mb-1 fw-medium">
                            Consulting Doc<span className="text-danger ms-1">*</span>
                          </label>
                          <CommonSelect
                            options={doctorOptions}
                            value={selectedDoctor}
                            disabled
                            isLoading={doctorSearchLoading}
                            placeholder="Search doctor..."
                          />
                        </div>
                        {selectedDoctor ? (
                          <div className="mb-3">
                            <label className="form-label mb-1 fw-medium">
                              Dialysis Slot
                              {addedProcedures.some(
                                (proc) => proc.isDialysis || isDialysisProcedureName(proc.name)
                              ) ? (
                                <span className="text-danger ms-1">*</span>
                              ) : null}
                            </label>
                            <CommonSelect
                              options={toDialysisSlotSelectOptions(dialysisSlots)}
                              value={dialysisSlot}
                              onChange={setDialysisSlot}
                              isLoading={dialysisSlotsLoading}
                              placeholder={
                                dialysisSlotsLoading
                                  ? "Loading slots..."
                                  : dialysisSlots.length === 0
                                    ? "No dialysis slots"
                                    : "Select slot..."
                              }
                            />
                          </div>
                        ) : null}
                        <div className="mb-3">
                          <label className="form-label mb-1 fw-medium">
                            Appointment Date
                            <span className="text-danger ms-1">*</span>
                          </label>
                          <div className="input-icon-end position-relative">
                            <DatePicker
                              className="form-control datetimepicker"
                              format={{ format: "DD-MM-YYYY", type: "mask" }}
                              placeholder="DD-MM-YYYY"
                              suffixIcon={null}
                              value={appointmentDate ? dayjs(appointmentDate) : null}
                              onChange={(date) =>
                                setAppointmentDate(date ? date.format("YYYY-MM-DD") : "")
                              }
                            />
                            <span className="input-icon-addon">
                              <i className="ti ti-calendar" />
                            </span>
                          </div>
                        </div>
                        <div className="mb-3">
                          <div className="d-flex align-items-end gap-2 flex-wrap">
                            <div style={{ width: "62%", minWidth: 0 }}>
                              <label className="form-label mb-1 fw-medium d-block">
                                Daycare Charges Type
                              </label>
                              <CommonSelect
                                options={BED_CHARGES_OPTIONS}
                                value={bedChargesType}
                                onChange={(opt) => {
                                  setBedChargesType(opt);
                                  if (opt?.value !== "custom") {
                                    setCustomDaycareRate(0);
                                  }
                                }}
                                placeholder="Select..."
                              />
                            </div>
                            <div style={{ width: "35%", minWidth: 0 }}>
                              <label className="form-label mb-1 fw-medium d-block">
                                {isCustomDaycareCharges ? "Amount (₹)" : "Hours"}
                              </label>
                              {isCustomDaycareCharges ? (
                                <input
                                  type="number"
                                  className="form-control"
                                  min={0}
                                  step={0.01}
                                  value={customDaycareRate === 0 ? "" : customDaycareRate}
                                  onChange={(e) => {
                                    if (e.target.value === "") {
                                      setCustomDaycareRate(0);
                                      return;
                                    }
                                    const v = parseFloat(e.target.value);
                                    if (!Number.isNaN(v) && v >= 0) setCustomDaycareRate(v);
                                  }}
                                  placeholder="0"
                                />
                              ) : (
                                <input
                                  type="number"
                                  className="form-control"
                                  min={0}
                                  step={1}
                                  value={bedChargesHours === 0 ? "" : bedChargesHours}
                                  onChange={(e) => {
                                    if (e.target.value === "") {
                                      setBedChargesHours(0);
                                      return;
                                    }
                                    const v = parseFloat(e.target.value);
                                    if (!Number.isNaN(v) && v >= 0) setBedChargesHours(v);
                                  }}
                                />
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="mb-3">
                          <label className="form-label mb-1 fw-medium">Doctor Visit Charges</label>
                          <div className="d-flex gap-3 flex-wrap">
                            <div className="form-check">
                              <input
                                className="form-check-input"
                                type="radio"
                                name="editDaycareDvcPage"
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
                                name="editDaycareDvcPage"
                                value="No"
                                checked={doctorVisitCharges === "No"}
                                onChange={() => setDoctorVisitCharges("No")}
                              />
                              <label className="form-check-label">No</label>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-2">
                          <label className="form-label mb-1 fw-medium">Add Procedures</label>
                          <CommonSelect
                            options={proceduresOptions}
                            value={addProcedureSelect}
                            onChange={handleAddProcedure}
                            onInputChange={handleProcedureInputChange}
                            placeholder="Search procedure..."
                            isLoading={proceduresLoading}
                          />
                        </div>
                        <div className="mt-2">
                          <div className="border rounded overflow-hidden">
                            <div
                              className="d-flex border-bottom bg-light px-2 py-1 fw-medium text-dark"
                              style={{ fontSize: "0.95rem" }}
                            >
                              <span className="col-1 text-nowrap">S.No</span>
                              <span className="col text-nowrap ps-3">Procedure</span>
                              <span className="col text-end pe-4 text-nowrap">Price</span>
                            </div>
                            <div
                              className="text-dark"
                              style={{ maxHeight: "170px", overflowY: "auto", fontSize: "0.95rem" }}
                            >
                              {addedProcedures.length === 0 ? (
                                <div className="px-2 py-3 text-center">No procedures added</div>
                              ) : (
                                addedProcedures.map((proc, idx) => (
                                  <div
                                    key={proc.id}
                                    className="d-flex align-items-center border-bottom px-2 py-2"
                                  >
                                    <span className="col-1">{idx + 1}</span>
                                    <span className="col ps-3">{proc.name}</span>
                                    <span className="col d-flex align-items-center justify-content-end gap-1">
                                      <span>{proc.price}</span>
                                      <button
                                        type="button"
                                        className="btn btn-link p-0 text-danger min-w-0"
                                        aria-label="Remove procedure"
                                        onClick={() => handleRemoveProcedure(proc.id)}
                                      >
                                        <i className="ti ti-trash ps-1 fs-16" />
                                      </button>
                                    </span>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-lg-5 ps-3">
                <div className="card h-100">
                  <div className="card-body p-3">
                    <h6 className="fw-bold text-primary mb-2">Payment Details</h6>
                    <div className="mb-3 d-flex align-items-center flex-wrap gap-2">
                      <label className="form-label mb-0 fw-medium me-2" style={{ minWidth: "120px" }}>
                        Payment Mode
                      </label>
                      <div className="d-flex gap-3 flex-wrap">
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="radio"
                            name="editDaycarePaymentMode"
                            value="Cash"
                            checked={paymentMode === "Cash"}
                            onChange={(e) => setPaymentMode(e.target.value)}
                          />
                          <label className="form-check-label">Cash</label>
                        </div>
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="radio"
                            name="editDaycarePaymentMode"
                            value="UPI"
                            checked={paymentMode === "UPI"}
                            onChange={(e) => setPaymentMode(e.target.value)}
                          />
                          <label className="form-check-label">UPI</label>
                        </div>
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="radio"
                            name="editDaycarePaymentMode"
                            value="Card"
                            checked={paymentMode === "Card"}
                            onChange={(e) => setPaymentMode(e.target.value)}
                          />
                          <label className="form-check-label">Card</label>
                        </div>
                      </div>
                    </div>

                    <div className="border rounded overflow-hidden">
                      <div className="d-flex justify-content-between align-items-center px-2 py-2 border-bottom bg-light">
                        <span className="fw-medium">Bed Charges</span>
                        <span className="text-end">{Math.round(bedChargesTotal)}</span>
                      </div>
                      {addedProcedures.length > 0 && (
                        <div className="d-flex justify-content-between align-items-center px-2 py-2 border-bottom">
                          <span className="fw-medium">Procedures Charges</span>
                          <span className="text-end">{Math.round(proceduresTotal)}</span>
                        </div>
                      )}
                      {doctorVisitCharges === "Yes" && (
                        <div className="d-flex justify-content-between align-items-center px-2 py-2 border-bottom">
                          <span className="fw-medium">Doc Visit Charges</span>
                          <span className="text-end">{Math.round(docVisitAmount)}</span>
                        </div>
                      )}
                      <div className="d-flex justify-content-between align-items-center px-2 py-2 border-bottom">
                        <span className="fw-medium">SubTotal</span>
                        <span className="text-end">{Math.round(subtotal)}</span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center px-2 py-2 border-bottom gap-2">
                        <span className="fw-medium">Discount</span>
                        <input
                          type="number"
                          className="form-control text-end"
                          style={{ maxWidth: "100px", fontSize: "16px" }}
                          value={discount || ""}
                          onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                          onChange={(e) => {
                            setDiscount(parseFloat(e.target.value) || 0);
                          }}
                          min={0}
                        />
                      </div>
                      <div className="d-flex justify-content-between align-items-center px-2 py-2 border-bottom gap-2">
                        <span className="fw-medium">Amount Received</span>
                        <input
                          type="number"
                          className="form-control text-end"
                          style={{ maxWidth: "100px", fontSize: "16px" }}
                          value={amountReceived || ""}
                          onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                          onChange={(e) => setAmountReceived(parseFloat(e.target.value) || 0)}
                          min={0}
                        />
                      </div>
                      <div
                        className="d-flex justify-content-between align-items-center px-2 py-2 fw-bold"
                        style={{ backgroundColor: "#FFF7DB" }}
                      >
                        <span>Balance</span>
                        <span className="text-end">{Math.round(balance)}</span>
                      </div>
                     
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="d-flex justify-content-end gap-2 mt-3">
              <button
                type="button"
                className="btn btn-light"
                onClick={() => router.push(all_routes.daycareAppointments)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitLoading}>
                {submitLoading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default EditDaycareAppointmentComponent;

