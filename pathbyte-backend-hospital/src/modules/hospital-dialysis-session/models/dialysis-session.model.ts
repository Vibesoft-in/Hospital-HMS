import mongoose from "mongoose";
import { APIError } from "@src/shared";
import { 
  DialysisSession, 
  DialysisSessionDoc, 
  DialysisSessionModel,
  MonitoringReading
} from "./dialysis-session.types";

const Schema = mongoose.Schema;

const generalInformationSchema = new Schema({
  // Basic Information
  machineNumber: { type: String },
  uhid: { type: String },
  technicianName: { type: String },
  fiberVolume: { type: String },
  height: { type: String },
  
  // Weight Management
  heparinUse: { type: String },
  preHdWeightToday: { type: String },
  lastPostHdWeight: { type: String },
  weightGain: { type: String },
  targetWeightLoss: { type: String },
  postHdWeightToday: { type: String },
  actualWeightLoss: { type: String },
  remainingWeightLoss: { type: String },
  targetDryWeight: { type: String },
  
  // Dialyzer Usage
  dialyzerUsageSingleUse: { type: Boolean },
  dialyzerUsageReuse: { type: Boolean },
  timesReused: { type: String },
  
  // Vascular Access
  vascularAccessPresent: { type: Boolean },
  
  // Central Line Options
  centralLineYes: { type: Boolean },
  centralLineNo: { type: Boolean },
  centralLineIJV: { type: Boolean },
  centralLineFemoral: { type: Boolean },
  
  // AVF/AVG/IJV/Femoral Options
  avfSelected: { type: Boolean },
  avgSelected: { type: Boolean },
  ijvSelected: { type: Boolean },
  femoralSelected: { type: Boolean },
  tunneledCatheter: { type: Boolean },
  
  // AVF Needle Size
  avfNeedleSize16G: { type: Boolean },
  avfNeedleSize17G: { type: Boolean },
  avfNeedleSizeOthers: { type: Boolean },
  avfNeedleSizeOthersValue: { type: String },
  
  // Bruit/Thrill
  bruitThrillPresent: { type: Boolean },
  bruitThrillAbsent: { type: Boolean },
  bruitThrillNotApplicable: { type: Boolean },

  // Additional fields
  bolus: { type: String },
  hourly: { type: String },
  startTime: { type: String },
  endTime: { type: String },
}, { _id: false });

const preDialysisAssessmentSchema = new Schema({
  bpStartHd: { type: String },
  spo2: { type: String },
  bodyTemperature: { type: String },
  pulse: { type: String }
}, { _id: false });

const monitoringReadingSchema = new Schema({
  timeOnHd: { type: String, required: true },
  pr: { type: String },
  bp: { type: String },
  bfr: { type: String },
  dfr: { type: String },
  ufr: { type: String },
  totalUf: { type: String },
  temperature: { type: String },
  dyna: { type: String },
  heparin: { type: String },
  rbs: { type: String }
}, { _id: false });

const postDialysisAssessmentSchema = new Schema({
  pulse: { type: String },
  bp: { type: String },
  bodyTemperature: { type: String },
  postHdWeight: { type: String },
  postHdWeightField2: { type: String },
  ufRemoved: { type: String },
  prolongedBleedingField1: { type: String },
  prolongedBleedingField2: { type: String },
  bruitThrillAvfAvgField1: { type: String },
  bruitThrillAvfAvgField2: { type: String },
  bruitThrillAvfAvgField3: { type: String },
  ktVAchieved: { type: String }
}, { _id: false });

const complicationsSchema = new Schema({
  headache: { type: Boolean, default: false },
  rash: { type: Boolean, default: false },
  dyspnea: { type: Boolean, default: false },
  seizures: { type: Boolean, default: false },
  fever: { type: Boolean, default: false },
  cramps: { type: Boolean, default: false },
  chestPain: { type: Boolean, default: false },
  dialyzerReaction: { type: Boolean, default: false },
  hypotension: { type: Boolean, default: false },
  rigor: { type: Boolean, default: false },
  vomiting: { type: Boolean, default: false },
  pruritus: { type: Boolean, default: false },
  formSibring: { type: Boolean, default: false },
  hypoglycemia: { type: Boolean, default: false },
  hypertension: { type: Boolean, default: false },
  other: { type: String },
  noComplication: { type: Boolean, default: false }
}, { _id: false });

const treatmentGivenSchema = new Schema({
  epoDosage: { type: String },
  epoGivenBy: { type: String },
  patientSignature: { type: String },
  ivIronDose: { type: String },
  bloodTransfusionField1: { type: String },
  bloodTransfusionField2: { type: String },
  numberOfUnits: { type: String },
  bloodBankName: { type: String },
  typeOfBlood: { type: String },
  otherTreatmentGivenDrug: { type: String }
}, { _id: false });

const signaturesSchema = new Schema({
  technicianSignature: { type: String },
  doctorInCharge: { type: String },
  patientSignature: { type: String }
}, { _id: false });

const slotDetailsSchema = new Schema({
  name: { type: String },
  startTime: { type: String },
  endTime: { type: String },
}, { _id: false });

