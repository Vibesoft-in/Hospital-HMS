import { Router } from "express";
import {
  requireHospitalUser,
  requireAnyRole,
} from "@src/middlewares/hospital-auth.middleware";
import { exportDetailed, exportSummarized } from "./hospital-master-export.controller";

const router = Router();

// All master-export endpoints require a logged-in hospital user
router.use(requireHospitalUser());
router.use(requireAnyRole("ADMIN", "RECEPTIONIST", "DOCTOR"));

router.get("/detailed",    exportDetailed);
router.get("/summarized",  exportSummarized);

export default router;
