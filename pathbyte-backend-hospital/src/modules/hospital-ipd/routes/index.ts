import { Router } from "express";
import controller from "../controllers/index";
import ipdExportController from "../controllers/ipd-export.controller";

const router = Router();

router.post("/calculate-price", controller.calculatePrice);
router.get("/export", ipdExportController.exportIPDs);
router.post("/", controller.create);
router.get("/", controller.list);
router.get("/:id", controller.getById);
router.put("/:id", controller.update);
router.delete("/:id", controller.remove);
router.post("/:id/billing", controller.addBillingCharge);
router.post("/:id/billing/bed", controller.addBedCharge);
router.post("/:id/billing/nursing", controller.addNursingCharge);
router.delete("/:id/billing/:chargeId", controller.removeBillingCharge);
router.patch("/:id/billing/:chargeId/completion", controller.updateBillingChargeCompletion);
router.put("/:id/discharge-summary", controller.saveDischargeSummary);
router.post("/:id/discharge", controller.discharge);
router.post("/:id/lama", controller.lama);
router.post("/:id/dor", controller.dor);
router.post("/:id/death", controller.death);
router.post("/:id/refer", controller.refer);
router.post("/:id/cancel", controller.cancel);

export default router;
