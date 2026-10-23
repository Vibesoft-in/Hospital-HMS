import ExcelJS from "exceljs";
import { APIError } from "@src/shared";
import MedicineModel, { normalizeMedicineName } from "./models/medicine.model";

/**
 * Parse an Excel buffer and extract medicine names (and optional type) from columns
 * named "medicines"/"medicine" and "type"/"types" (case-insensitive).
 * Falls back to the first column for name if no header matches.
 */
export async function importMedicinesFromExcel(
  buffer: Buffer | ArrayBuffer
): Promise<{ inserted: number; updated: number; skipped: number; total: number }> {
  const workbook = new ExcelJS.Workbook();
  await (workbook.xlsx as any).load(buffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw new APIError(400, "Bad Request", "Excel file has no worksheets.");

  // Find column indexes from header row
  let medicineColIdx: number | null = null;
  let typeColIdx: number | null = null;

  const headerRow = worksheet.getRow(1);
  headerRow.eachCell((cell, colNumber) => {
    const val = cell.value?.toString().trim().toLowerCase();
    if (val === "medicines" || val === "medicine") medicineColIdx = colNumber;
    if (val === "type" || val === "types") typeColIdx = colNumber;
  });

  // Fallback: use first column for name
  if (medicineColIdx === null) medicineColIdx = 1;

  const entries: { name: string; type?: string }[] = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // skip header
    const name = row.getCell(medicineColIdx!).value?.toString().trim();
    if (!name || name.length === 0) return;

    const type = typeColIdx ? row.getCell(typeColIdx).value?.toString().trim() || undefined : undefined;
    entries.push({ name, type });
  });

  if (entries.length === 0) {
    throw new APIError(400, "Bad Request", "No medicine names found in the Excel file.");
  }

  const result = await MedicineModel.upsertMany(entries);
  return { inserted: result.inserted, updated: result.updated, skipped: result.skipped, total: entries.length };
}

export async function getMedicines(
  search: string,
  skip: number,
  limit: number,
  type?: string,
): Promise<{ medicines: any[]; totalCount: number }> {
  const query: Record<string, any> = {};

  if (search) {
    // Search against normalizedName so capitalisation/spacing don't matter
    query.normalizedName = new RegExp(normalizeMedicineName(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  }
  if (type) {
    query.type = new RegExp(`^${type.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
  }

  const [medicines, totalCount] = await Promise.all([
    MedicineModel.find(query).sort({ name: 1 }).skip(skip).limit(limit).lean(),
    MedicineModel.countDocuments(query),
  ]);

  return { medicines, totalCount };
}

export async function getMedicineTypes(): Promise<string[]> {
  const types = await MedicineModel.distinct("type", { type: { $nin: [null, ""] } });
  return (types as string[]).sort();
}

/**
 * Export all medicines to an Excel buffer.
 * Produces a single worksheet with columns: medicine, type
 * — matching the expected import format so the file can be re-imported on another client.
 */
export async function exportMedicinesToExcel(): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Medicines");

  sheet.columns = [
    { header: "medicine", key: "name",  width: 40 },
    { header: "type",     key: "type",  width: 20 },
  ];

  // Style header row
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.commit();

  // Stream all medicines sorted by name
  const medicines = await MedicineModel.find({}).sort({ name: 1 }).lean();
  for (const med of medicines) {
    sheet.addRow({ name: med.name, type: med.type ?? "" });
  }

  return workbook.xlsx.writeBuffer();
}
