/**
 * Master Export Service
 * Produces two Excel exports:
 *   - detailed:    one row per record (OPD visit / Daycare / IPD) with billing info
 *   - summarized:  counts per time bucket (date or month) across all three types
 */
import mongoose from "mongoose";
import {
  ColDef,
  createHospitalWorkbook,
  addDataRow,
  addTotalsRow,
  applyNumFmt,
} from "@src/libs/utils/hospitalExportTemplate";
import { getHospitalConfig } from "@src/libs/utils/systemConfig";
import { sanitizeForCsv } from "@src/libs/utils/sanitizeForCsv";

// ── helpers ───────────────────────────────────────────────────────────────

/** Format a JS Date as "DD-Mon-YYYY" (e.g. 01-Sep-2026) */
function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }).replace(/ /g, "-");
}

/** Format a JS Date as "DD Mon" (e.g. 01 Sep) — used in range labels */
function fmtShort(d: Date): string {
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

/** Return start-of-day UTC-neutral date */
function startOf(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

/** Return end-of-day */
function endOf(d: Date): Date {
  const r = new Date(d);
  r.setHours(23, 59, 59, 999);
  return r;
}

/** Last day of a given month (0-indexed month) */
function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Month name e.g. "September 2026" */
function monthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

// ── filter helpers ────────────────────────────────────────────────────────

/** Build a Mongoose date range filter from from/to strings */
function dateRangeFilter(field: string, from?: string, to?: string): Record<string, any> {
  const filter: Record<string, any> = {};
  if (from || to) {
    filter[field] = {};
    if (from) filter[field].$gte = startOf(new Date(from));
    if (to)   filter[field].$lte = endOf(new Date(to));
  }
  return filter;
}

// ── summarized bucket logic ───────────────────────────────────────────────

interface SummaryBucket {
  label: string;
  from: Date;
  to: Date;
}

/**
 * Determine how to bucket the date range for the summarized export.
 *
 * Rules:
 *  - Multiple full months (1st → last day) → one bucket per month
 *  - Single full month                      → one bucket labelled "Month YYYY"
 *  - Anything else (partial / cross-month)  → single bucket with range label
 */
function buildSummaryBuckets(from: Date, to: Date): SummaryBucket[] {
  const fromY = from.getFullYear(), fromM = from.getMonth(), fromD = from.getDate();
  const toY   = to.getFullYear(),   toM   = to.getMonth(),   toD   = to.getDate();

  const sameMonth = fromY === toY && fromM === toM;

  if (sameMonth) {
    const isFullMonth = fromD === 1 && toD === lastDayOfMonth(toY, toM);
    const label = isFullMonth
      ? monthLabel(fromY, fromM)
      : `${fmtShort(from)} - ${fmtShort(to)} ${toY}`;
    return [{ label, from: startOf(from), to: endOf(to) }];
  }

  // Multiple months — check if every boundary aligns to month edges
  const fromIsMonthStart = fromD === 1;
  const toIsMonthEnd     = toD === lastDayOfMonth(toY, toM);

  if (fromIsMonthStart && toIsMonthEnd) {
    // Full-month breakdown
    const buckets: SummaryBucket[] = [];
    let cy = fromY, cm = fromM;
    while (cy < toY || (cy === toY && cm <= toM)) {
      const last = lastDayOfMonth(cy, cm);
      buckets.push({
        label: monthLabel(cy, cm),
        from:  startOf(new Date(cy, cm, 1)),
        to:    endOf(new Date(cy, cm, last)),
      });
      cm++;
      if (cm > 11) { cm = 0; cy++; }
    }
    return buckets;
  }

  // Mixed partial range — single row with range label
  const label = `${fmtShort(from)} - ${fmtShort(to)} ${toY}`;
  return [{ label, from: startOf(from), to: endOf(to) }];
}

// ── model accessors (lazy import to avoid circular deps) ─────────────────

async function getVisitModel() {
  return (await import("../hospital-visit/models/hospital-visit.model")).default;
}
async function getDaycareModel() {
  return (await import("../hospital-daycare-appointment/models/daycare-appointment.model")).default;
}
async function getIPDModel() {
  return (await import("../hospital-ipd/models/hospital-ipd.model")).default;
}
async function getPatientModel() {
  return (await import("../hospital-patient/models/hospital-patient.model")).default;
}
async function getTransactionModel() {
  const mod = await import("../hospital-transaction/models/hospital-transaction.model");
  return mod.default;
}

// ── total-paid helper ─────────────────────────────────────────────────────

async function getTotalPaid(recordObjectId: string): Promise<number> {
  const TxModel = await getTransactionModel();
  const txs = await TxModel.find({
    visitId: recordObjectId,
    isDeleted: { $ne: true },
  }).lean();

  return (txs as any[]).reduce((sum, t) => {
    const amt = t.amount ?? 0;
    if (t.transactionType === "Payment" || t.transactionType === "Advance") return sum + amt;
    if (t.transactionType === "Refund") return sum - amt;
    if (t.transactionType === "Adjustment") return sum + amt;
    return sum;
  }, 0);
}

// ── Detailed export columns ───────────────────────────────────────────────

const DETAILED_COLS: ColDef[] = [
  { key: "date",           width: 14, label: "Date",             align: "center" },
  { key: "srNo",           width:  7, label: "Sr No",            align: "center" },
  { key: "uhid",           width: 14, label: "UHID",             align: "center" },
  { key: "patientName",    width: 26, label: "Patient Name" },
  { key: "ageSex",         width: 12, label: "Age/Sex",          align: "center" },
  { key: "address",        width: 28, label: "Address" },
  { key: "mobile",         width: 15, label: "Mobile No.",       align: "center" },
  { key: "type",           width: 10, label: "Type",             align: "center" },
  { key: "consultant",     width: 26, label: "Consultant Name" },
  { key: "totalAmount",    width: 15, label: "Total Amount",     numFmt: "currency", align: "right" },
  { key: "totalPaid",      width: 13, label: "Total Paid",       numFmt: "currency", align: "right" },
  { key: "discount",       width: 12, label: "Discount",         numFmt: "currency", align: "right" },
];

// ── Summarized export columns ─────────────────────────────────────────────

const SUMMARY_COLS: ColDef[] = [
  { key: "srNo",    width:  7, label: "Sr No",    align: "center" },
  { key: "period",  width: 26, label: "Month/Date" },
  { key: "opd",     width: 12, label: "OPD",      align: "right" },
  { key: "daycare", width: 12, label: "Daycare",   align: "right" },
  { key: "ipd",     width: 12, label: "IPD",       align: "right" },
];

// ── ExportFilters (shared) ────────────────────────────────────────────────

export interface MasterExportFilters {
  from?: string;        // YYYY-MM-DD
  to?: string;          // YYYY-MM-DD
  doctorId?: string;    // MongoDB ObjectId string
  patientId?: string;   // MongoDB ObjectId string
  search?: string;      // free-text search on patient name / UHID
  status?: string;      // comma-separated statuses
  page?: number;        // 1-based page number (detailed export only)
  limit?: number;       // records per page, default 20000 (detailed export only)
  onlyData?: boolean;   // if true, return raw data instead of Excel buffer
}

// ── Data-only response shapes ─────────────────────────────────────────────

export interface DetailedRow {
  srNo:        number;
  date:        string;
  uhid:        string;
  patientName: string;
  ageSex:      string;
  address:     string;
  mobile:      string;
  type:        "OPD" | "Daycare" | "IPD";
  consultant:  string;
  totalAmount: number;
  totalPaid:   number;
  discount:    number;
}

export interface DetailedDataResult {
  rows:        DetailedRow[];
  totals: {
    totalAmount: number;
    totalPaid:   number;
    discount:    number;
    count:       number;
  };
  pagination: {
    page:  number;
    limit: number;
  };
}

export interface SummaryRow {
  srNo:    number;
  period:  string;
  opd:     number;
  daycare: number;
  ipd:     number;
}

export interface SummarizedDataResult {
  rows:   SummaryRow[];
  totals: {
    opd:     number;
    daycare: number;
    ipd:     number;
  };
}

// ─────────────────────────────────────────────────────────────────────────
// ── DETAILED EXPORT ───────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────

/** Core data builder — shared by Excel export and onlyData response */
async function buildDetailedRows(filters: MasterExportFilters): Promise<{
  rows: DetailedRow[];
  totals: DetailedDataResult["totals"];
  pagination: DetailedDataResult["pagination"];
}> {
  const { from, to, doctorId, patientId, search, status } = filters;

  const DEFAULT_LIMIT = 20000;
  const limit = filters.limit ?? DEFAULT_LIMIT;
  const page  = filters.page  ?? 1;
  const skip  = (page - 1) * limit;

  const PatientModel = await getPatientModel();
  const VisitModel   = await getVisitModel();
  const DaycareModel = await getDaycareModel();
  const IPDModel     = await getIPDModel();

  let searchPatientIds: string[] | null = null;
  if (search) {
    const matched = await PatientModel.find({
      isDeleted: { $ne: true },
      $or: [
        { name: { $regex: search, $options: "i" } },
        { mrd:  { $regex: search, $options: "i" } },
      ],
    }).select("_id").lean();
    searchPatientIds = (matched as any[]).map((p) => p._id.toString());
  }

  const statusList = status ? status.split(",").map((s) => s.trim()) : null;

  const visitQuery: Record<string, any>   = { isDeleted: { $ne: true } };
  const daycareQuery: Record<string, any> = { isDeleted: { $ne: true } };
  const ipdQuery: Record<string, any>     = { isDeleted: { $ne: true } };

  Object.assign(visitQuery,   dateRangeFilter("visitDate",       from, to));
  Object.assign(daycareQuery, dateRangeFilter("appointmentDate", from, to));
  Object.assign(ipdQuery,     dateRangeFilter("admissionDate",   from, to));

  if (doctorId) {
    visitQuery.doctorId   = doctorId;
    daycareQuery.doctorId = doctorId;
    ipdQuery.doctorId     = doctorId;
  }

  if (patientId) {
    visitQuery.patientId   = patientId;
    daycareQuery.patientId = patientId;
    ipdQuery.patientId     = patientId;
  }

  if (searchPatientIds !== null) {
    visitQuery.patientId   = { $in: searchPatientIds };
    daycareQuery.patientId = { $in: searchPatientIds };
    ipdQuery.patientId     = { $in: searchPatientIds };
  }

  if (statusList) {
    visitQuery.status   = { $in: statusList };
    daycareQuery.status = { $in: statusList };
    ipdQuery.status     = { $in: statusList };
  }

  const [visits, daycares, ipds] = await Promise.all([
    VisitModel.find(visitQuery).skip(skip).limit(limit).lean(),
    DaycareModel.find(daycareQuery).skip(skip).limit(limit).lean(),
    IPDModel.find(ipdQuery).skip(skip).limit(limit).lean(),
  ]);

  const allPatientIds = new Set<string>();
  const allDoctorIds  = new Set<string>();

  for (const v of visits as any[]) {
    if (v.patientId) allPatientIds.add(v.patientId);
    if (v.doctorId)  allDoctorIds.add(v.doctorId);
  }
  for (const d of daycares as any[]) {
    if (d.patientId) allPatientIds.add(d.patientId);
    if (d.doctorId)  allDoctorIds.add(d.doctorId);
  }
  for (const i of ipds as any[]) {
    if (i.patientId) allPatientIds.add(i.patientId);
    if (i.doctorId)  allDoctorIds.add(i.doctorId);
  }

  const HospitalDoctorModel = (await import("../hospital-doctor/models/hospital-doctor.model")).default;

  const [patientDocs, doctorDocs] = await Promise.all([
    PatientModel.find({ _id: { $in: Array.from(allPatientIds).map((id) => new mongoose.Types.ObjectId(id)) } })
      .select("_id name mrd age months days gender address phone")
      .lean(),
    HospitalDoctorModel.find({ _id: { $in: Array.from(allDoctorIds).map((id) => new mongoose.Types.ObjectId(id)) } })
      .select("_id name")
      .lean(),
  ]);

  const patientMap = new Map<string, any>();
  for (const p of patientDocs as any[]) patientMap.set(p._id.toString(), p);

  const doctorMap = new Map<string, any>();
  for (const d of doctorDocs as any[]) doctorMap.set(d._id.toString(), d);

  interface InternalRow {
    date: Date;
    type: "OPD" | "Daycare" | "IPD";
    objectId: string;
    patientId: string;
    doctorId?: string;
    totalPrice: number;
    discount: number;
  }

  const internalRows: InternalRow[] = [];

  for (const v of visits as any[]) {
    internalRows.push({
      date: new Date(v.visitDate),
      type: "OPD",
      objectId: v._id.toString(),
      patientId: v.patientId,
      doctorId: v.doctorId,
      totalPrice: v.totalPrice ?? v.price ?? 0,
      discount: v.discount ?? 0,
    });
  }
  for (const d of daycares as any[]) {
    internalRows.push({
      date: new Date(d.appointmentDate),
      type: "Daycare",
      objectId: d._id.toString(),
      patientId: d.patientId,
      doctorId: d.doctorId,
      totalPrice: d.totalPrice ?? 0,
      discount: d.discount ?? 0,
    });
  }
  for (const i of ipds as any[]) {
    internalRows.push({
      date: new Date(i.admissionDate),
      type: "IPD",
      objectId: i._id.toString(),
      patientId: i.patientId,
      doctorId: i.doctorId,
      totalPrice: i.totalPrice ?? 0,
      discount: i.discount ?? 0,
    });
  }

  internalRows.sort((a, b) => a.date.getTime() - b.date.getTime());

  const totalPaidArr = await Promise.all(internalRows.map((r) => getTotalPaid(r.objectId)));

  let grandTotalAmount = 0;
  let grandTotalPaid   = 0;
  let grandDiscount    = 0;

  const rows: DetailedRow[] = internalRows.map((row, i) => {
    const paid    = totalPaidArr[i];
    const patient = patientMap.get(row.patientId);
    const doctor  = row.doctorId ? doctorMap.get(row.doctorId) : null;

    const age    = patient?.age    ?? "";
    const gender = patient?.gender ?? "";
    const ageSex = age !== "" ? `${age}/${gender ? gender[0] : ""}` : (gender ? `/${gender[0]}` : "");

    grandTotalAmount += row.totalPrice;
    grandTotalPaid   += paid;
    grandDiscount    += row.discount;

    return {
      srNo:        i + 1,
      date:        fmtDate(row.date),
      uhid:        sanitizeForCsv(patient?.mrd ?? ""),
      patientName: sanitizeForCsv(patient?.name ?? ""),
      ageSex,
      address:     sanitizeForCsv(patient?.address ?? ""),
      mobile:      sanitizeForCsv(patient?.phone ?? ""),
      type:        row.type,
      consultant:  sanitizeForCsv(doctor?.name ?? ""),
      totalAmount: row.totalPrice,
      totalPaid:   paid,
      discount:    row.discount,
    };
  });

  return {
    rows,
    totals: {
      totalAmount: grandTotalAmount,
      totalPaid:   grandTotalPaid,
      discount:    grandDiscount,
      count:       rows.length,
    },
    pagination: { page, limit },
  };
}

export async function buildDetailedExport(filters: MasterExportFilters): Promise<Buffer> {
  const { from, to } = filters;
  const { rows, totals } = await buildDetailedRows(filters);

  const hospitalName = getHospitalConfig().hospitalName;
  const { workbook, ws, DATA_START } = createHospitalWorkbook(
    "Detailed Export", DETAILED_COLS, hospitalName, { from, to }
  );

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    addDataRow(ws, DETAILED_COLS, r, i, DATA_START);
  }

  const totalsRow = DATA_START + rows.length;
  addTotalsRow(ws, DETAILED_COLS, {
    date:        "",
    srNo:        "",
    uhid:        "",
    patientName: "TOTAL",
    ageSex:      "",
    address:     "",
    mobile:      `${totals.count} records`,
    type:        "",
    consultant:  "",
    totalAmount: totals.totalAmount,
    totalPaid:   totals.totalPaid,
    discount:    totals.discount,
  }, totalsRow);

  applyNumFmt(ws, DETAILED_COLS);

  return workbook.xlsx.writeBuffer() as unknown as Promise<Buffer>;
}

export async function buildDetailedData(filters: MasterExportFilters): Promise<DetailedDataResult> {
  return buildDetailedRows(filters);
}

// ─────────────────────────────────────────────────────────────────────────
// ── SUMMARIZED EXPORT ─────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────

/** Core data builder — shared by Excel export and onlyData response */
async function buildSummarizedRows(filters: MasterExportFilters): Promise<{
  rows: SummaryRow[];
  totals: SummarizedDataResult["totals"];
}> {
  const { from, to, doctorId, patientId, search, status } = filters;

  if (!from || !to) {
    throw new Error("Date range (from and to) is required for summarized export.");
  }

  const fromDate = startOf(new Date(from));
  const toDate   = endOf(new Date(to));

  const PatientModel = await getPatientModel();
  const VisitModel   = await getVisitModel();
  const DaycareModel = await getDaycareModel();
  const IPDModel     = await getIPDModel();

  let searchPatientIds: string[] | null = null;
  if (search) {
    const matched = await PatientModel.find({
      isDeleted: { $ne: true },
      $or: [
        { name: { $regex: search, $options: "i" } },
        { mrd:  { $regex: search, $options: "i" } },
      ],
    }).select("_id").lean();
    searchPatientIds = (matched as any[]).map((p) => p._id.toString());
  }

  const statusList = status ? status.split(",").map((s) => s.trim()) : null;
  const buckets    = buildSummaryBuckets(fromDate, toDate);

  const bucketResults = await Promise.all(
    buckets.map(async (bucket) => {
      const buildBase = (dateField: string): Record<string, any> => {
        const q: Record<string, any> = {
          isDeleted: { $ne: true },
          [dateField]: { $gte: bucket.from, $lte: bucket.to },
        };
        if (doctorId)  q.doctorId  = doctorId;
        if (patientId) q.patientId = patientId;
        if (searchPatientIds !== null) q.patientId = { $in: searchPatientIds };
        if (statusList) q.status   = { $in: statusList };
        return q;
      };

      const [opdCount, daycareCount, ipdCount] = await Promise.all([
        VisitModel.countDocuments(buildBase("visitDate")),
        DaycareModel.countDocuments(buildBase("appointmentDate")),
        IPDModel.countDocuments(buildBase("admissionDate")),
      ]);

      return { label: bucket.label, opd: opdCount, daycare: daycareCount, ipd: ipdCount };
    })
  );

  let totalOpd = 0, totalDaycare = 0, totalIpd = 0;

  const rows: SummaryRow[] = bucketResults.map((b, i) => {
    totalOpd     += b.opd;
    totalDaycare += b.daycare;
    totalIpd     += b.ipd;
    return { srNo: i + 1, period: b.label, opd: b.opd, daycare: b.daycare, ipd: b.ipd };
  });

  return {
    rows,
    totals: { opd: totalOpd, daycare: totalDaycare, ipd: totalIpd },
  };
}

export async function buildSummarizedExport(filters: MasterExportFilters): Promise<Buffer> {
  const { from, to } = filters;
  const { rows, totals } = await buildSummarizedRows(filters);

  const hospitalName = getHospitalConfig().hospitalName;
  const { workbook, ws, DATA_START } = createHospitalWorkbook(
    "Summarized Export", SUMMARY_COLS, hospitalName, { from, to }
  );

  for (let i = 0; i < rows.length; i++) {
    addDataRow(ws, SUMMARY_COLS, rows[i], i, DATA_START);
  }

  const totalsRow = DATA_START + rows.length;
  addTotalsRow(ws, SUMMARY_COLS, {
    srNo:    "",
    period:  "TOTAL",
    opd:     totals.opd,
    daycare: totals.daycare,
    ipd:     totals.ipd,
  }, totalsRow);

  return workbook.xlsx.writeBuffer() as unknown as Promise<Buffer>;
}

export async function buildSummarizedData(filters: MasterExportFilters): Promise<SummarizedDataResult> {
  return buildSummarizedRows(filters);
}