const dialysisSessionSchema = new Schema<DialysisSessionDoc>(
  {
    sessionId: { type: String, required: true, unique: true },
    visitId: { type: String, index: true },
    patientId: { type: String, required: true, index: true },
    procedureId: { type: String, index: true },
    daycareAppointmentId: { type: String, index: true, default: null },
    ipdId: { type: String, index: true, default: null }, // Optional link to HospitalIPD
    source: {
      type: String,
      enum: ["daycare", "ipd", "manual"],
      default: "manual",
      index: true,
    },
    sessionDate: { type: Date, index: true, default: null },
    slotId: { type: String, index: true, default: null },
    doctorId: { type: String, index: true, default: null },
    slotDetails: { type: slotDetailsSchema, default: null },
    generalInformation: { type: generalInformationSchema, required: true },
    preDialysisAssessment: { type: preDialysisAssessmentSchema },
    monitoringReadings: { type: [monitoringReadingSchema], default: [] },
    postDialysisAssessment: { type: postDialysisAssessmentSchema },
    complications: { type: complicationsSchema },
    treatmentGiven: { type: treatmentGivenSchema },
    signatures: { type: signaturesSchema },
    status: { 
      type: String, 
      enum: ["In Progress", "Completed", "Cancelled"],
      default: "In Progress"
    },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    deletedBy: { type: String }
  },
  { timestamps: true }
);

// Indexes for better performance
dialysisSessionSchema.index({ sessionId: 1 });
dialysisSessionSchema.index({ visitId: 1, createdAt: -1 });
dialysisSessionSchema.index({ patientId: 1, createdAt: -1 });
dialysisSessionSchema.index({ sessionDate: 1, slotId: 1 });
dialysisSessionSchema.index({ status: 1 });
dialysisSessionSchema.index({ isDeleted: 1 });

/**
 * Shared pipeline stages that lookup the linked IPD and compute
 * amountPaid + paymentStatus from its transactions.
 * Must be appended AFTER the daycare appointment stages.
 */
