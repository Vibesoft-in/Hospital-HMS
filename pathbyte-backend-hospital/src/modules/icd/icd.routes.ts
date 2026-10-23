import { Router } from "express";
import { requireHospitalUser } from "@src/middlewares/hospital-auth.middleware";
import { searchDiagnosis } from "./icd.controller";

const router = Router();

// GET /api/v1/hospital/icd/search?term=diabetes
router.get("/search", requireHospitalUser(), searchDiagnosis);

export default router;
