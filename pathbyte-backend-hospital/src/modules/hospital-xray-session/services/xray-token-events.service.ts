import { EventEmitter } from "events";
import { logger } from "@src/config/logger";

export interface XrayTokenEventData {
  date: string;
  eventType: "token-created" | "status-change" | "queue-refresh";
  token?: any;
  queue?: any[];
  summary?: { total: number; pending: number; inProgress: number; completed: number; cancelled: number };
}

class XrayTokenEventsService extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100);
  }

  getEventKey(date: string): string {
    return `xray:${date}`;
  }

  emitTokenCreated(date: string, token: any, queue: any[]) {
    const data: XrayTokenEventData = {
      date,
      eventType: "token-created",
      token,
      queue,
      summary: this._buildSummary(queue),
    };
    const key = this.getEventKey(date);
    logger.info({ date, xrayTokenId: token.xrayTokenId, listeners: this.listenerCount(key) }, "Emitting xray token-created event");
    this.emit(key, data);
  }

  emitStatusChange(date: string, token: any, queue: any[]) {
    const data: XrayTokenEventData = {
      date,
      eventType: "status-change",
      token,
      queue,
      summary: this._buildSummary(queue),
    };
    const key = this.getEventKey(date);
    logger.info({ date, xrayTokenId: token.xrayTokenId, status: token.status, listeners: this.listenerCount(key) }, "Emitting xray status-change event");
    this.emit(key, data);
  }

  private _buildSummary(queue: any[]) {
    return {
      total:      queue.length,
      pending:    queue.filter((t) => t.status === "Pending").length,
      inProgress: queue.filter((t) => t.status === "In Progress").length,
      completed:  queue.filter((t) => t.status === "Completed").length,
      cancelled:  queue.filter((t) => t.status === "Cancelled").length,
    };
  }
}

export default new XrayTokenEventsService();
