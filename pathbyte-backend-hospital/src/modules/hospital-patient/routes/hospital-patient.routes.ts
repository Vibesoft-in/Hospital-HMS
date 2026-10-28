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
// ADMIN, RECEPTIONIST, RECEPTIONIST2, DIALYSIS, PHARMACIST, XRAY, and DOCTOR can access patients (DOCTOR is read-only)
router.use(requireHospitalUser());
router.use(requireAnyRole("ADMIN", "RECEPTIONIST", "RECEPTIONIST2", "DIALYSIS", "PHARMACIST", "XRAY", "DOCTOR"));

router
  .route("")
  .get(requireAnyRole("ADMIN", "RECEPTIONIST", "RECEPTIONIST2", "DIALYSIS", "PHARMACIST", "XRAY", "DOCTOR"), readHospitalPatients)
  .post(requireAnyRole("ADMIN", "RECEPTIONIST", "RECEPTIONIST2", "XRAY", "DOCTOR"), createHospitalPatient);

// Search by readable MRD
router
  .route("/search/mrd/:mrd")
  .get(searchHospitalPatientByMrd);

// Search by ABHA address or ABHA number
router
  .route("/search/abha")
  .get(searchHospitalPatientByAbha);

// Get by MongoDB _id
router
  .route("/:id")
  .get(requireAnyRole("ADMIN", "RECEPTIONIST", "RECEPTIONIST2", "DIALYSIS", "PHARMACIST", "XRAY", "DOCTOR"), readHospitalPatient)
  .patch(requireAnyRole("ADMIN", "RECEPTIONIST", "RECEPTIONIST2", "XRAY", "DOCTOR"), updateHospitalPatient)
  .delete(requireHospitalAdmin(), deleteHospitalPatient); // Only admin can delete

// Restore soft deleted patient (admin only)
router
  .route("/:id/restore")
  .patch(requireHospitalAdmin(), restoreHospitalPatient);

export default router;