"use client";

import React, {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { API_BASE_URL } from "@/environment";
import { all_routes } from "@/routes/all_routes";
import { openDialysisPrintWindow } from "./DialysisPrintView";

const sectionIds = [
  "general-information",
  "pre-dialysis-assessment",
  "dialysis-monitoring",
  "post-dialysis-assessment",
  "complications-during-dialysis",
  "treatment-given",
] as const;

type IDialysisSessionRecord = {
  _id?: string;
  sessionId?: string;
  daycareAppointmentId?: string;
  sessionDate?: string;
  createdAt?: string;
  patient?: { mrd?: string; name?: string; age?: number; gender?: string };
  generalInformation?: Record<string, unknown>;
  preDialysisAssessment?: Record<string, unknown>;
  monitoringReadings?: Record<string, unknown>[];
  postDialysisAssessment?: Record<string, unknown>;
  complications?: Record<string, unknown>;
  treatmentGiven?: Record<string, unknown>;
};

const normalizeDialysisSession = (payload: unknown): IDialysisSessionRecord | null => {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as { data?: unknown };
  const data = root.data ?? payload;
  if (!data || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;
  if (obj.session && typeof obj.session === "object") {
    return obj.session as IDialysisSessionRecord;
  }
  if (typeof obj._id === "string") {
    return obj as IDialysisSessionRecord;
  }
  return null;
};

const findDialysisSessionInList = (
  sessions: IDialysisSessionRecord[],
  targetSessionId: string
): IDialysisSessionRecord | undefined => {
  const target = targetSessionId.trim().toLowerCase();
  if (!target) return undefined;
  return sessions.find(
    (s) =>
      (s?._id?.toLowerCase() ?? "") === target ||
      (s?.sessionId?.toLowerCase() ?? "") === target ||
      (s?.daycareAppointmentId?.toLowerCase() ?? "") === target
  );
};

const DialysisAppointmentContent = () => {
  const sectionRefs: Record<(typeof sectionIds)[number], React.RefObject<HTMLDivElement | null>> = {
    "general-information": useRef<HTMLDivElement>(null),
    "pre-dialysis-assessment": useRef<HTMLDivElement>(null),
    "dialysis-monitoring": useRef<HTMLDivElement>(null),
    "post-dialysis-assessment": useRef<HTMLDivElement>(null),
    "complications-during-dialysis": useRef<HTMLDivElement>(null),
    "treatment-given": useRef<HTMLDivElement>(null),
  };

  const formRef = useRef<HTMLFormElement>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isCentralLineNo, setIsCentralLineNo] = useState(false);
  const [mrdNo, setMrdNo] = useState("");
  const [loadedSession, setLoadedSession] = useState<IDialysisSessionRecord | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(false);
  const [sessionLoadError, setSessionLoadError] = useState<string | null>(null);

  const handlePrint = () => {
    if (formRef.current) {
      openDialysisPrintWindow(formRef.current);
    }
  };

  const handleScrollTo = (id: (typeof sectionIds)[number]) => {
    const target = sectionRefs[id].current;
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleCentralLineNoChange = (event: ChangeEvent<HTMLInputElement>) => {
    setIsCentralLineNo(event.target.checked);
  };

  const sessionId = searchParams.get("sessionId");
  const patientIdFromUrl = searchParams.get("patientId") ?? searchParams.get("id");
  const isEditMode = Boolean(sessionId && API_BASE_URL);

  const applySessionToForm = useCallback((session: IDialysisSessionRecord) => {
    const form = formRef.current;
    if (!form) return;

    const getControl = (name: string) =>
      form.querySelector(`[name="${CSS.escape(name)}"]`) as
        | HTMLInputElement
        | HTMLTextAreaElement
        | null;

    const setVal = (name: string, val: unknown) => {
      const el = getControl(name);
      if (!el) return;
      if (el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio")) {
        el.checked = Boolean(val);
        return;
      }
      el.value = val !== undefined && val !== null ? String(val) : "";
    };

    const setCheck = (name: string, val: boolean) => {
      const el = getControl(name);
      if (el instanceof HTMLInputElement && el.type === "checkbox") {
        el.checked = Boolean(val);
      }
    };

    const pat = session.patient ?? {};
    setVal("patient.name", pat.name);
    setVal("patient.age", pat.age);
    setVal("patient.gender", pat.gender);
    setVal("meta.sessionDate", session.sessionDate);
    setVal("meta.createdAt", session.createdAt);

    const gen = session.generalInformation ?? {};
    setVal("general.machineNumber", gen.machineNumber);
    setVal("general.mrdNo", pat?.mrd ?? gen.uhid);
    setVal("general.technicianName", gen.technicianName);
    setVal("general.startTime", gen.startTime);
    setVal("general.endTime", gen.endTime);
    setVal("general.bolus", gen.bolus);
    setVal("general.hourly", gen.hourly);
    setVal("general.fiberVolume", gen.fiberVolume);
    setVal("general.heparinUse", gen.heparinUse);
    setVal("general.height", gen.height);
    setVal("general.preHdWeightToday", gen.preHdWeightToday);
    setVal("general.lastPostHdWeight", gen.lastPostHdWeight);
    setVal("general.weightGain", gen.weightGain);
    setVal("general.targetWeightLoss", gen.targetWeightLoss);
    setVal("general.postHdWeightToday", gen.postHdWeightToday);
    setVal("general.actualWeightLoss", gen.actualWeightLoss);
    setVal("general.remainingWeightLoss", gen.remainingWeightLoss);
    setVal("general.targetDryWeight", gen.targetDryWeight);

    setCheck("general.dialyzerUsageSingleUse", Boolean(gen.dialyzerUsageSingleUse));
    setCheck("general.dialyzerUsageReuse", Boolean(gen.dialyzerUsageReuse));
    setVal("general.timesReused", gen.timesReused);
    setCheck("general.vascularAccessPresent", Boolean(gen.vascularAccessPresent));
    setCheck("general.centralLineYes", Boolean(gen.centralLineYes));
    setCheck("general.centralLineNo", Boolean(gen.centralLineNo));

    if (gen.centralLineIJV) {
      const el = form.querySelector(
        `[name="general.centralLineSite"][value="ijv"]`
      ) as HTMLInputElement | null;
      if (el) el.checked = true;
    } else if (gen.centralLineFemoral) {
      const el = form.querySelector(
        `[name="general.centralLineSite"][value="femoral"]`
      ) as HTMLInputElement | null;
      if (el) el.checked = true;
    }

    setCheck("general.avfSelected", Boolean(gen.avfSelected));
    setCheck("general.avgSelected", Boolean(gen.avgSelected));
    setCheck("general.ijvSelected", Boolean(gen.ijvSelected));
    setCheck("general.femoralSelected", Boolean(gen.femoralSelected));
    setCheck("general.tunneledCatheter", Boolean(gen.tunneledCatheter));
    setCheck("general.avfNeedleSize16G", Boolean(gen.avfNeedleSize16G));
    setCheck("general.avfNeedleSize17G", Boolean(gen.avfNeedleSize17G));
    setCheck("general.avfNeedleSizeOthers", Boolean(gen.avfNeedleSizeOthers));
    setVal("general.avfNeedleSizeOthersValue", gen.avfNeedleSizeOthersValue);
    setCheck("general.bruitThrillPresent", Boolean(gen.bruitThrillPresent));
    setCheck("general.bruitThrillAbsent", Boolean(gen.bruitThrillAbsent));
    setCheck("general.bruitThrillNotApplicable", Boolean(gen.bruitThrillNotApplicable));

    const pre = session.preDialysisAssessment ?? {};
    setVal("pre.bpStartHd", pre.bpStartHd);
    setVal("pre.spo2", pre.spo2);
    setVal("pre.bodyTemperature", pre.bodyTemperature);
    setVal("pre.pulse", pre.pulse);

    (session.monitoringReadings ?? []).forEach((r, i) => {
      if (i >= 8) return;
      setVal(`monitoring.${i}.timeOnHd`, r.timeOnHd);
      setVal(`monitoring.${i}.pr`, r.pr);
      setVal(`monitoring.${i}.bp`, r.bp);
      setVal(`monitoring.${i}.bfr`, r.bfr);
      setVal(`monitoring.${i}.dfr`, r.dfr);
      setVal(`monitoring.${i}.ufr`, r.ufr);
      setVal(`monitoring.${i}.totalUf`, r.totalUf);
      setVal(`monitoring.${i}.temperature`, r.temperature);
      setVal(`monitoring.${i}.dyna`, r.dyna);
      setVal(`monitoring.${i}.heparin`, r.heparin);
      setVal(`monitoring.${i}.rbs`, r.rbs);
    });

    const post = session.postDialysisAssessment ?? {};
    setVal("post.pulse", post.pulse);
    setVal("post.bp", post.bp);
    setVal("post.bodyTemperature", post.bodyTemperature);
    setVal("post.postHdWeight1", post.postHdWeight);
    setVal("post.ufRemoved", post.ufRemoved ?? post.postHdWeightField2);
    setVal("post.ktVAchieved", post.ktVAchieved);

    const pb = post.prolongedBleedingField1;
    if (pb) {
      const el = form.querySelector(
        `[name="post.prolongedBleeding"][value="${CSS.escape(String(pb))}"]`
      ) as HTMLInputElement | null;
      if (el) el.checked = true;
    }

    const bruitValue = String(post.bruitThrillAvfAvgField1 ?? "");
    setCheck("post.bruitThrillPresent", bruitValue === "Present");
    setCheck("post.bruitThrillAbsent", bruitValue === "Absent");
    setCheck("post.bruitThrillNotApplicable", bruitValue === "Not Applicable");

    const comp = session.complications ?? {};
    setCheck("comp.hypotension", Boolean(comp.hypotension));
    setCheck("comp.fever", Boolean(comp.fever));
    setCheck("comp.headache", Boolean(comp.headache));
    setCheck("comp.rigor", Boolean(comp.rigor));
    setCheck("comp.cramps", Boolean(comp.cramps));
    setCheck("comp.rash", Boolean(comp.rash));
    setCheck("comp.vomiting", Boolean(comp.vomiting));
    setCheck("comp.chestPain", Boolean(comp.chestPain));
    setCheck("comp.dyspnea", Boolean(comp.dyspnea));
    setCheck("comp.pruritus", Boolean(comp.pruritus));
    setCheck("comp.dialyzerReaction", Boolean(comp.dialyzerReaction));
    setCheck("comp.seizures", Boolean(comp.seizures));
    setCheck("comp.noComplication", Boolean(comp.noComplication));
    setCheck("comp.formSibring", Boolean(comp.formSibring));
    setCheck("comp.hypoglycemia", Boolean(comp.hypoglycemia));
    setCheck("comp.hypertension", Boolean(comp.hypertension));
    setVal("comp.other", comp.other);

    const treat = session.treatmentGiven ?? {};
    setVal("treat.epoDosage", treat.epoDosage);
    setVal("treat.epoGivenBy", treat.epoGivenBy);
    setVal("treat.ivIronDose", treat.ivIronDose);

    if (treat.bloodTransfusionField1) {
      const el = form.querySelector(
        `[name="treat.bloodTransfusion"][value="${CSS.escape(String(treat.bloodTransfusionField1))}"]`
      ) as HTMLInputElement | null;
      if (el) el.checked = true;
    }
    setVal("treat.numberOfUnits", treat.numberOfUnits);
    setVal("treat.bloodBankName", treat.bloodBankName);
    setVal("treat.typeOfBlood", treat.typeOfBlood);
    setVal("treat.otherTreatmentGivenDrug", treat.otherTreatmentGivenDrug);
  }, []);

  // Prefill: only in edit mode — load the selected session and populate form. New form stays empty.
  useEffect(() => {
    const pId = searchParams.get("patientId") ?? searchParams.get("id");
    if (!sessionId || !pId || !API_BASE_URL) {
      setLoadedSession(null);
      setSessionLoadError(null);
      return;
    }

    let cancelled = false;

    const fetchData = async () => {
      setIsSessionLoading(true);
      setSessionLoadError(null);
      setLoadedSession(null);

      try {
        let session: IDialysisSessionRecord | null = null;

        try {
          const byIdRes = await axios.get(
            `${API_BASE_URL}/hospital/dialysis-session/${sessionId}`
          );
          session = normalizeDialysisSession(byIdRes.data);
        } catch {
          // Fall back to patient session list below.
        }

        if (!session) {
          const listRes = await axios.get(
            `${API_BASE_URL}/hospital/dialysis-session/patient/${pId}`,
            { params: { page: 1, limit: 100 } }
          );
          const sessions = (listRes.data?.data?.sessions ?? []) as IDialysisSessionRecord[];
          session = findDialysisSessionInList(sessions, sessionId) ?? null;
        }

        if (cancelled) return;

        if (!session) {
          setSessionLoadError("Dialysis session not found for this link.");
          return;
        }

        const gen = session.generalInformation ?? {};
        const pat = session.patient ?? {};
        setMrdNo(String(pat?.mrd ?? gen?.uhid ?? ""));
        setIsCentralLineNo(Boolean(gen.centralLineNo));
        setLoadedSession(session);
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to fetch dialysis session data", err);
          setSessionLoadError("Failed to load dialysis session. Please try again.");
        }
      } finally {
        if (!cancelled) {
          setIsSessionLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [searchParams, sessionId]);

  useLayoutEffect(() => {
    if (!loadedSession) return;
    applySessionToForm(loadedSession);
  }, [loadedSession, applySessionToForm]);

  // Prefill MRD for new form from patient ID in URL
  useEffect(() => {
    if (isEditMode || !patientIdFromUrl || !API_BASE_URL) return;

    const fetchPatient = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/hospital/patients/${patientIdFromUrl}`);
        const patient = response?.data?.data?.patient ?? response?.data?.data ?? null;
        setMrdNo(patient?.mrd ?? "");
      } catch {
        setMrdNo("");
      }
    };

    fetchPatient();
  }, [isEditMode, patientIdFromUrl]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(false);

    const formData = new FormData(e.currentTarget);
    const get = (name: string) => (formData.get(name)?.toString().trim() ?? "");
    /**
     * API expects ALL (non-boolean) fields as strings.
     * We keep checkboxes/radios that represent booleans as booleans via `getBool`.
     */
    const getNumber = (name: string): string | undefined => {
      const v = get(name);
      if (v === "") return undefined;
      return v;
    };
    /**
     * For monitoring cells that may be numeric or free text (e.g. "normal").
     * Always returns a string (or undefined when empty).
     */
    const parseNumericOrString = (raw: string): string | undefined => {
      const t = raw.trim();
      if (t === "") return undefined;
      return t;
    };
    const getBool = (name: string) => formData.get(name) === "on";

    const patientId =
      searchParams.get("patientId") ??
      searchParams.get("id") ??
      get("meta.patientId");
    const visitId = searchParams.get("visitId") ?? get("meta.visitId");
    const procedureId = searchParams.get("procedureId") ?? get("meta.procedureId");
    const centralLineSite = get("general.centralLineSite");

    const generalInformation = {
      machineNumber: get("general.machineNumber"),
      uhid: get("general.mrdNo"),
      technicianName: get("general.technicianName"),
      startTime: get("general.startTime"),
      endTime: get("general.endTime"),
      bolus: get("general.bolus"),
      hourly: get("general.hourly"),
      fiberVolume: getNumber("general.fiberVolume"),
      heparinUse: get("general.heparinUse"),
      height: getNumber("general.height"),
      preHdWeightToday: getNumber("general.preHdWeightToday"),
      lastPostHdWeight: getNumber("general.lastPostHdWeight"),
      weightGain: getNumber("general.weightGain"),
      targetWeightLoss: getNumber("general.targetWeightLoss"),
      postHdWeightToday: getNumber("general.postHdWeightToday"),
      actualWeightLoss: getNumber("general.actualWeightLoss"),
      remainingWeightLoss: getNumber("general.remainingWeightLoss"),
      targetDryWeight: getNumber("general.targetDryWeight"),
      dialyzerUsageSingleUse: getBool("general.dialyzerUsageSingleUse"),
      dialyzerUsageReuse: getBool("general.dialyzerUsageReuse"),
      timesReused: getNumber("general.timesReused"),
      vascularAccessPresent: getBool("general.vascularAccessPresent"),
      centralLineYes: getBool("general.centralLineYes"),
      centralLineNo: getBool("general.centralLineNo"),
      centralLineIJV: centralLineSite === "ijv",
      centralLineFemoral: centralLineSite === "femoral",
      avfSelected: getBool("general.avfSelected"),
      avgSelected: getBool("general.avgSelected"),
      ijvSelected: getBool("general.ijvSelected"),
      femoralSelected: getBool("general.femoralSelected"),
      tunneledCatheter: getBool("general.tunneledCatheter"),
      avfNeedleSize16G: getBool("general.avfNeedleSize16G"),
      avfNeedleSize17G: getBool("general.avfNeedleSize17G"),
      avfNeedleSizeOthers: getBool("general.avfNeedleSizeOthers"),
      avfNeedleSizeOthersValue: get("general.avfNeedleSizeOthersValue"),
      bruitThrillPresent: getBool("general.bruitThrillPresent"),
      bruitThrillAbsent: getBool("general.bruitThrillAbsent"),
      bruitThrillNotApplicable: getBool("general.bruitThrillNotApplicable"),
    };

    const preDialysisAssessment = {
      bpStartHd: get("pre.bpStartHd"),
      spo2: getNumber("pre.spo2"),
      bodyTemperature: getNumber("pre.bodyTemperature"),
      pulse: getNumber("pre.pulse"),
    };

    const monitoringReadings = [];
    for (let i = 0; i < 8; i += 1) {
      const timeOnHd = get(`monitoring.${i}.timeOnHd`);
      const pr = get(`monitoring.${i}.pr`);
      const bp = get(`monitoring.${i}.bp`);
      const bfr = get(`monitoring.${i}.bfr`);
      const dfr = get(`monitoring.${i}.dfr`);
      const ufr = get(`monitoring.${i}.ufr`);
      const totalUf = get(`monitoring.${i}.totalUf`);
      const temperature = get(`monitoring.${i}.temperature`);
      const dyna = get(`monitoring.${i}.dyna`);
      const heparin = get(`monitoring.${i}.heparin`);
      const rbs = get(`monitoring.${i}.rbs`);
      const rbsPayload = parseNumericOrString(rbs);

      const anyValue = [
        timeOnHd,
        pr,
        bp,
        bfr,
        dfr,
        ufr,
        totalUf,
        temperature,
        dyna,
        heparin,
        rbs,
      ].some((v) => v !== "");
      if (!anyValue) continue;

      monitoringReadings.push({
        timeOnHd,
        pr: parseNumericOrString(pr),
        bp,
        bfr: parseNumericOrString(bfr),
        dfr: parseNumericOrString(dfr),
        ufr: parseNumericOrString(ufr),
        totalUf: parseNumericOrString(totalUf),
        temperature: parseNumericOrString(temperature),
        dyna: parseNumericOrString(dyna),
        heparin: parseNumericOrString(heparin),
        rbs: rbsPayload,
      });
    }

    const postDialysisAssessment = {
      pulse: getNumber("post.pulse"),
      bp: get("post.bp"),
      bodyTemperature: getNumber("post.bodyTemperature"),
      postHdWeight: get("post.postHdWeight1"),
      ufRemoved: getNumber("post.ufRemoved"),
      // Keep legacy key populated from the same visible field for backward compatibility.
      postHdWeightField2: getNumber("post.ufRemoved"),
      prolongedBleedingField1: get("post.prolongedBleeding"),
      prolongedBleedingField2: "",
      bruitThrillAvfAvgField1: getBool("post.bruitThrillPresent") ? "Present" : "",
      bruitThrillAvfAvgField2: getBool("post.bruitThrillAbsent") ? "Absent" : "",
      bruitThrillAvfAvgField3: getBool("post.bruitThrillNotApplicable") ? "Not Applicable" : "",
      ktVAchieved: getNumber("post.ktVAchieved"),
    };

    const complications = {
      headache: getBool("comp.headache"),
      rash: getBool("comp.rash"),
      dyspnea: getBool("comp.dyspnea"),
      seizures: getBool("comp.seizures"),
      noComplication: getBool("comp.noComplication"),
      fever: getBool("comp.fever"),
      cramps: getBool("comp.cramps"),
      chestPain: getBool("comp.chestPain"),
      dialyzerReaction: getBool("comp.dialyzerReaction"),
      hypotension: getBool("comp.hypotension"),
      rigor: getBool("comp.rigor"),
      vomiting: getBool("comp.vomiting"),
      pruritus: getBool("comp.pruritus"),
      formSibring: getBool("comp.formSibring"),
      hypoglycemia: getBool("comp.hypoglycemia"),
      hypertension: getBool("comp.hypertension"),
      other: get("comp.other"),
    };

    const treatmentGiven = {
      epoDosage: getNumber("treat.epoDosage"),
      epoGivenBy: get("treat.epoGivenBy"),
      patientSignature: get("treat.patientSignature"),
      ivIronDose: getNumber("treat.ivIronDose"),
      bloodTransfusionField1: get("treat.bloodTransfusion"),
      bloodTransfusionField2: "",
      numberOfUnits: getNumber("treat.numberOfUnits"),
      bloodBankName: get("treat.bloodBankName"),
      typeOfBlood: get("treat.typeOfBlood"),
      otherTreatmentGivenDrug: get("treat.otherTreatmentGivenDrug"),
    };

    const signatures = {
      technicianSignature: get("signatures.technicianSignature"),
      doctorInCharge: get("signatures.doctorInCharge"),
      patientSignature: get("signatures.patientSignature"),
    };

    const editId = searchParams.get("sessionId");
    const payload = editId
      ? {
          visitId,
          generalInformation,
          preDialysisAssessment,
          monitoringReadings,
          postDialysisAssessment,
          complications,
          treatmentGiven,
          signatures,
          status: "In Progress",
        }
      : {
          patientId,
          visitId,
          procedureId,
          generalInformation,
          preDialysisAssessment,
          monitoringReadings,
          postDialysisAssessment,
          complications,
          treatmentGiven,
          signatures,
          status: "In Progress",
        };

    try {
      setIsSubmitting(true);
      if (editId && API_BASE_URL) {
        await axios.put(
          `${API_BASE_URL}/hospital/dialysis-session/${editId}`,
          payload
        );
      } else if (API_BASE_URL) {
        await axios.post(`${API_BASE_URL}/hospital/dialysis-session`, payload);
      }
      setSubmitSuccess(true);
      if (patientId) {
        router.push(`${all_routes.patientDetails}?id=${patientId}`);
      }
    } catch (error: any) {
      setSubmitError(error?.response?.data?.message ?? "Failed to save dialysis session.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-wrapper">
      <div className="content dialysis-page">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h4 className="fw-bold mb-0">
            {isEditMode ? "Edit Dialysis Session" : "Dialysis Form"}
          </h4>
          {isEditMode && isSessionLoading ? (
            <span className="text-muted fs-14">Loading session...</span>
          ) : null}
          {isEditMode && sessionLoadError ? (
            <span className="text-danger fs-14">{sessionLoadError}</span>
          ) : null}
          {!isEditMode && (
            <Link href={all_routes.appointments} className="btn btn-outline-primary">
              Back to Appointments
            </Link>
          )}
        </div>

        <div className="row g-2 dialysis-form-row">
          {/* Left: section navigation */}
          <div className="col-md-2 col-lg-2 mb-2 d-flex">
            <div className="card shadow-sm flex-grow-1 d-flex flex-column">
              <div className="card-header">
                <h6 className="fw-bold mb-0">Sections</h6>
              </div>
              <div className="card-body p-2 flex-grow-1 overflow-y-auto">
                <ul className="list-group list-group-flush">
                  <li
                    className="list-group-item list-group-item-action cursor-pointer"
                    style={{ cursor: "pointer" }}
                    onClick={() => handleScrollTo("general-information")}
                  >
                    General Information
                  </li>
                  <li
                    className="list-group-item list-group-item-action cursor-pointer"
                    style={{ cursor: "pointer" }}
                    onClick={() => handleScrollTo("pre-dialysis-assessment")}
                  >
                    Pre-Dialysis Assessment
                  </li>
                  <li
                    className="list-group-item list-group-item-action cursor-pointer"
                    style={{ cursor: "pointer" }}
                    onClick={() => handleScrollTo("dialysis-monitoring")}
                  >
                    Dialysis Monitoring
                  </li>
                  <li
                    className="list-group-item list-group-item-action cursor-pointer"
                    style={{ cursor: "pointer" }}
                    onClick={() => handleScrollTo("post-dialysis-assessment")}
                  >
                    Post Dialysis Assessment
                  </li>
                  <li
                    className="list-group-item list-group-item-action cursor-pointer"
                    style={{ cursor: "pointer" }}
                    onClick={() => handleScrollTo("complications-during-dialysis")}
                  >
                    Complications During Dialysis
                  </li>
                  <li
                    className="list-group-item list-group-item-action cursor-pointer"
                    style={{ cursor: "pointer" }}
                    onClick={() => handleScrollTo("treatment-given")}
                  >
                    Treatment Given
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Right: dialysis form sections */}
          <div className="col-md-10 col-lg-10 d-flex">
            <div className="card shadow-sm flex-grow-1 d-flex flex-column min-h-0">
              <form
                ref={formRef}
                className="flex-grow-1 d-flex flex-column"
                onSubmit={handleSubmit}
              >
                <div
                  className="card-body flex-grow-1 overflow-y-auto"
                  style={{ minHeight: "75vh", maxHeight: "85vh" }}
                >
                  <input type="hidden" name="patient.name" />
                  <input type="hidden" name="patient.age" />
                  <input type="hidden" name="patient.gender" />
                  <input type="hidden" name="meta.sessionDate" />
                  <input type="hidden" name="meta.createdAt" />

                  {/* General Information */}
                  <div ref={sectionRefs["general-information"]} id="general-information" className="mb-4">
                    <h5 className="fw-bold mb-3">General Information</h5>
                    <div className="border rounded p-3">
                      <div className="row g-2">
                        {/* Row 1 – Machine / UHID / Technician */}
                        <div className="col-md-2 col-12 col-sm-6">
                          <label className="form-label mb-1 fw-medium">Machine Number</label>
                          <input
                            name="general.machineNumber"
                            type="text"
                            className="form-control form-control-sm"
                          />
                        </div>
                        <div className="col-md-2 col-12 col-sm-6">
                          <label className="form-label mb-1 fw-medium">MRD No.</label>
                          <input name="general.mrdNo" type="hidden" value={mrdNo} />
                          <input
                            name="general.mrdNoDisplay"
                            type="text"
                            className="form-control form-control-sm"
                            value={mrdNo}
                            disabled
                          />
                        </div>
                        <div className="col-md-2 col-12 col-sm-6">
                          <label className="form-label mb-1 fw-medium">Start Time</label>
                          <input
                            name="general.startTime"
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="HH:MM"
                          />
                        </div>
                        <div className="col-md-2 col-12 col-sm-6">
                          <label className="form-label mb-1 fw-medium">End Time</label>
                          <input
                            name="general.endTime"
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="HH:MM"
                          />
                        </div>
                        <div className="col-md-4 col-12 col-sm-12">
                          <label className="form-label mb-1 fw-medium">Technician Name</label>
                          <input
                            name="general.technicianName"
                            type="text"
                            className="form-control form-control-sm"
                          />
                        </div>

                        {/* Row 2 – Dialyzer usage row */}
                        <div className="col-md-2 col-12">
                          <label className="form-label mb-1 fw-medium">Dialyzer Usage Type</label>
                          <div className="d-flex flex-wrap gap-2">
                            <div className="form-check me-2">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                id="dialyzer-single-use"
                                name="general.dialyzerUsageSingleUse"
                              />
                              <label
                                className="form-check-label"
                                htmlFor="dialyzer-single-use"
                                style={{ color: "#000" }}
                              >
                                Single Use
                              </label>
                            </div>
                            <div className="form-check">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                id="dialyzer-reuse"
                                name="general.dialyzerUsageReuse"
                              />
                              <label className="form-check-label" htmlFor="dialyzer-reuse" style={{ color: "#000" }}>
                                Reuse
                              </label>
                            </div>
                          </div>
                        </div>
                        <div className="col-md-2 col-12 col-sm-6">
                          <label className="form-label mb-1 fw-medium" style={{ whiteSpace: "nowrap" }}>
                            Times Reused
                          </label>
                          <input
                            name="general.timesReused"
                            type="text"
                            className="form-control form-control-sm"
                          />
                        </div>
                        <div className="col-md-2 col-6">
                          <label className="form-label mb-1 fw-medium">Fiber Volume</label>
                          <input
                            name="general.fiberVolume"
                            type="text"
                            className="form-control form-control-sm"
                          />
                        </div>
                        <div className="col-md-2 col-6">
                          <label className="form-label mb-1 fw-medium">Bolus</label>
                          <input
                            name="general.bolus"
                            type="text"
                            className="form-control form-control-sm"
                          />
                        </div>
                        <div className="col-md-2 col-6">
                          <label className="form-label mb-1 fw-medium">Hourly</label>
                          <input
                            name="general.hourly"
                            type="text"
                            className="form-control form-control-sm"
                          />
                        </div>
                        <div className="col-md-2 col-6">
                          <label className="form-label mb-1 fw-medium">Heparin Use</label>
                          <input
                            name="general.heparinUse"
                            type="text"
                            className="form-control form-control-sm"
                          />
                        </div>

                        {/* Row 3 – Height / Pre / Post weights + gain */}
                        <div className="col-md-2 col-12 col-sm-6">
                          <label className="form-label mb-1 fw-medium">Height</label>
                          <input
                            name="general.height"
                            type="text"
                            className="form-control form-control-sm"
                          />
                        </div>
                        <div className="col-md-2 col-12 col-sm-6">
                          <label className="form-label mb-1 fw-medium">Pre HD Weight Today</label>
                          <input
                            name="general.preHdWeightToday"
                            type="text"
                            className="form-control form-control-sm"
                          />
                        </div>
                        <div className="col-md-2 col-12 col-sm-6">
                          <label className="form-label mb-1 fw-medium">Last Post HD Weight</label>
                          <input
                            name="general.lastPostHdWeight"
                            type="text"
                            className="form-control form-control-sm"
                          />
                        </div>
                        <div className="col-md-2 col-12 col-sm-6">
                          <label className="form-label mb-1 fw-medium">Weight Gain</label>
                          <input
                            name="general.weightGain"
                            type="text"
                            className="form-control form-control-sm"
                          />
                        </div>

                        {/* Row 4 – Target / Post HD / Actual loss */}
                        <div className="col-md-2 col-12 col-sm-6">
                          <label className="form-label mb-1 fw-medium">Target Weight Loss</label>
                          <input
                            name="general.targetWeightLoss"
                            type="text"
                            className="form-control form-control-sm"
                          />
                        </div>
                        <div className="col-md-2 col-12 col-sm-6">
                          <label className="form-label mb-1 fw-medium">Post HD Weight Today</label>
                          <input
                            name="general.postHdWeightToday"
                            type="text"
                            className="form-control form-control-sm"
                          />
                        </div>
                        <div className="col-md-2 col-12 col-sm-6">
                          <label className="form-label mb-1 fw-medium">Actual Weight Loss</label>
                          <input
                            name="general.actualWeightLoss"
                            type="text"
                            className="form-control  form-control-sm"
                          />
                        </div>

                        {/* Row 5 – Target dry weight / Remain weight loss / Vascular Access */}
                        <div className="col-md-2 col-12">
                          <label className="form-label mb-1 fw-medium">Target Dry Weight</label>
                          <input
                            name="general.targetDryWeight"
                            type="text"
                            className="form-control form-control-sm"
                          />
                        </div>
                        <div className="col-md-2 col-12">
                          <label className="form-label mb-1 fw-medium">Remain Weight Loss</label>
                          <input
                            name="general.remainingWeightLoss"
                            type="text"
                            className="form-control form-control-sm"
                          />
                        </div>
                        <div className="col-md-6 col-12">
                          <label className="form-label mb-1 fw-medium">Vascular Access</label>
                          <div className="d-flex flex-wrap align-items-center gap-3">
                            <div className="form-check m-0">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                id="avf"
                                name="general.avfSelected"
                              />
                              <label className="form-check-label" htmlFor="avf" style={{ color: "#000" }}>
                                AVF
                              </label>
                            </div>
                            <div className="form-check m-0">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                id="avg"
                                name="general.avgSelected"
                              />
                              <label className="form-check-label" htmlFor="avg" style={{ color: "#000" }}>
                                AVG
                              </label>
                            </div>
                            <div className="form-check m-0">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                id="ijv"
                                name="general.ijvSelected"
                              />
                              <label className="form-check-label" htmlFor="ijv" style={{ color: "#000" }}>
                                IJV
                              </label>
                            </div>
                            <div className="form-check m-0">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                id="femoral"
                                name="general.femoralSelected"
                              />
                              <label className="form-check-label" htmlFor="femoral" style={{ color: "#000" }}>
                                Femoral
                              </label>
                            </div>
                            <div className="form-check m-0">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                id="tunneled-catheter"
                                name="general.tunneledCatheter"
                              />
                              <label className="form-check-label" htmlFor="tunneled-catheter" style={{ color: "#000" }}>
                                Tunneled Catheter
                              </label>
                            </div>
                          </div>
                        </div>

                        {/* Row 7: checkbox rows start – Central line */}
                        <div className="col-md-3 col-12">
                          <label className="form-label mb-1 fw-medium">Central Line</label>
                          <div className="d-flex flex-wrap gap-2">
                            <div className="form-check me-2">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                id="central-line-yes"
                                name="general.centralLineYes"
                              />
                              <label className="form-check-label" htmlFor="central-line-yes" style={{ color: "#000" }}>
                                Yes
                              </label>
                            </div>
                            <div className="form-check me-2">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                id="central-line-no"
                                name="general.centralLineNo"
                                checked={isCentralLineNo}
                                onChange={handleCentralLineNoChange}
                              />
                              <label className="form-check-label" htmlFor="central-line-no" style={{ color: "#000" }}>
                                No
                              </label>
                            </div>
                            <div className="form-check me-2">
                              <input
                                className="form-check-input"
                                type="radio"
                                id="central-line-ijv"
                                name="general.centralLineSite"
                                value="ijv"
                                disabled={isCentralLineNo}
                              />
                              <label className="form-check-label" htmlFor="central-line-ijv" style={{ color: "#000" }}>
                                IJV
                              </label>
                            </div>
                            <div className="form-check">
                              <input
                                className="form-check-input"
                                type="radio"
                                id="central-line-femoral"
                                name="general.centralLineSite"
                                value="femoral"
                                disabled={isCentralLineNo}
                              />
                              <label
                                className="form-check-label"
                                htmlFor="central-line-femoral"
                                style={{ color: "#000" }}
                              >
                                Femoral
                              </label>
                            </div>
                          </div>
                        </div>
                        <div className="col-md-3 col-12">
                          <label className="form-label mb-1 fw-medium">AVF Needle Size</label>
                          <div className="d-flex flex-wrap gap-2">
                            <div className="form-check me-2">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                id="needle-16g"
                                name="general.avfNeedleSize16G"
                              />
                              <label className="form-check-label" htmlFor="needle-16g" style={{ color: "#000" }}>
                                16G
                              </label>
                            </div>
                            <div className="form-check me-2">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                id="needle-17g"
                                name="general.avfNeedleSize17G"
                              />
                              <label className="form-check-label" htmlFor="needle-17g" style={{ color: "#000" }}>
                                17G
                              </label>
                            </div>
                            <div className="form-check">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                id="needle-others"
                                name="general.avfNeedleSizeOthers"
                              />
                              <label className="form-check-label" htmlFor="needle-others" style={{ color: "#000" }}>
                                Others
                              </label>
                            </div>
                          </div>
                        </div>
                        <div className="col-md-3 col-12">
                          <label className="form-label mb-1 fw-medium">Bruit / Thrill</label>
                          <div className="d-flex flex-wrap gap-2">
                            <div className="form-check me-2">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                id="bruit-present"
                                name="general.bruitThrillPresent"
                              />
                              <label className="form-check-label" htmlFor="bruit-present" style={{ color: "#000" }}>
                                Present
                              </label>
                            </div>
                            <div className="form-check me-2">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                id="bruit-absent"
                                name="general.bruitThrillAbsent"
                              />
                              <label className="form-check-label" htmlFor="bruit-absent" style={{ color: "#000" }}>
                                Absent
                              </label>
                            </div>
                            <div className="form-check">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                id="bruit-na"
                                name="general.bruitThrillNotApplicable"
                              />
                              <label className="form-check-label" htmlFor="bruit-na" style={{ color: "#000" }}>
                                Not Applicable
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Pre-Dialysis Assessment */}
                  <div ref={sectionRefs["pre-dialysis-assessment"]} id="pre-dialysis-assessment" className="mb-4">
                    <h5 className="fw-bold mb-3">Pre-Dialysis Assessment</h5>
                    <div className="border rounded p-3">
                      <div className="row g-2">
                        <div className="col-md-3 col-6">
                          <label className="form-label mb-1 fw-medium">BP at Start of HD</label>
                          <input
                            name="pre.bpStartHd"
                            type="text"
                            className="form-control form-control-sm"
                          />
                        </div>
                        <div className="col-md-3 col-6">
                          <label className="form-label mb-1 fw-medium">SPO2</label>
                          <input
                            name="pre.spo2"
                            type="text"
                            className="form-control form-control-sm"
                          />
                        </div>
                        <div className="col-md-3 col-6">
                          <label className="form-label mb-1 fw-medium">Body Temperature</label>
                          <input
                            name="pre.bodyTemperature"
                            type="text"
                            className="form-control form-control-sm"
                          />
                        </div>
                        <div className="col-md-3 col-6">
                          <label className="form-label mb-1 fw-medium">Pulse</label>
                          <input
                            name="pre.pulse"
                            type="text"
                            className="form-control form-control-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Dialysis Monitoring */}
                  <div ref={sectionRefs["dialysis-monitoring"]} id="dialysis-monitoring" className="mb-4">
                    <h5 className="fw-bold mb-3">Dialysis Monitoring</h5>
                    <div className="border rounded p-3">
                      <div className="table-responsive">
                        <table className="dialysis-table w-100 text-center">
                          <thead className="table-light">
                            <tr>
                              <th style={{ whiteSpace: "nowrap", width: "7%" }}>Time on HD</th>
                              <th>PR</th>
                              <th style={{ width: "10%" }}>BP</th>
                              <th>BFR</th>
                              <th>DFR</th>
                              <th style={{ width: "10%" }}>UFR</th>
                              <th>Total UF</th>
                              <th>Temp.</th>
                              <th>DyNa</th>
                              <th>Heparin</th>
                              <th style={{ width: "10%" }}>RBS</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Array.from({ length: 8 }).map((_, index) => (
                              <tr key={index}>
                                <td style={{ padding: "2px 1px" }}>
                                  <input
                                    type="text"
                                    className="form-control form-control-sm text-center"
                                    aria-label="Time on HD"
                                    style={{ fontSize: "16px" }}
                                    name={`monitoring.${index}.timeOnHd`}
                                  />
                                </td>
                                <td style={{ padding: "2px 1px" }}>
                                  <input
                                    type="text"
                                    className="form-control form-control-sm text-center"
                                    aria-label="PR"
                                    style={{ fontSize: "16px" }}
                                    name={`monitoring.${index}.pr`}
                                  />
                                </td>
                                <td style={{ padding: "2px 1px" }}>
                                  <input
                                    type="text"
                                    className="form-control form-control-sm text-center"
                                    aria-label="BP"
                                    style={{ fontSize: "16px" }}
                                    name={`monitoring.${index}.bp`}
                                  />
                                </td>
                                <td style={{ padding: "2px 1px" }}>
                                  <input
                                    type="text"
                                    className="form-control form-control-sm text-center"
                                    aria-label="BFR"
                                    style={{ fontSize: "16px" }}
                                    name={`monitoring.${index}.bfr`}
                                  />
                                </td>
                                <td style={{ padding: "2px 1px" }}>
                                  <input
                                    type="text"
                                    className="form-control form-control-sm text-center"
                                    aria-label="DFR"
                                    style={{ fontSize: "16px" }}
                                    name={`monitoring.${index}.dfr`}
                                  />
                                </td>
                                <td style={{ padding: "2px 1px" }}>
                                  <input
                                    type="text"
                                    className="form-control form-control-sm text-center"
                                    aria-label="UFR"
                                    style={{ fontSize: "16px" }}
                                    name={`monitoring.${index}.ufr`}
                                  />
                                </td>
                                <td style={{ padding: "2px 1px" }}>
                                  <input
                                    type="text"
                                    className="form-control form-control-sm text-center"
                                    aria-label="Total UF"
                                    style={{ fontSize: "16px" }}
                                    name={`monitoring.${index}.totalUf`}
                                  />
                                </td>
                                <td style={{ padding: "2px 1px" }}>
                                  <input
                                    type="text"
                                    className="form-control form-control-sm text-center"
                                    aria-label="Temperature"
                                    style={{ fontSize: "16px" }}
                                    name={`monitoring.${index}.temperature`}
                                  />
                                </td>
                                <td style={{ padding: "2px 1px" }}>
                                  <input
                                    type="text"
                                    className="form-control form-control-sm text-center"
                                    aria-label="DyNa"
                                    style={{ fontSize: "16px" }}
                                    name={`monitoring.${index}.dyna`}
                                  />
                                </td>
                                <td style={{ padding: "2px 1px" }}>
                                  <input
                                    type="text"
                                    className="form-control form-control-sm text-center"
                                    aria-label="Heparin"
                                    style={{ fontSize: "16px" }}
                                    name={`monitoring.${index}.heparin`}
                                  />
                                </td>
                                <td style={{ padding: "2px 1px" }}>
                                  <input
                                    type="text"
                                    className="form-control form-control-sm text-center"
                                    aria-label="RBS"
                                    style={{ fontSize: "16px" }}
                                    name={`monitoring.${index}.rbs`}
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Post Dialysis Assessment */}
                  <div ref={sectionRefs["post-dialysis-assessment"]} id="post-dialysis-assessment" className="mb-4">
                    <h5 className="fw-bold mb-3">Post Dialysis Assessment</h5>
                    <div className="border rounded p-3">
                      <div className="row g-2">
                        {/* Row 1: Pulse, BP, Body Temp (labels above inputs) */}
                        <div className="col-md-2 col-12">
                          <label className="form-label mb-1 fw-medium">Pulse</label>
                          <input name="post.pulse" type="text" className="form-control form-control-sm" />
                        </div>
                        <div className="col-md-2 col-12">
                          <label className="form-label mb-1 fw-medium">BP</label>
                          <input name="post.bp" type="text" className="form-control form-control-sm" />
                        </div>
                        <div className="col-md-2 col-12">
                          <label className="form-label mb-1 fw-medium">Body Temperature</label>
                          <input
                            name="post.bodyTemperature"
                            type="text"
                            className="form-control form-control-sm"
                          />
                        </div>

                        {/* Row 2: Post HD Weight (2 boxes), UF Removed */}
                        <div className="col-md-2 col-12">
                          <label className="form-label mb-1 fw-medium">Post HD Weight</label>
                          <div className="d-flex gap-2">
                            <input
                              name="post.postHdWeight1"
                              type="text"
                              className="form-control form-control-sm"
                            />

                          </div>
                        </div>
                        <div className="col-md-3 col-12">
                          <label className="form-label mb-1 fw-medium">UF Removed</label>
                          <input name="post.ufRemoved" type="text" className="form-control form-control-sm" />
                        </div>

                        {/* Row 3: Prolonged bleeding (Yes / No radio), Bruit/Thrill, KT/V (same row) */}
                        <div className="col-md-3 col-12">
                          <label className="form-label mb-1 fw-medium">Prolonged Bleeding from Access Site</label>
                          <div className="d-flex flex-wrap gap-3">
                            <div className="form-check">
                              <input
                                className="form-check-input"
                                type="radio"
                                id="post-prolonged-yes"
                                name="post.prolongedBleeding"
                                value="Yes"
                              />
                              <label className="form-check-label" htmlFor="post-prolonged-yes" style={{ color: "#000" }}>
                                Yes
                              </label>
                            </div>
                            <div className="form-check">
                              <input
                                className="form-check-input"
                                type="radio"
                                id="post-prolonged-no"
                                name="post.prolongedBleeding"
                                value="No"
                              />
                              <label className="form-check-label" htmlFor="post-prolonged-no" style={{ color: "#000" }}>
                                No
                              </label>
                            </div>
                          </div>
                        </div>

                        {/* Bruit/Thrill (checkboxes like General Info) */}
                        <div className="col-md-3 col-12">
                          <label className="form-label mb-1 fw-medium">Bruit/Thrill (AVF/AVG)</label>
                          <div className="d-flex flex-wrap gap-3">
                            <div className="form-check m-0">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                id="post-bruit-present"
                                name="post.bruitThrillPresent"
                              />
                              <label className="form-check-label" htmlFor="post-bruit-present" style={{ color: "#000" }}>
                                Present
                              </label>
                            </div>
                            <div className="form-check m-0">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                id="post-bruit-absent"
                                name="post.bruitThrillAbsent"
                              />
                              <label className="form-check-label" htmlFor="post-bruit-absent" style={{ color: "#000" }}>
                                Absent
                              </label>
                            </div>
                            <div className="form-check m-0">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                id="post-bruit-na"
                                name="post.bruitThrillNotApplicable"
                              />
                              <label className="form-check-label" htmlFor="post-bruit-na" style={{ color: "#000" }}>
                                Not Applicable
                              </label>
                            </div>
                          </div>
                        </div>

                        {/* KT/V Achieved */}
                        <div className="col-md-3 col-12">
                          <label className="form-label mb-1 fw-medium">KT / V Achieved</label>
                          <input
                            name="post.ktVAchieved"
                            type="text"
                            className="form-control form-control-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Complications During Dialysis */}
                  <div
                    ref={sectionRefs["complications-during-dialysis"]}
                    id="complications-during-dialysis"
                    className="mb-4"
                  >
                    <h5 className="fw-bold mb-3">Complications During Dialysis</h5>
                    <div className="border rounded p-3">
                      <div className="row g-2">
                        {/* All as checkboxes */}
                        <div className="col-md-3 col-12">
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id="comp-hypotension"
                              name="comp.hypotension"
                            />
                            <label className="form-check-label" htmlFor="comp-hypotension" style={{ color: "#000" }}>
                              Hypotension
                            </label>
                          </div>
                        </div>
                        <div className="col-md-3 col-12">
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id="comp-fever"
                              name="comp.fever"
                            />
                            <label className="form-check-label" htmlFor="comp-fever" style={{ color: "#000" }}>
                              Fever
                            </label>
                          </div>
                        </div>
                        <div className="col-md-3 col-12">
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id="comp-headache"
                              name="comp.headache"
                            />
                            <label className="form-check-label" htmlFor="comp-headache" style={{ color: "#000" }}>
                              Headache
                            </label>
                          </div>
                        </div>

                        <div className="col-md-3 col-12">
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id="comp-rigor"
                              name="comp.rigor"
                            />
                            <label className="form-check-label" htmlFor="comp-rigor" style={{ color: "#000" }}>
                              Rigor
                            </label>
                          </div>
                        </div>
                        <div className="col-md-3 col-12">
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id="comp-cramps"
                              name="comp.cramps"
                            />
                            <label className="form-check-label" htmlFor="comp-cramps" style={{ color: "#000" }}>
                              Cramps
                            </label>
                          </div>
                        </div>
                        <div className="col-md-3 col-12">
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id="comp-rash"
                              name="comp.rash"
                            />
                            <label className="form-check-label" htmlFor="comp-rash" style={{ color: "#000" }}>
                              Rash
                            </label>
                          </div>
                        </div>

                        <div className="col-md-3 col-12">
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id="comp-vomiting"
                              name="comp.vomiting"
                            />
                            <label className="form-check-label" htmlFor="comp-vomiting" style={{ color: "#000" }}>
                              Vomiting
                            </label>
                          </div>
                        </div>
                        <div className="col-md-3 col-12">
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id="comp-chest-pain"
                              name="comp.chestPain"
                            />
                            <label className="form-check-label" htmlFor="comp-chest-pain" style={{ color: "#000" }}>
                              Chest Pain
                            </label>
                          </div>
                        </div>
                        <div className="col-md-3 col-12">
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id="comp-dyspnea"
                              name="comp.dyspnea"
                            />
                            <label className="form-check-label" htmlFor="comp-dyspnea" style={{ color: "#000" }}>
                              Dyspnea
                            </label>
                          </div>
                        </div>

                        <div className="col-md-3 col-12">
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id="comp-pruritus"
                              name="comp.pruritus"
                            />
                            <label className="form-check-label" htmlFor="comp-pruritus" style={{ color: "#000" }}>
                              Pruritus
                            </label>
                          </div>
                        </div>
                        <div className="col-md-3 col-12">
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id="comp-dialyzer-reaction"
                              name="comp.dialyzerReaction"
                            />
                            <label
                              className="form-check-label"
                              htmlFor="comp-dialyzer-reaction"
                              style={{ color: "#000" }}
                            >
                              Dialyzer Reaction
                            </label>
                          </div>
                        </div>
                        <div className="col-md-3 col-12">
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id="comp-seizures"
                              name="comp.seizures"
                            />
                            <label className="form-check-label" htmlFor="comp-seizures" style={{ color: "#000" }}>
                              Seizures
                            </label>
                          </div>
                        </div>
                        <div className="col-md-3 col-12">
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id="comp-no-complication"
                              name="comp.noComplication"
                            />
                            <label className="form-check-label" htmlFor="comp-no-complication" style={{ color: "#000" }}>
                              No Complication
                            </label>
                          </div>
                        </div>
                        <div className="col-md-3 col-12">
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id="comp-form-sibring"
                              name="comp.formSibring"
                            />
                            <label className="form-check-label" htmlFor="comp-form-sibring" style={{ color: "#000" }}>
                              Sibring
                            </label>
                          </div>
                        </div>
                        <div className="col-md-3 col-12">
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id="comp-hypoglycemia"
                              name="comp.hypoglycemia"
                            />
                            <label className="form-check-label" htmlFor="comp-hypoglycemia" style={{ color: "#000" }}>
                              Hypoglycemia
                            </label>
                          </div>
                        </div>
                        <div className="col-md-3 col-12">
                          <div className="form-check">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id="comp-hypertension"
                              name="comp.hypertension"
                            />
                            <label className="form-check-label" htmlFor="comp-hypertension" style={{ color: "#000" }}>
                              Hypertension
                            </label>
                          </div>
                        </div>

                        <div className="col-12 mt-2">
                          <label className="form-label mb-1 fw-medium">Other Complications During Dialysis</label>
                          <textarea
                            name="comp.other"
                            className="form-control"
                            rows={3}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Treatment Given */}
                  <div ref={sectionRefs["treatment-given"]} id="treatment-given" className="mb-4">
                    <h5 className="fw-bold mb-3">Treatment Given</h5>
                    <div className="border rounded p-3">
                      <div className="row g-2">
                        {/* Row 1 – EPO + IV Iron (same row) */}
                        <div className="col-md-4 col-12">
                          <label className="form-label mb-1 fw-medium">EPO Dosage</label>
                          <input
                            name="treat.epoDosage"
                            type="text"
                            className="form-control form-control-sm"
                          />
                        </div>
                        <div className="col-md-4 col-12">
                          <label className="form-label mb-1 fw-medium">EPO Given By</label>
                          <input
                            name="treat.epoGivenBy"
                            type="text"
                            className="form-control form-control-sm"
                          />
                        </div>
                        <div className="col-md-4 col-12">
                          <label className="form-label mb-1 fw-medium">IV Iron Dose</label>
                          <input
                            name="treat.ivIronDose"
                            type="text"
                            className="form-control form-control-sm"
                          />
                        </div>

                        {/* Row 2 */}
                        <div className="col-md-2 col-12">
                          <label className="form-label mb-1 fw-medium">Blood Transfusion</label>
                          <div className="d-flex flex-wrap gap-3">
                            <div className="form-check">
                              <input
                                className="form-check-input"
                                type="radio"
                                id="treat-bt-yes"
                                name="treat.bloodTransfusion"
                                value="Yes"
                              />
                              <label className="form-check-label" htmlFor="treat-bt-yes" style={{ color: "#000" }}>
                                Yes
                              </label>
                            </div>
                            <div className="form-check">
                              <input
                                className="form-check-input"
                                type="radio"
                                id="treat-bt-no"
                                name="treat.bloodTransfusion"
                                value="No"
                              />
                              <label className="form-check-label" htmlFor="treat-bt-no" style={{ color: "#000" }}>
                                No
                              </label>
                            </div>
                          </div>
                        </div>
                        <div className="col-md-3 col-12">
                          <label className="form-label mb-1 fw-medium">Number of Unit</label>
                          <input
                            name="treat.numberOfUnits"
                            type="text"
                            className="form-control form-control-sm"
                          />
                        </div>


                        <div className="col-md-4 col-12">
                          <label className="form-label mb-1 fw-medium">Blood Bank Name</label>
                          <input
                            name="treat.bloodBankName"
                            type="text"
                            className="form-control form-control-sm"
                          />
                        </div>

                        {/* Row 4 */}
                        <div className="col-md-3 col-12">
                          <label className="form-label mb-1 fw-medium">Type of Blood</label>
                          <input
                            name="treat.typeOfBlood"
                            type="text"
                            className="form-control form-control-sm"
                          />
                        </div>

                        {/* Other Treatment */}
                        <div className="col-12 mt-2">
                          <label className="form-label mb-1 fw-bold">Other Treatment Given Drug</label>
                          <textarea
                            name="treat.otherTreatmentGivenDrug"
                            className="form-control"
                            rows={4}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
                <div className="card-footer d-flex align-items-center justify-content-end gap-2 bg-white border-top dialysis-no-print">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={handlePrint}
                  >
                    <i className="feather-printer me-1" />
                    Print
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary dialysis-save-btn"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Saving..." : "Save Dialysis Details"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const DialysisAppointmentPage = () => {
  return (
    <React.Suspense fallback={null}>
      <DialysisAppointmentContent />
    </React.Suspense>
  );
};

export default DialysisAppointmentPage;

