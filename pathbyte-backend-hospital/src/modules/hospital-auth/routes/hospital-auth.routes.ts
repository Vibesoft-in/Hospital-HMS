import express from "express";
import hospitalAuthController from "../controllers/hospital-auth.controller";
import { requireHospitalUser, requireHospitalAdminStrict } from "@src/middlewares/hospital-auth.middleware";
import { loginLimiter } from "@src/middlewares/rate-limit.middleware";

const router = express.Router();

const { login, refresh, logout, getMe, updateMe, changePassword } = hospitalAuthController;

// Public routes
router.post("/login", loginLimiter, login);
router.post("/refresh", refresh);
router.post("/logout", logout);

// Protected routes - require authentication
router.get("/me", requireHospitalUser(), getMe);
router.patch("/me", requireHospitalUser(), updateMe);
router.post("/me/change-password", requireHospitalAdminStrict(), changePassword);

export default router;
