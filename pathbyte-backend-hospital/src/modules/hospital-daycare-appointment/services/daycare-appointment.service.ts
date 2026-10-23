import DaycareAppointmentModel from "../models/daycare-appointment.model";
import HospitalPatientService from "../../hospital-patient/services/hospital-patient.service";
import HospitalTransactionService from "../../hospital-transaction/services/hospital-transaction.service";
import { getNextSequence } from "@src/libs/counter";
import { transformS3Urls } from "@src/libs/utils/s3Upload";
import { logger } from "@src/config/logger";
import { formatAppointmentDate } from "@src/libs/utils/hospitalWhatsapp";
import { sendTemplateMessage } from "@src/libs/utils/WhatsappMessaging";
import { createBodyComponents } from "@src/libs/utils/templateComponents/whatsappMessaging";
import { parseUTCStartOfDay, validateSlotCapacity } from "../../hospital-dialysis-session/services/dialysis-session.service";
import { getHospitalConfig } from "@src/libs/utils/systemConfig";
import {
  CreateDaycareAppointmentDTO,
  CreateDaycareAppointmentWithPatientDTO,
  CreateDaycareAppointmentWithTransactionDTO,
  DaycareAppointmentResponseDTO,
  CalculatePriceDTO,
  CalculatePriceResponseDTO,
} from "../dtos/daycare-appointment.dto";
import { DaycareAppointment } from "../models/daycare-appointment.types";

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

// Helper function to calculate payment status
function calculatePaymentStatus(totalPrice: number, totalPaid: number): "Paid" | "Unpaid" | "Partially Paid" {
  if (totalPrice <= 0) return "Paid";
  if (totalPaid >= totalPrice) return "Paid";
  if (totalPaid > 0) return "Partially Paid";
  return "Unpaid";
}

class DaycareAppointmentService {
  // Calculate price
  async calculatePrice(input: CalculatePriceDTO): Promise<CalculatePriceResponseDTO> {
    const priceData = await DaycareAppointmentModel.calculatePrice(
      input.daycareChargesType,
      input.daycareChargesHours,
      input.procedureIds || [],
      input.doctorId,
      input.doctorVisitCharges,
      input.customDaycareRate
    );

    return {
      daycareChargesType: input.daycareChargesType,
      daycareChargesRate: priceData.daycareChargesRate,
      daycareChargesHours: input.daycareChargesHours,
      daycareChargesTotal: priceData.daycareChargesTotal,
      procedures: priceData.procedures,
      procedureChargesTotal: priceData.procedureChargesTotal,
      doctorVisitCharges: input.doctorVisitCharges,
      doctorChargesAmount: priceData.doctorChargesAmount,
      subtotal: priceData.subtotal,
    };
  }

