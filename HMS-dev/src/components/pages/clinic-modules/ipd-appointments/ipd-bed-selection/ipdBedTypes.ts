export type IpdBedStatus = "available" | "occupied" | "reserved" | "maintenance";

export interface IIpdBed {
  _id: string;
  bedCode: string;
  status: IpdBedStatus;
  patientName?: string;
  dayLabel?: string;
  patientMrdNo?: string;
}

export interface IIpdWard {
  _id: string;
  name: string;
  beds: IIpdBed[];
  chargePerDay?: number;
  nursingChargePerDay?: number;
}

export interface IIpdBedSummary {
  total: number;
  available: number;
  occupied: number;
  reserved: number;
  maintenance: number;
  occupancyPercent: number;
}

export interface IIpdBedBlockViewData {
  wards: IIpdWard[];
  summary: IIpdBedSummary;
}

export const computeBedSummary = (wards: IIpdWard[]): IIpdBedSummary => {
  const beds = wards.flatMap((w) => w.beds);
  const total = beds.length;
  const available = beds.filter((b) => b.status === "available").length;
  const occupied = beds.filter((b) => b.status === "occupied").length;
  const reserved = beds.filter((b) => b.status === "reserved").length;
  const maintenance = beds.filter((b) => b.status === "maintenance").length;
  const occupancyPercent =
    total > 0 ? Math.round(((occupied + reserved) / total) * 100) : 0;
  return { total, available, occupied, reserved, maintenance, occupancyPercent };
};

export const MOCK_IPD_BED_BLOCK_VIEW: IIpdBedBlockViewData = {
  wards: [
    {
      _id: "ward-a",
      name: "Ward A — General",
      beds: [
        { _id: "a-101", bedCode: "A-101", status: "available" },
        { _id: "a-102", bedCode: "A-102", status: "occupied", patientName: "Ramesh K.", patientMrdNo: "MRD-1001", dayLabel: "Day 3" },
        { _id: "a-103", bedCode: "A-103", status: "occupied", patientName: "Sunita M.", patientMrdNo: "MRD-1002", dayLabel: "Day 1" },
        { _id: "a-104", bedCode: "A-104", status: "maintenance" },
        { _id: "a-105", bedCode: "A-105", status: "reserved" },
      ],
    },
    {
      _id: "ward-b",
      name: "Ward B — Private",
      beds: [
        { _id: "b-201", bedCode: "B-201", status: "occupied", patientName: "Amit S.", patientMrdNo: "MRD-2001", dayLabel: "Day 5" },
        { _id: "b-202", bedCode: "B-202", status: "available" },
        { _id: "b-203", bedCode: "B-203", status: "available" },
      ],
    },
    {
      _id: "ward-icu",
      name: "ICU",
      beds: [
        { _id: "icu-01", bedCode: "ICU-01", status: "occupied", patientName: "Critical", patientMrdNo: "MRD-3001", dayLabel: "Day 2" },
        { _id: "icu-02", bedCode: "ICU-02", status: "occupied", patientName: "Post-op", patientMrdNo: "MRD-3002", dayLabel: "Day 1" },
        { _id: "icu-03", bedCode: "ICU-03", status: "available" },
      ],
    },
  ],
  summary: {
    total: 42,
    available: 18,
    occupied: 20,
    reserved: 2,
    maintenance: 2,
    occupancyPercent: 52,
  },
};

export const normalizeBedStatus = (raw: unknown): IpdBedStatus => {
  const s = String(raw ?? "").toLowerCase();
  if (s === "occupied") return "occupied";
  if (s === "reserved") return "reserved";
  if (s === "maintenance") return "maintenance";
  return "available";
};
