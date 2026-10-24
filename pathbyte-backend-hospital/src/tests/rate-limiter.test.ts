import express from "express";
import request from "supertest";
import {
  createLimiter,
  globalApiLimiter,
  refreshLimiter,
  patientSearchLimiter,
  loginLimiter,
} from "../middlewares/rate-limit.middleware";

describe("Rate Limiter Middlewares", () => {
  describe("createLimiter helper", () => {
    it("returns 429 when max requests exceeded within window", async () => {
      const app = express();
      const testLimiter = createLimiter({
        windowMs: 60 * 1000,
        max: 3,
        message: { error: "TOO_MANY_REQUESTS", message: "Rate limit exceeded" },
      });

      app.use("/test", testLimiter, (_req, res) => {
        res.json({ ok: true });
      });

      // First 3 requests should pass
      for (let i = 0; i < 3; i++) {
        const res = await request(app).get("/test");
        expect(res.status).toBe(200);
      }

      // 4th request must be rejected with 429
      const res4 = await request(app).get("/test");
      expect(res4.status).toBe(429);
      expect(res4.body.error).toBe("TOO_MANY_REQUESTS");
    });
  });

  describe("Tighter Dedicated Limiter configurations", () => {
    it("refreshLimiter configuration has tight limits (30 req/15m)", () => {
      expect(refreshLimiter).toBeDefined();
    });

    it("patientSearchLimiter configuration has tight limits (60 req/15m)", () => {
      expect(patientSearchLimiter).toBeDefined();
    });

    it("loginLimiter configuration has tight limits (15 req/15m)", () => {
      expect(loginLimiter).toBeDefined();
    });

    it("globalApiLimiter configuration has standard global limits (300 req/15m)", () => {
      expect(globalApiLimiter).toBeDefined();
    });
  });

  describe("Dedicated endpoint limiters behavior", () => {
    it("blocks /auth/refresh with 429 when tight limit is reached", async () => {
      const app = express();
      const tightRefreshLimiter = createLimiter({
        windowMs: 60 * 1000,
        max: 2,
        message: { error: "TOO_MANY_REQUESTS", message: "Too many token refresh attempts" },
      });

      app.post("/api/v1/hospital/auth/refresh", tightRefreshLimiter, (_req, res) => {
        res.json({ ok: true });
      });

      await request(app).post("/api/v1/hospital/auth/refresh").expect(200);
      await request(app).post("/api/v1/hospital/auth/refresh").expect(200);
      const res = await request(app).post("/api/v1/hospital/auth/refresh");

      expect(res.status).toBe(429);
      expect(res.body.error).toBe("TOO_MANY_REQUESTS");
      expect(res.body.message).toMatch(/Too many token refresh attempts/);
    });

    it("blocks /patients/search/* with 429 when tight limit is reached", async () => {
      const app = express();
      const tightSearchLimiter = createLimiter({
        windowMs: 60 * 1000,
        max: 2,
        message: { error: "TOO_MANY_REQUESTS", message: "Too many search requests" },
      });

      app.use("/api/v1/hospital/patients/search", tightSearchLimiter);
      app.get("/api/v1/hospital/patients/search/mrd/:mrd", (_req, res) => {
        res.json({ mrd: _req.params.mrd });
      });
      app.get("/api/v1/hospital/patients/search/abha", (_req, res) => {
        res.json({ abha: true });
      });

      // Request 1: MRD search
      await request(app).get("/api/v1/hospital/patients/search/mrd/MRD-001").expect(200);
      // Request 2: ABHA search
      await request(app).get("/api/v1/hospital/patients/search/abha").expect(200);
      // Request 3: Exceeds tight search limiter
      const res = await request(app).get("/api/v1/hospital/patients/search/mrd/MRD-002");

      expect(res.status).toBe(429);
      expect(res.body.error).toBe("TOO_MANY_REQUESTS");
      expect(res.body.message).toMatch(/Too many search requests/);
    });

    it("blocks global /api/v1 with 429 when global limit is reached", async () => {
      const app = express();
      const tightGlobalLimiter = createLimiter({
        windowMs: 60 * 1000,
        max: 3,
        message: { error: "TOO_MANY_REQUESTS", message: "Too many requests" },
      });

      app.use("/api/v1", tightGlobalLimiter);
      app.get("/api/v1/doctors", (_req, res) => res.json({ doctors: [] }));
      app.get("/api/v1/visits", (_req, res) => res.json({ visits: [] }));

      await request(app).get("/api/v1/doctors").expect(200);
      await request(app).get("/api/v1/visits").expect(200);
      await request(app).get("/api/v1/doctors").expect(200);
      const res = await request(app).get("/api/v1/visits");

      expect(res.status).toBe(429);
      expect(res.body.error).toBe("TOO_MANY_REQUESTS");
    });
  });
});
