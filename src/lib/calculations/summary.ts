import {
  StylePlanRow,
  DirectRecapMap,
  UnitSummaryResult,
  GroupSummaryResult,
  DailySummaryResult,
  ProductionReportDTO,
} from "./types";
import { safeNumber } from "./plan";
import { calculateEfficiency } from "./efficiency";
import { calculateWorkingHour } from "./working-hour";
import { calculateVariance } from "./variance";
import { computeLineDetail } from "./line-detail";
import { computeRunningLines, UNIT_ORDER, UNIT_LABEL, UNIT_GROUP } from "./running-lines";

export function generateFullReportDTO(params: {
  importId: string;
  fileName: string;
  rows: StylePlanRow[];
  dateKeys: string[];
  sahDirect?: DirectRecapMap;
  machineHourDirect?: DirectRecapMap;
  capacities?: Record<string, number>;
  unitShiftHours?: Record<string, number>;
  budgets?: Record<string, { planPCS: number; sah: number; clockHour: number; efficiency: number }>;
}): ProductionReportDTO {
  const {
    importId,
    fileName,
    rows,
    dateKeys,
    sahDirect = {},
    machineHourDirect = {},
    capacities = {},
    unitShiftHours = {},
    budgets = {},
  } = params;

  // 1. Calculate Line Detail
  const lineDetail = computeLineDetail(rows, dateKeys, sahDirect, machineHourDirect, unitShiftHours);

  // 2. Calculate Running Lines
  const runningLinesResult = computeRunningLines(rows, dateKeys, capacities);

  // 3. Calculate Unit Summaries
  const unitsInDataset = Array.from(new Set(rows.map(r => r.unit)));
  const orderedUnits = UNIT_ORDER.filter(u => unitsInDataset.includes(u));
  if (orderedUnits.length === 0) orderedUnits.push(...unitsInDataset);

  const unitSummaries: UnitSummaryResult[] = orderedUnits.map(u => {
    const allLinesInUnit = lineDetail.byUnit[u] || [];
    const linesInUnit = allLinesInUnit.filter(l => l.totals.pcs > 0 || l.totals.sah > 0);
    const unitCap = capacities[u] || allLinesInUnit.length;

    let planPCS = 0;
    let sah = 0;
    let machineHour = 0;
    let manpowerSum = 0;

    linesInUnit.forEach(rec => {
      planPCS += rec.totals.pcs;
      sah += rec.totals.sah;
      machineHour += rec.totals.machineHour;
      manpowerSum += rec.manpower;
    });

    const avgManpower = linesInUnit.length > 0 ? manpowerSum / linesInUnit.length : 25;
    const workingHour = calculateWorkingHour(machineHour, avgManpower);
    const efficiency = calculateEfficiency(sah, machineHour);

    const budget = budgets[u];
    const budgetPCS = budget?.planPCS;
    const budgetSAH = budget?.sah;
    const budgetClockHour = budget?.clockHour;
    const budgetEfficiency = budget?.efficiency;

    const variancePCS = budgetPCS !== undefined ? calculateVariance(planPCS, budgetPCS) : undefined;
    const varianceSAH = budgetSAH !== undefined ? calculateVariance(sah, budgetSAH) : undefined;
    const varianceClockHour = budgetClockHour !== undefined ? calculateVariance(machineHour, budgetClockHour) : undefined;
    const varianceEfficiency = budgetEfficiency !== undefined ? calculateVariance(efficiency, budgetEfficiency) : undefined;

    return {
      unitCode: u,
      unitName: UNIT_LABEL[u] || u,
      group: UNIT_GROUP[u] || (u.startsWith('B2') ? 'B2' : 'B1'),
      activeLines: linesInUnit.length,
      capacity: unitCap,
      planPCS,
      sah,
      machineHour,
      workingHour,
      efficiency,
      budgetPCS,
      budgetSAH,
      budgetClockHour,
      budgetEfficiency,
      variancePCS,
      varianceSAH,
      varianceClockHour,
      varianceEfficiency,
    };
  });

  // 4. Calculate Group Summaries (B1 and B2)
  function buildGroup(groupName: 'B1' | 'B2', unitList: UnitSummaryResult[]): GroupSummaryResult {
    let groupPCS = 0;
    let groupSAH = 0;
    let groupMh = 0;
    let groupCap = 0;
    let groupActive = 0;
    let budgetPCS = 0;
    let budgetSAH = 0;
    let budgetMh = 0;
    let hasBudget = false;

    unitList.forEach(u => {
      groupPCS += u.planPCS;
      groupSAH += u.sah;
      groupMh += u.machineHour;
      groupCap += u.capacity;
      groupActive += u.activeLines;

      if (u.budgetPCS !== undefined) {
        hasBudget = true;
        budgetPCS += u.budgetPCS || 0;
        budgetSAH += u.budgetSAH || 0;
        budgetMh += u.budgetClockHour || 0;
      }
    });

    const efficiency = calculateEfficiency(groupSAH, groupMh);
    const budgetEfficiency = budgetMh > 0 ? (budgetSAH / budgetMh) * 100 : 0;

    return {
      groupName,
      units: unitList,
      activeLines: groupActive,
      capacity: groupCap,
      planPCS: groupPCS,
      sah: groupSAH,
      machineHour: groupMh,
      workingHour: calculateWorkingHour(groupMh, groupActive * 25),
      efficiency,
      budgetPCS: hasBudget ? budgetPCS : undefined,
      budgetSAH: hasBudget ? budgetSAH : undefined,
      budgetClockHour: hasBudget ? budgetMh : undefined,
      budgetEfficiency: hasBudget ? budgetEfficiency : undefined,
      variancePCS: hasBudget ? groupPCS - budgetPCS : undefined,
      varianceSAH: hasBudget ? groupSAH - budgetSAH : undefined,
      varianceEfficiency: hasBudget ? efficiency - budgetEfficiency : undefined,
    };
  }

  const b1Units = unitSummaries.filter(u => u.group === 'B1');
  const b2Units = unitSummaries.filter(u => u.group === 'B2');
  const b1Group = buildGroup('B1', b1Units);
  const b2Group = buildGroup('B2', b2Units);

  // Total Birichina
  const totalPCS = b1Group.planPCS + b2Group.planPCS;
  const totalSAH = b1Group.sah + b2Group.sah;
  const totalMh = b1Group.machineHour + b2Group.machineHour;
  const totalCap = b1Group.capacity + b2Group.capacity;
  const totalActive = b1Group.activeLines + b2Group.activeLines;
  const overallEfficiency = calculateEfficiency(totalSAH, totalMh);

  const totalGroup: GroupSummaryResult = {
    groupName: 'Birichina Total',
    units: unitSummaries,
    activeLines: totalActive,
    capacity: totalCap,
    planPCS: totalPCS,
    sah: totalSAH,
    machineHour: totalMh,
    workingHour: calculateWorkingHour(totalMh, totalActive * 25),
    efficiency: overallEfficiency,
    budgetPCS: (b1Group.budgetPCS || 0) + (b2Group.budgetPCS || 0) || undefined,
    budgetSAH: (b1Group.budgetSAH || 0) + (b2Group.budgetSAH || 0) || undefined,
    budgetClockHour: (b1Group.budgetClockHour || 0) + (b2Group.budgetClockHour || 0) || undefined,
    budgetEfficiency:
      (b1Group.budgetClockHour || 0) + (b2Group.budgetClockHour || 0) > 0
        ? (((b1Group.budgetSAH || 0) + (b2Group.budgetSAH || 0)) /
            ((b1Group.budgetClockHour || 0) + (b2Group.budgetClockHour || 0))) *
          100
        : undefined,
  };

  // 5. Daily Summary
  const dailySummaries: DailySummaryResult[] = dateKeys.map(dk => {
    let dayPCS = 0;
    let daySAH = 0;
    let dayMh = 0;
    let dayLines = 0;

    lineDetail.records.forEach(rec => {
      const dm = rec.daily[dk];
      if (dm) {
        dayPCS += dm.pcs;
        daySAH += dm.sah;
        dayMh += dm.machineHour;
        if (dm.sah > 0) dayLines++;
      }
    });

    const dayEff = calculateEfficiency(daySAH, dayMh);
    const dayWh = calculateWorkingHour(dayMh, dayLines * 25);
    const dObj = new Date(dk);
    const isWeeklyOff = !isNaN(dObj.getTime()) && dObj.getUTCDay() === 5; // Friday is Bangladesh garments off-day

    return {
      dateKey: dk,
      isWeeklyOff,
      planPCS: dayPCS,
      sah: daySAH,
      machineHour: dayMh,
      workingHour: dayWh,
      efficiency: dayEff,
      runningLines: dayLines,
      availableCapacity: totalCap,
      idleLines: Math.max(0, totalCap - dayLines),
    };
  });

  // 6. Buyer Statistics
  const buyerMap: Record<string, { orderQty: number; planQty: number; sah: number; styles: Set<string> }> = {};
  rows.forEach(r => {
    const b = r.buyer || 'Unknown';
    if (!buyerMap[b]) {
      buyerMap[b] = { orderQty: 0, planQty: 0, sah: 0, styles: new Set() };
    }
    buyerMap[b].orderQty += safeNumber(r.orderQty, 0);
    buyerMap[b].planQty += safeNumber(r.planQty, 0);
    buyerMap[b].sah += (safeNumber(r.planQty, 0) * safeNumber(r.smv, 0)) / 60;
    if (r.styleRef) buyerMap[b].styles.add(r.styleRef);
  });

  const buyerStats = Object.keys(buyerMap)
    .map(b => ({
      buyer: b,
      orderQty: buyerMap[b].orderQty,
      planQty: buyerMap[b].planQty,
      sah: buyerMap[b].sah,
      styleCount: buyerMap[b].styles.size,
      sharePct: totalPCS > 0 ? (buyerMap[b].planQty / totalPCS) * 100 : 0,
    }))
    .sort((a, b) => b.planQty - a.planQty);

  // 7. Style Statistics
  const styleMap: Record<string, {
    styleRef: string;
    buyer: string;
    article?: string | null;
    smv: number;
    orderQty: number;
    planQty: number;
    sah: number;
    lines: Set<string>;
  }> = {};

  rows.forEach(r => {
    const s = r.styleRef || 'Unknown';
    if (!styleMap[s]) {
      styleMap[s] = {
        styleRef: s,
        buyer: r.buyer || 'Unknown',
        article: r.article,
        smv: safeNumber(r.smv, 0),
        orderQty: 0,
        planQty: 0,
        sah: 0,
        lines: new Set(),
      };
    }
    styleMap[s].orderQty += safeNumber(r.orderQty, 0);
    styleMap[s].planQty += safeNumber(r.planQty, 0);
    styleMap[s].sah += (safeNumber(r.planQty, 0) * safeNumber(r.smv, 0)) / 60;
    if (r.line) styleMap[s].lines.add(r.line);
  });

  const styleStats = Object.values(styleMap)
    .map(s => ({
      ...s,
      lines: Array.from(s.lines),
    }))
    .sort((a, b) => b.planQty - a.planQty);

  return {
    importId,
    fileName,
    dateKeys,
    summary: {
      totalPlanPCS: totalPCS,
      totalSAH: totalSAH,
      totalMachineHour: totalMh,
      totalWorkingHour: calculateWorkingHour(totalMh, totalActive * 25),
      overallEfficiency,
      activeLines: totalActive,
      totalStyles: styleStats.length,
      totalBuyers: buyerStats.length,
      totalCapacity: totalCap,
      budgetVariancePCS: totalGroup.variancePCS,
      budgetVarianceSAH: totalGroup.varianceSAH,
      budgetVarianceEfficiency: totalGroup.varianceEfficiency,
    },
    units: unitSummaries,
    groups: {
      b1: b1Group,
      b2: b2Group,
      total: totalGroup,
    },
    daily: dailySummaries,
    buyerStats,
    styleStats,
  };
}
