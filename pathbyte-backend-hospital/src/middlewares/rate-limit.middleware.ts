import rateLimit, { Options } from "express-rate-limit";

const defaultValidate = { trustProxy: false };

export const createLimiter = (options: Partial<Options>) => {
  return rateLimit({
    standardHeaders: "draft-7",
    legacyHeaders: false,
    validate: defaultValidate,
    ...options,
  });
};

/**
 * Global API rate limiter for /api/v1 routes
 * Standard: 300 requests per 15 minutes per IP
 */
export const globalApiLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: process.env.RATE_LIMIT_GLOBAL_MAX
    ? parseInt(process.env.RATE_LIMIT_GLOBAL_MAX, 10)
    : 300,
  message: {
    error: "TOO_MANY_REQUESTS",
    message: "Too many requests from this IP, please try again after 15 minutes.",
  },
});

/**
 * Tighter rate limiter for token refresh (/auth/refresh)
 * Standard: 30 requests per 15 minutes per IP
 */
export const refreshLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: process.env.RATE_LIMIT_REFRESH_MAX
    ? parseInt(process.env.RATE_LIMIT_REFRESH_MAX, 10)
    : 30,
  message: {
    error: "TOO_MANY_REQUESTS",
    message: "Too many token refresh attempts from this IP, please try again after 15 minutes.",
  },
});

/**
 * Tighter rate limiter for patient search endpoints (/patients/search/*)
 * Standard: 60 requests per 15 minutes per IP
 */
export const patientSearchLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: process.env.RATE_LIMIT_SEARCH_MAX
    ? parseInt(process.env.RATE_LIMIT_SEARCH_MAX, 10)
    : 60,
  message: {
    error: "TOO_MANY_REQUESTS",
    message: "Too many patient search requests from this IP, please try again after 15 minutes.",
  },
});

/**
 * Login rate limiter for /auth/login
 * Standard: 15 requests per 15 minutes per IP
 */
export const loginLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: process.env.RATE_LIMIT_LOGIN_MAX
    ? parseInt(process.env.RATE_LIMIT_LOGIN_MAX, 10)
    : 15,
  message: {
    error: "TOO_MANY_REQUESTS",
    message: "Too many login attempts. Please try again after 15 minutes.",
  },
});
