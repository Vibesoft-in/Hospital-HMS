import { Request, Response, NextFunction } from "express";
import { AppError } from "@src/libs/errors";
import { APIError } from "@src/shared";
import { parseSkipLimit } from "@src/shared/parseSkipLimit";
import hospitalDoctorService from "../services/hospital-doctor.service";

async function readHospitalDoctors(
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
      department, 
      gender, 
      status,
      createdFrom,
      createdTo 
    } = request.query;
    
    if (searchQuery) {
      search.$or = [
        { name: { $regex: searchQuery, $options: "i" } },
        { doctorId: { $regex: searchQuery, $options: "i" } },
        { email: { $regex: searchQuery, $options: "i" } },
        { phone: { $regex: searchQuery, $options: "i" } },
        { department: { $regex: searchQuery, $options: "i" } },
        { designation: { $regex: searchQuery, $options: "i" } },
        { medicalLicenseNo: { $regex: searchQuery, $options: "i" } },
      ];
    }
    
    if (department) {
      search.department = { $regex: department, $options: "i" };
    }
    
    if (gender) {
      search.gender = gender;
    }
    
    // Date range filter
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
    
    // Status filter (available/unavailable based on today's schedule)
    if (status) {
      const statusValue = (status as string).toLowerCase();
      if (!['available', 'unavailable'].includes(statusValue)) {
        return next(new APIError(400, "Bad Request", "Status must be 'available' or 'unavailable'"));
      }
      
      // Get today's day of week
      const today = new Date();
      const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const todayDayName = daysOfWeek[today.getDay()];
      
      if (statusValue === 'available') {
        // Doctor must have at least one slot scheduled for today
        search.weeklySchedule = {
          $elemMatch: {
            dayOfWeek: todayDayName,
            slots: { $exists: true, $ne: [] }
          }
        };
      } else {
        // Doctor has no schedule for today OR weeklySchedule is empty
        search.$or = [
          { weeklySchedule: { $size: 0 } },
          { weeklySchedule: { $exists: false } },
          {
            weeklySchedule: {
              $not: {
                $elemMatch: {
                  dayOfWeek: todayDayName,
                  slots: { $exists: true, $ne: [] }
                }
              }
            }
          }
        ];
      }
    }

    // Get total count for pagination (exclude soft deleted)
    const HospitalDoctorModel = (await import("../models/hospital-doctor.model")).default;
    const totalCount = await HospitalDoctorModel.countDocuments({ 
      ...search, 
      isDeleted: { $ne: true } 
    });

    const doctors = await hospitalDoctorService.getHospitalDoctors(
      {},
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
      count: doctors.length,
      totalCount,
      hasMore: doctors.length === limit
    };
    
    return response.success(
      { doctors, pagination },
      "Doctors retrieved successfully"
    );
  } catch (err: any) {
    return next(
      new AppError(500, "Unable to get doctors", err.message ?? undefined)
    );
  }
}

export default {
  readHospitalDoctors,
};