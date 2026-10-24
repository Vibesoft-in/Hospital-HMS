import mongoose from "mongoose";
import HospitalVisitModel from "../models/hospital-visit.model";
import HospitalPatientService from "../../hospital-patient/services/hospital-patient.service";
import HospitalTransactionService from "../../hospital-transaction/services/hospital-transaction.service";
import visitEventsService, { formatDoctorShift } from "./visit-events.service";
import { getNextSequence } from "@src/libs/counter";
import { transformS3Urls } from "@src/libs/utils/s3Upload";
import { logger } from "@src/config/logger";
import { APIError } from "@src/shared";
import { sendAppointmentRegistrationWhatsapp, resolveVisitServiceType } from "@src/libs/utils/hospitalWhatsapp";
import { getHospitalConfig } from "@src/libs/utils/systemConfig";
import { 
  CreateHospitalVisitDTO,
  CreateHospitalVisitWithPatientDTO,
  CreateHospitalVisitWithTransactionDTO,
  HospitalVisitResponseDTO 
} from "../dtos/hospital-visit.dto";
import { HospitalVisit, VisitProcedure } from "../models/hospital-visit.types";

// Helper function to calculate total paid amount from transactions
function calculateTotalPaid(transactions: any[]): number {
  if (!transactions || transactions.length === 0) {
    return 0;
  }

  return transactions.reduce((sum, transaction) => {
    const amount = transaction.amount || 0;
    
    switch (transaction.transactionType) {
      case "Payment":
      case "Advance":
        return sum + amount;
      case "Refund":
        return sum - amount;
      case "Adjustment":
        return sum + amount;
      default:
        return sum;
    }
  }, 0);
}

// Helper function to calculate payment status based on transactions and discount
function calculatePaymentStatus(price: number, discount: number, totalPaid: number, totalPrice?: number): "Paid" | "Unpaid" | "Partially Paid" {
  // Use pre-computed totalPrice when available (includes procedure charges), otherwise fall back
  const finalAmount = totalPrice !== undefined ? totalPrice : Math.max(0, price - discount);
  if (finalAmount <= 0) return "Paid";
  if (totalPaid >= finalAmount) return "Paid";
  if (totalPaid > 0) return "Partially Paid";
  return "Unpaid";
}

// Helper function to serialize dates in aggregation results
function serializeDatesInVisit(visit: any): any {
  // Serialize visit dates
  if (visit._id && typeof visit._id === 'object') {
    visit._id = visit._id.toString();
  }
  if (visit.visitDate && visit.visitDate instanceof Date) {
    visit.visitDate = visit.visitDate.toISOString().split('T')[0];
  }
  if (visit.createdAt && visit.createdAt instanceof Date) {
    visit.createdAt = visit.createdAt.toISOString();
  }
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
}

class HospitalVisitService {
  /**
   * Resolve an array of { procedureId } inputs to full VisitProcedure snapshots.
   * Validates each procedure exists, is Active, and has type "opd" or "both".
   */
  private async _resolveProcedures(
    procedureInputs: Array<{ procedureId: string }>
  ): Promise<VisitProcedure[]> {
    if (!procedureInputs || procedureInputs.length === 0) return [];

    const HospitalProcedureModel = (await import("../../hospital-procedure/models/hospital-procedure.model")).default;

    const resolved: VisitProcedure[] = [];

    for (const input of procedureInputs) {
      const proc = await HospitalProcedureModel.findById(input.procedureId).lean();

      if (!proc) {
        throw new APIError(
          404,
          "Procedure Not Found",
          `Procedure with ID '${input.procedureId}' was not found.`
        );
      }

      if ((proc as any).isDeleted) {
        throw new APIError(
          400,
          "Procedure Not Available",
          `Procedure '${(proc as any).procedureName}' has been deleted and cannot be added to a visit.`
        );
      }

      if ((proc as any).status !== "Active") {
        throw new APIError(
          400,
          "Procedure Inactive",
          `Procedure '${(proc as any).procedureName}' is not active and cannot be added to a visit.`
        );
      }

      const procType: string = (proc as any).type || "both";
      if (procType !== "opd") {
        throw new APIError(
          400,
          "Procedure Type Mismatch",
          `Procedure '${(proc as any).procedureName}' is of type '${procType}' and cannot be used for OPD visits. Only procedures with type 'opd' are allowed.`
        );
      }

      resolved.push({
        procedureId: (proc as any)._id.toString(),
        procedureName: (proc as any).procedureName,
        price: (proc as any).price,
      });
    }

    return resolved;
  }

  // Method 1: Create visit with existing patient ID
  async createHospitalVisit(
    newVisit: CreateHospitalVisitDTO
  ): Promise<HospitalVisitResponseDTO> {
    // Generate appointmentId (always unique)
    const nextAppointmentId = await getNextSequence("hospitalAppointmentId");
    const generatedAppointmentId = `APT${String(nextAppointmentId).padStart(5, "0")}`;

    // Generate receiptId
    const nextReceiptId = await getNextSequence("hospitalReceiptId");
    const generatedReceiptId = `REC${String(nextReceiptId).padStart(5, "0")}`;

    // Convert visitDate string to Date object with validation
    let visitDate: Date;
    try {
      visitDate = new Date(newVisit.visitDate);
      if (isNaN(visitDate.getTime())) {
        throw new Error(`Invalid date format for visitDate: ${newVisit.visitDate}`);
      }
    } catch (error: any) {
      throw new Error(`Error parsing visitDate: ${error.message || error.toString()}`);
    }

    // MR visit: check no MR visit exists for this patient's phone in the last 10 days
    if (newVisit.visitType === "MR" && newVisit.patientId) {
      await this._validateMRVisit(newVisit.patientId, visitDate);
    }

    // Follow-up-report: reuse the visitId of the patient's last non-Follow-up-report visit
    let resolvedVisitId: string;
    if (newVisit.visitType === "Follow-up-report" && newVisit.patientId) {
      const lastVisit = await HospitalVisitModel.findOne({
        patientId: newVisit.patientId,
        visitType: { $ne: "Follow-up-report" },
      })
        .sort({ createdAt: -1 })
        .select("visitId")
        .lean();

      if (lastVisit?.visitId) {
        resolvedVisitId = lastVisit.visitId;
        logger.info(
          { patientId: newVisit.patientId, reusedVisitId: resolvedVisitId },
          "Follow-up-report: reusing visitId from last visit"
        );
      } else {
        // No prior visit found â€” generate a new one as fallback
        const nextVisitId = await getNextSequence("hospitalVisitId");
        const visitPrefix = getHospitalConfig().visitPrefix;
        resolvedVisitId = `${visitPrefix}${String(nextVisitId).padStart(5, "0")}`;
        logger.warn(
          { patientId: newVisit.patientId },
          "Follow-up-report: no prior visit found, generating new visitId"
        );
      }
    } else {
      const nextVisitId = await getNextSequence("hospitalVisitId");
      const visitPrefix = getHospitalConfig().visitPrefix;
      resolvedVisitId = `${visitPrefix}${String(nextVisitId).padStart(5, "0")}`;
    }

    // Resolve procedures to full snapshots (validates type, status, existence)
    const resolvedProcedures = await this._resolveProcedures((newVisit as any).procedures || []);

    // Create visit (price and tokenNumber will be calculated in the model)
    const visit = await HospitalVisitModel.createHospitalVisit({
      ...newVisit,
      visitDate,
      visitId: resolvedVisitId,
      appointmentId: generatedAppointmentId,
      receiptId: generatedReceiptId,
      price: 0, // Will be calculated in model based on doctor's appointmentType charges
      tokenNumber: 0, // Will be calculated in model based on date
      procedures: resolvedProcedures,
    } as HospitalVisit);

    // MR visit: mark patient as isMRPatient = true and save companyName/division (non-fatal, fire-and-forget)
    if (newVisit.visitType === "MR" && newVisit.patientId) {
      this._markPatientAsMR(newVisit.patientId, (newVisit as any).companyName, (newVisit as any).division);
    }

    // Send appointment registration WhatsApp notification (non-fatal, fire-and-forget)
    this._sendVisitWhatsapp(newVisit.patientId, visit);

    // Transform S3 URLs to signed URLs
    return transformS3Urls(visit) as HospitalVisitResponseDTO;
  }

