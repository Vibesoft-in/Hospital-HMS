import { Router } from "express";
import controller from "../controllers/index";

const router = Router();

router.post("/", controller.create);
router.get("/", controller.list);
router.get("/:id", controller.getById);
router.put("/:id", controller.update);
router.delete("/:id", controller.remove);

export default router;
