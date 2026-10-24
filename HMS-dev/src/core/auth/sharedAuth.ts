import axios from "axios";
import { API_BASE_URL, SHARED_AUTH_BASE_URL } from "@/environment";
import { setHmsAuthCookie } from "@/core/auth/sessionCookie";
import { setAccessToken } from "@/core/auth/accessToken";

const DEFAULT_TIMEOUT_MS = 5000;
const parsedTimeout = Number(process.env.NEXT_PUBLIC_API_TIMEOUT_MS);
const requestTimeoutMs =
  Number.isFinite(parsedTimeout) && parsedTimeout > 0 ? parsedTimeout : DEFAULT_TIMEOUT_MS;

/** Dedicated client so hospital API calls stay without credentials unless needed. */
export const sharedAuthClient = axios.create({
  withCredentials: true,
  timeout: requestTimeoutMs,
});

/**
 * Shared auth is opt-in:
 * - Set NEXT_PUBLIC_SHARED_AUTH_BASE_URL (recommended), or
 * - Set NEXT_PUBLIC_USE_SHARED_AUTH=true to use {API_BASE_URL}/shared/auth
 */
export const isSharedAuthEnabled = (): boolean => {
  if (SHARED_AUTH_BASE_URL?.trim()) return true;
  if (process.env.NEXT_PUBLIC_USE_SHARED_AUTH === "true" && API_BASE_URL) return true;
  return false;
};

export interface ISharedAuthUser {
  userId?: string;
  email?: string;
  name?: string;
  role?: string;
  roles?: string[];
  [key: string]: unknown;
}

export interface ISharedAuthPayload {
  type?: string;
  user?: ISharedAuthUser;
  accessToken?: string;
}

const getBase = (): string | null => {
  const raw = SHARED_AUTH_BASE_URL?.trim() || "";
  if (raw) return raw.replace(/\/$/, "");
  if (process.env.NEXT_PUBLIC_USE_SHARED_AUTH === "true" && API_BASE_URL) {
    return `${String(API_BASE_URL).replace(/\/$/, "")}/shared/auth`;
  }
  return null;
};

const normalizeUserForStorage = (user: ISharedAuthUser): Record<string, unknown> => {
  const roles = Array.isArray(user.roles) ? user.roles.filter(Boolean) : [];
  const roleFromArray = roles.length > 0 ? String(roles[0]) : "";
  const role = (user.role && String(user.role)) || roleFromArray;
  return {
    ...user,
    role: role || user.role,
  };
};

const unwrapPayload = (res: { data?: unknown }): ISharedAuthPayload => {
  const body = res?.data as Record<string, unknown> | undefined;
  if (!body) return {};
  const inner = body.data as ISharedAuthPayload | undefined;
  if (inner && typeof inner === "object" && ("type" in inner || "user" in inner)) {
    return inner;
  }
  return body as ISharedAuthPayload;
};

export type ISessionSyncResult = "none" | "restored";

/**
 * GET /me — restores localStorage whenever valid user payload exists.
 */
export const syncHospitalSessionFromSharedCookie = async (): Promise<ISessionSyncResult> => {
  const base = getBase();
  if (!isSharedAuthEnabled() || !base || typeof window === "undefined") return "none";
  try {
    const res = await sharedAuthClient.get(`${base}/me`);
    const payload = unwrapPayload(res);
    if (payload.user) {
      const normalized = normalizeUserForStorage(payload.user);
      if (payload.accessToken) {
        setAccessToken(payload.accessToken);
      }
      window.localStorage.setItem("authUser", JSON.stringify(normalized));
      setHmsAuthCookie();
      return "restored";
    }
    return "none";
  } catch {
    return "none";
  }
};

export interface ISharedLoginResult {
  ok: boolean;
  type?: string;
  message?: string;
}

/**
 * POST /login — shared cookie + optional accessToken for Bearer APIs.
 */
export const postSharedLogin = async (email: string, password: string): Promise<ISharedLoginResult> => {
  const base = getBase();
  if (!isSharedAuthEnabled() || !base || typeof window === "undefined") {
    return { ok: false, message: "Shared auth is not configured." };
  }
  try {
    const res = await sharedAuthClient.post(`${base}/login`, { email, password });
    const payload = unwrapPayload(res);
    if (!payload.user) {
      return { ok: false, message: "Login failed. Unexpected response." };
    }
    const normalized = normalizeUserForStorage(payload.user);
    if (payload.accessToken) {
      setAccessToken(payload.accessToken);
    }
    window.localStorage.setItem("authUser", JSON.stringify(normalized));
    setHmsAuthCookie();
    return { ok: true, type: payload.type };
  } catch (err: unknown) {
    const ax = err as { response?: { data?: { message?: string } } };
    const message =
      ax?.response?.data?.message || (err instanceof Error ? err.message : "") || "Login failed.";
    return { ok: false, message };
  }
};

/**
 * POST /logout — clears shared cookie domain-wide and in-memory token.
 */
export const postSharedLogout = async (): Promise<void> => {
  setAccessToken(null);
  const base = getBase();
  if (!isSharedAuthEnabled() || !base || typeof window === "undefined") return;
  try {
    await sharedAuthClient.post(`${base}/logout`);
  } catch {
    // still clear local session even if network fails
  }
};
