import { safeNumber } from "./plan";

/**
 * Standard Allowed Hours (SAH) Calculation Engine
 * 
 * Formula:
 * SAH = Plan Quantity * SMV / 60
 * 
 * Line/Date SAH Resolution:
 * Prefers direct SAH recap value from Excel if available;
 * Otherwise computes from style rows: SUM(qty * SMV / 60).
 */

export function calculateSingleSAH(qty: number, smv: number): number {
  const safeQty = Math.max(0, safeNumber(qty, 0));
  const safeSmv = Math.max(0, safeNumber(smv, 0));
  if (safeQty === 0 || safeSmv === 0) return 0;
  return (safeQty * safeSmv) / 60;
}

export function calculateRowSAH(
  row: { smv: number; daily?: Record<string, number | null | undefined> | null },
  dateKey?: string
): number {
  if (!row.daily) return 0;
  const safeSmv = Math.max(0, safeNumber(row.smv, 0));
  if (safeSmv === 0) return 0;

  if (dateKey) {
    const q = Math.max(0, safeNumber(row.daily[dateKey], 0));
    return (q * safeSmv) / 60;
  }

  let totalSAH = 0;
  for (const dk in row.daily) {
    const q = Math.max(0, safeNumber(row.daily[dk], 0));
    if (q > 0) {
      totalSAH += (q * safeSmv) / 60;
    }
  }
  return totalSAH;
}

export function calculateAggregatedSAH(
  rows: Array<{ smv: number; daily?: Record<string, number | null | undefined> | null }>,
  dateKey?: string
): number {
  if (!Array.isArray(rows)) return 0;
  return rows.reduce((sum, r) => sum + calculateRowSAH(r, dateKey), 0);
}

/**
 * Resolves SAH using direct Excel recap if present, otherwise fallback to calculated.
 */
export function resolveLineDateSAH(
  calculatedSAH: number,
  directRecapSAH?: number | null
): number {
  if (directRecapSAH !== undefined && directRecapSAH !== null && !isNaN(directRecapSAH)) {
    return directRecapSAH;
  }
  return calculatedSAH;
}