  // Validates that no MR visit exists for the same phone number in the last 10 days
  private async _validateMRVisit(patientId: string, visitDate: Date): Promise<void> {
    const HospitalPatientModel = (await import("../../hospital-patient/models/hospital-patient.model")).default;

    // Get the patient's phone number
    const patient = await HospitalPatientModel.findById(patientId).select("phone").lean();
    if (!patient) return; // Patient existence is validated later in the model

    const phone = (patient as any).phone;

    // Find all HMS patients with the same phone
    const patientsWithSamePhone = await HospitalPatientModel.find({
      phone,
      isDeleted: { $ne: true }
    }).select("_id").lean();

    if (!patientsWithSamePhone.length) return;

    const patientIds = patientsWithSamePhone.map((p: any) => p._id.toString());

    // Check if any of them have an MR visit in the last 10 days
    const tenDaysAgo = new Date(visitDate);
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    tenDaysAgo.setHours(0, 0, 0, 0);

    const endOfVisitDate = new Date(visitDate);
    endOfVisitDate.setHours(23, 59, 59, 999);

    const existingMR = await HospitalVisitModel.findOne({
      patientId: { $in: patientIds },
      visitType: "MR",
      visitDate: { $gte: tenDaysAgo, $lte: endOfVisitDate },
      status: { $nin: ["Cancelled", "No Show"] }
    }).lean();

    if (existingMR) {
      throw new APIError(
        400,
        "MR Visit Already Exists",
        `A patient with phone '${phone}' already has an MR visit within the last 10 days. MR visits are allowed once every 10 days.`
      );
    }
  }

  // Marks a patient as isMRPatient = true and saves companyName/division if provided (non-fatal)
  private async _markPatientAsMR(patientId: string, companyName?: string, division?: string): Promise<void> {
    try {
      const HospitalPatientModel = (await import("../../hospital-patient/models/hospital-patient.model")).default;
      const patch: any = { isMRPatient: true };
      if (companyName) patch.companyName = companyName;
      if (division) patch.division = division;
      await HospitalPatientModel.findByIdAndUpdate(patientId, { $set: patch });
      logger.info({ patientId, companyName, division }, "Patient marked as isMRPatient");
    } catch (error) {
      logger.warn({ patientId, error }, "Failed to mark patient as isMRPatient â€” non-fatal");
    }
  }

  // Sends appointment registration WhatsApp to the patient (non-fatal)
  private async _sendVisitWhatsapp(patientId: string, visit: any): Promise<void> {
    // Skip WhatsApp if disabled in config
    const { isWhatsAppEnabled, isPagiaSystem } = await import("@src/libs/utils/systemConfig");
    if (!isWhatsAppEnabled()) {
      logger.debug({ patientId }, "WhatsApp messaging disabled");
      return;
    }
    
    try {
      const HospitalPatientModel = (await import("../../hospital-patient/models/hospital-patient.model")).default;
      const HospitalDoctorModel = (await import("../../hospital-doctor/models/hospital-doctor.model")).default;

      const [patient, doctor] = await Promise.all([
        HospitalPatientModel.findById(patientId).select("name phone").lean(),
        HospitalDoctorModel.findById(visit.doctorId).select("name").lean(),
      ]);

      if (!patient || !(patient as any).phone) return;

      if (isPagiaSystem()) {
        const { sendPagiaVisitWhatsapp } = await import("@src/libs/utils/pagiaWhatsapp");
        await sendPagiaVisitWhatsapp({
          phone: (patient as any).phone,
          patientName: (patient as any).name,
          appointmentId: visit.visitId,
          doctorName: doctor ? (doctor as any).name : "N/A",
          appointmentDate: visit.visitDate,
          appointmentTime: visit.visitTime || visit.sessionSlot || "N/A",
          tokenNo: visit.tokenNumber,
        });
      } else {
        await sendAppointmentRegistrationWhatsapp({
          phone: (patient as any).phone,
          patientName: (patient as any).name,
          appointmentId: visit.visitId,
          serviceType: resolveVisitServiceType(visit.visitType, visit.appointmentType),
          doctorName: doctor ? (doctor as any).name : "N/A",
          appointmentDate: visit.visitDate,
          appointmentTime: visit.visitTime || visit.sessionSlot || "N/A",
          tokenNo: visit.tokenNumber,
        });
      }
    } catch (error) {
      logger.warn({ patientId, error }, "Failed to send visit WhatsApp â€” non-fatal");
    }
  }

