import { Request, Response, NextFunction } from "express";
import { validate } from "jsonschema";
import { APIError } from "@src/shared";
import { AppError } from "@src/libs/errors";
import { logger } from "@src/config/logger";
import hospitalAuthService from "../services/hospital-auth.service";
import loginSchema from "../validators/login.json";
import changePasswordSchema from "../validators/change-password.json";
import updateProfileSchema from "../validators/update-profile.json";

function setRefreshCookie(res: Response, token: string) {
  const isSecure = ["true", "1", "yes"].includes(process.env.COOKIE_SECURE as string);
  res.cookie("hospital_refresh_token", token, {
    httpOnly: true,
    secure: isSecure,
    // "none" is required for cross-site cookie delivery (Vercel frontend <-> Render backend).
    // sameSite: "none" MUST be paired with secure: true — COOKIE_SECURE=true is set in render.yaml.
    sameSite: isSecure ? "none" : "lax",
    domain:
      process.env.NODE_ENV === "production"
        ? process.env.COOKIE_DOMAIN || undefined
        : undefined,
  });
}

async function login(req: Request, res: Response, next: NextFunction) {
  const validation = validate(req.body, loginSchema);
  
  if (!validation.valid) {
    return next(
      new APIError(
        400,
        "Bad Request",
        validation.errors.map((e) => e.stack).join(". ")
      )
    );
  }
  
  try {
    const { user, accessToken, refreshToken } = await hospitalAuthService.login(req.body);
    setRefreshCookie(res, refreshToken);
    
    logger.info({ userId: user.userId, email: user.email }, "Hospital user logged in");
    
    return res.success({ user, accessToken }, "Logged in successfully");
  } catch (err: any) {
    logger.error({ error: err.message, email: req.body.email }, "Hospital login failed");
    
    if (err instanceof APIError) {
      return next(err);
    }
    
    return next(
      new AppError(500, "Unable to login", err.message ?? undefined)
    );
  }
}

async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.hospital_refresh_token || req.body?.refreshToken;
    
    if (!token) {
      throw new APIError(401, "Unauthorized", "Missing refresh token.");
    }

    const { verifyRefreshToken, signAccessToken } = await import("@src/libs/jwt");
    const payload = verifyRefreshToken(token);
    
    // Type guard to check if it's a hospital token
    const isHospitalToken = (p: any): boolean => {
      return p && p.type === "hospital" && typeof p.role === "string";
    };
    
    // Verify this is a hospital token
    if (!isHospitalToken(payload)) {
      throw new APIError(401, "Unauthorized", "Invalid token type.");
    }

    const HospitalUserModel = (await import("../models/hospital-user.model")).default;
    const user = await HospitalUserModel.readByUserId((payload as any).sub);

    if (!user) {
      throw new APIError(401, "Unauthorized", "User no longer exists.");
    }

    if (!user.isActive) {
      throw new APIError(401, "Unauthorized", "User is inactive.");
    }

    if (user.role !== (payload as any).role) {
      throw new APIError(401, "Unauthorized", "User role has changed.");
    }

    const expectedVersion = user.tokenVersion ?? 0;
    const tokenVersion = (payload as any).tokenVersion;
    if (tokenVersion === undefined || tokenVersion !== expectedVersion) {
      throw new APIError(401, "Unauthorized", "Refresh token has been revoked.");
    }
    
    const cleanPayload = { 
      sub: user.userId, 
      role: user.role,
      type: "hospital" as const
    };

    const newAccess = signAccessToken(cleanPayload);
    
    return res.success({ accessToken: newAccess }, "Token refreshed");
  } catch (err: any) {
    logger.error({ error: err.message }, "Hospital token refresh failed");
    
    if (err instanceof APIError) {
      return next(err);
    }

    if (err.name === "TokenExpiredError" || err.name === "JsonWebTokenError") {
      return next(new APIError(401, "Unauthorized", "Invalid or expired refresh token."));
    }
    
    return next(
      new AppError(500, "Unable to refresh token", err.message ?? undefined)
    );
  }
}

