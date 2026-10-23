import { validate } from "jsonschema";
import { Request, Response, NextFunction } from "express";
import { APIError } from "@src/shared";
import { AppError } from "@src/libs/errors";
import { logger } from "@src/config/logger";
import constantsService from "../services/constants.service";
import constantNewSchema from "../validators/constant-new.json";
import constantUpdateSchema from "../validators/constant-update.json";
import { CreateConstantDTO, UpdateConstantDTO } from "../dtos/constants.dto";

// Create constant
async function createConstant(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const input: CreateConstantDTO = request.body;
  const validation = validate(input, constantNewSchema);
  
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
    const newConstant = await constantsService.createConstant(input);
    logger.info({ key: newConstant.key, category: newConstant.category }, "Constant created successfully");
    return response.success({ constant: newConstant }, "Constant created successfully", 201);
  } catch (err: any) {
    logger.error({ error: err.message, stack: err.stack, input }, "Failed to create constant");
    
    if (err instanceof APIError) {
      return next(err);
    }
    
    return next(
      new AppError(
        500, 
        "Unable to create constant. Please check the provided information and try again.", 
        err.message ?? undefined
      )
    );
  }
}

// Get constant by key
async function getConstantByKey(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const { key } = request.params;
  
  try {
    const constant = await constantsService.getConstant(key);
    return response.success({ constant }, "Constant retrieved successfully");
  } catch (err: any) {
    logger.error({ error: err.message, key }, "Failed to retrieve constant");
    
    if (err instanceof APIError) {
      return next(err);
    }
    
    if (err.message?.includes("not found")) {
      return next(new APIError(404, "Constant Not Found", `Constant with key '${key}' was not found.`));
    }
    
    return next(
      new AppError(500, "Unable to retrieve constant. Please try again.", err.message ?? undefined)
    );
  }
}

// Get constant by ID
async function getConstantById(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const { id } = request.params;
  
  try {
    const constant = await constantsService.getConstantById(id);
    return response.success({ constant }, "Constant retrieved successfully");
  } catch (err: any) {
    logger.error({ error: err.message, id }, "Failed to retrieve constant");
    
    if (err instanceof APIError) {
      return next(err);
    }
    
    if (err.message?.includes("not found")) {
      return next(new APIError(404, "Constant Not Found", `Constant with ID '${id}' was not found.`));
    }
    
    return next(
      new AppError(500, "Unable to retrieve constant. Please try again.", err.message ?? undefined)
    );
  }
}

// Update constant by key
async function updateConstantByKey(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const input: UpdateConstantDTO = request.body;
  const validation = validate(input, constantUpdateSchema);
  
  if (!validation.valid) {
    return next(
      new APIError(
        400,
        "Bad Request",
        validation.errors.map((e) => e.stack).join(". ")
      )
    );
  }

  const { key } = request.params;
  
  try {
    const updatedConstant = await constantsService.updateConstant(key, input);
    logger.info({ key, updates: Object.keys(input) }, "Constant updated successfully");
    return response.success({ constant: updatedConstant }, "Constant updated successfully");
  } catch (err: any) {
    logger.error({ error: err.message, stack: err.stack, key, input }, "Failed to update constant");
    
    if (err instanceof APIError) {
      return next(err);
    }
    
    if (err.message?.includes("not found")) {
      return next(new APIError(404, "Constant Not Found", `Constant with key '${key}' was not found.`));
    }
    
    return next(
      new AppError(500, "Unable to update constant. Please check the provided information and try again.", err.message ?? undefined)
    );
  }
}

// Update constant by ID
async function updateConstantById(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const input: UpdateConstantDTO = request.body;
  const validation = validate(input, constantUpdateSchema);
  
  if (!validation.valid) {
    return next(
      new APIError(
        400,
        "Bad Request",
        validation.errors.map((e) => e.stack).join(". ")
      )
    );
  }

  const { id } = request.params;
  
  try {
    const updatedConstant = await constantsService.updateConstantById(id, input);
    logger.info({ id, updates: Object.keys(input) }, "Constant updated successfully");
    return response.success({ constant: updatedConstant }, "Constant updated successfully");
  } catch (err: any) {
    logger.error({ error: err.message, stack: err.stack, id, input }, "Failed to update constant");
    
    if (err instanceof APIError) {
      return next(err);
    }
    
    if (err.message?.includes("not found")) {
      return next(new APIError(404, "Constant Not Found", `Constant with ID '${id}' was not found.`));
    }
    
    return next(
      new AppError(500, "Unable to update constant. Please check the provided information and try again.", err.message ?? undefined)
    );
  }
}

// Delete constant by key
async function deleteConstantByKey(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const { key } = request.params;
  
  try {
    await constantsService.deleteConstant(key);
    logger.info({ key }, "Constant deleted successfully");
    return response.success({}, "Constant deleted successfully");
  } catch (err: any) {
    logger.error({ error: err.message, key }, "Failed to delete constant");
    
    if (err instanceof APIError) {
      return next(err);
    }
    
    if (err.message?.includes("not found")) {
      return next(new APIError(404, "Constant Not Found", `Constant with key '${key}' was not found.`));
    }
    
    return next(
      new AppError(500, "Unable to delete constant. Please try again.", err.message ?? undefined)
    );
  }
}

// Delete constant by ID
async function deleteConstantById(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const { id } = request.params;
  
  try {
    await constantsService.deleteConstantById(id);
    logger.info({ id }, "Constant deleted successfully");
    return response.success({}, "Constant deleted successfully");
  } catch (err: any) {
    logger.error({ error: err.message, id }, "Failed to delete constant");
    
    if (err instanceof APIError) {
      return next(err);
    }
    
    if (err.message?.includes("not found")) {
      return next(new APIError(404, "Constant Not Found", `Constant with ID '${id}' was not found.`));
    }
    
    return next(
      new AppError(500, "Unable to delete constant. Please try again.", err.message ?? undefined)
    );
  }
}

// Get constants by category
async function getConstantsByCategory(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const { category } = request.params;
  
  try {
    const constants = await constantsService.getConstantsByCategory(category);
    return response.success(
      { constants, count: constants.length, category },
      "Constants retrieved successfully"
    );
  } catch (err: any) {
    logger.error({ error: err.message, category }, "Failed to retrieve constants by category");
    
    return next(
      new AppError(500, "Unable to retrieve constants. Please try again.", err.message ?? undefined)
    );
  }
}

export default {
  createConstant,
  getConstantByKey,
  getConstantById,
  updateConstantByKey,
  updateConstantById,
  deleteConstantByKey,
  deleteConstantById,
  getConstantsByCategory,
};
