import mongoose from "mongoose";
import { APIError } from "@src/shared";
import { XraySession, XraySessionDoc, XraySessionModel } from "./xray-session.types";

const Schema = mongoose.Schema;

// ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ patient lookup pipeline ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
function buildPatientLookupStages(): any[] {
  return [
    {
      $addFields: {
        _patientObjId: {
          $cond: {
            if: { $regexMatch: { input: { $ifNull: ["$patientId", ""] }, regex: /^[0-9a-fA-F]{24}$/ } },
            then: { $toObjectId: "$patientId" },
            else: null,
          },
        },
      },
    },
    {
      $lookup: {
        from: "hospitalpatients",
        localField: "_patientObjId",
        foreignField: "_id",
        as: "_patient",
        pipeline: [{ $project: { name: 1, mrd: 1, patientUhid: 1, phone: 1, gender: 1, age: 1, months: 1, days: 1, title: 1 } }],
      },
    },
    { $unwind: { path: "$_patient", preserveNullAndEmptyArrays: true } },
    { $addFields: { patient: { $ifNull: ["$_patient", null] } } },
    { $project: { _patientObjId: 0, _patient: 0, __v: 0 } },
  ];
}

// ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ procedure lookup pipeline ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
function buildProcedureLookupStages(): any[] {
  return [
    {
      $addFields: {
        _procedureObjId: {
          $cond: {
            if: {
              $and: [
                { $ne: ["$procedureId", null] },
                { $ne: ["$procedureId", ""] },
                { $regexMatch: { input: { $ifNull: ["$procedureId", ""] }, regex: /^[0-9a-fA-F]{24}$/ } },
              ],
            },
            then: { $toObjectId: "$procedureId" },
            else: null,
          },
        },
      },
    },
    {
      $lookup: {
        from: "hospitalprocedures",
        localField: "_procedureObjId",
        foreignField: "_id",
        as: "_procedure",
        pipeline: [{ $project: { __v: 0 } }],
      },
    },
    { $unwind: { path: "$_procedure", preserveNullAndEmptyArrays: true } },
    { $addFields: { procedure: { $ifNull: ["$_procedure", null] } } },
    { $project: { _procedureObjId: 0, _procedure: 0 } },
  ];
}

// --- daycare appointment lookup with billing ---
function buildDaycareAppointmentStages(): any[] {
  return [
    {
      $addFields: {
        daycareAppointmentObjectId: {
          $cond: {
            if: {
              $and: [
                { $ne: ["$daycareAppointmentId", null] },
                { $ne: ["$daycareAppointmentId", ""] },
                { $regexMatch: { input: { $ifNull: ["$daycareAppointmentId", ""] }, regex: /^[0-9a-fA-F]{24}$/ } },
              ],
            },
            then: { $toObjectId: "$daycareAppointmentId" },
            else: null,
          },
        },
      },
    },
    {
      $lookup: {
        from: "daycareappointments",
        localField: "daycareAppointmentObjectId",
        foreignField: "_id",
        as: "_daycareArr",
        pipeline: [{ $match: { isDeleted: { $ne: true } } }],
      },
    },
    { $addFields: { _daycareDoc: { $arrayElemAt: ["$_daycareArr", 0] } } },
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
                  { $in: ["$transactionType", ["Payment", "Advance", "Refund", "Adjustment"]] },
                ],
              },
            },
          },
          { $project: { transactionType: 1, amount: 1 } },
        ],
        as: "_daycareTransactions",
      },
    },
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
                  { case: { $eq: ["$$this.transactionType", "Adjustment"] }, then: { $add: ["$$value", "$$this.amount"] } },
                ],
                default: "$$value",
              },
            },
          },
        },
      },
    },
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
              procedurePrice: {
                $let: {
                  vars: {
                    matchedProc: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: { $ifNull: ["$_daycareDoc.procedures", []] },
                            as: "p",
                            cond: { $eq: ["$$p.procedureId", "$procedureId"] },
                          },
                        },
                        0,
                      ],
                    },
                  },
                  in: { $ifNull: ["$$matchedProc.price", 0] },
                },
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
                            cond: { $eq: ["$$p.procedureId", "$procedureId"] },
                          },
                        },
                        0,
                      ],
                    },
                  },
                  in: { $ifNull: ["$$mp.price", 0] },
                },
              },
              amountPaid: "$_daycareAmountPaid",
              paymentStatus: {
                $let: {
                  vars: {
                    finalAmt: { $ifNull: ["$_daycareDoc.totalPrice", 0] },
                    paid: "$_daycareAmountPaid",
                  },
                  in: {
                    $switch: {
                      branches: [
                        { case: { $lte: ["$$finalAmt", 0] }, then: "Paid" },
                        { case: { $gte: ["$$paid", "$$finalAmt"] }, then: "Paid" },
                        { case: { $gt: ["$$paid", 0] }, then: "Partially Paid" },
                      ],
                      default: "Unpaid",
                    },
                  },
                },
              },
            },
            else: null,
          },
        },
      },
    },
    {
      $project: {
        _daycareArr: 0,
        _daycareDoc: 0,
        _daycareTransactions: 0,
        _daycareAmountPaid: 0,
        daycareAppointmentObjectId: 0,
      },
    },
  ];
}

