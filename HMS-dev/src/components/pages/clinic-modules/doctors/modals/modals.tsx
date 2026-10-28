"use client";


import ImageWithBasePath from "@/core/imageWithBasePath";
import { all_routes } from "../../../../../routes/all_routes";
import {
  Appointment_Type,
  Blood_Group,
  City,
  Country,
  Department,
  findDepartmentOption,
  Designation,
  Gender,
  State,
  Location,
  Recures_Every,
  Session,
  Sessions,
  Queue_Sort_By,
} from "@/core/common/selectOption";
import CommonSelect, { Option } from "@/core/common/common-select/commonSelect";
import { DatePicker } from "antd";
import { useState, useEffect, useCallback, useMemo } from "react";
import TagInput from "@/core/common/Taginput";
import DuplicateForms from "@/core/common/duplicate-forms/duplicateForms";
import EducationForms from "@/core/common/duplicate-forms/educationForm";
import RewardsForms from "@/core/common/duplicate-forms/rewardsForm";
import CommonTimePicker from "@/core/common/common-time-pickers/CommonTimePicker";
import Link from "next/link";
import axios from "axios";
import { API_BASE_URL } from "@/environment";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import Select from "react-select";
import IndianPhoneInput from "@/core/common/indianPhoneInput/IndianPhoneInput";
import {
  formatPatientPhoneForApi,
  validateIndianMobilePhone,
} from "@/core/utils/formatPatientPhoneForApi";
import { uploadFileToS3 } from "@/core/utils/uploadFileToS3";
import { broadcastDoctorUpdate } from "@/core/utils/doctorUpdateEvent";
import IpdPatientCompactUpload from "@/components/pages/clinic-modules/ipd-appointments/IpdPatientCompactUpload";
import DialysisSlotsField, {
  type IDialysisSlotForm,
  getDialysisSlotsValidationMessage,
  mapDialysisSlotsFromApi,
  mapDialysisSlotsToApi,
} from "@/components/pages/clinic-modules/doctors/dialysisSlotsField";

interface ISlot {
  session: string;
  startTime: string;
  endTime: string;
}

interface IDaySchedule {
  dayOfWeek: string;
  mr?: boolean;
  slots: ISlot[];
}

interface IScheduleData {
  weeklySchedule: IDaySchedule[];
  mrMaxVisitsPerDay?: number;
}

interface IDoctorInfo {
  _id: string;
  doctorId: string;
  name: string;
  department: string;
  designation: string;
  imageUrl?: string;
}