  // Method 2: Create visit with existing patient ID and optional transaction
  async createHospitalVisitWithTransaction(
    input: CreateHospitalVisitWithTransactionDTO
  ): Promise<HospitalVisitResponseDTO> {
    const { transaction, ...visitData } = input;

    // Convert visitDate string to Date object with validation
    let visitDate: Date;
    try {
      visitDate = new Date(visitData.visitDate);
      if (isNaN(visitDate.getTime())) {
        throw new Error(`Invalid date format for visitDate: ${visitData.visitDate}`);
      }
    } catch (error: any) {
      throw new Error(`Error parsing visitDate: ${error.message || error.toString()}`);
    }

    // Create the visit first
    const visit = await this.createHospitalVisit({
      ...visitData,
      visitDate
    });

    // If transaction data is provided, create transaction
    if (transaction) {
      try {
        // Get the visit document to access _id
        const visitDoc: any = await HospitalVisitModel.findOne({ visitId: visit.visitId });
        if (!visitDoc) {
          throw new Error("Visit created but not found");
        }

        // Convert transactionDate string to Date object with validation
        let transactionDate: Date;
        if (transaction.transactionDate) {
          try {
            transactionDate = new Date(transaction.transactionDate);
            if (isNaN(transactionDate.getTime())) {
              throw new Error(`Invalid date format for transactionDate: ${transaction.transactionDate}`);
            }
          } catch (error: any) {
            throw new Error(`Error parsing transactionDate: ${error.message || error.toString()}`);
          }
        } else {
          transactionDate = new Date();
        }

        const createdTransaction = await HospitalTransactionService.createHospitalTransaction({
          visitId: visitDoc._id.toString(),
          ...transaction,
          transactionDate,
        });

        logger.info({ visitId: visit.visitId, transactionId: createdTransaction.transactionId }, "Transaction created with visit");

        // Return visit with transaction data
        return {
          ...visit,
          _id: visitDoc._id.toString(),
          transaction: createdTransaction,
        };
      } catch (error: any) {
        // If transaction creation fails, we should handle it gracefully
        logger.error({ error: error.message, visitId: visit.visitId }, "Transaction creation failed for visit");
        // Return visit without transaction
        return visit;
      }
    }

    return visit;
  }

  // Method 3: Create visit with new patient data and optional transaction
  async createHospitalVisitWithPatient(
    input: CreateHospitalVisitWithPatientDTO
  ): Promise<HospitalVisitResponseDTO> {
    const { patient: patientData, transaction, ...visitData } = input;

    // Convert visitDate string to Date object with validation
    let visitDate: Date;
    try {
      visitDate = new Date(visitData.visitDate);
      if (isNaN(visitDate.getTime())) {
        throw new Error(`Invalid date format for visitDate: ${visitData.visitDate}`);
      }
    } catch (error: any) {
      throw new Error(`Error parsing visitDate: ${error.message || error.toString()}`);
    }

    // Generate temporary IDs for validation
    const nextVisitId = await getNextSequence("hospitalVisitId");
    const visitPrefix = getHospitalConfig().visitPrefix;
    const generatedVisitId = `${visitPrefix}${String(nextVisitId).padStart(5, "0")}`;
    const nextAppointmentId = await getNextSequence("hospitalAppointmentId");
    const generatedAppointmentId = `APT${String(nextAppointmentId).padStart(5, "0")}`;

    // STEP 0: Validate visit can be created BEFORE creating patient
    // This prevents orphan patients if visit validation fails
    await HospitalVisitModel.validateVisitCreation({
      ...visitData,
      visitDate,
      visitId: generatedVisitId,
      appointmentId: generatedAppointmentId,
      patientId: "000000000000000000000000", // Dummy ID for validation (will be replaced)
      price: 0,
      tokenNumber: 0,
    } as HospitalVisit);

    // Step 1: Create the patient (only after validation passes)
    const createdPatient = await HospitalPatientService.createHospitalPatient(patientData);

    // Get patient document to access _id
    const patientDoc: any = await HospitalPatientService.getHospitalPatient(createdPatient.mrd);
    const patientId = patientDoc._id?.toString() || patientDoc.id;

    if (!patientId) {
      throw new Error("Patient created but ID not found");
    }

    // Step 2: Create the visit with the new patient's ID
    const visit = await this.createHospitalVisit({
      ...visitData,
      visitDate,
      patientId,
    });

    // Step 3: If transaction data is provided, create transaction
    if (transaction) {
      try {
        // Get the visit document to access _id
        const visitDoc: any = await HospitalVisitModel.findOne({ visitId: visit.visitId });
        if (!visitDoc) {
          throw new Error("Visit created but not found");
        }

        // Convert transactionDate string to Date object with validation
        let transactionDate: Date;
        if (transaction.transactionDate) {
          try {
            transactionDate = new Date(transaction.transactionDate);
            if (isNaN(transactionDate.getTime())) {
              throw new Error(`Invalid date format for transactionDate: ${transaction.transactionDate}`);
            }
          } catch (error: any) {
            throw new Error(`Error parsing transactionDate: ${error.message || error.toString()}`);
          }
        } else {
          transactionDate = new Date();
        }

        const createdTransaction = await HospitalTransactionService.createHospitalTransaction({
          visitId: visitDoc._id.toString(),
          ...transaction,
          transactionDate,
        });

        logger.info({ visitId: visit.visitId, patientMrd: createdPatient.mrd, transactionId: createdTransaction.transactionId }, "Transaction created with visit and patient");

        // Return visit with patient and transaction data
        return {
          ...visit,
          _id: visitDoc._id.toString(),
          patient: createdPatient,
          transaction: createdTransaction,
        };
      } catch (error: any) {
        // If transaction creation fails, we should handle it gracefully
        logger.error({ error: error.message, visitId: visit.visitId, patientMrd: createdPatient.mrd }, "Transaction creation failed for visit with patient");
        // Return visit with patient data only
        return {
          ...visit,
          patient: createdPatient,
        };
      }
    }

    // Return visit with patient data
    return {
      ...visit,
      patient: createdPatient,
    };
  }

