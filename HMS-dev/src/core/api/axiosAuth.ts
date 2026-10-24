import axios from "axios";
import { getAccessToken, silentRefresh } from "@/core/auth/inMemoryToken";

let axiosAuthInitialized = false;
const DEFAULT_TIMEOUT_MS = 15000;
const parsedTimeout = Number(process.env.NEXT_PUBLIC_API_TIMEOUT_MS);
const requestTimeoutMs =
  Number.isFinite(parsedTimeout) && parsedTimeout > 0 ? parsedTimeout : DEFAULT_TIMEOUT_MS;

axios.defaults.timeout = requestTimeoutMs;
axios.defaults.withCredentials = true;

if (typeof window !== "undefined" && !axiosAuthInitialized) {
  axiosAuthInitialized = true;

  axios.interceptors.request.use(
    (config) => {
      try {
        const token = getAccessToken();
        if (token) {
          config.headers = config.headers ?? {};
          if (!config.headers["Authorization"]) {
            config.headers["Authorization"] = `Bearer ${token}`;
          }
        }
      } catch {
        // Ignore errors and proceed without auth header
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  axios.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error?.config;
      const statusCode = error?.response?.status;
      const errorCode = error?.code;

      const url = String(originalRequest?.url || "");
      const isAuthEndpoint = url.includes("/auth/login") || url.includes("/auth/refresh");

      if (statusCode === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint) {
        originalRequest._retry = true;
        try {
          const newToken = await silentRefresh();
          if (newToken) {
            originalRequest.headers = originalRequest.headers ?? {};
            originalRequest.headers["Authorization"] = `Bearer ${newToken}`;
            return axios(originalRequest);
          }
        } catch {
          // Silent refresh failed, fall through to rejection
        }
      }

      if (errorCode === "ECONNABORTED") {
        error.message = `Request timeout after ${requestTimeoutMs}ms`;
      } else if (statusCode === 504) {
        error.message = "Upstream server timeout (504). Please try again.";
      }

      return Promise.reject(error);
    }
  );
}

export {};
