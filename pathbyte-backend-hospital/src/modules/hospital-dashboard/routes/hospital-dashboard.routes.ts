import { Router } from "express";
import hospitalDashboardController from "../controllers/hospital-dashboard.controller";

const router = Router();

// Verify dashboard password
router.post("/verify-password", hospitalDashboardController.verifyDashboardPassword);

// Get overview statistics (top 4 cards)
router.get("/overview", hospitalDashboardController.getOverview);

// Get visit statistics with period breakdown
router.get("/visit-statistics", hospitalDashboardController.getVisitStatistics);

// Get daycare appointment statistics with period breakdown
router.get("/daycare-statistics", hospitalDashboardController.getDaycareStatistics);

// Get recent transactions
router.get("/recent-transactions", hospitalDashboardController.getRecentTransactions);

// Get recent visits
router.get("/recent-visits", hospitalDashboardController.getRecentVisits);

// Get revenue statistics with period breakdown
router.get("/revenue-statistics", hospitalDashboardController.getRevenueStatistics);

// Get visit-only revenue statistics
router.get("/visit-revenue-statistics", hospitalDashboardController.getVisitRevenueStatistics);

// Get daycare-only revenue statistics
router.get("/daycare-revenue-statistics", hospitalDashboardController.getDaycareRevenueStatistics);

export default router;
