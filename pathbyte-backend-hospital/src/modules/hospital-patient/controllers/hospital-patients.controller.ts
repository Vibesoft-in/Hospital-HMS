import { Request, Response, NextFunction } from "express";
import { AppError } from "@src/libs/errors";
import { APIError } from "@src/shared";
import { parseSkipLimit } from "@src/shared/parseSkipLimit";
import hospitalPatientService from "../services/hospital-patient.service";

async function readHospitalPatients(
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
      const limitResult = parseSkipLimit(limitParam, 500, "limit");
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
    } else if (skipParam) {
      const skipResult = parseSkipLimit(skipParam, Number.MAX_SAFE_INTEGER, "skip");
      if (skipResult instanceof APIError) return next(skipResult);
      skip = skipResult || 0;
    }
    
    // Build search query
    const search: any = {};
    const { 
      search: searchQuery, 
      gender, 
      bloodGroup, 
      title, 
      mrd, 
      phone, 
      email,
      createdFrom,
      createdTo
    } = request.query;
    
    // Text search across multiple fields
    if (searchQuery) {
      search.$or = [
        { name: { $regex: searchQuery, $options: "i" } },
        { mrd: { $regex: searchQuery, $options: "i" } },
        { phone: { $regex: searchQuery, $options: "i" } },
        { email: { $regex: searchQuery, $options: "i" } },
      ];
    }
    
    // Exact match filters
    if (gender) {
      search.gender = gender;
    }
    
    if (bloodGroup) {
      search.bloodGroup = bloodGroup;
    }
    
    if (title) {
      search.title = title;
    }
    
    // Specific field searches (exact match)
    if (mrd && !searchQuery) {
      search.mrd = { $regex: mrd, $options: "i" };
    }
    
    if (phone && !searchQuery) {
      search.phone = { $regex: phone, $options: "i" };
    }
    
    if (email && !searchQuery) {
      search.email = { $regex: email, $options: "i" };
    }

    // Created date range filter
    if (createdFrom || createdTo) {
      search.createdAt = {};
      
      if (createdFrom) {
        const fromDate = new Date(createdFrom as string);
        fromDate.setHours(0, 0, 0, 0);
        search.createdAt.$gte = fromDate;
      }
      
      if (createdTo) {
        const toDate = new Date(createdTo as string);
        toDate.setHours(23, 59, 59, 999);
        search.createdAt.$lte = toDate;
      }
    }

    // isMRPatient filter
    if (request.query.isMRPatient !== undefined) {
      search.isMRPatient = request.query.isMRPatient === "true";
    }

    // Merge ownership filter (RECEPTIONIST sees only their own patients)
    const ownerFilter = request.ownershipFilter || {};

    // Get total count for pagination (exclude soft deleted)
    const HospitalPatientModel = (await import("../models/hospital-patient.model")).default;
    const totalCount = await HospitalPatientModel.countDocuments({ 
      ...ownerFilter,
      ...search, 
      isDeleted: { $ne: true } 
    });

    const patients = await hospitalPatientService.getHospitalPatients(
      { ...ownerFilter },
      search,
      skip,
      limit
    );
    
    // Calculate pagination metadata
    const currentPage = page ? parseInt(page as string) : Math.floor(skip / limit) + 1;
    const pagination = {
      currentPage,
      limit,
      skip,
      count: patients.length,
      totalCount,
      hasMore: patients.length === limit
    };
    
    return response.success(
      { patients, pagination },
      "Patients retrieved successfully"
    );
  } catch (err: any) {
    return next(
      new AppError(500, "Unable to get patients", err.message ?? undefined)
    );
  }
}

export default {
  readHospitalPatients,
};