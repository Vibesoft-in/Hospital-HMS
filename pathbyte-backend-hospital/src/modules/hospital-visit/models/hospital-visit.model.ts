import mongoose from "mongoose";
import { APIError } from "@src/shared";
import { logger } from "@src/config/logger";
import { 
  HospitalVisit, 
  HospitalVisitDoc, 
  HospitalVisitModel 
} from "./hospital-visit.types";
import HospitalDoctor from "../../hospital-doctor/models/hospital-doctor.model";
import HospitalPatient from "../../hospital-patient/models/hospital-patient.model";

const Schema = mongoose.Schema;

// Sub-schema for OPD procedures — price/name are snapshotted at booking time
const visitProcedureSchema = new Schema(
  {
    procedureId:   { type: String, required: true },
    procedureName: { type: String, required: true },
    price:         { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const hospitalVisitSchema = new Schema<HospitalVisitDoc>(
  {
    visitId: { type: String, required: true, index: true },
    appointmentId: { type: String, required: true, unique: true }, // New unique readable appointment ID
    patientId: { type: String, required: true }, // Reference to patient MongoDB _id as string
    doctorId: { type: String, required: true }, // Reference to hospital doctor MongoDB _id as string
    visitType: { 
      type: String, 
      enum: ["New", "Emergency", "Follow-up", "Follow-up-report", "MR"],
      required: true 
    },
    appointmentType: { 
      type: String, 
      enum: ["OPD", "Day Care", "IPD", "ICU", "Emergency"],
      required: true 
    },
    reason: { type: String },
    visitDate: { type: Date, required: true },
    visitTime: { type: String }, // Time in HH:MM format (24-hour) - Optional
    sessionSlot: { 
      type: String, 
      enum: ["Morning", "Noon", "Afternoon", "Evening", "Night"]
      // Optional - for informational purposes only, does not affect token generation
    },
    tokenNumber: { type: Number, required: true }, // Daily auto-incrementing token number
    // Doctor consultation fee — from doctor rate card
    price: { type: Number, required: true, min: 0 },
    // Procedure charges (OPD)
    procedures:             { type: [visitProcedureSchema], default: [] },
    procedureChargesTotal:  { type: Number, default: 0, min: 0 },
    subtotal:               { type: Number, default: 0, min: 0 }, // price + procedureChargesTotal
    totalPrice:             { type: Number, default: 0, min: 0 }, // subtotal - discount
    discount: { type: Number, default: 0, min: 0 }, // Discount amount
    discountAuthorizedAt: { type: Date }, // Timestamp when discount was authorized
    status: { 
      type: String, 
      enum: ["Scheduled", "In Progress", "Completed", "Cancelled", "No Show"],
      default: "Scheduled"
    },
    // Attendant information
    attendantName: { type: String },
    attendantRelation: { type: String },
    // Soft delete fields
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    deletedBy: { type: String }, // User ID who deleted the record
  },
  { timestamps: true }
);

// Indexes for better performance
hospitalVisitSchema.index({ isDeleted: 1 });
hospitalVisitSchema.index({ patientId: 1, visitDate: -1 });
hospitalVisitSchema.index({ doctorId: 1, visitDate: 1 }); // Removed sessionSlot - tokens are now per-doctor per-day
hospitalVisitSchema.index({ visitDate: 1, status: 1 });
hospitalVisitSchema.index({ tokenNumber: 1, visitDate: 1, doctorId: 1 }); // For daily token lookup per doctor

// Function to get next token number per doctor per day (scoped by sessionSlot if provided, and Emergency vs Regular)
const getNextTokenNumber = async function(
  this: HospitalVisitModel, 
  visitDate: Date, 
  doctorId: string,
  visitType: string,
  sessionSlot?: string
): Promise<number> {
  // Get start and end of the day (resets at 12 AM)
  const startOfDay = new Date(visitDate);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(visitDate);
  endOfDay.setHours(23, 59, 59, 999);

  // Determine if this is an emergency visit
  const isEmergency = visitType === "Emergency";

  // Find the highest token number for this doctor on this date within same sessionSlot (or slotless)
  const filter: any = {
    doctorId: doctorId,
    visitDate: {
      $gte: startOfDay,
      $lte: endOfDay
    },
    isDeleted: { $ne: true }
  };

  if (isEmergency) {
    // Emergency visits: only count Emergency tokens
    filter.visitType = "Emergency";
  } else {
    // Regular visits: count New, Follow-up, MR tokens (exclude Emergency)
    filter.visitType = { $ne: "Emergency" };
  }

  if (sessionSlot) {
    filter.sessionSlot = sessionSlot;
  } else {
    filter.$or = [
      { sessionSlot: { $exists: false } },
      { sessionSlot: null },
      { sessionSlot: "" }
    ];
  }

  const lastVisit = await this.findOne(filter).sort({ tokenNumber: -1 });

  return lastVisit ? lastVisit.tokenNumber + 1 : 1;
};

hospitalVisitSchema.statics = {
  // Helper function to validate doctor availability with new weekly schedule system
  async validateDoctorAvailability(
    doctorId: string, 
    visitDate: Date, 
    sessionSlot: string | undefined, // Now optional
    visitTime?: string,
    excludeVisitId?: string
  ): Promise<{ isAvailable: boolean; message?: string; doctor: any }> {
    // Get doctor details
    const doctor = await HospitalDoctor.findById(doctorId);
    if (!doctor) {
      return { 
        isAvailable: false, 
        message: `No doctor with ID '${doctorId}' found.`,
        doctor: null
      };
    }

    // If sessionSlot is provided, validate against doctor's schedule
    if (sessionSlot) {
      // Get day of week from visitDate
      const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const dayOfWeek = daysOfWeek[visitDate.getDay()];

      // Check if doctor has weekly schedule (new system)
      if (doctor.weeklySchedule && doctor.weeklySchedule.length > 0) {
        logger.info({ doctorId, dayOfWeek, sessionSlot }, "Validating against weekly schedule");
        
        // Find schedule for the specific day
        const daySchedule = doctor.weeklySchedule.find((schedule: any) => schedule.dayOfWeek === dayOfWeek);
        
        if (!daySchedule) {
          return {
            isAvailable: false,
            message: `Doctor is not available on ${dayOfWeek}.`,
            doctor
          };
        }

        // Find the specific session slot in that day's schedule
        const sessionSlotSchedule = daySchedule.slots?.find((slot: any) => slot.session === sessionSlot);
        
        if (!sessionSlotSchedule) {
          const availableSessions = daySchedule.slots?.map((s: any) => s.session).join(", ") || "none";
          return {
            isAvailable: false,
            message: `Doctor is not available for '${sessionSlot}' session on ${dayOfWeek}. Available sessions: ${availableSessions}`,
            doctor
          };
        }

        // Validate visit time is within session time range
        if (visitTime && sessionSlotSchedule.startTime && sessionSlotSchedule.endTime) {
          const visitTimeMinutes = parseInt(visitTime.split(':')[0]) * 60 + parseInt(visitTime.split(':')[1]);
          const startTimeMinutes = parseInt(sessionSlotSchedule.startTime.split(':')[0]) * 60 + parseInt(sessionSlotSchedule.startTime.split(':')[1]);
          const endTimeMinutes = parseInt(sessionSlotSchedule.endTime.split(':')[0]) * 60 + parseInt(sessionSlotSchedule.endTime.split(':')[1]);

          if (visitTimeMinutes < startTimeMinutes || visitTimeMinutes > endTimeMinutes) {
            return {
              isAvailable: false,
              message: `Visit time ${visitTime} is outside the ${sessionSlot} session hours (${sessionSlotSchedule.startTime}-${sessionSlotSchedule.endTime}) on ${dayOfWeek}.`,
              doctor
            };
          }
        }

        logger.info({ doctorId, dayOfWeek, sessionSlot, visitTime }, "Day and session validation passed");
      } else if (doctor.sessions && doctor.sessions.length > 0) {
        // Fallback to old sessions array (backward compatibility)
        logger.info({ doctorId, sessionSlot }, "Using legacy sessions validation");
        
        if (!doctor.sessions.includes(sessionSlot)) {
          const availableSessions = doctor.sessions.join(", ");
          return {
            isAvailable: false,
            message: `Doctor is not available for '${sessionSlot}' session. Available sessions: ${availableSessions}`,
            doctor
          };
        }
      } else {
        // No schedule defined at all
        return {
          isAvailable: false,
          message: "Doctor has no schedule defined.",
          doctor
        };
      }
    }
    // If no sessionSlot provided, skip session validation (day-based token system)

    // Check slot capacity using maxAppointmentsPerSlot (only if session is provided)
    if (sessionSlot) {
      const maxSlots = doctor.maxAppointmentsPerSlot || 1;
      
      const query: any = {
        doctorId,
        visitDate: {
          $gte: new Date(new Date(visitDate).setHours(0, 0, 0, 0)),
          $lt: new Date(new Date(visitDate).setHours(23, 59, 59, 999))
        },
        sessionSlot,
        status: { $nin: ["Cancelled", "No Show"] }
      };

      // Exclude current visit when updating
      if (excludeVisitId) {
        query.visitId = { $ne: excludeVisitId };
      }

      const existingAppointments = await this.countDocuments(query);
      
      logger.info({ 
        doctorId, 
        visitDate: visitDate.toDateString(), 
        sessionSlot, 
        existingAppointments, 
        maxSlots 
      }, "Checking slot capacity");

      if (existingAppointments >= maxSlots) {
        return {
          isAvailable: false,
          message: `The ${sessionSlot} session on ${visitDate.toDateString()} is fully booked. Maximum ${maxSlots} appointment(s) allowed, ${existingAppointments} already booked.`,
          doctor
        };
      }
    }

    return { isAvailable: true, doctor };
  },

  // Validate discount password
  async validateDiscountPassword(discount: number, discountPassword?: string, existingDiscount?: number): Promise<void> {
    // If no discount, no validation needed
    if (!discount || discount === 0) {
      return;
    }

    // If discount hasn't changed, no validation needed
    if (existingDiscount !== undefined && discount === existingDiscount) {
      return;
    }

    // Discount provided but no password
    if (!discountPassword) {
      throw new APIError(
        400,
        "Discount Password Required",
        "A password is required to authorize discounts on visits."
      );
    }

    // Fetch discount password from constants
    const ConstantsModel = (await import("../../constants/models/constants.model")).default;
    const discountPasswordConstant = await ConstantsModel.findOne({
      key: "DISCOUNT_PASSWORD",
      isActive: true
    }).lean();

    if (!discountPasswordConstant) {
      throw new APIError(
        500,
        "Discount Not Configured",
        "Discount authorization is not configured. Please contact administrator."
      );
    }

    // Verify password
    const { comparePassword } = await import("@src/libs/password");
    const isValid = await comparePassword(discountPassword, discountPasswordConstant.value as string);

    if (!isValid) {
      logger.warn({ discount }, "Invalid discount password attempt");
      throw new APIError(
        401,
        "Invalid Discount Password",
        "The discount authorization password is incorrect."
      );
    }

    logger.info({ discount }, "Discount authorized successfully");
  },

  // Validate visit creation without actually creating it
  async validateVisitCreation(newVisit: Partial<HospitalVisit>): Promise<void> {
    // CRITICAL: Validate discount password FIRST before any other validations
    // This prevents orphan patient creation if password is invalid
    await (this as any).validateDiscountPassword(newVisit.discount, (newVisit as any).discountPassword);
    
    // Validate MongoDB ObjectId formats
    if (newVisit.patientId && !mongoose.Types.ObjectId.isValid(newVisit.patientId)) {
      throw new APIError(
        400,
        "Invalid Patient ID",
        `The provided patient ID '${newVisit.patientId}' is not a valid MongoDB ObjectId format.`
      );
    }
    
    if (!mongoose.Types.ObjectId.isValid(newVisit.doctorId!)) {
      throw new APIError(
        400,
        "Invalid Doctor ID",
        `The provided doctor ID '${newVisit.doctorId}' is not a valid MongoDB ObjectId format.`
      );
    }

    // Get doctor to check schedule configuration
    const doctor = await HospitalDoctor.findById(newVisit.doctorId);
    if (!doctor) {
      throw new APIError(
        404,
        "Doctor Not Found",
        `No doctor with ID '${newVisit.doctorId}' found.`
      );
    }

    // Check if doctor has configured schedule (except for Emergency visits)
    if (newVisit.visitType !== "Emergency") {
      const hasWeeklySchedule = Array.isArray(doctor.weeklySchedule) && doctor.weeklySchedule.length > 0;
      const hasLegacySessions = Array.isArray(doctor.sessions) && doctor.sessions.length > 0;
      const hasSchedule = hasWeeklySchedule || hasLegacySessions;
      
      if (!hasSchedule) {
        throw new APIError(
          400,
          "Doctor Schedule Not Configured",
          `Doctor '${doctor.name}' does not have a weekly schedule or sessions configured. Please configure the doctor's schedule in Doctors List before creating visits.`
        );
      }
    }

    // MR Visit Validations
    if (newVisit.visitType === "MR") {
      // Check if MR visits are allowed on this day based on doctor's weekly schedule
      if (doctor.weeklySchedule && doctor.weeklySchedule.length > 0) {
        const visitDayOfWeek = newVisit.visitDate!.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
        const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const visitDayName = dayNames[visitDayOfWeek];
        
        // Find the schedule for this day
        const daySchedule = doctor.weeklySchedule.find(schedule => schedule.dayOfWeek === visitDayName);
        
        if (daySchedule && daySchedule.mr === false) {
          throw new APIError(
            400,
            "MR Visit Not Allowed on This Day",
            `MR visits for Dr. ${doctor.name} are not allowed on ${visitDayName}. Please select a different date.`
          );
        }
        
        // If day not in schedule or mr is not explicitly set, check if any day has mr=true
        const mrAllowedDays = doctor.weeklySchedule.filter(schedule => schedule.mr === true);
        if (mrAllowedDays.length > 0 && (!daySchedule || daySchedule.mr !== true)) {
          const allowedDayNames = mrAllowedDays.map(s => s.dayOfWeek).join(", ");
          throw new APIError(
            400,
            "MR Visit Not Allowed on This Day",
            `MR visits for Dr. ${doctor.name} are only allowed on: ${allowedDayNames}. Please select a different date.`
          );
        }
      }
      
      // Check daily MR visit limit for this doctor
      if (doctor.mrMaxVisitsPerDay !== undefined && doctor.mrMaxVisitsPerDay !== null) {
        // Count existing MR visits for this doctor on this date (excluding Cancelled and No Show)
        const startOfDay = new Date(newVisit.visitDate!);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(newVisit.visitDate!);
        endOfDay.setHours(23, 59, 59, 999);
        
        const existingMRCount = await this.countDocuments({
          doctorId: newVisit.doctorId,
          visitType: "MR",
          visitDate: {
            $gte: startOfDay,
            $lte: endOfDay
          },
          status: { $nin: ["Cancelled", "No Show"] }
        });
        
        if (existingMRCount >= doctor.mrMaxVisitsPerDay) {
          throw new APIError(
            400,
            "MR Daily Limit Reached",
            `Maximum MR visits per day (${doctor.mrMaxVisitsPerDay}) has been reached for Dr. ${doctor.name} on this date. Please select a different date.`
          );
        }
      }
    }

    // Follow-up Visit Validations
    if (newVisit.visitType === "Follow-up" && newVisit.patientId) {
      // Calculate 7-day window from the requested visit date
      const sevenDaysAgo = new Date(newVisit.visitDate!);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      sevenDaysAgo.setHours(0, 0, 0, 0);
      
      const requestedVisitDate = new Date(newVisit.visitDate!);
      requestedVisitDate.setHours(23, 59, 59, 999);
      
      // 1. Check if patient has a New or Emergency visit with this doctor in last 7 days
      const prerequisiteVisit = await this.findOne({
        patientId: newVisit.patientId,
        doctorId: newVisit.doctorId,
        visitType: { $in: ["New", "Emergency"] },
        visitDate: {
          $gte: sevenDaysAgo,
          $lte: requestedVisitDate
        },
        status: { $nin: ["Cancelled", "No Show"] }
      }).lean();
      
      if (!prerequisiteVisit) {
        throw new APIError(
          400,
          "Follow-up Visit Not Allowed",
          `Patient must have a New or Emergency visit with Dr. ${doctor.name} within the last 7 days to book a Follow-up appointment. No qualifying visit found.`
        );
      }
      
      // 2. Check if patient already has 2 follow-up visits in this 7-day period
      const existingFollowUps = await this.countDocuments({
        patientId: newVisit.patientId,
        doctorId: newVisit.doctorId,
        visitType: "Follow-up",
        visitDate: {
          $gte: sevenDaysAgo,
          $lte: requestedVisitDate
        },
        status: { $nin: ["Cancelled", "No Show"] }
      });
      
      if (existingFollowUps >= 2) {
        throw new APIError(
          400,
          "Follow-up Limit Reached",
          `Patient has already booked the maximum of 2 follow-up visits with Dr. ${doctor.name} in the last 7 days. Please wait before booking another follow-up.`
        );
      }
    }

    // Check doctor availability for the requested slot (if session provided)
    const HospitalVisitModel = this as any;
    const availabilityCheck = await HospitalVisitModel.validateDoctorAvailability(
      newVisit.doctorId!,
      newVisit.visitDate!,
      newVisit.sessionSlot, // Now optional
      newVisit.visitTime
    );

    if (!availabilityCheck.isAvailable) {
      throw new APIError(
        400,
        "Doctor Not Available",
        availabilityCheck.message || "Doctor is not available for the requested time slot."
      );
    }
  },

  async createHospitalVisit(newVisit: HospitalVisit): Promise<HospitalVisit> {
    logger.info({ visitId: newVisit.visitId, patientId: newVisit.patientId, doctorId: newVisit.doctorId }, "Creating new hospital visit");
    
    // Validate discount password if discount is provided
    const HospitalVisitModel = this as any;
    await HospitalVisitModel.validateDiscountPassword(newVisit.discount, (newVisit as any).discountPassword);
    
    // Run all validations
    await HospitalVisitModel.validateVisitCreation(newVisit);
    
    // Check for duplicate visitId — only enforce for non-Follow-up-report visits
    if (newVisit.visitType !== "Follow-up-report") {
      const duplicateId = await this.findOne({ visitId: newVisit.visitId });
      if (duplicateId) {
        logger.warn({ visitId: newVisit.visitId }, "Duplicate visit ID detected");
        throw new APIError(
          409,
          "Visit Already Exists",
          `Visit with ID '${newVisit.visitId}' already exists.`
        );
      }
    }

    // Check for duplicate appointmentId
    const duplicateAppointmentId = await this.findOne({ appointmentId: newVisit.appointmentId });
    if (duplicateAppointmentId) {
      logger.warn({ appointmentId: newVisit.appointmentId }, "Duplicate appointment ID detected");
      throw new APIError(
        409,
        "Appointment Already Exists",
        `Appointment with ID '${newVisit.appointmentId}' already exists.`
      );
    }

    // Validate patient exists
    const patient = await HospitalPatient.findById(newVisit.patientId);
    if (!patient) {
      logger.warn({ patientId: newVisit.patientId }, "Patient not found for visit creation");
      throw new APIError(
        404,
        "Patient Not Found",
        `No patient with ID '${newVisit.patientId}' found.`
      );
    }

    // Get doctor to check schedule configuration (before availability check)
    const doctor = await HospitalDoctor.findById(newVisit.doctorId);
    if (!doctor) {
      logger.warn({ doctorId: newVisit.doctorId }, "Doctor not found for visit creation");
      throw new APIError(
        404,
        "Doctor Not Found",
        `No doctor with ID '${newVisit.doctorId}' found.`
      );
    }

    // Check if doctor has configured schedule (except for Emergency visits)
    if (newVisit.visitType !== "Emergency") {
      const hasSchedule = doctor.weeklySchedule && doctor.weeklySchedule.length > 0;
      
      if (!hasSchedule) {
        logger.warn({ 
          doctorId: newVisit.doctorId, 
          doctorName: doctor.name,
          visitType: newVisit.visitType 
        }, "Doctor has not configured schedule, blocking visit creation");
        
        throw new APIError(
          400,
          "Doctor Schedule Not Configured",
          `Doctor ${doctor.name} has not configured their weekly schedule. Please ask the doctor to set up their working hours before booking appointments. Emergency visits are still allowed.`
        );
      }
    } else {
      logger.info({ 
        doctorId: newVisit.doctorId, 
        visitType: newVisit.visitType 
      }, "Emergency visit - bypassing schedule configuration check");
    }

    // Validate doctor availability using new comprehensive validation
    const availabilityCheck = await (this as any).validateDoctorAvailability(
      newVisit.doctorId,
      newVisit.visitDate,
      newVisit.sessionSlot, // Now optional
      newVisit.visitTime
    );

    if (!availabilityCheck.isAvailable) {
      logger.warn({ 
        doctorId: newVisit.doctorId, 
        visitDate: newVisit.visitDate, 
        sessionSlot: newVisit.sessionSlot,
        reason: availabilityCheck.message 
      }, "Doctor not available for requested slot");
      
      throw new APIError(
        availabilityCheck.message?.includes("not found") ? 404 : 409,
        availabilityCheck.message?.includes("fully booked") ? "Slot Fully Booked" : "Doctor Not Available",
        availabilityCheck.message || "Doctor is not available for the requested time slot."
      );
    }

    const availableDoctor = availabilityCheck.doctor;
    logger.info({ 
      doctorId: newVisit.doctorId, 
      doctorName: availableDoctor.name, 
      visitType: newVisit.visitType,
      appointmentType: newVisit.appointmentType 
    }, "Doctor available, calculating price");

    // Calculate price based on doctor's visitType + appointmentType combination
    let calculatedPrice = 0;
    const visitTypeCharge = availableDoctor.visitTypes?.find(
      (vt: any) => vt.visitType === newVisit.visitType && vt.appointmentType === newVisit.appointmentType
    );
    if (visitTypeCharge) {
      calculatedPrice = visitTypeCharge.charge;
      logger.info({ 
        visitType: newVisit.visitType, 
        appointmentType: newVisit.appointmentType,
        price: calculatedPrice 
      }, "Price calculated from doctor's visit types");
    } else {
      // Log warning but don't throw error - allow visit creation without price
      logger.warn({ 
        doctorId: newVisit.doctorId, 
        visitType: newVisit.visitType,
        appointmentType: newVisit.appointmentType,
        availableTypes: availableDoctor.visitTypes?.map((vt: any) => `${vt.visitType}-${vt.appointmentType}`) 
      }, "Doctor does not have pricing for this visit type + appointment type combination. Visit will be created with price 0.");
    }

    // Generate token number per doctor per day (separate sequences for Emergency vs Regular, and per sessionSlot)
    const tokenNumber = await getNextTokenNumber.call(
      this as any, 
      newVisit.visitDate, 
      newVisit.doctorId,
      newVisit.visitType, // Pass visitType for separate token sequences
      newVisit.sessionSlot // Pass sessionSlot for slot-specific token sequence
    );
    
    logger.info({ 
      tokenNumber,
      visitType: newVisit.visitType,
      visitDate: newVisit.visitDate, 
      doctorId: newVisit.doctorId, 
      sessionSlot: newVisit.sessionSlot || 'not specified',
      isEmergency: newVisit.visitType === "Emergency"
    }, "Token generated for doctor's slot/day (separate Emergency/Regular sequences)");

    // Create visit with calculated price and token number
    const visitWithCalculatedFields: any = {
      ...newVisit,
      price: calculatedPrice,
      tokenNumber
    };

    // Add discountAuthorizedAt if discount was provided
    if (newVisit.discount && newVisit.discount > 0) {
      visitWithCalculatedFields.discountAuthorizedAt = new Date();
    }

    // Remove discountPassword before saving (it's not part of the schema)
    delete visitWithCalculatedFields.discountPassword;

    // Compute procedure charge totals (procedures are already resolved snapshots from the service layer)
    const procedures: any[] = visitWithCalculatedFields.procedures || [];
    const procedureChargesTotal = procedures.reduce((sum: number, p: any) => sum + (p.price || 0), 0);
    const discount = visitWithCalculatedFields.discount || 0;
    const subtotal = calculatedPrice + procedureChargesTotal;
    const totalPrice = Math.max(0, subtotal - discount);

    visitWithCalculatedFields.procedureChargesTotal = procedureChargesTotal;
    visitWithCalculatedFields.subtotal = subtotal;
    visitWithCalculatedFields.totalPrice = totalPrice;

    const visit = await new this(visitWithCalculatedFields).save();
    logger.info({ 
      visitId: visit.visitId, 
      appointmentId: visit.appointmentId, 
      tokenNumber: visit.tokenNumber,
      visitType: visit.visitType,
      price: visit.price,
      discount: visit.discount
    }, "Visit created successfully");
    return visit.toObject();
  },

  async readHospitalVisits(query: any, search: any, skip: number, limit: number) {
    // Separate patient name search from regular filters
    const patientNameSearch = search._patientNameSearch;
    const regularSearch = { ...search };
    delete regularSearch._patientNameSearch;
    // Remove $or from pre-match (will be re-applied after lookup to include patient.name)
    const preMatchOr = regularSearch.$or;
    delete regularSearch.$or;

    const preMatchQuery = { 
      isDeleted: { $ne: true }, // Exclude soft deleted
      ...query, 
      ...regularSearch 
    };

    const pipeline: any[] = [
      { $match: preMatchQuery },
      // Lookup patient so we can filter/search by patient name
      {
        $addFields: { patientObjectId: { $toObjectId: "$patientId" } }
      },
      {
        $lookup: {
          from: "hospitalpatients",
          localField: "patientObjectId",
          foreignField: "_id",
          as: "patient",
          pipeline: [{ $project: { name: 1, title: 1, phone: 1, mrd: 1, patientUhid: 1, age: 1, months: 1, days: 1, gender: 1, companyName: 1, division: 1, isMRPatient: 1, abhaLinked: 1, abhaPatientId: 1 } }]
        }
      },
      { $unwind: { path: "$patient", preserveNullAndEmptyArrays: true } },
    ];

    // After lookup, apply $or that includes both visit fields AND patient.name
    if (patientNameSearch) {
      const orConditions: any[] = [
        { "patient.name": { $regex: patientNameSearch, $options: "i" } },
        { "patient.mrd":  { $regex: patientNameSearch, $options: "i" } },
      ];
      // Add the original $or conditions (visitId, etc.) if they existed
      if (preMatchOr) {
        orConditions.push(...preMatchOr);
      }
      pipeline.push({ $match: { $or: orConditions } });
    } else if (preMatchOr) {
      // No patient name search, just apply original $or
      pipeline.push({ $match: { $or: preMatchOr } });
    }

    // Lookup createdBy user
    pipeline.push(
      {
        $addFields: {
          createdByObjectId: {
            $cond: {
              if: { $and: [{ $ne: ["$createdBy", null] }, { $ne: ["$createdBy", ""] }] },
              then: { $toObjectId: "$createdBy" },
              else: null
            }
          }
        }
      },
      {
        $lookup: {
          from: "hospitalusers",
          localField: "createdByObjectId",
          foreignField: "_id",
          as: "createdByUser",
          pipeline: [{ $project: { name: 1, role: 1, username: 1 } }]
        }
      },
      { $unwind: { path: "$createdByUser", preserveNullAndEmptyArrays: true } }
    );

    pipeline.push(
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      { $project: { __v: 0, patientObjectId: 0, createdByObjectId: 0, "patient.__v": 0, "createdByUser.__v": 0 } }
    );

    const visits = await this.aggregate(pipeline);

    return visits.map((visit: any) => {
      if (visit._id && typeof visit._id === 'object') visit._id = visit._id.toString();
      if (visit.visitDate instanceof Date) visit.visitDate = visit.visitDate.toISOString().split('T')[0];
      if (visit.createdAt instanceof Date) visit.createdAt = visit.createdAt.toISOString();
      if (visit.updatedAt instanceof Date) visit.updatedAt = visit.updatedAt.toISOString();
      if (visit.patient?._id && typeof visit.patient._id === 'object') visit.patient._id = visit.patient._id.toString();
      if (visit.createdByUser?._id && typeof visit.createdByUser._id === 'object') visit.createdByUser._id = visit.createdByUser._id.toString();
      return visit;
    });
  },

  async readHospitalVisit(visitId: string) {
    const pipeline: any[] = [
      { $match: { visitId, isDeleted: { $ne: true } } },
      
      // Lookup patient details using patientId
      {
        $addFields: {
          patientObjectId: { $toObjectId: "$patientId" }
        }
      },
      {
        $lookup: {
          from: "hospitalpatients",
          localField: "patientObjectId",
          foreignField: "_id",
          as: "patient"
        }
      },
      { $unwind: { path: "$patient", preserveNullAndEmptyArrays: true } },
      
      // Lookup doctor details using doctorId
      {
        $addFields: {
          doctorObjectId: { $toObjectId: "$doctorId" }
        }
      },
      {
        $lookup: {
          from: "hospitaldoctors",
          localField: "doctorObjectId",
          foreignField: "_id",
          as: "doctor"
        }
      },
      { $unwind: { path: "$doctor", preserveNullAndEmptyArrays: true } },
      
      // Lookup createdBy user
      {
        $addFields: {
          createdByObjectId: {
            $cond: {
              if: { $and: [{ $ne: ["$createdBy", null] }, { $ne: ["$createdBy", ""] }] },
              then: { $toObjectId: "$createdBy" },
              else: null
            }
          }
        }
      },
      {
        $lookup: {
          from: "hospitalusers",
          localField: "createdByObjectId",
          foreignField: "_id",
          as: "createdByUser",
          pipeline: [{ $project: { name: 1, role: 1, username: 1 } }]
        }
      },
      { $unwind: { path: "$createdByUser", preserveNullAndEmptyArrays: true } },
      
      {
        $project: {
          __v: 0,
          "patient.__v": 0,
          "doctor.__v": 0,
          patientObjectId: 0,
          doctorObjectId: 0,
          createdByObjectId: 0,
          "createdByUser.__v": 0,
        }
      }
    ];

    const visits = await this.aggregate(pipeline);
    const visit = visits[0];
    
    if (!visit) {
      throw new APIError(
        404,
        "Visit Not Found",
        `No visit with ID '${visitId}' found.`
      );
    }
    
    // Manually serialize _id and dates for aggregation results
    if (visit._id && typeof visit._id === 'object') {
      visit._id = visit._id.toString();
    }
    // Serialize visitDate to YYYY-MM-DD
    if (visit.visitDate && visit.visitDate instanceof Date) {
      visit.visitDate = visit.visitDate.toISOString().split('T')[0];
    }
    // Serialize createdAt to ISO string
    if (visit.createdAt && visit.createdAt instanceof Date) {
      visit.createdAt = visit.createdAt.toISOString();
    }
    // Serialize updatedAt to ISO string
    if (visit.updatedAt && visit.updatedAt instanceof Date) {
      visit.updatedAt = visit.updatedAt.toISOString();
    }
    
    // Serialize patient dates
    if (visit.patient) {
      if (visit.patient._id && typeof visit.patient._id === 'object') {
        visit.patient._id = visit.patient._id.toString();
      }
      if (visit.patient.dob && visit.patient.dob instanceof Date) {
        visit.patient.dob = visit.patient.dob.toISOString().split('T')[0];
      }
      if (visit.patient.createdAt && visit.patient.createdAt instanceof Date) {
        visit.patient.createdAt = visit.patient.createdAt.toISOString();
      }
      if (visit.patient.updatedAt && visit.patient.updatedAt instanceof Date) {
        visit.patient.updatedAt = visit.patient.updatedAt.toISOString();
      }
    }
    
    // Serialize doctor dates
    if (visit.doctor) {
      if (visit.doctor._id && typeof visit.doctor._id === 'object') {
        visit.doctor._id = visit.doctor._id.toString();
      }
      if (visit.doctor.dob && visit.doctor.dob instanceof Date) {
        visit.doctor.dob = visit.doctor.dob.toISOString().split('T')[0];
      }
      if (visit.doctor.createdAt && visit.doctor.createdAt instanceof Date) {
        visit.doctor.createdAt = visit.doctor.createdAt.toISOString();
      }
      if (visit.doctor.updatedAt && visit.doctor.updatedAt instanceof Date) {
        visit.doctor.updatedAt = visit.doctor.updatedAt.toISOString();
      }
    }

    // Serialize createdByUser
    if (visit.createdByUser?._id && typeof visit.createdByUser._id === 'object') {
      visit.createdByUser._id = visit.createdByUser._id.toString();
    }
    
    return visit;
  },

  async updateHospitalVisit(visitId: string, updates: Partial<HospitalVisit>): Promise<HospitalVisit> {
    // Fetch existing visit for discount comparison
    const existing = updates.discount !== undefined 
      ? await this.findOne({ visitId, isDeleted: { $ne: true } }).lean()
      : null;

    // Validate discount password if discount is being updated
    if (updates.discount !== undefined) {
      const HospitalVisitModel = this as any;
      await HospitalVisitModel.validateDiscountPassword(
        updates.discount, 
        (updates as any).discountPassword,
        existing?.discount
      );
      
      // Add discountAuthorizedAt if discount is being set
      if (updates.discount && updates.discount > 0) {
        (updates as any).discountAuthorizedAt = new Date();
      }
    }

    // Remove discountPassword before updating (it's not part of the schema)
    delete (updates as any).discountPassword;

    // Prevent doctor updates - doctor cannot be changed once visit is created
    if (updates.doctorId) {
      throw new APIError(
        400,
        "Doctor Update Not Allowed",
        "Doctor cannot be changed for an existing visit. Please cancel this visit and create a new one with the correct doctor."
      );
    }

    // If updating date, slot, visitTime, patient, or appointmentType, check for conflicts and validations
    if (updates.visitDate || updates.sessionSlot || updates.visitTime || updates.appointmentType || updates.patientId) {
      const existing = await this.findOne({ visitId });
      if (!existing) {
        throw new APIError(
          404,
          "Visit Not Found",
          `No visit with ID '${visitId}' found.`
        );
      }

      const doctorToCheck = existing.doctorId;
      const dateToCheck = updates.visitDate || existing.visitDate;
      const slotToCheck = updates.sessionSlot !== undefined ? updates.sessionSlot : existing.sessionSlot;
      const timeToCheck = updates.visitTime || existing.visitTime;
      const patientToCheck = updates.patientId || existing.patientId;

      // Validate patient exists if updating patientId
      if (updates.patientId) {
        const patient = await HospitalPatient.findById(patientToCheck);
        if (!patient) {
          throw new APIError(
            404,
            "Patient Not Found",
            `No patient with ID '${patientToCheck}' found.`
          );
        }
      }

      // Validate doctor availability using new comprehensive validation
      // Only validate if doctor, date, slot, or time is changing
      if (updates.doctorId || updates.visitDate || updates.sessionSlot !== undefined || updates.visitTime) {
        const availabilityCheck = await (this as any).validateDoctorAvailability(
          doctorToCheck,
          dateToCheck,
          slotToCheck, // Can be undefined now
          timeToCheck,
          visitId // Exclude current visit from capacity check
        );

        if (!availabilityCheck.isAvailable) {
          logger.warn({ 
            visitId,
            doctorId: doctorToCheck, 
            visitDate: dateToCheck, 
            sessionSlot: slotToCheck,
            reason: availabilityCheck.message 
          }, "Doctor not available for updated slot");
          
          throw new APIError(
            availabilityCheck.message?.includes("not found") ? 404 : 409,
            availabilityCheck.message?.includes("fully booked") ? "Slot Fully Booked" : "Doctor Not Available",
            availabilityCheck.message || "Doctor is not available for the requested time slot."
          );
        }

        const doctor = availabilityCheck.doctor;

        // Validate visitType and recalculate price if needed
        if (updates.visitType) {
          const visitTypeCharge = doctor.visitTypes?.find((vt: any) => vt.type === updates.visitType);
          if (visitTypeCharge) {
            // Update price based on new visitType
            updates.price = visitTypeCharge.charge;
            logger.info({ visitId, visitType: updates.visitType, newPrice: updates.price }, "Price recalculated for updated visit type");
          } else {
            // Log warning but don't throw error - allow update without price change
            logger.warn({ visitId, doctorId: doctorToCheck, visitType: updates.visitType }, "Doctor does not have pricing for visit type. Price will not be updated.");
          }
        }
      }

      // Check if visitType is changing between Emergency and Regular (requires token regeneration)
      const isVisitTypeChanging = updates.visitType && updates.visitType !== existing.visitType;
      const isEmergencyChange = isVisitTypeChanging && (
        (existing.visitType === "Emergency" && updates.visitType !== "Emergency") ||
        (existing.visitType !== "Emergency" && updates.visitType === "Emergency")
      );

      // Check if sessionSlot is changing
      const isSessionSlotChanging = updates.sessionSlot !== undefined && updates.sessionSlot !== existing.sessionSlot;

      // If date is changing OR visitType is changing between Emergency/Regular OR sessionSlot is changing, regenerate token number
      const isDateChanging = updates.visitDate && updates.visitDate.getTime() !== existing.visitDate.getTime();
      
      if (isDateChanging || isEmergencyChange || isSessionSlotChanging) {
        const dateToCheck = updates.visitDate || existing.visitDate;
        const visitTypeToCheck = updates.visitType || existing.visitType;
        const doctorToCheck = updates.doctorId || existing.doctorId;
        const sessionSlotToCheck = updates.sessionSlot !== undefined ? updates.sessionSlot : existing.sessionSlot;
        
        updates.tokenNumber = await getNextTokenNumber.call(
          this as any, 
          dateToCheck, 
          doctorToCheck,
          visitTypeToCheck,
          sessionSlotToCheck
        );
        
        const reason = isDateChanging 
          ? "date change" 
          : isEmergencyChange 
            ? "visitType change between Emergency/Regular" 
            : "sessionSlot change";

        logger.info({ 
          visitId, 
          newDate: dateToCheck, 
          newTokenNumber: updates.tokenNumber,
          visitType: visitTypeToCheck,
          sessionSlot: sessionSlotToCheck || "not specified",
          isEmergency: visitTypeToCheck === "Emergency",
          reason
        }, `Token regenerated due to ${reason} (separate slot/Emergency/Regular sequences)`);
      }
    }

    // Handle manual token number updates (if provided)
    if (updates.tokenNumber !== undefined) {
      const existing = await this.findOne({ visitId });
      if (!existing) {
        throw new APIError(
          404,
          "Visit Not Found",
          `No visit with ID '${visitId}' found.`
        );
      }

      // Check if token number is already taken for the same doctor, date, visitType category, and sessionSlot
      const dateToCheck = updates.visitDate || existing.visitDate;
      const doctorToCheck = updates.doctorId || existing.doctorId;
      const visitTypeToCheck = updates.visitType || existing.visitType;
      const isEmergency = visitTypeToCheck === "Emergency";
      const sessionSlotToCheck = updates.sessionSlot !== undefined ? updates.sessionSlot : existing.sessionSlot;

      const tokenConflictFilter: any = {
        isDeleted: { $ne: true }, // Exclude soft deleted
        doctorId: doctorToCheck,
        visitDate: {
          $gte: new Date(new Date(dateToCheck).setHours(0, 0, 0, 0)),
          $lt: new Date(new Date(dateToCheck).setHours(23, 59, 59, 999))
        },
        tokenNumber: updates.tokenNumber,
        visitId: { $ne: visitId },
        visitType: isEmergency ? "Emergency" : { $ne: "Emergency" }
      };

      if (sessionSlotToCheck) {
        tokenConflictFilter.sessionSlot = sessionSlotToCheck;
      } else {
        tokenConflictFilter.$or = [
          { sessionSlot: { $exists: false } },
          { sessionSlot: null },
          { sessionSlot: "" }
        ];
      }

      const conflictingToken = await this.findOne(tokenConflictFilter);

      if (conflictingToken) {
        const slotLabel = sessionSlotToCheck ? ` for ${sessionSlotToCheck} session` : " (without session slot)";
        throw new APIError(
          409,
          "Token Number Already Taken",
          `Token number ${updates.tokenNumber}${slotLabel} is already assigned for ${new Date(dateToCheck).toDateString()}.`
        );
      }
    }

    const updated = await this.findOneAndUpdate(
      { visitId, isDeleted: { $ne: true } },
      { $set: updates },
      { new: true }
    );
    
    if (!updated) {
      throw new APIError(
        404,
        "Visit Not Found",
        `No visit with ID '${visitId}' found.`
      );
    }
    
    return updated.toObject();
  },

  async deleteHospitalVisit(visitId: string): Promise<void> {
    const deleted = await this.findOneAndDelete({ visitId });
    
    if (!deleted) {
      throw new APIError(
        404,
        "Visit Not Found",
        `No visit with ID '${visitId}' found.`
      );
    }
  },

  async getVisitsByPatient(patientId: string) {
    const visits = await this.aggregate([
      { $match: { patientId, isDeleted: { $ne: true } } },
      { $sort: { visitDate: -1, tokenNumber: 1 } },
      {
        $addFields: { doctorObjectId: { $toObjectId: "$doctorId" } }
      },
      {
        $lookup: {
          from: "hospitaldoctors",
          localField: "doctorObjectId",
          foreignField: "_id",
          as: "doctor",
          pipeline: [{ $project: { name: 1, designation: 1, specialization: 1, department: 1, doctorId: 1 } }]
        }
      },
      { $unwind: { path: "$doctor", preserveNullAndEmptyArrays: true } },
      { $project: { __v: 0, doctorObjectId: 0, "doctor.__v": 0 } }
    ]);

    return visits.map((visit: any) => {
      if (visit._id && typeof visit._id === "object") visit._id = visit._id.toString();
      if (visit.visitDate instanceof Date) visit.visitDate = visit.visitDate.toISOString().split("T")[0];
      if (visit.createdAt instanceof Date) visit.createdAt = visit.createdAt.toISOString();
      if (visit.updatedAt instanceof Date) visit.updatedAt = visit.updatedAt.toISOString();
      if (visit.doctor?._id && typeof visit.doctor._id === "object") visit.doctor._id = visit.doctor._id.toString();
      return visit;
    });
  },

  async getVisitByTokenNumber(tokenNumber: number, date: Date, doctorId: string, sessionSlot?: string) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const filter: any = {
      tokenNumber,
      doctorId,
      visitDate: {
        $gte: startOfDay,
        $lte: endOfDay
      },
      isDeleted: { $ne: true }
    };

    if (sessionSlot) {
      filter.sessionSlot = sessionSlot;
    }

    const visit = await this.findOne(filter);

    if (!visit) {
      const slotLabel = sessionSlot ? ` in ${sessionSlot} session` : "";
      throw new APIError(
        404,
        "Visit Not Found",
        `No visit with token number ${tokenNumber}${slotLabel} found for doctor '${doctorId}' on ${date.toDateString()}.`
      );
    }

    return visit.toObject();
  },

  async getVisitsByDoctor(doctorId: string, date?: Date) {
    const query: any = { doctorId, isDeleted: { $ne: true } };
    
    if (date) {
      query.visitDate = {
        $gte: new Date(new Date(date).setHours(0, 0, 0, 0)),
        $lt: new Date(new Date(date).setHours(23, 59, 59, 999))
      };
    }

    const visits = await this.find(query)
      .sort({ visitDate: 1, sessionSlot: 1 })
      .exec();
    
    return visits.map((visit: HospitalVisitDoc) => visit.toObject());
  },

  async getDoctorSchedule(doctorId: string, date: Date) {
    // Get doctor details to get available sessions
    const doctor = await HospitalDoctor.findById(doctorId);
    if (!doctor) {
      throw new APIError(
        404,
        "Doctor Not Found",
        `No doctor with ID '${doctorId}' found.`
      );
    }

    // Get visits for the specific date using the query directly
    const query: any = { doctorId, isDeleted: { $ne: true } };
    query.visitDate = {
      $gte: new Date(new Date(date).setHours(0, 0, 0, 0)),
      $lt: new Date(new Date(date).setHours(23, 59, 59, 999))
    };

    const visits = await this.find(query)
      .sort({ visitDate: 1, sessionSlot: 1 })
      .exec();
    
    const visitObjects = visits.map((visit: HospitalVisitDoc) => visit.toObject());
    
    // Create schedule based on doctor's available sessions
    const schedule = (doctor.sessions || []).map((session: string) => {
      const visitsInSession = visitObjects.filter((visit: any) => visit.sessionSlot === session);
      const maxSlots = doctor.maxAppointmentsPerSlot || 1;
      const availableSlots = maxSlots - visitsInSession.length;
      
      return {
        session,
        available: availableSlots > 0,
        availableSlots,
        maxSlots,
        visits: visitsInSession
      };
    });

    return {
      doctorId,
      date,
      schedule
    };
  },

  async calculateVisitPrice(doctorId: string, visitType: string, appointmentType: string): Promise<{ price: number; doctorId: string; visitType: string; appointmentType: string; available: boolean }> {
    logger.info({ doctorId, visitType, appointmentType }, "Calculating visit price - looking up doctor");
    
    // Validate doctorId format (MongoDB ObjectId)
    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      logger.warn({ doctorId }, "Invalid doctor ID format provided");
      throw new APIError(
        400,
        "Invalid Doctor ID",
        `The provided doctor ID '${doctorId}' is not a valid MongoDB ObjectId format.`
      );
    }
    
    // Get doctor details
    const doctor = await HospitalDoctor.findById(doctorId);
    if (!doctor) {
      logger.warn({ doctorId }, "Doctor not found for price calculation");
      throw new APIError(
        404,
        "Doctor Not Found",
        `No doctor with ID '${doctorId}' found. Please verify the doctor ID.`
      );
    }

    logger.info({ doctorId, doctorName: doctor.name, visitType, appointmentType }, "Doctor found, checking visit type + appointment type pricing");

    // Find the visit type + appointment type charge combination
    const visitTypeCharge = doctor.visitTypes?.find(
      (vt: any) => vt.visitType === visitType && vt.appointmentType === appointmentType
    );
    
    if (!visitTypeCharge) {
      logger.warn({ 
        doctorId, 
        doctorName: doctor.name, 
        visitType,
        appointmentType,
        availableTypes: doctor.visitTypes?.map((vt: any) => `${vt.visitType}-${vt.appointmentType}`) 
      }, "Visit type + appointment type combination not available for doctor");
      return {
        price: 0,
        doctorId,
        visitType,
        appointmentType,
        available: false
      };
    }

    logger.info({ doctorId, visitType, appointmentType, price: visitTypeCharge.charge }, "Price calculated successfully");
    
    return {
      price: visitTypeCharge.charge,
      doctorId,
      visitType,
      appointmentType,
      available: true
    };
  },
};

// Transform with .toObject to remove __v and properly serialize _id and dates
if (!hospitalVisitSchema.options.toObject) hospitalVisitSchema.options.toObject = {};
hospitalVisitSchema.options.toObject.transform = (_doc: any, ret: any) => {
  const { __v, ...clean } = ret;
  // Ensure _id is properly serialized as string
  if (clean._id && typeof clean._id === 'object') {
    clean._id = clean._id.toString();
  }
  // Ensure visitDate is properly serialized as YYYY-MM-DD format (same as DOB)
  if (clean.visitDate && clean.visitDate instanceof Date) {
    clean.visitDate = clean.visitDate.toISOString().split('T')[0]; // Return as YYYY-MM-DD format
  }
  // Ensure createdAt is properly serialized as ISO string
  if (clean.createdAt && clean.createdAt instanceof Date) {
    clean.createdAt = clean.createdAt.toISOString();
  }
  // Ensure updatedAt is properly serialized as ISO string
  if (clean.updatedAt && clean.updatedAt instanceof Date) {
    clean.updatedAt = clean.updatedAt.toISOString();
  }
  return clean;
};

const HospitalVisit = mongoose.model<HospitalVisitDoc, HospitalVisitModel>(
  "HospitalVisit",
  hospitalVisitSchema
);

export default HospitalVisit;