// Schedule Form Component with state management
const ScheduleForm = ({ 
  slots, 
  onSlotsChange,
  dayName
}: { 
  slots: ISlot[]; 
  onSlotsChange: (slots: ISlot[]) => void;
  dayName: string;
}) => {
  // Reset empty slot state when dayName changes (day switch)
  const [emptySlotState, setEmptySlotState] = useState<ISlot>({ session: Session[0]?.value || "", startTime: "", endTime: "" });
  const [formKey, setFormKey] = useState(0);

  // Reset empty slot state and force remount whenever dayName changes
  useEffect(() => {
    console.log(`ScheduleForm for ${dayName}: slots =`, slots, `slots.length =`, slots.length);
    setEmptySlotState({ session: Session[0]?.value || "", startTime: "", endTime: "" });
    setFormKey(prev => prev + 1);
  }, [dayName]); // Only depend on dayName, not slots array

  // Reset when slots array becomes empty
  useEffect(() => {
    if (slots.length === 0) {
      console.log(`ScheduleForm ${dayName}: slots became empty, resetting formKey`);
      setEmptySlotState({ session: Session[0]?.value || "", startTime: "", endTime: "" });
      setFormKey(prev => prev + 1);
    }
  }, [slots.length, dayName]);

  const handleAddSlot = () => {
    onSlotsChange([...slots, { session: Session[0]?.value || "", startTime: "", endTime: "" }]);
  };

  const handleDeleteSlot = (index: number) => {
    const newSlots = slots.filter((_, i) => i !== index);
    onSlotsChange(newSlots);
  };

  const handleSlotChange = (index: number, field: keyof ISlot, value: string) => {
    const newSlots = [...slots];
    newSlots[index] = { ...newSlots[index], [field]: value };
    onSlotsChange(newSlots);
  };

  // If no slots exist for this day, show empty form with fresh state
  if (slots.length === 0) {
    return (
      <div key={`empty-form-${dayName}-${formKey}`}>
        <div className="row gx-3 mb-3">
          <div className="col-lg-5">
            <div className="mb-3">
              <label className="form-label">Session</label>
              <CommonSelect
                key={`session-select-${dayName}-empty-${formKey}`}
                instanceId={`session-select-${dayName}-empty-${formKey}`}
                options={Session}
                className="select"
                defaultValue={Session[0]}
                value={Session[0]}
                onChange={(option) => {
                  if (option) {
                    const newSlot = { session: option.value, startTime: "", endTime: "" };
                    onSlotsChange([newSlot]);
                  }
                }}
              />
            </div>
          </div>
          <div className="col-lg-7">
            <div className="row align-items-end gx-3">
              <div className="col-lg-9">
                <div className="row gx-3">
                  <div className="col-lg-6">
                    <div className="mb-3">
                      <label className="form-label">From</label>
                      <div className="input-icon-end position-relative">
                        <CommonTimePicker 
                          key={`from-time-${dayName}-${formKey}`}
                          value={undefined}
                          onChange={(time) => {
                            const timeStr = time ? time.format("HH:mm") : "";
                            const newSlot = { session: Session[0]?.value || "", startTime: timeStr, endTime: "" };
                            onSlotsChange([newSlot]);
                          }}
                        />
                        <span className="input-icon-addon">
                          <i className="ti ti-clock-hour-10" />
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="col-lg-6">
                    <div className="mb-3">
                      <label className="form-label">To</label>
                      <div className="input-icon-end position-relative">
                        <CommonTimePicker 
                          key={`to-time-${dayName}-${formKey}`}
                          value={undefined}
                          onChange={(time) => {
                            const timeStr = time ? time.format("HH:mm") : "";
                            // Get current slot or create new one
                            const currentSlot = slots.length > 0 ? slots[0] : { session: Session[0]?.value || "", startTime: "", endTime: "" };
                            const newSlot = { ...currentSlot, endTime: timeStr };
                            onSlotsChange([newSlot]);
                          }}
                        />
                        <span className="input-icon-addon">
                          <i className="ti ti-clock-hour-10" />
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-lg-3">
                <div className="mb-3 d-flex">
                  <Link
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      handleAddSlot();
                    }}
                    className="add-schedule-btn p-2 bg-light btn-icon text-dark rounded d-flex align-items-center justify-content-center"
                    style={{ marginRight: 8 }}
                  >
                    <i className="ti ti-plus fs-16" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div key={`slots-${dayName}-${slots.length}`}>
      {slots.map((slot, index) => {
        const sessionOption = Session.find(s => 
          s.value.toLowerCase() === slot.session.toLowerCase()
        ) || Session[0];

        return (
          <div className="row gx-3 mb-3" key={`${dayName}-slot-${index}-${slot.session}-${slot.startTime}-${slot.endTime}`}>
            <div className="col-lg-5">
              <div className="mb-3">
                <label className="form-label">Session</label>
                <CommonSelect
                  key={`${dayName}-session-${index}-${slot.session}`}
                  instanceId={`${dayName}-session-${index}`}
                  options={Session}
                  className="select"
                  value={sessionOption}
                  onChange={(option) => {
                    if (option) {
                      handleSlotChange(index, "session", option.value);
                    }
                  }}
                />
              </div>
            </div>
            <div className="col-lg-7">
              <div className="row align-items-end gx-3">
                <div className="col-lg-9">
                  <div className="row gx-3">
                    <div className="col-lg-6">
                      <div className="mb-3">
                        <label className="form-label">From</label>
                        <div className="input-icon-end position-relative">
                          <CommonTimePicker 
                            value={slot.startTime ? dayjs(slot.startTime, "HH:mm") : null}
                            onChange={(time) => {
                              const timeStr = time ? time.format("HH:mm") : "";
                              handleSlotChange(index, "startTime", timeStr);
                            }}
                          />
                          <span className="input-icon-addon">
                            <i className="ti ti-clock-hour-10" />
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="col-lg-6">
                      <div className="mb-3">
                        <label className="form-label">To</label>
                        <div className="input-icon-end position-relative">
                          <CommonTimePicker 
                            value={slot.endTime ? dayjs(slot.endTime, "HH:mm") : null}
                            onChange={(time) => {
                              const timeStr = time ? time.format("HH:mm") : "";
                              handleSlotChange(index, "endTime", timeStr);
                            }}
                          />
                          <span className="input-icon-addon">
                            <i className="ti ti-clock-hour-10" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-lg-3">
                  <div className="mb-3 d-flex">
                    <Link
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        handleAddSlot();
                      }}
                      className="add-schedule-btn p-2 bg-light btn-icon text-dark rounded d-flex align-items-center justify-content-center"
                      style={{ marginRight: 8 }}
                    >
                      <i className="ti ti-plus fs-16" />
                    </Link>
                    {slots.length > 1 && (
                      <Link
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          handleDeleteSlot(index);
                        }}
                        className="remove-schedule-btn p-2 bg-soft-danger btn-icon text-danger rounded d-flex align-items-center justify-content-center"
                      >
                        <i className="ti ti-trash fs-16" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const Modals = ({ onDoctorUpdated }: { onDoctorUpdated?: (doctor: any) => void } = {}) => {
  const router = useRouter();
  const getModalContainer = () => {
    const modalElement = document.getElementById("modal-datepicker");
    return modalElement ? modalElement : document.body; // Fallback to document.body if modalElement is null
  };

  const [tags, setTags] = useState<string[]>(["English", "French"]);
  const handleTagsChange = (newTags: string[]) => {
    setTags(newTags);
  };

  // Schedule modal state
  const [scheduleDoctorId, setScheduleDoctorId] = useState<string | null>(null);
  const [scheduleData, setScheduleData] = useState<IScheduleData | null>(null);
  const [doctorInfo, setDoctorInfo] = useState<IDoctorInfo | null>(null);
  const [scheduleLoading, setScheduleLoading] = useState<boolean>(false);
  const [scheduleMessage, setScheduleMessage] = useState<{ type: 'success' | 'error' | null; text: string }>({ type: null, text: '' });
  const [activeScheduleTab, setActiveScheduleTab] = useState<string>("Monday");
  const [mrMaxVisitsPerDay, setMrMaxVisitsPerDay] = useState<string>("");
  
  // Schedule form state for each day
  const [mondaySlots, setMondaySlots] = useState<ISlot[]>([]);
  const [tuesdaySlots, setTuesdaySlots] = useState<ISlot[]>([]);
  const [wednesdaySlots, setWednesdaySlots] = useState<ISlot[]>([]);
  const [thursdaySlots, setThursdaySlots] = useState<ISlot[]>([]);
  const [fridaySlots, setFridaySlots] = useState<ISlot[]>([]);
  const [saturdaySlots, setSaturdaySlots] = useState<ISlot[]>([]);
  const [sundaySlots, setSundaySlots] = useState<ISlot[]>([]);
  const [mondayMr, setMondayMr] = useState<boolean>(false);
  const [tuesdayMr, setTuesdayMr] = useState<boolean>(false);
  const [wednesdayMr, setWednesdayMr] = useState<boolean>(false);
  const [thursdayMr, setThursdayMr] = useState<boolean>(false);
  const [fridayMr, setFridayMr] = useState<boolean>(false);
  const [saturdayMr, setSaturdayMr] = useState<boolean>(false);
  const [sundayMr, setSundayMr] = useState<boolean>(false);

  const fetchDoctorInfoForSchedule = useCallback(async (id: string) => {
    try {
      if (!API_BASE_URL) {
        console.error("API_BASE_URL is undefined. Check .env.local file.");
        return;
      }

      setScheduleLoading(true);
      
      // Fetch doctor info
      const doctorResponse = await axios.get(`${API_BASE_URL}/hospital/doctors/${id}`);
      if (doctorResponse.data?.code === 200 && doctorResponse.data?.data?.doctor) {
        const doctor = doctorResponse.data.data.doctor;
        setDoctorInfo({
          _id: doctor._id,
          doctorId: doctor.doctorId || doctor._id,
          name: doctor.name || "",
          department: doctor.department || "",
          designation: doctor.designation || "",
          imageUrl: doctor.imageUrl,
        });

        // Populate schedule from doctor's weeklySchedule using dayOfWeek field
        // First, reset all days to empty
        setMondaySlots([]);
        setTuesdaySlots([]);
        setWednesdaySlots([]);
        setThursdaySlots([]);
        setFridaySlots([]);
        setSaturdaySlots([]);
        setSundaySlots([]);
        setMondayMr(false);
        setTuesdayMr(false);
        setWednesdayMr(false);
        setThursdayMr(false);
        setFridayMr(false);
        setSaturdayMr(false);
        setSundayMr(false);

        if (typeof doctor.mrMaxVisitsPerDay === "number") {
          setMrMaxVisitsPerDay(String(doctor.mrMaxVisitsPerDay));
        } else {
          setMrMaxVisitsPerDay("");
        }

        if (doctor.weeklySchedule && Array.isArray(doctor.weeklySchedule)) {
          // Map schedules by dayOfWeek from API response
          doctor.weeklySchedule.forEach((daySchedule: IDaySchedule) => {
            const dayOfWeek = daySchedule.dayOfWeek;
            if (!dayOfWeek || !daySchedule.slots || !Array.isArray(daySchedule.slots)) {
              return;
            }

            const slots = daySchedule.slots.map(slot => ({
              session: slot.session || "",
              startTime: slot.startTime || "",
              endTime: slot.endTime || "",
            }));

            // Set slots only for the specific day from dayOfWeek
            const mrFlag = (daySchedule as any).mr === true;
            switch (dayOfWeek) {
              case "Monday":
                setMondaySlots(slots);
                setMondayMr(mrFlag);
                break;
              case "Tuesday":
                setTuesdaySlots(slots);
                setTuesdayMr(mrFlag);
                break;
              case "Wednesday":
                setWednesdaySlots(slots);
                setWednesdayMr(mrFlag);
                break;
              case "Thursday":
                setThursdaySlots(slots);
                setThursdayMr(mrFlag);
                break;
              case "Friday":
                setFridaySlots(slots);
                setFridayMr(mrFlag);
                break;
              case "Saturday":
                setSaturdaySlots(slots);
                setSaturdayMr(mrFlag);
                break;
              case "Sunday":
                setSundaySlots(slots);
                setSundayMr(mrFlag);
                break;
            }
          });
        }
      }
    } catch (error: any) {
      console.error("Error fetching doctor info:", error);
    } finally {
      setScheduleLoading(false);
    }
  }, []);

  // Listen for schedule modal open and tab changes
  useEffect(() => {
    const scheduleModal = document.getElementById("schedule_details");
    if (!scheduleModal) return;

    // Track tab changes using Bootstrap's shown.bs.tab event
    const handleTabShown = (e: Event) => {
      const target = e.target as HTMLElement;
      const dayText = target.textContent?.trim();
      if (dayText && ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].includes(dayText)) {
        console.log("Tab switched to:", dayText);
        setActiveScheduleTab(dayText);
      }
    };

    // Listen for tab shown events
    const tabButtons = scheduleModal.querySelectorAll('[data-bs-toggle="pill"]');
    tabButtons.forEach(button => {
      button.addEventListener('shown.bs.tab', handleTabShown);
    });

    // Handle clicks on schedule buttons to load the correct doctor
    const handleScheduleClick = (e: Event) => {
      const target = e.target as HTMLElement;
      const link = target.closest('[data-bs-target="#schedule_details"][data-doctor-id]') as HTMLElement | null;
      if (!link) return;
      const foundDoctorId = link.getAttribute("data-doctor-id");
      if (!foundDoctorId) return;

      // Clear previous schedule/doctor data immediately so popup doesn't show stale info
      setScheduleLoading(true);
      setDoctorInfo(null);
      setMrMaxVisitsPerDay("");
      setMondaySlots([]);
      setTuesdaySlots([]);
      setWednesdaySlots([]);
      setThursdaySlots([]);
      setFridaySlots([]);
      setSaturdaySlots([]);
      setSundaySlots([]);
      setMondayMr(false);
      setTuesdayMr(false);
      setWednesdayMr(false);
      setThursdayMr(false);
      setFridayMr(false);
      setSaturdayMr(false);
      setSundayMr(false);
      setScheduleData(null);
      setScheduleDoctorId(foundDoctorId);
      setActiveScheduleTab("Monday"); // Reset to Monday when opening modal
      fetchDoctorInfoForSchedule(foundDoctorId);
    };

    document.addEventListener("click", handleScheduleClick, true);

    return () => {
      tabButtons.forEach(button => {
        button.removeEventListener('shown.bs.tab', handleTabShown);
      });
      document.removeEventListener("click", handleScheduleClick, true);
    };
  }, [fetchDoctorInfoForSchedule]);

  // Edit doctor form state
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [name, setName] = useState<string>("");
  const [phone, setPhone] = useState<string | undefined>();
  const [email, setEmail] = useState<string>("");
  const [dob, setDob] = useState<any>(undefined);
  const [gender, setGender] = useState<Option | null>(Gender[0] || null);
  const [bloodGroup, setBloodGroup] = useState<Option | null>(Blood_Group[0] || null);
  const [yearsOfExperience, setYearsOfExperience] = useState<string>("");
  const [department, setDepartment] = useState<Option | null>(null);
  const [designation, setDesignation] = useState<Option | null>(Designation[0] || null);
  const [medicalLicenseNo, setMedicalLicenseNo] = useState<string>("");
  const [opdNumber, setOpdNumber] = useState<string>("");
  const [maxAppointmentsPerSlot, setMaxAppointmentsPerSlot] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string>("");
  const [savedImageUrl, setSavedImageUrl] = useState<string>("");
  const [existingPosterUrl, setExistingPosterUrl] = useState<string>("");
  const [savedPosterUrl, setSavedPosterUrl] = useState<string>("");
  const [photoRemoved, setPhotoRemoved] = useState(false);
  const [posterRemoved, setPosterRemoved] = useState(false);
  const [sessions, setSessions] = useState<Option[]>([]);
  const [queueSortBy, setQueueSortBy] = useState<Option | null>(Queue_Sort_By[0] || null);
  const [dialysisSlots, setDialysisSlots] = useState<IDialysisSlotForm[]>([]);
  const [readableDoctorId, setReadableDoctorId] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [visitTypes, setVisitTypes] = useState([
    { type: "OPD", charge: "" },
    { type: "Emergency", charge: "" },
    { type: "Follow-up", charge: "" },
    { type: "Follow-up report", charge: "" },
    { type: "MR", charge: "" },
    { type: "Day Care", charge: "" },
    { type: "IPD", charge: "" },
  ]);

  // Reset form function
  const resetForm = () => {
    setName("");
    setPhone(undefined);
    setEmail("");
    setDob(undefined);
    setGender(Gender[0] || null);
    setBloodGroup(Blood_Group[0] || null);
    setYearsOfExperience("");
    setDepartment(null);
    setDesignation(Designation[0] || null);
    setMedicalLicenseNo("");
    setOpdNumber("");
    setMaxAppointmentsPerSlot("");
    setAddress("");
    setPhotoFile(null);
    setPosterFile(null);
    setExistingImageUrl("");
    setSavedImageUrl("");
    setExistingPosterUrl("");
    setSavedPosterUrl("");
    setPhotoRemoved(false);
    setPosterRemoved(false);
    setReadableDoctorId("");
    setSessions([]);
    setQueueSortBy(Queue_Sort_By[0] || null);
    setDialysisSlots([]);
    setVisitTypes([
      { type: "OPD", charge: "" },
      { type: "Emergency", charge: "" },
      { type: "Day Care", charge: "" },
      { type: "IPD", charge: "" },
      { type: "Follow-up", charge: "" },
      { type: "Follow-up report", charge: "" },
      { type: "MR", charge: "" },
    ]);
  };

  const fetchDoctorData = useCallback(async (id: string) => {
    try {
      if (!API_BASE_URL) {
        console.error("API_BASE_URL is undefined. Check .env.local file.");
        return;
      }

      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/hospital/doctors/${id}`);

      if (response.data?.code === 200 && response.data?.data?.doctor) {
        const doctor = response.data.data.doctor;
        setReadableDoctorId(doctor.doctorId || "");
        setName(doctor.name || "");
        setPhone(doctor.phone || undefined);
        setEmail(doctor.email || "");
        setDob(doctor.dob ? dayjs(doctor.dob) : undefined);
        setGender(Gender.find(g => g.value === doctor.gender) || Gender[0] || null);
        setBloodGroup(Blood_Group.find(bg => bg.value === doctor.bloodGroup) || Blood_Group[0] || null);
        setYearsOfExperience(doctor.yearsOfExperience?.toString() || "");
        setDepartment(findDepartmentOption(doctor.department));
        setDesignation(Designation.find(d => d.value === doctor.designation) || Designation[0] || null);
        setMedicalLicenseNo(doctor.medicalLicenseNo || "");
        setOpdNumber(doctor.opdNumber || "");
        setMaxAppointmentsPerSlot(doctor.maxAppointmentsPerSlot?.toString() || "");
        setQueueSortBy(
          Queue_Sort_By.find((option) => option.value === doctor.queueSortBy) || Queue_Sort_By[0] || null
        );
        setAddress(doctor.address || "");
        const imageUrl = doctor.imageUrl ?? "";
        const posterUrl = doctor.posterUrl ?? "";
        setExistingImageUrl(imageUrl);
        setSavedImageUrl(imageUrl);
        setExistingPosterUrl(posterUrl);
        setSavedPosterUrl(posterUrl);
        setPhotoRemoved(false);
        setPosterRemoved(false);
        setPhotoFile(null);
        setPosterFile(null);

        // Map sessions (backend may send "noon" or "Afternoon"; we use "Afternoon", capitalize others)
        if (doctor.sessions && Array.isArray(doctor.sessions)) {
          const mappedSessions = doctor.sessions
            .map((s: string) => {
              const lower = (s || "").toLowerCase();
              if (lower === "noon" || lower === "afternoon") return "Afternoon";
              return (s || "").charAt(0).toUpperCase() + (s || "").slice(1).toLowerCase();
            })
            .map((s: string) => Sessions.find(se => se.value === s))
            .filter(Boolean) as Option[];
          setSessions(mappedSessions);
        }

        // Map visit types (API may send visitType, appointmentType, charge or legacy type, charge)
        if (doctor.visitTypes && Array.isArray(doctor.visitTypes)) {
          const defaultVisitTypes = [
            { type: "OPD", charge: "" },
            { type: "Emergency", charge: "" },
            { type: "Follow-up", charge: "" },
            { type: "Follow-up report", charge: "" },
            { type: "MR", charge: "" },
            { type: "Day Care", charge: "" },
            { type: "IPD", charge: "" },
          ];
          const mappedVisitTypes = defaultVisitTypes.map(vt => {
            const found = doctor.visitTypes.find((v: any) => {
              if (v.visitType != null && v.appointmentType != null) {
                if (vt.type === "OPD") return v.visitType === "New" && v.appointmentType === "OPD";
                if (vt.type === "Day Care") return v.visitType === "New" && v.appointmentType === "Day Care";
                if (vt.type === "IPD") return v.visitType === "New" && v.appointmentType === "IPD";
                if (vt.type === "Follow-up report") return v.visitType === "Follow-up-report" && v.appointmentType === "OPD";
                return v.visitType === vt.type && v.appointmentType === "OPD";
              }
              return v.type === vt.type;
            });
            return found ? { type: vt.type, charge: found.charge?.toString() ?? "" } : vt;
          });
          setVisitTypes(mappedVisitTypes);
        }

        setDialysisSlots(mapDialysisSlotsFromApi(doctor.dialysisSlots));
      }
    } catch (error: any) {
      console.error("Error fetching doctor data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Listen for modal open/close to get doctorId and clear stale state
  useEffect(() => {
    const editModal = document.getElementById("edit_doctor");
    if (!editModal) return;

    const handleEditClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('[data-bs-target="#edit_doctor"]') as HTMLElement;
      if (link) {
        const doctorIdAttr = link.getAttribute("data-doctor-id");
        if (doctorIdAttr) {
          (editModal as any).dataset.doctorId = doctorIdAttr;
          (window as any).__currentEditDoctorId = doctorIdAttr;
        }
      }
    };

    const handleModalShow = (e: Event) => {
      let foundDoctorId: string | null = null;
      const ev = e as { relatedTarget?: HTMLElement };
      if (ev.relatedTarget) {
        const id = ev.relatedTarget.getAttribute?.("data-doctor-id");
        if (id) foundDoctorId = id;
      }
      if (!foundDoctorId) foundDoctorId = (window as any).__currentEditDoctorId || null;
      if (!foundDoctorId) foundDoctorId = (editModal as any).dataset?.doctorId || null;

      setDoctorId(null);
      resetForm();
      if (foundDoctorId) {
        setDoctorId(foundDoctorId);
        fetchDoctorData(foundDoctorId);
      }
    };

    const handleModalHidden = () => {
      (window as any).__currentEditDoctorId = null;
      delete (editModal as any).dataset?.doctorId;
      setDoctorId(null);
      resetForm();
    };

    document.addEventListener("click", handleEditClick, true);
    editModal.addEventListener("show.bs.offcanvas", handleModalShow);
    editModal.addEventListener("hidden.bs.offcanvas", handleModalHidden);
    return () => {
      document.removeEventListener("click", handleEditClick, true);
      editModal.removeEventListener("show.bs.offcanvas", handleModalShow);
      editModal.removeEventListener("hidden.bs.offcanvas", handleModalHidden);
    };
  }, [fetchDoctorData]);

  const handleVisitTypeChange = (index: number, charge: string) => {
    const updated = [...visitTypes];
    updated[index].charge = charge;
    setVisitTypes(updated);
  };

  const handleSaveSchedule = async () => {
    if (!scheduleDoctorId || !API_BASE_URL) {
      setScheduleMessage({ type: 'error', text: 'Doctor ID is missing. Please try again.' });
      setTimeout(() => setScheduleMessage({ type: null, text: '' }), 3000);
      return;
    }

    try {
      setScheduleLoading(true);
      setScheduleMessage({ type: null, text: '' });

      // Collect schedule data from state
      const weeklySchedule: IDaySchedule[] = [];
      
      const daySlots = [
        { day: "Monday", slots: mondaySlots, mr: mondayMr },
        { day: "Tuesday", slots: tuesdaySlots, mr: tuesdayMr },
        { day: "Wednesday", slots: wednesdaySlots, mr: wednesdayMr },
        { day: "Thursday", slots: thursdaySlots, mr: thursdayMr },
        { day: "Friday", slots: fridaySlots, mr: fridayMr },
        { day: "Saturday", slots: saturdaySlots, mr: saturdayMr },
        { day: "Sunday", slots: sundaySlots, mr: sundayMr },
      ];

      daySlots.forEach(({ day, slots, mr }) => {
        // Filter out empty slots
        const validSlots = slots.filter(slot => 
          slot.session && slot.startTime && slot.endTime
        );
        
        if (validSlots.length > 0) {
          weeklySchedule.push({
            dayOfWeek: day,
            mr: !!mr,
            slots: validSlots,
          });
        }
      });

      const schedulePayload: IScheduleData = {
        weeklySchedule,
        mrMaxVisitsPerDay: mrMaxVisitsPerDay ? Number(mrMaxVisitsPerDay) : undefined,
      };

      console.log("Saving schedule:", schedulePayload);

      const response = await axios.put(
        `${API_BASE_URL}/hospital/doctors/${scheduleDoctorId}/schedule`,
        schedulePayload
      );

      if (response.data?.code === 200 || (response.status >= 200 && response.status < 300)) {
        setScheduleMessage({ type: 'success', text: 'Schedule saved successfully!' });
        setTimeout(() => {
          setScheduleMessage({ type: null, text: '' });
          // Close modal
          const modal = document.getElementById("schedule_details");
          if (modal) {
            const bsModal = (window as any).bootstrap?.Modal?.getInstance(modal);
            if (bsModal) {
              bsModal.hide();
            }
          }
        }, 1500);
      } else {
        setScheduleMessage({ type: 'error', text: 'Failed to save schedule. Please try again.' });
        setTimeout(() => setScheduleMessage({ type: null, text: '' }), 3000);
      }
    } catch (error: any) {
      console.error("Error saving schedule:", error);
      const errorMessage = error.response?.data?.message || "An error occurred while saving the schedule.";
      setScheduleMessage({ type: 'error', text: errorMessage });
      setTimeout(() => setScheduleMessage({ type: null, text: '' }), 3000);
    } finally {
      setScheduleLoading(false);
    }
  };

  const formatDob = (): string => {
    if (!dob) return "";
    if (dayjs.isDayjs(dob)) {
      return dob.format("YYYY-MM-DD");
    }
    if (typeof dob === 'string' || dob instanceof Date) {
      return dayjs(dob).format("YYYY-MM-DD");
    }
    return "";
  };

  const getDobValue = () => {
    if (!dob) return undefined;
    if (dayjs.isDayjs(dob)) {
      return dob;
    }
    if (typeof dob === 'string' || dob instanceof Date) {
      const parsed = dayjs(dob);
      return parsed.isValid() ? parsed : undefined;
    }
    return undefined;
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!doctorId) {
      console.error("Doctor ID is missing");
      return;
    }

    const phoneValidation = validateIndianMobilePhone(phone);
    if (!phoneValidation.valid) {
      alert(phoneValidation.message);
      return;
    }

    const dialysisSlotsError = getDialysisSlotsValidationMessage(dialysisSlots);
    if (dialysisSlotsError) {
      alert(dialysisSlotsError);
      return;
    }

    try {
      if (!API_BASE_URL) {
        console.error("API_BASE_URL is undefined. Check .env.local file.");
        return;
      }

      setLoading(true);

      // Map visit types to API shape: visitType, appointmentType, charge
      // OPD, Day Care, IPD → visitType "New"; others (Emergency, Follow-up, Follow-up-report, MR) → appointmentType "OPD"
      const visitTypesData = visitTypes
        .filter(vt => vt.charge && vt.charge.trim() !== "")
        .map(vt => {
          const charge = parseFloat(vt.charge) || 0;
          if (vt.type === "OPD") return { visitType: "New", appointmentType: "OPD", charge };
          if (vt.type === "Day Care") return { visitType: "New", appointmentType: "Day Care", charge };
          if (vt.type === "IPD") return { visitType: "New", appointmentType: "IPD", charge };
          if (vt.type === "Follow-up report") return { visitType: "Follow-up-report", appointmentType: "OPD", charge };
          return { visitType: vt.type, appointmentType: "OPD", charge };
        });

      const sessionsData = sessions
        .filter(s => s.value && s.value !== "Select")
        .map(s => s.value);

      const doctorData: Record<string, unknown> = {
        name: name,
        email: email || undefined,
        phone: formatPatientPhoneForApi(phone),
        dob: formatDob(),
        yearsOfExperience: parseInt(yearsOfExperience) || 0,
        department: department?.value !== "Select" ? department?.value : "",
        designation: designation?.value !== "Select" ? designation?.value : "",
        medicalLicenseNo: medicalLicenseNo,
        opdNumber: opdNumber.trim(),
        gender: gender?.value !== "Select" ? gender?.value : "",
        bloodGroup: bloodGroup?.value !== "Select" ? bloodGroup?.value : undefined,
        address: address || undefined,
        visitTypes: visitTypesData,
        sessions: sessionsData.length > 0 ? sessionsData : undefined,
        maxAppointmentsPerSlot: parseInt(maxAppointmentsPerSlot) || undefined,
        queueSortBy: queueSortBy?.value === "time" ? "time" : "token",
        dialysisSlots: mapDialysisSlotsToApi(dialysisSlots),
      };

      if (photoFile) {
        try {
          const uploadedImageUrl = await uploadFileToS3(photoFile, "doctors_profile");
          doctorData.imageUrl = uploadedImageUrl?.trim();
        } catch (uploadErr) {
          console.warn("Photo upload warning, proceeding with doctor update:", uploadErr);
        }
      } else if (photoRemoved && savedImageUrl.trim()) {
        doctorData.imageUrl = "";
      }

      if (posterFile) {
        try {
          const uploadedPosterUrl = await uploadFileToS3(posterFile, "doctors_posters");
          doctorData.posterUrl = uploadedPosterUrl?.trim();
        } catch (uploadErr) {
          console.warn("Poster upload warning, proceeding with doctor update:", uploadErr);
        }
      } else if (posterRemoved && savedPosterUrl.trim()) {
        doctorData.posterUrl = "";
      }

      const response = await axios.patch(`${API_BASE_URL}/hospital/doctors/${doctorId}`, doctorData);
      const isSuccess = response.status >= 200 && response.status < 300;
      const hasSuccessCode = response.data?.code === 200;

      if (isSuccess || hasSuccessCode) {
        // Broadcast doctor update to Redux store and window event so all pages re-render without full page reload
        const effectiveDoctorId = readableDoctorId || doctorId;
        broadcastDoctorUpdate({
          doctorId: effectiveDoctorId,
          imageUrl: (doctorData.imageUrl as string) || "",
          doctorData: { ...doctorData, _id: doctorId, doctorId: effectiveDoctorId },
        });

        onDoctorUpdated?.({ ...doctorData, _id: doctorId, doctorId: effectiveDoctorId });

        // Close offcanvas modal
        const modalElement = document.getElementById("edit_doctor");
        if (modalElement) {
          const bsModal = (window as any).bootstrap?.Offcanvas?.getInstance(modalElement);
          bsModal?.hide();
        }
      } else {
        const errorMsg = response.data?.message || "Failed to update doctor";
        alert(errorMsg);
      }
    } catch (error: any) {
      console.error("Error updating doctor:", error);
      console.error("Error details:", error.response?.data);
      const errorMsg =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "Failed to update doctor. Please check required fields.";
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Start Add Doctor */}
      <div
        className="offcanvas offcanvas-offset offcanvas-end offcanvas-large"
        tabIndex={-1}
        id="add_doctor"
      >
        <div className="offcanvas-header d-block pb-0 px-0">
          <div className="border-bottom d-flex align-items-center justify-content-between pb-3 px-3">
            <h5 className="offcanvas-title fs-18 fw-bold">New Doctor</h5>
            <button
              type="button"
              className="btn-close custom-btn-close opacity-100"
              data-bs-dismiss="offcanvas"
              aria-label="Close"
            >
              <i className="ti ti-x fs-16 text-dark" />
            </button>
          </div>
        </div>
        <div className="offcanvas-body p-0">
          <form>
            <div className="bg-light px-3 py-2">
              <h6 className="fw-bold mb-0">Contact Information</h6>
            </div>
            <div className="p-3 pb-0">
              {/* start row*/}
              <div className="row">
                <div className="col-lg-12">
                  <div className="mb-3 d-flex align-items-center">
                    <label className="form-label">Profile Image</label>
                    <div className="drag-upload-btn avatar avatar-xxl rounded-circle bg-light text-muted position-relative overflow-hidden z-1 mb-2 ms-4 p-0">
                      <i className="ti ti-user-plus fs-16" />
                      <input
                        type="file"
                        className="form-control image-sign"
                        multiple
                      />
                      <div className="position-absolute bottom-0 end-0 star-0 w-100 h-25 bg-dark d-flex align-items-center justify-content-center z-n1">
                        <Link
                          href="#"
                          className="text-white d-flex align-items-center justify-content-center"
                        >
                          <i className="ti ti-photo fs-14" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
                {/* end col*/}
                <div className="col-lg-12">
                  <div className="row">
                    <div className="col-lg-6">
                      <div className="mb-3">
                        <label className="form-label">
                          Name <span className="text-danger">*</span>
                        </label>
                        <input type="text" className="form-control" />
                      </div>
                    </div>
                    <div className="col-lg-6">
                      <div className="mb-3">
                        <label className="form-label">
                          Username <span className="text-danger">*</span>
                        </label>
                        <input type="text" className="form-control" />
                      </div>
                    </div>
                    <div className="col-lg-6">
                      <div className="mb-3">
                        <label className="form-label">
                          Phone Number <span className="text-danger">*</span>
                        </label>
                        <input type="text" className="form-control" />
                      </div>
                    </div>
                    <div className="col-lg-6">
                      <div className="mb-3">
                        <label className="form-label">
                          Email Address <span className="text-danger">*</span>
                        </label>
                        <input type="text" className="form-control" />
                      </div>
                    </div>
                  </div>
                </div>
                {/* end col*/}
                <div className="col-lg-12">
                  <div className="row">
                    <div className="col-lg-6">
                      <div className="mb-3">
                        <label className="form-label">
                          DOB <span className="text-danger">*</span>
                        </label>
                        <div className="input-icon-end position-relative">
                          <DatePicker
                            className="form-control datetimepicker"
                            format={{
                              format: "DD-MM-YYYY",
                              type: "mask",
                            }}
                            getPopupContainer={getModalContainer}
                            placeholder="DD-MM-YYYY"
                            suffixIcon={null}
                          />
                          <span className="input-icon-addon">
                            <i className="ti ti-calendar" />
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="col-lg-6">
                      <div className="mb-3">
                        <label className="form-label">
                          Year Of Experience
                          <span className="text-danger">*</span>
                        </label>
                        <input type="text" className="form-control" />
                      </div>
                    </div>
                  </div>
                </div>
                {/* end col*/}
                <div className="col-lg-12">
                  <div className="row">
                    <div className="col-lg-6">
                      <div className="mb-3">
                        <label className="form-label">
                          Department<span className="text-danger ms-1">*</span>
                        </label>
                        <CommonSelect
                          options={Department}
                          className="select"
                          placeholder="Search department"
                        />
                      </div>
                    </div>
                    <div className="col-lg-6">
                      <div className="mb-3">
                        <label className="form-label">
                          Designation
                          <span className="text-danger ms-1">*</span>
                        </label>
                        <CommonSelect
                          options={Designation}
                          className="select"
                          defaultValue={Designation[0]}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                {/* end col*/}
                <div className="col-lg-12">
                  <div className="row">
                    <div className="col-lg-6">
                      <div className="mb-3">
                        <label className="form-label">
                          Medical License Number
                          <span className="text-danger">*</span>
                        </label>
                        <input type="text" className="form-control" />
                      </div>
                    </div>
                    <div className="col-lg-6">
                      <div className="mb-3">
                        <label className="form-label">Language Spoken</label>
                        <TagInput
                          initialTags={tags}
                          onTagsChange={handleTagsChange}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                {/* end col*/}
                <div className="col-lg-12">
                  <div className="row">
                    <div className="col-lg-6">
                      <div className="mb-3">
                        <label className="form-label">
                          Blood Group<span className="text-danger ms-1">*</span>
                        </label>
                        <CommonSelect
                          options={Department}
                          className="select"
                          defaultValue={Department[0]}
                        />
                      </div>
                    </div>
                    <div className="col-lg-6">
                      <div className="mb-3">
                        <label className="form-label">
                          Gender <span className="text-danger ms-1">*</span>
                        </label>
                        <CommonSelect
                          options={Gender}
                          className="select"
                          defaultValue={Gender[0]}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                {/* end col*/}
                <div className="col-lg-12">
                  <div className="mb-3">
                    <label className="form-label">Bio</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      defaultValue={"About Doctor"}
                    />
                  </div>
                  <div className="form-check form-switch mb-3">
                    <label
                      className="form-check-label"
                      htmlFor="switchCheckDefault"
                    >
                      Feature On Website
                    </label>
                    <input
                      className="form-check-input"
                      type="checkbox"
                      role="switch"
                      id="switchCheckDefault"
                    />
                  </div>
                </div>
              </div>
              {/* end row*/}
            </div>
            <div className="bg-light px-3 py-2">
              <h6 className="fw-bold mb-0">Address Information</h6>
            </div>
            <div className="p-3 pb-0">
              <div className="row">
                <div className="col-lg-6">
                  <div className="mb-3">
                    <label className="form-label">Address 1</label>
                    <input type="text" className="form-control" />
                  </div>
                </div>
                <div className="col-lg-6">
                  <div className="mb-3">
                    <label className="form-label">Address 2 </label>
                    <input type="text" className="form-control" />
                  </div>
                </div>
              </div>
              <div className="row">
                <div className="col-lg-6">
                  <div className="mb-3">
                    <label className="form-label">Country</label>
                    <CommonSelect
                      options={Country}
                      className="select"
                      defaultValue={Country[0]}
                    />
                  </div>
                </div>
                <div className="col-lg-6">
                  <div className="mb-3">
                    <label className="form-label">City</label>
                    <CommonSelect
                      options={City}
                      className="select"
                      defaultValue={City[0]}
                    />
                  </div>
                </div>
              </div>
              <div className="row">
                <div className="col-lg-6">
                  <div className="mb-3">
                    <label className="form-label">State</label>
                    <CommonSelect
                      options={State}
                      className="select"
                      defaultValue={State[0]}
                    />
                  </div>
                </div>
                <div className="col-lg-6">
                  <div className="mb-3">
                    <label className="form-label">Pincode</label>
                    <input type="text" className="form-control" />
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-light px-3 py-2">
              <h6 className="fw-bold mb-0">Address Information</h6>
            </div>
            <div className="p-3">
              <ul
                className="nav nav-pills schedule-tab mb-3"
                id="pills-tab"
                role="tablist"
              >
                <li className="nav-item me-1" role="presentation">
                  <button
                    className="nav-link btn btn-sm btn-icon p-2 d-flex align-items-center justify-content-center w-auto active"
                    data-bs-toggle="pill"
                    data-bs-target="#schedule-1"
                    type="button"
                    role="tab"
                    aria-selected="true"
                  >
                    Monday
                  </button>
                </li>
                <li className="nav-item me-1" role="presentation">
                  <button
                    className="nav-link btn btn-sm btn-icon p-2 d-flex align-items-center justify-content-center w-auto"
                    data-bs-toggle="pill"
                    data-bs-target="#schedule-2"
                    type="button"
                    role="tab"
                    aria-selected="false"
                    tabIndex={-1}
                  >
                    Tuesday
                  </button>
                </li>
                <li className="nav-item me-1" role="presentation">
                  <button
                    className="nav-link btn btn-sm btn-icon p-2 d-flex align-items-center justify-content-center w-auto"
                    data-bs-toggle="pill"
                    data-bs-target="#schedule-3"
                    type="button"
                    role="tab"
                    aria-selected="false"
                    tabIndex={-1}
                  >
                    Wednesday
                  </button>
                </li>
                <li className="nav-item me-1" role="presentation">
                  <button
                    className="nav-link btn btn-sm btn-icon p-2 d-flex align-items-center justify-content-center w-auto"
                    data-bs-toggle="pill"
                    data-bs-target="#schedule-4"
                    type="button"
                    role="tab"
                    aria-selected="false"
                    tabIndex={-1}
                  >
                    Thursday
                  </button>
                </li>
                <li className="nav-item me-1" role="presentation">
                  <button
                    className="nav-link btn btn-sm btn-icon p-2 d-flex align-items-center justify-content-center w-auto"
                    data-bs-toggle="pill"
                    data-bs-target="#schedule-5"
                    type="button"
                    role="tab"
                    aria-selected="false"
                    tabIndex={-1}
                  >
                    Friday
                  </button>
                </li>
                <li className="nav-item me-1" role="presentation">
                  <button
                    className="nav-link btn btn-sm btn-icon p-2 d-flex align-items-center justify-content-center w-auto"
                    data-bs-toggle="pill"
                    data-bs-target="#schedule-6"
                    type="button"
                    role="tab"
                    aria-selected="false"
                    tabIndex={-1}
                  >
                    Saturday
                  </button>
                </li>
                <li className="nav-item me-1" role="presentation">
                  <button
                    className="nav-link btn btn-sm btn-icon p-2 d-flex align-items-center justify-content-center w-auto"
                    data-bs-toggle="pill"
                    data-bs-target="#schedule-7"
                    type="button"
                    role="tab"
                    aria-selected="false"
                    tabIndex={-1}
                  >
                    Sunday
                  </button>
                </li>
              </ul>
              <div className="tab-content" id="pills-tabContent">
                <div
                  className="tab-pane fade active show"
                  id="schedule-1"
                  role="tabpanel"
                >
                  <div className="add-schedule-list">
                    <DuplicateForms />
                  </div>
                </div>
                <div className="tab-pane fade" id="schedule-2" role="tabpanel">
                  <div className="add-schedule-list">
                    <DuplicateForms />
                  </div>
                </div>
                <div className="tab-pane fade" id="schedule-3" role="tabpanel">
                  <div className="add-schedule-list">
                    <DuplicateForms />
                  </div>
                </div>
                <div className="tab-pane fade" id="schedule-4" role="tabpanel">
                  <div className="add-schedule-list">
                    <DuplicateForms />
                  </div>
                </div>
                <div className="tab-pane fade" id="schedule-5" role="tabpanel">
                  <div className="add-schedule-list">
                    <DuplicateForms />
                  </div>
                </div>
                <div className="tab-pane fade" id="schedule-6" role="tabpanel">
                  <div className="add-schedule-list">
                    <DuplicateForms />
                  </div>
                </div>
                <div className="tab-pane fade" id="schedule-7" role="tabpanel">
                  <div className="add-schedule-list">
                    <DuplicateForms />
                  </div>
                </div>
              </div>
              <div>
                <Link href="#" className="btn btn-dark">
                  Apply All
                </Link>
              </div>
            </div>
            <div className="bg-light px-3 py-2">
              <h6 className="fw-bold mb-0">Appointment Information</h6>
            </div>
            <div className="p-3 pb-0">
              <div className="row">
                <div className="col-lg-6">
                  <div className="mb-3">
                    <label className="form-label">Appointment Type</label>
                    <CommonSelect
                      options={Appointment_Type}
                      className="select"
                      defaultValue={Appointment_Type[0]}
                    />
                  </div>
                </div>
                <div className="col-lg-6" />
                <div className="col-lg-6">
                  <div className="mb-3">
                    <label className="form-label">
                      Accept bookings (in Advance)
                    </label>
                    <div className="input-group">
                      <input type="text" className="form-control" />
                      <span className="input-group-text bg-transparent text-dark fs-14">
                        Days
                      </span>
                    </div>
                  </div>
                </div>
                <div className="col-lg-6">
                  <div className="mb-3">
                    <label className="form-label">Appointment Duration</label>
                    <div className="input-group">
                      <input type="text" className="form-control" />
                      <span className="input-group-text bg-transparent text-dark fs-14">
                        Mins
                      </span>
                    </div>
                  </div>
                </div>
                <div className="col-lg-6">
                  <div className="mb-3">
                    <label className="form-label">Consultation Charge</label>
                    <div className="input-group">
                      <input type="text" className="form-control" />
                      <span className="input-group-text bg-transparent text-dark fs-14">
                        $
                      </span>
                    </div>
                  </div>
                </div>
                <div className="col-lg-6">
                  <div className="mb-3">
                    <label className="form-label">Max Bookings Per Slot</label>
                    <input type="text" className="form-control" />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="form-check form-switch mb-3">
                    <label
                      className="form-check-label"
                      htmlFor="switchCheckDefault2"
                    >
                      Display on Booking Page
                    </label>
                    <input
                      className="form-check-input"
                      type="checkbox"
                      role="switch"
                      id="switchCheckDefault2"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-light px-3 py-2">
              <h6 className="fw-bold mb-0">Educational Information</h6>
            </div>
            <div className="p-3 pb-0">
              <div className="add-education-list">
                <EducationForms />
              </div>
            </div>
            <div className="bg-light px-3 py-2">
              <h6 className="fw-bold mb-0">Awards &amp; Recognition</h6>
            </div>
            <div className="p-3 pb-0">
              <div className="add-award-list">
                <RewardsForms />
              </div>
            </div>
            <div className="bg-light px-3 py-2">
              <h6 className="fw-bold mb-0">Certifications</h6>
            </div>
            <div className="p-3 pb-0">
              <div className="add-certification-list">
                <RewardsForms />
              </div>
            </div>
          </form>
        </div>
        <div className="offcanvas-footer mb-1 p-3 border-1 border-top">
          <div className=" d-flex justify-content-end gap-2">
            <Link
              href="#"
              className="btn btn-light btm-md"
              data-bs-dismiss="offcanvas"
            >
              Cancel
            </Link>
            <button
              className="btn btn-primary btm-md"
              data-bs-toggle="modal"
              data-bs-target="#success_modal"
            >
              Add Doctor
            </button>
          </div>
        </div>
        {/* End Add New Appointment*/}
      </div>
      {/* End Add Doctor */}
      {/* Start Edit Doctor */}
      <div
        className="offcanvas offcanvas-offset offcanvas-end offcanvas-large"
        tabIndex={-1}
        id="edit_doctor"
        style={{ width: "min(1100px, 96vw)", maxWidth: "100%" }}
      >
        <div className="offcanvas-header d-block pb-0 px-0">
          <div className="border-bottom d-flex align-items-center justify-content-between pb-3 px-3">
            <h5 className="offcanvas-title fs-18 fw-bold">Edit Doctor</h5>
            <button
              type="button"
              className="btn-close custom-btn-close opacity-100"
              data-bs-dismiss="offcanvas"
              aria-label="Close"
            >
              <i className="ti ti-x fs-16 text-dark" />
            </button>
          </div>
        </div>
        <div className="offcanvas-body p-0">
          <form onSubmit={handleEditSubmit}>
            <div className="p-3 pb-0">
              <div className="row">
                <div className="col-lg-3">
                  <div className="mb-3">
                    <label className="form-label">
                      Name <span className="text-danger">*</span>
                    </label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="col-lg-3">
                  <div className="mb-3">
                    <label className="form-label">
                      Phone No <span className="text-danger">*</span>
                    </label>
                    <IndianPhoneInput
                      value={phone}
                      onChange={setPhone}
                      required
                    />
                  </div>
                </div>
                <div className="col-lg-3">
                  <div className="mb-3">
                    <label className="form-label">
                      Email
                    </label>
                    <input 
                      type="email" 
                      className="form-control" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-lg-3">
                  <div className="mb-3">
                    <label className="form-label">
                      DOB <span className="text-danger">*</span>
                    </label>
                    <div className="input-icon-end position-relative">
                      <DatePicker
                        className="form-control datetimepicker"
                        format={{
                          format: "DD-MM-YYYY",
                          type: "mask",
                        }}
                        getPopupContainer={getModalContainer}
                        placeholder="DD-MM-YYYY"
                        suffixIcon={null}
                        value={getDobValue()}
                        onChange={setDob}
                        allowClear
                      />
                      <span className="input-icon-addon">
                        <i className="ti ti-calendar" />
                      </span>
                    </div>
                  </div>
                </div>
                <div className="col-lg-2">
                  <div className="mb-3">
                    <label className="form-label">
                      Gender
                      <span className="text-danger ms-1">*</span>
                    </label>
                    <CommonSelect
                      options={Gender}
                      className="select"
                      value={gender}
                      onChange={setGender}
                    />
                  </div>
                </div>
                <div className="col-lg-2">
                  <div className="mb-3">
                    <label className="form-label">
                      Blood Group
                    </label>
                    <CommonSelect
                      options={Blood_Group}
                      className="select"
                      value={bloodGroup}
                      onChange={setBloodGroup}
                    />
                  </div>
                </div>
                <div className="col-lg-2">
                  <div className="mb-3">
                    <label className="form-label">
                      Years of Exp <span className="text-danger">*</span>
                    </label>
                    <input 
                      type="number" 
                      className="form-control" 
                      value={yearsOfExperience}
                      onChange={(e) => setYearsOfExperience(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="col-lg-3">
                  <div className="mb-3">
                    <label className="form-label">
                      Department
                      <span className="text-danger ms-1">*</span>
                    </label>
                    <CommonSelect
                      options={Department}
                      className="select"
                      value={department}
                      onChange={setDepartment}
                      placeholder="Search department"
                    />
                  </div>
                </div>
                <div className="col-lg-3">
                  <div className="mb-3">
                    <label className="form-label">Queue Sort By</label>
                    <CommonSelect
                      options={Queue_Sort_By}
                      className="select"
                      value={queueSortBy}
                      onChange={setQueueSortBy}
                    />
                  </div>
                </div>
                <div className="w-100" />
                <div className="col-lg-2">
                  <div className="mb-3">
                    <label className="form-label">
                      Designation
                      <span className="text-danger ms-1">*</span>
                    </label>
                    <CommonSelect
                      options={Designation}
                      className="select"
                      value={designation}
                      onChange={setDesignation}
                    />
                  </div>
                </div>
                <div className="col-lg-3">
                  <div className="mb-3">
                    <label className="form-label">
                      Medical License No
                      <span className="text-danger">*</span>
                    </label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={medicalLicenseNo}
                      onChange={(e) => setMedicalLicenseNo(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="col-lg-2">
                  <div className="mb-3">
                    <label className="form-label">OPD No.</label>
                    <input
                      type="text"
                      className="form-control"
                      value={opdNumber}
                      onChange={(e) => setOpdNumber(e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-lg-2">
                  <div className="mb-3">
                    <label className="form-label text-nowrap">
                      Max Appts/Slot
                    </label>
                    <input 
                      type="number" 
                      className="form-control" 
                      value={maxAppointmentsPerSlot}
                      onChange={(e) => setMaxAppointmentsPerSlot(e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-lg-3">
                  <div className="mb-3">
                    <label className="form-label">
                      Sessions <span className="text-danger">*</span>
                    </label>
                    <Select
                      isMulti
                      options={Sessions.filter(s => s.value !== "Select")}
                      value={sessions}
                      onChange={(selected) => setSessions(selected as Option[])}
                      classNamePrefix="react-select"
                      className="select"
                      placeholder="Select sessions"
                      instanceId="edit-doctor-sessions-select"
                    />
                  </div>
                </div>
                <div className="col-lg-6">
                  <div className="mb-3">
                    <label className="form-label">
                      Visit & Charges <span className="text-danger">*</span>
                    </label>
                    <div className="table-responsive">
                      <table className="table table-bordered">
                        <thead>
                          <tr>
                            <th className="text-dark">Visit</th>
                            <th className="text-dark">Charges</th>
                          </tr>
                        </thead>
                        <tbody>
                          {visitTypes.map((vt, index) => (
                            <tr key={index}>
                              <td className="text-dark">{vt.type}</td>
                              <td>
                                <div className="input-group">
                                  <input 
                                    type="number" 
                                    className="form-control" 
                                    value={vt.charge}
                                    onChange={(e) => handleVisitTypeChange(index, e.target.value)}
                                    placeholder="0"
                                  />
                                  <span className="input-group-text bg-transparent text-dark fs-14">
                                    ₹
                                  </span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                <div className="col-lg-6">
                  <div className="mb-3">
                    <label className="form-label">
                      Address
                    </label>
                    <textarea
                      className="form-control"
                      rows={3}
                      placeholder="Enter address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </div>
                  <div className="row">
                    <div className="col-lg-6">
                      <IpdPatientCompactUpload
                        label="Profile Image"
                        placeholder="Add profile image"
                        hint="Jpg / Png"
                        accept="image/jpeg,image/png,image/jpg,image/webp"
                        file={photoFile}
                        previewUrl={!photoRemoved ? existingImageUrl || undefined : undefined}
                        onFileChange={(file) => {
                          setPhotoFile(file);
                          if (file) setPhotoRemoved(false);
                        }}
                        onClear={() => {
                          setPhotoFile(null);
                          setExistingImageUrl("");
                          setPhotoRemoved(true);
                        }}
                      />
                    </div>
                    <div className="col-lg-6">
                      <IpdPatientCompactUpload
                        label="Poster"
                        placeholder="Add poster"
                        hint="Jpg / Png"
                        accept="image/jpeg,image/png,image/jpg,image/webp"
                        file={posterFile}
                        previewUrl={!posterRemoved ? existingPosterUrl || undefined : undefined}
                        onFileChange={(file) => {
                          setPosterFile(file);
                          if (file) setPosterRemoved(false);
                        }}
                        onClear={() => {
                          setPosterFile(null);
                          setExistingPosterUrl("");
                          setPosterRemoved(true);
                        }}
                      />
                    </div>
                  </div>
                  <DialysisSlotsField
                    slots={dialysisSlots}
                    onChange={setDialysisSlots}
                  />
                </div>
              </div>
            </div>
          </form>
        </div>
        <div className="offcanvas-footer mb-1 p-3 border-1 border-top">
          <div className=" d-flex justify-content-end gap-2">
            <Link
              href="#"
              className="btn btn-light btm-md"
              data-bs-dismiss="offcanvas"
            >
              Cancel
            </Link>
            <button 
              type="button"
              className="btn btn-primary btm-md"
              onClick={handleEditSubmit}
              disabled={loading}
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
        {/* End Add New Appointment*/}
      </div>
      {/* End Edit Doctor */}
      {/* Start Delete Modal  */}
      <div className="modal fade" id="delete_modal">
        <div className="modal-dialog modal-dialog-centered modal-sm">
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
                  <i className="ti ti-trash fs-24" />
                </span>
              </div>
              <h5 className="fw-bold mb-1">Delete Confirmation</h5>
              <p className="mb-3">Are you sure want to delete?</p>
              <div className="d-flex justify-content-center">
                <Link
                  href="#"
                  className="btn btn-light position-relative z-1 me-3"
                  data-bs-dismiss="modal"
                >
                  Cancel
                </Link>
                <Link
                  href={all_routes.doctorsList}
                  className="btn btn-danger position-relative z-1"
                >
                  Yes, Delete
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* End Delete Modal  */}
      {/* Start Delete Modal  */}
      <div className="modal fade" id="success_modal">
        <div className="modal-dialog modal-dialog-centered modal-sm">
          <div className="modal-content">
            <div className="modal-body text-center position-relative z-1">
              <div className="mb-3">
                <span className="avatar avatar-lg bg-success text-white">
                  <i className="ti ti-check fs-24" />
                </span>
              </div>
              <h5 className="fw-bold mb-1">Added Successfully</h5>
              <p className="mb-3">Doctor has been added to your List</p>
              <div className="d-flex justify-content-center">
                <Link
                  href="#"
                  className="btn btn-light position-relative z-1 me-3"
                  data-bs-dismiss="modal"
                >
                  Cancel
                </Link>
                <Link
                  href={all_routes.doctordetails}
                  className="btn btn-primary position-relative z-1"
                >
                  View Details
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* End Delete Modal  */}
      
      {/* Start Schedule Details Modal */}
      <div className="modal fade" id="schedule_details" tabIndex={-1} aria-labelledby="schedule_detailsLabel" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content">
            <div className="modal-header d-block pb-0 px-0">
                <div className="border-bottom d-flex align-items-center justify-content-between pb-3 px-3">
                  <h5 className="modal-title fs-18 fw-bold" id="schedule_detailsLabel">Schedule Details</h5>
                  <button
                    type="button"
                    className="btn-close custom-btn-close opacity-100"
                    data-bs-dismiss="modal"
                    aria-label="Close"
                  >
                    <i className="ti ti-x fs-16 text-dark" />
                  </button>
                </div>
            </div>
            <div className="modal-body p-0">
              <form>
                <div className="p-3">
                  <div className="border shadow-sm p-3 rounded-2">
                    <div className="d-flex align-items-center gap-3">
                      <div className="flex-grow-1">
                        <p className="mb-1 fs-13 text-muted">{scheduleLoading ? "Loading..." : doctorInfo?.doctorId || "#N/A"}</p>
                        <h6 className="mb-2 fw-semibold fs-16">{scheduleLoading ? "Loading..." : doctorInfo?.name || "N/A"}</h6>
                        <div className="d-flex align-items-center gap-2 flex-wrap mb-2">
                          {doctorInfo?.department && <span className="badge bg-primary">{doctorInfo.department}</span>}
                        </div>
                        <p className="mb-0 fs-13 text-muted">{doctorInfo?.designation || ""}</p>
                      </div>
                      <div className="ms-3">
                        <label className="form-label mb-1 fw-medium">
                          MR Max Visits / Day
                        </label>
                        <input
                          type="number"
                          min={0}
                          className="form-control"
                          value={mrMaxVisitsPerDay}
                          onChange={(e) => setMrMaxVisitsPerDay(e.target.value)}
                          placeholder="e.g. 10"
                        />
                      </div>
                    </div>
                  </div>
                  {scheduleMessage.type && (
                    <div className={`alert alert-${scheduleMessage.type === 'success' ? 'success' : 'danger'} mt-3 mb-0`} role="alert">
                      {scheduleMessage.text}
                    </div>
                  )}
                </div>
                <div className="px-3 py-2">
                  <h6 className="fw-bold mb-0">Schedules</h6>
                </div>
                <div className="p-3">
                  <ul
                    className="nav nav-pills schedule-tab mb-3"
                    id="pills-tab"
                    role="tablist"
                  >
                    <li className="nav-item me-1" role="presentation">
                      <button
                        className="nav-link btn btn-sm btn-icon p-2 d-flex align-items-center justify-content-center w-auto active"
                        data-bs-toggle="pill"
                        data-bs-target="#schedule-1"
                        type="button"
                        role="tab"
                        aria-selected="true"
                      >
                        Monday
                      </button>
                    </li>
                    <li className="nav-item me-1" role="presentation">
                      <button
                        className="nav-link btn btn-sm btn-icon p-2 d-flex align-items-center justify-content-center w-auto"
                        data-bs-toggle="pill"
                        data-bs-target="#schedule-2"
                        type="button"
                        role="tab"
                        aria-selected="false"
                        tabIndex={-1}
                      >
                        Tuesday
                      </button>
                    </li>
                    <li className="nav-item me-1" role="presentation">
                      <button
                        className="nav-link btn btn-sm btn-icon p-2 d-flex align-items-center justify-content-center w-auto"
                        data-bs-toggle="pill"
                        data-bs-target="#schedule-3"
                        type="button"
                        role="tab"
                        aria-selected="false"
                        tabIndex={-1}
                      >
                        Wednesday
                      </button>
                    </li>
                    <li className="nav-item me-1" role="presentation">
                      <button
                        className="nav-link btn btn-sm btn-icon p-2 d-flex align-items-center justify-content-center w-auto"
                        data-bs-toggle="pill"
                        data-bs-target="#schedule-4"
                        type="button"
                        role="tab"
                        aria-selected="false"
                        tabIndex={-1}
                      >
                        Thursday
                      </button>
                    </li>
                    <li className="nav-item me-1" role="presentation">
                      <button
                        className="nav-link btn btn-sm btn-icon p-2 d-flex align-items-center justify-content-center w-auto"
                        data-bs-toggle="pill"
                        data-bs-target="#schedule-5"
                        type="button"
                        role="tab"
                        aria-selected="false"
                        tabIndex={-1}
                      >
                        Friday
                      </button>
                    </li>
                    <li className="nav-item me-1" role="presentation">
                      <button
                        className="nav-link btn btn-sm btn-icon p-2 d-flex align-items-center justify-content-center w-auto"
                        data-bs-toggle="pill"
                        data-bs-target="#schedule-6"
                        type="button"
                        role="tab"
                        aria-selected="false"
                        tabIndex={-1}
                      >
                        Saturday
                      </button>
                    </li>
                    <li className="nav-item me-1" role="presentation">
                      <button
                        className="nav-link btn btn-sm btn-icon p-2 d-flex align-items-center justify-content-center w-auto"
                        data-bs-toggle="pill"
                        data-bs-target="#schedule-7"
                        type="button"
                        role="tab"
                        aria-selected="false"
                        tabIndex={-1}
                      >
                        Sunday
                      </button>
                    </li>
                  </ul>
                  <div className="tab-content" id="pills-tabContent">
                    {scheduleLoading ? (
                      <div className="text-center py-5">
                        <div className="spinner-border text-primary" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div
                          className={`tab-pane fade ${activeScheduleTab === "Monday" ? "active show" : ""}`}
                          id="schedule-1"
                          role="tabpanel"
                          key={`monday-pane-${mondaySlots.length}-${activeScheduleTab}`}
                        >
                          {activeScheduleTab === "Monday" && (
                            <div className="add-schedule-list" key={`monday-list-${mondaySlots.length}-${activeScheduleTab}`}>
                              <div className="d-flex justify-content-end mb-2">
                                <div className="form-check form-switch mb-0">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    id="mr-monday"
                                    checked={mondayMr}
                                    onChange={(e) => setMondayMr(e.target.checked)}
                                  />
                                  <label className="form-check-label ms-1" htmlFor="mr-monday">
                                    MR
                                  </label>
                                </div>
                              </div>
                              <ScheduleForm 
                                key={`monday-form-${mondaySlots.length}-${activeScheduleTab}`}
                                slots={mondaySlots} 
                                onSlotsChange={setMondaySlots}
                                dayName="Monday"
                              />
                            </div>
                          )}
                        </div>
                        <div 
                          className={`tab-pane fade ${activeScheduleTab === "Tuesday" ? "active show" : ""}`}
                          id="schedule-2" 
                          role="tabpanel" 
                          key={`tuesday-pane-${tuesdaySlots.length}-${activeScheduleTab}`}
                        >
                          {activeScheduleTab === "Tuesday" && (
                            <div className="add-schedule-list" key={`tuesday-list-${tuesdaySlots.length}-${activeScheduleTab}`}>
                              <div className="d-flex justify-content-end mb-2">
                                <div className="form-check form-switch mb-0">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    id="mr-tuesday"
                                    checked={tuesdayMr}
                                    onChange={(e) => setTuesdayMr(e.target.checked)}
                                  />
                                  <label className="form-check-label ms-1" htmlFor="mr-tuesday">
                                    MR
                                  </label>
                                </div>
                              </div>
                              <ScheduleForm 
                                key={`tuesday-form-${tuesdaySlots.length}-${activeScheduleTab}`}
                                slots={tuesdaySlots} 
                                onSlotsChange={setTuesdaySlots}
                                dayName="Tuesday"
                              />
                            </div>
                          )}
                        </div>
                        <div 
                          className={`tab-pane fade ${activeScheduleTab === "Wednesday" ? "active show" : ""}`}
                          id="schedule-3" 
                          role="tabpanel" 
                          key={`wednesday-pane-${wednesdaySlots.length}-${activeScheduleTab}`}
                        >
                          {activeScheduleTab === "Wednesday" && (
                            <div className="add-schedule-list" key={`wednesday-list-${wednesdaySlots.length}-${activeScheduleTab}`}>
                              <div className="d-flex justify-content-end mb-2">
                                <div className="form-check form-switch mb-0">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    id="mr-wednesday"
                                    checked={wednesdayMr}
                                    onChange={(e) => setWednesdayMr(e.target.checked)}
                                  />
                                  <label className="form-check-label ms-1" htmlFor="mr-wednesday">
                                    MR
                                  </label>
                                </div>
                              </div>
                              <ScheduleForm 
                                key={`wednesday-form-${wednesdaySlots.length}-${activeScheduleTab}`}
                                slots={wednesdaySlots} 
                                onSlotsChange={setWednesdaySlots}
                                dayName="Wednesday"
                              />
                            </div>
                          )}
                        </div>
                        <div 
                          className={`tab-pane fade ${activeScheduleTab === "Thursday" ? "active show" : ""}`}
                          id="schedule-4" 
                          role="tabpanel" 
                          key={`thursday-pane-${thursdaySlots.length}-${activeScheduleTab}`}
                        >
                          {activeScheduleTab === "Thursday" && (
                            <div className="add-schedule-list" key={`thursday-list-${thursdaySlots.length}-${activeScheduleTab}`}>
                              <div className="d-flex justify-content-end mb-2">
                                <div className="form-check form-switch mb-0">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    id="mr-thursday"
                                    checked={thursdayMr}
                                    onChange={(e) => setThursdayMr(e.target.checked)}
                                  />
                                  <label className="form-check-label ms-1" htmlFor="mr-thursday">
                                    MR
                                  </label>
                                </div>
                              </div>
                              <ScheduleForm 
                                key={`thursday-form-${thursdaySlots.length}-${activeScheduleTab}`}
                                slots={thursdaySlots} 
                                onSlotsChange={setThursdaySlots}
                                dayName="Thursday"
                              />
                            </div>
                          )}
                        </div>
                        <div 
                          className={`tab-pane fade ${activeScheduleTab === "Friday" ? "active show" : ""}`}
                          id="schedule-5" 
                          role="tabpanel" 
                          key={`friday-pane-${fridaySlots.length}-${activeScheduleTab}`}
                        >
                          {activeScheduleTab === "Friday" && (
                            <div className="add-schedule-list" key={`friday-list-${fridaySlots.length}-${activeScheduleTab}`}>
                              <div className="d-flex justify-content-end mb-2">
                                <div className="form-check form-switch mb-0">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    id="mr-friday"
                                    checked={fridayMr}
                                    onChange={(e) => setFridayMr(e.target.checked)}
                                  />
                                  <label className="form-check-label ms-1" htmlFor="mr-friday">
                                    MR
                                  </label>
                                </div>
                              </div>
                              <ScheduleForm 
                                key={`friday-form-${fridaySlots.length}-${activeScheduleTab}`}
                                slots={fridaySlots} 
                                onSlotsChange={setFridaySlots}
                                dayName="Friday"
                              />
                            </div>
                          )}
                        </div>
                        <div 
                          className={`tab-pane fade ${activeScheduleTab === "Saturday" ? "active show" : ""}`}
                          id="schedule-6" 
                          role="tabpanel" 
                          key={`saturday-pane-${saturdaySlots.length}-${activeScheduleTab}`}
                        >
                          {activeScheduleTab === "Saturday" && (
                            <div className="add-schedule-list" key={`saturday-list-${saturdaySlots.length}-${activeScheduleTab}`}>
                              <div className="d-flex justify-content-end mb-2">
                                <div className="form-check form-switch mb-0">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    id="mr-saturday"
                                    checked={saturdayMr}
                                    onChange={(e) => setSaturdayMr(e.target.checked)}
                                  />
                                  <label className="form-check-label ms-1" htmlFor="mr-saturday">
                                    MR
                                  </label>
                                </div>
                              </div>
                              <ScheduleForm 
                                key={`saturday-form-${saturdaySlots.length}-${activeScheduleTab}`}
                                slots={saturdaySlots} 
                                onSlotsChange={setSaturdaySlots}
                                dayName="Saturday"
                              />
                            </div>
                          )}
                        </div>
                        <div 
                          className={`tab-pane fade ${activeScheduleTab === "Sunday" ? "active show" : ""}`}
                          id="schedule-7" 
                          role="tabpanel" 
                          key={`sunday-pane-${sundaySlots.length}-${activeScheduleTab}`}
                        >
                          {activeScheduleTab === "Sunday" && (
                            <div className="add-schedule-list" key={`sunday-list-${sundaySlots.length}-${activeScheduleTab}`}>
                              <div className="d-flex justify-content-end mb-2">
                                <div className="form-check form-switch mb-0">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    id="mr-sunday"
                                    checked={sundayMr}
                                    onChange={(e) => setSundayMr(e.target.checked)}
                                  />
                                  <label className="form-check-label ms-1" htmlFor="mr-sunday">
                                    MR
                                  </label>
                                </div>
                              </div>
                              <ScheduleForm 
                                key={`sunday-form-${sundaySlots.length}-${activeScheduleTab}`}
                                slots={sundaySlots} 
                                onSlotsChange={setSundaySlots}
                                dayName="Sunday"
                              />
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </form>
            </div>
            <div className="modal-footer mb-1 p-3 border-1 border-top">
              <div className="d-flex justify-content-end gap-2">
                <button type="button" className="btn btn-light btm-md" data-bs-dismiss="modal">Cancel</button>
                <button 
                  type="button" 
                  className="btn btn-primary btm-md"
                  onClick={handleSaveSchedule}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* End Schedule Details Modal */}
    </>
  );
};

export default Modals;