  // Create appointment with existing patient
  async createDaycareAppointment(
    newAppointment: CreateDaycareAppointmentDTO
  ): Promise<DaycareAppointmentResponseDTO> {
    // Generate IDs
    const nextDaycareId = await getNextSequence("daycareAppointmentId");
    const daycarePrefix = getHospitalConfig().daycarePrefix;
    const generatedDaycareId = `${daycarePrefix}${String(nextDaycareId).padStart(5, "0")}`;

    const nextAppointmentId = await getNextSequence("hospitalAppointmentId");
    const generatedAppointmentId = `APT${String(nextAppointmentId).padStart(5, "0")}`;

    // Generate receiptId
    const nextReceiptId = await getNextSequence("daycareReceiptId");
    const generatedReceiptId = `REC${String(nextReceiptId).padStart(5, "0")}`;

    // Convert appointmentDate string to Date object (default to today if not provided)
    let appointmentDate: Date;
    if (newAppointment.appointmentDate) {
      const parsed = parseUTCStartOfDay(newAppointment.appointmentDate);
      if (!parsed) {
        throw new Error(`Invalid date format for appointmentDate: ${newAppointment.appointmentDate}`);
      }
      appointmentDate = parsed;
    } else {
      appointmentDate = parseUTCStartOfDay(new Date())!;
    }

    // Validate discount password if discount is provided
    if (newAppointment.discount && newAppointment.discount > 0) {
      await DaycareAppointmentModel.validateDiscountPassword(
        newAppointment.discount,
        newAppointment.discountPassword
      );
    }

    // Calculate pricing
    const procedureInputList: any[] = (newAppointment as any).procedures || [];
    const procIdsFromInput = procedureInputList.map((p: any) => typeof p === "string" ? p : p.procedureId).filter(Boolean);
    const procedureIds = (newAppointment.procedureIds && newAppointment.procedureIds.length > 0)
      ? newAppointment.procedureIds
      : procIdsFromInput;

    const priceData = await DaycareAppointmentModel.calculatePrice(
      newAppointment.daycareChargesType,
      newAppointment.daycareChargesHours,
      procedureIds,
      newAppointment.doctorId,
      newAppointment.doctorVisitCharges,
      newAppointment.customDaycareRate
    );

    // Merge slotId and sessionDate onto procedures
    if (priceData.procedures && priceData.procedures.length > 0 && procedureInputList.length > 0) {
      for (const proc of priceData.procedures) {
        const matchedInput = procedureInputList.find((p: any) => (p.procedureId || p) === proc.procedureId);
        if (matchedInput && typeof matchedInput === "object") {
          if (matchedInput.slotId) proc.slotId = matchedInput.slotId;
          if (matchedInput.sessionDate) proc.sessionDate = parseUTCStartOfDay(matchedInput.sessionDate) || appointmentDate;
          else proc.sessionDate = appointmentDate;
        }
      }
    }

    const discount = newAppointment.discount || 0;
    const totalPrice = priceData.subtotal - discount;

    // Pre-validate slot capacity for dialysis procedures before creating appointment
    for (const proc of priceData.procedures) {
      if (proc.isDialysis && proc.slotId) {
        await validateSlotCapacity(proc.slotId, proc.sessionDate || appointmentDate);
      }
    }

    // Create appointment
    const appointment = await DaycareAppointmentModel.createDaycareAppointment({
      daycareId: generatedDaycareId,
      appointmentId: generatedAppointmentId,
      receiptId: generatedReceiptId,
      patientId: newAppointment.patientId,
      doctorId: newAppointment.doctorId,
      daycareChargesType: newAppointment.daycareChargesType,
      daycareChargesRate: priceData.daycareChargesRate,
      daycareChargesHours: newAppointment.daycareChargesHours,
      daycareChargesTotal: priceData.daycareChargesTotal,
      procedures: priceData.procedures,
      procedureChargesTotal: priceData.procedureChargesTotal,
      doctorVisitCharges: newAppointment.doctorVisitCharges,
      doctorChargesAmount: priceData.doctorChargesAmount,
      subtotal: priceData.subtotal,
      discount,
      discountAuthorizedAt: discount > 0 ? new Date() : undefined,
      totalPrice,
      appointmentDate,
      status: "Scheduled",
      createdBy: newAppointment.createdBy,
    } as DaycareAppointment);
    // Auto-create dialysis and xray sessions for applicable procedures
    const appointmentId_mongo = (appointment as any)._id?.toString();
    if (appointmentId_mongo && priceData.procedures.length > 0) {
      for (const proc of priceData.procedures) {
        if (proc.isDialysis) {
          try {
            const DialysisSessionService = (await import("../../hospital-dialysis-session/services/dialysis-session.service")).default;
            const session = await DialysisSessionService.createDialysisSession({
              patientId: newAppointment.patientId,
              procedureId: proc.procedureId,
              daycareAppointmentId: appointmentId_mongo,
              slotId: proc.slotId || undefined,
              sessionDate: proc.sessionDate || appointmentDate,
              generalInformation: {},
              status: "In Progress",
            } as any);
            const sessionMongoId = (session as any)._id?.toString();
            if (sessionMongoId) {
              await DaycareAppointmentModel.findByIdAndUpdate(
                appointmentId_mongo,
                { $set: { "procedures.$[elem].dialysisSessionId": sessionMongoId } },
                { arrayFilters: [{ "elem.procedureId": proc.procedureId }], new: true }
              );
              proc.dialysisSessionId = sessionMongoId;
            }
          } catch (err: any) {
            logger.error({ error: err.message, procedureId: proc.procedureId, daycareId: generatedDaycareId }, "Auto dialysis session creation failed â€” appointment still created");
          }
        }

        if ((proc as any).isXray) {
          try {
            const XraySessionService = (await import("../../hospital-xray-session/services/xray-session.service")).default;
            const session = await XraySessionService.createXraySession({
              patientId: newAppointment.patientId,
              procedureId: proc.procedureId,
              daycareAppointmentId: appointmentId_mongo,
              isUltrasound: (proc as any).isUltrasound === true,
              status: "Pending",
              tokenDate: typeof appointmentDate === "string"
                ? appointmentDate
                : appointmentDate.toISOString().split("T")[0],
            });
            const sessionMongoId = (session as any)._id?.toString();
            if (sessionMongoId) {
              await DaycareAppointmentModel.findByIdAndUpdate(
                appointmentId_mongo,
                { $set: { "procedures.$[elem].xraySessionId": sessionMongoId } },
                { arrayFilters: [{ "elem.procedureId": proc.procedureId }], new: true }
              );
              (proc as any).xraySessionId = sessionMongoId;
              // Fire SSE so display screen updates immediately
              try {
                const xrayTokenEventsService = (await import("../../hospital-xray-session/services/xray-token-events.service")).default;
                const queue = await XraySessionService.getQueueForDate((session as any).tokenDate);
                xrayTokenEventsService.emitTokenCreated((session as any).tokenDate, session, queue);
              } catch (sseErr: any) {
                logger.warn({ error: sseErr.message }, "SSE emit failed after daycare xray auto-create â€” non-fatal");
              }
            }
          } catch (err: any) {
            logger.error({ error: err.message, procedureId: proc.procedureId, daycareId: generatedDaycareId }, "Auto xray session creation failed â€” appointment still created");
          }
        }
      }
    }

    // Re-fetch to get updated dialysisSessionIds in procedures
    const updatedDoc = await DaycareAppointmentModel.findById(appointmentId_mongo);
    const updatedAppointment = updatedDoc ? updatedDoc.toObject() : appointment;

    // Send appointment registration WhatsApp notification (non-fatal, fire-and-forget)
    this._sendDaycareWhatsapp(newAppointment.patientId, newAppointment.doctorId, updatedAppointment);

    return transformS3Urls(updatedAppointment) as DaycareAppointmentResponseDTO;
  }

