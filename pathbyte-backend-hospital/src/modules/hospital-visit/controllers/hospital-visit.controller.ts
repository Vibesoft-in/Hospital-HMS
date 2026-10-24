import { validate } from "jsonschema";
import { Request, Response, NextFunction } from "express";
import { APIError } from "@src/shared";
import { AppError } from "@src/libs/errors";
import { logger } from "@src/config/logger";
import { isPagiaSystem } from "@src/libs/utils/systemConfig";
import hospitalVisitService from "../services/hospital-visit.service";
import visitEventsService, { formatDoctorShift } from "../services/visit-events.service";
import hospitalVisitNewSchema from "../validators/hospital-visit-new.json";
import hospitalVisitWithTransactionNewSchema from "../validators/hospital-visit-with-transaction-new.json";
import hospitalVisitWithPatientNewSchema from "../validators/hospital-visit-with-patient-new.json";
import hospitalVisitWithPatientPagiaNewSchema from "../validators/hospital-visit-with-patient-pagia-new.json";
import hospitalVisitUpdateSchema from "../validators/hospital-visit-update.json";
import {
  CreateHospitalVisitDTO,
  CreateHospitalVisitWithPatientDTO,
  CreateHospitalVisitWithTransactionDTO,
  UpdateHospitalVisitDTO,
} from "../dtos/hospital-visit.dto";

// Helper to populate patient and doctor info for SSE events
async function populateVisitForSSE(visit: any) {
  try {
    // Import models dynamically to avoid circular dependencies
    const HospitalPatientModel = (await import("../../hospital-patient/models/hospital-patient.model")).default;
    const HospitalDoctorModel = (await import("../../hospital-doctor/models/hospital-doctor.model")).default;
    
    // Fetch patient info
    const patient = await HospitalPatientModel.findById(visit.patientId).lean();
    
    // Fetch doctor info
    const doctor = await HospitalDoctorModel.findById(visit.doctorId).lean();
    
    // Calculate shift from weeklySchedule for the visit date
    const visitDate = visit.visitDate ? new Date(visit.visitDate) : new Date();
    const shift = doctor?.weeklySchedule ? formatDoctorShift(doctor.weeklySchedule, visitDate) : undefined;
    
    // Generate signed posterUrl if present
    let posterUrl: string | undefined;
    if ((doctor as any)?.posterUrl) {
      const { getS3SignedUrl } = await import("@src/libs/utils/s3Upload");
      posterUrl = await getS3SignedUrl((doctor as any).posterUrl);
    }
    
    return {
      visit: {
        _id: visit._id,
        visitId: visit.visitId,
        appointmentId: visit.appointmentId,
        visitType: visit.visitType,
        appointmentType: visit.appointmentType,
        visitTime: visit.visitTime,
        tokenNumber: visit.tokenNumber,
        status: visit.status,
        patient: patient ? {
          mrd: patient.mrd,
          patientUhid: (patient as any).patientUhid,
          name: patient.name,
          age: patient.age,
          gender: patient.gender
        } : undefined
      },
      doctorInfo: doctor ? {
        name: doctor.name,
        department: doctor.department,
        designation: doctor.designation,
        yearsOfExperience: doctor.yearsOfExperience,
        opdNumber: (doctor as any).opdNumber,
        posterUrl,
        shift
      } : undefined
    };
  } catch (error: any) {
    logger.error({ error: error.message, visitId: visit.visitId }, "Failed to populate visit for SSE");
    // Return minimal info if population fails
    return {
      visit: {
        _id: visit._id,
        visitId: visit.visitId,
        appointmentId: visit.appointmentId,
        visitType: visit.visitType,
        appointmentType: visit.appointmentType,
        visitTime: visit.visitTime,
        tokenNumber: visit.tokenNumber,
        status: visit.status
      },
      doctorInfo: undefined
    };
  }
}

