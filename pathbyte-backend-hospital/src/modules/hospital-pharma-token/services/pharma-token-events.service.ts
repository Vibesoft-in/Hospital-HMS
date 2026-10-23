import { EventEmitter } from "events";
import { logger } from "@src/config/logger";

export interface PharmaTokenEventData {
  date: string;
  eventType: "token-created" | "status-change" | "queue-refresh";
  token?: any;
  queue?: any[];
  summary?: { total: number; created: number; inProgress: number; payNow: number; completed: number; cancelled: number };
}

class PharmaTokenEventsService extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100);
  }

  getEventKey(date: string): string {
    return `pharma:${date}`;
  }

  emitTokenCreated(date: string, token: any, queue: any[]) {
    const data: PharmaTokenEventData = {
      date,
      eventType: "token-created",
      token,
      queue,
      summary: this._buildSummary(queue),
    };
    const key = this.getEventKey(date);
    logger.info({ date, pharmaTokenId: token.pharmaTokenId, listeners: this.listenerCount(key) }, "Emitting pharma token-created event");
    this.emit(key, data);
  }

  emitStatusChange(date: string, token: any, queue: any[]) {
    const data: PharmaTokenEventData = {
      date,
      eventType: "status-change",
      token,
      queue,
      summary: this._buildSummary(queue),
    };
    const key = this.getEventKey(date);
    logger.info({ date, pharmaTokenId: token.pharmaTokenId, status: token.status, listeners: this.listenerCount(key) }, "Emitting pharma status-change event");
    this.emit(key, data);
  }

  private _buildSummary(queue: any[]) {
    return {
      total:      queue.length,
      created:    queue.filter((t) => t.status === "Created").length,
      inProgress: queue.filter((t) => t.status === "InProgress").length,
      payNow:     queue.filter((t) => t.status === "PayNow").length,
      completed:  queue.filter((t) => t.status === "Completed").length,
      cancelled:  queue.filter((t) => t.status === "Cancelled").length,
    };
  }
}

export default new PharmaTokenEventsService();
