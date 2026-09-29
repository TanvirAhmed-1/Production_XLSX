import { StylePlanRow, DirectRecapMap, CalculationAuditDetail, CalculationAuditRow } from "./types";
import { safeNumber } from "./plan";

/**
 * Data Audit Engine
 * 
 * Generates transparent traceability for any KPI, cell, or aggregate.
 * Reveals underlying rows, applied formulas, and whether direct Excel recap was used.
 */

export function traceMetricCalculation(params: {
  metric: 'sah' | 'planPCS' | 'machineHour' | 'workingHour' | 'efficiency';
  unit?: string;
  line?: string;
  dateKey?: string;
  rows: StylePlanRow[];
  sahDirect?: DirectRecapMap;
  machineHourDirect?: DirectRecapMap;
  unitShiftHours?: Record<string, number>;
}): CalculationAuditDetail {
  const {
    metric,
    unit,
    line,
    dateKey,
    rows,
    sahDirect = {},
    machineHourDirect = {},
    unitShiftHours = {},
  } = params;

  // Filter rows matching scope
  const filteredRows = rows.filter(r => {
    if (unit && r.unit !== unit) return false;
    if (line && r.line !== line) return false;
    return true;
  });

  const auditRows: CalculationAuditRow[] = [];
  let totalCalculated = 0;
  let formulaDescription = '';
  let isDirectRecap = false;
  let directRecapVal: number | null = null;

  if (metric === 'sah') {
    formulaDescription = dateKey
      ? `Σ (Plan Quantity on ${dateKey} × SMV / 60)`
      : `Σ (Total Plan Quantity across dates × SMV / 60)`;

    // Check direct recap
    if (unit && line && dateKey && sahDirect[unit]?.[line]?.[dateKey] !== undefined) {
      isDirectRecap = true;
      directRecapVal = sahDirect[unit][line][dateKey];
    }

    filteredRows.forEach(r => {
      const smv = safeNumber(r.smv, 0);
      let qty = 0;
      if (dateKey) {
        qty = safeNumber(r.daily?.[dateKey], 0);
      } else {
        qty = Object.values(r.daily || {}).reduce((s, v) => s + safeNumber(v, 0), 0);
      }

      const calculatedSAH = (qty * smv) / 60;
      if (qty > 0 || calculatedSAH > 0) {
        auditRows.push({
          styleRef: r.styleRef,
          buyer: r.buyer,
          article: r.article,
          line: r.line,
          qty,
          smv,
          calculatedSAH,
          formula: `${qty.toLocaleString()} × ${smv} / 60 = ${calculatedSAH.toFixed(2)} SAH`,
        });
        totalCalculated += calculatedSAH;
      }
    });

    return {
      metric: 'SAH (Standard Allowed Hours)',
      unit,
      line,
      dateKey,
      totalValue: isDirectRecap && directRecapVal !== null ? directRecapVal : totalCalculated,
      formulaDescription,
      isDirectRecap,
      directRecapValue: directRecapVal,
      rowsUsed: auditRows,
    };
  }

  if (metric === 'planPCS') {
    formulaDescription = dateKey
      ? `Σ (Plan Quantity on ${dateKey})`
      : `Σ (Plan Quantity across all dates)`;

    filteredRows.forEach(r => {
      let qty = 0;
      if (dateKey) {
        qty = safeNumber(r.daily?.[dateKey], 0);
      } else {
        qty = Object.values(r.daily || {}).reduce((s, v) => s + safeNumber(v, 0), 0);
      }

      if (qty > 0) {
        auditRows.push({
          styleRef: r.styleRef,
          buyer: r.buyer,
          article: r.article,
          line: r.line,
          qty,
          smv: r.smv,
          calculatedSAH: (qty * r.smv) / 60,
          formula: `Planned: ${qty.toLocaleString()} pcs`,
        });
        totalCalculated += qty;
      }
    });

    return {
      metric: 'Plan Quantity (PCS)',
      unit,
      line,
      dateKey,
      totalValue: totalCalculated,
      formulaDescription,
      isDirectRecap: false,
      rowsUsed: auditRows,
    };
  }

  if (metric === 'machineHour') {
    if (unit && line && dateKey && machineHourDirect[unit]?.[line]?.[dateKey] !== undefined) {
      isDirectRecap = true;
      directRecapVal = machineHourDirect[unit][line][dateKey];
      formulaDescription = 'Direct Machine HR from Excel recap row';
    } else {
      formulaDescription = 'Manpower × Shift Hours (Fallback)';
    }

    const manpower = filteredRows[0]?.manpower || 25;
    const shiftHours = (unit && unitShiftHours[unit]) || 10;
    const fallbackMH = manpower * shiftHours;

    return {
      metric: 'Machine / Clock Hours',
      unit,
      line,
      dateKey,
      totalValue: isDirectRecap && directRecapVal !== null ? directRecapVal : fallbackMH,
      formulaDescription,
      isDirectRecap,
      directRecapValue: directRecapVal,
      rowsUsed: [],
    };
  }

  // Fallback for efficiency / workingHour
  return {
    metric,
    unit,
    line,
    dateKey,
    totalValue: 0,
    formulaDescription: 'Derived calculation',
    isDirectRecap: false,
    rowsUsed: [],
  };
}
