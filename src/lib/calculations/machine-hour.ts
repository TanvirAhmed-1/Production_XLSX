import { safeNumber } from "./plan";

/**
 * Machine Hour / Clock Hour Calculation Engine
 * 
 * Rules:
 * 1. Prefer direct Machine HR recap from Excel (LineDailyMachineHour)
 * 2. Fallback: Machine Hour = Manpower * Shift Hours
 * 
 * Default shift hours is configurable per unit (defaults to 10).
 */

export function calculateMachineHour(
  manpower: number,
  shiftHours: number = 10,
  directMachineHour?: number | null
): number {
  if (directMachineHour !== undefined && directMachineHour !== null && !isNaN(directMachineHour)) {
    return Math.max(0, safeNumber(directMachineHour, 0));
  }
  const mp = Math.max(0, safeNumber(manpower, 0));
  const sh = Math.max(0, safeNumber(shiftHours, 10));
  return mp * sh;
}

export function aggregateMachineHours(
  hours: Array<number | null | undefined>
): number {
  if (!Array.isArray(hours)) return 0;
  return hours.reduce<number>((sum, h) => sum + Math.max(0, safeNumber(h, 0)), 0);
}
