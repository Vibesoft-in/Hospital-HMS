import express from "express";
import { hospitalPatientHandler, hospitalPatientsHandler } from "../controllers/";
import { requireHospitalUser, requireHospitalAdmin, requireAnyRole } from "@src/middlewares/hospital-auth.middleware";

const router = express.Router();
const { readHospitalPatients } = hospitalPatientsHandler;
const { 
  readHospitalPatient, 
  searchHospitalPatientByMrd,
  searchHospitalPatientByAbha,
  updateHospitalPatient, 
  createHospitalPatient,
  deleteHospitalPatient,
  restoreHospitalPatient
} = hospitalPatientHandler;

// All routes require authentication
// ADMIN, RECEPTIONIST, RECEPTIONIST2, DIALYSIS, PHARMACIST, and XRAY can access patients
router.use(requireHospitalUser());
router.use(requireAnyRole("ADMIN", "RECEPTIONIST", "RECEPTIONIST2", "DIALYSIS", "PHARMACIST", "XRAY"));

router
  .route("")
  .get(readHospitalPatients)
  .post(requireAnyRole("ADMIN", "RECEPTIONIST", "RECEPTIONIST2", "XRAY"), createHospitalPatient);

// Get by MongoDB _id
router
  .route("/:id")
  .get(readHospitalPatient)
  .patch(requireAnyRole("ADMIN", "RECEPTIONIST", "RECEPTIONIST2", "XRAY"), updateHospitalPatient)
  .delete(requireHospitalAdmin(), deleteHospitalPatient); // Only admin can delete

// Search by readable MRD
router
  .route("/search/mrd/:mrd")
  .get(searchHospitalPatientByMrd);

// Search by ABHA address or ABHA number
router
  .route("/search/abha")
  .get(searchHospitalPatientByAbha);

// Restore soft deleted patient (admin only)
router
  .route("/:id/restore")
  .patch(requireHospitalAdmin(), restoreHospitalPatient);

export default router;