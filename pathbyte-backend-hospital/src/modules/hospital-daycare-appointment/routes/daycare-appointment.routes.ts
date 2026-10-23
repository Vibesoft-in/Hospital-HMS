import { Router } from "express";
import {
  DaycareAppointmentController,
  DaycareAppointmentsController,
} from "../controllers";
import daycareExportHandler from "../controllers/daycare-appointment-export.controller";
import { requireHospitalUser, requireHospitalAdmin, requireAnyRole, blockDoctorWrite } from "@src/middlewares/hospital-auth.middleware";

const router = Router();

// Calculate price (before creating appointment) - public or protected, keep before auth
router.post(
  "/calculate-price",
  DaycareAppointmentsController.calculatePrice
);

// All routes below require hospital auth
// ADMIN, RECEPTIONIST, DOCTOR, DIALYSIS can access daycare appointments
router.use(requireHospitalUser());
router.use(requireAnyRole("ADMIN", "RECEPTIONIST", "DOCTOR", "DIALYSIS"));

// Export daycare appointments to Excel
router.get("/export", daycareExportHandler.exportDaycareAppointments);

// Create day care appointment — RECEPTIONIST and DIALYSIS can create (not DOCTOR)
router.post(
  "/",
  blockDoctorWrite(),
  DaycareAppointmentsController.createDaycareAppointment
);

router.post(
  "/with-transaction",
  blockDoctorWrite(),
  DaycareAppointmentsController.createDaycareAppointmentWithTransaction
);

router.post(
  "/with-patient",
  blockDoctorWrite(),
  DaycareAppointmentsController.createDaycareAppointmentWithPatient
);

// Get all day care appointments (with filters)
router.get(
  "/",
  DaycareAppointmentsController.getDaycareAppointments
);

// Get day care appointments by patient
router.get(
  "/patient/:patientId",
  DaycareAppointmentsController.getAppointmentsByPatient
);

// Get day care appointments by doctor
router.get(
  "/doctor/:doctorId",
  DaycareAppointmentsController.getAppointmentsByDoctor
);

// Get single day care appointment by MongoDB _id
router.get(
  "/:id",
  DaycareAppointmentController.getDaycareAppointment
);

// Update day care appointment — DOCTOR cannot update
router.put(
  "/:id",
  blockDoctorWrite(),
  DaycareAppointmentController.updateDaycareAppointment
);

// Delete day care appointment — admin only
router.delete(
  "/:id",
  requireHospitalAdmin(),
  DaycareAppointmentController.deleteDaycareAppointment
);

// Search by readable daycareId
router.get(
  "/search/daycareId/:daycareId",
  DaycareAppointmentController.searchByDaycareId
);

export default router;
