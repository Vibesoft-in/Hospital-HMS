import axios from "axios";

let axiosAuthInitialized = false;
const DEFAULT_TIMEOUT_MS = 15000;
const parsedTimeout = Number(process.env.NEXT_PUBLIC_API_TIMEOUT_MS);
const requestTimeoutMs =
  Number.isFinite(parsedTimeout) && parsedTimeout > 0 ? parsedTimeout : DEFAULT_TIMEOUT_MS;

axios.defaults.timeout = requestTimeoutMs;

if (typeof window !== "undefined" && !axiosAuthInitialized) {
  axiosAuthInitialized = true;

  axios.interceptors.request.use(
    (config) => {
      try {
        const token = window.localStorage.getItem("authToken");
        if (token) {
          config.headers = config.headers ?? {};
          if (!config.headers["Authorization"]) {
            config.headers["Authorization"] = `Bearer ${token}`;
          }
        }
      } catch {
        // Ignore storage errors and proceed without auth header
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      const statusCode = error?.response?.status;
      const errorCode = error?.code;

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
