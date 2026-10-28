import { Request, Response, NextFunction } from "express";
import { AppError } from "@src/libs/errors";
import { APIError } from "@src/shared";
import { logger } from "@src/config/logger";
import { parseSkipLimit } from "@src/shared/parseSkipLimit";
import hospitalVisitService from "../services/hospital-visit.service";

async function readHospitalVisits(
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
      status, 
      visitType, 
      appointmentType, 
      doctorId, 
      mrd, 
      date,
      createdFrom,
      createdTo
    } = request.query;
    
    if (searchQuery) {
      search.$or = [
        { visitId:        { $regex: searchQuery, $options: "i" } },
        { visitType:      { $regex: searchQuery, $options: "i" } },
        { appointmentType:{ $regex: searchQuery, $options: "i" } },
        { reason:         { $regex: searchQuery, $options: "i" } },
      ];
      // Also search by patient name and MRD via join lookup (handled in model)
      search._patientNameSearch = searchQuery as string;
    }
    
    if (status) {
      search.status = status;
    }
    
    if (visitType) {
      search.visitType = visitType;
    }
    
    if (appointmentType) {
      search.appointmentType = appointmentType;
    }
    
    if (doctorId && (request as any).hospitalUser?.role !== "DOCTOR") {
      search.doctorId = doctorId;
    }

    if (request.query.patientId) {
      search.patientId = request.query.patientId;
    }
    
    // MRD filter — resolve patient by MRD then restrict to that patientId
    if (mrd) {
      const PatientModel = (await import("../../hospital-patient/models/hospital-patient.model")).default;
      const patient = await PatientModel.findOne(
        { mrd: mrd as string, isDeleted: { $ne: true } },
        { _id: 1 }
      ).lean();
      // If no patient found for this MRD, force zero results
      search.patientId = patient ? (patient as any)._id.toString() : "__no_match__";
    }
    
    if (date) {
      const searchDate = new Date(date as string);
      search.visitDate = {
        $gte: new Date(searchDate.setHours(0, 0, 0, 0)),
        $lt: new Date(searchDate.setHours(23, 59, 59, 999))
      };
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

    // isMRPatient filter — resolve matching patientIds from HMS patients
    if (request.query.isMRPatient !== undefined) {
      const isMR = request.query.isMRPatient === "true";
      const PatientModel = (await import("../../hospital-patient/models/hospital-patient.model")).default;
      const matchingPatients = await PatientModel.find(
        { isMRPatient: isMR, isDeleted: { $ne: true } },
        { _id: 1 }
      ).lean();
      search.patientId = { $in: matchingPatients.map((p: any) => p._id.toString()) };
    }

    // Get total count for pagination (use aggregation to support patient name filter)
    const HospitalVisitModel = (await import("../models/hospital-visit.model")).default;
    const ownerFilter = request.ownershipFilter || {};
    let totalCount = 0;
    if (search._patientNameSearch) {
      const patientNameSearch = search._patientNameSearch;
      const countSearch = { ...search };
      delete countSearch._patientNameSearch;
      const countPipeline: any[] = [
        { $match: { isDeleted: { $ne: true }, ...ownerFilter, ...countSearch } },
        { $addFields: { patientObjectId: { $toObjectId: "$patientId" } } },
        { $lookup: { from: "hospitalpatients", localField: "patientObjectId", foreignField: "_id", as: "patient", pipeline: [{ $project: { name: 1, mrd: 1 } }] } },
        { $unwind: { path: "$patient", preserveNullAndEmptyArrays: true } },
        { $match: { $or: [
          { "patient.name": { $regex: patientNameSearch, $options: "i" } },
          { "patient.mrd":  { $regex: patientNameSearch, $options: "i" } },
        ]}},
        { $count: "count" }
      ];
      const countResult = await HospitalVisitModel.aggregate(countPipeline);
      totalCount = countResult[0]?.count || 0;
    } else {
      totalCount = await HospitalVisitModel.countDocuments({ isDeleted: { $ne: true }, ...search, ...ownerFilter });
    }

    const visits = await hospitalVisitService.getHospitalVisits(
      { ...(request.ownershipFilter || {}) },
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
      count: visits.length,
      totalCount,
      hasMore: visits.length === limit // If we got full limit, there might be more
    };
    
    logger.info({ count: visits.length, skip, limit, page: currentPage, filters: search }, "Visits retrieved successfully");
    
    return response.success(
      { visits, pagination },
      "Visits retrieved successfully"
    );
  } catch (err: any) {
    logger.error({ error: err.message, stack: err.stack }, "Failed to retrieve visits");
    
    // Handle specific error types
    if (err instanceof APIError) {
      return next(err);
    }
    
    return next(
      new AppError(500, "Unable to retrieve visits. Please try again.", err.message ?? undefined)
    );
  }
}

export default {
  readHospitalVisits,
};