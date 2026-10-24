import { Router } from "express";
import XraySessionsController from "../controllers/xray-sessions.controller";
import { requireHospitalUser, requireAnyRole } from "@src/middlewares/hospital-auth.middleware";

const router = Router();

// SSE stream — no auth required (display screens don't carry tokens)
router.get("/stream", XraySessionsController.streamXrayTokenQueue);

// All other routes require auth
router.use(requireHospitalUser());
router.use(requireAnyRole("ADMIN", "XRAY", "DOCTOR"));

// List sessions with pagination + filters
router.get("/",      XraySessionsController.readXraySessions);

// Walk-in token creation
router.post("/token", XraySessionsController.createXrayToken);

// Today's (or given date's) token queue
router.get("/queue",  XraySessionsController.getXrayTokenQueue);

export default router;
