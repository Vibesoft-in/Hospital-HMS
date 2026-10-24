import HospitalPharmaTokenModel from "../models/hospital-pharma-token.model";
import { HospitalPharmaToken } from "../models/hospital-pharma-token.types";

// Get today's date in IST as YYYY-MM-DD
function getTodayIST(): string {
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  const y = ist.getUTCFullYear();
  const m = String(ist.getUTCMonth() + 1).padStart(2, "0");
  const d = String(ist.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

class HospitalPharmaTokenService {
  async createHospitalPharmaToken(input: {
    patientId: string;
    date?: string;
  }): Promise<HospitalPharmaToken> {
    const date = input.date || getTodayIST();
    return HospitalPharmaTokenModel.createHospitalPharmaToken({
      patientId: input.patientId,
      date,
      status: "Created",
    });
  }

  async getHospitalPharmaTokens(
    query: any = {},
    search: any = {},
    skip: number = 0,
    limit: number = 10
  ): Promise<{ tokens: any[]; totalCount: number }> {
    return HospitalPharmaTokenModel.readHospitalPharmaTokens(query, search, skip, limit);
  }

  async getHospitalPharmaTokenById(id: string, filter: any = {}): Promise<any> {
    return HospitalPharmaTokenModel.readHospitalPharmaToken(id, filter);
  }

  async getQueueForDate(date?: string): Promise<any[]> {
    const d = date || getTodayIST();
    return HospitalPharmaTokenModel.readHospitalPharmaTokenQueue(d);
  }

  async updateHospitalPharmaToken(
    id: string,
    updates: Partial<Pick<HospitalPharmaToken, "status">>,
    filter: any = {}
  ): Promise<HospitalPharmaToken> {
    return HospitalPharmaTokenModel.updateHospitalPharmaToken(id, updates, filter);
  }

  async deleteHospitalPharmaToken(id: string, deletedBy?: string, filter: any = {}): Promise<void> {
    return HospitalPharmaTokenModel.deleteHospitalPharmaToken(id, deletedBy, filter);
  }

  getTodayIST(): string {
    return getTodayIST();
  }
}

export default new HospitalPharmaTokenService();
