import mongoose from "mongoose";
import { APIError } from "@src/shared";
import { 
  HospitalTransaction, 
  HospitalTransactionDoc, 
  HospitalTransactionModel 
} from "./hospital-transaction.types";

const Schema = mongoose.Schema;

const hospitalTransactionSchema = new Schema<HospitalTransactionDoc>(
  {
    transactionId: { type: String, required: true, unique: true },
    visitId: { type: String, required: true }, // Reference to hospital visit, daycare appointment, or IPD
    transactionType: { 
      type: String, 
      enum: ["Payment", "Refund", "Adjustment", "Advance"],
      required: true 
    },
    amount: { type: Number, required: true }, // Can be negative for refunds
    paymentMode: { 
      type: String, 
      enum: ["Cash", "Card", "UPI", "Net Banking", "Cheque", "Insurance", "Govt Backed"],
      required: true 
    },
    referenceNo: { type: String },
    transactionDate: { type: Date, required: true },
    isAdvance: { type: Boolean, default: false },
    // Soft delete fields
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    deletedBy: { type: String }, // User ID who deleted the record
  },
  { timestamps: true }
);

// Indexes
hospitalTransactionSchema.index({ isDeleted: 1 });
hospitalTransactionSchema.index({ visitId: 1, transactionDate: -1 });
hospitalTransactionSchema.index({ transactionDate: -1 });
hospitalTransactionSchema.index({ paymentMode: 1, transactionDate: -1 });

/**
 * Shared pipeline stages that resolve visitId → visit OR daycare appointment,
 * then resolve patientId and doctorId from whichever matched.
 * Must be appended AFTER the initial $match stage.
 * 
 * @param joinFilters - filters applied BEFORE the final $project (on visitDetails/doctorDetails fields)
 */
