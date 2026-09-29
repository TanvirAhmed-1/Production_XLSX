import { StylePlanRow, DirectRecapMap } from "./types";
import { safeNumber } from "./plan";
import { calculateWorkingHour } from "./working-hour";
import { calculateEfficiency } from "./efficiency";
import { UNIT_ORDER, UNIT_LABEL } from "./running-lines";

export interface LineDailyMetric {
  pcs: number;
  sah: number;
  machineHour: number;
  workingHour: number;
  efficiency: number;
}

export interface LineDetailRecord {
  unit: string;
  unitLabel: string;
  line: string;
  manpower: number;
  daily: Record<string, LineDailyMetric>;
  totals: {
    pcs: number;
    sah: number;
    machineHour: number;
    workingHour: number;
    efficiency: number;
  };
}

export interface LineDetailResult {
  dateKeys: string[];
  records: LineDetailRecord[];
  byUnit: Record<string, LineDetailRecord[]>;
}

export function computeLineDetail(
  rows: StylePlanRow[],
  dateKeys: string[],
  sahDirect: DirectRecapMap = {},
  machineHourDirect: DirectRecapMap = {},
  unitShiftHours: Record<string, number> = {}
): LineDetailResult {
  const lineRecordsMap: Record<string, Record<string, {
    unit: string;
    line: string;
    manpower: number;
    pcs: Record<string, number>;
    sah: Record<string, number>;
    machineHour: Record<string, number>;
  }>> = {};

  const unitsInDataset = Array.from(new Set(rows.map(r => r.unit)));
  const orderedUnits = UNIT_ORDER.filter(u => unitsInDataset.includes(u));
  if (orderedUnits.length === 0) orderedUnits.push(...unitsInDataset);

  orderedUnits.forEach(u => {
    lineRecordsMap[u] = {};
  });

  // Step 1: Accumulate style rows
  rows.forEach(row => {
    if (!row.line || !row.unit || !lineRecordsMap[row.unit]) return;
    if (!lineRecordsMap[row.unit][row.line]) {
      lineRecordsMap[row.unit][row.line] = {
        unit: row.unit,
        line: row.line,
        manpower: row.manpower || 25,
        pcs: {},
        sah: {},
        machineHour: {},
      };
    }
    const rec = lineRecordsMap[row.unit][row.line];
    if (row.manpower && !rec.manpower) rec.manpower = row.manpower;

    const smv = safeNumber(row.smv, 0);
    dateKeys.forEach(dk => {
      const q = safeNumber(row.daily?.[dk], 0);
      rec.pcs[dk] = (rec.pcs[dk] || 0) + q;
      rec.sah[dk] = (rec.sah[dk] || 0) + (q * smv) / 60;
    });
  });

  // Step 2: Overlay direct recaps (SAH & Machine HR) and calculate hours
  const allRecords: LineDetailRecord[] = [];
  const byUnit: Record<string, LineDetailRecord[]> = {};

  orderedUnits.forEach(u => {
    byUnit[u] = [];
    const lines = Object.keys(lineRecordsMap[u]).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true })
    );

    lines.forEach(line => {
      const rec = lineRecordsMap[u][line];
      const shiftHours = unitShiftHours[u] || 10;
      const dailyMetrics: Record<string, LineDailyMetric> = {};

      let totalPcs = 0;
      let totalSah = 0;
      let totalMh = 0;

      dateKeys.forEach(dk => {
        const pcs = rec.pcs[dk] || 0;
        // Prefer direct SAH recap if present
        const directSah = sahDirect[u]?.[line]?.[dk];
        const sah = directSah !== undefined ? directSah : (rec.sah[dk] || 0);

        // Prefer direct Machine Hour recap if present
        const directMh = machineHourDirect[u]?.[line]?.[dk];
        let machineHour = 0;
        if (directMh !== undefined) {
          machineHour = directMh;
        } else if (pcs > 0 || sah > 0) {
          machineHour = (rec.manpower || 25) * shiftHours;
        }

        const workingHour = calculateWorkingHour(machineHour, rec.manpower || 25);
        const efficiency = calculateEfficiency(sah, machineHour);

        dailyMetrics[dk] = {
          pcs,
          sah,
          machineHour,
          workingHour,
          efficiency,
        };

        totalPcs += pcs;
        totalSah += sah;
        totalMh += machineHour;
      });

      const totalWh = calculateWorkingHour(totalMh, rec.manpower || 25);
      const totalEff = calculateEfficiency(totalSah, totalMh);

      const record: LineDetailRecord = {
        unit: u,
        unitLabel: UNIT_LABEL[u] || u,
        line,
        manpower: rec.manpower || 25,
        daily: dailyMetrics,
        totals: {
          pcs: totalPcs,
          sah: totalSah,
          machineHour: totalMh,
          workingHour: totalWh,
          efficiency: totalEff,
        },
      };

      allRecords.push(record);
      byUnit[u].push(record);
    });
  });

  return {
    dateKeys,
    records: allRecords,
    byUnit,
  };
}
