import axios from "axios";
import { API_BASE_URL } from "@/environment";
import { setHmsAuthCookie, clearLocalAuthSession } from "@/core/auth/sessionCookie";
import { isSharedAuthEnabled, postSharedLogout, syncHospitalSessionFromSharedCookie } from "@/core/auth/sharedAuth";
import { getAccessToken, setAccessToken } from "./accessToken";

export { getAccessToken, setAccessToken };

let refreshPromise: Promise<string | null> | null = null;

/**
 * Performs a silent token refresh using the existing httpOnly cookie.
 * Deduplicates in-flight calls so multiple simultaneous requests await the same refresh.
 */
export const silentRefresh = async (): Promise<string | null> => {
  // If in browser and there are no auth indicators (no localStorage authUser and no hms_auth cookie),
  // skip remote refresh calls entirely to avoid freezing unauthenticated guests.
  if (typeof window !== "undefined") {
    try {
      const hasAuthUser = Boolean(window.localStorage.getItem("authUser"));
      const hasCookie = document.cookie?.includes("hms_auth=1");
      if (!hasAuthUser && !hasCookie) {
        return null;
      }
    } catch {
      // ignore storage errors
    }
  }

  if (refreshPromise) {
    return refreshPromise;
  }

  const doRefresh = async (): Promise<string | null> => {
    try {
      if (isSharedAuthEnabled()) {
        const syncResult = await syncHospitalSessionFromSharedCookie();
        if (syncResult === "restored") {
          return getAccessToken();
        }
      }

      if (!API_BASE_URL || typeof window === "undefined") {
        return null;
      }

      const response = await axios.post(
        `${API_BASE_URL}/hospital/auth/refresh`,
        {},
        { withCredentials: true, timeout: 5000 }
      );

      const payload = (response.data as any)?.data || response.data;
      const newAccessToken = payload?.accessToken || null;
      const user = payload?.user || null;

      if (newAccessToken) {
        setAccessToken(newAccessToken);
        if (user) {
          try {
            window.localStorage.setItem("authUser", JSON.stringify(user));
          } catch {
            // ignore storage errors
          }
        }
        setHmsAuthCookie();
        return newAccessToken;
      }

      setAccessToken(null);
      clearLocalAuthSession();
      return null;
    } catch {
      setAccessToken(null);
      clearLocalAuthSession();
      return null;
    } finally {
      refreshPromise = null;
    }
  };

  // 4-second timeout race so silentRefresh never indefinitely blocks the UI
  refreshPromise = Promise.race([
    doRefresh(),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000)),
  ]);

  return refreshPromise;
};

/**
 * Hospital logout: revokes backend token version and cookie, clears in-memory state.
 */
export const postHospitalLogout = async (): Promise<void> => {
  if (typeof window === "undefined") return;

  try {
    if (isSharedAuthEnabled()) {
      await postSharedLogout();
    }
  } catch {
    // ignore network failure
  }

  try {
    if (API_BASE_URL) {
      await axios.post(
        `${API_BASE_URL}/hospital/auth/logout`,
        {},
        { withCredentials: true }
      );
    }
  } catch {
    // proceed to clear local state even if network fails
  } finally {
    setAccessToken(null);
    clearLocalAuthSession();
  }
};
