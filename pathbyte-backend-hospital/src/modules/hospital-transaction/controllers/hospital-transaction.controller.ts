import { validate } from "jsonschema";
import { Request, Response, NextFunction } from "express";
import { APIError } from "@src/shared";
import { AppError } from "@src/libs/errors";
import hospitalTransactionService from "../services/hospital-transaction.service";
import hospitalTransactionNewSchema from "../validators/hospital-transaction-new.json";
import hospitalTransactionUpdateSchema from "../validators/hospital-transaction-update.json";
import {
  CreateHospitalTransactionDTO,
  UpdateHospitalTransactionDTO,
} from "../dtos/hospital-transaction.dto";

async function createHospitalTransaction(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const input: CreateHospitalTransactionDTO = request.body;
  const validation = validate(input, hospitalTransactionNewSchema);
  
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
    const newTransaction = await hospitalTransactionService.createHospitalTransaction(input);
    return response.success({ transaction: newTransaction }, "Transaction created successfully", 201);
  } catch (err: any) {
    return next(
      new AppError(500, "Unable to create transaction", err.message ?? undefined)
    );
  }
}

async function readHospitalTransaction(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const { id } = request.params;
  const ownershipFilter = request.ownershipFilter || {};
  
  try {
    const transaction = await hospitalTransactionService.getHospitalTransactionById(id, ownershipFilter);
    return response.success({ transaction }, "Transaction retrieved successfully");
  } catch (err: any) {
    if (err instanceof APIError || err?.statusCode === 404) {
      return next(err);
    }
    return next(
      new AppError(500, "Unable to get transaction", err.message ?? undefined)
    );
  }
}

async function searchHospitalTransactionByTransactionId(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const { transactionId } = request.params;
  
  try {
    const transaction = await hospitalTransactionService.getHospitalTransaction(transactionId);
    return response.success({ transaction }, "Transaction retrieved successfully");
  } catch (err: any) {
    return next(
      new AppError(500, "Unable to get transaction", err.message ?? undefined)
    );
  }
}

async function updateHospitalTransaction(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const input: UpdateHospitalTransactionDTO = request.body;
  const validation = validate(input, hospitalTransactionUpdateSchema);
  
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
  const ownershipFilter = request.ownershipFilter || {};
  
  try {
    const updatedTransaction = await hospitalTransactionService.updateHospitalTransactionById(id, input as any, ownershipFilter);
    return response.success({ transaction: updatedTransaction }, "Transaction updated successfully");
  } catch (err: any) {
    if (err instanceof APIError || err?.statusCode === 404) {
      return next(err);
    }
    return next(
      new AppError(500, "Unable to update transaction", err.message ?? undefined)
    );
  }
}

async function deleteHospitalTransaction(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const { id } = request.params;
  const ownershipFilter = request.ownershipFilter || {};
  
  try {
    await hospitalTransactionService.deleteHospitalTransactionById(id, ownershipFilter);
    return response.success({}, "Transaction deleted successfully");
  } catch (err: any) {
    if (err instanceof APIError || err?.statusCode === 404) {
      return next(err);
    }
    return next(
      new AppError(500, "Unable to delete transaction", err.message ?? undefined)
    );
  }
}

async function getTransactionsByVisit(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const { visitId } = request.params;
  
  try {
    const transactions = await hospitalTransactionService.getTransactionsByVisit(visitId);
    return response.success({ transactions, count: transactions.length }, "Visit transactions retrieved successfully");
  } catch (err: any) {
    return next(
      new AppError(500, "Unable to get visit transactions", err.message ?? undefined)
    );
  }
}

export default {
  createHospitalTransaction,
  readHospitalTransaction,
  searchHospitalTransactionByTransactionId,
  updateHospitalTransaction,
  deleteHospitalTransaction,
  getTransactionsByVisit,
};