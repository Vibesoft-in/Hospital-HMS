import { Router } from "express";
import dialysisSessionsController from "../controllers/dialysis-sessions.controller";
import { requireHospitalUser } from "@src/middlewares/hospital-auth.middleware";

const router = Router();

router.use(requireHospitalUser());

// Monthly dialysis calendar
router.get("/calendar", dialysisSessionsController.getMonthlyCalendar);

// Get all dialysis sessions with pagination and filters
router.get("/", dialysisSessionsController.readDialysisSessions);

export default router;
