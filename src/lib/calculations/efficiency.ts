import { safeNumber } from "./plan";

/**
 * Efficiency Calculation Engine
 * 
 * Formula:
 * Efficiency % = (SAH / Machine Hour) * 100
 * 
 * Aggregate Efficiency Rule (CRITICAL):
 * Group or factory efficiency must ALWAYS be:
 * Total SAH / Total Machine Hour * 100
 * NEVER average unit percentages!
 */

export function calculateEfficiency(sah: number, machineHour: number): number {
  const s = Math.max(0, safeNumber(sah, 0));
  const mh = Math.max(0, safeNumber(machineHour, 0));
  if (mh <= 0 || s <= 0) return 0;
  return (s / mh) * 100;
}

export function calculateAggregateEfficiency(
  totalSAH: number,
  totalMachineHour: number
): number {
  return calculateEfficiency(totalSAH, totalMachineHour);
}
