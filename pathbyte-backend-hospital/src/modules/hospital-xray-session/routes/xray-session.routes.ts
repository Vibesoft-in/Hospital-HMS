import { Router } from "express";
import XraySessionController from "../controllers/xray-session.controller";
import { requireHospitalUser, requireAnyRole } from "@src/middlewares/hospital-auth.middleware";

const router = Router();

router.use(requireHospitalUser());
router.use(requireAnyRole("ADMIN", "XRAY"));

// Create a new xray session
router.post("/", XraySessionController.createXraySession);

// Get by MongoDB _id
router.get("/:id", XraySessionController.readXraySession);

// Get by readable sessionId (e.g. XRA00001)
router.get("/session/:sessionId", XraySessionController.searchXraySessionBySessionId);

// Update by MongoDB _id — also triggers SSE event if session has a tokenDate
router.put("/:id", XraySessionController.updateXraySession);

// Delete by MongoDB _id
router.delete("/:id", XraySessionController.deleteXraySession);

// Sessions grouped by visit / patient
router.get("/visit/:visitId",     XraySessionController.getSessionsByVisit);
router.get("/patient/:patientId", XraySessionController.getSessionsByPatient);

export default router;
