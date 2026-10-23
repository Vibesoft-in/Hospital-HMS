import mongoose from "mongoose";
import { APIError } from "@src/shared";
import { HospitalIPD, HospitalIPDDoc, HospitalIPDModel } from "./hospital-ipd.types";

const Schema = mongoose.Schema;

// Flexible billing charge sub-schema — discriminated by `type`
const billingChargeSchema = new Schema(
  {
    chargeId: { type: String, required: true },
    type: { type: String, required: true, enum: ["procedure", "procedure_package", "doctor", "test", "bed", "nursing"] },
    // common quantity fields
    units: { type: Number, default: 1, min: 1 },
    totalCharge: { type: Number, default: 0 },
    // procedure fields
    procedureId: { type: String },
    procedureName: { type: String },
    procedureCategory: { type: String },
    price: { type: Number },
    isDialysis: { type: Boolean },
    isPackage: { type: Boolean, default: false },
    dialysisSessionId: { type: String, default: null },
    dialysisSessionIds: { type: [String], default: [] },
    isXray: { type: Boolean },
    isUltrasound: { type: Boolean, default: false },
    xraySessionId: { type: String, default: null },
    // procedure_package fields
    packageId: { type: String },
    packageName: { type: String },
    procedures: { type: Schema.Types.Mixed },
    packageTotal: { type: Number },
    // doctor fields
    doctorId: { type: String },
    doctorName: { type: String },
    charge: { type: Number },
    // test fields
    caseId: { type: String },
    caseReadableId: { type: String },
    totalAmount: { type: Number },
    // bed fields
    bedId: { type: String },      // the specific bed (traceability)
    bedNumber: { type: String },  // snapshot of bed number
    wardId: { type: String },
    wardName: { type: String },
    chargePerDay: { type: Number },
    fromDate: { type: Date },
    toDate: { type: Date },
    // nursing fields
    nursingChargePerDay: { type: Number },
    // common
    addedAt: { type: Date, default: () => new Date() },
    isCompleted: { type: Boolean, default: false },
  },
  { _id: false }
);

const dischargeMedicineSchema = new Schema(
  {
    medicineName: { type: String, required: true },
    type:         { type: String },
    duration:     { type: String },
    dosage:       { type: String },
    instructions: { type: String },
  },
  { _id: false }
);

const dischargeDiagnosisSchema = new Schema(
  {
    icdCode:       { type: String },
    diagnosisName: { type: String, required: true },
  },
  { _id: false }
);

const dischargeSummarySchema = new Schema(
  {
    dischargeType:          { type: String, enum: ["Normal", "LAMA", "DOR", "Death", "Refer"], default: null },
    dischargeDate:          { type: Date, default: null },
    clinicalSummary:        { type: String },
    provisionalDiagnosis:   { type: [dischargeDiagnosisSchema], default: [] },
    finalDiagnosis:         { type: [dischargeDiagnosisSchema], default: [] },
    courseInHospital:       { type: String },
    treatmentGiven:         { type: String },
    conditionOnDischarge:   { type: String },
    medicinesOnDischarge:   { type: [dischargeMedicineSchema], default: [] },
    adviceOnDischarge:      { type: [String], default: [] },
    followUp:               { type: String },
    // DOR fields
    dorRequestedBy:         { type: String },
    dorReason:              { type: String },
    // LAMA fields
    lamaReason:             { type: String },
    // Death fields
    deathDateTime:          { type: Date },
    deathCause:             { type: String },
    // Refer fields
    referHospitalName:      { type: String },
    referReason:            { type: String },
    // Vitals at discharge
    allergies:              { type: String },
    dischargeBp:            { type: String },
    dischargePulse:         { type: String },
    dischargeSpO2:          { type: String },
    dischargeTemp:          { type: String },
    summaryStatus:          { type: String, enum: ["Draft", "Finalized"], default: "Draft" },
    finalizedAt:            { type: Date },
    finalizedBy:            { type: String },
  },
  { _id: false }
);

