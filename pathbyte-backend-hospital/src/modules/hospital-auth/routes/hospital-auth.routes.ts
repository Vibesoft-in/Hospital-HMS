import express from "express";
import rateLimit from "express-rate-limit";
import hospitalAuthController from "../controllers/hospital-auth.controller";
import { requireHospitalUser } from "@src/middlewares/hospital-auth.middleware";

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { error: "TOO_MANY_REQUESTS", message: "Too many login attempts. Please try again after 15 minutes." },
});

const router = express.Router();

const { login, refresh, logout, getMe, updateMe, changePassword } = hospitalAuthController;

// Public routes
router.post("/login", loginLimiter, login);
router.post("/refresh", refresh);
router.post("/logout", logout);

// Protected routes - require authentication
router.get("/me", requireHospitalUser(), getMe);
router.patch("/me", requireHospitalUser(), updateMe);
router.post("/me/change-password", requireHospitalUser(), changePassword);

export default router;
