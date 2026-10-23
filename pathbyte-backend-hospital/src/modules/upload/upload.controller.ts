import { Request, Response, NextFunction } from "express";
import { AppError } from "@src/libs/errors";
import { uploadToS3, getS3SignedUrl } from "@src/libs/utils/s3Upload";

async function uploadFile(req: Request, res: Response, next: NextFunction) {
  try {
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) {
      return next(new AppError(400, "No file provided. Send a file in the 'file' field."));
    }

    const folder = (req.query.folder as string) || "uploads";
    const originalUrl = await uploadToS3(file.buffer, file.originalname, file.mimetype, folder);
    const signedUrl   = await getS3SignedUrl(originalUrl);

    return res.success(
      { originalUrl, signedUrl },
      "File uploaded successfully"
    );
  } catch (err: any) {
    return next(new AppError(500, "Unable to upload file", err.message));
  }
}

export default { uploadFile };
