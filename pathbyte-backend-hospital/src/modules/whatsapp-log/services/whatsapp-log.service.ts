import WhatsappLogModel from "../models/whatsapp-log.model";
import { WhatsappLog, WhatsappLogContext } from "../models/whatsapp-log.types";
import { logger } from "@src/config/logger";

export interface LogWhatsappParams {
  to: string;
  templateName: string;
  templateParams?: Record<string, any>;
  context: WhatsappLogContext;
  referenceId?: string;
  referenceType?: string;
  patientId?: string;
  patientName?: string;
  patientPhone?: string;
  status: "sent" | "failed";
  whatsappMessageId?: string;
  failureReason?: string;
}

class WhatsappLogService {
  /** Fire-and-forget — never throws */
  async log(params: LogWhatsappParams): Promise<void> {
    try {
      await WhatsappLogModel.create(params);
    } catch (err: any) {
      logger.warn({ error: err.message }, "Failed to write WhatsApp log — non-fatal");
    }
  }

  async getLogs(
    filter: any = {},
    skip: number = 0,
    limit: number = 20
  ): Promise<{ logs: WhatsappLog[]; totalCount: number }> {
    const [data, totalCount] = await Promise.all([
      WhatsappLogModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      WhatsappLogModel.countDocuments(filter),
    ]);
    return { logs: data as WhatsappLog[], totalCount };
  }

  async getStats(filter: any = {}): Promise<any> {
    return WhatsappLogModel.aggregate([
      { $match: filter },
      {
        $group: {
          _id: { context: "$context", status: "$status" },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: "$_id.context",
          sent:   { $sum: { $cond: [{ $eq: ["$_id.status", "sent"] },   "$count", 0] } },
          failed: { $sum: { $cond: [{ $eq: ["$_id.status", "failed"] }, "$count", 0] } },
          total:  { $sum: "$count" },
        },
      },
      { $sort: { _id: 1 } },
    ]);
  }
}

export default new WhatsappLogService();