async function logout(req: Request, res: Response) {
  try {
    let userId: string | undefined = (req as any).hospitalUser?.userId || req.body?.userId;

    const cookieToken = req.cookies?.hospital_refresh_token || req.body?.refreshToken;
    if (!userId && cookieToken) {
      try {
        const { verifyRefreshToken } = await import("@src/libs/jwt");
        const payload = verifyRefreshToken(cookieToken);
        if (payload && (payload as any).sub) {
          userId = (payload as any).sub;
        }
      } catch {
        // ignore invalid token during logout
      }
    }

    if (!userId && req.headers.authorization?.startsWith("Bearer ")) {
      try {
        const { verifyAccessToken } = await import("@src/libs/jwt");
        const token = req.headers.authorization.split(" ")[1];
        const payload = verifyAccessToken(token);
        if (payload && (payload as any).sub) {
          userId = (payload as any).sub;
        }
      } catch {
        // ignore invalid token during logout
      }
    }

    if (userId) {
      const HospitalUserModel = (await import("../models/hospital-user.model")).default;
      await HospitalUserModel.findOneAndUpdate(
        { userId, deleted: { $ne: true } },
        { $inc: { tokenVersion: 1 } }
      );
      logger.info({ userId }, "Hospital user logged out, tokenVersion incremented");
    }
  } catch (err: any) {
    logger.warn({ error: err.message }, "Error during tokenVersion increment on logout");
  }

  const isSecureClear = ["true", "1", "yes"].includes(process.env.COOKIE_SECURE as string);
  res.clearCookie("hospital_refresh_token", {
    httpOnly: true,
    secure: isSecureClear,
    // Must match the options used when setting the cookie so the browser clears it correctly.
    sameSite: isSecureClear ? "none" : "lax",
    domain: process.env.COOKIE_DOMAIN,
  });
  
  return res.success({}, "Logged out successfully");
}

async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as any).hospitalUser;
    
    if (!user) {
      throw new APIError(401, "Unauthorized", "User not found.");
    }
    
    return res.success({ user }, "Profile retrieved successfully");
  } catch (err: any) {
    logger.error({ error: err.message }, "Failed to get hospital user profile");
    
    if (err instanceof APIError) {
      return next(err);
    }
    
    return next(
      new AppError(500, "Unable to get profile", err.message ?? undefined)
    );
  }
}

async function updateMe(req: Request, res: Response, next: NextFunction) {
  const validation = validate(req.body, updateProfileSchema);
  
  if (!validation.valid) {
    return next(
      new APIError(
        400,
        "Bad Request",
        validation.errors.map((e) => e.stack).join(". ")
      )
    );
  }
  
  try {
    const userId = (req as any).hospitalUser._id;
    const HospitalUserModel = (await import("../models/hospital-user.model")).default;
    
    const updatedUser = await HospitalUserModel.updateUser(userId, req.body);
    
    if (!updatedUser) {
      throw new APIError(404, "User Not Found", "Unable to update profile.");
    }
    
    logger.info({ userId }, "Hospital user profile updated");
    
    return res.success({ user: updatedUser }, "Profile updated successfully");
  } catch (err: any) {
    logger.error({ error: err.message }, "Failed to update hospital user profile");
    
    if (err instanceof APIError) {
      return next(err);
    }
    
    return next(
      new AppError(500, "Unable to update profile", err.message ?? undefined)
    );
  }
}

async function changePassword(req: Request, res: Response, next: NextFunction) {
  const validation = validate(req.body, changePasswordSchema);
  
  if (!validation.valid) {
    return next(
      new APIError(
        400,
        "Bad Request",
        validation.errors.map((e) => e.stack).join(". ")
      )
    );
  }
  
  try {
    const userId = (req as any).hospitalUser._id;
    const user = await hospitalAuthService.changePassword(userId, req.body);
    
    logger.info({ userId }, "Hospital user password changed");
    
    return res.success({ user }, "Password changed successfully");
  } catch (err: any) {
    logger.error({ error: err.message }, "Failed to change hospital user password");
    
    if (err instanceof APIError) {
      return next(err);
    }
    
    return next(
      new AppError(500, "Unable to change password", err.message ?? undefined)
    );
  }
}

export default { login, refresh, logout, getMe, updateMe, changePassword };
