/**
 * Role-Based DTO Sanitizer Layer
 * CWE-213 / OWASP API3:2023: Sensitive Data Leak via Unfiltered Mongoose Queries
 * 
 * Provides centralized response sanitization based on caller's role.
 */

export type SanitizerRole =
  | "ADMIN"
  | "DOCTOR"
  | "RECEPTIONIST"
  | "RECEPTIONIST2"
  | "DIALYSIS"
  | "PHARMACIST"
  | "ACCOUNTANT"
  | "XRAY"
  | string;

/**
 * Fields stripped from Patient documents for low-privilege roles
 * (Receptionist, Pharmacist, Dialysis, Doctor, Accountant, Xray, etc.)
 */
export const RESTRICTED_PATIENT_FIELDS: string[] = [
  "aadharNo",
  "aadharS3Url",
  "ayushmanCardNo",
  "ayushmanCardS3Url",
  "otherDocsS3Urls",
  "allAbhaAddresses",
  "pathlabPatientId",
  "abhaPatientId",
  "createdBy",
  "deletedBy",
  "deletedAt",
  "isDeleted",
  "__v",
];

/**
 * Fields stripped from Doctor documents for non-admin callers
 * to protect doctors' personal privacy and license numbers.
 */
export const RESTRICTED_DOCTOR_FIELDS: string[] = [
  "phone",
  "medicalLicenseNo",
  "createdBy",
  "deletedBy",
  "deletedAt",
  "isDeleted",
  "__v",
];

/**
 * Internal DB/Mongoose fields stripped from all documents regardless of role
 */
export const INTERNAL_DB_FIELDS: string[] = [
  "__v",
  "patientObjectId",
  "doctorObjectId",
  "createdByObjectId",
  "bedObjectId",
  "visitObjectId",
  "procedureObjectId",
];

import mongoose from "mongoose";

function isObjectId(val: any): boolean {
  if (!val) return false;
  return (
    val._bsontype === "ObjectId" ||
    val._bsontype === "ObjectID" ||
    val instanceof mongoose.Types.ObjectId ||
    (typeof val === "object" && val.constructor?.name === "ObjectId")
  );
}

/** Helper to convert Mongoose documents to plain objects */
function toPlainObject(item: any): any {
  if (!item || typeof item !== "object") return item;
  if (item instanceof Date || Buffer.isBuffer(item)) return item;
  if (isObjectId(item)) return item.toString();
  if (Array.isArray(item)) return item.map(toPlainObject);
  if (typeof item.toObject === "function") {
    return item.toObject();
  }
  return { ...item };
}

// ─────────────────────────────────────────────────────────────────────────────
// PATIENT ROLE-BASED DTOs
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sanitizes a patient object for RECEPTIONIST / PHARMACIST / DIALYSIS / XRAY / ACCOUNTANT roles.
 * Whitelists frontdesk, queue, and billing essentials while completely stripping PII identity docs & internal DB fields.
 */
export function toReceptionistDTO(patient: any): any {
  if (!patient || typeof patient !== "object") return patient;
  const p = toPlainObject(patient);

  for (const field of RESTRICTED_PATIENT_FIELDS) {
    delete p[field];
  }
  return p;
}

/**
 * Sanitizes a patient object for DOCTOR role.
 * Includes clinical, demographic, and history fields, but strips identity verification documents (Aadhar, Ayushman, raw S3 docs) & internal IDs.
 */
export function toDoctorDTO(patient: any): any {
  if (!patient || typeof patient !== "object") return patient;
  const p = toPlainObject(patient);

  for (const field of RESTRICTED_PATIENT_FIELDS) {
    delete p[field];
  }
  return p;
}

/**
 * Sanitizes a patient object for ADMIN role.
 * Retains verification fields for hospital administration, but strips internal DB flags (__v, isDeleted, etc.).
 */
export function toAdminDTO(patient: any): any {
  if (!patient || typeof patient !== "object") return patient;
  const p = toPlainObject(patient);

  delete p.__v;
  delete p.patientObjectId;
  delete p.createdByObjectId;
  return p;
}

/**
 * Centralized Patient sanitizer dispatch based on caller role.
 */
