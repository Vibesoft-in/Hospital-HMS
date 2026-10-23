import HospitalIPDService from "./hospital-ipd.service";
import {
  ColDef,
  createHospitalWorkbook,
  addDataRow,
  addTotalsRow,
  applyNumFmt,
} from "@src/libs/utils/hospitalExportTemplate";
import { getHospitalConfig } from "@src/libs/utils/systemConfig";
import { sanitizeForCsv } from "@src/libs/utils/sanitizeForCsv";

const PAYMENT_MODES = ["Cash", "Card", "UPI", "Other"];
const modeKey = (m: string) => `mode_${m}`;

const COL_DEFS: ColDef[] = [
  { key: "patientName",  width: 25, label: "Patient Name" },
  { key: "doctorName",   width: 25, label: "Doctor Name" },
  { key: "wardName",     width: 18, label: "Ward" },
  { key: "createdAt",    width: 16, label: "Date" },
  { key: "totalAmount",  width: 14, label: "Total Amount", numFmt: "currency", align: "right" },
  { key: "amountPaid",   width: 14, label: "Amount Paid",  numFmt: "currency", align: "right" },
  ...PAYMENT_MODES.map((m) => ({ key: modeKey(m), width: 16, label: m, numFmt: "currency" as "currency", align: "right" as "right" })),
  { key: "status",       width: 36, label: "Status" },
];

class HospitalIPDExportService {
  async exportToExcel(
    query: any,
    search: any,
    dateRange?: { from?: string; to?: string }
  ): Promise<Buffer> {
    const result = await HospitalIPDService.getIPDs(query, search, 0, 10000);
    const ipds = result.ipds || [];

    const hospitalName = getHospitalConfig().hospitalName;
    const { workbook, ws, DATA_START } = createHospitalWorkbook(
      "IPD", COL_DEFS, hospitalName, dateRange
    );

    let grandTotal = 0;
    let grandPaid  = 0;
    let grandDue   = 0;
    const grandModes: Record<string, number> = {};
    for (const m of PAYMENT_MODES) grandModes[m] = 0;

    let dataRowIdx = 0;

    for (const ipd of ipds) {
      const totalPrice = ipd.totalPrice ?? 0;
      const paid       = ipd.amountPaid ?? 0;
      const due        = Math.max(0, totalPrice - paid);

      const amountStatus = paid <= 0 ? "Unpaid"
        : due <= 0                   ? "Paid"
        :                              "PartiallyPaid";

      const modeSums: Record<string, number> = {};
      for (const m of PAYMENT_MODES) modeSums[m] = 0;
      for (const t of (ipd.transactions || [])) {
        const amt   = t.amount ?? 0;
        const raw   = (t.paymentMode || "") as string;
        const known = ["Cash", "Card", "UPI"].find(
          (m) => m.toLowerCase() === raw.trim().toLowerCase()
        );
        const bucket = known ?? "Other";
        modeSums[bucket] += t.transactionType === "Refund" ? -amt : amt;
      }

      grandTotal += totalPrice;
      grandPaid  += paid;
      if (amountStatus !== "Paid") grandDue += due;
      for (const m of PAYMENT_MODES) grandModes[m] += modeSums[m];

      const statusLabel =
        amountStatus === "Paid"          ? "Paid"
        : amountStatus === "PartiallyPaid"
          ? `Partially Paid  –  ₹${due.toLocaleString("en-IN")} due`
          : `Unpaid  –  ₹${due.toLocaleString("en-IN")} due`;

      // ── Multi-row per payment mode (same as case export) ──────────────
      const usedModes = PAYMENT_MODES.filter((m) => modeSums[m] > 0);
      const rowModes  = usedModes.length > 0 ? usedModes : [null as any];

      for (const activeMode of rowModes) {
        const rowData: Record<string, any> = {
          patientName: sanitizeForCsv(ipd.patient?.name  || ""),
          doctorName:  sanitizeForCsv(ipd.doctor?.name   || ""),
          wardName:    sanitizeForCsv(ipd.bed?.ward?.name || ""),
          createdAt:   ipd.createdAt ? new Date(ipd.createdAt).toLocaleDateString("en-IN") : "",
          totalAmount: totalPrice,
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
      doctorName:  "",
      wardName:    "",
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

export default new HospitalIPDExportService();
