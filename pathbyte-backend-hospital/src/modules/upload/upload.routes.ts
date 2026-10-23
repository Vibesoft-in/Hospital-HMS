import { Router } from "express";
import multer from "multer";
import uploadController from "./upload.controller";
import { requireHospitalUser } from "@src/middlewares/hospital-auth.middleware";
import { APIError } from "@src/shared";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (_req: any, file: any, cb: any) => {
    const allowed = [
      "image/jpeg", "image/png", "image/gif", "image/webp",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error(`File type '${file.mimetype}' is not allowed.`));
  },
});

function validateMagicBytes(req: any, _res: any, next: any) {
  if (!req.file || !req.file.buffer) return next();
  const buf: Buffer = req.file.buffer;
  if (buf.length < 4) return next(new APIError(400, "Invalid file", "File is too small or corrupted."));

  const hex = buf.subarray(0, 8).toString("hex").toUpperCase();
  const isJpeg = hex.startsWith("FFD8FF");
  const isPng  = hex.startsWith("89504E47");
  const isGif  = hex.startsWith("47494638");
  const isPdf  = hex.startsWith("25504446");
  const isDocxOrZip = hex.startsWith("504B0304") || hex.startsWith("504B0506") || hex.startsWith("504B0708");
  const isOldDoc = hex.startsWith("D0CF11E0");
  const isWebp = hex.startsWith("52494646") && buf.length >= 12 && buf.subarray(8, 12).toString("ascii") === "WEBP";

  if (!isJpeg && !isPng && !isGif && !isPdf && !isDocxOrZip && !isOldDoc && !isWebp) {
    return next(new APIError(400, "Invalid file content", "File signature does not match allowed format."));
  }
  return next();
}

router.post("/hospital", requireHospitalUser(), upload.single("file"), validateMagicBytes, uploadController.uploadFile);

export default router;
