import { Request, Response, NextFunction } from "express";
import { validate } from "jsonschema";
import { APIError } from "@src/shared";
import { AppError } from "@src/libs/errors";
import { logger } from "@src/config/logger";
import hospitalUserService from "../services/hospital-user.service";
import createUserSchema from "../validators/create-user.json";
import updateUserSchema from "../validators/update-user.json";
import resetPasswordSchema from "../validators/reset-password.json";

async function createUser(req: Request, res: Response, next: NextFunction) {
  const validation = validate(req.body, createUserSchema);
  
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
    const user = await hospitalUserService.createUser(req.body);
    
    logger.info({ userId: user.userId, email: user.email, role: user.role }, "Hospital user created");
    
    return res.success({ user }, "User created successfully", 201);
  } catch (err: any) {
    logger.error({ error: err.message, email: req.body.email }, "Failed to create hospital user");
    
    if (err instanceof APIError) {
      return next(err);
    }
    
    return next(
      new AppError(500, "Unable to create user", err.message ?? undefined)
    );
  }
}

async function getUser(req: Request, res: Response, next: NextFunction) {
  const { id } = req.params;
  
  try {
    const user = await hospitalUserService.getUserById(id);
    
    return res.success({ user }, "User retrieved successfully");
  } catch (err: any) {
    logger.error({ error: err.message, userId: id }, "Failed to get hospital user");
    
    if (err instanceof APIError) {
      return next(err);
    }
    
    return next(
      new AppError(500, "Unable to get user", err.message ?? undefined)
    );
  }
}

async function updateUser(req: Request, res: Response, next: NextFunction) {
  const validation = validate(req.body, updateUserSchema);
  
  if (!validation.valid) {
    return next(
      new APIError(
        400,
        "Bad Request",
        validation.errors.map((e) => e.stack).join(". ")
      )
    );
  }
  
  const { id } = req.params;
  
  try {
    const user = await hospitalUserService.updateUser(id, req.body);
    
    logger.info({ userId: id, updates: Object.keys(req.body) }, "Hospital user updated");
    
    return res.success({ user }, "User updated successfully");
  } catch (err: any) {
    logger.error({ error: err.message, userId: id }, "Failed to update hospital user");
    
    if (err instanceof APIError) {
      return next(err);
    }
    
    return next(
      new AppError(500, "Unable to update user", err.message ?? undefined)
    );
  }
}

async function deleteUser(req: Request, res: Response, next: NextFunction) {
  const { id } = req.params;
  
  try {
    await hospitalUserService.deleteUser(id);
    
    logger.info({ userId: id }, "Hospital user deleted");
    
    return res.success({}, "User deleted successfully");
  } catch (err: any) {
    logger.error({ error: err.message, userId: id }, "Failed to delete hospital user");
    
    if (err instanceof APIError) {
      return next(err);
    }
    
    return next(
      new AppError(500, "Unable to delete user", err.message ?? undefined)
    );
  }
}

async function resetPassword(req: Request, res: Response, next: NextFunction) {
  const validation = validate(req.body, resetPasswordSchema);
  
  if (!validation.valid) {
    return next(
      new APIError(
        400,
        "Bad Request",
        validation.errors.map((e) => e.stack).join(". ")
      )
    );
  }
  
  const { id } = req.params;
  
  try {
    const user = await hospitalUserService.resetPassword(id, req.body);
    
    logger.info({ userId: id }, "Hospital user password reset by admin");
    
    return res.success({ user }, "Password reset successfully");
  } catch (err: any) {
    logger.error({ error: err.message, userId: id }, "Failed to reset hospital user password");
    
    if (err instanceof APIError) {
      return next(err);
    }
    
    return next(
      new AppError(500, "Unable to reset password", err.message ?? undefined)
    );
  }
}

export default { createUser, getUser, updateUser, deleteUser, resetPassword };
