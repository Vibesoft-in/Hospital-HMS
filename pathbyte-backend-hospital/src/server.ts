import path from "path";
import dotenv from "dotenv";

// Load env FIRST — before any other imports read process.env at module level
const envFile = `.env.${process.env.NODE_ENV || "development"}`;
dotenv.config({ path: path.resolve(process.cwd(), "config", "environments", envFile) });

import "module-alias/register";
import express from "express";
import { logger } from "@src/config/logger";
import app from "./app";

async function startServer() {
  try {
    const expressApp = express();
    await app({ expressApp });
    const PORT = process.env.PORT || 3000;
    expressApp.listen(PORT, () =>
      logger.info(`API listening on :${PORT}`)
    );
  } catch (err) {
    logger.error({ err }, "Failed to start server");
    console.error("Server startup error:", err);
    process.exit(1);
  }
}

startServer();