function buildIpdAppointmentStages(): any[] {
  return [
    // Convert ipdId string → ObjectId
    {
      $addFields: {
        ipdObjectId: {
          $cond: {
            if: {
              $and: [
                { $ne: ["$ipdId", null] },
                { $ne: ["$ipdId", ""] },
                { $regexMatch: { input: { $ifNull: ["$ipdId", ""] }, regex: /^[0-9a-fA-F]{24}$/ } }
              ]
            },
            then: { $toObjectId: "$ipdId" },
            else: null
          }
        }
      }
    },

    // Lookup IPD document
    {
      $lookup: {
        from: "hospitalipds",
        localField: "ipdObjectId",
        foreignField: "_id",
        as: "_ipdArr",
        pipeline: [{ $match: { isDeleted: { $ne: true } } }]
      }
    },
    {
      $addFields: {
        _ipdDoc: { $arrayElemAt: ["$_ipdArr", 0] }
      }
    },

    // Lookup transactions for this IPD to compute amountPaid
    {
      $lookup: {
        from: "hospitaltransactions",
        let: { ipdStrId: { $toString: "$ipdObjectId" } },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$visitId", "$$ipdStrId"] },
                  { $in: ["$transactionType", ["Payment", "Advance", "Refund", "Adjustment"]] }
                ]
              }
            }
          },
          { $project: { transactionType: 1, amount: 1 } }
        ],
        as: "_ipdTransactions"
      }
    },

    // Compute amountPaid from transactions
    {
      $addFields: {
        _ipdAmountPaid: {
          $reduce: {
            input: "$_ipdTransactions",
            initialValue: 0,
            in: {
              $switch: {
                branches: [
                  { case: { $in: ["$this.transactionType", ["Payment", "Advance"]] }, then: { $add: ["$value", "$this.amount"] } },
                  { case: { $eq: ["$this.transactionType", "Refund"] }, then: { $subtract: ["$value", "$this.amount"] } },
                  { case: { $eq: ["$this.transactionType", "Adjustment"] }, then: { $add: ["$value", "$this.amount"] } }
                ],
                default: "$value"
              }
            }
          }
        }
      }
    },

    // Build the ipdAppointment object
    {
      $addFields: {
        ipdAppointment: {
          $cond: {
            if: { $and: [{ $ne: ["$ipdObjectId", null] }, { $ne: ["$_ipdDoc", null] }] },
            then: {
              _id: "$_ipdDoc._id",
              ipdId: "$_ipdDoc.ipdId",
              receiptId: "$_ipdDoc.receiptId",
              admissionDate: "$_ipdDoc.admissionDate",
              status: "$_ipdDoc.status",
              procedurePrice: {
                $let: {
                  vars: {
                    matchedCharge: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: { $ifNull: ["$_ipdDoc.billingCharges", []] },
                            as: "c",
                            cond: {
                              $or: [
                                {
                                  $and: [
                                    { $eq: ["$$c.type", "procedure"] },
                                    { $eq: ["$$c.procedureId", "$procedureId"] }
                                  ]
                                },
                                {
                                  $and: [
                                    { $eq: ["$$c.type", "procedure_package"] },
                                    {
                                      $in: [
                                        "$procedureId",
                                        {
                                          $map: {
                                            input: { $ifNull: ["$$c.procedures", []] },
                                            as: "p",
                                            in: "$$p.procedureId"
                                          }
                                        }
                                      ]
                                    }
                                  ]
                                }
                              ]
                            }
                          }
                        },
                        0
                      ]
                    }
                  },
                  in: {
                    $cond: {
                      if: { $eq: ["$$matchedCharge.type", "procedure_package"] },
                      then: {
                        $let: {
                          vars: {
                            matchedProc: {
                              $arrayElemAt: [
                                {
                                  $filter: {
                                    input: { $ifNull: ["$$matchedCharge.procedures", []] },
                                    as: "p",
                                    cond: { $eq: ["$$p.procedureId", "$procedureId"] }
                                  }
                                },
                                0
                              ]
                            }
                          },
                          in: { $ifNull: ["$$matchedProc.price", 0] }
                        }
                      },
                      else: { $ifNull: ["$$matchedCharge.price", "$$matchedCharge.totalCharge", 0] }
                    }
                  }
                }
              },
              unitPrice: {
                $let: {
                  vars: {
                    matchedCharge: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: { $ifNull: ["$_ipdDoc.billingCharges", []] },
                            as: "c",
                            cond: {
                              $or: [
                                {
                                  $and: [
                                    { $eq: ["$$c.type", "procedure"] },
                                    { $eq: ["$$c.procedureId", "$procedureId"] }
                                  ]
                                },
                                {
                                  $and: [
                                    { $eq: ["$$c.type", "procedure_package"] },
                                    {
                                      $in: [
                                        "$procedureId",
                                        {
                                          $map: {
                                            input: { $ifNull: ["$$c.procedures", []] },
                                            as: "p",
                                            in: "$$p.procedureId"
                                          }
                                        }
                                      ]
                                    }
                                  ]
                                }
                              ]
                            }
                          }
                        },
                        0
                      ]
                    }
                  },
                  in: {
                    $cond: {
                      if: { $eq: ["$$matchedCharge.type", "procedure_package"] },
                      then: {
                        $let: {
                          vars: {
                            matchedProc: {
                              $arrayElemAt: [
                                {
                                  $filter: {
                                    input: { $ifNull: ["$$matchedCharge.procedures", []] },
                                    as: "p",
                                    cond: { $eq: ["$$p.procedureId", "$procedureId"] }
                                  }
                                },
                                0
                              ]
                            }
                          },
                          in: { $ifNull: ["$$matchedProc.price", 0] }
                        }
                      },
                      else: { $ifNull: ["$$matchedCharge.price", 0] }
                    }
                  }
                }
              },
              units: {
                $let: {
                  vars: {
                    matchedCharge: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: { $ifNull: ["$_ipdDoc.billingCharges", []] },
                            as: "c",
                            cond: {
                              $or: [
                                {
                                  $and: [
                                    { $eq: ["$$c.type", "procedure"] },
                                    { $eq: ["$$c.procedureId", "$procedureId"] }
                                  ]
                                },
                                {
                                  $and: [
                                    { $eq: ["$$c.type", "procedure_package"] },
                                    {
                                      $in: [
                                        "$procedureId",
                                        {
                                          $map: {
                                            input: { $ifNull: ["$$c.procedures", []] },
                                            as: "p",
                                            in: "$$p.procedureId"
                                          }
                                        }
                                      ]
                                    }
                                  ]
                                }
                              ]
                            }
                          }
                        },
                        0
                      ]
                    }
                  },
                  in: { $ifNull: ["$$matchedCharge.units", 1] }
                }
              },
              totalCharge: {
                $let: {
                  vars: {
                    matchedCharge: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: { $ifNull: ["$_ipdDoc.billingCharges", []] },
                            as: "c",
                            cond: {
                              $or: [
                                {
                                  $and: [
                                    { $eq: ["$$c.type", "procedure"] },
                                    { $eq: ["$$c.procedureId", "$procedureId"] }
                                  ]
                                },
                                {
                                  $and: [
                                    { $eq: ["$$c.type", "procedure_package"] },
                                    {
                                      $in: [
                                        "$procedureId",
                                        {
                                          $map: {
                                            input: { $ifNull: ["$$c.procedures", []] },
                                            as: "p",
                                            in: "$$p.procedureId"
                                          }
                                        }
                                      ]
                                    }
                                  ]
                                }
                              ]
                            }
                          }
                        },
                        0
                      ]
                    }
                  },
                  in: { $ifNull: ["$$matchedCharge.totalCharge", 0] }
                }
              },
              discount: "$_ipdDoc.discount",
              totalPrice: {
                $let: {
                  vars: {
                    matchedCharge: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: { $ifNull: ["$_ipdDoc.billingCharges", []] },
                            as: "c",
                            cond: {
                              $or: [
                                {
                                  $and: [
                                    { $eq: ["$$c.type", "procedure"] },
                                    { $eq: ["$$c.procedureId", "$procedureId"] }
                                  ]
                                },
                                {
                                  $and: [
                                    { $eq: ["$$c.type", "procedure_package"] },
                                    {
                                      $in: [
                                        "$procedureId",
                                        {
                                          $map: {
                                            input: { $ifNull: ["$$c.procedures", []] },
                                            as: "p",
                                            in: "$$p.procedureId"
                                          }
                                        }
                                      ]
                                    }
                                  ]
                                }
                              ]
                            }
                          }
                        },
                        0
                      ]
                    }
                  },
                  in: {
                    $cond: {
                      if: { $eq: ["$$matchedCharge.type", "procedure_package"] },
                      then: {
                        $let: {
                          vars: {
                            matchedProc: {
                              $arrayElemAt: [
                                {
                                  $filter: {
                                    input: { $ifNull: ["$$matchedCharge.procedures", []] },
                                    as: "p",
                                    cond: { $eq: ["$$p.procedureId", "$procedureId"] }
                                  }
                                },
                                0
                              ]
                            }
                          },
                          in: { $ifNull: ["$$matchedProc.price", 0] }
                        }
                      },
                      else: { $ifNull: ["$$matchedCharge.price", "$$matchedCharge.totalCharge", 0] }
                    }
                  }
                }
              },
              amountPaid: "$_ipdAmountPaid",
              paymentStatus: {
                $let: {
                  vars: {
                    finalAmt: { $ifNull: ["$_ipdDoc.totalPrice", 0] },
                    paid: "$_ipdAmountPaid"
                  },
                  in: {
                    $switch: {
                      branches: [
                        { case: { $lte: ["$$finalAmt", 0] }, then: "Paid" },
                        { case: { $gte: ["$$paid", "$$finalAmt"] }, then: "Paid" },
                        { case: { $gt: ["$$paid", 0] }, then: "Partially Paid" }
                      ],
                      default: "Unpaid"
                    }
                  }
                }
              }
            },
            else: null
          }
        }
      }
    },

    // Clean up temp fields
    {
      $project: {
        _ipdArr: 0,
        _ipdDoc: 0,
        _ipdTransactions: 0,
        _ipdAmountPaid: 0,
        ipdObjectId: 0
      }
    }
  ];
}