  // Create appointment with existing patient and optional transaction
  async createDaycareAppointmentWithTransaction(
    input: CreateDaycareAppointmentWithTransactionDTO
  ): Promise<DaycareAppointmentResponseDTO> {
    const { transaction, ...appointmentData } = input;

    // Create the appointment first
    const appointment = await this.createDaycareAppointment(appointmentData);

    // If transaction data is provided, create transaction
    if (transaction) {
      try {
        const appointmentDoc: any = await DaycareAppointmentModel.findOne({ daycareId: appointment.daycareId });
        if (!appointmentDoc) {
          throw new Error("Appointment created but not found");
        }

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
          // Use appointmentDate if it differs from the creation date (backdated appointment)
          const apptDate = appointmentDoc.appointmentDate ? new Date(appointmentDoc.appointmentDate) : null;
          const createdAt = appointmentDoc.createdAt ? new Date(appointmentDoc.createdAt) : new Date();
          const isBackdated = apptDate && apptDate.toDateString() !== createdAt.toDateString();
          transactionDate = isBackdated ? apptDate! : new Date();
        }

        const createdTransaction = await HospitalTransactionService.createHospitalTransaction({
          visitId: appointmentDoc._id.toString(),
          ...transaction,
          transactionDate,
        });

        logger.info({ daycareId: appointment.daycareId, transactionId: createdTransaction.transactionId }, "Transaction created with day care appointment");

        return {
          ...appointment,
          _id: appointmentDoc._id.toString(),
          transaction: createdTransaction,
        };
      } catch (error: any) {
        logger.error({ error: error.message, daycareId: appointment.daycareId }, "Transaction creation failed for day care appointment");
        return appointment;
      }
    }

