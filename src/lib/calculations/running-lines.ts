import { StylePlanRow } from "./types";
import { safeNumber } from "./plan";

/**
 * Running Lines Calculation Engine
 * 
 * Rules:
 * A line is running on a specific date ONLY IF daily SAH > 0:
 * (Plan Qty for date * SMV / 60 > 0).
 * 
 * Running lines = count of unique (unit, line) with daily SAH > 0.
 * Idle lines = Available Capacity - Running Lines.
 */

export interface RunningLinesResult {
  dateKeys: string[];
  unitRows: Array<{
    key: string;
    label: string;
    capacity: number;
    values: number[]; // count of running lines per dateKey
    idleValues: number[]; // capacity - running
  }>;
  groups: {
    b1: {
      capacity: number;
      totalRunning: number[];
      idle: number[];
    };
    b2: {
      capacity: number;
      totalRunning: number[];
      idle: number[];
    };
    factory: {
      capacity: number;
      totalRunning: number[];
      idle: number[];
    };
  };
}

export const UNIT_ORDER = ['B1U2', 'B1U3', 'B1U4', 'B2U2', 'B2U3'];
export const UNIT_LABEL: Record<string, string> = {
  B1U2: 'B1 Unit-02',
  B1U3: 'B1 Unit-03',
  B1U4: 'B1 Unit-04',
  B2U2: 'B2 Unit-02',
  B2U3: 'B2 Unit-03',
};
export const UNIT_GROUP: Record<string, 'B1' | 'B2'> = {
  B1U2: 'B1',
  B1U3: 'B1',
  B1U4: 'B1',
  B2U2: 'B2',
  B2U3: 'B2',
};

export function computeRunningLines(
  rows: StylePlanRow[],
  dateKeys: string[],
  capacities: Record<string, number>
): RunningLinesResult {
  const unitsInDataset = Array.from(new Set(rows.map(r => r.unit)));
  const orderedUnits = UNIT_ORDER.filter(u => unitsInDataset.includes(u));
  if (orderedUnits.length === 0) {
    orderedUnits.push(...unitsInDataset);
  }

  // running: unit -> dateKey -> Set of lines
  const running: Record<string, Record<string, Set<string>>> = {};
  orderedUnits.forEach(u => {
    running[u] = {};
    dateKeys.forEach(dk => {
      running[u][dk] = new Set<string>();
    });
  });

  rows.forEach(row => {
    if (!row.line || !row.unit || !running[row.unit]) return;
    const smv = safeNumber(row.smv, 0);
    dateKeys.forEach(dk => {
      const qty = safeNumber(row.daily?.[dk], 0);
      const daySah = (qty * smv) / 60;
      if (daySah > 0) {
        running[row.unit][dk].add(row.line);
      }
    });
  });

  const unitRows = orderedUnits.map(u => {
    const cap = capacities[u] || (new Set(rows.filter(r => r.unit === u && r.line).map(r => r.line)).size);
    const values = dateKeys.map(dk => running[u][dk]?.size || 0);
    const idleValues = values.map(v => Math.max(0, cap - v));
    return {
      key: u,
      label: UNIT_LABEL[u] || u,
      capacity: cap,
      values,
      idleValues,
    };
  });

  const b1units = orderedUnits.filter(u => UNIT_GROUP[u] === 'B1' || u.startsWith('B1') || u.startsWith('U0'));
  const b2units = orderedUnits.filter(u => UNIT_GROUP[u] === 'B2' || u.startsWith('B2'));

  const b1cap = b1units.reduce((s, u) => s + (capacities[u] || unitRows.find(r => r.key === u)?.capacity || 0), 0);
  const b2cap = b2units.reduce((s, u) => s + (capacities[u] || unitRows.find(r => r.key === u)?.capacity || 0), 0);
  const factoryCap = b1cap + b2cap;

  const b1Total = dateKeys.map((_, i) =>
    b1units.reduce((sum, u) => sum + (unitRows.find(r => r.key === u)?.values[i] || 0), 0)
  );
  const b1Idle = b1Total.map(v => Math.max(0, b1cap - v));

  const b2Total = dateKeys.map((_, i) =>
    b2units.reduce((sum, u) => sum + (unitRows.find(r => r.key === u)?.values[i] || 0), 0)
  );
  const b2Idle = b2Total.map(v => Math.max(0, b2cap - v));

  const factoryTotal = b1Total.map((v, i) => v + b2Total[i]);
  const factoryIdle = factoryTotal.map(v => Math.max(0, factoryCap - v));

  return {
    dateKeys,
    unitRows,
    groups: {
      b1: { capacity: b1cap, totalRunning: b1Total, idle: b1Idle },
      b2: { capacity: b2cap, totalRunning: b2Total, idle: b2Idle },
      factory: { capacity: factoryCap, totalRunning: factoryTotal, idle: factoryIdle },
    },
  };
}