const hospitalIPDSchema = new Schema<HospitalIPDDoc>(
  {
    ipdId: { type: String, required: true, unique: true },
    patientId: { type: String, required: true },
    doctorId: { type: String, required: true },
    bedId: { type: String, default: null },
    visitId: { type: String, default: null },
    admissionDate: { type: Date, required: true },
    isDischarge: { type: Boolean, default: false },
    reason: { type: String },
    notes: { type: String },
    allowBedCharges: { type: Boolean, default: true },
    allowNursingCharges: { type: Boolean, default: true },
    dischargeSummary: { type: dischargeSummarySchema, default: null },
    billingCharges: { type: [billingChargeSchema], default: [] },
    subtotal: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    discountAuthorizedAt: { type: Date },
    totalPrice: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["Admitted", "Discharged", "LAMA", "DOR", "Death", "Refer", "Cancelled"],
      default: "Admitted",
    },
    dischargeType: {
      type: String,
      enum: ["Normal", "LAMA", "DOR", "Death", "Refer"],
      default: null,
    },
    isMLC: { type: Boolean, default: false },
    mlc: {
      type: new Schema(
        {
          markOfIdentification: { type: String },
          thanaName: { type: String },
          patientBroughtBy: { type: String },
          placeOfAccident: { type: String },
          documentUrl: { type: String },   // S3 key — served as signed URL on read
        },
        { _id: false }
      ),
      default: null,
    },
    receiptId: { type: String, unique: true, sparse: true },
    createdBy: { type: String },
    paymentNotCleared: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    deletedBy: { type: String },
  },
  { timestamps: true }
);

hospitalIPDSchema.index({ isDeleted: 1 });
hospitalIPDSchema.index({ patientId: 1, admissionDate: -1 });
hospitalIPDSchema.index({ doctorId: 1, admissionDate: -1 });
hospitalIPDSchema.index({ ipdId: 1 });
hospitalIPDSchema.index({ bedId: 1 });
hospitalIPDSchema.index({ status: 1 });
hospitalIPDSchema.index({ paymentNotCleared: 1 });

// ── Shared population pipeline stages ────────────────────────────────────

