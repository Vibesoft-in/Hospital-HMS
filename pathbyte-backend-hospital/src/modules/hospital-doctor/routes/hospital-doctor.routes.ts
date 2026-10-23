import express from "express";
import { hospitalDoctorHandler, hospitalDoctorsHandler } from "../controllers/";
import { requireHospitalUser, requireHospitalAdmin, requireAnyRole } from "@src/middlewares/hospital-auth.middleware";

const router = express.Router();
const { readHospitalDoctors } = hospitalDoctorsHandler;
const { 
  readHospitalDoctor, 
  searchHospitalDoctorByDoctorId,
  updateHospitalDoctor, 
  createHospitalDoctor,
  deleteHospitalDoctor,
  restoreHospitalDoctor,
  updateDoctorSchedule,
  getDoctorDialysisSlots
} = hospitalDoctorHandler;

// All routes require authentication
router.use(requireHospitalUser());

// List doctors — ADMIN and RECEPTIONIST only (DOCTOR sees only their own via /:id)
router
  .route("")
  .get(requireAnyRole("ADMIN", "RECEPTIONIST"), readHospitalDoctors)
  .post(requireHospitalAdmin(), createHospitalDoctor); // Only admin can create

// Get doctor dialysis slots — any authenticated hospital user
router
  .route("/:id/dialysis-slots")
  .get(getDoctorDialysisSlots);

// Get by MongoDB _id — ADMIN, RECEPTIONIST, DOCTOR (doctor enforced in controller)
router
  .route("/:id")
  .get(requireAnyRole("ADMIN", "RECEPTIONIST", "DOCTOR"), readHospitalDoctor)
  .patch(requireHospitalAdmin(), updateHospitalDoctor) // Only admin can update
  .delete(requireHospitalAdmin(), deleteHospitalDoctor); // Only admin can delete

// Update doctor schedule (admin only)
router
  .route("/:id/schedule")
  .put(requireHospitalAdmin(), updateDoctorSchedule);

// Restore soft deleted doctor (admin only)
router
  .route("/:id/restore")
  .patch(requireHospitalAdmin(), restoreHospitalDoctor);

// Search by readable doctorId — ADMIN and RECEPTIONIST only
router
  .route("/search/doctorId/:doctorId")
  .get(requireAnyRole("ADMIN", "RECEPTIONIST"), searchHospitalDoctorByDoctorId);

export default router;