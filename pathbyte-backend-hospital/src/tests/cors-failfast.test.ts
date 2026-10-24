import express from "express";
import expressLoader from "../loaders/expressLoader";

describe("CORS ALLOWED_ORIGINS Fail-Fast in Production", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalAllowedOrigins = process.env.ALLOWED_ORIGINS;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.ALLOWED_ORIGINS = originalAllowedOrigins;
  });

  describe("when NODE_ENV is production", () => {
    beforeEach(() => {
      process.env.NODE_ENV = "production";
    });

    it("throws and fails fast when ALLOWED_ORIGINS is unset", async () => {
      delete process.env.ALLOWED_ORIGINS;
      const app = express();

      await expect(expressLoader({ app })).rejects.toThrow(
        /FATAL: ALLOWED_ORIGINS must be explicitly set/
      );
    });

    it("throws and fails fast when ALLOWED_ORIGINS is empty or whitespace", async () => {
      process.env.ALLOWED_ORIGINS = "   ";
      const app = express();

      await expect(expressLoader({ app })).rejects.toThrow(
        /FATAL: ALLOWED_ORIGINS must be explicitly set/
      );
    });

    it("throws and fails fast when ALLOWED_ORIGINS equals '*'", async () => {
      process.env.ALLOWED_ORIGINS = "*";
      const app = express();

      await expect(expressLoader({ app })).rejects.toThrow(
        /FATAL: ALLOWED_ORIGINS must be explicitly set/
      );
    });

    it("throws and fails fast when ALLOWED_ORIGINS equals '*' with whitespace", async () => {
      process.env.ALLOWED_ORIGINS = "  *  ";
      const app = express();

      await expect(expressLoader({ app })).rejects.toThrow(
        /FATAL: ALLOWED_ORIGINS must be explicitly set/
      );
    });

    it("initializes successfully when ALLOWED_ORIGINS has valid specific domain(s)", async () => {
      process.env.ALLOWED_ORIGINS = "https://hospital.example.com,https://admin.example.com";
      const app = express();

      await expect(expressLoader({ app })).resolves.toBeDefined();
    });
  });

  describe("when NODE_ENV is not production (e.g. development/test)", () => {
    it("allows unset ALLOWED_ORIGINS with permissive fallback in development", async () => {
      process.env.NODE_ENV = "development";
      delete process.env.ALLOWED_ORIGINS;
      const app = express();

      await expect(expressLoader({ app })).resolves.toBeDefined();
    });

    it("allows '*' ALLOWED_ORIGINS with permissive fallback in test", async () => {
      process.env.NODE_ENV = "test";
      process.env.ALLOWED_ORIGINS = "*";
      const app = express();

      await expect(expressLoader({ app })).resolves.toBeDefined();
    });
  });
});
