import { all_routes } from "@/routes/all_routes";

export const normalizeRole = (role: string | undefined | null): string =>
  (role ?? "").trim().toUpperCase();

/** ADMIN and ABDM_ADMIN share the same full-access permissions. */
export const isAdminRole = (role: string | undefined | null): boolean => {
  const r = normalizeRole(role);
  return r === "ADMIN" || r === "ABDM_ADMIN";
};

/** Path matches if equal or nested (e.g. /appointment-details/1). */
export const matchesPathPrefix = (pathname: string, prefix: string): boolean => {
  if (!pathname || !prefix) return false;
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
};

/**
 * Paths any authenticated role may open (profile, notifications, etc.).
 */
const COMMON_AUTH_PATH_PREFIXES: string[] = [
  all_routes.profile,
  all_routes.profilesettings,
  all_routes.securitysettings,
  all_routes.notificationssettings,
  all_routes.notifications,
  all_routes.pharmaTokenQueue,
  all_routes.xrayTokenQueue,
];

/**
 * Role → allowed app path prefixes. ADMIN / ABDM_ADMIN: implicit full access.
 * Detail/edit routes are covered by their parent prefix.
 */
const ROLE_PATH_PREFIXES: Record<string, string[]> = {
  RECEPTIONIST: [
    all_routes.newAppointment,
    all_routes.appointments,
    all_routes.appointmentDetails,
    all_routes.editAppointment,
    all_routes.appointmentCalendar,
    all_routes.appointmentconsultations,
    all_routes.patients,
    all_routes.patientsGrid,
    all_routes.patientDetails,
    all_routes.patientHealthHistory,
    all_routes.abhaConsent,
    all_routes.createPatient,
    all_routes.editPatient,
    all_routes.daycareAppointments,
    all_routes.daycareAppointmentDetails,
    all_routes.editDaycareAppointment,
    all_routes.ipdAppointments,
    all_routes.ipdAppointmentDetails,
    all_routes.editIpdAppointment,
    all_routes.dialysisCalendar,
  ],
  DIALYSIS: [
    all_routes.dialysis,
    all_routes.dialysisCalendar,
    all_routes.dialysisAppointment,
    all_routes.patients,
    all_routes.patientsGrid,
    all_routes.patientDetails,
    all_routes.patientHealthHistory,
    all_routes.abhaConsent,
    all_routes.createPatient,
    all_routes.editPatient,
  ],
  DOCTOR: [
    all_routes.appointments,
    all_routes.appointmentDetails,
    all_routes.editAppointment,
    all_routes.appointmentCalendar,
    all_routes.appointmentconsultations,
    all_routes.daycareAppointments,
    all_routes.daycareAppointmentDetails,
    all_routes.editDaycareAppointment,
    all_routes.ipdAppointments,
    all_routes.ipdAppointmentDetails,
    all_routes.editIpdAppointment,
    all_routes.dialysisCalendar,
  ],
  RECEPTIONIST2: [
    all_routes.patients,
    all_routes.patientsGrid,
    all_routes.patientDetails,
    all_routes.patientHealthHistory,
    all_routes.abhaConsent,
    all_routes.createPatient,
    all_routes.editPatient,
  ],
  PHARMACIST: [
    all_routes.pharmaTokens,
    all_routes.pharmaTokenQueue,
  ],
  XRAY: [
    all_routes.xrays,
    all_routes.xrayDetails,
    all_routes.xrayTokenQueue,
  ],
  ACCOUNTANT: [
    all_routes.dashboard,
    all_routes.transactions,
    all_routes.expenses,
    all_routes.expenseCategory,
    all_routes.income,
    all_routes.invoices,
    all_routes.invoicesDetails,
    all_routes.addInvoices,
    all_routes.editInvoices,
    all_routes.payments,
    all_routes.incomeReport,
    all_routes.expenseReport,
    all_routes.profitloss,
  ],
};

export const canAccessPath = (role: string, pathname: string): boolean => {
  const r = normalizeRole(role);
  if (isAdminRole(r)) return true;
  if (COMMON_AUTH_PATH_PREFIXES.some((p) => matchesPathPrefix(pathname, p))) {
    return true;
  }
  const prefixes = ROLE_PATH_PREFIXES[r];
  if (!prefixes) return false;
  return prefixes.some((p) => matchesPathPrefix(pathname, p));
};

export const getDefaultRouteForRole = (role: string): string => {
  const r = normalizeRole(role);
  switch (r) {
    case "ADMIN":
    case "ABDM_ADMIN":
      return all_routes.dashboard;
    case "RECEPTIONIST":
      return all_routes.newAppointment;
    case "DIALYSIS":
      return all_routes.dialysis;
    case "DOCTOR":
      return all_routes.appointments;
    case "RECEPTIONIST2":
      return all_routes.patients;
    case "PHARMACIST":
      return all_routes.pharmaTokens;
    case "XRAY":
      return all_routes.xrays;
    case "ACCOUNTANT":
      return all_routes.transactions;
    default:
      return all_routes.login;
  }
};

/** Sidebar single-item link: external URLs only for admin-equivalent roles; paths use canAccessPath. */
export const isSidebarItemLinkAllowed = (role: string, link: string | undefined): boolean => {
  const r = normalizeRole(role);
  if (isAdminRole(r)) return true;
  if (!link || link === "#" || link === "index") return true;
  if (link.startsWith("http")) return false;
  return canAccessPath(r, link);
};

export const canShowNewAppointmentSidebarCta = (role: string): boolean => {
  const r = normalizeRole(role);
  return isAdminRole(r) || r === "RECEPTIONIST";
};

/** Drop sidebar entries the role cannot access; recurse into nested submenuItems. */
export const filterSidebarSubmenuItems = (role: string, items: any[] | undefined): any[] => {
  if (!items?.length) return [];
  const out: any[] = [];
  for (const item of items) {
    if (item?.submenuItems?.length) {
      const nested = filterSidebarSubmenuItems(role, item.submenuItems);
      if (nested.length === 0) continue;
      out.push({ ...item, submenuItems: nested });
      continue;
    }
    if (isSidebarItemLinkAllowed(role, item?.link)) {
      out.push(item);
    }
  }
  return out;
};