// Create visit with existing patient ID (simple)
async function createHospitalVisit(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const input: CreateHospitalVisitDTO = request.body;
  const validation = validate(input, hospitalVisitNewSchema);
  
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
    const createdBy = (request as any).hospitalUser?._id?.toString();
    const newVisit = await hospitalVisitService.createHospitalVisit({ ...input, createdBy } as any);
    logger.info({ visitId: newVisit.visitId, patientId: input.patientId }, "Visit created successfully");
    
    // Emit event for live updates with populated patient info
    const visitDate = typeof newVisit.visitDate === 'string' ? newVisit.visitDate : new Date(newVisit.visitDate).toISOString().split('T')[0];
    const { visit: populatedVisit, doctorInfo } = await populateVisitForSSE(newVisit);
    visitEventsService.emitNewVisit(
      newVisit.doctorId,
      visitDate,
      populatedVisit,
      doctorInfo
    );
    
    return response.success({ visit: newVisit }, "Visit created successfully", 201);
  } catch (err: any) {
    logger.error({ error: err.message, stack: err.stack, input }, "Failed to create visit");
    
    // Handle specific error types
    if (err instanceof APIError) {
      return next(err);
    }
    
    return next(
      new AppError(
        500, 
        "Unable to create visit. Please check the provided information and try again.", 
        err.message ?? undefined
      )
    );
  }
}

// Create visit with existing patient ID and optional transaction
async function createHospitalVisitWithTransaction(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const input: CreateHospitalVisitWithTransactionDTO = request.body;
  
  // Validate visit data with transaction schema
  const validation = validate(input, hospitalVisitWithTransactionNewSchema);
  
  if (!validation.valid) {
    logger.warn({ errors: validation.errors }, "Validation failed for visit with transaction");
    return next(
      new APIError(
        400,
        "Bad Request",
        validation.errors.map((e) => e.stack).join(". ")
      )
    );
  }

  try {
    const createdBy = (request as any).hospitalUser?._id?.toString();
    const newVisit = await hospitalVisitService.createHospitalVisitWithTransaction({ ...input, createdBy } as any);
    logger.info({ visitId: newVisit.visitId, patientId: input.patientId, hasTransaction: !!input.transaction }, "Visit created with transaction");
    
    // Emit event for live updates with populated patient info
    const visitDate = typeof newVisit.visitDate === 'string' ? newVisit.visitDate : new Date(newVisit.visitDate).toISOString().split('T')[0];
    const { visit: populatedVisit, doctorInfo } = await populateVisitForSSE(newVisit);
    visitEventsService.emitNewVisit(
      newVisit.doctorId,
      visitDate,
      populatedVisit,
      doctorInfo
    );
    
    return response.success({ visit: newVisit }, "Visit created successfully with transaction", 201);
  } catch (err: any) {
    logger.error({ error: err.message, stack: err.stack, input }, "Failed to create visit with transaction");
    
    // Handle specific error types
    if (err instanceof APIError) {
      return next(err);
    }
    
    return next(
      new AppError(
        500, 
        "Unable to create visit with transaction. Please check the provided information and try again.", 
        err.message ?? undefined
      )
    );
  }
}

// Create visit with new patient data and optional transaction
async function createHospitalVisitWithPatient(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const input: CreateHospitalVisitWithPatientDTO = request.body;
  
  // Use Pagia validator if SYSTEM=pagia, otherwise use pathlab validator
  const schema = isPagiaSystem() ? hospitalVisitWithPatientPagiaNewSchema : hospitalVisitWithPatientNewSchema;
  const validation = validate(input, schema);
  
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
    const createdBy = (request as any).hospitalUser?._id?.toString();
    const newVisit = await hospitalVisitService.createHospitalVisitWithPatient({ ...input, createdBy } as any);
    logger.info({ visitId: newVisit.visitId, patientName: input.patient.name, hasTransaction: !!input.transaction }, "Visit created with new patient");
    
    // Emit event for live updates with populated patient info
    const visitDate = typeof newVisit.visitDate === 'string' ? newVisit.visitDate : new Date(newVisit.visitDate).toISOString().split('T')[0];
    const { visit: populatedVisit, doctorInfo } = await populateVisitForSSE(newVisit);
    visitEventsService.emitNewVisit(
      newVisit.doctorId,
      visitDate,
      populatedVisit,
      doctorInfo
    );
    
    return response.success({ visit: newVisit }, "Visit created successfully with new patient", 201);
  } catch (err: any) {
    logger.error({ error: err.message, stack: err.stack, patientName: input.patient?.name }, "Failed to create visit with patient");
    
    // Handle specific error types
    if (err instanceof APIError) {
      return next(err);
    }
    
    return next(
      new AppError(
        500, 
        "Unable to create visit with patient. Please check the provided information and try again.", 
        err.message ?? undefined
      )
    );
  }
}

