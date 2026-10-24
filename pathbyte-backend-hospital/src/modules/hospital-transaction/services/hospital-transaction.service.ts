import mongoose from "mongoose";
import { APIError } from "@src/shared";
import HospitalTransactionModel from "../models/hospital-transaction.model";
import { getNextSequence } from "@src/libs/counter";
import { transformS3Urls } from "@src/libs/utils/s3Upload";
import { 
  CreateHospitalTransactionDTO, 
  HospitalTransactionResponseDTO 
} from "../dtos/hospital-transaction.dto";
import { HospitalTransaction } from "../models/hospital-transaction.types";

class HospitalTransactionService {
  async createHospitalTransaction(
    newTransaction: CreateHospitalTransactionDTO
  ): Promise<HospitalTransactionResponseDTO> {
    // Generate transactionId
    const nextTransactionId = await getNextSequence("hospitalTransactionId");
    const generatedTransactionId = `HTXN${String(nextTransactionId).padStart(5, "0")}`;

    // Convert transactionDate string to Date object with validation, default to now if not provided
    let transactionDate: Date;
    if (newTransaction.transactionDate) {
      try {
        transactionDate = new Date(newTransaction.transactionDate);
        if (isNaN(transactionDate.getTime())) {
          throw new Error(`Invalid date format for transactionDate: ${newTransaction.transactionDate}`);
        }
      } catch (error: any) {
        throw new Error(`Error parsing transactionDate: ${error.message || error.toString()}`);
      }
    } else {
      transactionDate = new Date();
    }

    // Generate referenceNo if not provided
    const referenceNo = newTransaction.referenceNo || this.generateReferenceNo(
      newTransaction.paymentMode,
      transactionDate
    );

    // Create transaction
    const transaction = await HospitalTransactionModel.createHospitalTransaction({
      ...newTransaction,
      transactionId: generatedTransactionId,
      referenceNo,
      transactionDate,
    } as HospitalTransaction);

    // Transform S3 URLs to signed URLs
    return transformS3Urls(transaction) as HospitalTransactionResponseDTO;
  }