/**
 * Shared pipeline stages that lookup the daycare appointment and compute
 * amountPaid + paymentStatus from its transactions.
 * Must be appended AFTER the procedure lookup stage.
 */
function buildDaycareAppointmentStages(): any[] {
  return [
    // Convert daycareAppointmentId string → ObjectId
    {
      $addFields: {
        daycareAppointmentObjectId: {
          $cond: {
            if: {
              $and: [
                { $ne: ["$daycareAppointmentId", null] },
                { $ne: ["$daycareAppointmentId", ""] },
                { $regexMatch: { input: { $ifNull: ["$daycareAppointmentId", ""] }, regex: /^[0-9a-fA-F]{24}$/ } }
              ]
            },
            then: { $toObjectId: "$daycareAppointmentId" },
            else: null
          }
        }
      }
    },

    // Lookup daycare appointment
    {
      $lookup: {
        from: "daycareappointments",
        localField: "daycareAppointmentObjectId",
        foreignField: "_id",
        as: "_daycareArr",
        pipeline: [{ $match: { isDeleted: { $ne: true } } }]
      }
    },
    {
      $addFields: {
        _daycareDoc: { $arrayElemAt: ["$_daycareArr", 0] }
      }
    },

    // Lookup transactions for this daycare appointment to compute amountPaid
    {
      $lookup: {
        from: "hospitaltransactions",
        let: { apptId: { $toString: "$daycareAppointmentObjectId" } },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$visitId", "$$apptId"] },
                  { $in: ["$transactionType", ["Payment", "Advance", "Refund", "Adjustment"]] }
                ]
              }
            }
          },
          { $project: { transactionType: 1, amount: 1 } }
        ],
        as: "_daycareTransactions"
      }
    },

    // Compute amountPaid from transactions
    {
      $addFields: {
        _daycareAmountPaid: {
          $reduce: {
            input: "$_daycareTransactions",
            initialValue: 0,
            in: {
              $switch: {
                branches: [
                  { case: { $in: ["$$this.transactionType", ["Payment", "Advance"]] }, then: { $add: ["$$value", "$$this.amount"] } },
                  { case: { $eq: ["$$this.transactionType", "Refund"] }, then: { $subtract: ["$$value", "$$this.amount"] } },
                  { case: { $eq: ["$$this.transactionType", "Adjustment"] }, then: { $add: ["$$value", "$$this.amount"] } }
                ],
                default: "$$value"
              }
            }
          }
        }
      }
    },

    // Build the daycareAppointment object with pricing + payment info
    {
      $addFields: {
        daycareAppointment: {
          $cond: {
            if: { $and: [{ $ne: ["$daycareAppointmentObjectId", null] }, { $ne: ["$_daycareDoc", null] }] },
            then: {
              _id: "$_daycareDoc._id",
              daycareId: "$_daycareDoc.daycareId",
              appointmentId: "$_daycareDoc.appointmentId",
              receiptId: "$_daycareDoc.receiptId",
              appointmentDate: "$_daycareDoc.appointmentDate",
              status: "$_daycareDoc.status",
              daycareChargesType: "$_daycareDoc.daycareChargesType",
              daycareChargesRate: "$_daycareDoc.daycareChargesRate",
              daycareChargesHours: "$_daycareDoc.daycareChargesHours",
              daycareChargesTotal: "$_daycareDoc.daycareChargesTotal",
              // procedurePrice = price of this specific dialysis procedure in the daycare procedures list
              procedurePrice: {
                $let: {
                  vars: {
                    matchedProc: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: { $ifNull: ["$_daycareDoc.procedures", []] },
                            as: "p",
                            cond: { $eq: ["$$p.procedureId", "$procedureId"] }
                          }
                        },
                        0
                      ]
                    }
                  },
                  in: { $ifNull: ["$$matchedProc.price", 0] }
                }
              },
              doctorVisitCharges: "$_daycareDoc.doctorVisitCharges",
              doctorChargesAmount: "$_daycareDoc.doctorChargesAmount",
              discount: "$_daycareDoc.discount",
              totalPrice: {
                $let: {
                  vars: {
                    mp: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: { $ifNull: ["$_daycareDoc.procedures", []] },
                            as: "p",
                            cond: { $eq: ["$$p.procedureId", "$procedureId"] }
                          }
                        },
                        0
                      ]
                    }
                  },
                  in: { $ifNull: ["$$mp.price", 0] }
                }
              },
              amountPaid: "$_daycareAmountPaid",
              paymentStatus: {
                $let: {
                  vars: {
                    finalAmt: { $ifNull: ["$_daycareDoc.totalPrice", 0] },
                    paid: "$_daycareAmountPaid"
                  },
                  in: {
                    $switch: {
                      branches: [
                        { case: { $lte: ["$$finalAmt", 0] }, then: "Paid" },
                        { case: { $gte: ["$$paid", "$$finalAmt"] }, then: "Paid" },
                        { case: { $gt: ["$$paid", 0] }, then: "Partially Paid" }
                      ],
                      default: "Unpaid"
                    }
                  }
                }
              }
            },
            else: null
          }
        }
      }
    },

    // Clean up temp fields
    {
      $project: {
        _daycareArr: 0,
        _daycareDoc: 0,
        _daycareTransactions: 0,
        _daycareAmountPaid: 0,
        daycareAppointmentObjectId: 0
      }
    }
  ];
}

