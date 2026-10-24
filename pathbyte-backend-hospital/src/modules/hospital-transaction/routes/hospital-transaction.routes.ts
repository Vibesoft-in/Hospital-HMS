import express from "express";
import { hospitalTransactionHandler, hospitalTransactionsHandler } from "../controllers/";
import exportHandler from "../controllers/hospital-transaction-export.controller";
import { requireHospitalUser, requireHospitalAdminStrict, requireAnyRole } from "@src/middlewares/hospital-auth.middleware";

const router = express.Router();
const { readHospitalTransactions } = hospitalTransactionsHandler;
const { exportHospitalTransactions } = exportHandler;
const { 
  readHospitalTransaction, 
  searchHospitalTransactionByTransactionId,
  updateHospitalTransaction, 
  createHospitalTransaction,
  deleteHospitalTransaction,
  getTransactionsByVisit
} = hospitalTransactionHandler;

// All routes require authentication
router.use(requireHospitalUser());

router
  .route("")
  .get(readHospitalTransactions)
  .post(requireAnyRole("ADMIN", "RECEPTIONIST", "RECEPTIONIST2", "XRAY"), createHospitalTransaction);

// Export transactions to Excel (read-only — accountants allowed)
router.route("/export").get(exportHospitalTransactions);

// Get by MongoDB _id
router
  .route("/:id")
  .get(readHospitalTransaction)
  .patch(requireHospitalAdminStrict(), updateHospitalTransaction) // Only admin can update
  .delete(requireHospitalAdminStrict(), deleteHospitalTransaction); // Only admin can delete

// Search by readable transactionId
router
  .route("/search/transactionId/:transactionId")
  .get(searchHospitalTransactionByTransactionId);

// Get transactions by visit ID
router.get("/visit/:visitId", getTransactionsByVisit);

export default router;