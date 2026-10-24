import mongoose, { Types } from "mongoose";
import { APIError } from "@src/shared";
import {
  DaycareAppointment,
  DaycareAppointmentDoc,
  DaycareAppointmentModel,
  DaycareProcedure,
} from "./daycare-appointment.types";

const Schema = mongoose.Schema;

const daycareProcedureSchema = new Schema({
  procedureId: { type: String, required: true },
  procedureName: { type: String, required: true },
  price: { type: Number, required: true },
  isDialysis: { type: Boolean, default: false },
  dialysisSessionId: { type: String, default: null },
  slotId: { type: String, default: null },
  sessionDate: { type: Date, default: null },
  isXray: { type: Boolean, default: false },
  isUltrasound: { type: Boolean, default: false },
  xraySessionId: { type: String, default: null },
}, { _id: false });

const daycareAppointmentSchema = new Schema<DaycareAppointmentDoc>(
  {
    daycareId: { type: String, required: true, unique: true },
    appointmentId: { type: String, required: true, unique: true },
    patientId: { type: String, required: true },
    doctorId: { type: String },
    
    // Daycare charges (optional)
    daycareChargesType: {
      type: String,
      enum: ["Private", "Semi-Private", "General", "Custom", "None"],
      required: false,
    },
    daycareChargesRate: { type: Number, required: false },
    daycareChargesHours: { type: Number, required: false, min: 0 },
    daycareChargesTotal: { type: Number, required: false, default: 0 },
    
    // Procedures
    procedures: { type: [daycareProcedureSchema], default: [] },
    procedureChargesTotal: { type: Number, default: 0 },
    
    // Doctor charges
    doctorVisitCharges: { type: Boolean, required: true, default: false },
    doctorChargesAmount: { type: Number, default: 0 },
    
    // Pricing
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    discountAuthorizedAt: { type: Date },
    totalPrice: { type: Number, required: true },
    
    // Appointment details
    appointmentDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ["Scheduled", "In Progress", "Completed", "Cancelled"],
      default: "Scheduled",
    },
    // Soft delete fields
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    deletedBy: { type: String }, // User ID who deleted the record
    receiptId: { type: String, unique: true, sparse: true }, // Unique receipt ID
  },
  { timestamps: true }
);

// Indexes
daycareAppointmentSchema.index({ isDeleted: 1 });
daycareAppointmentSchema.index({ patientId: 1, appointmentDate: -1 });
daycareAppointmentSchema.index({ doctorId: 1, appointmentDate: -1 });
daycareAppointmentSchema.index({ status: 1, appointmentDate: -1 });
daycareAppointmentSchema.index({ appointmentDate: -1 });

