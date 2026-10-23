export interface EmergencyContactDTO {
  name: string;
  number: string;
}

export interface CreateHospitalPatientDTO {
  title: "Mr." | "Mrs." | "Ms." | "Dr." | "Master" | "Baby of" | "Baby";
  name: string;
  phone: string;
  email?: string;
  dob?: string;
  age?: number;
  months?: number;
  days?: number;
  gender: "Male" | "Female" | "Other";
  bloodGroup?: "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-" | "Not Known";
  address?: string;
  aadharNo?: string;
  aadharS3Url?: string;
  ayushmanCardNo?: string;
  ayushmanCardS3Url?: string;
  imageS3Url?: string;
  companyName?: string;
  division?: string;
  maritalStatus?: "Single" | "Married" | "Divorced" | "Widowed" | "Separated" | "Other";
  occupation?: string;
  drugSensitivity?: string;
  otherDocsS3Urls?: string[];
  emergencyContacts?: EmergencyContactDTO[];
}

export interface HospitalPatientResponseDTO {
  mrd: string;
  title: string;
  name: string;
  phone: string;
  email?: string;
  dob?: string;
  age?: number;
  months?: number;
  days?: number;
  gender: string;
  bloodGroup?: string;
  address?: string;
  aadharNo?: string;
  aadharS3Url?: string;
  ayushmanCardNo?: string;
  ayushmanCardS3Url?: string;
  imageS3Url?: string;
  companyName?: string;
  division?: string;
  maritalStatus?: string;
  occupation?: string;
  drugSensitivity?: string;
  otherDocsS3Urls?: string[];
  emergencyContacts?: EmergencyContactDTO[];
  isMRPatient?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateHospitalPatientDTO {
  title?: "Mr." | "Mrs." | "Ms." | "Dr." | "Master" | "Baby of" | "Baby";
  name?: string;
  phone?: string;
  email?: string;
  dob?: string;
  age?: number;
  months?: number;
  days?: number;
  gender?: "Male" | "Female" | "Other";
  bloodGroup?: "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-" | "Not Known";
  address?: string;
  aadharNo?: string;
  aadharS3Url?: string;
  ayushmanCardNo?: string;
  ayushmanCardS3Url?: string;
  imageS3Url?: string;
  companyName?: string;
  division?: string;
  maritalStatus?: "Single" | "Married" | "Divorced" | "Widowed" | "Separated" | "Other";
  occupation?: string;
  drugSensitivity?: string;
  otherDocsS3Urls?: string[];
  emergencyContacts?: EmergencyContactDTO[];
}