    return appointment;
  }

  // Create appointment with new patient and optional transaction
  async createDaycareAppointmentWithPatient(
    input: CreateDaycareAppointmentWithPatientDTO
  ): Promise<DaycareAppointmentResponseDTO> {
    const { patient: patientData, transaction, ...appointmentData } = input;

    // Create the patient first
    const createdPatient = await HospitalPatientService.createHospitalPatient(patientData);

    // Get patient document to access _id
    const patientDoc: any = await HospitalPatientService.getHospitalPatient(createdPatient.mrd);
    const patientId = patientDoc._id?.toString() || patientDoc.id;

    if (!patientId) {
      throw new Error("Patient created but ID not found");
    }

    // Create the appointment with the new patient's ID
    const appointment = await this.createDaycareAppointment({
      ...appointmentData,
      patientId,
    });

    // If transaction data is provided, create transaction
    if (transaction) {
      try {
        const appointmentDoc: any = await DaycareAppointmentModel.findOne({ daycareId: appointment.daycareId });
        if (!appointmentDoc) {
          throw new Error("Appointment created but not found");
        }

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
          // Use appointmentDate if it differs from the creation date (backdated appointment)
          const apptDate = appointmentDoc.appointmentDate ? new Date(appointmentDoc.appointmentDate) : null;
          const createdAt = appointmentDoc.createdAt ? new Date(appointmentDoc.createdAt) : new Date();
          const isBackdated = apptDate && apptDate.toDateString() !== createdAt.toDateString();
          transactionDate = isBackdated ? apptDate! : new Date();
        }

        const createdTransaction = await HospitalTransactionService.createHospitalTransaction({
          visitId: appointmentDoc._id.toString(),
          ...transaction,
          transactionDate,
        });

        logger.info({ daycareId: appointment.daycareId, patientMrd: createdPatient.mrd, transactionId: createdTransaction.transactionId }, "Transaction created with day care appointment and patient");

        return {
          ...appointment,
          _id: appointmentDoc._id.toString(),
          patient: createdPatient,
          transaction: createdTransaction,
        };
      } catch (error: any) {
        logger.error({ error: error.message, daycareId: appointment.daycareId, patientMrd: createdPatient.mrd }, "Transaction creation failed for day care appointment with patient");
        return {
          ...appointment,
          patient: createdPatient,
        };
      }
    }

    return {
      ...appointment,
      patient: createdPatient,
    };
  }

  async getDaycareAppointments(
    query: any = {},
    search: any = {},
    skip: number = 0,
    limit: number = 10
  ): Promise<{ appointments: DaycareAppointmentResponseDTO[], totalCount: number }> {
    const result = await DaycareAppointmentModel.readDaycareAppointments(
      query,
      search,
      skip,
      limit
    );

    const appointments = result[0]?.data || [];
    const totalCount = result[0]?.totalCount[0]?.count || 0;

    // For each appointment, fetch patient, doctor, transactions and calculate payment status
    const appointmentsWithDetails = await Promise.all(
      appointments.map(async (appointment: any) => {
        const mongoId = appointment._id?.toString();
        
        // Fetch patient details (only if not already populated by model lookup)
        if (appointment.patientId && !appointment.patient) {
          try {
            const HospitalPatientModel = (await import("../../hospital-patient/models/hospital-patient.model")).default;
            const patient = await HospitalPatientModel.findById(appointment.patientId)
              .select('name title phone mrd age months days gender companyName division isMRPatient abhaLinked abhaPatientId')
              .lean();
            
            if (patient) {
              appointment.patient = {
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
            logger.warn({ patientId: appointment.patientId, error }, "Failed to fetch patient details");
          }
        }
        
        // Fetch doctor details
        if (appointment.doctorId) {
          try {
            const HospitalDoctorModel = (await import("../../hospital-doctor/models/hospital-doctor.model")).default;
            const doctor = await HospitalDoctorModel.findById(appointment.doctorId)
              .select('name department designation doctorId')
              .lean();
            
            if (doctor) {
              appointment.doctor = {
                _id: doctor._id?.toString(),
                doctorId: (doctor as any).doctorId,
                name: doctor.name,
                department: doctor.department,
                designation: doctor.designation
              };
            }
          } catch (error) {
            logger.warn({ doctorId: appointment.doctorId, error }, "Failed to fetch doctor details");
          }
        }
        
        // Fetch transactions and calculate payment status
        if (mongoId) {
          try {
            const transactions = await HospitalTransactionService.getTransactionsByVisit(mongoId);
            const totalPaid = calculateTotalPaid(transactions || []);
            appointment.amountPaid = totalPaid;
            appointment.paymentStatus = calculatePaymentStatus(appointment.totalPrice || 0, totalPaid);
            appointment.transactions = transactions;
          } catch (error) {
            appointment.amountPaid = 0;
            appointment.paymentStatus = appointment.totalPrice === 0 ? "Paid" : "Unpaid";
          }
        } else {
          appointment.amountPaid = 0;
          appointment.paymentStatus = appointment.totalPrice === 0 ? "Paid" : "Unpaid";
        }

        // Populate dialysis session data for procedures
        if (appointment.procedures && Array.isArray(appointment.procedures)) {
          const dialysisSessionIds = appointment.procedures
            .map((p: any) => p.dialysisSessionId)
            .filter(Boolean);

          if (dialysisSessionIds.length > 0) {
            try {
              const DialysisSessionModel = (await import("../../hospital-dialysis-session/models/dialysis-session.model")).default;
              const sessions = await DialysisSessionModel.find({
                _id: { $in: dialysisSessionIds }
              }).select('_id sessionId status sessionDate slotId doctorId slotDetails').lean();

              const sessionMap = new Map(sessions.map((s: any) => [s._id.toString(), s]));
              for (const proc of appointment.procedures) {
                if (proc.dialysisSessionId && sessionMap.has(proc.dialysisSessionId.toString())) {
                  const s = sessionMap.get(proc.dialysisSessionId.toString());
                  proc.dialysisSession = {
                    _id: s._id?.toString(),
                    sessionId: s.sessionId,
                    status: s.status,
                    sessionDate: s.sessionDate,
                    slotId: s.slotId,
                    doctorId: s.doctorId,
                    slotDetails: s.slotDetails,
                  };
                }
              }
            } catch (err) {
              logger.warn({ error: err }, "Failed to populate dialysis sessions for daycare procedures");
            }
          }
        }
        
        return transformS3Urls(appointment);
      })
    );


    return {
      appointments: appointmentsWithDetails,
      totalCount
    };
  }

  // Get by MongoDB _id
  async getDaycareAppointmentById(id: string): Promise<DaycareAppointmentResponseDTO> {
    const appointment = await DaycareAppointmentModel.readDaycareAppointmentById(id);
    return this._populateAppointment(appointment, { id });
  }

  // Get by readable daycareId (JJMDC00001)
  async getDaycareAppointmentByDaycareId(daycareId: string): Promise<DaycareAppointmentResponseDTO> {
    const appointment = await DaycareAppointmentModel.readDaycareAppointment(daycareId);
    return this._populateAppointment(appointment, { daycareId });
  }

  // Update by MongoDB _id
  async updateDaycareAppointmentById(
    id: string,
    updates: Partial<DaycareAppointment> & { procedureIds?: string[]; discountPassword?: string }
  ): Promise<DaycareAppointmentResponseDTO> {
    const { procedureIds, discountPassword, ...rest } = updates as any;

    const incomingProcedures = (updates as any).procedures;
    const effectiveProcedureIds: string[] | undefined = procedureIds !== undefined
      ? procedureIds
      : (Array.isArray(incomingProcedures)
          ? incomingProcedures.map((p: any) => typeof p === "string" ? p : p.procedureId).filter(Boolean)
          : undefined);

    // If procedureIds or procedures are being updated, recalculate pricing and sync sessions
    if (effectiveProcedureIds !== undefined) {
      // Fetch existing appointment to get current values and existing procedures
      const existing = await DaycareAppointmentModel.findById(id).lean() as any;
      if (!existing) {
        const { APIError } = await import("@src/shared");
        throw new APIError(404, "Appointment Not Found", `No day care appointment with ID '${id}' found.`);
      }

      // Resolve effective values â€” prefer update payload, fall back to existing doc
      const effectiveDoctorId       = rest.doctorId            ?? existing.doctorId;
      const effectiveDoctorVisit    = rest.doctorVisitCharges  ?? existing.doctorVisitCharges;
      const effectiveChargesType    = rest.daycareChargesType  ?? existing.daycareChargesType;
      const effectiveChargesHours   = rest.daycareChargesHours ?? existing.daycareChargesHours;
      const effectiveDiscount       = rest.discount            ?? existing.discount ?? 0;
      const effectiveCustomRate     = rest.customDaycareRate   ?? existing.daycareChargesRate;

      // Validate discount password if discount > 0
      if (effectiveDiscount > 0) {
        await DaycareAppointmentModel.validateDiscountPassword(effectiveDiscount, discountPassword, existing.discount);
      }

      // Recalculate pricing with effectiveProcedureIds
      const priceData = await DaycareAppointmentModel.calculatePrice(
        effectiveChargesType,
        effectiveChargesHours,
        effectiveProcedureIds,
        effectiveDoctorId,
        effectiveDoctorVisit,
        effectiveCustomRate
      );

      // Build maps of existing procedures with stored session IDs so we can preserve them
      const existingDialysisMap = new Map<string, string>(); // procedureId -> dialysisSessionId
      const existingXrayMap = new Map<string, string>();     // procedureId -> xraySessionId
      for (const proc of (existing.procedures || [])) {
        if (proc.isDialysis && proc.dialysisSessionId) existingDialysisMap.set(proc.procedureId, proc.dialysisSessionId);
        if (proc.isXray && proc.xraySessionId) existingXrayMap.set(proc.procedureId, proc.xraySessionId);
      }

      // Query DB for active DialysisSession records for this daycare appointment to ensure existing sessions are reused
      try {
        const DialysisSessionModel = (await import("../../hospital-dialysis-session/models/dialysis-session.model")).default;
        const activeSessions = await DialysisSessionModel.find({
          daycareAppointmentId: id,
          status: { $ne: "Cancelled" },
          isDeleted: { $ne: true },
        }).lean();
        for (const s of activeSessions) {
          if (s.procedureId && !existingDialysisMap.has(s.procedureId)) {
            existingDialysisMap.set(s.procedureId, (s as any)._id.toString());
          }
        }
      } catch (err) {
        // non-fatal
      }

      const effectiveAppointmentDate = rest.appointmentDate !== undefined
        ? parseUTCStartOfDay(rest.appointmentDate)
        : (existing.appointmentDate ? parseUTCStartOfDay(existing.appointmentDate) : parseUTCStartOfDay(new Date()));

      if (rest.appointmentDate !== undefined) {
        rest.appointmentDate = effectiveAppointmentDate;
      }

      const procedureInputList: any[] = Array.isArray(incomingProcedures) ? incomingProcedures : [];
      // Carry over existing session IDs for procedures that remain, and attach slotId / sessionDate
      const newProcedures = priceData.procedures.map((proc: any) => {
        const matchedInput = procedureInputList.find((p: any) => (p.procedureId || p) === proc.procedureId);
        const existingProc = (existing.procedures || []).find((p: any) => p.procedureId === proc.procedureId);
        const effectiveSlotId = matchedInput?.slotId !== undefined ? matchedInput.slotId : (existingProc?.slotId ?? null);
        const effectiveSessionDate = matchedInput?.sessionDate !== undefined
          ? parseUTCStartOfDay(matchedInput.sessionDate)
          : (existingProc?.sessionDate ? parseUTCStartOfDay(existingProc.sessionDate) : effectiveAppointmentDate);

        return {
          ...proc,
          dialysisSessionId: existingDialysisMap.get(proc.procedureId) ?? proc.dialysisSessionId ?? null,
          slotId: effectiveSlotId,
          sessionDate: effectiveSessionDate,
          xraySessionId: existingXrayMap.get(proc.procedureId) ?? (proc as any).xraySessionId ?? null,
        };
      });

      const newProcedureIdSet = new Set(priceData.procedures.map((p: any) => p.procedureId));

      // Collect removed dialysis session IDs / procedure IDs
      const removedSessionIds = [...existingDialysisMap.entries()]
        .filter(([procedureId]) => !newProcedureIdSet.has(procedureId))
        .map(([, sessionId]) => sessionId);
      const removedDialysisProcedureIds = (existing.procedures || [])
        .filter((p: any) => p.isDialysis && !p.dialysisSessionId && !newProcedureIdSet.has(p.procedureId))
        .map((p: any) => p.procedureId);

      // Collect removed xray session IDs / procedure IDs
      const removedXraySessionIds = [...existingXrayMap.entries()]
        .filter(([procedureId]) => !newProcedureIdSet.has(procedureId))
        .map(([, sessionId]) => sessionId);
      const removedXrayProcedureIds = (existing.procedures || [])
        .filter((p: any) => p.isXray && !p.xraySessionId && !newProcedureIdSet.has(p.procedureId))
        .map((p: any) => p.procedureId);

      // Cancel removed dialysis sessions
      if (removedSessionIds.length > 0 || removedDialysisProcedureIds.length > 0) {
        try {
          const DialysisSessionModel = (await import("../../hospital-dialysis-session/models/dialysis-session.model")).default;
          for (const sessionId of removedSessionIds) {
            await DialysisSessionModel.findByIdAndUpdate(sessionId, { $set: { status: "Cancelled" } });
          }
          if (removedDialysisProcedureIds.length > 0) {
            await DialysisSessionModel.updateMany(
              { daycareAppointmentId: id, procedureId: { $in: removedDialysisProcedureIds }, status: { $ne: "Cancelled" }, isDeleted: { $ne: true } },
              { $set: { status: "Cancelled" } }
            );
          }
        } catch (err: any) {
          logger.error({ error: err.message, appointmentId: id }, "Failed to cancel dialysis session(s) for removed daycare procedures");
        }
      }

      // Cancel removed xray sessions
      if (removedXraySessionIds.length > 0 || removedXrayProcedureIds.length > 0) {
        try {
          const XraySessionModel = (await import("../../hospital-xray-session/models/xray-session.model")).default;
          for (const sessionId of removedXraySessionIds) {
            await XraySessionModel.findByIdAndUpdate(sessionId, { $set: { status: "Cancelled" } });
          }
          if (removedXrayProcedureIds.length > 0) {
            await XraySessionModel.updateMany(
              { daycareAppointmentId: id, procedureId: { $in: removedXrayProcedureIds }, status: { $ne: "Cancelled" }, isDeleted: { $ne: true } },
              { $set: { status: "Cancelled" } }
            );
          }
        } catch (err: any) {
          logger.error({ error: err.message, appointmentId: id }, "Failed to cancel xray session(s) for removed daycare procedures");
        }
      }

      const totalPrice = priceData.subtotal - effectiveDiscount;

      // Pre-validate slot capacity for dialysis procedures before updating appointment
      for (const proc of newProcedures) {
        if (proc.isDialysis && proc.slotId) {
          const existingSessionId = existingDialysisMap.get(proc.procedureId);
          await validateSlotCapacity(proc.slotId, proc.sessionDate || effectiveAppointmentDate, existingSessionId);
        }
      }

      const finalUpdates: any = {
        ...rest,
        procedures: newProcedures,
        procedureChargesTotal: priceData.procedureChargesTotal,
        daycareChargesRate: priceData.daycareChargesRate ?? existing.daycareChargesRate,
        daycareChargesTotal: priceData.daycareChargesTotal ?? existing.daycareChargesTotal,
        doctorChargesAmount: priceData.doctorChargesAmount,
        subtotal: priceData.subtotal,
        discount: effectiveDiscount,
        totalPrice,
        ...(effectiveDiscount > 0 ? { discountAuthorizedAt: new Date() } : {}),
      };

      const updatedAppointment = await DaycareAppointmentModel.updateDaycareAppointmentById(id, finalUpdates);

      // Auto-create sessions for newly added procedures, and sync updates for existing sessions
      for (const proc of newProcedures) {
        if (proc.isDialysis) {
          if (!existingDialysisMap.has(proc.procedureId)) {
            try {
              const DialysisSessionService = (await import("../../hospital-dialysis-session/services/dialysis-session.service")).default;
              const session = await DialysisSessionService.createDialysisSession({
                patientId: existing.patientId,
                procedureId: proc.procedureId,
                daycareAppointmentId: id,
                slotId: proc.slotId || undefined,
                sessionDate: proc.sessionDate || existing.appointmentDate,
                generalInformation: {},
                status: "In Progress",
              } as any);
              const sessionId = (session as any)._id?.toString();
              if (sessionId) {
                await DaycareAppointmentModel.findByIdAndUpdate(
                  id,
                  { $set: { "procedures.$[elem].dialysisSessionId": sessionId } },
                  { arrayFilters: [{ "elem.procedureId": proc.procedureId }], new: true }
                );
              }
            } catch (err: any) {
              logger.error({ error: err.message, procedureId: proc.procedureId, appointmentId: id }, "Auto dialysis session creation failed during update");
            }
          } else {
            // Existing dialysis procedure â€” sync slotId/sessionDate if updated
            const existingSessionId = existingDialysisMap.get(proc.procedureId);
            const sessionDateToUpdate = proc.sessionDate || rest.appointmentDate;
            if (existingSessionId && (proc.slotId !== undefined || sessionDateToUpdate !== undefined)) {
              try {
                const DialysisSessionService = (await import("../../hospital-dialysis-session/services/dialysis-session.service")).default;
                await DialysisSessionService.updateDialysisSessionById(existingSessionId, {
                  ...(proc.slotId !== undefined ? { slotId: proc.slotId } : {}),
                  ...(sessionDateToUpdate !== undefined ? { sessionDate: sessionDateToUpdate } : {}),
                });
              } catch (err: any) {
                logger.error({ error: err.message, procedureId: proc.procedureId, appointmentId: id }, "Failed to update existing dialysis session during daycare update");
              }
            }
          }
        }

        if ((proc as any).isXray && !existingXrayMap.has(proc.procedureId)) {
          try {
            const XraySessionService = (await import("../../hospital-xray-session/services/xray-session.service")).default;
            const session = await XraySessionService.createXraySession({
              patientId: existing.patientId,
              procedureId: proc.procedureId,
              daycareAppointmentId: id,
              isUltrasound: (proc as any).isUltrasound === true,
              status: "Pending",
              tokenDate: effectiveAppointmentDate
                ? effectiveAppointmentDate.toISOString().split("T")[0]
                : undefined,
            });
            const sessionId = (session as any)._id?.toString();
            if (sessionId) {
              await DaycareAppointmentModel.findByIdAndUpdate(
                id,
                { $set: { "procedures.$[elem].xraySessionId": sessionId } },
                { arrayFilters: [{ "elem.procedureId": proc.procedureId }], new: true }
              );
              // Fire SSE
              try {
                const xrayTokenEventsService = (await import("../../hospital-xray-session/services/xray-token-events.service")).default;
                const queue = await XraySessionService.getQueueForDate((session as any).tokenDate);
                xrayTokenEventsService.emitTokenCreated((session as any).tokenDate, session, queue);
              } catch (sseErr: any) {
                logger.warn({ error: sseErr.message }, "SSE emit failed after daycare xray update auto-create â€” non-fatal");
              }
            }
          } catch (err: any) {
            logger.error({ error: err.message, procedureId: proc.procedureId, appointmentId: id }, "Auto xray session creation failed during update");
          }
        }
      }

      // Re-fetch to return the final state with dialysisSessionIds patched in
      const finalDoc = await DaycareAppointmentModel.findById(id);
      const finalObj = finalDoc ? finalDoc.toObject() : updatedAppointment;
      return transformS3Urls(finalObj) as DaycareAppointmentResponseDTO;
    }

    // No procedures/procedureIds in update payload â€” simple field update (validate discount if provided)
    if (rest.discount !== undefined && rest.discount > 0) {
      const existing = await DaycareAppointmentModel.findById(id).lean() as any;
      await DaycareAppointmentModel.validateDiscountPassword(rest.discount, discountPassword, existing?.discount);
    }

    if (rest.appointmentDate !== undefined) {
      const parsedDate = parseUTCStartOfDay(rest.appointmentDate)!;
      rest.appointmentDate = parsedDate;

      const DialysisSessionModel = (await import("../../hospital-dialysis-session/models/dialysis-session.model")).default;
      const DialysisSessionService = (await import("../../hospital-dialysis-session/services/dialysis-session.service")).default;
      const activeSessions = await DialysisSessionModel.find({
        daycareAppointmentId: id,
        status: { $ne: "Cancelled" },
        isDeleted: { $ne: true },
      }).lean();

      // Pre-validate capacity for all active sessions on the new date
      for (const s of activeSessions) {
        if (s.slotId) {
          await validateSlotCapacity(s.slotId, parsedDate, (s as any)._id.toString());
        }
      }

      for (const s of activeSessions) {
        await DialysisSessionService.updateDialysisSessionById((s as any)._id.toString(), {
          sessionDate: parsedDate,
        });
      }
    }

    const updatedAppointment = await DaycareAppointmentModel.updateDaycareAppointmentById(id, rest);
    return transformS3Urls(updatedAppointment) as DaycareAppointmentResponseDTO;
  }

  // Delete by MongoDB _id
  async deleteDaycareAppointmentById(id: string): Promise<void> {
    const appointment = await DaycareAppointmentModel.findOne({ _id: id, isDeleted: { $ne: true } });
    if (!appointment) {
      throw new Error(`Day care appointment with ID '${id}' not found`);
    }

    // Soft delete the appointment
    await DaycareAppointmentModel.updateOne(
      { _id: id },
      { $set: { isDeleted: true, deletedAt: new Date() } }
    );

    // Soft delete related transactions
    await HospitalTransactionService.deleteTransactionsByVisitId(id);
    
    logger.info({ id, daycareId: (appointment as any).daycareId }, "Daycare appointment and related transactions soft-deleted");
  }

  // Legacy methods (kept for backward compatibility)
  async getDaycareAppointment(daycareId: string): Promise<DaycareAppointmentResponseDTO> {
    return this.getDaycareAppointmentByDaycareId(daycareId);
  }

  async updateDaycareAppointment(
    daycareId: string,
    updates: Partial<DaycareAppointment>
  ): Promise<DaycareAppointmentResponseDTO> {
    const updatedAppointment = await DaycareAppointmentModel.updateDaycareAppointment(
      daycareId,
      updates
    );

    return transformS3Urls(updatedAppointment) as DaycareAppointmentResponseDTO;
  }

  async deleteDaycareAppointment(daycareId: string): Promise<void> {
    const appointment = await DaycareAppointmentModel.findOne({ daycareId, isDeleted: { $ne: true } });
    if (!appointment) {
      throw new Error(`Day care appointment with ID '${daycareId}' not found`);
    }

    const mongoId = (appointment as any)._id?.toString();

    // Soft delete the appointment
    await DaycareAppointmentModel.updateOne(
      { _id: (appointment as any)._id },
      { $set: { isDeleted: true, deletedAt: new Date() } }
    );

    // Soft delete related transactions
    if (mongoId) {
      await HospitalTransactionService.deleteTransactionsByVisitId(mongoId);
    }
    
    logger.info({ daycareId, mongoId }, "Daycare appointment and related transactions soft-deleted");
  }

  // Shared helper to populate patient, doctor, and transactions on a single appointment
  private async _populateAppointment(appointment: any, logCtx: any): Promise<DaycareAppointmentResponseDTO> {
    const mongoId = appointment._id?.toString();

    // Populate patient details
    if (appointment.patientId) {
      try {
        const HospitalPatientModel = (await import("../../hospital-patient/models/hospital-patient.model")).default;
        const patient = await HospitalPatientModel.findById(appointment.patientId)
          .select('name title phone mrd age months days gender address bloodGroup companyName division isMRPatient abhaLinked abhaPatientId emergencyContacts')
          .lean();
        if (patient) {
          appointment.patient = {
            _id: patient._id?.toString(),
            name: patient.name,
            title: patient.title,
            phone: patient.phone,
            mrd: patient.mrd,
            age: patient.age,
            months: (patient as any).months ?? 0,
            days: (patient as any).days ?? 0,
            gender: patient.gender,
            address: patient.address,
            bloodGroup: patient.bloodGroup,
            companyName: (patient as any).companyName,
            division: (patient as any).division,
            isMRPatient: (patient as any).isMRPatient ?? false,
            abhaLinked: (patient as any).abhaLinked ?? false,
            abhaPatientId: (patient as any).abhaPatientId ?? null,
            emergencyContacts: patient.emergencyContacts,
          };
        }
      } catch (error) {
        logger.warn({ ...logCtx, error }, "Failed to populate patient for day care appointment");
      }
    }

    // Populate doctor details
    if (appointment.doctorId) {
      try {
        const HospitalDoctorModel = (await import("../../hospital-doctor/models/hospital-doctor.model")).default;
        const doctor = await HospitalDoctorModel.findById(appointment.doctorId)
          .select('name department designation doctorId')
          .lean();
        if (doctor) {
          appointment.doctor = {
            _id: doctor._id?.toString(),
            doctorId: (doctor as any).doctorId,
            name: doctor.name,
            department: doctor.department,
            designation: doctor.designation,
          };
        }
      } catch (error) {
        logger.warn({ ...logCtx, error }, "Failed to populate doctor for day care appointment");
      }
    }

    // Populate transactions and calculate payment status
    if (mongoId) {
      try {
        const transactions = await HospitalTransactionService.getTransactionsByVisit(mongoId);
        if (transactions && transactions.length > 0) {
          appointment.transactions = transactions;
        }
        const totalPaid = calculateTotalPaid(transactions || []);
        appointment.amountPaid = totalPaid;
        appointment.paymentStatus = calculatePaymentStatus(appointment.totalPrice || 0, totalPaid);
      } catch (error) {
        logger.warn({ ...logCtx, error }, "Failed to populate transactions for day care appointment");
        appointment.amountPaid = 0;
        appointment.paymentStatus = appointment.totalPrice === 0 ? "Paid" : "Unpaid";
      }
    } else {
      appointment.amountPaid = 0;
      appointment.paymentStatus = appointment.totalPrice === 0 ? "Paid" : "Unpaid";
    }

    // Populate createdBy user details
    if (appointment.createdBy) {
      try {
        const HospitalUserModel = (await import("../../hospital-auth/models/hospital-user.model")).default;
        const user = await HospitalUserModel.findById(appointment.createdBy)
          .select('name role username')
          .lean();
        if (user) {
          appointment.createdByUser = {
            _id: (user as any)._id?.toString(),
            name: user.name,
            role: user.role,
            username: user.username,
          };
        }
      } catch (error) {
        logger.warn({ ...logCtx, error }, "Failed to populate createdBy user for day care appointment");
      }
    }

    // Populate dialysis session data for procedures
    if (appointment.procedures && Array.isArray(appointment.procedures)) {
      const dialysisSessionIds = appointment.procedures
        .map((p: any) => p.dialysisSessionId)
        .filter(Boolean);

      if (dialysisSessionIds.length > 0) {
        try {
          const DialysisSessionModel = (await import("../../hospital-dialysis-session/models/dialysis-session.model")).default;
          const sessions = await DialysisSessionModel.find({
            _id: { $in: dialysisSessionIds }
          }).select('_id sessionId status sessionDate slotId doctorId slotDetails').lean();

          const sessionMap = new Map(sessions.map((s: any) => [s._id.toString(), s]));
          for (const proc of appointment.procedures) {
            if (proc.dialysisSessionId && sessionMap.has(proc.dialysisSessionId.toString())) {
              const s = sessionMap.get(proc.dialysisSessionId.toString());
              proc.dialysisSession = {
                _id: s._id?.toString(),
                sessionId: s.sessionId,
                status: s.status,
                sessionDate: s.sessionDate,
                slotId: s.slotId,
                doctorId: s.doctorId,
                slotDetails: s.slotDetails,
              };
            }
          }
        } catch (err) {
          logger.warn({ ...logCtx, err }, "Failed to populate dialysis sessions for daycare procedures");
        }
      }
    }

    const result = transformS3Urls(appointment) as any;

    return result as DaycareAppointmentResponseDTO;
  }

  async getAppointmentsByPatient(patientId: string): Promise<DaycareAppointmentResponseDTO[]> {
    const appointments = await DaycareAppointmentModel.getAppointmentsByPatient(patientId);
    return appointments.map((appointment: any) => transformS3Urls(appointment));
  }

  async getAppointmentsByDoctor(doctorId: string, date?: Date): Promise<DaycareAppointmentResponseDTO[]> {
    const appointments = await DaycareAppointmentModel.getAppointmentsByDoctor(doctorId, date);
    return appointments.map((appointment: any) => transformS3Urls(appointment));
  }

  // Sends appointment registration WhatsApp to the patient (non-fatal)
  private async _sendDaycareWhatsapp(patientId: string, doctorId: string | undefined, appointment: any): Promise<void> {
    // Skip WhatsApp if disabled in config
    const { isWhatsAppEnabled } = await import("@src/libs/utils/systemConfig");
    if (!isWhatsAppEnabled()) {
      logger.debug({ patientId }, "WhatsApp messaging disabled");
      return;
    }
    
    try {
      const HospitalPatientModel = (await import("../../hospital-patient/models/hospital-patient.model")).default;

      const patient = await HospitalPatientModel.findById(patientId).select("name phone").lean();
      if (!patient || !(patient as any).phone) return;

      let doctorName = "N/A";
      if (doctorId) {
        const HospitalDoctorModel = (await import("../../hospital-doctor/models/hospital-doctor.model")).default;
        const doctor = await HospitalDoctorModel.findById(doctorId).select("name").lean();
        if (doctor) doctorName = (doctor as any).name;
      }

      // Use createdAt (today) as the appointment date and time
      const createdAt = appointment.createdAt instanceof Date
        ? appointment.createdAt
        : new Date();

      const appointmentTime = createdAt.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Kolkata",
      });

      const normalizedPhone = ((patient as any).phone as string).replace(/^\+/, "");

      const components = createBodyComponents({
        name: (patient as any).name,
        appointment_id: appointment.daycareId,
        service_type: "Daycare Procedure",
        dr_name: doctorName,
        appointment_date: formatAppointmentDate(createdAt),
        appointment_time: appointmentTime,
      });

      await sendTemplateMessage({
        to: normalizedPhone,
        templateName: "daycare_appointment_registration_hms",
        languageCode: "en",
        components,
        logMeta: {
          context: "daycare-registration",
          referenceId: appointment.daycareId,
          referenceType: "daycare",
          patientId,
          patientName: (patient as any).name,
          patientPhone: normalizedPhone,
          templateParams: { name: (patient as any).name, appointment_id: appointment.daycareId, service_type: "Daycare Procedure", dr_name: doctorName },
        },
      });

      logger.info({ phone: normalizedPhone, daycareId: appointment.daycareId }, "Daycare appointment WhatsApp sent");
    } catch (error) {
      logger.warn({ patientId, error }, "Failed to send daycare WhatsApp â€” non-fatal");
    }
  }
}

export default new DaycareAppointmentService();
