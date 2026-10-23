import { Router } from "express";
import { HospitalPharmaTokenController, HospitalPharmaTokensController } from "../controllers";
import { requireHospitalUser, requireHospitalAdmin } from "@src/middlewares/hospital-auth.middleware";

const router = Router();

// SSE stream — no auth (TV display screens don't have tokens)
router.get("/stream", HospitalPharmaTokensController.streamPharmaTokenQueue);

// All other routes require auth
router.use(requireHospitalUser());

router.get("/",        HospitalPharmaTokensController.getHospitalPharmaTokens);
router.get("/queue",   HospitalPharmaTokensController.getPharmaTokenQueue);
router.post("/",       HospitalPharmaTokenController.createHospitalPharmaToken);
router.get("/:id",     HospitalPharmaTokenController.getHospitalPharmaToken);
router.patch("/:id",   HospitalPharmaTokenController.updateHospitalPharmaToken);
router.delete("/:id",  requireHospitalAdmin(), HospitalPharmaTokenController.deleteHospitalPharmaToken);

export default router;
