import { Router } from "express";
import { requireHospitalAdmin } from "@src/middlewares/hospital-auth.middleware";
import WhatsappLogController from "../controllers/whatsapp-log.controller";

const router = Router();

router.use(requireHospitalAdmin());

router.get("/",       WhatsappLogController.getWhatsappLogs);
router.get("/stats",  WhatsappLogController.getWhatsappStats);

export default router;
