export const HMS_AUTH_COOKIE = "hms_auth";

const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export const setHmsAuthCookie = (): void => {
  if (typeof window === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${HMS_AUTH_COOKIE}=1; path=/; max-age=${AUTH_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
};

export const clearHmsAuthCookie = (): void => {
  if (typeof window === "undefined") return;
  document.cookie = `${HMS_AUTH_COOKIE}=; path=/; max-age=0`;
};

export const hasHmsAuthCookie = (cookieHeader: string | undefined | null): boolean => {
  if (!cookieHeader) return false;
  return cookieHeader
    .split(";")
    .some((part) => part.trim().startsWith(`${HMS_AUTH_COOKIE}=1`));
};

import { setAccessToken } from "@/core/auth/accessToken";

export const clearLocalAuthSession = (): void => {
  if (typeof window === "undefined") return;
  setAccessToken(null);
  try {
    window.localStorage.removeItem("authToken");
    window.localStorage.removeItem("authUser");
  } catch {
    // ignore storage errors
  }
  clearHmsAuthCookie();
};