  // Helper method to generate reference number
  private generateReferenceNo(paymentMode: string, transactionDate: Date): string {
    const date = new Date(transactionDate);
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, ''); // YYYYMMDD
    const timeStr = date.getTime().toString().slice(-6); // Last 6 digits of timestamp
    const modePrefix = paymentMode.toUpperCase().replace(/\s+/g, '').substring(0, 4);
    return `${modePrefix}-${dateStr}-${timeStr}`;
  }

  async getHospitalTransactions(
    query: any = {},
    search: any = {},
    skip: number = 0,
    limit: number = 10,
    joinFilters: Record<string, string> = {}
  ): Promise<HospitalTransactionResponseDTO[]> {
    const transactions = await HospitalTransactionModel.readHospitalTransactions(
      query,
      search,
      skip,
      limit,
      joinFilters
    );

    return transactions.map((transaction: any) => transformS3Urls(transaction));
  }

  async countHospitalTransactions(
    search: any = {},
    joinFilters: Record<string, string> = {}
  ): Promise<number> {
    return HospitalTransactionModel.countHospitalTransactions(search, joinFilters);
  }

  async getHospitalTransaction(transactionId: string): Promise<HospitalTransactionResponseDTO> {
    const transaction = await HospitalTransactionModel.readHospitalTransaction(transactionId);
    
    // Transform S3 URLs to signed URLs
    return transformS3Urls(transaction) as HospitalTransactionResponseDTO;
  }

  async getHospitalTransactionById(id: string, filter: any = {}): Promise<HospitalTransactionResponseDTO> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new APIError(400, "Invalid Transaction ID", `The provided transaction ID '${id}' is not a valid MongoDB ObjectId format.`);
    }

    const { doctorId: filterDoctorId, ...directFilter } = filter || {};
    const matchQuery: any = { _id: new mongoose.Types.ObjectId(id), isDeleted: { $ne: true }, ...directFilter };

    const pipeline: any[] = [
      { $match: matchQuery },
      {
        $addFields: {
          visitObjectId: {
            $cond: {
              if: { $regexMatch: { input: "$visitId", regex: /^[0-9a-fA-F]{24}$/ } },
              then: { $toObjectId: "$visitId" },
              else: null
            }
          }
        }
      },
      { $lookup: { from: "hospitalvisits",       localField: "visitObjectId", foreignField: "_id", as: "_visitArr", pipeline: [{ $match: { isDeleted: { $ne: true } } }] } },
      { $lookup: { from: "daycareappointments",  localField: "visitObjectId", foreignField: "_id", as: "_daycareArr", pipeline: [{ $match: { isDeleted: { $ne: true } } }] } },
      { $lookup: { from: "hospitalipds",         localField: "visitObjectId", foreignField: "_id", as: "_ipdArr", pipeline: [{ $match: { isDeleted: { $ne: true } } }] } },
      {
        $addFields: {
          visitDetails: {
            $cond: {
              if: { $gt: [{ $size: "$_visitArr" }, 0] },
              then: { $arrayElemAt: ["$_visitArr", 0] },
              else: {
                $cond: {
                  if: { $gt: [{ $size: "$_daycareArr" }, 0] },
                  then: { $arrayElemAt: ["$_daycareArr", 0] },
                  else: {
                    $cond: {
                      if: { $gt: [{ $size: "$_ipdArr" }, 0] },
                      then: { $arrayElemAt: ["$_ipdArr", 0] },
                      else: null
                    }
                  }
                }
              }
            }
          },
          _isVisit: { $gt: [{ $size: "$_visitArr" }, 0] },
          _isDaycare: {
            $and: [
              { $eq: [{ $size: "$_visitArr" }, 0] },
              { $gt: [{ $size: "$_daycareArr" }, 0] }
            ]
          },
          _isIPD: {
            $and: [
              { $eq: [{ $size: "$_visitArr" }, 0] },
              { $eq: [{ $size: "$_daycareArr" }, 0] },
              { $gt: [{ $size: "$_ipdArr" }, 0] }
            ]
          }
        }
      },
    ];

    if (filterDoctorId) {
      pipeline.push({ $match: { "visitDetails.doctorId": filterDoctorId } });
    }

    pipeline.push(
      {
        $addFields: {
          patientObjectId: {
            $cond: {
              if: { $and: [{ $ne: ["$visitDetails", null] }, { $ne: ["$visitDetails.patientId", null] }, { $regexMatch: { input: { $ifNull: ["$visitDetails.patientId", ""] }, regex: /^[0-9a-fA-F]{24}$/ } }] },
              then: { $toObjectId: "$visitDetails.patientId" },
              else: null
            }
          }
        }
      },
      { $lookup: { from: "hospitalpatients", localField: "patientObjectId", foreignField: "_id", as: "patientDetails", pipeline: [{ $project: { name: 1, phone: 1 } }] } },
      { $unwind: { path: "$patientDetails", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          doctorObjectId: {
            $cond: {
              if: { $and: [{ $ne: ["$visitDetails", null] }, { $ne: ["$visitDetails.doctorId", null] }, { $regexMatch: { input: { $ifNull: ["$visitDetails.doctorId", ""] }, regex: /^[0-9a-fA-F]{24}$/ } }] },
              then: { $toObjectId: "$visitDetails.doctorId" },
              else: null
            }
          }
        }
      },
      { $lookup: { from: "hospitaldoctors", localField: "doctorObjectId", foreignField: "_id", as: "doctorDetails", pipeline: [{ $project: { name: 1 } }] } },
      { $unwind: { path: "$doctorDetails", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          visitReadableId: {
            $cond: {
              if: "$_isVisit",
              then: { $ifNull: ["$visitDetails.visitId", null] },
              else: {
                $cond: {
                  if: "$_isDaycare",
                  then: { $ifNull: ["$visitDetails.daycareId", null] },
                  else: { $ifNull: ["$visitDetails.ipdId", null] }
                }
              }
            }
          },
          visitType: {
            $cond: {
              if: "$_isVisit",
              then: { $ifNull: ["$visitDetails.visitType", null] },
              else: { $cond: { if: { $ne: ["$visitDetails", null] }, then: "New", else: null } }
            }
          },
          appointmentType: {
            $cond: {
              if: "$_isVisit",
              then: { $ifNull: ["$visitDetails.appointmentType", null] },
              else: {
                $cond: {
                  if: "$_isDaycare",
                  then: "Day Care",
                  else: { $cond: { if: "$_isIPD", then: "IPD", else: null } }
                }
              }
            }
          },
          doctorName:      { $ifNull: ["$doctorDetails.name", null] },
          patientName:     { $ifNull: ["$patientDetails.name", null] },
          patientPhone:    { $ifNull: ["$patientDetails.phone", null] }
        }
      },
      { $project: { _visitArr: 0, _daycareArr: 0, _ipdArr: 0, _isVisit: 0, _isDaycare: 0, _isIPD: 0, visitObjectId: 0, patientObjectId: 0, doctorObjectId: 0, visitDetails: 0, patientDetails: 0, doctorDetails: 0, __v: 0 } }
    );

    const transactions = await HospitalTransactionModel.aggregate(pipeline);

    const transaction = transactions[0];
    if (!transaction) {
      throw new APIError(404, "Transaction Not Found", `Transaction with ID '${id}' not found`);
    }

    if (transaction._id && typeof transaction._id === "object") transaction._id = transaction._id.toString();
    if (transaction.transactionDate) transaction.transactionDate = new Date(transaction.transactionDate).toISOString().split("T")[0];
    if (transaction.createdAt)       transaction.createdAt       = new Date(transaction.createdAt).toISOString();
    if (transaction.updatedAt)       transaction.updatedAt       = new Date(transaction.updatedAt).toISOString();
    if (transaction.visitReadableId === null)  delete transaction.visitReadableId;
    if (transaction.visitType === null)        delete transaction.visitType;
    if (transaction.appointmentType === null)  delete transaction.appointmentType;
    if (transaction.doctorName === null)       delete transaction.doctorName;
    if (transaction.patientName === null)      delete transaction.patientName;
    if (transaction.patientPhone === null)     delete transaction.patientPhone;

    return transformS3Urls(transaction) as HospitalTransactionResponseDTO;
  }

  async updateHospitalTransaction(
    transactionId: string,
    updates: Partial<HospitalTransaction>
  ): Promise<HospitalTransactionResponseDTO> {
    const updatedTransaction = await HospitalTransactionModel.updateHospitalTransaction(
      transactionId,
      updates
    );

    // Transform S3 URLs to signed URLs
    return transformS3Urls(updatedTransaction) as HospitalTransactionResponseDTO;
  }

  async updateHospitalTransactionById(
    id: string,
    updates: Partial<HospitalTransaction>,
    filter: any = {}
  ): Promise<HospitalTransactionResponseDTO> {
    if (filter && Object.keys(filter).length > 0) {
      await this.getHospitalTransactionById(id, filter);
    }

    // Convert transactionDate string to Date object with validation if provided
    const updateData: any = { ...updates };
    if (updates.transactionDate) {
      try {
        const transactionDate = new Date(updates.transactionDate);
        if (isNaN(transactionDate.getTime())) {
          throw new Error(`Invalid date format for transactionDate: ${updates.transactionDate}`);
        }
        updateData.transactionDate = transactionDate;
      } catch (error: any) {
        throw new Error(`Error parsing transactionDate: ${error.message || error.toString()}`);
      }
    }
    
    const updatedTransaction = await HospitalTransactionModel.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true } },
      { $set: updateData },
      { new: true }
    );
    
    if (!updatedTransaction) {
      throw new APIError(404, "Transaction Not Found", `Transaction with ID '${id}' not found`);
    }

    // Transform S3 URLs to signed URLs
    return transformS3Urls(updatedTransaction.toObject()) as HospitalTransactionResponseDTO;
  }

  async deleteHospitalTransaction(transactionId: string): Promise<void> {
    const deleted = await HospitalTransactionModel.findOneAndUpdate(
      { transactionId, isDeleted: { $ne: true } },
      { $set: { isDeleted: true, deletedAt: new Date() } },
      { new: true }
    );
    if (!deleted) {
      throw new APIError(404, "Transaction Not Found", `Transaction with ID '${transactionId}' not found`);
    }
  }

  async deleteHospitalTransactionById(id: string, filter: any = {}): Promise<void> {
    if (filter && Object.keys(filter).length > 0) {
      await this.getHospitalTransactionById(id, filter);
    }

    const deleted = await HospitalTransactionModel.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true } },
      { $set: { isDeleted: true, deletedAt: new Date() } },
      { new: true }
    );
    
    if (!deleted) {
      throw new APIError(404, "Transaction Not Found", `Transaction with ID '${id}' not found`);
    }
  }

  async deleteTransactionsByVisitId(visitId: string): Promise<void> {
    await HospitalTransactionModel.updateMany(
      { visitId, isDeleted: { $ne: true } },
      { $set: { isDeleted: true, deletedAt: new Date() } }
    );
  }

  async getTransactionsByVisit(visitId: string): Promise<HospitalTransactionResponseDTO[]> {
    const transactions = await HospitalTransactionModel.getTransactionsByVisit(visitId);
    return transactions.map((transaction: any) => transformS3Urls(transaction));
  }
}

export default new HospitalTransactionService();