function buildIPDPopulatePipeline(): any[] {
  return [
    // Patient
    {
      $addFields: {
        patientObjectId: {
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
        localField: "patientObjectId",
        foreignField: "_id",
        as: "patient",
        pipeline: [
          {
            $project: {
              name: 1, title: 1, phone: 1, mrd: 1, patientUhid: 1,
              email: 1, dob: 1, age: 1, months: 1, days: 1,
              gender: 1, bloodGroup: 1, address: 1,
              aadharNo: 1, aadharS3Url: 1,
              ayushmanCardNo: 1, ayushmanCardS3Url: 1,
              imageS3Url: 1, otherDocsS3Urls: 1,
              maritalStatus: 1, occupation: 1, drugSensitivity: 1,
              companyName: 1, division: 1,
              emergencyContacts: 1,
              pathlabPatientId: 1, isMRPatient: 1, abhaLinked: 1, abhaPatientId: 1,
            },
          },
        ],
      },
    },
    { $unwind: { path: "$patient", preserveNullAndEmptyArrays: true } },

    // Doctor
    {
      $addFields: {
        doctorObjectId: {
          $cond: {
            if: { $regexMatch: { input: { $ifNull: ["$doctorId", ""] }, regex: /^[0-9a-fA-F]{24}$/ } },
            then: { $toObjectId: "$doctorId" },
            else: null,
          },
        },
      },
    },
    {
      $lookup: {
        from: "hospitaldoctors",
        localField: "doctorObjectId",
        foreignField: "_id",
        as: "doctor",
        pipeline: [
          { $project: { name: 1, department: 1, designation: 1, phone: 1, doctorId: 1 } },
        ],
      },
    },
    { $unwind: { path: "$doctor", preserveNullAndEmptyArrays: true } },

    // Bed + Ward
    {
      $addFields: {
        bedObjectId: {
          $cond: {
            if: { $regexMatch: { input: { $ifNull: ["$bedId", ""] }, regex: /^[0-9a-fA-F]{24}$/ } },
            then: { $toObjectId: "$bedId" },
            else: null,
          },
        },
      },
    },
    {
      $lookup: {
        from: "hospitalbeds",
        localField: "bedObjectId",
        foreignField: "_id",
        as: "bed",
        pipeline: [
          {
            $lookup: {
              from: "hospitalwards",
              let: { wId: { $toObjectId: "$wardId" } },
              pipeline: [
                { $match: { $expr: { $eq: ["$_id", "$$wId"] }, isDeleted: { $ne: true } } },
                { $project: { wardId: 1, name: 1, chargePerDay: 1, nursingChargePerDay: 1 } },
              ],
              as: "ward",
            },
          },
          { $unwind: { path: "$ward", preserveNullAndEmptyArrays: true } },
          { $project: { bedId: 1, bedNumber: 1, wardId: 1, status: 1, chargePerDay: 1, ward: 1 } },
        ],
      },
    },
    { $unwind: { path: "$bed", preserveNullAndEmptyArrays: true } },

    // Visit (optional — when IPD was converted from a visit)
    {
      $addFields: {
        visitObjectId: {
          $cond: {
            if: { $regexMatch: { input: { $ifNull: ["$visitId", ""] }, regex: /^[0-9a-fA-F]{24}$/ } },
            then: { $toObjectId: "$visitId" },
            else: null,
          },
        },
      },
    },
    {
      $lookup: {
        from: "hospitalvisits",
        localField: "visitObjectId",
        foreignField: "_id",
        as: "visit",
        pipeline: [
          {
            $project: {
              visitId: 1, appointmentId: 1, visitType: 1, appointmentType: 1,
              visitDate: 1, visitTime: 1, status: 1, reason: 1,
            },
          },
        ],
      },
    },
    { $unwind: { path: "$visit", preserveNullAndEmptyArrays: true } },
  ];
}

hospitalIPDSchema.statics = {
  async createIPD(data: HospitalIPD): Promise<HospitalIPD> {
    const ipd = await new this(data).save();
    return ipd.toObject();
  },

  async readIPDs(query: any, search: any, skip: number, limit: number) {
    const patientNameSearch = search._patientNameSearch;
    const regularSearch = { ...search };
    delete regularSearch._patientNameSearch;
    const preMatchOr = regularSearch.$or;
    delete regularSearch.$or;

    const preMatchQuery: any = { isDeleted: { $ne: true }, ...query, ...regularSearch };

    const pipeline: any[] = [
      { $match: preMatchQuery },
      ...buildIPDPopulatePipeline(),
    ];

    if (patientNameSearch) {
      const orConditions: any[] = [
        { "patient.name": { $regex: patientNameSearch, $options: "i" } },
        { "patient.mrd": { $regex: patientNameSearch, $options: "i" } },
        { ipdId: { $regex: patientNameSearch, $options: "i" } },
      ];
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
          {
            $addFields: {
              _id: { $toString: "$_id" },
              "patient._id": { $toString: "$patient._id" },
              "doctor._id": { $toString: "$doctor._id" },
              "bed._id": { $cond: { if: { $ne: ["$bed", null] }, then: { $toString: "$bed._id" }, else: null } },
              "bed.ward._id": { $cond: { if: { $ne: ["$bed.ward", null] }, then: { $toString: "$bed.ward._id" }, else: null } },
              admissionDate: { $dateToString: { format: "%Y-%m-%d", date: "$admissionDate" } },
              createdAt: { $dateToString: { format: "%Y-%m-%dT%H:%M:%S.%LZ", date: "$createdAt" } },
              updatedAt: { $dateToString: { format: "%Y-%m-%dT%H:%M:%S.%LZ", date: "$updatedAt" } },
            },
          },
          { $project: { __v: 0, patientObjectId: 0, doctorObjectId: 0, bedObjectId: 0, visitObjectId: 0, "patient.__v": 0, "doctor.__v": 0, "bed.__v": 0, "bed.ward.__v": 0 } },
        ],
        totalCount: [{ $count: "count" }],
      },
    });

    const result = await this.aggregate(pipeline);
    return {
      data: result[0]?.data || [],
      totalCount: result[0]?.totalCount[0]?.count || 0,
    };
  },

  async readIPDsForPathlab(query: any, search: string, skip: number, limit: number) {
    const baseMatch: any = { isDeleted: { $ne: true }, ...query };

    const pipeline: any[] = [
      { $match: baseMatch },
      // Patient lookup — only the fields pathlab needs
      {
        $addFields: {
          patientObjectId: {
            $cond: {
              if: { $regexMatch: { input: { $ifNull: ["$patientId", ""] }, regex: /^[0-9a-fA-F]{24}$/ } },
              then: { $toObjectId: "$patientId" },
              else: null,
            },
          },
          doctorObjectId: {
            $cond: {
              if: { $regexMatch: { input: { $ifNull: ["$doctorId", ""] }, regex: /^[0-9a-fA-F]{24}$/ } },
              then: { $toObjectId: "$doctorId" },
              else: null,
            },
          },
        },
      },
      {
        $lookup: {
          from: "hospitalpatients",
          localField: "patientObjectId",
          foreignField: "_id",
          as: "patient",
          pipeline: [{ $project: { name: 1, mrd: 1, patientUhid: 1, phone: 1, gender: 1, age: 1 } }],
        },
      },
      { $unwind: { path: "$patient", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "hospitaldoctors",
          localField: "doctorObjectId",
          foreignField: "_id",
          as: "doctor",
          pipeline: [{ $project: { name: 1, department: 1 } }],
        },
      },
      { $unwind: { path: "$doctor", preserveNullAndEmptyArrays: true } },
    ];

    // Post-lookup search on patient name / mrd / ipdId
    if (search) {
      const searchRegex = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      pipeline.push({
        $match: {
          $or: [
            { "patient.name": { $regex: searchRegex, $options: "i" } },
            { "patient.mrd": { $regex: searchRegex, $options: "i" } },
            { ipdId: { $regex: searchRegex, $options: "i" } },
          ],
        },
      });
    }

    pipeline.push({
      $facet: {
        data: [
          { $sort: { admissionDate: -1 } },
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              _id: { $toString: "$_id" },
              ipdId: 1,
              status: 1,
              admissionDate: { $dateToString: { format: "%Y-%m-%d", date: "$admissionDate" } },
              isDischarge: 1,
              reason: 1,
              "patient._id": { $toString: "$patient._id" },
              "patient.name": 1,
              "patient.mrd": 1,
              "patient.phone": 1,
              "patient.gender": 1,
              "patient.age": 1,
              "doctor._id": { $toString: "$doctor._id" },
              "doctor.name": 1,
              "doctor.department": 1,
              createdAt: { $dateToString: { format: "%Y-%m-%dT%H:%M:%S.%LZ", date: "$createdAt" } },
            },
          },
        ],
        totalCount: [{ $count: "count" }],
      },
    });

    const result = await this.aggregate(pipeline);
    return {
      data: result[0]?.data || [],
      totalCount: result[0]?.totalCount[0]?.count || 0,
    };
  },

  async readIPDById(id: string) {
    const pipeline: any[] = [
      { $match: { _id: new mongoose.Types.ObjectId(id), isDeleted: { $ne: true } } },
      ...buildIPDPopulatePipeline(),
      // createdBy user
      {
        $addFields: {
          createdByObjectId: {
            $cond: {
              if: { $and: [{ $ne: ["$createdBy", null] }, { $regexMatch: { input: { $ifNull: ["$createdBy", ""] }, regex: /^[0-9a-fA-F]{24}$/ } }] },
              then: { $toObjectId: "$createdBy" },
              else: null,
            },
          },
        },
      },
      {
        $lookup: {
          from: "hospitalusers",
          localField: "createdByObjectId",
          foreignField: "_id",
          as: "createdByUser",
          pipeline: [{ $project: { name: 1, role: 1, username: 1 } }],
        },
      },
      { $unwind: { path: "$createdByUser", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          __v: 0,
          patientObjectId: 0,
          doctorObjectId: 0,
          bedObjectId: 0,
          visitObjectId: 0,
          createdByObjectId: 0,
          "patient.__v": 0,
          "doctor.__v": 0,
          "bed.__v": 0,
          "bed.ward.__v": 0,
          "createdByUser.__v": 0,
        },
      },
    ];

    const results = await this.aggregate(pipeline);
    const ipd = results[0];
    if (!ipd) throw new APIError(404, "IPD Not Found", `No IPD with ID '${id}' found.`);

    // Serialize
    if (ipd._id && typeof ipd._id === "object") ipd._id = ipd._id.toString();
    if (ipd.patient?._id && typeof ipd.patient._id === "object") ipd.patient._id = ipd.patient._id.toString();
    if (ipd.doctor?._id && typeof ipd.doctor._id === "object") ipd.doctor._id = ipd.doctor._id.toString();
    if (ipd.bed?._id && typeof ipd.bed._id === "object") ipd.bed._id = ipd.bed._id.toString();
    if (ipd.bed?.ward?._id && typeof ipd.bed.ward._id === "object") ipd.bed.ward._id = ipd.bed.ward._id.toString();
    if (ipd.createdByUser?._id && typeof ipd.createdByUser._id === "object") ipd.createdByUser._id = ipd.createdByUser._id.toString();
    if (ipd.visit?._id && typeof ipd.visit._id === "object") ipd.visit._id = ipd.visit._id.toString();
    if (ipd.admissionDate instanceof Date) ipd.admissionDate = ipd.admissionDate.toISOString().split("T")[0];
    if (ipd.dischargeSummary?.dischargeDate instanceof Date) {
      ipd.dischargeSummary.dischargeDate = ipd.dischargeSummary.dischargeDate.toISOString().split("T")[0];
    }
    if (ipd.dischargeSummary?.deathDateTime instanceof Date) {
      ipd.dischargeSummary.deathDateTime = ipd.dischargeSummary.deathDateTime.toISOString();
    }
    if (ipd.updatedAt instanceof Date) ipd.updatedAt = ipd.updatedAt.toISOString();

    return ipd;
  },

  async updateIPD(id: string, updates: Partial<HospitalIPD>): Promise<HospitalIPD> {
    const updated = await this.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true } },
      { $set: updates },
      { new: true }
    );
    if (!updated) throw new APIError(404, "IPD Not Found", `No IPD with ID '${id}' found.`);
    return updated.toObject();
  },

  async softDeleteIPD(id: string, deletedBy?: string): Promise<void> {
    const updated = await this.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true } },
      { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: deletedBy || "system" } },
      { new: true }
    );
    if (!updated) throw new APIError(404, "IPD Not Found", `No IPD with ID '${id}' found.`);
  },
};

if (!hospitalIPDSchema.options.toObject) hospitalIPDSchema.options.toObject = {};
hospitalIPDSchema.options.toObject.transform = (_doc: any, ret: any) => {
  const { __v, ...clean } = ret;
  if (clean._id && typeof clean._id === "object") clean._id = clean._id.toString();
  if (clean.admissionDate instanceof Date) clean.admissionDate = clean.admissionDate.toISOString().split("T")[0];
  if (clean.dischargeSummary?.dischargeDate instanceof Date) {
    clean.dischargeSummary.dischargeDate = clean.dischargeSummary.dischargeDate.toISOString().split("T")[0];
  }
  if (clean.dischargeSummary?.deathDateTime instanceof Date) {
    clean.dischargeSummary.deathDateTime = clean.dischargeSummary.deathDateTime.toISOString();
  }
  if (clean.createdAt instanceof Date) clean.createdAt = clean.createdAt.toISOString();
  if (clean.updatedAt instanceof Date) clean.updatedAt = clean.updatedAt.toISOString();
  return clean;
};

export default mongoose.model<HospitalIPDDoc, HospitalIPDModel>("HospitalIPD", hospitalIPDSchema);