async function readHospitalVisit(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const { id } = request.params;
  const ownershipFilter = request.ownershipFilter || {};
  
  try {
    const visit = await hospitalVisitService.getHospitalVisitById(id, ownershipFilter);
    return response.success({ visit }, "Visit retrieved successfully");
  } catch (err: any) {
    logger.error({ error: err.message, visitId: id }, "Failed to retrieve visit");
    
    // Handle specific error types
    if (err instanceof APIError) {
      return next(err);
    }
    
    if (err.message?.includes("not found")) {
      return next(new APIError(404, "Visit Not Found", `Visit with ID '${id}' was not found.`));
    }
    
    return next(
      new AppError(500, "Unable to retrieve visit. Please try again.", err.message ?? undefined)
    );
  }
}

async function searchHospitalVisitByVisitId(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const { visitId } = request.params;
  
  try {
    const visit = await hospitalVisitService.getHospitalVisit(visitId);
    return response.success({ visit }, "Visit retrieved successfully");
  } catch (err: any) {
    logger.error({ error: err.message, visitId }, "Failed to retrieve visit by visitId");
    
    // Handle specific error types
    if (err instanceof APIError) {
      return next(err);
    }
    
    if (err.message?.includes("not found")) {
      return next(new APIError(404, "Visit Not Found", `Visit with ID '${visitId}' was not found.`));
    }
    
    return next(
      new AppError(500, "Unable to retrieve visit. Please try again.", err.message ?? undefined)
    );
  }
}

async function updateHospitalVisit(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const input: UpdateHospitalVisitDTO = request.body;
  const validation = validate(input, hospitalVisitUpdateSchema);
  
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
    // Get old visit to check if status or date changed
    const oldVisit = await hospitalVisitService.getHospitalVisitById(id, ownershipFilter);
    const oldStatus = oldVisit.status;
    const oldDate = typeof oldVisit.visitDate === 'string' ? oldVisit.visitDate : new Date(oldVisit.visitDate).toISOString().split('T')[0];
    
    const updatedVisit = await hospitalVisitService.updateHospitalVisitById(id, input as any, ownershipFilter);
    logger.info({ visitId: id, updates: Object.keys(input), hasTransaction: !!input.transaction }, "Visit updated successfully");
    
    // Emit event for live updates with populated patient info
    const newDate = typeof updatedVisit.visitDate === 'string' ? updatedVisit.visitDate : new Date(updatedVisit.visitDate).toISOString().split('T')[0];
    const { visit: populatedVisit, doctorInfo } = await populateVisitForSSE(updatedVisit);
    
    // If date changed, emit delete event to old date and new-visit event to new date
    if (oldDate !== newDate) {
      logger.info({ visitId: id, oldDate, newDate }, "Visit date changed - emitting delete to old date and new-visit to new date");
      
      // Emit delete event to old date's listeners
      visitEventsService.emitVisitDeleted(
        updatedVisit.doctorId,
        oldDate,
        updatedVisit.visitId,
        doctorInfo
      );
      
      // Emit new-visit event to new date's listeners
      visitEventsService.emitNewVisit(
        updatedVisit.doctorId,
        newDate,
        populatedVisit,
        doctorInfo
      );
    }
    // Check if status changed - emit status-change event, otherwise emit visit-updated
    else if (input.status && oldStatus !== input.status) {
      visitEventsService.emitVisitStatusChange(
        updatedVisit.doctorId,
        newDate,
        populatedVisit,
        doctorInfo
      );
    } else {
      visitEventsService.emitVisitUpdated(
        updatedVisit.doctorId,
        newDate,
        populatedVisit,
        doctorInfo
      );
    }
    
    return response.success({ visit: updatedVisit }, "Visit updated successfully");
  } catch (err: any) {
    logger.error({ error: err.message, stack: err.stack, visitId: id, input }, "Failed to update visit");
    
    // Handle specific error types
    if (err instanceof APIError) {
      return next(err);
    }
    
    if (err.message?.includes("not found")) {
      return next(new APIError(404, "Visit Not Found", `Visit with ID '${id}' was not found.`));
    }
    
    return next(
      new AppError(500, "Unable to update visit. Please check the provided information and try again.", err.message ?? undefined)
    );
  }
}

