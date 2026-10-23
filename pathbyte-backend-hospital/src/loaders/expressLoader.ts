import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import compression from "compression";
import mongoSanitize from "express-mongo-sanitize";
import { errorHandler } from "../middlewares/error";
import routesV1 from "../routes/v1";
import successMiddleware from "@src/middlewares/res";
import { sanitizeInput } from "@src/middlewares/sanitize-input.middleware";

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

  // CORS configuration - MUST be before any other middleware
  const allowedOrigins = process.env.ALLOWED_ORIGINS;
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