  async getHospitalVisits(
    query: any = {},
    search: any = {},
    skip: number = 0,
    limit: number = 10
  ): Promise<HospitalVisitResponseDTO[]> {
    const visits = await HospitalVisitModel.readHospitalVisits(
      query,
      search,
      skip,
      limit
    );

    // For each visit, fetch patient, doctor, transactions and calculate payment status
    const visitsWithDetails = await Promise.all(
      visits.map(async (visit: any) => {
        const mongoId = visit._id?.toString();
        
        // Fetch patient details (only if not already populated by model lookup)
        if (visit.patientId && !visit.patient) {
          try {
            const HospitalPatientModel = (await import("../../hospital-patient/models/hospital-patient.model")).default;
            const patient = await HospitalPatientModel.findById(visit.patientId)
              .select('name title phone mrd age months days gender companyName division isMRPatient abhaLinked abhaPatientId')
              .lean();
            
            if (patient) {
              visit.patient = {
                _id: patient._id?.toString(),
                name: patient.name,
                title: patient.title,
                phone: patient.phone,
                mrd: patient.mrd,
                age: patient.age,
                months: (patient as any).months ?? 0,
                days: (patient as any).days ?? 0,
                gender: patient.gender,
                companyName: (patient as any).companyName,
                division: (patient as any).division,
                isMRPatient: (patient as any).isMRPatient ?? false,
                abhaLinked: (patient as any).abhaLinked ?? false,
                abhaPatientId: (patient as any).abhaPatientId ?? null
              };
            }
          } catch (error) {
            logger.warn({ patientId: visit.patientId, error }, "Failed to fetch patient details");
          }
        }
        
        // Fetch doctor details
        if (visit.doctorId) {
          try {
            const HospitalDoctorModel = (await import("../../hospital-doctor/models/hospital-doctor.model")).default;
            const doctor = await HospitalDoctorModel.findById(visit.doctorId)
              .select("name department designation opdNumber posterUrl -phone -medicalLicenseNo")
              .lean();
            
            if (doctor) {
              visit.doctor = {
                _id: doctor._id?.toString(),
                doctorId: (doctor as any).doctorId,
                name: doctor.name,
                department: doctor.department,
                designation: doctor.designation,
                opdNumber: (doctor as any).opdNumber,
                posterUrl: (doctor as any).posterUrl
              };
            }
          } catch (error) {
            logger.warn({ doctorId: visit.doctorId, error }, "Failed to fetch doctor details");
          }
        }
        
        // Fetch transactions and calculate payment status
        if (mongoId) {
          try {
            const transactions = await HospitalTransactionService.getTransactionsByVisit(mongoId);
            const totalPaid = calculateTotalPaid(transactions || []);
            visit.amountPaid = totalPaid;
            visit.paymentStatus = calculatePaymentStatus(visit.price || 0, visit.discount || 0, totalPaid, (visit as any).totalPrice);
            visit.transactions = transactions;
          } catch (error) {
            visit.amountPaid = 0;
            visit.paymentStatus = visit.price === 0 ? "Paid" : "Unpaid";
          }
        } else {
          visit.amountPaid = 0;
          visit.paymentStatus = visit.price === 0 ? "Paid" : "Unpaid";
        }
        
        return transformS3Urls(visit);
      })
    );


    return visitsWithDetails;
  }

  async getHospitalVisit(visitId: string): Promise<HospitalVisitResponseDTO> {
    const visit = await HospitalVisitModel.readHospitalVisit(visitId);
    
    // Get MongoDB _id from visit to fetch transactions
    const mongoId = visit._id?.toString();
    
    // Populate transactions for this visit and calculate payment status
    if (mongoId) {
      try {
        const transactions = await HospitalTransactionService.getTransactionsByVisit(mongoId);
        if (transactions && transactions.length > 0) {
          (visit as any).transactions = transactions;
        }
        const totalPaid = calculateTotalPaid(transactions || []);
        (visit as any).amountPaid = totalPaid;
        (visit as any).paymentStatus = calculatePaymentStatus(visit.price || 0, visit.discount || 0, totalPaid, (visit as any).totalPrice);
      } catch (error) {
        logger.warn({ visitId, error }, "Failed to populate transactions for visit");
        (visit as any).amountPaid = 0;
        (visit as any).paymentStatus = visit.price === 0 ? "Paid" : "Unpaid";
      }
    } else {
      (visit as any).amountPaid = 0;
      (visit as any).paymentStatus = visit.price === 0 ? "Paid" : "Unpaid";
    }
    
    // Transform S3 URLs to signed URLs
    const result = transformS3Urls(visit) as any;

    if (result.patient) delete result.patient.abhaPatientId;

    return result as HospitalVisitResponseDTO;
  }

  async getHospitalVisitById(id: string, filter: any = {}): Promise<HospitalVisitResponseDTO> {
    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new APIError(
        400,
        "Invalid Visit ID",
        `The provided visit ID '${id}' is not a valid MongoDB ObjectId format.`
      );
    }
    
    // Use aggregation to populate patient and doctor
    const pipeline: any[] = [
      { $match: { _id: new mongoose.Types.ObjectId(id), isDeleted: { $ne: true }, ...(filter || {}) } },
      
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
          as: "patient",
          pipeline: [{ $project: { aadharNo: 0, aadharS3Url: 0, ayushmanCardNo: 0, ayushmanCardS3Url: 0, otherDocsS3Urls: 0, allAbhaAddresses: 0, pathlabPatientId: 0, createdBy: 0, isDeleted: 0, deletedAt: 0, deletedBy: 0, __v: 0 } }]
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
          as: "doctor",
          pipeline: [{ $project: { name: 1, department: 1, designation: 1, opdNumber: 1, posterUrl: 1, doctorId: 1 } }]
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

    const visits = await HospitalVisitModel.aggregate(pipeline);
    const visit = visits[0];
    
    if (!visit) {
      throw new APIError(404, "Visit Not Found", `Visit with ID '${id}' not found`);
    }
    
    // Serialize all dates using helper function
    serializeDatesInVisit(visit);
    
    // Populate transactions for this visit and calculate payment status
    try {
      const transactions = await HospitalTransactionService.getTransactionsByVisit(id);
      if (transactions && transactions.length > 0) {
        (visit as any).transactions = transactions;
      }
      const totalPaid = calculateTotalPaid(transactions || []);
      (visit as any).amountPaid = totalPaid;
      (visit as any).paymentStatus = calculatePaymentStatus(visit.price || 0, visit.discount || 0, totalPaid, (visit as any).totalPrice);
    } catch (error) {
      logger.warn({ visitId: id, error }, "Failed to populate transactions for visit");
      (visit as any).amountPaid = 0;
      (visit as any).paymentStatus = visit.price === 0 ? "Paid" : "Unpaid";
    }
    
    // Transform S3 URLs to signed URLs
    const result2 = transformS3Urls(visit) as any;

    if (result2.patient) delete result2.patient.abhaPatientId;

    return result2 as HospitalVisitResponseDTO;
  }

  async updateHospitalVisit(
    visitId: string,
    updates: Partial<HospitalVisit>
  ): Promise<HospitalVisitResponseDTO> {
    const updatedVisit = await HospitalVisitModel.updateHospitalVisit(
      visitId,
      updates
    );

    // Transform S3 URLs to signed URLs
    return transformS3Urls(updatedVisit) as HospitalVisitResponseDTO;
  }

