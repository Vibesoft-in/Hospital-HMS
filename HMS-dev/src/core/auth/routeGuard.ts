import { isPublicPath, matchesPathPrefix } from "@/core/auth/publicPaths";
import { all_routes } from "@/routes/all_routes";
import { getAccessToken } from "@/core/auth/accessToken";

export { isPublicPath, matchesPathPrefix };

/** Curated routes referenced in route audit (protected unless public). */
export const CURATED_ROUTE_PATHS: string[] = [
  all_routes.announcements,
  all_routes.blogs,
  all_routes.cities,
  all_routes.dashboard,
  all_routes.holidays,
  all_routes.invoices,
  all_routes.login,
  all_routes.notifications,
  all_routes.pages,
  all_routes.payments,
  all_routes.procedures,
  all_routes.profile,
  all_routes.staffs,
  all_routes.states,
  all_routes.tickets,
  all_routes.transactions,
  all_routes.users,
];

export const isAuthenticated = (): boolean => {
  if (typeof window === "undefined") return false;
  return Boolean(getAccessToken() || localStorage.getItem("authUser"));
};