function buildVisitResolutionStages(joinFilters: Record<string, string> = {}): any[] {
  const stages: any[] = [
    // Convert visitId string to ObjectId
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

    // Try hospitalvisits first
    {
      $lookup: {
        from: "hospitalvisits",
        localField: "visitObjectId",
        foreignField: "_id",
        as: "_visitArr",
        pipeline: [{ $match: { isDeleted: { $ne: true } } }]
      }
    },

    // Try daycareappointments as fallback
    {
      $lookup: {
        from: "daycareappointments",
        localField: "visitObjectId",
        foreignField: "_id",
        as: "_daycareArr",
        pipeline: [{ $match: { isDeleted: { $ne: true } } }]
      }
    },

    // Try hospitalipds as second fallback
    {
      $lookup: {
        from: "hospitalipds",
        localField: "visitObjectId",
        foreignField: "_id",
        as: "_ipdArr",
        pipeline: [{ $match: { isDeleted: { $ne: true } } }]
      }
    },

    // Merge: use visit if found, else daycare, else IPD
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

  // Apply sourceType filter: only keep transactions whose visitId resolved to the specified collection
  // Accepted values: "visit", "daycareAppointment", "IPD"
  if (joinFilters.sourceType) {
    const sourceTypeMatch: any = {};
    switch (joinFilters.sourceType) {
      case "visit":
        sourceTypeMatch._isVisit = true;
        break;
      case "daycareAppointment":
        sourceTypeMatch._isDaycare = true;
        break;
      case "IPD":
        sourceTypeMatch._isIPD = true;
        break;
    }
    if (Object.keys(sourceTypeMatch).length > 0) {
      stages.push({ $match: sourceTypeMatch });
    }
  }

  // Apply doctorId / patientId / visitType filters on visitDetails BEFORE doctor lookup
  const visitMatch: any = {};
  if (joinFilters.doctorId)  visitMatch["visitDetails.doctorId"]  = joinFilters.doctorId;
  if (joinFilters.patientId) visitMatch["visitDetails.patientId"] = joinFilters.patientId;
  if (joinFilters.visitType) visitMatch["visitDetails.visitType"] = joinFilters.visitType;
  if (Object.keys(visitMatch).length > 0) {
    stages.push({ $match: visitMatch });
  }

  stages.push(
    // Resolve patientId from visitDetails
    {
      $addFields: {
        patientObjectId: {
          $cond: {
            if: {
              $and: [
                { $ne: ["$visitDetails", null] },
                { $ne: ["$visitDetails.patientId", null] },
                { $regexMatch: { input: { $ifNull: ["$visitDetails.patientId", ""] }, regex: /^[0-9a-fA-F]{24}$/ } }
              ]
            },
            then: { $toObjectId: "$visitDetails.patientId" },
            else: null
          }
        }
      }
    },
    {
      $lookup: {
        from: "hospitalpatients",
        localField: "patientObjectId",
        foreignField: "_id",
        as: "patientDetails",
        pipeline: [{ $project: { name: 1, phone: 1 } }]
      }
    },
    { $unwind: { path: "$patientDetails", preserveNullAndEmptyArrays: true } },

    // Resolve doctorId from visitDetails
    {
      $addFields: {
        doctorObjectId: {
          $cond: {
            if: {
              $and: [
                { $ne: ["$visitDetails", null] },
                { $ne: ["$visitDetails.doctorId", null] },
                { $regexMatch: { input: { $ifNull: ["$visitDetails.doctorId", ""] }, regex: /^[0-9a-fA-F]{24}$/ } }
              ]
            },
            then: { $toObjectId: "$visitDetails.doctorId" },
            else: null
          }
        }
      }
    },
    {
      $lookup: {
        from: "hospitaldoctors",
        localField: "doctorObjectId",
        foreignField: "_id",
        as: "doctorDetails",
        pipeline: [{ $project: { name: 1, department: 1 } }]
      }
    },
    { $unwind: { path: "$doctorDetails", preserveNullAndEmptyArrays: true } },
  );

  // Apply department filter AFTER doctor lookup
  if (joinFilters.department) {
    stages.push({ $match: { "doctorDetails.department": joinFilters.department } });
  }

  stages.push(
    // Flatten useful fields to root
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
                else: {
                  $cond: {
                    if: "$_isIPD",
                    then: { $ifNull: ["$visitDetails.ipdId", null] },
                    else: null
                  }
                }
              }
            }
          }
        },
        visitType: {
          $cond: {
            if: "$_isVisit",
            then: { $ifNull: ["$visitDetails.visitType", null] },
            else: {
              $cond: {
                if: "$_isDaycare",
                then: "New",
                else: {
                  $cond: {
                    if: "$_isIPD",
                    then: "IPD",
                    else: null
                  }
                }
              }
            }
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
                else: {
                  $cond: {
                    if: "$_isIPD",
                    then: "IPD",
                    else: null
                  }
                }
              }
            }
          }
        },
        doctorName:     { $ifNull: ["$doctorDetails.name", null] },
        department:     { $ifNull: ["$doctorDetails.department", null] },
        patientName:    { $ifNull: ["$patientDetails.name", null] },
        patientPhone:   { $ifNull: ["$patientDetails.phone", null] }
      }
    },

    // Clean up temp fields
    {
      $project: {
        _visitArr: 0,
        _daycareArr: 0,
        _ipdArr: 0,
        _isVisit: 0,
        _isDaycare: 0,
        _isIPD: 0,
        visitObjectId: 0,
        patientObjectId: 0,
        doctorObjectId: 0,
        visitDetails: 0,
        patientDetails: 0,
        doctorDetails: 0
      }
    }
  );

  return stages;
}

/** Serialize dates and strip null enrichment fields from an aggregation result */
function serializeTransaction(transaction: any): any {
  if (transaction._id && typeof transaction._id === "object") {
    transaction._id = transaction._id.toString();
  }
  if (transaction.transactionDate) {
    transaction.transactionDate = new Date(transaction.transactionDate).toISOString().split("T")[0];
  }
  if (transaction.createdAt) {
    transaction.createdAt = new Date(transaction.createdAt).toISOString();
  }
  if (transaction.updatedAt) {
    transaction.updatedAt = new Date(transaction.updatedAt).toISOString();
  }
  if (transaction.visitReadableId === null)  delete transaction.visitReadableId;
  if (transaction.visitType === null)        delete transaction.visitType;
  if (transaction.appointmentType === null)  delete transaction.appointmentType;
  if (transaction.doctorName === null)       delete transaction.doctorName;
  if (transaction.department === null)       delete transaction.department;
  if (transaction.patientName === null)      delete transaction.patientName;
  if (transaction.patientPhone === null)     delete transaction.patientPhone;
  return transaction;
}

