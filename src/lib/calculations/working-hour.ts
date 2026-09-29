import { safeNumber } from "./plan";

/**
 * Working Hour Calculation Engine
 * 
 * Formula:
 * Working Hour = Machine Hour / Manpower
 * 
 * Avoids division by zero or NaN.
 */

export function calculateWorkingHour(
  machineHour: number,
  manpower: number
): number {
  const mh = Math.max(0, safeNumber(machineHour, 0));
  const mp = Math.max(0, safeNumber(manpower, 0));
  if (mp === 0 || mh === 0) return 0;
  return mh / mp;
}