async function deleteHospitalVisit(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const { id } = request.params;
  const ownershipFilter = request.ownershipFilter || {};
  
  try {
    // Get visit info before deleting for event emission
    const visit = await hospitalVisitService.getHospitalVisitById(id, ownershipFilter);
    const visitDate = typeof visit.visitDate === 'string' ? visit.visitDate : new Date(visit.visitDate).toISOString().split('T')[0];
    
    // Get doctor info for event
    const HospitalDoctorModel = (await import("../../hospital-doctor/models/hospital-doctor.model")).default;
    const doctor = await HospitalDoctorModel.findById(visit.doctorId).lean();
    const shift = doctor?.weeklySchedule ? formatDoctorShift(doctor.weeklySchedule, new Date(visit.visitDate)) : undefined;
    let posterUrl: string | undefined;
    if ((doctor as any)?.posterUrl) {
      const { getS3SignedUrl } = await import("@src/libs/utils/s3Upload");
      posterUrl = await getS3SignedUrl((doctor as any).posterUrl);
    }
    const doctorInfo = doctor ? {
      name: doctor.name,
      department: doctor.department,
      designation: doctor.designation,
      yearsOfExperience: doctor.yearsOfExperience,
      opdNumber: (doctor as any).opdNumber,
      posterUrl,
      shift
    } : undefined;
    
    await hospitalVisitService.deleteHospitalVisitById(id, ownershipFilter);
    logger.info({ visitId: id }, "Visit deleted successfully");
    
    // Emit delete event
    visitEventsService.emitVisitDeleted(
      visit.doctorId,
      visitDate,
      visit.visitId,
      doctorInfo
    );
    
    return response.success({}, "Visit deleted successfully");
  } catch (err: any) {
    logger.error({ error: err.message, visitId: id }, "Failed to delete visit");
    
    // Handle specific error types
    if (err instanceof APIError) {
      return next(err);
    }
    
    if (err.message?.includes("not found")) {
      return next(new APIError(404, "Visit Not Found", `Visit with ID '${id}' was not found.`));
    }
    
    return next(
      new AppError(500, "Unable to delete visit. Please try again.", err.message ?? undefined)
    );
  }
}

async function getVisitsByPatient(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const { mrd } = request.params;
  
  try {
    const visits = await hospitalVisitService.getVisitsByPatient(mrd);
    return response.success({ visits, count: visits.length }, "Patient visits retrieved successfully");
  } catch (err: any) {
    logger.error({ error: err.message, mrd }, "Failed to retrieve patient visits");
    
    // Handle specific error types
    if (err instanceof APIError) {
      return next(err);
    }
    
    return next(
      new AppError(500, "Unable to retrieve patient visits. Please try again.", err.message ?? undefined)
    );
  }
}

async function getDoctorSchedule(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const { doctorId } = request.params;
  const { date } = request.query;
  
  if (!date) {
    return next(new APIError(400, "Bad Request", "Date parameter is required"));
  }

  try {
    const schedule = await hospitalVisitService.getDoctorSchedule(doctorId, new Date(date as string));
    return response.success({ schedule }, "Doctor schedule retrieved successfully");
  } catch (err: any) {
    logger.error({ error: err.message, doctorId, date }, "Failed to retrieve doctor schedule");
    
    // Handle specific error types
    if (err instanceof APIError) {
      return next(err);
    }
    
    if (err.message?.includes("not found") || err.message?.includes("Not Found")) {
      return next(new APIError(404, "Doctor Not Found", `Doctor with ID '${doctorId}' was not found.`));
    }
    
    return next(
      new AppError(500, "Unable to retrieve doctor schedule. Please try again.", err.message ?? undefined)
    );
  }
}

