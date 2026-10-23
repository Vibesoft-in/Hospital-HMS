/**
 * System configuration utility
 * Determines the system type from environment variable
 * Default: pathlab
 * Options: pathlab | pagia
 *
 * Hospital branding is configured separately via env vars and does NOT require
 * a new system type. Any HMS-compatible hospital (JJM, SBH, etc.) uses SYSTEM=pathlab
 * and customises branding/ID-prefixes through the HOSPITAL_* env vars below.
 *
 * Relevant env vars:
 *   SYSTEM                  — pathlab | pagia          (default: pathlab)
 *   HOSPITAL_NAME           — display name in exports  (default: JJM Hospital)
 *   HOSPITAL_VISIT_PREFIX   — prefix for visit IDs     (default: JJM)
 *   HOSPITAL_DAYCARE_PREFIX — prefix for daycare IDs   (default: JJMDC)
 *   HOSPITAL_IPD_PREFIX     — prefix for IPD IDs       (default: IPD)
 *   HOSPITAL_LOGO_PATH      — absolute path to logo    (default: built-in JJM logo)
 *   HOSPITAL_LOGO_EXT       — png | jpeg               (default: png)
 */

import * as path from "path";

export type SystemType = "pathlab" | "pagia";

export function getSystemType(): SystemType {
  const system = process.env.SYSTEM?.toLowerCase();

  if (system === "pagia") {
    return "pagia";
  }

  // Default to pathlab
  return "pathlab";
}

export function isPagiaSystem(): boolean {
  return getSystemType() === "pagia";
}

export function isPathlabSystem(): boolean {
  return getSystemType() === "pathlab";
}

// ---------------------------------------------------------------------------
// Hospital branding & ID-prefix config
// All values are driven by env vars so any HMS client can be onboarded simply
// by changing the deployment environment — no code changes required.
// ---------------------------------------------------------------------------

const DEFAULT_LOGO_PATH = path.join(__dirname, "../templates/assets/JJM Logo.png");

export interface HospitalConfig {
  /** Full display name shown in Excel export headers. */
  hospitalName: string;
  /** Short prefix for OPD visit IDs  e.g. "JJM" → "JJM00001" */
  visitPrefix: string;
  /** Short prefix for daycare IDs    e.g. "JJMDC" → "JJMDC00001" */
  daycarePrefix: string;
  /** Short prefix for IPD IDs        e.g. "IPD" → "IPD00001", "SBHIPD" → "SBHIPD00001" */
  ipdPrefix: string;
  /** Absolute filesystem path to the logo used in Excel exports. */
  logoPath: string;
  /** Image extension understood by ExcelJS: "png" | "jpeg" */
  logoExt: "png" | "jpeg";
}

/**
 * Returns the hospital branding / ID-prefix configuration for the current
 * deployment.  All values fall back to sensible JJM defaults so that existing
 * deployments require zero env-var changes.
 */
export function getHospitalConfig(): HospitalConfig {
  // Pagia system has its own fixed branding — kept here so all callers can
  // simply use getHospitalConfig() without branching on isPagiaSystem().
  if (isPagiaSystem()) {
    return {
      hospitalName:   process.env.HOSPITAL_NAME           || "Pagia Hospital",
      visitPrefix:    process.env.HOSPITAL_VISIT_PREFIX   || "PAG",
      daycarePrefix:  process.env.HOSPITAL_DAYCARE_PREFIX || "PAGDC",
      ipdPrefix:      process.env.HOSPITAL_IPD_PREFIX     || "IPD",
      logoPath:       process.env.HOSPITAL_LOGO_PATH      || path.join(__dirname, "../templates/assets/pagia-logo.jpg"),
      logoExt:        (process.env.HOSPITAL_LOGO_EXT as "png" | "jpeg") || "jpeg",
    };
  }

  return {
    hospitalName:   process.env.HOSPITAL_NAME           || "JJM Hospital",
    visitPrefix:    process.env.HOSPITAL_VISIT_PREFIX   || "JJM",
    daycarePrefix:  process.env.HOSPITAL_DAYCARE_PREFIX || "JJMDC",
    ipdPrefix:      process.env.HOSPITAL_IPD_PREFIX     || "IPD",
    logoPath:       process.env.HOSPITAL_LOGO_PATH      || DEFAULT_LOGO_PATH,
    logoExt:        (process.env.HOSPITAL_LOGO_EXT as "png" | "jpeg") || "png",
  };
}

// ---------------------------------------------------------------------------
// WhatsApp messaging config
// ---------------------------------------------------------------------------

/**
 * Determines if WhatsApp messages should be sent.
 * Default: true (enabled).  Set WHATSAPP_MESSAGING=false to disable.
 */
export function isWhatsAppEnabled(): boolean {
  const whatsappMessaging = process.env.WHATSAPP_MESSAGING?.toLowerCase();

  if (whatsappMessaging === "false") {
    return false;
  }

  return true;
}
