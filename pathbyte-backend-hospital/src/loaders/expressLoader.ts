import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import compression from "compression";
import mongoSanitize from "express-mongo-sanitize";
import { errorHandler } from "../middlewares/error";
import routesV1 from "../routes/v1";
import { logger } from "@src/config/logger";
import successMiddleware from "@src/middlewares/res";
import { sanitizeInput } from "@src/middlewares/sanitize-input.middleware";
import {
  blockScanners,
  trackEnumeration,
  validateRequest,
} from "@src/middlewares/security.middleware";
import {
  globalApiLimiter,
  refreshLimiter,
  patientSearchLimiter,
} from "@src/middlewares/rate-limit.middleware";

export default async ({ app }: { app: express.Application }) => {
  // Enable trust proxy to get real IP from nginx
  app.enable("trust proxy");

  // Security headers via Helmet
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
      crossOriginOpenerPolicy: false,
      hsts: { maxAge: 31536000, includeSubDomains: true },
      contentSecurityPolicy: false,
      frameguard: { action: "sameorigin" },
      noSniff: true,
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    })
  );

  // Security middlewares: automated scanner detection, IP enumeration tracking, and path validation
  // NOTE on normalizeErrors: evaluated and deliberately omitted from global middleware.
  // Converting 401/403 responses to 404 masks valid authentication/authorization failures,
  // which breaks frontend session-expiry handling, silent refresh-token flows, and login redirects.
  app.use(blockScanners);
  app.use(trackEnumeration);
  app.use(validateRequest);

  // CORS configuration - MUST be before any other middleware
  const isProduction = process.env.NODE_ENV === "production";
  const allowedOrigins = process.env.ALLOWED_ORIGINS;

  if (isProduction && (!allowedOrigins || allowedOrigins.trim() === "" || allowedOrigins.trim() === "*")) {
    const errorMessage =
      "FATAL: ALLOWED_ORIGINS must be explicitly set to specific origin(s) in production and cannot be unset or '*'. " +
      "Running with credentials: true and wildcard or permissive origins in production is prohibited.";
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }

  const corsOrigins = allowedOrigins && allowedOrigins !== "*"
    ? allowedOrigins.split(",").map((o) => o.trim())
    : true;

  const corsOptions: cors.CorsOptions = {
    origin: corsOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    optionsSuccessStatus: 200,
  };

  app.use(cors(corsOptions));

  // Body parsing
  app.use(express.json({ limit: "10mb" }));
  app.use(cookieParser());
  app.use(compression());

  // HTML injection prevention - strip HTML tags from all inputs
  app.use(sanitizeInput);

  // MongoDB injection prevention
  app.use((req, _res, next) => {
    const options = { replaceWith: "_" };
    if (req.body) req.body = mongoSanitize.sanitize(req.body, options);
    if (req.params) req.params = mongoSanitize.sanitize(req.params, options);
    if (req.query) {
      const cleanQuery = mongoSanitize.sanitize({ ...req.query }, options);
      for (const k of Object.keys(req.query)) delete (req.query as any)[k];
      Object.assign(req.query, cleanQuery);
    }
    next();
  });

  app.get("/status", (_req, res) => {
    res.status(200).json({ status: "OK", message: "Welcome to Hospital API" });
  });
  app.head("/status", (_req, res) => {
    res.status(200).end();
  });

  // Rate limiters for /api/v1
  // Dedicated tighter rate limiters on sensitive endpoints
  app.use("/api/v1/hospital/auth/refresh", refreshLimiter);
  app.use("/api/v1/auth/refresh", refreshLimiter);
  app.use("/api/v1/hospital/patients/search", patientSearchLimiter);
  app.use("/api/v1/patients/search", patientSearchLimiter);

  // Global rate limiter for all /api/v1 routes
  app.use("/api/v1", globalApiLimiter);

  app.use(successMiddleware);
  app.use("/api/v1", routesV1);

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({
      error: "NOT_FOUND",
      message: "Resource not found",
    });
  });

  // Error handler
  app.use(errorHandler);

  return app;
};
