"use client";


import { useState, useCallback } from "react";
import DOMPurify from "isomorphic-dompurify";
import { all_routes } from "../../../../routes/all_routes";
import {
  Blood_Group,
  City,
  Country,
  Gender,
  Marital_Status,
  Primary_Doctor,
  State,
  Status,
  Title,
} from "@/core/common/selectOption";
import CommonSelect, { Option } from "@/core/common/common-select/commonSelect";
import { DatePicker } from "antd";
import IndianPhoneInput from "@/core/common/indianPhoneInput/IndianPhoneInput";
import Link from "next/link";
import axios from "axios";
import { API_BASE_URL } from "@/environment";
import {
  formatPatientPhoneForApi,
  validateIndianMobilePhone,
} from "@/core/utils/formatPatientPhoneForApi";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import IpdPatientCompactUpload from "@/components/pages/clinic-modules/ipd-appointments/IpdPatientCompactUpload";
import { uploadFileToS3 } from "@/core/utils/uploadFileToS3";

const CreatePatientComponent = () => {
  const router = useRouter();
  const [phone, setPhone] = useState<string>("");
  const [title, setTitle] = useState<Option | null>(Title[0] || null);
  const [name, setName] = useState<string>("");
  const [gender, setGender] = useState<Option | null>(Gender[0] || null);
  const [email, setEmail] = useState<string>("");
  const [dob, setDob] = useState<string | null>(null);
  const [ageYears, setAgeYears] = useState<string>("");
  const [ageMonths, setAgeMonths] = useState<string>("");
  const [ageDays, setAgeDays] = useState<string>("");
  const [bloodGroup, setBloodGroup] = useState<Option | null>(Blood_Group[0] || null);
  const [address, setAddress] = useState<string>("");
  const [companyName, setCompanyName] = useState<string>("");
  const [division, setDivision] = useState<string>("");
  const [aadharNumber, setAadharNumber] = useState<string>("");
  const [aadharFile, setAadharFile] = useState<File | null>(null);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [aadharS3Url, setAadharS3Url] = useState<string>("");
  const [otherDocsS3Urls, setOtherDocsS3Urls] = useState<string[]>([]);
  const [ayushmanCardNo, setAyushmanCardNo] = useState<string>("");
  const [maritalStatus, setMaritalStatus] = useState<Option | null>(Marital_Status[0] || null);
  const [occupation, setOccupation] = useState<string>("");
  const [drugSensitivity, setDrugSensitivity] = useState<string>("");
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [ayushmanFile, setAyushmanFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "aadhar" | "doc" | "ayushman"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (type === "aadhar") {
      setAadharFile(file);
    } else if (type === "ayushman") {
      setAyushmanFile(file);
    } else {
      setDocFile(file);
    }
  };
  
  const getModalContainer = () => {
    const modalElement = document.getElementById("modal-datepicker");
    return modalElement ? modalElement : document.body; // Fallback to document.body if modalElement is null
  };

  const handleDobChange = (date: any) => {
    setDob(date);
    if (date) {
      const birthDate = dayjs.isDayjs(date) ? date.toDate() : new Date(date);
      const today = new Date();
      let years = today.getFullYear() - birthDate.getFullYear();
      let months = today.getMonth() - birthDate.getMonth();
      let days = today.getDate() - birthDate.getDate();

      if (days < 0) {
        months--;
        const lastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        days += lastMonth.getDate();
      }

      if (months < 0) {
        years--;
        months += 12;
      }

      setAgeYears(years.toString());
      setAgeMonths(months.toString());
      setAgeDays(days.toString());
    } else {
      setAgeYears("");
      setAgeMonths("");
      setAgeDays("");
    }
  };

  const calculateAge = (): number => {
    if (ageYears) {
      return parseInt(ageYears, 10);
    }
    if (dob) {
      const birthDate = dayjs.isDayjs(dob) ? dob.toDate() : new Date(dob);
      const today = new Date();
      let years = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        years--;
      }
      return years;
    }
    return 0;
  };

  const handleTitleChange = useCallback((option: Option | null) => {
    setTitle(option);
    if (!option?.value) return;
    if (option.value === "Mr." || option.value === "Master") {
      const male = Gender.find((g) => g.value === "Male");
      if (male) setGender(male);
    } else if (option.value === "Mrs." || option.value === "Ms.") {
      const female = Gender.find((g) => g.value === "Female");
      if (female) setGender(female);
    } else if (option.value === "Dr." || option.value === "Prof." || option.value === "Baby") {
      const select = Gender.find((g) => g.value === "Select");
      if (select) setGender(select);
    }
  }, []);

  const formatDob = (): string => {
    if (!dob) return "";
    // antd DatePicker returns dayjs object
    if (dayjs.isDayjs(dob)) {
      return dob.format("YYYY-MM-DD");
    }
    // Fallback for Date objects or strings
    return dayjs(dob).format("YYYY-MM-DD");
  };

  const handleCreatePatient = async () => {
    const phoneValidation = validateIndianMobilePhone(phone);
    if (!phoneValidation.valid) {
      alert(phoneValidation.message);
      return;
    }

    try {
      if (!API_BASE_URL) {
        console.error("API_BASE_URL is undefined. Check .env.local file.");
        return;
      }

      setLoading(true);

      let uploadedAadharUrl = aadharS3Url;
      let uploadedAyushmanUrl = "";
      let uploadedImageUrl = "";
      const uploadedOtherDocs = [...otherDocsS3Urls];

      if (aadharFile) {
        uploadedAadharUrl = await uploadFileToS3(aadharFile, "ipd_aadhar_docs");
      }
      if (ayushmanFile) {
        uploadedAyushmanUrl = await uploadFileToS3(ayushmanFile, "ipd_ayushman_docs");
      }
      if (profilePhotoFile) {
        uploadedImageUrl = await uploadFileToS3(profilePhotoFile, "ipd_patient_photos");
      }
      if (docFile) {
        uploadedOtherDocs.push(await uploadFileToS3(docFile, "ipd_other_docs"));
      }

      const patientData = {
        title: title?.value || "",
        name: name,
        phone: formatPatientPhoneForApi(phone),
        email: email || undefined,
        dob: formatDob() || undefined,
        age: calculateAge(),
        gender: gender?.value || "",
        bloodGroup: bloodGroup?.value && bloodGroup.value !== "Select" ? bloodGroup.value : undefined,
        address: address,
        companyName: companyName.trim() || undefined,
        division: division.trim() || undefined,
        aadharNo: aadharNumber || undefined,
        aadharS3Url: uploadedAadharUrl || undefined,
        otherDocsS3Urls: uploadedOtherDocs.length > 0 ? uploadedOtherDocs : undefined,
        ayushmanCardNo: ayushmanCardNo || undefined,
        ayushmanCardS3Url: uploadedAyushmanUrl || undefined,
        imageS3Url: uploadedImageUrl || undefined,
        ...(maritalStatus?.value && maritalStatus.value !== "Select"
          ? { maritalStatus: maritalStatus.value }
          : {}),
        ...(occupation.trim() ? { occupation: occupation.trim() } : {}),
        ...(drugSensitivity.trim() ? { drugSensitivity: drugSensitivity.trim() } : {}),
      };

      const response = await axios.post(`${API_BASE_URL}/hospital/patients`, patientData);
      const isSuccess = response.status >= 200 && response.status < 300;
      const hasSuccessCode = response.data?.code === 200;

      if (isSuccess || hasSuccessCode) {
        router.push(all_routes.patients);
      } else {
        console.error("Failed to create patient:", response.data);
      }
    } catch (error: any) {
      console.error("Error creating patient:", error);
      console.error("Error details:", error.response?.data);
    } finally {
      setLoading(false);
    }
  };
  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: DOMPurify.sanitize(`
          .page-wrapper input::placeholder,
          .page-wrapper textarea::placeholder {
            color: #000 !important;
            opacity: 1;
          }
          .page-wrapper input::-webkit-input-placeholder,
          .page-wrapper textarea::-webkit-input-placeholder {
            color: #000 !important;
          }
          .page-wrapper input::-moz-placeholder,
          .page-wrapper textarea::-moz-placeholder {
            color: #000 !important;
            opacity: 1;
          }
          .page-wrapper input:-ms-input-placeholder,
          .page-wrapper textarea:-ms-input-placeholder {
            color: #000 !important;
          }
        `)
      }} />
      {/* ========================
			Start Page Content
		========================= */}
      <div className="page-wrapper">
        {/* Start Content */}
        <div className="content">
          {/* row start */}
          <div className="row">
            <div className="col-12">
              {/* page header start */}
              <div className="mb-4">
                <h6 className="fw-bold mb-0 d-flex align-items-center">
                  <Link href={all_routes.patients} className="text-dark">
                    <i className="ti ti-chevron-left me-1" />
                    Patients
                  </Link>
                </h6>
              </div>
              {/* page header end */}
              {/* card start */}
              <div className="card">
                <div className="card-body pb-0">
                  <div className="form">
                    <h6 className="fw-bold text-primary mb-3">Patient Information</h6>
                    <div className="row">
                      <div className="col-12">
                        <div className="d-flex flex-column flex-sm-row align-items-start gap-3">
                          <IpdPatientCompactUpload
                            label="Patient photo"
                            placeholder="Add photo"
                            hint="Jpg / Png"
                            accept="image/jpeg,image/png,image/jpg"
                            file={profilePhotoFile}
                            onFileChange={setProfilePhotoFile}
                          />
                          <div className="row flex-grow-1 w-100 m-0">
                            <div className="col-md-3">
                              <div className="mb-3">
                                <label className="form-label mb-1 fw-medium">
                                  Phone Number
                                  <span className="text-danger ms-1">*</span>
                                </label>
                                <IndianPhoneInput
                                  value={phone}
                                  onChange={(value) => setPhone(value || "")}
                                />
                              </div>
                            </div>
                            <div className="col-md-2">
                              <div className="mb-3">
                                <label className="form-label mb-1 fw-medium">
                                  Title<span className="text-danger ms-1">*</span>
                                </label>
                                <CommonSelect
                                  options={Title}
                                  className="select"
                                  value={title || undefined}
                                  onChange={handleTitleChange}
                                />
                              </div>
                            </div>
                            <div className="col-md-4">
                              <div className="mb-3">
                                <label className="form-label mb-1 fw-medium">
                                  Name<span className="text-danger ms-1">*</span>
                                </label>
                                <input
                                  type="text"
                                  className="form-control"
                                  placeholder="Enter patient name"
                                  value={name}
                                  onChange={(e) => setName(e.target.value)}
                                />
                              </div>
                            </div>
                            <div className="col-md-3">
                              <div className="mb-3">
                                <label className="form-label mb-1 fw-medium">
                                  Gender<span className="text-danger ms-1">*</span>
                                </label>
                                <CommonSelect
                                  options={Gender}
                                  className="select"
                                  value={gender || undefined}
                                  onChange={(option) => setGender(option)}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="mb-3">
                          <label className="form-label mb-1 fw-medium">
                            Email Address
                          </label>
                          <input 
                            type="email" 
                            className="form-control" 
                            placeholder="Enter email address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="col-md-2">
                        <div className="mb-3">
                          <label className="form-label mb-1 fw-medium">
                            DOB
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
                              onChange={handleDobChange}
                            />
                            <span className="input-icon-addon">
                              <i className="ti ti-calendar" />
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="mb-3">
                          <label className="form-label mb-1 fw-medium">
                            Age<span className="text-danger ms-1">*</span>
                          </label>
                          <div className="row g-2">
                            <div className="col-4">
                              <input
                                type="text"
                                className="form-control"
                                placeholder="Years"
                                value={ageYears}
                                onChange={(e) => setAgeYears(e.target.value)}
                              />
                            </div>
                            <div className="col-4">
                              <input
                                type="text"
                                className="form-control"
                                placeholder="Months"
                                value={ageMonths}
                                onChange={(e) => setAgeMonths(e.target.value)}
                              />
                            </div>
                            <div className="col-4">
                              <input
                                type="text"
                                className="form-control"
                                placeholder="Days"
                                value={ageDays}
                                onChange={(e) => setAgeDays(e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="mb-3">
                          <label className="form-label mb-1 fw-medium">
                            Blood Group
                          </label>
                          <CommonSelect
                            options={Blood_Group}
                            className="select"
                            value={bloodGroup || undefined}
                            onChange={(option) => setBloodGroup(option)}
                          />
                        </div>
                      </div>
                      <div className="col-12 col-lg-6">
                        <div className="mb-3">
                          <label className="form-label mb-1 fw-medium">
                            Address<span className="text-danger ms-1">*</span>
                          </label>
                          <textarea 
                            className="form-control" 
                            rows={1} 
                            placeholder="Enter full address"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                          ></textarea>
                        </div>
                      </div>
                      <div className="col-12 col-sm-6 col-lg-3">
                        <div className="mb-3">
                          <label className="form-label mb-1 fw-medium">Company</label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Company name"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="col-12 col-sm-6 col-lg-3">
                        <div className="mb-3">
                          <label className="form-label mb-1 fw-medium">Division</label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Division"
                            value={division}
                            onChange={(e) => setDivision(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="mb-3">
                          <label className="form-label mb-1 fw-medium">Marital Status</label>
                          <CommonSelect
                            options={Marital_Status}
                            className="select"
                            value={maritalStatus || undefined}
                            onChange={setMaritalStatus}
                          />
                        </div>
                      </div>
                      <div className="col-md-3">
                        <div className="mb-3">
                          <label className="form-label mb-1 fw-medium">Occupation</label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Enter occupation"
                            value={occupation}
                            onChange={(e) => setOccupation(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label mb-1 fw-medium">Drug Sensitivity</label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="e.g. Penicillin, Aspirin"
                            value={drugSensitivity}
                            onChange={(e) => setDrugSensitivity(e.target.value)}
                          />
                        </div>
                      </div>
                      {/* <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label mb-1 fw-medium">
                            Primary Doctor
                            <span className="text-danger ms-1">*</span>
                          </label>
                          <CommonSelect
                            options={Primary_Doctor}
                            className="select"
                            defaultValue={Primary_Doctor[0]}
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label mb-1 fw-medium">
                            Status<span className="text-danger ms-1">*</span>
                          </label>
                          <CommonSelect
                            options={Status}
                            className="select"
                            defaultValue={Status[0]}
                          />
                        </div>
                      </div> */}
                    </div>
                    <h6 className="fw-bold text-primary mb-3 border-top pt-3">
                      Documents
                    </h6>
                    <div className="mb-3">
                      <div className="row g-3">
                        <div className="col-md-6 col-lg-4 mb-3">
                          <label className="form-label mb-2 fw-medium">Aadhar Card</label>
                            <div
                              className="border border-dashed rounded p-3 text-center position-relative"
                              style={{
                                minHeight: "100px",
                                cursor: "pointer",
                                backgroundColor: "#f8f9fa",
                              }}
                              onClick={() => {
                                const input = document.getElementById('aadhar-upload') as HTMLInputElement;
                                input?.click();
                              }}
                            >
                            <input
                              id="aadhar-upload"
                              type="file"
                              className="d-none"
                              accept="image/*,.pdf"
                              onChange={(e) => handleFileSelect(e, 'aadhar')}
                            />
                            {aadharFile ? (
                              <div>
                                <i className="ti ti-file-check fs-24 text-success mb-2"></i>
                                <p className="mb-0 text-dark fw-medium">{aadharFile.name}</p>
                                <button
                                  className="btn btn-sm btn-link text-danger mt-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setAadharFile(null);
                                  }}
                                >
                                  Remove
                                </button>
                              </div>
                            ) : (
                              <div>
                                <i className="ti ti-upload fs-24 text-muted mb-2"></i>
                                <p className="mb-1 text-dark fw-medium">Click to upload</p>
                                <p className="mb-0 text-muted fs-13">JPG, PNG or PDF (max. 5MB)</p>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="col-md-6 col-lg-3 mb-3">
                          <label className="form-label mb-2 fw-medium">Ayushman Card</label>
                          <div
                            className="border border-dashed rounded p-3 text-center position-relative"
                            style={{
                              minHeight: "100px",
                              cursor: "pointer",
                              backgroundColor: "#f8f9fa",
                            }}
                            onClick={() => {
                              const input = document.getElementById("create-ayushman-upload") as HTMLInputElement;
                              input?.click();
                            }}
                          >
                            <input
                              id="create-ayushman-upload"
                              type="file"
                              className="d-none"
                              accept="image/*,.pdf"
                              onChange={(e) => handleFileSelect(e, "ayushman")}
                            />
                            {ayushmanFile ? (
                              <div>
                                <i className="ti ti-file-check fs-24 text-success mb-2"></i>
                                <p className="mb-0 text-dark fw-medium">{ayushmanFile.name}</p>
                                <button
                                  className="btn btn-sm btn-link text-danger mt-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setAyushmanFile(null);
                                  }}
                                >
                                  Remove
                                </button>
                              </div>
                            ) : (
                              <div>
                                <i className="ti ti-upload fs-24 text-muted mb-2"></i>
                                <p className="mb-1 text-dark fw-medium">Click to upload</p>
                                <p className="mb-0 text-muted fs-13">JPG, PNG or PDF (max. 5MB)</p>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="col-md-6 col-lg-3 mb-3">
                          <label className="form-label mb-2 fw-medium">Other Document</label>
                            <div
                              className="border border-dashed rounded p-3 text-center position-relative"
                              style={{
                                minHeight: "100px",
                                cursor: "pointer",
                                backgroundColor: "#f8f9fa",
                              }}
                              onClick={() => {
                                const input = document.getElementById('doc-upload') as HTMLInputElement;
                                input?.click();
                              }}
                            >
                            <input
                              id="doc-upload"
                              type="file"
                              className="d-none"
                              accept="image/*,.pdf"
                              onChange={(e) => handleFileSelect(e, 'doc')}
                            />
                            {docFile ? (
                              <div>
                                <i className="ti ti-file-check fs-24 text-success mb-2"></i>
                                <p className="mb-0 text-dark fw-medium">{docFile.name}</p>
                                <button
                                  className="btn btn-sm btn-link text-danger mt-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDocFile(null);
                                  }}
                                >
                                  Remove
                                </button>
                              </div>
                            ) : (
                              <div>
                                <i className="ti ti-upload fs-24 text-muted mb-2"></i>
                                <p className="mb-1 text-dark fw-medium">Click to upload</p>
                                <p className="mb-0 text-muted fs-13">JPG, PNG or PDF (max. 5MB)</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <h6 className="fw-bold text-primary mb-3 border-top pt-3">
                      ID Numbers
                    </h6>
                    <div className="row">
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label mb-1 fw-medium">
                            Aadhar Number
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Enter Aadhar Number"
                            value={aadharNumber}
                            onChange={(e) => setAadharNumber(e.target.value)}
                            maxLength={12}
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label className="form-label mb-1 fw-medium">
                            Ayushman Card Number
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Enter Ayushman Card Number"
                            value={ayushmanCardNo}
                            onChange={(e) => setAyushmanCardNo(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* card end */}
              <div className="d-flex align-items-center justify-content-end">
                <Link href={all_routes.patients} className="btn btn-light me-2">
                  Cancel
                </Link>
                <button 
                  className="btn btn-primary"
                  onClick={handleCreatePatient}
                  disabled={loading}
                >
                  {loading ? "Creating..." : "Add New Patient"}
                </button>
              </div>
            </div>
          </div>
          {/* row end */}
        </div>
        {/* End Content */}
        {/* Footer Start */}
        <div className="footer text-center bg-white p-2 border-top">
          <p className="text-dark mb-0">
            2025 ©
            <Link href="#" className="link-primary">
              Preclinic
            </Link>
            , All Rights Reserved
          </p>
        </div>
        {/* Footer End */}
      </div>
      {/* ========================
			End Page Content
		========================= */}
    </>
  );
};

export default CreatePatientComponent;
