import { Request, Response, NextFunction } from "express";
import { logger } from "@src/config/logger";

/**
 * Detect and block automated scanning tools
 */
export const blockScanners = (req: Request, res: Response, next: NextFunction): void => {
  if (req.method === "OPTIONS") {
    return next();
  }

  const userAgent = req.get("User-Agent")?.toLowerCase() || "";
  
  const scannerPatterns = [
    "gobuster", "dirbuster", "nikto", "sqlmap", "nmap", 
    "masscan", "zgrab", "acunetix", "nessus", "openvas",
    "metasploit", "burp", "nuclei", "httpx", "ffuf"
  ];
  
  const isScanner = scannerPatterns.some(pattern => userAgent.includes(pattern));
  
  if (isScanner) {
    logger.warn({
      ip: req.ip,
      userAgent,
      path: req.path,
      method: req.method
    }, "Blocked scanner attempt");
    
    res.status(403).json({ 
      error: "FORBIDDEN",
      message: "Access denied"
    });
    return;
  }
  
  next();
};

/**
 * Monitor for suspicious enumeration patterns
 * Track 404s per IP and block after threshold
 */
const notFoundCounts = new Map<string, { count: number; timestamp: number }>();
const BLOCKED_IPS = new Set<string>();
const MAX_404_PER_MINUTE = process.env.NODE_ENV === "test" ? 20 : 60;
const BLOCK_DURATION = process.env.NODE_ENV === "test" ? 60 * 60 * 1000 : 5 * 60 * 1000; // 5 minutes in production
const STATIC_EXT_REGEX = /\.(png|jpe?g|gif|svg|ico|webp|css|js|map|woff2?|ttf|eot)$/i;

export const trackEnumeration = (req: Request, res: Response, next: NextFunction): void => {
  // Never block or track OPTIONS preflight requests
  if (req.method === "OPTIONS") {
    return next();
  }

  const ip = req.ip || req.socket.remoteAddress || "unknown";
  
  // Check if IP is already blocked (except for health check)
  if (BLOCKED_IPS.has(ip) && req.path !== "/status") {
    logger.warn({ ip, path: req.path }, "Blocked IP attempted access");
    res.status(403).json({ 
      error: "FORBIDDEN",
      message: "Access denied"
    });
    return;
  }
  
  // Track response status
  const originalSend = res.send;
  res.send = function(data: any): Response {
    if (res.statusCode === 404 && !STATIC_EXT_REGEX.test(req.path)) {
      const now = Date.now();
      const record = notFoundCounts.get(ip);
      
      if (!record || now - record.timestamp > 60000) {
        // Reset counter after 1 minute
        notFoundCounts.set(ip, { count: 1, timestamp: now });
      } else {
        record.count++;
        
        if (record.count > MAX_404_PER_MINUTE) {
          BLOCKED_IPS.add(ip);
          
          logger.error({
            ip,
            notFoundCount: record.count,
            path: req.path,
            userAgent: req.get("User-Agent")
          }, "Enumeration attack detected - IP blocked");
          
          // Unblock after duration
          const unblockTimer = setTimeout(() => {
            BLOCKED_IPS.delete(ip);
            notFoundCounts.delete(ip);
            logger.info({ ip }, "IP unblocked after timeout");
          }, BLOCK_DURATION);
          if (unblockTimer.unref) {
            unblockTimer.unref();
          }
          
          res.status(403);
          res.setHeader("Content-Type", "application/json");
          return originalSend.call(this, JSON.stringify({ 
            error: "FORBIDDEN",
            message: "Access denied due to suspicious activity"
          }));
        }
      }
    }
    
    return originalSend.call(this, data);
  };
  
  next();
};

export const _resetEnumerationTracking = (): void => {
  notFoundCounts.clear();
  BLOCKED_IPS.clear();
};

/**
 * Clean up old tracking data periodically
 */
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of notFoundCounts.entries()) {
    if (now - record.timestamp > 60000) {
      notFoundCounts.delete(ip);
    }
  }
}, 60000); // Clean every minute
if (cleanupTimer.unref) {
  cleanupTimer.unref();
}

/**
 * Normalize error responses to prevent information disclosure
 * Don't reveal whether endpoint exists or authorization failed
 */
export const normalizeErrors = (req: Request, res: Response, next: NextFunction): void => {
  const originalStatus = res.status.bind(res);
  
  res.status = function(code: number) {
    // Convert 401/403 to 404 for non-authenticated requests
    // This prevents attackers from knowing valid endpoints
    if ((code === 401 || code === 403) && !req.headers.authorization) {
      logger.debug({
        originalStatus: code,
        path: req.path,
        method: req.method
      }, "Normalized error response to 404");
      return originalStatus(404);
    }
    
    return originalStatus(code);
  };
  
  next();
};

/**
 * Additional request validation
 */
export const validateRequest = (req: Request, res: Response, next: NextFunction): void => {
  if (req.method === "OPTIONS") {
    return next();
  }

  // Block requests with path traversal attempts
  if (req.path.includes("..") || req.path.includes("//")) {
    logger.warn({
      ip: req.ip,
      path: req.path,
      method: req.method
    }, "Path traversal attempt detected");
    
    res.status(404).json({ 
      error: "NOT_FOUND",
      message: "Resource not found"
    });
    return;
  }
  
  // Block requests to common admin/config paths
  const blockedPaths = [
    "/admin", "/phpmyadmin", "/pma", "/phpinfo",
    "/config", "/backup", "/.env", "/.git",
    "/wp-admin", "/wp-login", "/xmlrpc.php"
  ];
  
  const isBlockedPath = blockedPaths.some(blocked => 
    req.path.toLowerCase().startsWith(blocked)
  );
  
  if (isBlockedPath) {
    logger.warn({
      ip: req.ip,
      path: req.path,
      method: req.method
    }, "Blocked access to sensitive path");
    
    res.status(404).json({ 
      error: "NOT_FOUND",
      message: "Resource not found"
    });
    return;
  }
  
  next();
};
