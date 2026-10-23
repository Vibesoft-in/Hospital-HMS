import { Router } from "express";
import hospitalRouter from "./hospital.routes";
import uploadRouter from "@src/modules/upload/upload.routes";

const router = Router();

router.use("/hospital", hospitalRouter);
router.use("/upload", uploadRouter);

export default router;