async function calculateVisitPrice(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const { doctorId, visitType, appointmentType } = request.query;
  
  if (!doctorId || !visitType || !appointmentType) {
    logger.warn({ doctorId, visitType, appointmentType }, "Missing required parameters for price calculation");
    return next(
      new APIError(
        400, 
        "Bad Request", 
        "doctorId, visitType, and appointmentType parameters are required to calculate visit price."
      )
    );
  }

  // Validate visitType
  const validVisitTypes = ["New", "Emergency", "Follow-up", "MR"];
  if (!validVisitTypes.includes(visitType as string)) {
    logger.warn({ visitType }, "Invalid visit type provided");
    return next(
      new APIError(
        400,
        "Invalid Visit Type",
        `Visit type must be one of: ${validVisitTypes.join(", ")}`
      )
    );
  }

  // Validate appointmentType
  const validAppointmentTypes = ["OPD", "Day Care", "IPD", "ICU", "Emergency"];
  if (!validAppointmentTypes.includes(appointmentType as string)) {
    logger.warn({ appointmentType }, "Invalid appointment type provided");
    return next(
      new APIError(
        400,
        "Invalid Appointment Type",
        `Appointment type must be one of: ${validAppointmentTypes.join(", ")}`
      )
    );
  }

  try {
    logger.info({ doctorId, visitType, appointmentType }, "Calculating visit price");
    const priceInfo = await hospitalVisitService.calculateVisitPrice(
      doctorId as string,
      visitType as string,
      appointmentType as string
    );
    
    logger.info({ doctorId, visitType, appointmentType, price: priceInfo.price, available: priceInfo.available }, "Visit price calculated");
    return response.success({ priceInfo }, "Visit price calculated successfully");
  } catch (err: any) {
    logger.error({ error: err.message, stack: err.stack, doctorId, visitType, appointmentType }, "Failed to calculate visit price");
    
    // Handle specific error types
    if (err instanceof APIError) {
      return next(err);
    }
    
    if (err.message?.includes("not found") || err.message?.includes("Not Found")) {
      return next(
        new APIError(
          404, 
          "Doctor Not Found", 
          `Doctor with ID '${doctorId}' was not found. Please verify the doctor ID and try again.`
        )
      );
    }
    
    return next(
      new AppError(
        500, 
        "Unable to calculate visit price. Please verify the doctor ID and try again.", 
        err.message ?? undefined
      )
    );
  }
}

async function searchByAppointmentId(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const { appointmentId } = request.params;
  
  try {
    const visit = await hospitalVisitService.getHospitalVisitByAppointmentId(appointmentId);
    return response.success({ visit }, "Visit retrieved successfully");
  } catch (err: any) {
    logger.error({ error: err.message, appointmentId }, "Failed to retrieve visit by appointmentId");
    
    if (err instanceof APIError) {
      return next(err);
    }
    
    if (err.message?.includes("not found")) {
      return next(new APIError(404, "Visit Not Found", `Visit with appointment ID '${appointmentId}' was not found.`));
    }
    
    return next(
      new AppError(500, "Unable to retrieve visit. Please try again.", err.message ?? undefined)
    );
  }
}

async function searchByTokenNumber(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const { tokenNumber } = request.params;
  const { date, doctorId, sessionSlot } = request.query;
  
  if (!date) {
    return next(new APIError(400, "Bad Request", "Date parameter is required for token search"));
  }
  
  if (!doctorId) {
    return next(new APIError(400, "Bad Request", "doctorId parameter is required for token search"));
  }
  
  try {
    const visit = await hospitalVisitService.getVisitByTokenNumber(
      parseInt(tokenNumber), 
      new Date(date as string),
      doctorId as string,
      sessionSlot as string | undefined
    );
    return response.success({ visit }, "Visit retrieved successfully");
  } catch (err: any) {
    logger.error({ error: err.message, tokenNumber, date, doctorId, sessionSlot }, "Failed to retrieve visit by token number");
    
    if (err instanceof APIError) {
      return next(err);
    }
    
    if (err.message?.includes("not found")) {
      const slotLabel = sessionSlot ? ` in ${sessionSlot} session` : "";
      return next(new APIError(404, "Visit Not Found", `Visit with token number ${tokenNumber}${slotLabel} not found for the specified doctor on the given date.`));
    }
    
    return next(
      new AppError(500, "Unable to retrieve visit. Please try again.", err.message ?? undefined)
    );
  }
}

