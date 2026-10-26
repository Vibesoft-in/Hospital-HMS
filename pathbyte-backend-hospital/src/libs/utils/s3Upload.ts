import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";

const REGION      = process.env.AWS_REGION      || "ap-south-1";
const BUCKET_NAME = process.env.S3_BUCKET_NAME  || "pathbyte-uploads";
const SIGNED_URL_EXPIRES = parseInt(process.env.S3_SIGNED_URL_EXPIRES || "3600");

// Create S3 client lazily so env vars are guaranteed to be loaded
function getS3Client(): S3Client {
  return new S3Client({
    region: process.env.AWS_REGION || REGION,
    credentials: {
      accessKeyId:     process.env.AWS_ACCESS_KEY_ID     || "",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    },
  });
}

function getBucket(): string {
  return process.env.S3_BUCKET_NAME || BUCKET_NAME;
}

/**
 * Upload a file buffer to S3.
 * Returns the original S3 key path (e.g. "uploads/uuid-filename.jpg")
 */
export async function uploadToS3(
  file: Buffer,
  originalName: string,
  contentType: string,
  folder: string = "uploads"
): Promise<string> {
  const ext = originalName.includes(".") ? originalName.split(".").pop() : "";
  const key = `${folder}/${uuidv4()}${ext ? "." + ext : ""}`;

  await getS3Client().send(
    new PutObjectCommand({
      Bucket:      getBucket(),
      Key:         key,
      Body:        file,
      ContentType: contentType,
    })
  );

  return key;
}

export async function getS3SignedUrl(key: string, expiresIn: number = SIGNED_URL_EXPIRES): Promise<string> {
  if (!key) return "";
  const cleanKey = key.includes("amazonaws.com/") ? key.split("amazonaws.com/")[1] : key;
  try {
    return await getSignedUrl(
      getS3Client(),
      new GetObjectCommand({ Bucket: getBucket(), Key: cleanKey }),
      { expiresIn }
    );
  } catch {
    return key;
  }
}

/**
 * Fetch a file from S3 and return it as a base64 string.
 * Used for embedding attachments directly into FHIR bundles.
 */
export async function getS3FileBase64(key: string): Promise<string | null> {
  if (!key) return null;
  const cleanKey = key.includes("amazonaws.com/") ? key.split("amazonaws.com/")[1] : key;
  try {
    const response = await getS3Client().send(
      new GetObjectCommand({ Bucket: getBucket(), Key: cleanKey })
    );
    if (!response.Body) return null;
    const byteArray = await response.Body.transformToByteArray();
    return Buffer.from(byteArray).toString("base64");
  } catch (err) {
    console.error(`Failed to fetch S3 file ${cleanKey} as base64:`, err);
    return null;
  }
}

import mongoose from "mongoose";

function isObjectId(val: any): boolean {
  if (!val) return false;
  return (
    val._bsontype === "ObjectId" ||
    val._bsontype === "ObjectID" ||
    val instanceof mongoose.Types.ObjectId ||
    (typeof val === "object" && val.constructor?.name === "ObjectId")
  );
}

/**
 * Recursively transform any S3 key/URL strings in a response object to signed URLs.
 * Detects both raw keys (uploads/...) and full S3 URLs.
 */
export function transformS3Urls(obj: any): any {
  if (!obj) return obj;
  if (obj instanceof Date || Buffer.isBuffer(obj)) return obj;
  if (isObjectId(obj)) return obj.toString();
  if (Array.isArray(obj)) return obj.map(transformS3Urls);
  if (typeof obj !== "object") return obj;

  const raw = (obj && typeof obj.toObject === "function") ? obj.toObject() : obj;
  if (raw instanceof Date || Buffer.isBuffer(raw)) return raw;
  if (isObjectId(raw)) return raw.toString();

  const result: any = { ...raw };
  for (const [k, v] of Object.entries(result)) {
    if (v instanceof Date || Buffer.isBuffer(v)) {
      result[k] = v;
    } else if (isObjectId(v)) {
      result[k] = (v as any).toString();
    } else if (typeof v === "string" && isS3Path(v)) {
      // Replace synchronously with a placeholder — callers should use transformS3UrlsAsync for real signed URLs
      // For backward compat keep sync version returning the value as-is
      result[k] = v;
    } else if (v !== null && typeof v === "object") {
      result[k] = transformS3Urls(v);
    }
  }
  return result;
}

/**
 * Async version — actually generates signed URLs.
 */
export async function transformS3UrlsAsync(obj: any): Promise<any> {
  if (!obj) return obj;
  if (obj instanceof Date || Buffer.isBuffer(obj)) return obj;
  if (isObjectId(obj)) return (obj as any).toString();
  if (Array.isArray(obj)) return Promise.all(obj.map(transformS3UrlsAsync));
  if (typeof obj !== "object") return obj;

  const raw = (obj && typeof obj.toObject === "function") ? obj.toObject() : obj;
  if (raw instanceof Date || Buffer.isBuffer(raw)) return raw;
  if (isObjectId(raw)) return (raw as any).toString();

  const result: any = { ...raw };
  await Promise.all(
    Object.entries(result).map(async ([k, v]) => {
      if (v instanceof Date || Buffer.isBuffer(v)) {
        result[k] = v;
      } else if (isObjectId(v)) {
        result[k] = (v as any).toString();
      } else if (typeof v === "string" && isS3Path(v)) {
        result[k] = await getS3SignedUrl(v);
      } else if (v !== null && typeof v === "object") {
        result[k] = await transformS3UrlsAsync(v);
      }
    })
  );
  return result;
}

function isS3Path(value: string): boolean {
  return (
    value.includes("amazonaws.com/") ||
    value.startsWith("uploads/") ||
    value.startsWith("hospital/") ||
    value.startsWith("pathlab/")
  );
}

export interface UploadResult {
  originalUrl: string; // S3 key — store this in DB
  signedUrl:   string; // presigned URL — use for preview/display
}