daycareAppointmentSchema.statics = {
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
        "A password is required to authorize discounts on day care appointments."
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
    const isValid = await comparePassword(discountPassword, (discountPasswordConstant as any).value as string);

    if (!isValid) {
      throw new APIError(
        401,
        "Invalid Discount Password",
        "The discount authorization password is incorrect."
      );
    }
  },

  async calculatePrice(
    daycareChargesType: string | undefined,
    daycareChargesHours: number | undefined,
    procedureIds: string[],
    doctorId: string | undefined,
    doctorVisitCharges: boolean,
    customDaycareRate?: number
  ): Promise<{
    daycareChargesRate?: number;
    daycareChargesTotal?: number;
    procedures: DaycareProcedure[];
    procedureChargesTotal: number;
    doctorChargesAmount: number;
    subtotal: number;
  }> {
    // Calculate daycare charges (optional)
    let daycareChargesRate: number | undefined;
    let daycareChargesTotal: number = 0;
    
    if (daycareChargesType && daycareChargesType !== "None") {
      if (daycareChargesType === "Custom") {
        if (!customDaycareRate || customDaycareRate <= 0) {
          throw new APIError(
            400,
            "Custom Rate Required",
            "A custom daycare rate must be provided when daycareChargesType is 'Custom'."
          );
        }
        // Custom: rate is the flat total; hours are optional (treated as 1 if omitted)
        daycareChargesRate = customDaycareRate;
        daycareChargesTotal = daycareChargesHours !== undefined
          ? customDaycareRate * daycareChargesHours
          : customDaycareRate;
      } else if (daycareChargesHours !== undefined) {
        const daycareRates: Record<string, number> = {
          "Private": 200,
          "Semi-Private": 150,
          "General": 100,
        };

        daycareChargesRate = daycareRates[daycareChargesType];
        if (!daycareChargesRate) {
          throw new APIError(
            400,
            "Invalid Daycare Charges Type",
            `Daycare charges type must be one of: Private, Semi-Private, General, Custom, None`
          );
        }

        daycareChargesTotal = daycareChargesRate * daycareChargesHours;
      }
    }
    
    // Calculate procedure charges
    let procedures: DaycareProcedure[] = [];
    let procedureChargesTotal = 0;
    
    if (procedureIds && procedureIds.length > 0) {
      const HospitalProcedure = mongoose.model("HospitalProcedure");
      const procedureDocs = await HospitalProcedure.find({
        _id: { $in: procedureIds.map(id => new Types.ObjectId(id)) },
        isDeleted: { $ne: true },
        status: "Active",
      });
      
      if (procedureDocs.length !== procedureIds.length) {
        throw new APIError(
          404,
          "Procedure Not Found",
          "One or more procedures not found or inactive"
        );
      }
      
      procedures = procedureDocs.map((proc: any) => ({
        procedureId: proc._id.toString(),
        procedureName: proc.procedureName,
        price: proc.price,
        isDialysis: proc.isDialysis || false,
        dialysisSessionId: null,
        isXray: proc.isXray || false,
        isUltrasound: proc.isUltrasound === true,
        xraySessionId: null,
      }));
      
      procedureChargesTotal = procedures.reduce((sum, proc) => sum + proc.price, 0);
    }
    
    // Calculate doctor charges
    let doctorChargesAmount = 0;
    if (doctorVisitCharges && doctorId) {
      const HospitalDoctor = mongoose.model("HospitalDoctor");
      const doctor = await HospitalDoctor.findById(doctorId);
      
      if (!doctor) {
        throw new APIError(
          404,
          "Doctor Not Found",
          `Doctor with ID '${doctorId}' not found`
        );
      }
      
      // Find charge for "Day Care" + "New" visit type
      const visitTypeCharge = (doctor as any).visitTypes?.find(
        (vt: any) => vt.visitType === "New" && vt.appointmentType === "Day Care"
      );
      
      if (visitTypeCharge) {
        doctorChargesAmount = visitTypeCharge.charge;
      } else {
        throw new APIError(
          400,
          "Doctor Charges Not Available",
          `Doctor does not have charges configured for Day Care - New visit type`
        );
      }
    }
    
    const subtotal = daycareChargesTotal + procedureChargesTotal + doctorChargesAmount;
    
    return {
      daycareChargesRate,
      daycareChargesTotal: daycareChargesTotal > 0 ? daycareChargesTotal : undefined,
      procedures,
      procedureChargesTotal,
      doctorChargesAmount,
      subtotal,
    };
  },

  async createDaycareAppointment(newAppointment: DaycareAppointment): Promise<DaycareAppointment> {
    const appointment = await new this(newAppointment).save();
    return appointment.toObject();
  },

  async readDaycareAppointments(query: any, search: any, skip: number, limit: number) {
    // Separate patient name search from regular filters
    const patientNameSearch = search._patientNameSearch;
    const regularSearch = { ...search };
    delete regularSearch._patientNameSearch;
    // Remove $or from pre-match (will be re-applied after lookup to include patient.name)
    const preMatchOr = regularSearch.$or;
    delete regularSearch.$or;

    const preMatchQuery: any = { isDeleted: { $ne: true } };
    if (query && Object.keys(query).length > 0) Object.assign(preMatchQuery, query);
    if (regularSearch && Object.keys(regularSearch).length > 0) Object.assign(preMatchQuery, regularSearch);

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

    // After lookup, apply $or that includes both appointment fields AND patient.name
    if (patientNameSearch) {
      const orConditions: any[] = [
        { "patient.name": { $regex: patientNameSearch, $options: "i" } },
        { "patient.mrd":  { $regex: patientNameSearch, $options: "i" } },
      ];
      if (preMatchOr) {
        orConditions.push(...preMatchOr);
      }
      pipeline.push({ $match: { $or: orConditions } });
    } else if (preMatchOr) {
      pipeline.push({ $match: { $or: preMatchOr } });
    }

    // Use $facet to get both data and total count in one query
    pipeline.push({
      $facet: {
        data: [
          { $sort: { appointmentDate: -1, createdAt: -1 } },
          { $skip: skip },
          { $limit: limit },
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
            $addFields: {
              _id: { $toString: "$_id" },
              "patient._id": { $toString: "$patient._id" },
              "createdByUser._id": {
                $cond: {
                  if: { $ne: ["$createdByUser._id", null] },
                  then: { $toString: "$createdByUser._id" },
                  else: null
                }
              },
              appointmentDate: { $dateToString: { format: "%Y-%m-%d", date: "$appointmentDate" } },
              createdAt: { $dateToString: { format: "%Y-%m-%dT%H:%M:%S.%LZ", date: "$createdAt" } },
              updatedAt: { $dateToString: { format: "%Y-%m-%dT%H:%M:%S.%LZ", date: "$updatedAt" } },
              discountAuthorizedAt: {
                $cond: {
                  if: { $ne: ["$discountAuthorizedAt", null] },
                  then: { $dateToString: { format: "%Y-%m-%dT%H:%M:%S.%LZ", date: "$discountAuthorizedAt" } },
                  else: null
                }
              }
            }
          },
          { $project: { __v: 0, patientObjectId: 0, createdByObjectId: 0, "patient.__v": 0, "createdByUser.__v": 0 } }
        ],
        totalCount: [
          { $count: "count" }
        ]
      }
    });

    const result = await this.aggregate(pipeline);
    return result;
  },

  async readDaycareAppointment(daycareId: string) {
    const appointment = await this.findOne({ daycareId, isDeleted: { $ne: true } });
    
    if (!appointment) {
      throw new APIError(
        404,
        "Appointment Not Found",
        `No day care appointment with ID '${daycareId}' found.`
      );
    }
    
    return appointment.toObject();
  },

  async readDaycareAppointmentById(id: string, filter: any = {}) {
    const appointment = await this.findOne({ _id: id, isDeleted: { $ne: true }, ...(filter || {}) });
    
    if (!appointment) {
      throw new APIError(
        404,
        "Appointment Not Found",
        `No day care appointment with ID '${id}' found.`
      );
    }
    
    return appointment.toObject();
  },

  async updateDaycareAppointment(
    daycareId: string,
    updates: Partial<DaycareAppointment>
  ): Promise<DaycareAppointment> {
    const updated = await this.findOneAndUpdate(
      { daycareId, isDeleted: { $ne: true } },
      { $set: updates },
      { new: true }
    );
    
    if (!updated) {
      throw new APIError(
        404,
        "Appointment Not Found",
        `No day care appointment with ID '${daycareId}' found.`
      );
    }
    
    return updated.toObject();
  },

  async updateDaycareAppointmentById(
    id: string,
    updates: Partial<DaycareAppointment>,
    filter: any = {}
  ): Promise<DaycareAppointment> {
    const updated = await this.findOneAndUpdate(
      { _id: id, isDeleted: { $ne: true }, ...(filter || {}) },
      { $set: updates },
      { new: true }
    );
    
    if (!updated) {
      throw new APIError(
        404,
        "Appointment Not Found",
        `No day care appointment with ID '${id}' found.`
      );
    }
    
    return updated.toObject();
  },

  async deleteDaycareAppointment(daycareId: string): Promise<void> {
    const deleted = await this.findOneAndDelete({ daycareId });
    
    if (!deleted) {
      throw new APIError(
        404,
        "Appointment Not Found",
        `No day care appointment with ID '${daycareId}' found.`
      );
    }
  },

  async deleteDaycareAppointmentById(id: string, filter: any = {}): Promise<void> {
    const deleted = await this.findOneAndDelete({ _id: id, ...(filter || {}) });
    
    if (!deleted) {
      throw new APIError(
        404,
        "Appointment Not Found",
        `No day care appointment with ID '${id}' found.`
      );
    }
  },

  async getAppointmentsByPatient(patientId: string): Promise<any[]> {
    const appointments = await this.find({ patientId, isDeleted: { $ne: true } })
      .sort({ appointmentDate: -1 })
      .exec();
    
    return appointments.map((appointment: DaycareAppointmentDoc) => appointment.toObject());
  },

  async getAppointmentsByDoctor(doctorId: string, date?: Date): Promise<any[]> {
    const query: any = { doctorId, isDeleted: { $ne: true } };
    
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      query.appointmentDate = {
        $gte: startOfDay,
        $lte: endOfDay,
      };
    }
    
    const appointments = await this.find(query)
      .sort({ appointmentDate: -1 })
      .exec();
    
    return appointments.map((appointment: DaycareAppointmentDoc) => appointment.toObject());
  },
};