async function getPatientDisplayQueue(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const { doctorId } = request.params;
  const { sessionSlot } = request.query;
  
  if (!doctorId) {
    return next(new APIError(400, "Bad Request", "doctorId parameter is required"));
  }
  
  try {
    logger.info({ doctorId, sessionSlot }, "Fetching patient display queue with IST session");
    
    const displayData = await hospitalVisitService.getPatientDisplayQueueByReadableId(
      doctorId, 
      undefined, 
      sessionSlot as string | undefined
    );
    
    // Get current time for response
    const sessionTimeService = (await import("../services/session-time.service")).default;
    const currentSession = sessionTimeService.getCurrentSessionInfo();
    
    // Add current time to response
    return response.success({ 
      display: {
        ...displayData,
        currentTime: currentSession.time
      }
    }, "Patient display queue retrieved successfully");
  } catch (err: any) {
    logger.error({ error: err.message, doctorId }, "Failed to retrieve patient display queue");
    
    if (err instanceof APIError) {
      return next(err);
    }
    
    return next(
      new AppError(500, "Unable to retrieve patient display queue. Please try again.", err.message ?? undefined)
    );
  }
}

// SSE endpoint for live patient display queue updates
async function streamPatientDisplayQueue(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const { doctorId } = request.params;
  const { sessionSlot: requestedSlot } = request.query;
  
  if (!doctorId) {
    return next(new APIError(400, "Bad Request", "doctorId parameter is required"));
  }
  
  try {
    logger.info({ doctorId, requestedSlot }, "SSE connection established for patient display queue");
    
    // Set SSE headers
    response.setHeader('Content-Type', 'text/event-stream');
    response.setHeader('Cache-Control', 'no-cache');
    response.setHeader('Connection', 'keep-alive');
    response.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    
    // Send initial queue data
    logger.info({ doctorId }, "Fetching initial queue data");
    const initialQueue = await hospitalVisitService.getPatientDisplayQueueByReadableId(
      doctorId, 
      undefined, 
      requestedSlot as string | undefined
    );
    logger.info({ doctorId, queueSize: initialQueue.queue?.length }, "Initial queue data fetched");
    
    // Get current time
    const sessionTimeService = (await import("../services/session-time.service")).default;
    let currentSessionInfo = sessionTimeService.getCurrentSessionInfo();
    
    const initialData = { 
      type: 'initial', 
      ...initialQueue,
      currentTime: currentSessionInfo.time
    };
    
    logger.info({ doctorId, dataKeys: Object.keys(initialData) }, "Sending initial SSE data");
    response.write(`data: ${JSON.stringify(initialData)}\n\n`);
    
    // Flush the response to ensure data is sent immediately
    if (response.flush) {
      response.flush();
    }
    
    logger.info({ doctorId }, "Initial SSE data sent");
    
    // Subscribe to events for this doctor/date
    let eventKey = visitEventsService.getEventKey(
      initialQueue.doctorId, // Use MongoDB _id from the response
      initialQueue.date
    );
    
    const eventHandler = async (eventData: any) => {
      try {
        response.write(`data: ${JSON.stringify(eventData)}\n\n`);
        if (response.flush) {
          response.flush();
        }
      } catch (err) {
        logger.error({ error: err }, "Error sending SSE event");
      }
    };
    
    visitEventsService.on(eventKey, eventHandler);
    
    // Check for date or session changes every minute
    const dateCheckInterval = setInterval(async () => {
      try {
        const newSessionInfo = sessionTimeService.getCurrentSessionInfo();
        
        // Get updated queue
        const updatedQueue = await hospitalVisitService.getPatientDisplayQueueByReadableId(
          doctorId, 
          undefined, 
          requestedSlot as string | undefined
        );
        
        const dateChanged = initialQueue.date !== updatedQueue.date;
        const sessionChanged = initialQueue.currentSessionSlot !== updatedQueue.currentSessionSlot;

        if (dateChanged || sessionChanged) {
          const changeType = dateChanged ? 'date-change' : 'session-change';
          logger.info({ 
            oldDate: initialQueue.date,
            newDate: updatedQueue.date,
            oldSession: initialQueue.currentSessionSlot,
            newSession: updatedQueue.currentSessionSlot,
            changeType
          }, "Date or session changed, sending updated queue");
          
          if (dateChanged) {
            // Unsubscribe from old event key
            visitEventsService.off(eventKey, eventHandler);
            // Subscribe to new event key
            eventKey = visitEventsService.getEventKey(
              updatedQueue.doctorId,
              updatedQueue.date
            );
            visitEventsService.on(eventKey, eventHandler);
          }
          
          // Send change event
          response.write(`data: ${JSON.stringify({ 
            type: changeType, 
            ...updatedQueue,
            currentTime: newSessionInfo.time,
            previousDate: initialQueue.date,
            previousSessionSlot: initialQueue.currentSessionSlot
          })}\n\n`);
          
          if (response.flush) {
            response.flush();
          }
          
          // Update tracking
          Object.assign(initialQueue, updatedQueue);
        }
        
        currentSessionInfo = newSessionInfo;
      } catch (err) {
        logger.error({ error: err }, "Error checking date or session change");
      }
    }, 60000); // Check every minute
    
    // Send keepalive every 30 seconds
    const keepAliveInterval = setInterval(() => {
      try {
        response.write(`:keepalive\n\n`);
        if (response.flush) {
          response.flush();
        }
      } catch (err) {
        logger.error({ error: err }, "Error sending keepalive");
      }
    }, 30000);
    
    // Cleanup on client disconnect
    request.on('close', () => {
      clearInterval(dateCheckInterval);
      clearInterval(keepAliveInterval);
      visitEventsService.off(eventKey, eventHandler);
      logger.info({ doctorId, eventKey }, "SSE connection closed");
    });
    
  } catch (err: any) {
    logger.error({ error: err.message, doctorId }, "Failed to establish SSE connection");
    
    if (err instanceof APIError) {
      return next(err);
    }
    
    return next(
      new AppError(500, "Unable to establish live connection. Please try again.", err.message ?? undefined)
    );
  }
}

