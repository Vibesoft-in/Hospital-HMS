import mongoose from "mongoose";
import HospitalTransactionModel from "../models/hospital-transaction.model";
import {
  ColDef,
  createHospitalWorkbook,
  addDataRow,
  addTotalsRow,
  applyNumFmt,
} from "@src/libs/utils/hospitalExportTemplate";
import { getHospitalConfig } from "@src/libs/utils/systemConfig";
import { sanitizeForCsv } from "@src/libs/utils/sanitizeForCsv";
// Cash/Card/UPI shown as columns; anything else → "Other"
const PAYMENT_MODES = ["Cash", "Card", "UPI", "Other"];
const modeKey = (m: string) => `mode_${m}`;

const COL_DEFS: ColDef[] = [
  { key: "visitReadableId", width: 16, label: "Visit ID" },
  { key: "patientName",     width: 25, label: "Patient Name" },
  { key: "patientPhone",    width: 16, label: "Patient Phone" },
  { key: "doctorName",      width: 25, label: "Doctor Name" },
  { key: "visitType",       width: 14, label: "Visit Type" },
  { key: "appointmentType", width: 16, label: "Appointment Type" },
  { key: "createdAt",       width: 16, label: "Date" },
  { key: "totalPrice",      width: 14, label: "Total Price",   numFmt: "currency", align: "right" },
  { key: "amountPaid",      width: 14, label: "Amount Paid",   numFmt: "currency", align: "right" },
  ...PAYMENT_MODES.map((m) => ({
    key:    modeKey(m),
    width:  16,
    label:  m,
    numFmt: "currency" as "currency",
    align:  "right"    as "right",
  })),
  { key: "status",          width: 38, label: "Status" },
];

/**
 * Groups raw transaction rows (already date-filtered) into one row per visitId.
 * All-time paid totals are passed in separately so status is computed from real data,
 * not just the filtered date window (mirrors pathlab transaction export logic).
 */
function groupTransactionsByVisit(
  transactions: any[],
  allTimePaidByVisitId: Map<string, number>,
  allTimeTotalPriceByVisitId: Map<string, number>
): any[] {
  const visitMap = new Map<string, any>();

  for (const t of transactions) {
    const key = t.visitId || "unknown";

    if (!visitMap.has(key)) {
      const modeTotals: Record<string, number> = {};
      for (const m of PAYMENT_MODES) modeTotals[m] = 0;

      const totalPrice   = allTimeTotalPriceByVisitId.get(key) ?? 0;
      const allTimePaid  = allTimePaidByVisitId.get(key) ?? 0;
      const due          = Math.max(0, totalPrice - allTimePaid);
      const status       =
        allTimePaid <= 0    ? "Unpaid"
        : due <= 0          ? "Paid"
        :                     "PartiallyPaid";

      visitMap.set(key, {
        visitReadableId: t.visitReadableId || key,
        patientName:     t.patientName  || "",
        patientPhone:    t.patientPhone || "",
        doctorName:      t.doctorName   || "",
        visitType:       t.visitType    || "",
        appointmentType: t.appointmentType || "",
        createdAt:       t.createdAt    || null,
        totalPrice,
        amountPaid:      0,   // sum of FILTERED transactions — filled below
        modeTotals,
        status,
        due,
      });
    }

    const row = visitMap.get(key)!;
    const amount = t.transactionType === "Refund" ? -(t.amount ?? 0) : (t.amount ?? 0);
    row.amountPaid += amount;

    const raw     = (t.paymentMode || "") as string;
    const known   = ["Cash", "Card", "UPI"].find(
      (m) => m.toLowerCase() === raw.trim().toLowerCase()
    );
    const bucket  = known ?? "Other";
    row.modeTotals[bucket] += Math.abs(t.amount ?? 0);
  }

  return Array.from(visitMap.values());
}

