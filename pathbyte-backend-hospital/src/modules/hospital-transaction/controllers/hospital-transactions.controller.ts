import { Request, Response, NextFunction } from "express";
import { AppError } from "@src/libs/errors";
import { APIError } from "@src/shared";
import { parseSkipLimit } from "@src/shared/parseSkipLimit";
import hospitalTransactionService from "../services/hospital-transaction.service";

async function readHospitalTransactions(
  request: Request,
  response: Response,
  next: NextFunction
) {
  try {
    // Support both skip/limit and page/limit patterns
    let skip = 0;
    let limit = 10;
    
    const { page, skip: skipParam, limit: limitParam } = request.query;
    
    // Parse limit first
    if (limitParam) {
      const limitResult = parseSkipLimit(limitParam, 100, "limit");
      if (limitResult instanceof APIError) return next(limitResult);
      limit = limitResult || 10;
    }
    
    // Calculate skip from page or use skip directly
    if (page) {
      const pageNum = parseInt(page as string);
      if (isNaN(pageNum) || pageNum < 1) {
        return next(new APIError(400, "Bad Request", "Page must be a positive integer starting from 1"));
      }
      skip = (pageNum - 1) * limit;
      
      // Validate calculated skip doesn't exceed max
      if (skip > 1000) {
        return next(new APIError(400, "Bad Request", `Page ${pageNum} with limit ${limit} exceeds maximum skip of 1000. Please use a smaller page number or limit.`));
      }
    } else if (skipParam) {
      const skipResult = parseSkipLimit(skipParam, 1000, "skip");
      if (skipResult instanceof APIError) return next(skipResult);
      skip = skipResult || 0;
    }
    
    // Build search query
    const search: any = {};
    const { 
      search: searchQuery, 
      transactionType, 
      paymentMode, 
      visitId,
      doctorId,
      patientId,
      department,
      visitType,
      sourceType,
      date,
      dateFrom,
      dateTo,
      createdFrom,
      createdTo,
      amountFrom,
      amountTo
    } = request.query;

    // Validate sourceType if provided
    const validSourceTypes = ["visit", "daycareAppointment", "IPD"];
    if (sourceType && !validSourceTypes.includes(sourceType as string)) {
      return next(new APIError(400, "Bad Request", `Invalid sourceType. Must be one of: ${validSourceTypes.join(", ")}`));
    }
    
    if (searchQuery) {
      search.$or = [
        { transactionId: { $regex: searchQuery, $options: "i" } },
        { referenceNo: { $regex: searchQuery, $options: "i" } },
        { visitId: { $regex: searchQuery, $options: "i" } },
      ];
    }
    
    if (transactionType) search.transactionType = transactionType;
    if (paymentMode) search.paymentMode = paymentMode;
    if (visitId) search.visitId = visitId;
    
    // Date range filter for transactionDate (supports date, dateFrom, dateTo; defaults to current date if dateTo not provided)
    const startDateStr = (date || dateFrom) as string;
    if (startDateStr || dateTo) {
      search.transactionDate = {};
      if (startDateStr) {
        const fromDate = new Date(startDateStr);
        if (isNaN(fromDate.getTime())) {
          return next(new APIError(400, "Bad Request", "Invalid date format. Use YYYY-MM-DD"));
        }
        fromDate.setHours(0, 0, 0, 0);
        search.transactionDate.$gte = fromDate;
      }
      if (dateTo) {
        const toDate = new Date(dateTo as string);
        if (isNaN(toDate.getTime())) {
          return next(new APIError(400, "Bad Request", "Invalid dateTo format. Use YYYY-MM-DD"));
        }
        toDate.setHours(23, 59, 59, 999);
        search.transactionDate.$lte = toDate;
      } else if (startDateStr) {
        const toDate = new Date();
        toDate.setHours(23, 59, 59, 999);
        search.transactionDate.$lte = toDate;
      }
    }
    
    // Date range filter (createdAt)
    if (createdFrom || createdTo) {
      search.createdAt = {};
      if (createdFrom) {
        const fromDate = new Date(createdFrom as string);
        fromDate.setHours(0, 0, 0, 0);
        if (isNaN(fromDate.getTime())) {
          return next(new APIError(400, "Bad Request", "Invalid createdFrom date format. Use YYYY-MM-DD"));
        }
        search.createdAt.$gte = fromDate;
      }
      if (createdTo) {
        const toDate = new Date(createdTo as string);
        toDate.setHours(23, 59, 59, 999);
        if (isNaN(toDate.getTime())) {
          return next(new APIError(400, "Bad Request", "Invalid createdTo date format. Use YYYY-MM-DD"));
        }
        search.createdAt.$lte = toDate;
      }
    }
    
    // Amount range filter
    if (amountFrom || amountTo) {
      search.amount = {};
      if (amountFrom) {
        const fromAmount = parseFloat(amountFrom as string);
        if (isNaN(fromAmount) || fromAmount < 0) {
          return next(new APIError(400, "Bad Request", "Invalid amountFrom. Must be a positive number"));
        }
        search.amount.$gte = fromAmount;
      }
      if (amountTo) {
        const toAmount = parseFloat(amountTo as string);
        if (isNaN(toAmount) || toAmount < 0) {
          return next(new APIError(400, "Bad Request", "Invalid amountTo. Must be a positive number"));
        }
        search.amount.$lte = toAmount;
      }
    }

    // Filters that require join resolution (applied after lookup in aggregation)
    const joinFilters: any = {};
    const ownerFilter = request.ownershipFilter || {};
    if (ownerFilter.doctorId) joinFilters.doctorId = ownerFilter.doctorId;
    if (doctorId)    joinFilters.doctorId    = doctorId as string;
    if (patientId)   joinFilters.patientId   = patientId as string;
    if (department)  joinFilters.department  = department as string;
    if (visitType)   joinFilters.visitType   = visitType as string;
    if (sourceType)  joinFilters.sourceType  = sourceType as string;

    const totalCount = await hospitalTransactionService.countHospitalTransactions(search, joinFilters);

    const transactions = await hospitalTransactionService.getHospitalTransactions(
      {},
      search,
      skip,
      limit,
      joinFilters
    );
    
    // Calculate pagination metadata
    const currentPage = page ? parseInt(page as string) : Math.floor(skip / limit) + 1;
    const pagination = {
      currentPage,
      limit,
      skip,
      count: transactions.length,
      totalCount,
      hasMore: transactions.length === limit
    };
    
    return response.success(
      { transactions, pagination },
      "Transactions retrieved successfully"
    );
  } catch (err: any) {
    return next(
      new AppError(500, "Unable to get transactions", err.message ?? undefined)
    );
  }
}

export default {
  readHospitalTransactions,
};