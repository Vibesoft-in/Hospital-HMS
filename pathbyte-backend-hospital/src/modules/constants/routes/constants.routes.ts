import { Router } from "express";
import constantController from "../controllers/constant.controller";
import constantsController from "../controllers/constants.controller";
import { requireHospitalUser, requireHospitalAdmin } from "@src/middlewares/hospital-auth.middleware";

const router = Router();

// All routes require authentication
router.use(requireHospitalUser());

// Get all constants (with pagination and filters)
router.get("/", constantsController.readConstants);

// Get constants by category
router.get("/category/:category", constantController.getConstantsByCategory);

// Get constant by key
router.get("/key/:key", constantController.getConstantByKey);

// Get constant by ID
router.get("/:id", constantController.getConstantById);

// Create constant (admin only)
router.post("/", requireHospitalAdmin(), constantController.createConstant);

// Update constant by key (admin only)
router.patch("/key/:key", requireHospitalAdmin(), constantController.updateConstantByKey);

// Update constant by ID (admin only)
router.patch("/:id", requireHospitalAdmin(), constantController.updateConstantById);

// Delete constant by key (admin only)
router.delete("/key/:key", requireHospitalAdmin(), constantController.deleteConstantByKey);

// Delete constant by ID (admin only)
router.delete("/:id", requireHospitalAdmin(), constantController.deleteConstantById);

export default router;