export function sanitizePatientForRole(patient: any, role?: string): any {
  if (!patient) return patient;
  if (Array.isArray(patient)) {
    return patient.map((p) => sanitizePatientForRole(p, role));
  }

  const normalizedRole = (role || "").toUpperCase();
  if (normalizedRole === "ADMIN") {
    return toAdminDTO(patient);
  } else if (normalizedRole === "DOCTOR") {
    return toDoctorDTO(patient);
  } else {
    return toReceptionistDTO(patient);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DOCTOR ROLE-BASED DTOs
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sanitizes a doctor object for staff/reception/visits.
 * Strips doctor's personal phone number and medical license number.
 */
export function toStaffDoctorDTO(doctor: any): any {
  if (!doctor || typeof doctor !== "object") return doctor;
  const d = toPlainObject(doctor);

  for (const field of RESTRICTED_DOCTOR_FIELDS) {
    delete d[field];
  }
  return d;
}

/**
 * Sanitizes a doctor object for Admin or Self-Doctor.
 */
export function toAdminDoctorDTO(doctor: any): any {
  if (!doctor || typeof doctor !== "object") return doctor;
  const d = toPlainObject(doctor);

  delete d.__v;
  delete d.isDeleted;
  delete d.deletedAt;
  delete d.deletedBy;
  delete d.createdBy;
  return d;
}

/**
 * Centralized Doctor sanitizer dispatch based on caller role.
 */
export function sanitizeDoctorForRole(doctor: any, role?: string, isSelf = false): any {
  if (!doctor) return doctor;
  if (Array.isArray(doctor)) {
    return doctor.map((d) => sanitizeDoctorForRole(d, role, isSelf));
  }

  const normalizedRole = (role || "").toUpperCase();
  if (normalizedRole === "ADMIN" || isSelf) {
    return toAdminDoctorDTO(doctor);
  }
  return toStaffDoctorDTO(doctor);
}

// ─────────────────────────────────────────────────────────────────────────────
// VISIT, IPD, DAYCARE & SESSION DTO SANITIZERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sanitizes a visit object (including embedded patient and doctor).
 */
export function sanitizeVisitForRole(visit: any, role?: string): any {
  if (!visit || typeof visit !== "object") return visit;
  if (Array.isArray(visit)) {
    return visit.map((v) => sanitizeVisitForRole(v, role));
  }

  const v = toPlainObject(visit);

  if (v.patient) {
    v.patient = sanitizePatientForRole(v.patient, role);
  }
  if (v.doctor) {
    v.doctor = sanitizeDoctorForRole(v.doctor, role);
  }

  for (const field of INTERNAL_DB_FIELDS) {
    delete v[field];
  }
  delete v.isDeleted;
  delete v.deletedAt;
  delete v.deletedBy;

  return v;
}

/**
 * Sanitizes an IPD record (including embedded patient and doctor).
 */
export function sanitizeIpdForRole(ipd: any, role?: string): any {
  if (!ipd || typeof ipd !== "object") return ipd;
  if (Array.isArray(ipd)) {
    return ipd.map((i) => sanitizeIpdForRole(i, role));
  }

  const item = toPlainObject(ipd);

  if (item.patient) {
    item.patient = sanitizePatientForRole(item.patient, role);
  }
  if (item.doctor) {
    item.doctor = sanitizeDoctorForRole(item.doctor, role);
  }

  for (const field of INTERNAL_DB_FIELDS) {
    delete item[field];
  }
  delete item.isDeleted;
  delete item.deletedAt;
  delete item.deletedBy;

  return item;
}

/**
 * Sanitizes a Daycare appointment record (including embedded patient and doctor).
 */
export function sanitizeDaycareForRole(daycare: any, role?: string): any {
  if (!daycare || typeof daycare !== "object") return daycare;
  if (Array.isArray(daycare)) {
    return daycare.map((d) => sanitizeDaycareForRole(d, role));
  }

  const item = toPlainObject(daycare);

  if (item.patient) {
    item.patient = sanitizePatientForRole(item.patient, role);
  }
  if (item.doctor) {
    item.doctor = sanitizeDoctorForRole(item.doctor, role);
  }

  for (const field of INTERNAL_DB_FIELDS) {
    delete item[field];
  }
  delete item.isDeleted;
  delete item.deletedAt;
  delete item.deletedBy;

  return item;
}

/**
 * Sanitizes a Dialysis or X-Ray session record.
 */
export function sanitizeSessionForRole(session: any, role?: string): any {
  if (!session || typeof session !== "object") return session;
  if (Array.isArray(session)) {
    return session.map((s) => sanitizeSessionForRole(s, role));
  }

  const item = toPlainObject(session);

  if (item.patient) {
    item.patient = sanitizePatientForRole(item.patient, role);
  }
  if (item.doctor) {
    item.doctor = sanitizeDoctorForRole(item.doctor, role);
  }

  for (const field of INTERNAL_DB_FIELDS) {
    delete item[field];
  }
  delete item.isDeleted;
  delete item.deletedAt;
  delete item.deletedBy;

  return item;
}

// ─────────────────────────────────────────────────────────────────────────────
// CENTRAL RECURSIVE RESPONSE SANITIZER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Inspects any controller response payload and recursively sanitizes patient, doctor,
 * visit, session, and IPD documents according to the caller's role.
 */
export function sanitizeResponseData(data: any, role?: string): any {
  if (!data || typeof data !== "object") return data;
  if (data instanceof Date || Buffer.isBuffer(data)) return data;
  if (isObjectId(data)) return data.toString();

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeResponseData(item, role));
  }

  const result: any = { ...data };

  // Common pagination / container wrappers
  if (result.data !== undefined && typeof result.data === "object") {
    result.data = sanitizeResponseData(result.data, role);
  }
  if (Array.isArray(result.records)) {
    result.records = result.records.map((r: any) => sanitizeResponseData(r, role));
  }
  if (Array.isArray(result.items)) {
    result.items = result.items.map((i: any) => sanitizeResponseData(i, role));
  }
  if (Array.isArray(result.results)) {
    result.results = result.results.map((i: any) => sanitizeResponseData(i, role));
  }
  if (Array.isArray(result.list)) {
    result.list = result.list.map((l: any) => sanitizeResponseData(l, role));
  }

  // 1. Explicit patient keys
  if (result.patient) {
    result.patient = sanitizePatientForRole(result.patient, role);
  }
  if (Array.isArray(result.patients)) {
    result.patients = result.patients.map((p: any) => sanitizePatientForRole(p, role));
  }

  // 2. Explicit doctor keys
  if (result.doctor) {
    result.doctor = sanitizeDoctorForRole(result.doctor, role);
  }
  if (Array.isArray(result.doctors)) {
    result.doctors = result.doctors.map((d: any) => sanitizeDoctorForRole(d, role));
  }

  // 3. Explicit visit keys
  if (result.visit) {
    result.visit = sanitizeVisitForRole(result.visit, role);
  }
  if (Array.isArray(result.visits)) {
    result.visits = result.visits.map((v: any) => sanitizeVisitForRole(v, role));
  }

  // 4. Explicit IPD keys
  if (result.ipd) {
    result.ipd = sanitizeIpdForRole(result.ipd, role);
  }
  if (Array.isArray(result.ipds)) {
    result.ipds = result.ipds.map((i: any) => sanitizeIpdForRole(i, role));
  }

  // 5. Explicit daycare / appointment keys
  if (result.daycare) {
    result.daycare = sanitizeDaycareForRole(result.daycare, role);
  }
  if (result.appointment) {
    result.appointment = sanitizeDaycareForRole(result.appointment, role);
  }
  if (Array.isArray(result.appointments)) {
    result.appointments = result.appointments.map((a: any) => sanitizeDaycareForRole(a, role));
  }

  // 6. Explicit session keys (dialysis, xray)
  if (result.session) {
    result.session = sanitizeSessionForRole(result.session, role);
  }
  if (Array.isArray(result.sessions)) {
    result.sessions = result.sessions.map((s: any) => sanitizeSessionForRole(s, role));
  }

  // 7. Generic check if this object itself is a patient document (has mrd + name + phone)
  if (result.mrd && (result.name || result.title) && !result.patient) {
    return sanitizePatientForRole(result, role);
  }

  // 8. Generic check if this object itself is a doctor document (has doctorId + department)
  if (result.doctorId && result.department && !result.doctor) {
    return sanitizeDoctorForRole(result, role);
  }

  // 9. Generic check if this object is a visit (has visitId + visitDate)
  if (result.visitId && result.visitDate && !result.visit) {
    return sanitizeVisitForRole(result, role);
  }

  // Clean internal fields
  delete result.__v;
  delete result.patientObjectId;
  delete result.doctorObjectId;
  delete result.createdByObjectId;

  return result;
}
