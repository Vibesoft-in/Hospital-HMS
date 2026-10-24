import { Request, Response, NextFunction } from "express";
import { stripHtmlTags, containsHtml, sanitizeRichText } from "@src/libs/utils/sanitizeHtml";

const RICH_TEXT_FIELDS = new Set([
  "reportHtml",
  "findings",
  "impression",
  "description",
  "metaData",
]);

/**
 * Middleware to sanitize all text inputs in request body
 * Recursively strips HTML tags from regular string fields, and sanitizes rich-text fields
 * Apply this middleware before validation
 */
export function sanitizeInput(req: Request, _res: Response, next: NextFunction) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  next();
}

/**
 * Recursively sanitize all string values in an object
 */
function sanitizeObject(obj: any, parentKey?: string): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, parentKey));
  }

  // Handle objects
  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        sanitized[key] = sanitizeObject(obj[key], key);
      }
    }
    return sanitized;
  }

  // Handle strings
  if (typeof obj === 'string') {
    if (parentKey && RICH_TEXT_FIELDS.has(parentKey)) {
      return sanitizeRichText(obj);
    }
    if (containsHtml(obj)) {
      return stripHtmlTags(obj);
    }
  }

  // Return other types as-is (numbers, booleans, etc.)
  return obj;
}

/**
 * List of routes/paths that should skip sanitization
 * Add paths here if they legitimately need to accept HTML
 * (e.g., rich text editors, HTML templates)
 */
const SANITIZATION_WHITELIST: string[] = [
  // Example: '/api/admin/templates',
  // Example: '/api/content/rich-editor',
];

/**
 * Conditional sanitization middleware - skips whitelisted routes
 */
export function conditionalSanitizeInput(req: Request, _res: Response, next: NextFunction) {
  const shouldSkip = SANITIZATION_WHITELIST.some(path => req.path.startsWith(path));
  
  if (shouldSkip) {
    return next();
  }
  
  return sanitizeInput(req, _res, next);
}
