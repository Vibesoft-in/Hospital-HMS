export type RangeType = "daily" | "weekly" | "monthly" | "yearly";

export interface OverviewStats {
  doctors: { total: number; growthRate: string };
  patients: { total: number; growthRate: string };
  visits: { total: number; growthRate: string };
  revenue: { total: number; growthRate: string };
}

export interface VisitStatisticsSummary {
  all: number;
  scheduled: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  noShow: number;
}

export interface PeriodVisitBreakdown {
  period: string;
  date: string;
  scheduled: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  noShow: number;
  total: number;
}

export interface VisitStatistics {
  summary: VisitStatisticsSummary;
  periodData: PeriodVisitBreakdown[];
  range: RangeType;
}

export interface DaycareStatisticsSummary {
  all: number;
  scheduled: number;
  inProgress: number;
  completed: number;
  cancelled: number;
}

export interface PeriodDaycareBreakdown {
  period: string;
  date: string;
  scheduled: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  total: number;
}

export interface DaycareStatistics {
  summary: DaycareStatisticsSummary;
  periodData: PeriodDaycareBreakdown[];
  range: RangeType;
}

export interface RecentTransaction {
  transactionId: string;
  visitId: string;
  patientName: string;
  serviceName: string;
  amount: number;
  transactionType: string;
  paymentMode: string;
  transactionDate: Date;
}

export interface RecentVisit {
  visitId: string;
  doctorName: string;
  patientName: string;
  dateTime: Date;
  appointmentType: string;
  visitType: string;
  status: string;
}

export interface RevenueStatistics {
  summary: { total: number };
  periodData: { period: string; date: string; revenue: number }[];
  range: RangeType;
}
