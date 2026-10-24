import express from "express";
import request from "supertest";
import expressLoader from "../loaders/expressLoader";
import { _resetEnumerationTracking } from "../middlewares/security.middleware";

describe("Security Middlewares in expressLoader", () => {
  let app: express.Application;

  beforeEach(async () => {
    _resetEnumerationTracking();
    app = express();
    // Add test endpoints
    await expressLoader({ app });
    // Add test routes to test responses
    app.get("/test-unauthorized", (_req, res) => {
      res.status(401).json({ error: "UNAUTHORIZED", message: "Invalid session" });
    });
    app.get("/test-forbidden", (_req, res) => {
      res.status(403).json({ error: "FORBIDDEN", message: "Permission denied" });
    });
  });

  afterEach(() => {
    _resetEnumerationTracking();
  });

  describe("blockScanners middleware", () => {
    it("blocks scanner User-Agent with 403 Forbidden", async () => {
      const scannerAgents = ["sqlmap/1.5", "Nikto/2.1.6", "gobuster 3.1.0", "burpcollaborator"];

      for (const ua of scannerAgents) {
        const res = await request(app)
          .get("/status")
          .set("User-Agent", ua);

        expect(res.status).toBe(403);
        expect(res.body.error).toBe("FORBIDDEN");
      }
    });

    it("allows standard User-Agent", async () => {
      const res = await request(app)
        .get("/status")
        .set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)");

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("OK");
    });
  });

  describe("validateRequest middleware", () => {
    it("blocks path traversal attempts with 404 NOT_FOUND", async () => {
      const res = await request(app).get("/api/v1/../secret");
      expect(res.status).toBe(404);
      expect(res.body.error).toBe("NOT_FOUND");
    });

    it("blocks sensitive administrative probe paths with 404 NOT_FOUND", async () => {
      const sensitivePaths = ["/admin", "/admin/login", "/.env", "/.git/config", "/phpmyadmin", "/config"];

      for (const path of sensitivePaths) {
        const res = await request(app).get(path);
        expect(res.status).toBe(404);
        expect(res.body.error).toBe("NOT_FOUND");
      }
    });
  });

  describe("trackEnumeration middleware", () => {
    it("blocks IP after repeated 404s exceeding threshold", async () => {
      const testIp = "192.168.1.100";

      // Fire 21 404 requests (MAX_404_PER_MINUTE is 20)
      for (let i = 0; i < 21; i++) {
        await request(app)
          .get(`/non-existent-probe-${i}`)
          .set("X-Forwarded-For", testIp);
      }

      // 22nd request must be blocked with 403 even for /status
      const res = await request(app)
        .get("/status")
        .set("X-Forwarded-For", testIp);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe("FORBIDDEN");
    });
  });

  describe("evaluation of normalizeErrors", () => {
    it("preserves 401 Unauthorized for unauthenticated requests so frontend session expiry works", async () => {
      // /api/v1/hospital/auth/me requires auth; without token, it returns 401
      const res = await request(app).get("/api/v1/hospital/auth/me");
      expect(res.status).toBe(401);
    });

    it("demonstrates why normalizeErrors should NOT be enabled globally", async () => {
      const { normalizeErrors } = await import("../middlewares/security.middleware");
      const appWithNormalize = express();
      appWithNormalize.use(normalizeErrors);
      appWithNormalize.get("/auth-check", (_req, res) => {
        res.status(401).json({ error: "UNAUTHORIZED" });
      });

      const res = await request(appWithNormalize).get("/auth-check");
      // normalizeErrors converts 401 without auth header to 404, proving it would break frontend handling
      expect(res.status).toBe(404);
    });
  });
});