// Reorder visit token number within same session
async function reorderVisitToken(
  request: Request,
  response: Response,
  next: NextFunction
) {
  const { id } = request.params;
  const { newTokenNumber } = request.body;
  const ownershipFilter = request.ownershipFilter || {};
  
  if (!newTokenNumber) {
    return next(new APIError(400, "Bad Request", "newTokenNumber is required in request body"));
  }
  
  if (typeof newTokenNumber !== 'number' || newTokenNumber < 1) {
    return next(new APIError(400, "Invalid Token Number", "newTokenNumber must be a positive integer"));
  }
  
  try {
    const result = await hospitalVisitService.reorderVisitToken(id, newTokenNumber, ownershipFilter);
    
    logger.info({ 
      visitId: id, 
      oldToken: result.oldTokenNumber, 
      newToken: result.newTokenNumber,
      affectedVisits: result.affectedVisits 
    }, "Visit token reordered successfully");
    
    return response.success(
      { 
        visit: result.visit,
        affectedVisits: result.affectedVisits,
        oldTokenNumber: result.oldTokenNumber,
        newTokenNumber: result.newTokenNumber
      }, 
      "Token number updated successfully"
    );
  } catch (err: any) {
    logger.error({ error: err.message, visitId: id, newTokenNumber }, "Failed to reorder visit token");
    
    if (err instanceof APIError) {
      return next(err);
    }
    
    return next(
      new AppError(500, "Unable to reorder token number. Please try again.", err.message ?? undefined)
    );
  }
}

export default {
  createHospitalVisit,
  createHospitalVisitWithTransaction,
  createHospitalVisitWithPatient,
  readHospitalVisit,
  searchHospitalVisitByVisitId,
  updateHospitalVisit,
  deleteHospitalVisit,
  getVisitsByPatient,
  getDoctorSchedule,
  calculateVisitPrice,
  searchByAppointmentId,
  searchByTokenNumber,
  getPatientDisplayQueue,
  streamPatientDisplayQueue,
  reorderVisitToken,
};