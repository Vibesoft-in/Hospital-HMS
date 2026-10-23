import hospitalVisitService from "./hospital-visit.service";
import {
  ColDef,
  createHospitalWorkbook,
  addDataRow,
  addTotalsRow,
  applyNumFmt,
} from "@src/libs/utils/hospitalExportTemplate";
import { getHospitalConfig } from "@src/libs/utils/systemConfig";
import { sanitizeForCsv } from "@src/libs/utils/sanitizeForCsv";

// Cash/Card/UPI shown as separate columns; everything else → "Other"
const PAYMENT_MODES = ["Cash", "Card", "UPI", "Other"];
const modeKey = (m: string) => `mode_${m}`;

const COL_DEFS: ColDef[] = [
  { key: "patientName",  width: 25, label: "Patient Name" },
  { key: "visitType",    width: 16, label: "Visit Type" },
  { key: "doctorName",   width: 25, label: "Doctor Name" },
  { key: "createdAt",    width: 16, label: "Date" },
  { key: "totalAmount",  width: 14, label: "Total Amount", numFmt: "currency", align: "right" },
  { key: "amountPaid",   width: 14, label: "Amount Paid",  numFmt: "currency", align: "right" },
  ...PAYMENT_MODES.map((m) => ({ key: modeKey(m), width: 16, label: m, numFmt: "currency" as "currency", align: "right" as "right" })),
  { key: "status",       width: 36, label: "Status" },
];

class HospitalVisitExportService {
  async exportToExcel(
    query: any,
    search: any,
    dateRange?: { from?: string; to?: string }
  ): Promise<Buffer> {
    const visits = await hospitalVisitService.getHospitalVisits(query, search, 0, 10000);

    const hospitalName = getHospitalConfig().hospitalName;
    const { workbook, ws, DATA_START } = createHospitalWorkbook(
      "Visits", COL_DEFS, hospitalName, dateRange
    );

    let grandTotal = 0;
    let grandPaid  = 0;
    let grandDue   = 0;
    const grandModes: Record<string, number> = {};
    for (const m of PAYMENT_MODES) grandModes[m] = 0;

    let dataRowIdx = 0;

    for (const v of visits) {
      const total    = v.price    ?? 0;
      const discount = v.discount ?? 0;
      const finalAmt = total - discount;
      const paid     = v.amountPaid ?? 0;
      const due      = Math.max(0, finalAmt - paid);

      const amountStatus = paid <= 0 ? "Unpaid"
        : due <= 0                   ? "Paid"
        :                              "PartiallyPaid";

      // Build per-mode sums from transactions
      const modeSums: Record<string, number> = {};
      for (const m of PAYMENT_MODES) modeSums[m] = 0;
      for (const t of (v.transactions || [])) {
        const amt   = t.amount ?? 0;
        const raw   = (t.paymentMode || "") as string;
        const known = ["Cash", "Card", "UPI"].find(
          (m) => m.toLowerCase() === raw.trim().toLowerCase()
        );
        const bucket = known ?? "Other";
        modeSums[bucket] += t.transactionType === "Refund" ? -amt : amt;
      }

      grandTotal += finalAmt;
      grandPaid  += paid;
      if (amountStatus !== "Paid") grandDue += due;
      for (const m of PAYMENT_MODES) grandModes[m] += modeSums[m];

      const statusLabel =
        amountStatus === "Paid"          ? "Paid"
        : amountStatus === "PartiallyPaid"
          ? `Partially Paid  –  ₹${due.toLocaleString("en-IN")} due`
          : `Unpaid  –  ₹${due.toLocaleString("en-IN")} due`;

      // ── Multi-row per payment mode (same as case export) ──────────────
      // Each used mode gets its own row; if no payments yet → single row
      const usedModes = PAYMENT_MODES.filter((m) => modeSums[m] > 0);
      const rowModes  = usedModes.length > 0 ? usedModes : [null as any];

      for (const activeMode of rowModes) {
        const rowData: Record<string, any> = {
          patientName: sanitizeForCsv(v.patient?.name || ""),
          visitType:   sanitizeForCsv(v.visitType || ""),
          doctorName:  sanitizeForCsv(v.doctor?.name || ""),
          createdAt:   v.createdAt ? new Date(v.createdAt).toLocaleDateString("en-IN") : "",
          totalAmount: finalAmt,
          amountPaid:  paid,
          status:      statusLabel,
        };
        for (const m of PAYMENT_MODES) {
          rowData[modeKey(m)] = activeMode === m ? modeSums[m] : "";
        }
        addDataRow(ws, COL_DEFS, rowData, dataRowIdx, DATA_START);
        dataRowIdx++;
      }
    }

    const totalsData: Record<string, any> = {
      patientName: "TOTAL",
      visitType:   "",
      doctorName:  "",
      totalAmount: grandTotal,
      amountPaid:  grandPaid,
      status:      grandDue > 0 ? `Total Due  –  ₹${grandDue.toLocaleString("en-IN")}` : "All Paid",
    };
    for (const m of PAYMENT_MODES) totalsData[modeKey(m)] = grandModes[m] > 0 ? grandModes[m] : "";
    addTotalsRow(ws, COL_DEFS, totalsData, DATA_START + dataRowIdx);

    applyNumFmt(ws, COL_DEFS);
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }
}

export default new HospitalVisitExportService();
