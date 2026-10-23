import { Request, Response, NextFunction } from "express";
import { APIError } from "@src/shared";
import { verifyAccessToken, HospitalJwtPayload } from "@src/libs/jwt";
import HospitalUserModel from "@src/modules/hospital-auth/models/hospital-user.model";
import { HospitalUserRole } from "@src/modules/hospital-auth/models/hospital-user.types";

// Extend Request type to carry ownership filter and role helpers
declare global {
  namespace Express {
    interface Request {
      hospitalUser?: any;
      ownershipFilter?: Record<string, any>;
    }
  }
}

function isHospitalJwtPayload(payload: any): payload is HospitalJwtPayload {
  return payload && payload.type === "hospital" && typeof payload.role === "string";
}

/**
 * Core hospital auth middleware.
 * - Verifies JWT
 * - Attaches req.hospitalUser
 * - Injects req.ownershipFilter based on role:
 *     ADMIN      â†’ {} (no restriction)
 *     DIALYSIS   â†’ {} (no restriction)
 *     RECEPTIONIST â†’ { createdBy: user._id.toString() }
 *     DOCTOR     â†’ { doctorId: user.linkedDoctorId } or 403 if not linked
 */
export function requireHospitalAuth(requiredRole?: HospitalUserRole) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

    if (!token) {
      return next(new APIError(401, "Unauthorized", "Missing bearer token."));
    }

    try {
      const payload = verifyAccessToken(token);

      if (!isHospitalJwtPayload(payload)) {
        return next(new APIError(401, "Unauthorized", "Invalid token type."));
      }

      const user = await HospitalUserModel.readByUserId(payload.sub);

      if (!user || !user.isActive) {
        return next(new APIError(401, "Unauthorized", "Invalid user."));
      }

      // Attach user to request
      req.hospitalUser = user;

      // Inject ownership filter based on role
      switch (user.role as HospitalUserRole) {
        case "ADMIN":
        case "DIALYSIS":
        case "RECEPTIONIST":
        case "RECEPTIONIST2":
        case "PHARMACIST":
        case "ACCOUNTANT":
        case "XRAY":
          req.ownershipFilter = {};
          break;

        case "DOCTOR":
          if (!user.linkedDoctorId) {
            // Doctor with no linked profile sees nothing
            req.ownershipFilter = { doctorId: "__NO_LINKED_DOCTOR__" };
          } else {
            req.ownershipFilter = { doctorId: user.linkedDoctorId };
          }
          break;

        default:
          req.ownershipFilter = {};
      }

      // Role-based access check if a specific role is required
      if (requiredRole) {
        if (user.role === "ADMIN" || user.role === "ACCOUNTANT") return next(); // ADMIN and ACCOUNTANT bypass all role checks
        if (user.role !== requiredRole) {
          return next(
            new APIError(403, "Forbidden", `This action requires ${requiredRole} role.`)
          );
        }
      }

      return next();
    } catch (err) {
      return next(new APIError(401, "Unauthorized", "Invalid or expired token."));
    }
  };
}

/** Require ADMIN role */
export function requireHospitalAdmin() {
  return requireHospitalAuth("ADMIN");
}

/** Any authenticated hospital user */
export function requireHospitalUser() {
  return requireHospitalAuth();
}

/**
 * Require one of the specified roles.
 * ADMIN always passes.
 */
export function requireAnyRole(...roles: HospitalUserRole[]) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const user = req.hospitalUser;
    if (!user) return next(new APIError(401, "Unauthorized", "Not authenticated."));
    if (user.role === "ADMIN" || user.role === "ACCOUNTANT") return next();
    if (roles.includes(user.role)) return next();
    return next(new APIError(403, "Forbidden", `Access restricted to: ${roles.join(", ")}.`));
  };
}

/**
 * Block write operations for DOCTOR role.
 * Use on PATCH/PUT/DELETE routes that doctors should not access.
 */
export function blockDoctorWrite() {
  return (req: Request, _res: Response, next: NextFunction) => {
    const user = req.hospitalUser;
    if (user?.role === "DOCTOR") {
      return next(new APIError(403, "Forbidden", "Doctors cannot perform write operations."));
    }
    return next();
  };
}

/**
 * Restrict access to ADMIN only (accountants are read-only).
 * Use on create/update/delete transaction routes.
 */
export function requireHospitalAdminStrict() {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const user = req.hospitalUser;
    if (!user) return next(new APIError(401, "Unauthorized", "Not authenticated."));
    if (user.role === "ADMIN") return next();
    return next(new APIError(403, "Forbidden", "This action requires ADMIN role."));
  };
}


