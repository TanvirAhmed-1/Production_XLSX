import { safeNumber } from "./plan";

/**
 * Budget & Variance Calculation Engine
 * 
 * Formula:
 * Variance = Actual - Budget
 */

export function calculateVariance(actual: number, budget: number): number {
  const act = safeNumber(actual, 0);
  const bud = safeNumber(budget, 0);
  return act - bud;
}

export function calculateVariancePercentage(actual: number, budget: number): number {
  const bud = safeNumber(budget, 0);
  if (bud === 0) return 0;
  return ((safeNumber(actual, 0) - bud) / Math.abs(bud)) * 100;
}