class HospitalTransactionExportService {
  async exportToExcel(
    query: any,
    search: any,
    joinFilters: Record<string, string> = {},
    dateRange?: { from?: string; to?: string }
  ): Promise<Buffer> {
    // 1. Fetch filtered transactions (respects date range / filters)
    const transactions = await HospitalTransactionModel.readHospitalTransactions(
      query, search, 0, 100000, joinFilters
    );

    // 2. Collect unique visitIds from the filtered set
    const visitIdSet = new Set<string>(transactions.map((t: any) => t.visitId).filter(Boolean));

    // 3. Fetch all-time payment totals per visitId (no date filter) for accurate status
    const allTimePaidByVisitId      = new Map<string, number>();
    const allTimeTotalPriceByVisitId = new Map<string, number>();

    if (visitIdSet.size > 0) {
      // All-time paid amounts from HospitalTransaction
      const allTimeTxns = await HospitalTransactionModel.aggregate([
        {
          $match: {
            visitId:   { $in: Array.from(visitIdSet) },
            isDeleted: { $ne: true },
          },
        },
        {
          $group: {
            _id:   "$visitId",
            total: {
              $sum: {
                $cond: [
                  { $eq: ["$transactionType", "Refund"] },
                  { $multiply: ["$amount", -1] },
                  "$amount",
                ],
              },
            },
          },
        },
      ]);
      for (const row of allTimeTxns) {
        allTimePaidByVisitId.set(String(row._id), row.total);
      }

      // Resolve totalPrice from each visit source collection
      const visitObjectIds = Array.from(visitIdSet)
        .filter((id) => /^[0-9a-fA-F]{24}$/.test(id))
        .map((id) => new mongoose.Types.ObjectId(id));

      if (visitObjectIds.length > 0) {
        const [visitDocs, daycareDocs, ipdDocs] = await Promise.all([
          mongoose.connection.collection("hospitalvisits").find(
            { _id: { $in: visitObjectIds } },
            { projection: { _id: 1, price: 1, discount: 1 } }
          ).toArray(),
          mongoose.connection.collection("daycareappointments").find(
            { _id: { $in: visitObjectIds } },
            { projection: { _id: 1, totalPrice: 1 } }
          ).toArray(),
          mongoose.connection.collection("hospitalipds").find(
            { _id: { $in: visitObjectIds } },
            { projection: { _id: 1, totalPrice: 1 } }
          ).toArray(),
        ]);

        for (const doc of visitDocs) {
          const tp = (doc.price ?? 0) - (doc.discount ?? 0);
          allTimeTotalPriceByVisitId.set(String(doc._id), tp);
        }
        for (const doc of [...daycareDocs, ...ipdDocs]) {
          allTimeTotalPriceByVisitId.set(String(doc._id), (doc as any).totalPrice ?? 0);
        }
      }
    }

    // 4. Group filtered transactions into one row per visit
    const rows = groupTransactionsByVisit(
      transactions,
      allTimePaidByVisitId,
      allTimeTotalPriceByVisitId
    );

    // 5. Build workbook
    const hospitalName = getHospitalConfig().hospitalName;
    const { workbook, ws, DATA_START } = createHospitalWorkbook(
      "Transactions",
      COL_DEFS,
      hospitalName,
      dateRange
    );

    let grandTotalPrice = 0;
    let grandAmountPaid = 0;
    let grandDue        = 0;
    const grandModeTotals: Record<string, number> = {};
    for (const m of PAYMENT_MODES) grandModeTotals[m] = 0;

    rows.forEach((row: any, idx: number) => {
      grandTotalPrice += row.totalPrice;
      grandAmountPaid += row.amountPaid;
      for (const m of PAYMENT_MODES) grandModeTotals[m] += row.modeTotals[m];

      const due = row.due ?? 0;
      if (row.status !== "Paid") grandDue += due;

      const statusLabel =
        row.status === "Paid"
          ? "Paid"
          : row.status === "PartiallyPaid"
            ? `Partially Paid  –  ₹${due.toLocaleString("en-IN")} due`
            : `Unpaid  –  ₹${due.toLocaleString("en-IN")} due`;

      const rowData: Record<string, any> = {
        visitReadableId: row.visitReadableId,
        patientName:     sanitizeForCsv(row.patientName),
        patientPhone:    sanitizeForCsv(row.patientPhone),
        doctorName:      sanitizeForCsv(row.doctorName),
        visitType:       sanitizeForCsv(row.visitType),
        appointmentType: sanitizeForCsv(row.appointmentType),
        createdAt:       row.createdAt ? new Date(row.createdAt).toLocaleDateString("en-IN") : "",
        totalPrice:      row.totalPrice,
        amountPaid:      row.amountPaid,
        status:          statusLabel,
      };
      for (const m of PAYMENT_MODES) {
        rowData[modeKey(m)] = row.modeTotals[m] > 0 ? row.modeTotals[m] : "";
      }

      addDataRow(ws, COL_DEFS, rowData, idx, DATA_START);
    });

    // Totals row
    const totalsData: Record<string, any> = {
      visitReadableId: "",
      patientName:     "TOTAL",
      patientPhone:    "",
      doctorName:      "",
      visitType:       "",
      appointmentType: "",
      totalPrice:      grandTotalPrice,
      amountPaid:      grandAmountPaid,
      status:          grandDue > 0 ? `Total Due  –  ₹${grandDue.toLocaleString("en-IN")}` : "All Paid",
    };
    for (const m of PAYMENT_MODES) {
      totalsData[modeKey(m)] = grandModeTotals[m] > 0 ? grandModeTotals[m] : "";
    }
    addTotalsRow(ws, COL_DEFS, totalsData, DATA_START + rows.length);

    applyNumFmt(ws, COL_DEFS);

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }
}

export default new HospitalTransactionExportService();