// IPD appointment lookup with billing --- with billing ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
function buildIpdAppointmentStages(): any[] {
  return [
    {
      $addFields: {
        ipdObjectId: {
          $cond: {
            if: {
              $and: [
                { $ne: ["$ipdId", null] },
                { $ne: ["$ipdId", ""] },
                { $regexMatch: { input: { $ifNull: ["$ipdId", ""] }, regex: /^[0-9a-fA-F]{24}$/ } },
              ],
            },
            then: { $toObjectId: "$ipdId" },
            else: null,
          },
        },
      },
    },
    {
      $lookup: {
        from: "hospitalipds",
        localField: "ipdObjectId",
        foreignField: "_id",
        as: "_ipdArr",
        pipeline: [{ $match: { isDeleted: { $ne: true } } }],
      },
    },
    { $addFields: { _ipdDoc: { $arrayElemAt: ["$_ipdArr", 0] } } },
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
                  { $in: ["$transactionType", ["Payment", "Advance", "Refund", "Adjustment"]] },
                ],
              },
            },
          },
          { $project: { transactionType: 1, amount: 1 } },
        ],
        as: "_ipdTransactions",
      },
    },
    {
      $addFields: {
        _ipdAmountPaid: {
          $reduce: {
            input: "$_ipdTransactions",
            initialValue: 0,
            in: {
              $switch: {
                branches: [
                  { case: { $in: ["$$this.transactionType", ["Payment", "Advance"]] }, then: { $add: ["$$value", "$$this.amount"] } },
                  { case: { $eq: ["$$this.transactionType", "Refund"] }, then: { $subtract: ["$$value", "$$this.amount"] } },
                  { case: { $eq: ["$$this.transactionType", "Adjustment"] }, then: { $add: ["$$value", "$$this.amount"] } },
                ],
                default: "$$value",
              },
            },
          },
        },
      },
    },
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
                              $and: [
                                { $eq: ["$$c.type", "procedure"] },
                                { $eq: ["$$c.procedureId", "$procedureId"] },
                              ],
                            },
                          },
                        },
                        0,
                      ],
                    },
                  },
                  in: { $ifNull: ["$$matchedCharge.totalCharge", 0] },
                },
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
                              $and: [
                                { $eq: ["$$c.type", "procedure"] },
                                { $eq: ["$$c.procedureId", "$procedureId"] },
                              ],
                            },
                          },
                        },
                        0,
                      ],
                    },
                  },
                  in: { $ifNull: ["$$matchedCharge.totalCharge", 0] },
                },
              },
              amountPaid: "$_ipdAmountPaid",
              paymentStatus: {
                $let: {
                  vars: {
                    finalAmt: { $ifNull: ["$_ipdDoc.totalPrice", 0] },
                    paid: "$_ipdAmountPaid",
                  },
                  in: {
                    $switch: {
                      branches: [
                        { case: { $lte: ["$$finalAmt", 0] }, then: "Paid" },
                        { case: { $gte: ["$$paid", "$$finalAmt"] }, then: "Paid" },
                        { case: { $gt: ["$$paid", 0] }, then: "Partially Paid" },
                      ],
                      default: "Unpaid",
                    },
                  },
                },
              },
            },
            else: null,
          },
        },
      },
    },
    {
      $project: {
        _ipdArr: 0,
        _ipdDoc: 0,
        _ipdTransactions: 0,
        _ipdAmountPaid: 0,
        ipdObjectId: 0,
      },
    },
  ];
}

// ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ date formatting addFields ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
const DATE_FORMAT_STAGES: any[] = [
  {
    $addFields: {
      _id: { $toString: "$_id" },
      createdAt: { $dateToString: { format: "%Y-%m-%dT%H:%M:%S.%LZ", date: "$createdAt" } },
      updatedAt: { $dateToString: { format: "%Y-%m-%dT%H:%M:%S.%LZ", date: "$updatedAt" } },
      reportDate: {
        $cond: {
          if: { $ne: ["$reportDate", null] },
          then: { $dateToString: { format: "%Y-%m-%dT%H:%M:%S.%LZ", date: "$reportDate" } },
          else: null,
        },
      },
    },
  },
];

// ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Schema ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
const xraySessionSchema = new Schema<XraySessionDoc>(
  {
    sessionId:    { type: String, required: true, unique: true },
    xrayTokenId:  { type: Number, index: true },        // Daily sequential token (per type)
    xrayTokenDisplay: { type: String, index: true },     // "X0001" or "U0001"
    tokenDate:    { type: String, index: true },         // YYYY-MM-DD
    isUltrasound: { type: Boolean, default: false },     // true = ultrasound (U prefix), false = xray (X prefix)
    visitId:      { type: String, index: true },
    patientId:    { type: String, required: true, index: true },
    procedureId:  { type: String, index: true },
    daycareAppointmentId: { type: String, index: true, default: null },
    ipdId:        { type: String, index: true, default: null },
    source: {
      type: String,
      enum: ["daycare", "ipd", "manual"],
      default: "manual",
      index: true,
    },
    bodyPart:        { type: String },
    projectionType:  { type: String },
    technique:       { type: String },
    contrast:        { type: String },
    radiologistName: { type: String },
    findings:        { type: String },
    impression:      { type: String },
    reportDate:      { type: Date },
    reportHtml:      { type: String },   // HTML report string from frontend
    docUrl:          { type: String },   // S3 key ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â stored as raw key, served as signed URL
    status: {
      type: String,
      enum: ["Pending", "In Progress", "Completed", "Cancelled"],
      default: "Pending",
    },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    deletedBy: { type: String },
  },
  { timestamps: true }
);

// Indexes
xraySessionSchema.index({ sessionId: 1 });
xraySessionSchema.index({ visitId: 1, createdAt: -1 });
xraySessionSchema.index({ patientId: 1, createdAt: -1 });
xraySessionSchema.index({ status: 1 });
xraySessionSchema.index({ isDeleted: 1 });
xraySessionSchema.index({ xrayTokenId: 1, tokenDate: 1 }, { sparse: true }); // unique per day when set

// ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ Statics ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬ÃƒÂ¢Ã¢â‚¬ÂÃ¢â€šÂ¬
xraySessionSchema.statics = {

  async createXraySession(newSession: XraySession): Promise<XraySession> {
    // Assign daily token if tokenDate is provided, scoped by session type (ultrasound vs xray)
    if (newSession.tokenDate) {
      const isUltrasound = newSession.isUltrasound === true;
      const last = await this.findOne({ tokenDate: newSession.tokenDate, isUltrasound: isUltrasound ? true : { $ne: true } })
        .sort({ xrayTokenId: -1 })
        .select("xrayTokenId")
        .lean();
      const tokenNum = last ? (last as any).xrayTokenId + 1 : 1;
      newSession.xrayTokenId = tokenNum;
      const prefix = isUltrasound ? "U" : "X";
      newSession.xrayTokenDisplay = `${prefix}${String(tokenNum).padStart(2, "0")}`;
    }
    const session = await new this(newSession).save();
    return session.toObject();
  },

  async readXraySessions(query: any, search: any, skip: number, limit: number) {
    const patientNameSearch = search._patientNameSearch;
    const regularSearch = { ...search };
    delete regularSearch._patientNameSearch;
    const preMatchOr = regularSearch.$or;
    delete regularSearch.$or;

    const preMatch: any = { isDeleted: { $ne: true } };
    if (query && Object.keys(query).length > 0) Object.assign(preMatch, query);
    if (regularSearch && Object.keys(regularSearch).length > 0) Object.assign(preMatch, regularSearch);

    const pipeline: any[] = [
      { $match: preMatch },
      ...buildPatientLookupStages(),
    ];

    if (patientNameSearch) {
      const orConditions: any[] = [{ "patient.name": { $regex: patientNameSearch, $options: "i" } }];
      if (preMatchOr) orConditions.push(...preMatchOr);
      pipeline.push({ $match: { $or: orConditions } });
    } else if (preMatchOr) {
      pipeline.push({ $match: { $or: preMatchOr } });
    }

    pipeline.push({
      $facet: {
        data: [
          { $sort: { createdAt: -1 } },
          { $skip: skip },
          { $limit: limit },
          ...buildProcedureLookupStages(),
          ...buildDaycareAppointmentStages(),
          ...buildIpdAppointmentStages(),
          ...DATE_FORMAT_STAGES,
          {
            $addFields: {
              "patient._id": {
                $cond: { if: { $ne: ["$patient._id", null] }, then: { $toString: "$patient._id" }, else: null },
              },
            },
          },
        ],
        totalCount: [{ $count: "count" }],
      },
    });

    return this.aggregate(pipeline);
  },

  async readXraySession(sessionId: string) {
    const pipeline: any[] = [
      { $match: { sessionId, isDeleted: { $ne: true } } },
      ...buildPatientLookupStages(),
      ...buildProcedureLookupStages(),
      ...buildDaycareAppointmentStages(),
      ...buildIpdAppointmentStages(),
      ...DATE_FORMAT_STAGES,
    ];
    const results = await this.aggregate(pipeline);
    if (!results.length) {
      throw new APIError(404, "Xray Session Not Found", `No xray session with ID '${sessionId}' found.`);
    }
    return results[0];
  },

  async readXraySessionById(id: string) {
    const pipeline: any[] = [
      { $match: { _id: new mongoose.Types.ObjectId(id), isDeleted: { $ne: true } } },
      ...buildPatientLookupStages(),
      ...buildProcedureLookupStages(),
      ...buildDaycareAppointmentStages(),
      ...buildIpdAppointmentStages(),
      ...DATE_FORMAT_STAGES,
    ];
    const results = await this.aggregate(pipeline);
    if (!results.length) {
      throw new APIError(404, "Xray Session Not Found", `No xray session with ID '${id}' found.`);
    }
    return results[0];
  },

  // Returns all sessions for a date sorted by token number ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â used for queue display
  async readXrayTokenQueue(date: string) {
    const pipeline: any[] = [
      { $match: { tokenDate: date, isDeleted: { $ne: true } } },
      ...buildPatientLookupStages(),
      ...buildProcedureLookupStages(),
      ...buildDaycareAppointmentStages(),
      ...buildIpdAppointmentStages(),
      { $sort: { xrayTokenId: 1 } },
      ...DATE_FORMAT_STAGES,
      {
        $addFields: {
          "patient._id": {
            $cond: { if: { $ne: ["$patient._id", null] }, then: { $toString: "$patient._id" }, else: null },
          },
        },
      },
    ];
    return this.aggregate(pipeline);
  },

  async updateXraySession(sessionId: string, updates: Partial<XraySession>): Promise<XraySession> {
    if (updates.reportDate) updates.reportDate = new Date(updates.reportDate);
    const updated = await this.findOneAndUpdate(
      { sessionId, isDeleted: { $ne: true } },
      { $set: updates },
      { new: true, runValidators: true }
    );
    if (!updated) {
      throw new APIError(404, "Xray Session Not Found", `No xray session with ID '${sessionId}' found.`);
    }
    return updated.toObject();
  },

  async deleteXraySession(sessionId: string, deletedBy?: string): Promise<void> {
    const updated = await this.findOneAndUpdate(
      { sessionId, isDeleted: { $ne: true } },
      { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: deletedBy || null } },
      { new: true }
    );
    if (!updated) {
      throw new APIError(404, "Xray Session Not Found", `No xray session with ID '${sessionId}' found.`);
    }
  },

  async getSessionsByVisit(visitId: string): Promise<any[]> {
    const pipeline: any[] = [
      { $match: { visitId, isDeleted: { $ne: true } } },
      ...buildPatientLookupStages(),
      { $sort: { createdAt: -1 } },
      ...DATE_FORMAT_STAGES,
    ];
    return this.aggregate(pipeline);
  },

  async getSessionsByPatient(patientId: string, skip: number, limit: number): Promise<any> {
    const pipeline: any[] = [
      { $match: { patientId, isDeleted: { $ne: true } } },
      ...buildProcedureLookupStages(),
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      ...DATE_FORMAT_STAGES,
    ];
    return this.aggregate(pipeline);
  },
};


// When a xray session is linked to a daycare appointment with a past tokenDate,
// align createdAt to that date so reporting reflects the actual appointment day.
xraySessionSchema.pre("save", function (next) {
  if (this.isNew && this.tokenDate) {
    const tokenDay = new Date(this.tokenDate);
    const today = new Date();
    const isSameDay =
      tokenDay.getUTCFullYear() === today.getUTCFullYear() &&
      tokenDay.getUTCMonth() === today.getUTCMonth() &&
      tokenDay.getUTCDate() === today.getUTCDate();
    if (!isSameDay) {
      (this as any).createdAt = tokenDay;
    }
  }
  next();
});

export default mongoose.model<XraySessionDoc, XraySessionModel>("XraySession", xraySessionSchema);
