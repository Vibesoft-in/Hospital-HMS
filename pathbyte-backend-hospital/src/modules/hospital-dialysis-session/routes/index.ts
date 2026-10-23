import { Router } from "express";
import dialysisSessionRoutes from "./dialysis-session.routes";
import dialysisSessionsRoutes from "./dialysis-sessions.routes";

const router = Router();

router.use("/dialysis-session", dialysisSessionRoutes);
router.use("/dialysis-sessions", dialysisSessionsRoutes);

export default router;
