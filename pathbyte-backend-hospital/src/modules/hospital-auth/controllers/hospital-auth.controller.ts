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
  res.cookie("hospital_refresh_token", token, {
    httpOnly: true,
    secure: ["true", "1", "yes"].includes(process.env.COOKIE_SECURE as string),
    sameSite: "strict",
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
    const token = req.cookies?.hospital_refresh_token;
    
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
    
    const cleanPayload = { 
      sub: (payload as any).sub, 
      role: (payload as any).role,
      type: "hospital" as const
    };

    const newAccess = signAccessToken(cleanPayload);
    
    return res.success({ accessToken: newAccess }, "Token refreshed");
  } catch (err: any) {
    logger.error({ error: err.message }, "Hospital token refresh failed");
    
    if (err instanceof APIError) {
      return next(err);
    }
    
    return next(
      new AppError(500, "Unable to refresh token", err.message ?? undefined)
    );
  }
}

async function logout(_req: Request, res: Response) {
  res.clearCookie("hospital_refresh_token", {
    httpOnly: true,
    secure: ["true", "1", "yes"].includes(process.env.COOKIE_SECURE as string),
    sameSite: "strict",
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
