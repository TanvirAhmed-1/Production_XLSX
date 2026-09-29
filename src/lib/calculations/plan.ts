/**
 * Plan PCS Calculation Engine
 * 
 * Formula:
 * Plan PCS = SUM(all daily planned quantities)
 * 
 * Guarantees zero/null safety without NaN or Infinity.
 */

export function safeNumber(val: unknown, fallback: number = 0): number {
  if (val === null || val === undefined || val === '') return fallback;
  const n = Number(val);
  return isNaN(n) || !isFinite(n) ? fallback : n;
}

export function calculatePlanPCS(quantities: Array<number | null | undefined>): number {
  if (!Array.isArray(quantities)) return 0;
  return quantities.reduce<number>((sum, q) => sum + Math.max(0, safeNumber(q, 0)), 0);
}

export function calculateDailyPlanPCS(
  dailyMap: Record<string, number | null | undefined> | undefined | null,
  dateKeys?: string[]
): number {
  if (!dailyMap) return 0;
  const keys = dateKeys || Object.keys(dailyMap);
  return keys.reduce<number>((sum, dk) => sum + Math.max(0, safeNumber(dailyMap[dk], 0)), 0);
}

export function calculateRowsPlanPCS(
  rows: Array<{ daily?: Record<string, number | null | undefined> | null }>,
  dateKey?: string
): number {
  if (!Array.isArray(rows)) return 0;
  return rows.reduce((sum, row) => {
    if (!row.daily) return sum;
    if (dateKey) {
      return sum + Math.max(0, safeNumber(row.daily[dateKey], 0));
    }
    return sum + calculateDailyPlanPCS(row.daily);
  }, 0);
}
