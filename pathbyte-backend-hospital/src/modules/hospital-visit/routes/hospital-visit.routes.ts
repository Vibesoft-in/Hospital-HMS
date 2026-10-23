import express from "express";
import { hospitalVisitHandler, hospitalVisitsHandler } from "../controllers/";
import exportHospitalVisitsHandler from "../controllers/hospital-visit-export.controller";
import { requireHospitalUser, requireHospitalAdmin, requireAnyRole, blockDoctorWrite } from "@src/middlewares/hospital-auth.middleware";

const router = express.Router();
const { readHospitalVisits } = hospitalVisitsHandler;
const { exportHospitalVisits } = exportHospitalVisitsHandler;
const { 
  readHospitalVisit, 
  searchHospitalVisitByVisitId,
  updateHospitalVisit, 
  createHospitalVisit,
  createHospitalVisitWithTransaction,
  createHospitalVisitWithPatient,
  deleteHospitalVisit,
  getVisitsByPatient,
  getDoctorSchedule,
  calculateVisitPrice,
  searchByAppointmentId,
  searchByTokenNumber,
  getPatientDisplayQueue,
  streamPatientDisplayQueue,
  reorderVisitToken
} = hospitalVisitHandler;

// Public endpoints (no auth required for TV displays)
router.route("/display/queue/:doctorId").get(getPatientDisplayQueue);
router.route("/display/stream/:doctorId").get(streamPatientDisplayQueue);

// Protected endpoints - require authentication
// ADMIN, RECEPTIONIST, DOCTOR, DIALYSIS can access visits
router.use(requireHospitalUser());
router.use(requireAnyRole("ADMIN", "RECEPTIONIST", "DOCTOR", "DIALYSIS"));

router
  .route("")
  .get(readHospitalVisits)
  .post(blockDoctorWrite(), createHospitalVisit); // DOCTOR cannot create

// Export visits to Excel
router.route("/export").get(exportHospitalVisits);

// Calculate visit price (before creating visit)
router
  .route("/calculate-price")
  .get(calculateVisitPrice);

// Create visit with existing patient and optional transaction
router
  .route("/with-transaction")
  .post(blockDoctorWrite(), createHospitalVisitWithTransaction);

// Create visit with new patient data and optional transaction
router
  .route("/with-patient")
  .post(blockDoctorWrite(), createHospitalVisitWithPatient);

router
  .route("/patient/:mrd")
  .get(getVisitsByPatient);

router
  .route("/doctor/:doctorId/schedule")
  .get(getDoctorSchedule);

// Get by MongoDB _id
router
  .route("/:id")
  .get(readHospitalVisit)
  .patch(blockDoctorWrite(), updateHospitalVisit) // DOCTOR cannot update
  .delete(requireHospitalAdmin(), deleteHospitalVisit); // Only admin can delete

// Reorder token number within same day
router
  .route("/:id/reorder-token")
  .patch(blockDoctorWrite(), reorderVisitToken);

// Search by readable visitId
router
  .route("/search/visitId/:visitId")
  .get(searchHospitalVisitByVisitId);

// Search by appointmentId
router
  .route("/search/appointmentId/:appointmentId")
  .get(searchByAppointmentId);

// Search by token number (requires date and doctorId query params)
router
  .route("/search/token/:tokenNumber")
  .get(searchByTokenNumber);

export default router;