import express from "express";
import { hospitalProcedureHandler, hospitalProceduresHandler } from "../controllers/";
import { requireHospitalUser, requireHospitalAdmin, requireAnyRole } from "@src/middlewares/hospital-auth.middleware";

const router = express.Router();
const { readHospitalProcedures, readProceduresByCategory, readProcedureCategories } = hospitalProceduresHandler;
const { 
  readHospitalProcedure, 
  searchHospitalProcedureByProcedureId,
  updateHospitalProcedure, 
  createHospitalProcedure,
  deleteHospitalProcedure 
} = hospitalProcedureHandler;

// All routes require authentication
router.use(requireHospitalUser());

router
  .route("")
  .get(readHospitalProcedures)
  .post(requireAnyRole("ADMIN", "XRAY"), createHospitalProcedure); // ADMIN or XRAY can create

router
  .route("/categories")
  .get(readProcedureCategories);

router
  .route("/category/:category")
  .get(readProceduresByCategory);

// Get by MongoDB _id
router
  .route("/:id")
  .get(readHospitalProcedure)
  .patch(requireAnyRole("ADMIN", "XRAY"), updateHospitalProcedure) // ADMIN or XRAY can update
  .delete(requireHospitalAdmin(), deleteHospitalProcedure); // Only admin can delete

// Search by readable procedureId
router
  .route("/search/procedureId/:procedureId")
  .get(searchHospitalProcedureByProcedureId);

export default router;