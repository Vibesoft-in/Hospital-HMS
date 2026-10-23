"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import CommonSelect, { Option } from "@/core/common/common-select/commonSelect";
import { Title, Gender, Blood_Group, Marital_Status } from "@/core/common/selectOption";
import { all_routes } from "@/routes/all_routes";
import axios from "axios";
import { API_BASE_URL } from "@/environment";
import dayjs from "dayjs";
import IpdBedSelectionStep from "@/components/pages/clinic-modules/ipd-appointments/ipd-bed-selection/IpdBedSelectionStep";
import {
  fetchIpdBedBlockView,
  fetchIpdWardOptions,
  type IIpdWardOption,
} from "@/components/pages/clinic-modules/ipd-appointments/ipd-bed-selection/fetchIpdBedBlockView";
import type {
  IIpdBed,
  IIpdBedBlockViewData,
} from "@/components/pages/clinic-modules/ipd-appointments/ipd-bed-selection/ipdBedTypes";
import { getIpdDoctorVisitingCharge } from "@/components/pages/clinic-modules/ipd-appointments/ipdDoctorVisitingCharge";
import IpdAddChargesField from "@/components/pages/clinic-modules/ipd-appointments/IpdAddChargesField";
import {
  addIpdDoctorVisitRow,
  buildIpdDoctorBillingCharges,
  calcIpdDoctorChargesTotalWithConsulting,
  decrementIpdDoctorVisitDays,
  incrementIpdDoctorVisitDays,
  ipdDoctorVisitRowsFromBilling,
  removeIpdDoctorVisitRow,
  type IIpdDoctorVisitRow,
} from "@/components/pages/clinic-modules/ipd-appointments/ipdDoctorVisitRows";
import IpdFormStepIndicator from "@/components/pages/clinic-modules/ipd-appointments/IpdFormStepIndicator";
import IpdAdmissionSummarySidebar, {
  resolveIpdBedSummary,
  type IIpdSummaryBed,
} from "@/components/pages/clinic-modules/ipd-appointments/IpdAdmissionSummarySidebar";
import IpdMlcFields, {
  emptyIpdMlcData,
  type IIpdMlcData,
} from "@/components/pages/clinic-modules/ipd-appointments/IpdMlcFields";
import IpdPatientCompactUpload from "@/components/pages/clinic-modules/ipd-appointments/IpdPatientCompactUpload";
import IndianPhoneSearchInput from "@/core/common/indianPhoneInput/IndianPhoneSearchInput";
import { getPatientMaritalStatus } from "@/core/utils/patientMaritalStatus";
import type { IIpdProcedureRow } from "@/components/pages/clinic-modules/ipd-appointments/IpdProceduresTable";
import {
  addIpdProcedureRow,
  buildIpdProcedureBillingCharges,
  calcIpdProceduresTotal,
  decrementIpdProcedureUnits,
  incrementIpdProcedureUnits,
  ipdProcedureRowsFromBilling,
  ipdProcedureRowsFromLegacy,
  removeIpdProcedureRow,
  seedIpdProcedureMapsFromBilling,
  toggleIpdProcedureCompleted,
} from "@/components/pages/clinic-modules/ipd-appointments/ipdProcedureRows";
import {
  extractIpdFromGetResponse,
  type IIpdApiRecord,
} from "@/components/pages/clinic-modules/ipd-appointments/ipdApiHelpers";

interface IVisitTypeCharge {
  visitType?: string;
  appointmentType?: string;
  charge: number;
  type?: string;
}

interface IDoctor {
  _id: string;
  name: string;
  department?: string;
  visitTypes?: IVisitTypeCharge[];
}

interface IIpdPatient {
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
  months?: number;
  days?: number;
  maritalStatus?: string;
  maritialStatus?: string;
  occupation?: string;
  drugSensitivity?: string;
  aadharNo?: string;
  aadharS3Url?: string;
  imageS3Url?: string;
  ayushmanCardNo?: string;
  ayushmanCardS3Url?: string;
  otherDocsS3Urls?: string[];
  attendantName?: string;
  attendantRelation?: string;
}

interface IIpdBillingCharge {
  type?: string;
  procedureId?: string;
  doctorId?: string;
  units?: number;
  procedureName?: string;
  price?: number;
}

type IIpdBillingChargePayload =
  | { type: "procedure"; procedureId: string; units: number; isCompleted: boolean }
  | { type: "doctor"; doctorId: string; units: number };

interface IIpdHospitalVisit {
  _id: string;
  visitMongoId?: string;
  visitId?: string;
  visitDate?: string;
}

interface IIpdUpdatePayload {
  patientId: string;
  doctorId: string;
  bedId: string;
  admissionDate: string;
  reason: string;
  visitId?: string;
  billingCharges: IIpdBillingChargePayload[];
  discount?: number;
  discountPassword?: string;
  isMLC?: boolean;
  mlc?: IIpdMlcData;
  transaction?: {
    transactionType: "Payment";
    amount: number;
    paymentMode: string;
  };
  imageS3Url?: string;
  aadharS3Url?: string;
  ayushmanCardS3Url?: string;
  otherDocsS3Urls?: string[];
}