hospitalTransactionSchema.statics = {
  async createHospitalTransaction(newTransaction: HospitalTransaction): Promise<HospitalTransaction> {
    const duplicateId = await this.findOne({ transactionId: newTransaction.transactionId });
    if (duplicateId) {
      throw new APIError(
        409,
        "Transaction Already Exists",
        `Transaction with ID '${newTransaction.transactionId}' already exists.`
      );
    }
    const transaction = await new this(newTransaction).save();
    return transaction.toObject();
  },

  async readHospitalTransactions(query: any, search: any, skip: number, limit: number, joinFilters: Record<string, string> = {}) {
    const pipeline: any[] = [
      { $match: { ...query, ...search, isDeleted: { $ne: true } } },
      ...buildVisitResolutionStages(joinFilters),
      { $sort: { transactionDate: -1, createdAt: -1 } },
      { $skip: skip },
      { $limit: limit }
    ];

    const results = await this.aggregate(pipeline);
    return results.map(serializeTransaction);
  },

  async countHospitalTransactions(search: any, joinFilters: Record<string, string> = {}): Promise<number> {
    const hasJoinFilters = Object.keys(joinFilters).length > 0;
    if (!hasJoinFilters) {
      return this.countDocuments(search);
    }
    const pipeline: any[] = [
      { $match: { ...search, isDeleted: { $ne: true } } },
      ...buildVisitResolutionStages(joinFilters),
      { $count: "total" }
    ];
    const result = await this.aggregate(pipeline);
    return result.length > 0 ? result[0].total : 0;
  },

  async readHospitalTransaction(transactionId: string) {
    const pipeline: any[] = [
      { $match: { transactionId, isDeleted: { $ne: true } } },
      ...buildVisitResolutionStages(),
    ];

    const transactions = await this.aggregate(pipeline);
    const transaction = transactions[0];

    if (!transaction) {
      throw new APIError(
        404,
        "Transaction Not Found",
        `No transaction with ID '${transactionId}' found.`
      );
    }

    return serializeTransaction(transaction);
  },

  async updateHospitalTransaction(transactionId: string, updates: Partial<HospitalTransaction>): Promise<HospitalTransaction> {
    const updated = await this.findOneAndUpdate(
      { transactionId, isDeleted: { $ne: true } },
      { $set: updates },
      { new: true }
    );
    if (!updated) {
      throw new APIError(
        404,
        "Transaction Not Found",
        `No transaction with ID '${transactionId}' found.`
      );
    }
    return updated.toObject();
  },

  async deleteHospitalTransaction(transactionId: string): Promise<void> {
    const deleted = await this.findOneAndDelete({ transactionId });
    if (!deleted) {
      throw new APIError(
        404,
        "Transaction Not Found",
        `No transaction with ID '${transactionId}' found.`
      );
    }
  },

  async getTransactionsByVisit(visitId: string) {
    const transactions = await this.find({ visitId, isDeleted: { $ne: true } })
      .sort({ transactionDate: -1 })
      .exec();
    return transactions.map((transaction: HospitalTransactionDoc) => transaction.toObject());
  },
};

// Transform with .toObject to remove __v and properly serialize _id
if (!hospitalTransactionSchema.options.toObject) hospitalTransactionSchema.options.toObject = {};
hospitalTransactionSchema.options.toObject.transform = (_doc: any, ret: any) => {
  const { __v, ...clean } = ret;
  // Ensure _id is properly serialized as string
  if (clean._id && typeof clean._id === 'object') {
    clean._id = clean._id.toString();
  }
  return clean;
};

// Transform with .toObject to remove __v and properly serialize _id and dates
if (!hospitalTransactionSchema.options.toObject) hospitalTransactionSchema.options.toObject = {};
hospitalTransactionSchema.options.toObject.transform = (_doc: any, ret: any) => {
  const { __v, ...clean } = ret;
  // Ensure _id is properly serialized as string
  if (clean._id && typeof clean._id === 'object') {
    clean._id = clean._id.toString();
  }
  // Ensure transactionDate is properly serialized as YYYY-MM-DD format (same as DOB)
  if (clean.transactionDate && clean.transactionDate instanceof Date) {
    clean.transactionDate = clean.transactionDate.toISOString().split('T')[0]; // Return as YYYY-MM-DD format
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

const HospitalTransaction = mongoose.model<HospitalTransactionDoc, HospitalTransactionModel>(
  "HospitalTransaction",
  hospitalTransactionSchema
);

export default HospitalTransaction;