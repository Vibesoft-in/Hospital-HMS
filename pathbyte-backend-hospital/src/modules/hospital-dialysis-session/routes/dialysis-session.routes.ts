import { Router } from "express";
import dialysisSessionController from "../controllers/dialysis-session.controller";
import dialysisSessionsController from "../controllers/dialysis-sessions.controller";
import { requireHospitalUser, requireAnyRole } from "@src/middlewares/hospital-auth.middleware";

const router = Router();

// All dialysis routes require auth — ADMIN and DIALYSIS only
router.use(requireHospitalUser());
router.use(requireAnyRole("ADMIN", "DIALYSIS", "DOCTOR"));

// Monthly dialysis calendar
router.get("/calendar", dialysisSessionsController.getMonthlyCalendar);

// Create new dialysis session
router.post("/", dialysisSessionController.createDialysisSession);

// Get dialysis session by MongoDB _id
router.get("/:id", dialysisSessionController.readDialysisSession);

// Get dialysis session by sessionId (e.g., DIA00001)
router.get("/session/:sessionId", dialysisSessionController.searchDialysisSessionBySessionId);

// Update dialysis session by MongoDB _id
router.put("/:id", dialysisSessionController.updateDialysisSession);

// Delete dialysis session by MongoDB _id (soft delete)
router.delete("/:id", dialysisSessionController.deleteDialysisSession);

// Add monitoring reading to session
router.post("/:sessionId/monitoring-reading", dialysisSessionController.addMonitoringReading);

// Get all sessions for a visit
router.get("/visit/:visitId", dialysisSessionController.getSessionsByVisit);

// Get all sessions for a patient
router.get("/patient/:patientId", dialysisSessionController.getSessionsByPatient);

export default router;