const EditIpdAppointmentComponent = () => {
  const params = useParams();
  const router = useRouter();
  const routeId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState("");

  const [ipdRecordId, setIpdRecordId] = useState<string | null>(null);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [patient, setPatient] = useState<IIpdPatient | null>(null);
  const [patientPhotoFile, setPatientPhotoFile] = useState<File | null>(null);
  const [patientAadharFile, setPatientAadharFile] = useState<File | null>(null);
  const [patientAyushmanFile, setPatientAyushmanFile] = useState<File | null>(null);
  const [patientOtherDocFile, setPatientOtherDocFile] = useState<File | null>(null);
  const [patientImageS3Url, setPatientImageS3Url] = useState<string>("");
  const [patientAadharS3Url, setPatientAadharS3Url] = useState<string>("");
  const [patientAyushmanCardS3Url, setPatientAyushmanCardS3Url] = useState<string>("");
  const [patientOtherDocsS3Urls, setPatientOtherDocsS3Urls] = useState<string[]>([]);

  const [formStep, setFormStep] = useState<1 | 2 | 3>(1);

  const [doctorOptions, setDoctorOptions] = useState<Option[]>([]);
  const [doctors, setDoctors] = useState<IDoctor[]>([]);
  const [doctorSearchLoading, setDoctorSearchLoading] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Option | null>(null);

  const [proceduresOptions, setProceduresOptions] = useState<Option[]>([]);
  const [procedurePriceById, setProcedurePriceById] = useState<Record<string, number>>({});
  const [procedureCategoryById, setProcedureCategoryById] = useState<Record<string, string>>({});
  const [proceduresLoading, setProceduresLoading] = useState(false);
  const [addedProcedures, setAddedProcedures] = useState<IIpdProcedureRow[]>([]);

  const [reason, setReason] = useState("");
  const [admissionDate, setAdmissionDate] = useState<string>("");
  const [mlc, setMlc] = useState(false);
  const [mlcData, setMlcData] = useState<IIpdMlcData>(emptyIpdMlcData);
  const [viaOpd, setViaOpd] = useState(false);
  const [selectedOpdVisit, setSelectedOpdVisit] = useState<Option | null>(null);
  const [opdVisitOptions, setOpdVisitOptions] = useState<Option[]>([]);
  const [opdVisitsLoading, setOpdVisitsLoading] = useState(false);

  const [bedBlockData, setBedBlockData] = useState<IIpdBedBlockViewData | null>(null);
  const [bedsLoading, setBedsLoading] = useState(false);
  const [bedsError, setBedsError] = useState("");
  const [wardOptions, setWardOptions] = useState<IIpdWardOption[]>([]);
  const [wardsLoading, setWardsLoading] = useState(false);
  const [selectedWardFilterId, setSelectedWardFilterId] = useState<string | null>(null);
  const [selectedBedId, setSelectedBedId] = useState<string | null>(null);
  const [selectedBed, setSelectedBed] = useState<IIpdBed | null>(null);
  const [bedSummarySnapshot, setBedSummarySnapshot] = useState<IIpdSummaryBed | null>(null);

  const [paymentMode, setPaymentMode] = useState("Cash");
  const [amountPaidFromApi, setAmountPaidFromApi] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [discountFromApi, setDiscountFromApi] = useState(0);
  const [showDiscountPasswordDialog, setShowDiscountPasswordDialog] = useState(false);
  const [discountPassword, setDiscountPassword] = useState("");
  const [discountPasswordError, setDiscountPasswordError] = useState("");
  const [amountReceived, setAmountReceived] = useState(0);
  const [billingSubtotal, setBillingSubtotal] = useState<number | null>(null);
  const [billingTotalPrice, setBillingTotalPrice] = useState<number | null>(null);

  const doctorSearchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chargesLoadedRef = useRef(false);

  const [doctorVisits, setDoctorVisits] = useState<IIpdDoctorVisitRow[]>([]);
  const summaryDoctor = useMemo(
    () => doctors.find((doctor) => doctor._id === selectedDoctor?.value),
    [doctors, selectedDoctor?.value]
  );
  const proceduresTotal = calcIpdProceduresTotal(addedProcedures);
  const consultingDoctorCharge = getIpdDoctorVisitingCharge(summaryDoctor?.visitTypes);
  const doctorChargesTotal = calcIpdDoctorChargesTotalWithConsulting(
    doctorVisits,
    consultingDoctorCharge,
    selectedDoctor?.value
  );
  const bedChargesAmount = useMemo(() => {
    const resolved = resolveIpdBedSummary(
      bedBlockData,
      selectedBedId,
      selectedBed?.bedCode,
      wardOptions
    );
    const rate = resolved.ratePerDay ?? bedSummarySnapshot?.ratePerDay ?? 0;
    return Number.isFinite(rate) ? rate : 0;
  }, [bedBlockData, selectedBedId, selectedBed?.bedCode, wardOptions, bedSummarySnapshot]);
  const computedSubtotal = proceduresTotal + doctorChargesTotal + bedChargesAmount;
  const displaySubtotal = billingSubtotal ?? computedSubtotal;
  const displayFinalAmount =
    billingTotalPrice ?? Math.max(0, displaySubtotal - (discount || 0));
  const balance = displayFinalAmount - (amountReceived || 0);
  const summaryBed = useMemo(() => {
    const resolved = resolveIpdBedSummary(
      bedBlockData,
      selectedBedId,
      selectedBed?.bedCode,
      wardOptions
    );
    if (resolved.wardName || resolved.ratePerDay != null) return resolved;
    return bedSummarySnapshot ?? resolved;
  }, [bedBlockData, selectedBedId, selectedBed?.bedCode, wardOptions, bedSummarySnapshot]);
  const summaryPackageLabel = useMemo(() => {
    const labels = addedProcedures.map((procedure) => procedure.name).filter(Boolean);
    return labels.length ? labels.join(", ") : undefined;
  }, [addedProcedures]);

  useEffect(() => {
    if (!patient) {
      setPatientImageS3Url("");
      setPatientAadharS3Url("");
      setPatientAyushmanCardS3Url("");
      setPatientOtherDocsS3Urls([]);
      return;
    }
    setPatientImageS3Url(patient.imageS3Url ?? "");
    setPatientAadharS3Url(patient.aadharS3Url ?? "");
    setPatientAyushmanCardS3Url(patient.ayushmanCardS3Url ?? "");
    setPatientOtherDocsS3Urls(patient.otherDocsS3Urls ?? []);
    setPatientPhotoFile(null);
    setPatientAadharFile(null);
    setPatientAyushmanFile(null);
    setPatientOtherDocFile(null);
  }, [patient]);

  const fetchDoctors = useCallback(async (search = "") => {
    if (!API_BASE_URL) return;
    setDoctorSearchLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/hospital/doctors`, {
        params: { limit: 50, search: search || undefined },
      });
      const list = res.data?.data?.doctors ?? res.data?.data ?? [];
      const arr = Array.isArray(list) ? (list as IDoctor[]) : [];
      setDoctors(arr);
      setDoctorOptions(arr.map((d) => ({ value: d._id, label: d.name ?? "—" })));
    } catch {
      setDoctorOptions([]);
      setDoctors([]);
    } finally {
      setDoctorSearchLoading(false);
    }
  }, []);

  const fetchProcedures = useCallback(async (search = "") => {
    if (!API_BASE_URL) return;
    setProceduresLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/hospital/procedures`, {
        params: { search: search || undefined, type: "ipd,both" },
      });
      const list = res.data?.data?.procedures ?? res.data?.data ?? [];
      const arr = Array.isArray(list) ? list : [];
      setProceduresOptions(
        arr.map((p: { _id: string; procedureName?: string }) => ({
          value: p._id,
          label: p.procedureName ?? "—",
        }))
      );
      const priceMap: Record<string, number> = {};
      const catMap: Record<string, string> = {};
      arr.forEach((p: { _id: string; price?: number; basePrice?: number; category?: string }) => {
        priceMap[p._id] = p.price ?? p.basePrice ?? 0;
        if (p.category) catMap[p._id] = p.category;
      });
      setProcedurePriceById((prev) => ({ ...prev, ...priceMap }));
      setProcedureCategoryById((prev) => ({ ...prev, ...catMap }));
    } catch {
      setProceduresOptions([]);
    } finally {
      setProceduresLoading(false);
    }
  }, []);

  const loadWardOptions = useCallback(async () => {
    setWardsLoading(true);
    try {
      const options = await fetchIpdWardOptions();
      setWardOptions(options);
    } catch {
      setWardOptions([]);
    } finally {
      setWardsLoading(false);
    }
  }, []);

  const loadBedBlockView = useCallback(async (wardId?: string | null) => {
    setBedsLoading(true);
    setBedsError("");
    try {
      const data = await fetchIpdBedBlockView(wardId);
      setBedBlockData(data);
      if (!data?.wards?.length) {
        setBedsError(
          wardId
            ? "No beds found for this ward."
            : "No beds found. Add beds in Administration → Beds."
        );
      }
    } catch {
      setBedBlockData(null);
      setBedsError("Could not load beds. Please try again.");
    } finally {
      setBedsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (loading || !selectedBedId) return;
    void loadWardOptions();
    void loadBedBlockView(null);
  }, [loading, selectedBedId, loadWardOptions, loadBedBlockView]);

  useEffect(() => {
    if (!selectedBedId) {
      setBedSummarySnapshot(null);
      return;
    }
    const resolved = resolveIpdBedSummary(
      bedBlockData,
      selectedBedId,
      selectedBed?.bedCode,
      wardOptions
    );
    if (resolved.wardName || resolved.ratePerDay != null || resolved.bedCode) {
      setBedSummarySnapshot(resolved);
    }
  }, [bedBlockData, selectedBedId, selectedBed?.bedCode, wardOptions]);

  const handleWardFilterChange = useCallback(
    (wardId: string | null) => {
      setSelectedWardFilterId(wardId);
      setSelectedBedId(null);
      setSelectedBed(null);
      setBedSummarySnapshot(null);
      void loadBedBlockView(wardId);
    },
    [loadBedBlockView]
  );

  const handleDoctorInputChange = useCallback(
    (value: string) => {
      if (doctorSearchDebounceRef.current) {
        clearTimeout(doctorSearchDebounceRef.current);
        doctorSearchDebounceRef.current = null;
      }
      doctorSearchDebounceRef.current = setTimeout(() => {
        void fetchDoctors(value);
      }, 300);
    },
    [fetchDoctors]
  );

  const handleChargesSearchInput = useCallback(
    (value: string) => {
      void fetchDoctors(value);
      void fetchProcedures(value);
    },
    [fetchDoctors, fetchProcedures]
  );

  const formatOpdVisitLabel = useCallback((visit: IIpdHospitalVisit): string => {
    const visitCode = visit.visitId?.trim() || "—";
    const datePart = visit.visitDate ? dayjs(visit.visitDate).format("DD MMM YYYY") : "";
    return datePart ? `${visitCode} — ${datePart}` : visitCode;
  }, []);

  const buildOpdVisitOptions = useCallback(
    (visits: IIpdHospitalVisit[]): Option[] =>
      visits
        .map((visit) => {
          const visitMongoId = visit.visitMongoId ?? visit._id;
          if (!visitMongoId) return null;
          return {
            value: visitMongoId,
            label: formatOpdVisitLabel(visit),
          };
        })
        .filter((option): option is Option => option != null),
    [formatOpdVisitLabel]
  );

  const fetchPatientOpdVisitOptions = useCallback(
    async (patientIdParam: string): Promise<Option[]> => {
      if (!patientIdParam || !API_BASE_URL) return [];
      try {
        const response = await axios.get(
          `${API_BASE_URL}/hospital/visits/patient/${patientIdParam}`
        );
        const list = response.data?.data?.visits ?? response.data?.data ?? [];
        const visits: IIpdHospitalVisit[] = Array.isArray(list) ? list : [];
        return buildOpdVisitOptions(visits);
      } catch {
        return [];
      }
    },
    [buildOpdVisitOptions]
  );

  const fetchOpdVisitsForPatient = useCallback(async () => {
    if (!patientId || !API_BASE_URL) {
      setOpdVisitOptions([]);
      return;
    }
    try {
      setOpdVisitsLoading(true);
      const options = await fetchPatientOpdVisitOptions(patientId);
      setOpdVisitOptions(options);
    } catch {
      setOpdVisitOptions([]);
    } finally {
      setOpdVisitsLoading(false);
    }
  }, [patientId, fetchPatientOpdVisitOptions]);

  useEffect(() => {
    if (!viaOpd || !patientId) {
      if (!viaOpd) {
        setSelectedOpdVisit(null);
        setOpdVisitOptions([]);
      }
      return;
    }
    void fetchOpdVisitsForPatient();
  }, [viaOpd, patientId, fetchOpdVisitsForPatient]);

  const handleViaOpdToggle = (checked: boolean) => {
    setViaOpd(checked);
    if (!checked) {
      setSelectedOpdVisit(null);
      setOpdVisitOptions([]);
    }
  };

  const fetchIPD = useCallback(
    async (ipdIdParam: string) => {
      if (!API_BASE_URL) return;
      setLoading(true);
      setError("");
      try {
        const res = await axios.get(`${API_BASE_URL}/hospital/ipd/${ipdIdParam}`);
        const ok = res.data?.code === 200 || (res.status >= 200 && res.status < 300);
        const data = extractIpdFromGetResponse(res.data?.data) as IIpdApiRecord | null;
        if (!ok || !data?._id) {
          setError(res.data?.message ?? "IPD admission not found.");
          return;
        }

        setIpdRecordId(data._id);
        setPatientId(data.patientId ?? null);

        if (data.patient) {
          setPatient(data.patient);
        } else if (data.patientId) {
          try {
            const pRes = await axios.get(`${API_BASE_URL}/hospital/patients/${data.patientId}`);
            const pData = pRes.data?.data?.patient ?? pRes.data?.data;
            if (pData) {
              setPatient({ ...(pData as IIpdPatient), _id: data.patientId });
            }
          } catch {
            setPatient(null);
          }
        }

        const doctorId = data.doctor?._id ?? data.doctorId;
        if (doctorId) {
          setSelectedDoctor({
            value: doctorId,
            label: data.doctor?.name ?? "",
          });
        }

        const admission =
          data.admissionDate ?? data.appointmentDate ?? dayjs().format("YYYY-MM-DD");
        setAdmissionDate(admission);
        setReason((data.reason ?? data.notes ?? "").trim());
        setMlc(Boolean(data.isMLC ?? data.isMlc));
        const mlcRecord =
          data.mlc && typeof data.mlc === "object" && !Array.isArray(data.mlc)
            ? (data.mlc as unknown as IIpdMlcData)
            : null;
        setMlcData(
          mlcRecord
            ? {
                markOfIdentification: String(mlcRecord.markOfIdentification ?? ""),
                thanaName: String(mlcRecord.thanaName ?? ""),
                patientBroughtBy: String(mlcRecord.patientBroughtBy ?? ""),
                placeOfAccident: String(mlcRecord.placeOfAccident ?? ""),
              }
            : emptyIpdMlcData()
        );
        const discountNum = Number(data.discount) || 0;
        setDiscount(discountNum);
        setDiscountFromApi(discountNum);
        setBillingSubtotal(
          data.subtotal != null && Number.isFinite(Number(data.subtotal))
            ? Number(data.subtotal)
            : null
        );
        setBillingTotalPrice(
          data.totalPrice != null && Number.isFinite(Number(data.totalPrice))
            ? Number(data.totalPrice)
            : null
        );

        const bedId = data.bedId ?? data.bed?._id ?? null;
        setSelectedBedId(bedId);
        if (data.bed?._id) {
          setSelectedBed({
            _id: data.bed._id,
            bedCode: data.bed.bedCode ?? "",
            status: "occupied",
          } as IIpdBed);
          const wardFromApi = data.bed.ward;
          setBedSummarySnapshot({
            bedCode: data.bed.bedNumber ?? data.bed.bedCode,
            wardName: wardFromApi?.name,
            ratePerDay:
              wardFromApi?.chargePerDay != null
                ? Number(wardFromApi.chargePerDay)
                : undefined,
          });
        }

        const txTotal = Array.isArray(data.transactions)
          ? data.transactions.reduce((sum, t) => sum + (Number(t?.amount) || 0), 0)
          : 0;
        const paid = data.amountPaid != null ? Number(data.amountPaid) : txTotal;
        setAmountPaidFromApi(paid);
        setAmountReceived(paid);
        const lastMode =
          Array.isArray(data.transactions) && data.transactions.length
            ? data.transactions[data.transactions.length - 1]?.paymentMode
            : undefined;
        setPaymentMode(lastMode ?? "Cash");

        const linkedVisitId = data.visitId?.trim();
        if (linkedVisitId && data.patientId) {
          setViaOpd(true);
          const opdOptions = await fetchPatientOpdVisitOptions(data.patientId);
          setOpdVisitOptions(opdOptions);
          const matched = opdOptions.find((o) => o.value === linkedVisitId);
          setSelectedOpdVisit(
            matched ?? { value: linkedVisitId, label: "OPD Visit" }
          );
        } else {
          setViaOpd(false);
          setSelectedOpdVisit(null);
          setOpdVisitOptions([]);
        }
      } catch (err: unknown) {
        const message =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "Failed to load IPD admission.";
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [fetchPatientOpdVisitOptions]
  );

  useEffect(() => {
    if (!routeId) return;
    void fetchDoctors();
    void fetchProcedures();
    void fetchIPD(routeId);
  }, [routeId, fetchDoctors, fetchProcedures, fetchIPD]);

  useEffect(() => {
    if (!procedurePriceById || loading || chargesLoadedRef.current) return;
    const reloadProcedures = async () => {
      if (!API_BASE_URL || !routeId) return;
      try {
        const res = await axios.get(`${API_BASE_URL}/hospital/ipd/${routeId}`);
        const data = extractIpdFromGetResponse(res.data?.data) as IIpdApiRecord | null;
        if (!data) return;
        chargesLoadedRef.current = true;
        setBillingSubtotal(
          data.subtotal != null && Number.isFinite(Number(data.subtotal))
            ? Number(data.subtotal)
            : null
        );
        setBillingTotalPrice(
          data.totalPrice != null && Number.isFinite(Number(data.totalPrice))
            ? Number(data.totalPrice)
            : null
        );
        if (data.discount != null) {
          const discountNum = Number(data.discount) || 0;
          setDiscount(discountNum);
          setDiscountFromApi(discountNum);
        }
        const billing = Array.isArray(data.billingCharges) ? data.billingCharges : [];
        const { priceById, categoryById } = seedIpdProcedureMapsFromBilling(billing);
        setProcedurePriceById((prev) => ({ ...prev, ...priceById }));
        setProcedureCategoryById((prev) => ({ ...prev, ...categoryById }));
        setDoctorVisits(ipdDoctorVisitRowsFromBilling(billing));
        if (billing.length) {
          setAddedProcedures(ipdProcedureRowsFromBilling(billing, procedurePriceById));
          return;
        }
        setAddedProcedures(
          ipdProcedureRowsFromLegacy(data.procedures ?? [], procedurePriceById)
        );
      } catch {
        /* keep existing */
      }
    };
    void reloadProcedures();
  }, [procedurePriceById, loading, routeId]);

  const handleDoctorChange = useCallback((option: Option | null) => {
    setSelectedDoctor(option);
  }, []);

  const handleAddVisitingDoctor = useCallback(
    (option: Option | null) => {
      if (!option?.value) return;
      const doctor = doctors.find((d) => d._id === option.value);
      const chargePerDay = getIpdDoctorVisitingCharge(doctor?.visitTypes);
      setDoctorVisits((prev) =>
        addIpdDoctorVisitRow(prev, {
          doctorId: option.value,
          name: option.label ?? doctor?.name ?? "—",
          chargePerDay,
        })
      );
    },
    [doctors]
  );

  const handleIncrementDoctorVisitDays = useCallback((doctorId: string) => {
    setDoctorVisits((prev) => incrementIpdDoctorVisitDays(prev, doctorId));
  }, []);

  const handleDecrementDoctorVisitDays = useCallback((doctorId: string) => {
    setDoctorVisits((prev) => decrementIpdDoctorVisitDays(prev, doctorId));
  }, []);

  const handleRemoveVisitingDoctor = useCallback((doctorId: string) => {
    setDoctorVisits((prev) => removeIpdDoctorVisitRow(prev, doctorId));
  }, []);

  const handleAddProcedure = useCallback(
    (option: Option | null) => {
      if (!option?.value || procedurePriceById[option.value] == null) return;
      const price = procedurePriceById[option.value] ?? 0;
      const category = procedureCategoryById[option.value];
      setProcedurePriceById((prev) => ({ ...prev, [option.value]: price }));
      setAddedProcedures((prev) =>
        addIpdProcedureRow(prev, { id: option.value, name: option.label, price, category })
      );
    },
    [procedurePriceById, procedureCategoryById]
  );

  const handleIncrementProcedureUnits = useCallback((id: string) => {
    setAddedProcedures((prev) => incrementIpdProcedureUnits(prev, id));
  }, []);

  const handleDecrementProcedureUnits = useCallback((id: string) => {
    setAddedProcedures((prev) => decrementIpdProcedureUnits(prev, id));
  }, []);

  const handleRemoveProcedure = useCallback((id: string) => {
    setAddedProcedures((prev) => removeIpdProcedureRow(prev, id));
  }, []);

  const handleToggleProcedureCompleted = useCallback((id: string, isCompleted: boolean) => {
    setAddedProcedures((prev) => toggleIpdProcedureCompleted(prev, id, isCompleted));
  }, []);

  const handleSelectBed = (bed: IIpdBed) => {
    setSelectedBedId(bed._id);
    setSelectedBed(bed);
    setBedSummarySnapshot(
      resolveIpdBedSummary(bedBlockData, bed._id, bed.bedCode, wardOptions)
    );
    setError("");
  };

  const buildBillingCharges = (): IIpdBillingChargePayload[] => {
    const doctorId = selectedDoctor?.value;
    if (!doctorId) return [];

    return [
      ...buildIpdProcedureBillingCharges(addedProcedures),
      ...buildIpdDoctorBillingCharges(doctorVisits, doctorId),
    ];
  };

  const buildUpdatePayload = (): IIpdUpdatePayload | null => {
    const doctorId = selectedDoctor?.value;
    const bedId = selectedBedId;
    if (!ipdRecordId || !patientId || !doctorId || !bedId) return null;

    const payload: IIpdUpdatePayload = {
      patientId,
      doctorId,
      bedId,
      admissionDate: admissionDate || dayjs().format("YYYY-MM-DD"),
      reason: reason.trim(),
      billingCharges: buildBillingCharges(),
    };
    const discountNum = Number(discount) || 0;
    const hasDiscountChanged = Math.abs(discountNum - (Number(discountFromApi) || 0)) > 0.0001;
    if (hasDiscountChanged) {
      payload.discount = discountNum;
    }

    const extra = Math.max(0, (Number(amountReceived) || 0) - (Number(amountPaidFromApi) || 0));
    if (extra > 0) {
      payload.transaction = {
        transactionType: "Payment",
        amount: extra,
        paymentMode,
      };
    }

    payload.isMLC = mlc;
    if (mlc) {
      payload.mlc = {
        markOfIdentification: mlcData.markOfIdentification.trim(),
        thanaName: mlcData.thanaName.trim(),
        patientBroughtBy: mlcData.patientBroughtBy.trim(),
        placeOfAccident: mlcData.placeOfAccident.trim(),
      };
    }

    if (viaOpd && selectedOpdVisit?.value) {
      payload.visitId = selectedOpdVisit.value;
    }

    return payload;
  };

  const uploadFileToS3 = async (file: File, folder: string): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await axios.post(`${API_BASE_URL}/upload/pathlab?folder=${folder}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    const d = res.data;
    const signedUrl = d?.data?.signedUrl || "";
    if (signedUrl) return signedUrl.split("?")[0];
    return d?.data?.originalUrl || d?.data?.url || d?.url || "";
  };

  const handleMlcToggle = (checked: boolean) => {
    setMlc(checked);
    if (!checked) setMlcData(emptyIpdMlcData());
  };

  const doSubmit = async (discountPwd?: string) => {
    if (!ipdRecordId || !API_BASE_URL) return;
    const payload = buildUpdatePayload();
    if (!payload) {
      setError("Please complete required fields.");
      return;
    }
    const discountNum = Number(discount) || 0;
    const hasDiscountChanged = Math.abs(discountNum - (Number(discountFromApi) || 0)) > 0.0001;
    if (hasDiscountChanged && discountNum > 0 && discountPwd !== undefined && discountPwd.trim()) {
      payload.discountPassword = discountPwd.trim();
    }

    setSubmitLoading(true);
    setError("");
    try {
      let uploadedImageUrl = "";
      let uploadedAadharUrl = "";
      let uploadedAyushmanUrl = "";
      let uploadedOtherDocUrl = "";

      if (patientPhotoFile) {
        uploadedImageUrl = await uploadFileToS3(patientPhotoFile, "ipd_patient_photos");
      }
      if (patientAadharFile) {
        uploadedAadharUrl = await uploadFileToS3(patientAadharFile, "ipd_aadhar_docs");
      }
      if (patientAyushmanFile) {
        uploadedAyushmanUrl = await uploadFileToS3(patientAyushmanFile, "ipd_ayushman_docs");
      }
      if (patientOtherDocFile) {
        uploadedOtherDocUrl = await uploadFileToS3(patientOtherDocFile, "ipd_other_docs");
      }

      if (uploadedImageUrl) payload.imageS3Url = uploadedImageUrl;
      if (uploadedAadharUrl) payload.aadharS3Url = uploadedAadharUrl;
      if (uploadedAyushmanUrl) payload.ayushmanCardS3Url = uploadedAyushmanUrl;
      if (uploadedOtherDocUrl) payload.otherDocsS3Urls = [...patientOtherDocsS3Urls, uploadedOtherDocUrl];

      const res = await axios.put(`${API_BASE_URL}/hospital/ipd/${ipdRecordId}`, payload);
      const ok = res?.status >= 200 && res?.status < 300;
      const codeOk = res?.data?.code === 200 || res?.data?.code === "200";
      if (ok || codeOk) {
        router.push(all_routes.ipdAppointments);
      } else {
        setError(res?.data?.message ?? "Failed to update IPD admission.");
      }
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to update IPD admission.";
      setError(message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formStep === 1) {
      setFormStep(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (formStep === 2) {
      if (!selectedDoctor?.value) {
        setError("Please select a consulting doctor.");
        return;
      }
      if (viaOpd && !selectedOpdVisit?.value) {
        setError("Please select an OPD visit.");
        return;
      }
      setFormStep(3);
      setSelectedWardFilterId(null);
      void loadWardOptions();
      void loadBedBlockView(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (!selectedBedId) {
      setError("Please select a bed.");
      return;
    }
    const discountNum = Number(discount) || 0;
    const hasDiscountMismatch = Math.abs(discountNum - (Number(discountFromApi) || 0)) > 0.0001;
    if (discountNum > 0 && hasDiscountMismatch) {
      setDiscountPasswordError("");
      setShowDiscountPasswordDialog(true);
      return;
    }
    void doSubmit();
  };

  const handleDiscountPasswordConfirm = () => {
    if (!discountPassword.trim()) {
      setDiscountPasswordError("Please enter the discount password.");
      return;
    }
    setDiscountPasswordError("");
    setShowDiscountPasswordDialog(false);
    void doSubmit(discountPassword.trim());
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
  const patientMaritalStatusValue = getPatientMaritalStatus(patient);
  const patientMaritalLabel = patientMaritalStatusValue
    ? Marital_Status.find((m) => m.value === patientMaritalStatusValue)?.label ?? patientMaritalStatusValue
    : "";
  const patientDobFormatted = patient?.dob ? dayjs(patient.dob).format("DD-MM-YYYY") : "";
  const patientAgeYears =
    patient?.age != null
      ? String(patient.age)
      : patient?.dob
        ? String(dayjs().diff(dayjs(patient.dob), "year"))
        : "";
  const patientAgeMonths = patient?.months != null ? String(patient.months) : "";
  const patientAgeDays = patient?.days != null ? String(patient.days) : "";

  return (
    <>
      {showDiscountPasswordDialog ? (
        <div
          className="modal fade show d-block"
          id="edit-ipd-discount-password-modal"
          tabIndex={-1}
          aria-labelledby="edit-ipd-discount-password-label"
          aria-modal="true"
          role="dialog"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title" id="edit-ipd-discount-password-label">
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
                <label htmlFor="edit-ipd-discount-password-input" className="form-label">
                  Enter password to apply discount
                </label>
                {discountPasswordError ? (
                  <div className="alert alert-danger py-2 mb-2" role="alert">
                    {discountPasswordError}
                  </div>
                ) : null}
                <input
                  id="edit-ipd-discount-password-input"
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
      ) : null}
      <div className="page-wrapper">
      <div className="content">
        <div className="mb-4">
          <h6 className="fw-bold mb-0 d-flex align-items-center">
            <Link href={all_routes.ipdAppointments} className="text-dark">
              <i className="ti ti-chevron-left me-1" />
              Edit IPD Appointments
            </Link>
          </h6>
        </div>

        {loading ? (
          <div className="d-flex justify-content-center align-items-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="row g-3 align-items-start">
              <div className="col-12 col-lg-8 d-flex flex-column">
                <div className={`card mb-3${formStep === 3 ? " ipd-appointment-bed-card" : ""}`}>
                  <div className="card-body">
                    <IpdFormStepIndicator currentStep={formStep} />
                    {error ? (
                      <div className="alert alert-danger d-flex align-items-center gap-2 py-2 mb-3">
                        <i className="ti ti-alert-circle fs-16" />
                        <span className="fs-14">{error}</span>
                      </div>
                    ) : null}

                {formStep === 1 && (
                  <>
                      <h6 className="fw-bold text-primary mb-3 d-flex align-items-center flex-wrap gap-2">
                        Patient Details
                        <span className="badge badge-soft-success border border-success fw-medium fs-12">
                          Existing Patient
                        </span>
                      </h6>
                      <div className="row g-3">
                        <div className="col-12">
                          <div className="d-flex flex-column flex-md-row gap-3 align-items-start">
                            <IpdPatientCompactUpload
                              label="Patient photo"
                              placeholder="Add patient photo"
                              hint="Jpg / Png · drag or click"
                              accept="image/jpeg,image/png,image/jpg"
                              file={patientPhotoFile}
                              previewUrl={patientImageS3Url || undefined}
                              onFileChange={setPatientPhotoFile}
                              disabled
                            />
                            <div className="flex-grow-1 w-100">
                              <div className="row g-3 m-0">
                                <div className="col-12 col-sm-6 col-md-4">
                                  <label className="form-label mb-1 fw-medium fs-14">Phone Number</label>
                                  <IndianPhoneSearchInput
                                    value={patient?.phone ?? ""}
                                    readOnly
                                    disabled
                                    className="bg-light"
                                    inputClassName="bg-light"
                                  />
                                </div>
                                <div className="col-6 col-md-2">
                                  <label className="form-label mb-1 fw-medium fs-14">Title</label>
                                  <input type="text" className="form-control bg-light" value={patientTitleLabel} readOnly disabled />
                                </div>
                                <div className="col-12 col-sm-6 col-md">
                                  <label className="form-label mb-1 fw-medium fs-14">Full Name</label>
                                  {patient?._id ? (
                                    <Link
                                      href={`${all_routes.patientDetails}?id=${patient._id}`}
                                      className="form-control bg-light text-decoration-none text-dark d-flex align-items-center"
                                    >
                                      <span className="flex-grow-1 text-start">{patient?.name ?? "—"}</span>
                                      <i className="ti ti-arrow-right fs-12 text-muted" />
                                    </Link>
                                  ) : (
                                    <input type="text" className="form-control bg-light" value={patient?.name ?? ""} readOnly disabled />
                                  )}
                                </div>
                              </div>
                              <div className="row g-3 m-0">
                                <div className="col-12 col-sm-6 col-md-3">
                                  <label className="form-label mb-1 fw-medium fs-14">Gender</label>
                                  <input type="text" className="form-control bg-light" value={patientGenderLabel} readOnly disabled />
                                </div>
                                <div className="col-12 col-sm-6 col-md-5">
                                  <label className="form-label mb-1 fw-medium fs-14">Email Address</label>
                                  <input type="text" className="form-control bg-light" value={patient?.email ?? ""} readOnly disabled />
                                </div>
                                <div className="col-12 col-md-4">
                                  <label className="form-label mb-1 fw-medium fs-14">Blood Group</label>
                                  <input type="text" className="form-control bg-light" value={patientBloodLabel} readOnly disabled />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="col-md-3">
                          <label className="form-label mb-1 fw-medium fs-14">Date of Birth</label>
                          <input type="text" className="form-control bg-light" value={patientDobFormatted} readOnly disabled />
                        </div>
                        <div className="col-md-5">
                          <label className="form-label mb-1 fw-medium fs-14">Age</label>
                          <div className="row g-2">
                            <div className="col-4">
                              <input
                                type="text"
                                className="form-control bg-light"
                                placeholder="Years"
                                value={patientAgeYears}
                                readOnly
                                disabled
                              />
                            </div>
                            <div className="col-4">
                              <input
                                type="text"
                                className="form-control bg-light"
                                placeholder="Months"
                                value={patientAgeMonths}
                                readOnly
                                disabled
                              />
                            </div>
                            <div className="col-4">
                              <input
                                type="text"
                                className="form-control bg-light"
                                placeholder="Days"
                                value={patientAgeDays}
                                readOnly
                                disabled
                              />
                            </div>
                          </div>
                        </div>
                        <div className="col-md-4">
                          <label className="form-label mb-1 fw-medium fs-14">Aadhar No</label>
                          <input type="text" className="form-control bg-light" value={patient?.aadharNo ?? ""} readOnly disabled />
                        </div>
                        <div className="col-md-3">
                          <label className="form-label mb-1 fw-medium fs-14">Marital Status</label>
                          <input type="text" className="form-control bg-light" value={patientMaritalLabel} readOnly disabled />
                        </div>
                        <div className="col-md-5">
                          <label className="form-label mb-1 fw-medium fs-14">Ayushman No</label>
                          <input type="text" className="form-control bg-light" value={patient?.ayushmanCardNo ?? ""} readOnly disabled />
                        </div>
                        <div className="col-md-4">
                          <label className="form-label mb-1 fw-medium fs-14">Occupation</label>
                          <input type="text" className="form-control bg-light" value={patient?.occupation ?? ""} readOnly disabled />
                        </div>
                        <div className="col-md-4">
                          <label className="form-label mb-1 fw-medium fs-14">Drug Sensitivity</label>
                          <input type="text" className="form-control bg-light" value={patient?.drugSensitivity ?? ""} readOnly disabled />
                        </div>
                        <div className="col-md-8">
                          <label className="form-label mb-1 fw-medium fs-14">Address</label>
                          <input type="text" className="form-control bg-light" value={patient?.address ?? ""} readOnly disabled />
                        </div>
                        <div className="col-md-4">
                          <label className="form-label mb-1 fw-medium fs-14">Attendant Name</label>
                          <input type="text" className="form-control bg-light" value={patient?.attendantName ?? ""} readOnly disabled />
                        </div>
                        <div className="col-md-4">
                          <label className="form-label mb-1 fw-medium fs-14">Relation to Patient</label>
                          <input type="text" className="form-control bg-light" value={patient?.attendantRelation ?? ""} readOnly disabled />
                        </div>
                      </div>

                      {/* Documents Section (read-only in edit) */}
                      <h6 className="fw-bold text-primary mb-3 border-top pt-3 mt-3">Documents</h6>
                      <div className="row g-3">
                        <div className="col-md-4">
                          <label className="form-label mb-2 fw-medium">Aadhar Card</label>
                          <div
                            className="border rounded p-3 text-center"
                            style={{ minHeight: "100px", backgroundColor: "#f8f9fa" }}
                          >
                            {patientAadharS3Url ? (
                              <div>
                                <i className="ti ti-file-check fs-24 text-success mb-2" />
                                <p className="mb-2 text-dark fw-medium">Document on file</p>
                                <a href={patientAadharS3Url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-primary">
                                  <i className="ti ti-external-link me-1" />Open
                                </a>
                              </div>
                            ) : (
                              <div>
                                <i className="ti ti-file-off fs-24 text-muted mb-2" />
                                <p className="mb-0 text-muted fw-medium">No document</p>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="col-md-4">
                          <label className="form-label mb-2 fw-medium">Ayushman Card</label>
                          <div
                            className="border rounded p-3 text-center"
                            style={{ minHeight: "100px", backgroundColor: "#f8f9fa" }}
                          >
                            {patientAyushmanCardS3Url ? (
                              <div>
                                <i className="ti ti-file-check fs-24 text-success mb-2" />
                                <p className="mb-2 text-dark fw-medium">Document on file</p>
                                <a href={patientAyushmanCardS3Url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-primary">
                                  <i className="ti ti-external-link me-1" />Open
                                </a>
                              </div>
                            ) : (
                              <div>
                                <i className="ti ti-file-off fs-24 text-muted mb-2" />
                                <p className="mb-0 text-muted fw-medium">No document</p>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="col-md-4">
                          <label className="form-label mb-2 fw-medium">Other Document</label>
                          <div
                            className="border rounded p-3 text-center"
                            style={{ minHeight: "100px", backgroundColor: "#f8f9fa" }}
                          >
                            {patientOtherDocsS3Urls.length > 0 ? (
                              <div>
                                <i className="ti ti-file-check fs-24 text-success mb-2" />
                                <p className="mb-2 text-dark fw-medium">{patientOtherDocsS3Urls.length} document(s)</p>
                                <div className="d-flex flex-wrap justify-content-center gap-1">
                                  {patientOtherDocsS3Urls.map((url, i) => (
                                    <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-primary">
                                      <i className="ti ti-external-link me-1" />Open {patientOtherDocsS3Urls.length > 1 ? i + 1 : ""}
                                    </a>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div>
                                <i className="ti ti-file-off fs-24 text-muted mb-2" />
                                <p className="mb-0 text-muted fw-medium">No document</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                  </>
                )}

                {formStep === 2 && (
                  <>
                      <h6 className="fw-bold text-primary mb-3">IPD Details</h6>
                      <div className="d-flex flex-column flex-lg-row align-items-lg-end gap-3 mb-3">
                        <div
                          className="w-100 flex-shrink-0"
                          style={{ flex: "0 0 280px", maxWidth: "280px", minWidth: 0 }}
                        >
                          <label className="form-label mb-1 fw-medium fs-14">Consulting Doctor <span className="text-danger">*</span></label>
                          <CommonSelect
                            options={doctorOptions}
                            value={selectedDoctor}
                            onChange={handleDoctorChange}
                            onInputChange={handleDoctorInputChange}
                            isLoading={doctorSearchLoading}
                            placeholder="Search doctor..."
                          />
                        </div>
                        <div className="flex-shrink-0">
                          <label className="form-label mb-1 fw-medium fs-14">Admission</label>
                          <div
                            className="d-flex align-items-center gap-2 flex-nowrap"
                            style={{ minHeight: "38px" }}
                          >
                            <span
                              className={`fw-medium fs-14 text-nowrap ${!viaOpd ? "text-primary" : "text-muted"}`}
                            >
                              Emergency
                            </span>
                            <div className="form-check form-switch mb-0 flex-shrink-0">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                role="switch"
                                id="edit-ipd-via-opd-toggle"
                                checked={viaOpd}
                                disabled={!patientId}
                                onChange={(e) => handleViaOpdToggle(e.target.checked)}
                                aria-label="Admission via OPD"
                              />
                            </div>
                            <span
                              className={`fw-medium fs-14 text-nowrap ${viaOpd ? "text-primary" : "text-muted"}`}
                            >
                              Via OPD
                            </span>
                          </div>
                        </div>
                        {viaOpd ? (
                          <div
                            className="w-100 flex-shrink-0"
                            style={{ flex: "0 0 220px", maxWidth: "260px", minWidth: 0 }}
                          >
                            <label className="form-label mb-1 fw-medium fs-14">
                              OPD Visit <span className="text-danger">*</span>
                            </label>
                            <CommonSelect
                              options={opdVisitOptions}
                              value={selectedOpdVisit}
                              onChange={setSelectedOpdVisit}
                              onMenuOpen={() => void fetchOpdVisitsForPatient()}
                              isLoading={opdVisitsLoading}
                              placeholder={patientId ? "Search OPD visit..." : "Patient required"}
                              disabled={!patientId}
                            />
                          </div>
                        ) : null}
                        <div className="flex-shrink-0">
                          <label className="form-label mb-1 fw-medium fs-14">MLC</label>
                          <div
                            className="d-flex align-items-center gap-2 flex-nowrap"
                            style={{ minHeight: "38px" }}
                          >
                            <div className="form-check form-switch mb-0">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                role="switch"
                                id="edit-ipd-mlc-toggle"
                                checked={mlc}
                                onChange={(e) => handleMlcToggle(e.target.checked)}
                                aria-label="Medico-legal case (MLC)"
                              />
                              <label className="form-check-label fw-medium fs-14" htmlFor="edit-ipd-mlc-toggle">
                                {mlc ? "Yes" : "No"}
                              </label>
                            </div>
                            {mlc ? (
                              <span className="badge" style={{ background: "#fef9c3", color: "#854d0e", fontSize: "0.7rem" }}>
                                MLC
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                      <div className="row g-3">
                        {mlc ? (
                          <IpdMlcFields idPrefix="edit-ipd-mlc" value={mlcData} onChange={setMlcData} />
                        ) : null}
                        <IpdAddChargesField
                          procedures={addedProcedures}
                          doctorVisits={doctorVisits}
                          proceduresOptions={proceduresOptions}
                          doctorOptions={doctorOptions}
                          proceduresLoading={proceduresLoading}
                          doctorsLoading={doctorSearchLoading}
                          procedureCategoryById={procedureCategoryById}
                          onAddProcedure={handleAddProcedure}
                          onAddDoctor={handleAddVisitingDoctor}
                          onIncrementProcedureUnits={handleIncrementProcedureUnits}
                          onDecrementProcedureUnits={handleDecrementProcedureUnits}
                          onRemoveProcedure={handleRemoveProcedure}
                          onToggleProcedureCompleted={handleToggleProcedureCompleted}
                          onIncrementDoctorDays={handleIncrementDoctorVisitDays}
                          onDecrementDoctorDays={handleDecrementDoctorVisitDays}
                          onRemoveDoctor={handleRemoveVisitingDoctor}
                          onSearchInputChange={handleChargesSearchInput}
                        />
                        <div className="col-12">
                          <label htmlFor="edit-ipd-reason" className="form-label mb-1 fw-medium fs-14">
                            Reason for Admission
                          </label>
                          <textarea
                            id="edit-ipd-reason"
                            className="form-control"
                            rows={3}
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="e.g. Diabetes complications"
                          />
                        </div>
                      </div>
                  </>
                )}

                {formStep === 3 && (
                  <div className="ipd-bed-map-panel">
                      <h6 className="fw-bold text-primary mb-3 d-flex align-items-center flex-wrap gap-2 flex-shrink-0">
                        Bed Details
                        {selectedBed ? (
                          <span className="badge badge-soft-success border border-success fw-medium fs-12">
                            {selectedBed.bedCode} selected
                          </span>
                        ) : null}
                      </h6>
                      <div className="ipd-bed-map-panel__body">
                        <IpdBedSelectionStep
                          data={bedBlockData}
                          loading={bedsLoading}
                          error={bedsError}
                          selectedBedId={selectedBedId}
                          onSelectBed={handleSelectBed}
                          wardOptions={wardOptions}
                          selectedWardId={selectedWardFilterId}
                          onWardFilterChange={handleWardFilterChange}
                          wardsLoading={wardsLoading}
                        />
                      </div>
                  </div>
                )}
                  </div>
                </div>

              </div>

              <div className="col-12 col-lg-4">
                <div className="position-sticky" style={{ top: "84px", zIndex: 5 }}>
                <IpdAdmissionSummarySidebar
                  patient={{
                    title: patientTitleLabel !== "—" ? patientTitleLabel : undefined,
                    name: patient?.name,
                    phone: patient?.phone?.trim() || undefined,
                    gender: patientGenderLabel !== "—" ? patientGenderLabel : undefined,
                    ageYears: patientAgeYears || undefined,
                    bloodGroup: patientBloodLabel !== "—" ? patientBloodLabel : undefined,
                    drugSensitivity: patient?.drugSensitivity,
                    isNewPatient: false,
                  }}
                  admission={{
                    consultingDoctor: selectedDoctor?.label ?? summaryDoctor?.name,
                    admissionDate: admissionDate
                      ? dayjs(admissionDate).format("DD MMM YYYY")
                      : undefined,
                    reason: reason.trim() || undefined,
                    isMlc: mlc,
                  }}
                  bed={summaryBed}
                  payment={
                    <>
                    <div className="mb-2 d-flex align-items-center flex-wrap gap-2">
                      <label className="form-label mb-0 fw-medium me-2 text-dark" style={{ minWidth: "120px" }}>
                        Payment Mode
                      </label>
                      <div className="d-flex gap-3 flex-wrap ms-auto justify-content-end">
                        <div className="form-check">
                          <input className="form-check-input" type="radio" name="editIpdPaymentMode" id="edit-ipd-cash" value="Cash" checked={paymentMode === "Cash"} onChange={(e) => setPaymentMode(e.target.value)} />
                          <label className="form-check-label text-dark" htmlFor="edit-ipd-cash">Cash</label>
                        </div>
                        <div className="form-check">
                          <input className="form-check-input" type="radio" name="editIpdPaymentMode" id="edit-ipd-upi" value="UPI" checked={paymentMode === "UPI"} onChange={(e) => setPaymentMode(e.target.value)} />
                          <label className="form-check-label text-dark" htmlFor="edit-ipd-upi">UPI</label>
                        </div>
                        <div className="form-check">
                          <input className="form-check-input" type="radio" name="editIpdPaymentMode" id="edit-ipd-card" value="Card" checked={paymentMode === "Card"} onChange={(e) => setPaymentMode(e.target.value)} />
                          <label className="form-check-label text-dark" htmlFor="edit-ipd-card">Card</label>
                        </div>
                      </div>
                    </div>
                    <div className="mb-2 d-flex align-items-center">
                      <label className="form-label mb-0 fw-medium me-2 text-dark" style={{ minWidth: "120px" }}>
                        Total
                      </label>
                      <div className="form-control bg-light fs-15 text-dark" style={{ pointerEvents: "none" }}>
                        ₹{displaySubtotal.toFixed(2)}
                      </div>
                    </div>
                    <div className="mb-2 d-flex align-items-center">
                      <label className="form-label mb-0 fw-medium me-2 text-dark" style={{ minWidth: "120px" }}>Discount</label>
                      <input
                        type="number"
                        className="form-control fs-15 text-dark"
                        placeholder="0"
                        value={discount || ""}
                        onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                        onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                        min={0}
                      />
                    </div>
                    <div className="mb-2 d-flex align-items-center">
                      <label className="form-label mb-0 fw-medium me-2 text-dark" style={{ minWidth: "120px" }}>Final Amount</label>
                      <div className="form-control bg-light fs-15 text-dark" style={{ pointerEvents: "none" }}>
                        ₹{displayFinalAmount.toFixed(2)}
                      </div>
                    </div>
                    <div className="mb-2 d-flex align-items-center">
                      <label className="form-label mb-0 fw-medium me-2 text-dark" style={{ minWidth: "120px" }}>Amount Received</label>
                      <input
                        type="number"
                        className="form-control fs-15 text-dark"
                        placeholder="0"
                        value={amountReceived || ""}
                        onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
                        onChange={(e) => setAmountReceived(parseFloat(e.target.value) || 0)}
                        min={0}
                      />
                    </div>
                    <div className="mb-0 d-flex align-items-center">
                      <label className="form-label mb-0 fw-medium me-2 text-dark" style={{ minWidth: "120px" }}>
                        Balance
                      </label>
                      <div className="form-control d-flex align-items-center justify-content-between fs-15 text-dark bg-warning-subtle border border-warning">
                        <span>₹{balance.toFixed(2)}</span>
                        <i className="ti ti-alert-triangle text-warning fs-16" />
                      </div>
                    </div>
                    </>
                  }
                />
                <div className="d-flex align-items-center justify-content-end mt-3 flex-wrap gap-2">
                  <Link href={all_routes.ipdAppointments} className="btn btn-light fw-medium fs-14 px-4">
                    Cancel
                  </Link>
                  {formStep === 2 && (
                    <button type="button" className="btn btn-light fw-medium fs-14 px-4" onClick={() => { setFormStep(1); setError(""); window.scrollTo({ top: 0, behavior: "smooth" }); }} disabled={submitLoading}>
                      <i className="ti ti-arrow-left me-1" />Back
                    </button>
                  )}
                  {formStep === 3 && (
                    <button type="button" className="btn btn-light fw-medium fs-14 px-4" onClick={() => { setFormStep(2); setError(""); window.scrollTo({ top: 0, behavior: "smooth" }); }} disabled={submitLoading}>
                      <i className="ti ti-arrow-left me-1" />Back
                    </button>
                  )}
                  <button type="submit" className="btn font-weight-bold fs-15 fw-medium rounded btn-primary" disabled={submitLoading || bedsLoading}>
                    {submitLoading ? (
                      <><i className="ti ti-loader-2 me-1" />Saving...</>
                    ) : formStep === 1 ? (
                      <>Next: IPD Details<i className="ti ti-arrow-right ms-1" /></>
                    ) : formStep === 2 ? (
                      <>Next: Select Bed<i className="ti ti-arrow-right ms-1" /></>
                    ) : (
                      <>Save IPD Admission<i className="ti ti-check ms-1" /></>
                    )}
                  </button>
                </div>
                </div>
              </div>
            </div>
          </form>
        )}
      </div>
      </div>
    </>
  );
};

export default EditIpdAppointmentComponent;