dialysisSessionSchema.statics = {
  async createDialysisSession(newSession: DialysisSession): Promise<DialysisSession> {
    // Check for duplicate sessionId (exclude soft deleted)
    const duplicateId = await this.findOne({ 
      sessionId: newSession.sessionId,
      isDeleted: { $ne: true }
    });
    if (duplicateId) {
      throw new APIError(
        409,
        "Dialysis Session Already Exists",
        `Dialysis session with ID '${newSession.sessionId}' already exists.`
      );
    }

    const session = await new this(newSession).save();
    return session.toObject();
  },

  async readDialysisSessions(query: any, search: any, skip: number, limit: number) {
    const pipeline: any[] = [
      { $match: { ...query, isDeleted: { $ne: true } } },
      
      // Lookup visit details
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
      {
        $lookup: {
          from: "hospitalvisits",
          localField: "visitObjectId",
          foreignField: "_id",
          as: "visit"
        }
      },
      { $unwind: { path: "$visit", preserveNullAndEmptyArrays: true } },
      
      // Lookup patient details
      {
        $addFields: {
          patientObjectId: { 
            $cond: {
              if: { $regexMatch: { input: "$patientId", regex: /^[0-9a-fA-F]{24}$/ } },
              then: { $toObjectId: "$patientId" },
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
          as: "patient"
        }
      },
      { $unwind: { path: "$patient", preserveNullAndEmptyArrays: true } },
      
      // Lookup procedure details
      {
        $addFields: {
          procedureObjectId: { 
            $cond: {
              if: { $regexMatch: { input: { $ifNull: ["$procedureId", ""] }, regex: /^[0-9a-fA-F]{24}$/ } },
              then: { $toObjectId: "$procedureId" },
              else: null
            }
          }
        }
      },
      {
        $lookup: {
          from: "hospitalprocedures",
          localField: "procedureObjectId",
          foreignField: "_id",
          as: "procedure"
        }
      },
      { $unwind: { path: "$procedure", preserveNullAndEmptyArrays: true } },

      // Lookup doctor details
      {
        $addFields: {
          doctorObjectId: {
            $cond: {
              if: {
                $and: [
                  { $ne: ["$doctorId", null] },
                  { $ne: ["$doctorId", ""] },
                  { $regexMatch: { input: { $ifNull: ["$doctorId", ""] }, regex: /^[0-9a-fA-F]{24}$/ } }
                ]
              },
              then: { $toObjectId: "$doctorId" },
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
          as: "doctor",
          pipeline: [{ $project: { name: 1, doctorId: 1, department: 1, designation: 1 } }]
        }
      },
      { $unwind: { path: "$doctor", preserveNullAndEmptyArrays: true } }
    ];
    
    // Add daycare appointment and IPD details with pricing and payment status
    pipeline.push(...buildDaycareAppointmentStages());
    pipeline.push(...buildIpdAppointmentStages());

    // Add search conditions — handle patient name search post-lookup
    if (search && Object.keys(search).length > 0) {
      const patientNameSearch = search._patientNameSearch;
      const cleanSearch = { ...search };
      delete cleanSearch._patientNameSearch;

      // Apply non-$or filters first (createdAt, status, etc.)
      const preOrSearch = { ...cleanSearch };
      delete preOrSearch.$or;
      if (Object.keys(preOrSearch).length > 0) {
        pipeline.push({ $match: preOrSearch });
      }

      // Build $or that includes patient.name
      if (patientNameSearch) {
        const orConditions: any[] = [
          { sessionId: { $regex: patientNameSearch, $options: "i" } },
          { "patient.name": { $regex: patientNameSearch, $options: "i" } },
          { "patient.mrd": { $regex: patientNameSearch, $options: "i" } },
        ];
        pipeline.push({ $match: { $or: orConditions } });
      } else if (cleanSearch.$or) {
        pipeline.push({ $match: { $or: cleanSearch.$or } });
      }
    }
    
    // Add sorting, pagination, and projection
    pipeline.push(
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      { $addFields: { dialysisSessionSource: "$source" } },
      {
        $project: {
          __v: 0,
          source: 0,
          visitObjectId: 0,
          patientObjectId: 0,
          procedureObjectId: 0,
          "visit.__v": 0,
          "patient.__v": 0,
          "patient.isDeleted": 0,
          "patient.deletedAt": 0,
          "patient.deletedBy": 0,
          "patient.aadharNo": 0,
          "patient.aadharS3Url": 0,
          "patient.ayushmanCardNo": 0,
          "patient.otherDocsS3Urls": 0,
          "patient.emergencyContacts": 0,
          "procedure.__v": 0
        }
      }
    );

    return await this.aggregate(pipeline);
  },

  async readDialysisSession(sessionId: string) {
    const pipeline: any[] = [
      { $match: { sessionId, isDeleted: { $ne: true } } },
      
      // Lookup visit details
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
      {
        $lookup: {
          from: "hospitalvisits",
          localField: "visitObjectId",
          foreignField: "_id",
          as: "visit"
        }
      },
      { $unwind: { path: "$visit", preserveNullAndEmptyArrays: true } },
      
      // Lookup patient details
      {
        $addFields: {
          patientObjectId: { 
            $cond: {
              if: { $regexMatch: { input: "$patientId", regex: /^[0-9a-fA-F]{24}$/ } },
              then: { $toObjectId: "$patientId" },
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
          as: "patient"
        }
      },
      { $unwind: { path: "$patient", preserveNullAndEmptyArrays: true } },
      
      // Lookup procedure details
      {
        $addFields: {
          procedureObjectId: { 
            $cond: {
              if: { $regexMatch: { input: { $ifNull: ["$procedureId", ""] }, regex: /^[0-9a-fA-F]{24}$/ } },
              then: { $toObjectId: "$procedureId" },
              else: null
            }
          }
        }
      },
      {
        $lookup: {
          from: "hospitalprocedures",
          localField: "procedureObjectId",
          foreignField: "_id",
          as: "procedure"
        }
      },
      { $unwind: { path: "$procedure", preserveNullAndEmptyArrays: true } },

      // Lookup doctor details
      {
        $addFields: {
          doctorObjectId: {
            $cond: {
              if: {
                $and: [
                  { $ne: ["$doctorId", null] },
                  { $ne: ["$doctorId", ""] },
                  { $regexMatch: { input: { $ifNull: ["$doctorId", ""] }, regex: /^[0-9a-fA-F]{24}$/ } }
                ]
              },
              then: { $toObjectId: "$doctorId" },
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
          as: "doctor",
          pipeline: [{ $project: { name: 1, doctorId: 1, department: 1, designation: 1 } }]
        }
      },
      { $unwind: { path: "$doctor", preserveNullAndEmptyArrays: true } },
    ];

    // Add daycare appointment and IPD details with pricing and payment status
    pipeline.push(...buildDaycareAppointmentStages());
    pipeline.push(...buildIpdAppointmentStages());

    pipeline.push(
      { $addFields: { dialysisSessionSource: "$source" } },
      {
        $project: {
          __v: 0,
          source: 0,
          visitObjectId: 0,
          patientObjectId: 0,
          procedureObjectId: 0,
          "visit.__v": 0,
          "patient.__v": 0,
          "patient.isDeleted": 0,
          "patient.deletedAt": 0,
          "patient.deletedBy": 0,
          "patient.aadharNo": 0,
          "patient.aadharS3Url": 0,
          "patient.ayushmanCardNo": 0,
          "patient.otherDocsS3Urls": 0,
          "patient.emergencyContacts": 0,
          "procedure.__v": 0
        }
      }
    );

    const sessions = await this.aggregate(pipeline);
    const session = sessions[0];
    
    if (!session) {
      throw new APIError(
        404,
        "Dialysis Session Not Found",
        `No dialysis session with ID '${sessionId}' found.`
      );
    }
    
    return session;
  },

  async readDialysisSessionById(id: string) {
    // Convert string ID to ObjectId for aggregation
    const mongoose = require('mongoose');
    let objectId;
    try {
      objectId = new mongoose.Types.ObjectId(id);
    } catch (err) {
      throw new APIError(
        400,
        "Invalid ID",
        `Invalid dialysis session ID format: '${id}'`
      );
    }

    const pipeline: any[] = [
      { $match: { _id: objectId, isDeleted: { $ne: true } } },
      
      // Lookup visit details
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
      {
        $lookup: {
          from: "hospitalvisits",
          localField: "visitObjectId",
          foreignField: "_id",
          as: "visit"
        }
      },
      { $unwind: { path: "$visit", preserveNullAndEmptyArrays: true } },
      
      // Lookup patient details
      {
        $addFields: {
          patientObjectId: { 
            $cond: {
              if: { $regexMatch: { input: "$patientId", regex: /^[0-9a-fA-F]{24}$/ } },
              then: { $toObjectId: "$patientId" },
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
          as: "patient"
        }
      },
      { $unwind: { path: "$patient", preserveNullAndEmptyArrays: true } },
      
      // Lookup procedure details
      {
        $addFields: {
          procedureObjectId: { 
            $cond: {
              if: { $regexMatch: { input: { $ifNull: ["$procedureId", ""] }, regex: /^[0-9a-fA-F]{24}$/ } },
              then: { $toObjectId: "$procedureId" },
              else: null
            }
          }
        }
      },
      {
        $lookup: {
          from: "hospitalprocedures",
          localField: "procedureObjectId",
          foreignField: "_id",
          as: "procedure"
        }
      },
      { $unwind: { path: "$procedure", preserveNullAndEmptyArrays: true } },
    ];

    // Add daycare appointment and IPD details with pricing and payment status
    pipeline.push(...buildDaycareAppointmentStages());
    pipeline.push(...buildIpdAppointmentStages());

    pipeline.push(
      { $addFields: { dialysisSessionSource: "$source" } },
      {
        $project: {
          __v: 0,
          source: 0,
          visitObjectId: 0,
          patientObjectId: 0,
          procedureObjectId: 0,
          "visit.__v": 0,
          "patient.__v": 0,
          "patient.isDeleted": 0,
          "patient.deletedAt": 0,
          "patient.deletedBy": 0,
          "patient.aadharNo": 0,
          "patient.aadharS3Url": 0,
          "patient.ayushmanCardNo": 0,
          "patient.otherDocsS3Urls": 0,
          "patient.emergencyContacts": 0,
          "procedure.__v": 0
        }
      }
    );

    const sessions = await this.aggregate(pipeline);
    const session = sessions[0];
    
    if (!session) {
      throw new APIError(
        404,
        "Dialysis Session Not Found",
        `No dialysis session with ID '${id}' found.`
      );
    }
    
    return session;
  },

  async updateDialysisSession(sessionId: string, updates: Partial<DialysisSession>): Promise<DialysisSession> {
    const updated = await this.findOneAndUpdate(
      { sessionId, isDeleted: { $ne: true } },
      { $set: updates },
      { new: true, runValidators: true }
    );
    
    if (!updated) {
      throw new APIError(
        404,
        "Dialysis Session Not Found",
        `No dialysis session with ID '${sessionId}' found.`
      );
    }
    
    return updated.toObject();
  },

  async deleteDialysisSession(sessionId: string, deletedBy?: string): Promise<void> {
    const updated = await this.findOneAndUpdate(
      { sessionId, isDeleted: { $ne: true } },
      { 
        $set: { 
          isDeleted: true, 
          deletedAt: new Date(),
          deletedBy: deletedBy || 'system'
        } 
      },
      { new: true }
    );
    
    if (!updated) {
      throw new APIError(
        404,
        "Dialysis Session Not Found",
        `No dialysis session with ID '${sessionId}' found.`
      );
    }
  },

  async restoreDialysisSession(sessionId: string): Promise<DialysisSession> {
    const restored = await this.findOneAndUpdate(
      { sessionId, isDeleted: true },
      { 
        $set: { 
          isDeleted: false,
          deletedAt: null,
          deletedBy: null
        }
      },
      { new: true }
    );
    
    if (!restored) {
      throw new APIError(
        404,
        "Dialysis Session Not Found",
        `No deleted dialysis session with ID '${sessionId}' found.`
      );
    }
    
    return restored.toObject();
  },

  async getSessionsByVisit(visitId: string, filter: any = {}) {
    const pipeline: any[] = [
      { $match: { visitId, isDeleted: { $ne: true }, ...filter } },
      
      // Lookup patient details
      {
        $addFields: {
          patientObjectId: { 
            $cond: {
              if: { $regexMatch: { input: "$patientId", regex: /^[0-9a-fA-F]{24}$/ } },
              then: { $toObjectId: "$patientId" },
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
          as: "patient"
        }
      },
      { $unwind: { path: "$patient", preserveNullAndEmptyArrays: true } },
      
      // Lookup procedure details
      {
        $addFields: {
          procedureObjectId: { 
            $cond: {
              if: { $regexMatch: { input: { $ifNull: ["$procedureId", ""] }, regex: /^[0-9a-fA-F]{24}$/ } },
              then: { $toObjectId: "$procedureId" },
              else: null
            }
          }
        }
      },
      {
        $lookup: {
          from: "hospitalprocedures",
          localField: "procedureObjectId",
          foreignField: "_id",
          as: "procedure"
        }
      },
      { $unwind: { path: "$procedure", preserveNullAndEmptyArrays: true } },
      
      { $sort: { createdAt: -1 } },
      
      { $addFields: { dialysisSessionSource: "$source" } },
      {
        $project: {
          __v: 0,
          source: 0,
          patientObjectId: 0,
          procedureObjectId: 0,
          "patient.__v": 0,
          "procedure.__v": 0
        }
      }
    ];

    return await this.aggregate(pipeline);
  },

  async getSessionsByPatient(patientId: string, skip: number, limit: number, filter: any = {}) {
    const pipeline: any[] = [
      { $match: { patientId, isDeleted: { $ne: true }, ...filter } },
      
      // Lookup visit details
      {
        $addFields: {
          visitObjectId: { 
            $cond: {
              if: { $regexMatch: { input: { $ifNull: ["$visitId", ""] }, regex: /^[0-9a-fA-F]{24}$/ } },
              then: { $toObjectId: "$visitId" },
              else: null
            }
          }
        }
      },
      {
        $lookup: {
          from: "hospitalvisits",
          localField: "visitObjectId",
          foreignField: "_id",
          as: "visit"
        }
      },
      { $unwind: { path: "$visit", preserveNullAndEmptyArrays: true } },
      
      // Lookup patient details
      {
        $addFields: {
          patientObjectId: { 
            $cond: {
              if: { $regexMatch: { input: "$patientId", regex: /^[0-9a-fA-F]{24}$/ } },
              then: { $toObjectId: "$patientId" },
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
          as: "patient"
        }
      },
      { $unwind: { path: "$patient", preserveNullAndEmptyArrays: true } },
      
      // Lookup procedure details
      {
        $addFields: {
          procedureObjectId: { 
            $cond: {
              if: { $regexMatch: { input: { $ifNull: ["$procedureId", ""] }, regex: /^[0-9a-fA-F]{24}$/ } },
              then: { $toObjectId: "$procedureId" },
              else: null
            }
          }
        }
      },
      {
        $lookup: {
          from: "hospitalprocedures",
          localField: "procedureObjectId",
          foreignField: "_id",
          as: "procedure"
        }
      },
      { $unwind: { path: "$procedure", preserveNullAndEmptyArrays: true } },

      // Lookup doctor details
      {
        $addFields: {
          doctorObjectId: {
            $cond: {
              if: {
                $and: [
                  { $ne: ["$doctorId", null] },
                  { $ne: ["$doctorId", ""] },
                  { $regexMatch: { input: { $ifNull: ["$doctorId", ""] }, regex: /^[0-9a-fA-F]{24}$/ } }
                ]
              },
              then: { $toObjectId: "$doctorId" },
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
          as: "doctor",
          pipeline: [{ $project: { name: 1, doctorId: 1, department: 1, designation: 1 } }]
        }
      },
      { $unwind: { path: "$doctor", preserveNullAndEmptyArrays: true } }
    ];

    // Add daycare appointment and IPD details with pricing and payment status
    pipeline.push(...buildDaycareAppointmentStages());
    pipeline.push(...buildIpdAppointmentStages());
    
    // Add sorting, pagination, and projection
    pipeline.push(
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      { $addFields: { dialysisSessionSource: "$source" } },
      {
        $project: {
          __v: 0,
          source: 0,
          visitObjectId: 0,
          patientObjectId: 0,
          procedureObjectId: 0,
          "visit.__v": 0,
          "patient.__v": 0,
          "patient.isDeleted": 0,
          "patient.deletedAt": 0,
          "patient.deletedBy": 0,
          "patient.aadharNo": 0,
          "patient.aadharS3Url": 0,
          "patient.ayushmanCardNo": 0,
          "patient.otherDocsS3Urls": 0,
          "patient.emergencyContacts": 0,
          "procedure.__v": 0
        }
      }
    );

    return await this.aggregate(pipeline);
  },

  async addMonitoringReading(sessionId: string, reading: MonitoringReading): Promise<DialysisSession> {
    const updated = await this.findOneAndUpdate(
      { sessionId, isDeleted: { $ne: true } },
      { $push: { monitoringReadings: reading } },
      { new: true, runValidators: true }
    );
    
    if (!updated) {
      throw new APIError(
        404,
        "Dialysis Session Not Found",
        `No dialysis session with ID '${sessionId}' found.`
      );
    }
    
    return updated.toObject();
  }
};

// Transform with .toObject to remove __v and properly serialize _id
if (!dialysisSessionSchema.options.toObject) dialysisSessionSchema.options.toObject = {};
dialysisSessionSchema.options.toObject.transform = (_doc: any, ret: any) => {
  const { __v, ...clean } = ret;
  if (clean._id && typeof clean._id === 'object') {
    clean._id = clean._id.toString();
  }
  if (clean.createdAt && clean.createdAt instanceof Date) {
    clean.createdAt = clean.createdAt.toISOString();
  }
  if (clean.updatedAt && clean.updatedAt instanceof Date) {
    clean.updatedAt = clean.updatedAt.toISOString();
  }
  return clean;
};

// When a dialysis session is linked to a daycare appointment with a past appointmentDate,
// align createdAt to that date so reporting reflects the actual appointment day.
dialysisSessionSchema.pre("save", function (next) {
  if (this.isNew && this.sessionDate) {
    const sessionDay = new Date(this.sessionDate);
    const today = new Date();
    const isSameDay =
      sessionDay.getUTCFullYear() === today.getUTCFullYear() &&
      sessionDay.getUTCMonth() === today.getUTCMonth() &&
      sessionDay.getUTCDate() === today.getUTCDate();
    if (!isSameDay) {
      (this as any).createdAt = sessionDay;
    }
  }
  next();
});

const DialysisSession = mongoose.model<DialysisSessionDoc, DialysisSessionModel>(
  "DialysisSession",
  dialysisSessionSchema
);

export default DialysisSession;