  async updateHospitalVisitById(
    id: string,
    updates: Partial<HospitalVisit> & { transaction?: any },
    filter: any = {}
  ): Promise<HospitalVisitResponseDTO> {
    // Prevent doctor updates - doctor cannot be changed once visit is created
    if (updates.doctorId) {
      throw new APIError(
        400,
        "Doctor Update Not Allowed",
        "Doctor cannot be changed for an existing visit. Please cancel this visit and create a new one with the correct doctor."
      );
    }

    // Extract transaction data if provided
    const { transaction, ...visitUpdates } = updates;

    // Get the existing visit to access doctorId for price recalculation
    const existingVisit = await HospitalVisitModel.findOne({ _id: id, isDeleted: { $ne: true }, ...(filter || {}) });
    if (!existingVisit) {
      throw new APIError(404, "Visit Not Found", `Visit with ID '${id}' not found`);
    }

    // Convert visitDate string to Date object with validation if provided
    const updateData: any = { ...visitUpdates };
    if (visitUpdates.visitDate) {
      try {
        const visitDate = new Date(visitUpdates.visitDate);
        if (isNaN(visitDate.getTime())) {
          throw new Error(`Invalid date format for visitDate: ${visitUpdates.visitDate}`);
        }
        updateData.visitDate = visitDate;
      } catch (error: any) {
        throw new Error(`Error parsing visitDate: ${error.message || error.toString()}`);
      }
    }

    // Recalculate price if visitType or appointmentType is being updated
    if (visitUpdates.visitType || visitUpdates.appointmentType) {
      try {
        const HospitalDoctor = (await import("../../hospital-doctor/models/hospital-doctor.model")).default;
        const doctor = await HospitalDoctor.findById(existingVisit.doctorId);
        
        if (doctor) {
          const newVisitType = visitUpdates.visitType || existingVisit.visitType;
          const newAppointmentType = visitUpdates.appointmentType || existingVisit.appointmentType;
          
          const visitTypeCharge = doctor.visitTypes?.find(
            (vt: any) => vt.visitType === newVisitType && vt.appointmentType === newAppointmentType
          );
          
          if (visitTypeCharge) {
            updateData.price = visitTypeCharge.charge;
            logger.info({ 
              visitId: id, 
              oldVisitType: existingVisit.visitType,
              oldAppointmentType: existingVisit.appointmentType,
              newVisitType,
              newAppointmentType,
              oldPrice: existingVisit.price,
              newPrice: updateData.price 
            }, "Price recalculated due to visitType or appointmentType change");
          } else {
            logger.warn({ 
              visitId: id, 
              doctorId: existingVisit.doctorId, 
              visitType: newVisitType,
              appointmentType: newAppointmentType
            }, "Doctor does not have pricing for new visit type + appointment type combination, price will remain unchanged");
          }
        }
      } catch (error: any) {
        logger.error({ error: error.message, visitId: id }, "Failed to recalculate price, continuing with update");
      }
    }

    // Resolve and validate procedures if being updated
    if ((visitUpdates as any).procedures !== undefined) {
      updateData.procedures = await this._resolveProcedures((visitUpdates as any).procedures || []);
    }

    // Recompute subtotal / totalPrice whenever price, procedures, or discount changes
    {
      const newPrice         = updateData.price         ?? existingVisit.price ?? 0;
      const newProcedures: any[] = updateData.procedures ?? (existingVisit as any).procedures ?? [];
      const newDiscount      = updateData.discount      ?? existingVisit.discount ?? 0;

      const procedureChargesTotal = newProcedures.reduce(
        (sum: number, p: any) => sum + (p.price || 0),
        0
      );
      const subtotal   = newPrice + procedureChargesTotal;
      const totalPrice = Math.max(0, subtotal - newDiscount);

      updateData.procedureChargesTotal = procedureChargesTotal;
      updateData.subtotal              = subtotal;
      updateData.totalPrice            = totalPrice;

      logger.info(
        { visitId: id, newPrice, procedureChargesTotal, newDiscount, subtotal, totalPrice },
        "Procedure totals recomputed on visit update"
      );
    }

    // Regenerate token if date is changing OR visitType is switching between Emergency and Regular
    const newVisitDate = updateData.visitDate as Date | undefined;
    const newVisitType = visitUpdates.visitType;

    const isDateChanging = newVisitDate && newVisitDate.getTime() !== existingVisit.visitDate.getTime();
    const isVisitTypeChanging = newVisitType && newVisitType !== existingVisit.visitType;
    const isEmergencyChange = isVisitTypeChanging && (
      (existingVisit.visitType === "Emergency" && newVisitType !== "Emergency") ||
      (existingVisit.visitType !== "Emergency" && newVisitType === "Emergency")
    );

    if (isDateChanging || isEmergencyChange) {
      const dateForToken = newVisitDate || existingVisit.visitDate;
      const visitTypeForToken = newVisitType || existingVisit.visitType;
      const doctorId = existingVisit.doctorId;

      // Get start/end of the target day
      const startOfDay = new Date(dateForToken);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(dateForToken);
      endOfDay.setHours(23, 59, 59, 999);

      const isEmergency = visitTypeForToken === "Emergency";

      // Find the last token for this doctor on the target day in the correct sequence
      const tokenFilter: any = {
        doctorId,
        visitDate: { $gte: startOfDay, $lte: endOfDay },
        _id: { $ne: existingVisit._id }, // exclude current visit
      };
      if (isEmergency) {
        tokenFilter.visitType = "Emergency";
      } else {
        tokenFilter.visitType = { $ne: "Emergency" };
      }

      const lastVisit = await HospitalVisitModel.findOne(tokenFilter).sort({ tokenNumber: -1 });
      updateData.tokenNumber = lastVisit ? lastVisit.tokenNumber + 1 : 1;

      logger.info({
        visitId: id,
        newDate: dateForToken,
        newTokenNumber: updateData.tokenNumber,
        visitType: visitTypeForToken,
        isEmergency,
        reason: isDateChanging ? "date change" : "visitType change between Emergency/Regular",
      }, "Token regenerated for visit update");
    }
    
    const updatedVisit = await HospitalVisitModel.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true }, ...(filter || {}) },
      { $set: updateData },
      { new: true }
    );
    
    if (!updatedVisit) {
      throw new APIError(404, "Visit Not Found", `Visit with ID '${id}' not found`);
    }

    // If transaction data is provided, create transaction
    if (transaction) {
      try {
        // Convert transactionDate string to Date object with validation
        let transactionDate: Date;
        if (transaction.transactionDate) {
          try {
            transactionDate = new Date(transaction.transactionDate);
            if (isNaN(transactionDate.getTime())) {
              throw new Error(`Invalid date format for transactionDate: ${transaction.transactionDate}`);
            }
          } catch (error: any) {
            throw new Error(`Error parsing transactionDate: ${error.message || error.toString()}`);
          }
        } else {
          transactionDate = new Date();
        }

        const createdTransaction = await HospitalTransactionService.createHospitalTransaction({
          visitId: id,
          ...transaction,
          transactionDate,
        });

        logger.info({ visitId: id, transactionId: createdTransaction.transactionId }, "Transaction created with visit update");

        // Return visit with transaction data
        const visitObject = updatedVisit.toObject();
        return transformS3Urls({
          ...visitObject,
          transaction: createdTransaction,
        }) as HospitalVisitResponseDTO;
      } catch (error: any) {
        // If transaction creation fails, we should handle it gracefully
        logger.error({ error: error.message, visitId: id }, "Transaction creation failed for visit update");
        // Return visit without transaction
        return transformS3Urls(updatedVisit.toObject()) as HospitalVisitResponseDTO;
      }
    }

    // Transform S3 URLs to signed URLs
    return transformS3Urls(updatedVisit.toObject()) as HospitalVisitResponseDTO;
  }

  async deleteHospitalVisit(visitId: string): Promise<void> {
    const visit = await HospitalVisitModel.findOne({ visitId, isDeleted: { $ne: true } });
    if (!visit) {
      throw new Error(`Visit with ID '${visitId}' not found`);
    }

    const mongoId = (visit as any)._id?.toString();

    // Soft delete the visit
    await HospitalVisitModel.updateOne(
      { _id: (visit as any)._id },
      { $set: { isDeleted: true, deletedAt: new Date() } }
    );

    // Soft delete related transactions
    if (mongoId) {
      await HospitalTransactionService.deleteTransactionsByVisitId(mongoId);
    }
    
    logger.info({ visitId, mongoId }, "Hospital visit and related transactions soft-deleted");
  }

  async deleteHospitalVisitById(id: string, filter: any = {}): Promise<void> {
    const visit = await HospitalVisitModel.findOne({ _id: id, isDeleted: { $ne: true }, ...(filter || {}) });
    if (!visit) {
      throw new APIError(404, "Visit Not Found", `Visit with ID '${id}' not found`);
    }

    // Soft delete the visit
    await HospitalVisitModel.updateOne(
      { _id: id, ...(filter || {}) },
      { $set: { isDeleted: true, deletedAt: new Date() } }
    );

    // Soft delete related transactions
    await HospitalTransactionService.deleteTransactionsByVisitId(id);
    
    logger.info({ id, visitId: (visit as any).visitId }, "Hospital visit and related transactions soft-deleted");
  }

  async getVisitsByPatient(patientId: string): Promise<HospitalVisitResponseDTO[]> {
    const visits = await HospitalVisitModel.getVisitsByPatient(patientId);
    return visits.map((visit: any) => transformS3Urls(visit));
  }

  async getVisitByTokenNumber(tokenNumber: number, date: Date, doctorId: string, sessionSlot?: string): Promise<HospitalVisitResponseDTO> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const matchFilter: any = { 
      tokenNumber,
      doctorId,
      visitDate: {
        $gte: startOfDay,
        $lte: endOfDay
      },
      isDeleted: { $ne: true }
    };

    if (sessionSlot) {
      matchFilter.sessionSlot = sessionSlot;
    }

    // Use aggregation to populate patient and doctor
    const pipeline: any[] = [
      { 
        $match: matchFilter 
      },
      
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
      
      {
        $project: {
          __v: 0,
          "patient.__v": 0,
          "patient.aadharNo": 0,
          "patient.aadharS3Url": 0,
          "patient.ayushmanCardNo": 0,
          "patient.ayushmanCardS3Url": 0,
          "patient.otherDocsS3Urls": 0,
          "patient.pathlabPatientId": 0,
          "patient.isDeleted": 0,
          "patient.deletedAt": 0,
          "patient.deletedBy": 0,
          "doctor.__v": 0,
          "doctor.phone": 0,
          "doctor.medicalLicenseNo": 0,
          "doctor.isDeleted": 0,
          "doctor.deletedAt": 0,
          "doctor.deletedBy": 0,
          patientObjectId: 0,
          doctorObjectId: 0,
        }
      }
    ];

    const visits = await HospitalVisitModel.aggregate(pipeline);
    const visit = visits[0];
    
    if (!visit) {
      throw new Error(`Visit with token number ${tokenNumber} not found for doctor '${doctorId}' on the specified date.`);
    }
    
    // Serialize all dates using helper function
    serializeDatesInVisit(visit);
    
    const mongoId = visit._id?.toString();
    
    // Populate transactions for this visit and calculate payment status
    if (mongoId) {
      try {
        const transactions = await HospitalTransactionService.getTransactionsByVisit(mongoId);
        if (transactions && transactions.length > 0) {
          (visit as any).transactions = transactions;
        }
        const totalPaid = calculateTotalPaid(transactions || []);
        (visit as any).amountPaid = totalPaid;
        (visit as any).paymentStatus = calculatePaymentStatus(visit.price || 0, visit.discount || 0, totalPaid, (visit as any).totalPrice);
      } catch (error) {
        logger.warn({ tokenNumber, doctorId, date, error }, "Failed to populate transactions for visit");
        (visit as any).amountPaid = 0;
        (visit as any).paymentStatus = visit.price === 0 ? "Paid" : "Unpaid";
      }
    } else {
      (visit as any).amountPaid = 0;
      (visit as any).paymentStatus = visit.price === 0 ? "Paid" : "Unpaid";
    }
    
    return transformS3Urls(visit) as HospitalVisitResponseDTO;
  }

  async getVisitsByDoctor(doctorId: string, date?: Date): Promise<HospitalVisitResponseDTO[]> {
    const visits = await HospitalVisitModel.getVisitsByDoctor(doctorId, date);
    return visits.map((visit: any) => transformS3Urls(visit));
  }

  async getDoctorSchedule(doctorId: string, date: Date): Promise<any> {
    return await HospitalVisitModel.getDoctorSchedule(doctorId, date);
  }

  async calculateVisitPrice(doctorId: string, visitType: string, appointmentType: string): Promise<{ price: number; doctorId: string; visitType: string; appointmentType: string; available: boolean }> {
    try {
      return await HospitalVisitModel.calculateVisitPrice(doctorId, visitType, appointmentType);
    } catch (error: any) {
      logger.error({ error: error.message, doctorId, visitType, appointmentType }, "Error in calculateVisitPrice service");
      throw error; // Re-throw to let controller handle it
    }
  }

  async getPatientDisplayQueue(doctorId: string, date: Date, overrideSessionSlot?: string): Promise<any> {
    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      throw new APIError(
        400,
        "Invalid Doctor ID",
        `The provided doctor ID '${doctorId}' is not a valid MongoDB ObjectId format.`
      );
    }

    // Check if doctor exists
    const HospitalDoctor = (await import("../../hospital-doctor/models/hospital-doctor.model")).default;
    const doctor = await HospitalDoctor.findById(doctorId);
    if (!doctor) {
      throw new APIError(
        404,
        "Doctor Not Found",
        `No doctor with ID '${doctorId}' found.`
      );
    }

    const sessionTimeService = (await import("./session-time.service")).default;
    const sessionInfo = await sessionTimeService.getCurrentSessionForDoctor(doctor);
    const activeSessionSlot = overrideSessionSlot !== undefined ? overrideSessionSlot : sessionInfo.sessionSlot;

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Build session slot filter:
    // If active session slot is detected/provided, match visits for that sessionSlot PLUS all visits created without session slot.
    // If no active session slot (e.g. after working hours), show all visits created without session slot (day-long validity).
    const sessionMatchCriteria: any[] = [
      { sessionSlot: { $exists: false } },
      { sessionSlot: null },
      { sessionSlot: "" }
    ];

    if (activeSessionSlot) {
      sessionMatchCriteria.unshift({ sessionSlot: activeSessionSlot });
    }

    // Use aggregation to get visits for doctor on this date (active slot + slotless)
    const pipeline: any[] = [
      { 
        $match: { 
          doctorId,
          visitDate: {
            $gte: startOfDay,
            $lte: endOfDay
          },
          $or: sessionMatchCriteria,
          status: { $in: ["Scheduled", "In Progress"] },
          isDeleted: { $ne: true }
        } 
      },
      
      // Lookup patient details
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
      
      // Sort: Emergency visits first, then by token number
      { 
        $sort: { 
          visitType: -1, // Emergency comes before others alphabetically when reversed
          tokenNumber: 1 
        } 
      },
      
      // Project only necessary fields for display
      {
        $project: {
          _id: 1,
          visitId: 1,
          appointmentId: 1,
          tokenNumber: 1,
          visitTime: 1,
          visitType: 1,
          appointmentType: 1,
          sessionSlot: 1, // Include for informational purposes
          status: 1,
          "patient.mrd": 1,
          "patient.patientUhid": 1,
          "patient.name": 1,
          "patient.age": 1,
          "patient.gender": 1
        }
      }
    ];

    const visits = await HospitalVisitModel.aggregate(pipeline);
    const queueSortBy: "token" | "time" = (doctor as any).queueSortBy || "token";

    // Manually sort: Emergency visits always first, then by queueSortBy (time or token)
    const sortedVisits = visits.sort((a: any, b: any) => {
      // 1. Emergency visits always come first
      if (a.visitType === 'Emergency' && b.visitType !== 'Emergency') return -1;
      if (a.visitType !== 'Emergency' && b.visitType === 'Emergency') return 1;

      // 2. If doctor chose time-based sorting
      if (queueSortBy === "time") {
        const timeA = a.visitTime;
        const timeB = b.visitTime;

        if (timeA && timeB) {
          const cmp = timeA.localeCompare(timeB);
          if (cmp !== 0) return cmp;
        } else if (timeA && !timeB) {
          return -1; // visits with time come first
        } else if (!timeA && timeB) {
          return 1;
        }
      }

      // 3. Default / tiebreak: sort by token number
      return a.tokenNumber - b.tokenNumber;
    });
    
    // Serialize dates
    const serializedVisits = sortedVisits.map((visit: any) => {
      if (visit._id && typeof visit._id === 'object') {
        visit._id = visit._id.toString();
      }
      return visit;
    });

    return {
      doctorId,
      doctorName: doctor.name,
      department: doctor.department || null,
      designation: doctor.designation || null,
      yearsOfExperience: doctor.yearsOfExperience ?? null,
      opdNumber: (doctor as any).opdNumber || null,
      posterUrl: (doctor as any).posterUrl ? await (await import("@src/libs/utils/s3Upload")).getS3SignedUrl((doctor as any).posterUrl) : null,
      shift: doctor.weeklySchedule ? formatDoctorShift(doctor.weeklySchedule, date) : null,
      currentSessionSlot: activeSessionSlot,
      queueSortBy,
      date: date.toISOString().split('T')[0],
      totalPatients: serializedVisits.length,
      emergencyCount: serializedVisits.filter((v: any) => v.visitType === 'Emergency').length,
      regularCount: serializedVisits.filter((v: any) => v.visitType !== 'Emergency').length,
      queue: serializedVisits
    };
  }

  async getPatientDisplayQueueByReadableId(readableDoctorId: string, date?: Date, overrideSessionSlot?: string): Promise<any> {
    // Find doctor by readable doctorId
    const HospitalDoctor = (await import("../../hospital-doctor/models/hospital-doctor.model")).default;
    const doctor = await HospitalDoctor.findOne({ doctorId: readableDoctorId, isDeleted: { $ne: true } });
    
    if (!doctor) {
      throw new APIError(
        404,
        "Doctor Not Found",
        `No doctor with ID '${readableDoctorId}' found.`
      );
    }

    // Use provided date or current date
    const effectiveDate = date || new Date();

    // Use the MongoDB _id to get the queue
    const doctorMongoId = (doctor as any)._id.toString();
    return this.getPatientDisplayQueue(doctorMongoId, effectiveDate, overrideSessionSlot);
  }

  async reorderVisitToken(visitId: string, newTokenNumber: number, filter: any = {}): Promise<any> {
    // Validate new token number
    if (!newTokenNumber || newTokenNumber < 1) {
      throw new APIError(
        400,
        "Invalid Token Number",
        "Token number must be a positive integer greater than 0."
      );
    }

    // Find the target visit
    const targetVisit = await HospitalVisitModel.findOne({ _id: visitId, isDeleted: { $ne: true }, ...(filter || {}) });
    if (!targetVisit) {
      throw new APIError(
        404,
        "Visit Not Found",
        `No visit with ID '${visitId}' found.`
      );
    }

    // Check if visit can be reordered (only Scheduled and In Progress)
    if (!["Scheduled", "In Progress"].includes(targetVisit.status)) {
      throw new APIError(
        400,
        "Cannot Reorder Visit",
        `Only visits with status 'Scheduled' or 'In Progress' can be reordered. Current status: ${targetVisit.status}`
      );
    }

    const currentToken = targetVisit.tokenNumber;
    const doctorId = targetVisit.doctorId;
    const visitDate = targetVisit.visitDate;

    // If token number is same, no operation needed
    if (currentToken === newTokenNumber) {
      logger.info({ visitId, currentToken, newTokenNumber }, "Token number unchanged, no reordering needed");
      return {
        visit: targetVisit.toObject(),
        affectedVisits: 0,
        message: "Token number unchanged"
      };
    }

    const startOfDay = new Date(visitDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(visitDate);
    endOfDay.setHours(23, 59, 59, 999);

    const isEmergency = targetVisit.visitType === "Emergency";
    const sessionSlot = targetVisit.sessionSlot;

    // Get all reorderable visits for same doctor/date scoped to same slot & emergency type
    const reorderFilter: any = {
      _id: { $ne: visitId },
      doctorId,
      visitDate: {
        $gte: startOfDay,
        $lte: endOfDay
      },
      status: { $in: ["Scheduled", "In Progress"] },
      isDeleted: { $ne: true },
      visitType: isEmergency ? "Emergency" : { $ne: "Emergency" }
    };

    if (sessionSlot) {
      reorderFilter.sessionSlot = sessionSlot;
    } else {
      reorderFilter.$or = [
        { sessionSlot: { $exists: false } },
        { sessionSlot: null },
        { sessionSlot: "" }
      ];
    }

    const reorderableVisits = await HospitalVisitModel.find(reorderFilter).sort({ tokenNumber: 1 });

    // Get max token number among reorderable visits
    const maxToken = reorderableVisits.length > 0 
      ? Math.max(...reorderableVisits.map(v => v.tokenNumber))
      : currentToken;

    // If new token is beyond max, set it to max + 1 (move to end)
    const effectiveNewToken = newTokenNumber > maxToken ? maxToken + 1 : newTokenNumber;

    logger.info({ 
      visitId, 
      currentToken, 
      requestedToken: newTokenNumber,
      effectiveNewToken,
      maxToken,
      sessionSlot: sessionSlot || "not specified",
      isEmergency,
      reorderableCount: reorderableVisits.length 
    }, "Starting token reordering");

    // Start session for transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      let affectedCount = 0;

      if (effectiveNewToken < currentToken) {
        // Moving UP: Shift visits between newToken and currentToken-1 forward by 1
        const visitsToShift = reorderableVisits.filter(
          v => v.tokenNumber >= effectiveNewToken && v.tokenNumber < currentToken
        );

        for (const visit of visitsToShift) {
          await HospitalVisitModel.updateOne(
            { _id: visit._id },
            { $set: { tokenNumber: visit.tokenNumber + 1 } },
            { session }
          );
          affectedCount++;
        }

        logger.info({ 
          direction: "UP", 
          shiftedCount: affectedCount,
          range: `${effectiveNewToken} to ${currentToken - 1}`
        }, "Shifted visits forward");

      } else if (effectiveNewToken > currentToken) {
        // Moving DOWN: Shift visits between currentToken+1 and newToken backward by 1
        const visitsToShift = reorderableVisits.filter(
          v => v.tokenNumber > currentToken && v.tokenNumber <= effectiveNewToken
        );

        for (const visit of visitsToShift) {
          await HospitalVisitModel.updateOne(
            { _id: visit._id },
            { $set: { tokenNumber: visit.tokenNumber - 1 } },
            { session }
          );
          affectedCount++;
        }

        logger.info({ 
          direction: "DOWN", 
          shiftedCount: affectedCount,
          range: `${currentToken + 1} to ${effectiveNewToken}`
        }, "Shifted visits backward");
      }

      // Update target visit with new token number
      await HospitalVisitModel.updateOne(
        { _id: visitId },
        { $set: { tokenNumber: effectiveNewToken } },
        { session }
      );

      // Commit transaction
      await session.commitTransaction();
      logger.info({ visitId, oldToken: currentToken, newToken: effectiveNewToken, affectedCount }, "Token reordering completed successfully");

      // Get updated visit
      const updatedVisit = await HospitalVisitModel.findById(visitId);

      // Get full updated queue for SSE broadcast
      const updatedQueue = await this.getPatientDisplayQueue(
        doctorId,
        visitDate
      );

      // Get doctor info for event
      const HospitalDoctor = (await import("../../hospital-doctor/models/hospital-doctor.model")).default;
      const doctor = await HospitalDoctor.findById(doctorId);
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
        posterUrl
      } : undefined;

      // Emit queue refresh event for SSE clients
      const visitDateStr = visitDate.toISOString().split('T')[0];
      visitEventsService.emitQueueRefresh(
        doctorId,
        visitDateStr,
        updatedQueue.queue,
        doctorInfo
      );

      return {
        visit: updatedVisit?.toObject(),
        affectedVisits: affectedCount,
        oldTokenNumber: currentToken,
        newTokenNumber: effectiveNewToken,
        queue: updatedQueue.queue
      };

    } catch (error: any) {
      // Rollback transaction on error
      await session.abortTransaction();
      logger.error({ error: error.message, visitId, currentToken, newTokenNumber }, "Token reordering failed, transaction rolled back");
      throw new APIError(
        500,
        "Token Reordering Failed",
        `Failed to reorder token: ${error.message}`
      );
    } finally {
      session.endSession();
    }
  }

  async getHospitalVisitByAppointmentId(appointmentId: string): Promise<HospitalVisitResponseDTO> {
    // Use aggregation to populate patient and doctor
    const pipeline: any[] = [
      { $match: { appointmentId, isDeleted: { $ne: true } } },
      
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
          "patient.aadharNo": 0,
          "patient.aadharS3Url": 0,
          "patient.ayushmanCardNo": 0,
          "patient.ayushmanCardS3Url": 0,
          "patient.otherDocsS3Urls": 0,
          "patient.pathlabPatientId": 0,
          "patient.isDeleted": 0,
          "patient.deletedAt": 0,
          "patient.deletedBy": 0,
          "doctor.__v": 0,
          "doctor.phone": 0,
          "doctor.medicalLicenseNo": 0,
          "doctor.isDeleted": 0,
          "doctor.deletedAt": 0,
          "doctor.deletedBy": 0,
          patientObjectId: 0,
          doctorObjectId: 0,
          createdByObjectId: 0,
          "createdByUser.__v": 0,
        }
      }
    ];

    const visits = await HospitalVisitModel.aggregate(pipeline);
    const visit = visits[0];
    
    if (!visit) {
      throw new Error(`Visit with appointment ID '${appointmentId}' not found`);
    }
    
    // Serialize all dates using helper function
    serializeDatesInVisit(visit);
    
    const mongoId = visit._id?.toString();
    
    // Populate transactions for this visit and calculate payment status
    if (mongoId) {
      try {
        const transactions = await HospitalTransactionService.getTransactionsByVisit(mongoId);
        if (transactions && transactions.length > 0) {
          (visit as any).transactions = transactions;
        }
        const totalPaid = calculateTotalPaid(transactions || []);
        (visit as any).amountPaid = totalPaid;
        (visit as any).paymentStatus = calculatePaymentStatus(visit.price || 0, visit.discount || 0, totalPaid, (visit as any).totalPrice);
      } catch (error) {
        logger.warn({ appointmentId, error }, "Failed to populate transactions for visit");
        (visit as any).amountPaid = 0;
        (visit as any).paymentStatus = visit.price === 0 ? "Paid" : "Unpaid";
      }
    } else {
      (visit as any).amountPaid = 0;
      (visit as any).paymentStatus = visit.price === 0 ? "Paid" : "Unpaid";
    }
    
    // Transform S3 URLs to signed URLs
    return transformS3Urls(visit) as HospitalVisitResponseDTO;
  }
}

export default new HospitalVisitService();
