import type { IIpdProcedureRow } from "@/components/pages/clinic-modules/ipd-appointments/IpdProceduresTable";

export const calcIpdProceduresTotal = (rows: IIpdProcedureRow[]): number =>
  rows.reduce((sum, p) => sum + p.price * p.units, 0);

export const addIpdProcedureRow = (
  prev: IIpdProcedureRow[],
  row: { id: string; name: string; price: number; category?: string }
): IIpdProcedureRow[] => {
  const existing = prev.find((p) => p.id === row.id);
  if (existing) {
    return prev.map((p) => (p.id === row.id ? { ...p, units: p.units + 1 } : p));
  }
  return [...prev, { ...row, units: 1, isCompleted: false }];
};

export const toggleIpdProcedureCompleted = (
  prev: IIpdProcedureRow[],
  id: string,
  isCompleted: boolean
): IIpdProcedureRow[] =>
  prev.map((p) => (p.id === id ? { ...p, isCompleted } : p));

export const incrementIpdProcedureUnits = (
  prev: IIpdProcedureRow[],
  id: string
): IIpdProcedureRow[] =>
  prev.map((p) => (p.id === id ? { ...p, units: p.units + 1 } : p));

export const decrementIpdProcedureUnits = (
  prev: IIpdProcedureRow[],
  id: string
): IIpdProcedureRow[] => {
  const target = prev.find((p) => p.id === id);
  if (!target) return prev;
  if (target.units <= 1) return prev.filter((p) => p.id !== id);
  return prev.map((p) => (p.id === id ? { ...p, units: p.units - 1 } : p));
};

export const removeIpdProcedureRow = (prev: IIpdProcedureRow[], id: string): IIpdProcedureRow[] =>
  prev.filter((p) => p.id !== id);

export interface IIpdProcedureBillingChargePayload {
  type: "procedure";
  procedureId: string;
  units: number;
  isCompleted: boolean;
}

/** Build procedure billing lines from table rows (all added procedures, not only search-loaded prices). */
export const buildIpdProcedureBillingCharges = (
  rows: IIpdProcedureRow[]
): IIpdProcedureBillingChargePayload[] =>
  rows
    .filter((p) => Boolean(p.id?.trim()) && p.units > 0)
    .map((p) => ({
      type: "procedure" as const,
      procedureId: p.id,
      units: p.units,
      isCompleted: Boolean(p.isCompleted),
    }));

interface IBillingProcedureCharge {
  type?: string;
  procedureId?: string;
  procedureName?: string;
  category?: string;
  procedureCategory?: string;
  price?: number;
  units?: number;
  isCompleted?: boolean;
}

export const seedIpdProcedureMapsFromBilling = (
  charges: IBillingProcedureCharge[]
): { priceById: Record<string, number>; categoryById: Record<string, string> } => {
  const priceById: Record<string, number> = {};
  const categoryById: Record<string, string> = {};
  charges
    .filter((c) => c.type === "procedure" && c.procedureId)
    .forEach((c) => {
      const procId = c.procedureId as string;
      if (c.price != null && Number.isFinite(Number(c.price))) {
        priceById[procId] = Number(c.price);
      }
      const category = c.procedureCategory ?? c.category;
      if (category?.trim()) categoryById[procId] = category.trim();
    });
  return { priceById, categoryById };
};

export const ipdProcedureRowsFromBilling = (
  charges: IBillingProcedureCharge[],
  priceMap: Record<string, number>,
  categoryMap: Record<string, string> = {}
): IIpdProcedureRow[] =>
  charges
    .filter((c) => c.type === "procedure" && c.procedureId)
    .map((c) => {
      const procId = c.procedureId as string;
      return {
        id: procId,
        name: c.procedureName ?? "—",
        price: c.price ?? priceMap[procId] ?? 0,
        units: Math.max(1, Number(c.units) || 1),
        category: c.procedureCategory ?? c.category ?? categoryMap[procId] ?? undefined,
        isCompleted: Boolean(c.isCompleted),
      };
    });

export const ipdProcedureRowsFromLegacy = (
  procedures: Array<{
    procedureId?: string;
    procedureName?: string;
    price?: number;
    category?: string;
    isCompleted?: boolean;
  }>,
  priceMap: Record<string, number>,
  categoryMap: Record<string, string> = {}
): IIpdProcedureRow[] =>
  procedures
    .filter((p) => p.procedureId)
    .map((p) => ({
      id: p.procedureId as string,
      name: p.procedureName ?? "—",
      price: p.price ?? priceMap[p.procedureId as string] ?? 0,
      units: 1,
      category: p.category ?? categoryMap[p.procedureId as string] ?? undefined,
      isCompleted: Boolean(p.isCompleted),
    }));

/** List/detail views: API may return `procedures` or only `billingCharges` with procedureName. */
export const getIpdProcedureNamesForListing = (
  item: {
    procedures?: Array<{ procedureName?: string; isCompleted?: boolean }>;
    billingCharges?: IBillingProcedureCharge[];
  },
  options?: {
    onlyCompleted?: boolean;
  }
): string[] => {
  const onlyCompleted = Boolean(options?.onlyCompleted);

  const fromProcedures =
    item.procedures
      ?.filter((p) => (onlyCompleted ? Boolean(p.isCompleted) : true))
      .map((p) => p.procedureName?.trim())
      .filter((name): name is string => Boolean(name)) ?? [];

  if (fromProcedures.length) return fromProcedures;

  return (
    item.billingCharges
      ?.filter((c) => c.type === "procedure")
      .filter((c) => (onlyCompleted ? Boolean(c.isCompleted) : true))
      .map((c) => c.procedureName?.trim())
      .filter((name): name is string => Boolean(name)) ?? []
  );
};
