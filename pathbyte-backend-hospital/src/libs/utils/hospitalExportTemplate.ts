/**
 * Shared Excel export template for hospital exports.
 * Mirrors the Pathlab teal-branded template used in case/transaction exports.
 */
import * as ExcelJS from "exceljs";
import * as fs from "fs";
import { getHospitalConfig } from "@src/libs/utils/systemConfig";

export const TEAL       = "FF008B8B";
export const TEAL_LIGHT = "FFE0F4F4";
export const WHITE      = "FFFFFFFF";
export const DARK_TEXT  = "FF003333";
export const YELLOW     = "FFFFD966";

export function formatDateRange(from?: string, to?: string): string | null {
  if (!from && !to) return null;
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  if (from && to && from === to) return fmt(from);
  if (from && to) return `${fmt(from)} – ${fmt(to)}`;
  if (from) return `From ${fmt(from)}`;
  return `Until ${fmt(to!)}`;
}

export interface ColDef {
  key: string;
  width: number;
  label: string;
  numFmt?: string;
  align?: "left" | "center" | "right";
}

/**
 * Creates a workbook + worksheet with the teal branded header banner (Row 1),
 * column headers (Row 2), and returns the worksheet plus the data start row index.
 */
export function createHospitalWorkbook(
  sheetName: string,
  colDefs: ColDef[],
  hospitalName: string,
  dateRange?: { from?: string; to?: string }
): { workbook: ExcelJS.Workbook; ws: ExcelJS.Worksheet; DATA_START: number } {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet(sheetName, {
    properties: { tabColor: { argb: TEAL } },
    pageSetup: {
      paperSize: 9,
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0, right: 0, top: 0, bottom: 0, header: 0, footer: 0 },
    },
  });

  ws.headerFooter.oddFooter = "";

  const totalCols = colDefs.length;

  // Set column definitions
  colDefs.forEach((def, i) => {
    const col = ws.getColumn(i + 1);
    col.key   = def.key;
    col.width = def.width;
  });

  // ── ROW 1: Banner — logo col | hospital name | date range (right-aligned) ──
  ws.getRow(1).height = 44;

  const dateLabel = formatDateRange(dateRange?.from, dateRange?.to);

  // Col 1: logo slot — teal background, no text (image overlaid below)
  const logoCell = ws.getCell(1, 1);
  logoCell.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: TEAL } };

  // Cols 2 .. ~60%: hospital name
  const nameEnd = Math.max(2, Math.floor(totalCols * 0.60));
  if (nameEnd > 1) ws.mergeCells(1, 2, 1, nameEnd);
  const nameCell = ws.getCell(1, 2);
  nameCell.value = hospitalName;
  nameCell.font  = { bold: true, size: 20, color: { argb: WHITE }, name: "Arial" };
  nameCell.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: TEAL } };
  nameCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };

  // Remaining cols: date range, right-aligned
  if (nameEnd < totalCols) {
    ws.mergeCells(1, nameEnd + 1, 1, totalCols);
    const dateCell = ws.getCell(1, nameEnd + 1);
    dateCell.value = dateLabel ?? "";
    dateCell.font  = { bold: true, size: 11, color: { argb: WHITE }, name: "Arial" };
    dateCell.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: TEAL } };
    dateCell.alignment = { vertical: "middle", horizontal: "right", indent: 2 };
  }

  const { logoPath, logoExt } = getHospitalConfig();
  if (fs.existsSync(logoPath)) {
    try {
      const logoId = workbook.addImage({ filename: logoPath, extension: logoExt });
      ws.addImage(logoId, {
        tl: { col: 0, row: 0 },
        ext: { width: 40, height: 40 },
        editAs: "oneCell",
      } as any);
    } catch (_) { /* skip if image fails */ }
  }

  // ── ROW 2: Column headers ─────────────────────────────────────────────
  const HEADER_ROW = 2;
  const DATA_START = 3;
  ws.getRow(HEADER_ROW).height = 26;

  colDefs.forEach((def, i) => {
    const cell = ws.getCell(HEADER_ROW, i + 1);
    cell.value = def.label;
    cell.font  = { bold: true, size: 11, color: { argb: WHITE }, name: "Arial" };
    cell.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: TEAL } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = {
      top:    { style: "thin", color: { argb: WHITE } },
      left:   { style: "thin", color: { argb: WHITE } },
      bottom: { style: "thin", color: { argb: WHITE } },
      right:  { style: "thin", color: { argb: WHITE } },
    };
  });

  // Freeze header rows + autofilter
  ws.autoFilter = {
    from: { row: HEADER_ROW, column: 1 },
    to:   { row: HEADER_ROW, column: totalCols },
  };
  ws.views = [{ state: "frozen", ySplit: DATA_START - 1 }];

  return { workbook, ws, DATA_START };
}

/** Add a data row with alternating teal-light background and borders. */
export function addDataRow(
  ws: ExcelJS.Worksheet,
  colDefs: ColDef[],
  rowData: Record<string, any>,
  rowIndex: number,  // 0-based data row index
  dataStartRow: number
): void {
  const isAlt    = rowIndex % 2 === 1;
  const excelRow = ws.getRow(dataStartRow + rowIndex);
  excelRow.height = 22;

  colDefs.forEach((def, i) => {
    const cell = excelRow.getCell(i + 1);
    cell.value = rowData[def.key] ?? "";
    cell.border = {
      top: { style: "thin" }, left: { style: "thin" },
      bottom: { style: "thin" }, right: { style: "thin" },
    };
    cell.alignment = { vertical: "middle" };
    if (def.align) cell.alignment.horizontal = def.align;
    if (isAlt) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TEAL_LIGHT } };
  });
}

/** Add the yellow TOTALS row at the bottom. */
export function addTotalsRow(
  ws: ExcelJS.Worksheet,
  colDefs: ColDef[],
  totalsData: Record<string, any>,
  rowNum: number
): void {
  ws.getRow(rowNum).height = 26;
  colDefs.forEach((def, i) => {
    const cell = ws.getCell(rowNum, i + 1);
    cell.value = totalsData[def.key] ?? "";
    cell.font  = { bold: true, size: 11, color: { argb: DARK_TEXT }, name: "Arial" };
    cell.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: YELLOW } };
    cell.border = {
      top:    { style: "medium" }, left:   { style: "thin" },
      bottom: { style: "medium" }, right:  { style: "thin" },
    };
    cell.alignment = { vertical: "middle" };
    if (def.align) cell.alignment.horizontal = def.align;
  });
}

/** Apply number format to numeric columns. */
export function applyNumFmt(ws: ExcelJS.Worksheet, colDefs: ColDef[]): void {
  const NUM_FMT = "#,##0.00";
  colDefs.forEach((def) => {
    if (def.numFmt) {
      ws.getColumn(def.key).numFmt = def.numFmt === "currency" ? NUM_FMT : def.numFmt;
      ws.getColumn(def.key).alignment = { horizontal: "right" };
    }
  });
}
