import mongoose from "mongoose";
import { WhatsappLogDoc, WhatsappLogModel } from "./whatsapp-log.types";

const Schema = mongoose.Schema;

const whatsappLogSchema = new Schema<WhatsappLogDoc>(
  {
    to:               { type: String, required: true, index: true },
    templateName:     { type: String, required: true, index: true },
    templateParams:   { type: Schema.Types.Mixed },
    context:          { type: String, required: true, index: true },
    referenceId:      { type: String, index: true },
    referenceType:    { type: String },
    patientId:        { type: String, index: true },
    patientName:      { type: String },
    patientPhone:     { type: String },
    status:           { type: String, enum: ["sent", "failed"], required: true, index: true },
    whatsappMessageId:{ type: String },
    failureReason:    { type: String },
  },
  { timestamps: true }
);

whatsappLogSchema.index({ createdAt: -1 });
whatsappLogSchema.index({ status: 1, createdAt: -1 });
whatsappLogSchema.index({ context: 1, status: 1 });

export default mongoose.model<WhatsappLogDoc, WhatsappLogModel>(
  "WhatsappLog",
  whatsappLogSchema
);
