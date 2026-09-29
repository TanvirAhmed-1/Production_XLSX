import { StylePlanRow } from "./types";
import { safeNumber } from "./plan";
import { UNIT_ORDER, UNIT_LABEL } from "./running-lines";

export interface ChangeOverLineResult {
  line: string;
  teamNo: string;
  unit: string;
  runningStyle: string;
  totalChangeovers: number;
  timeline: Record<string, {
    styleRef: string;
    buyer: string;
    type?: string | null;
    smv: number;
    planQty: number;
    isChangeover: boolean;
    label: string;
  } | null>;
}

export interface ChangeOverResult {
  dateKeys: string[];
  units: Record<string, {
    label: string;
    lines: ChangeOverLineResult[];
    dailyCounts: number[];
  }>;
  factoryDailyCounts: number[];
  totalChangeovers: number;
}

export function extractLineTeamNo(lineStr: string | null | undefined): string {
  const s = String(lineStr || '').trim();
  const m = s.match(/(?:line\s*|[-_ /])?(\d{1,3})$/i);
  if (m) return m[1].padStart(2, '0');
  const anyDigits = s.match(/\d+/);
  return anyDigits ? anyDigits[0].padStart(2, '0') : s;
}

export function computeChangeOver(
  rows: StylePlanRow[],
  dateKeys: string[],
  buyerMap: Record<string, string> = {}
): ChangeOverResult {
  const byUnitLineRows: Record<string, Record<string, StylePlanRow[]>> = {};
  const unitsInDataset = Array.from(new Set(rows.map(r => r.unit)));
  const orderedUnits = UNIT_ORDER.filter(u => unitsInDataset.includes(u));
  if (orderedUnits.length === 0) orderedUnits.push(...unitsInDataset);

  orderedUnits.forEach(u => {
    byUnitLineRows[u] = {};
  });

  rows.forEach(row => {
    if (!row.line || !row.styleRef || !row.unit || !byUnitLineRows[row.unit]) return;
    if (!byUnitLineRows[row.unit][row.line]) {
      byUnitLineRows[row.unit][row.line] = [];
    }
    byUnitLineRows[row.unit][row.line].push(row);
  });

  const unitsResult: ChangeOverResult['units'] = {};
  const factoryDailyCounts = dateKeys.map(() => 0);
  let grandTotalChangeovers = 0;

  orderedUnits.forEach(u => {
    const lines = Object.keys(byUnitLineRows[u]).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true })
    );

    const dailyCounts = dateKeys.map(() => 0);
    const lineResults: ChangeOverLineResult[] = [];

    lines.forEach(line => {
      const lineRows = byUnitLineRows[u][line];
      const teamNo = extractLineTeamNo(line);
      const timeline: ChangeOverLineResult['timeline'] = {};
      let prevStyle: string | null = null;
      let lineChangeoverCount = 0;
      let primaryRunningStyle = '';

      // Determine dominant style on each date
      dateKeys.forEach((dk, dayIdx) => {
        let maxQty = 0;
        let dominantRow: StylePlanRow | null = null;

        lineRows.forEach(r => {
          const q = safeNumber(r.daily?.[dk], 0);
          if (q > maxQty) {
            maxQty = q;
            dominantRow = r;
          }
        });

        if (dominantRow) {
          const currentStyle = (dominantRow as StylePlanRow).styleRef;
          if (!primaryRunningStyle) primaryRunningStyle = currentStyle;

          const isChangeover = prevStyle !== null && prevStyle !== currentStyle;
          if (isChangeover) {
            lineChangeoverCount++;
            dailyCounts[dayIdx]++;
            factoryDailyCounts[dayIdx]++;
            grandTotalChangeovers++;
          }

          const buyerCode = buyerMap[(dominantRow as StylePlanRow).buyer] || (dominantRow as StylePlanRow).buyer;
          const label = `${currentStyle} · ${buyerCode} (SMV ${(dominantRow as StylePlanRow).smv})`;

          timeline[dk] = {
            styleRef: currentStyle,
            buyer: (dominantRow as StylePlanRow).buyer,
            type: (dominantRow as StylePlanRow).type,
            smv: (dominantRow as StylePlanRow).smv,
            planQty: (dominantRow as StylePlanRow).planQty,
            isChangeover,
            label,
          };
          prevStyle = currentStyle;
        } else {
          timeline[dk] = null;
        }
      });

      lineResults.push({
        line,
        teamNo,
        unit: u,
        runningStyle: primaryRunningStyle || 'N/A',
        totalChangeovers: lineChangeoverCount,
        timeline,
      });
    });

    unitsResult[u] = {
      label: UNIT_LABEL[u] || u,
      lines: lineResults,
      dailyCounts,
    };
  });

  return {
    dateKeys,
    units: unitsResult,
    factoryDailyCounts,
    totalChangeovers: grandTotalChangeovers,
  };
}
