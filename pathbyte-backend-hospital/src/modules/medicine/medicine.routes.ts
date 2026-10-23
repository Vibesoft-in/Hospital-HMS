import { Router } from "express";
import multer from "multer";
import { requireHospitalUser, requireHospitalAdmin } from "@src/middlewares/hospital-auth.middleware";
import { importMedicines, listMedicines, listMedicineTypes, exportMedicines } from "./medicine.controller";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// POST /api/v1/hospital/medicines/import  — admin only, uploads Excel
router.post("/import", requireHospitalAdmin(), upload.single("file"), importMedicines);

// GET  /api/v1/hospital/medicines/export  — admin only, downloads Excel
router.get("/export", requireHospitalAdmin(), exportMedicines);

// GET  /api/v1/hospital/medicines/types  — all unique medicine types
router.get("/types", requireHospitalUser(), listMedicineTypes);

// GET  /api/v1/hospital/medicines?search=para&type=Tablet&page=1&limit=20  — any hospital user
router.get("/", requireHospitalUser(), listMedicines);

export default router;