// Transform with .toObject
if (!daycareAppointmentSchema.options.toObject) daycareAppointmentSchema.options.toObject = {};
daycareAppointmentSchema.options.toObject.transform = (_doc: any, ret: any) => {
  const { __v, ...clean } = ret;
  if (clean._id && typeof clean._id === 'object') {
    clean._id = clean._id.toString();
  }
  if (clean.appointmentDate && clean.appointmentDate instanceof Date) {
    clean.appointmentDate = clean.appointmentDate.toISOString().split('T')[0];
  }
  if (clean.createdAt && clean.createdAt instanceof Date) {
    clean.createdAt = clean.createdAt.toISOString();
  }
  if (clean.updatedAt && clean.updatedAt instanceof Date) {
    clean.updatedAt = clean.updatedAt.toISOString();
  }
  if (clean.discountAuthorizedAt && clean.discountAuthorizedAt instanceof Date) {
    clean.discountAuthorizedAt = clean.discountAuthorizedAt.toISOString();
  }
  return clean;
};

// When a daycare appointment is created with a past appointmentDate,
// align createdAt to that date so dashboard and reporting reflect the correct day.
daycareAppointmentSchema.pre("save", function (next) {
  if (this.isNew && this.appointmentDate) {
    const apptDay = new Date(this.appointmentDate);
    const today = new Date();
    const isSameDay =
      apptDay.getUTCFullYear() === today.getUTCFullYear() &&
      apptDay.getUTCMonth() === today.getUTCMonth() &&
      apptDay.getUTCDate() === today.getUTCDate();
    if (!isSameDay) {
      (this as any).createdAt = apptDay;
    }
  }
  next();
});

export default mongoose.model<DaycareAppointmentDoc, DaycareAppointmentModel>(
  "DaycareAppointment",
  daycareAppointmentSchema
);
