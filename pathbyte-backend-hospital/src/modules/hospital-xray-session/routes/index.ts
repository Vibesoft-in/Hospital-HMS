import { Router } from "express";
import xraySessionRoutes from "./xray-session.routes";
import xraySessionsRoutes from "./xray-sessions.routes";

const router = Router();

router.use("/xray-session", xraySessionRoutes);
router.use("/xray-sessions", xraySessionsRoutes);

export default router;
