import { prisma } from "../prisma";
import {
  StylePlanRow,
  DirectRecapMap,
  ProductionReportDTO,
  generateFullReportDTO,
  computeRunningLines,
  computeChangeOver,
  computeLineDetail,
  traceMetricCalculation,
  CalculationAuditDetail,
  RunningLinesResult,
  ChangeOverResult,
  LineDetailResult,
} from "../calculations";

export interface ReportFilterOptions {
  importId?: string;
  unit?: string;
  line?: string;
  buyer?: string;
  styleRef?: string;
  dateStart?: string;
  dateEnd?: string;
}

export async function getProductionReportData(filters: ReportFilterOptions = {}): Promise<{
  report: ProductionReportDTO;
  runningLines: RunningLinesResult;
  changeOver: ChangeOverResult;
  lineDetail: LineDetailResult;
  rawRows: StylePlanRow[];
} | null> {
  // 1. Resolve importId (use specified or latest SUCCESS import)
  let importId = filters.importId;
  let excelImport = null;

  if (importId) {
    excelImport = await prisma.excelImport.findUnique({ where: { id: importId } });
  } else {
    excelImport = await prisma.excelImport.findFirst({
      where: { status: "SUCCESS" },
      orderBy: { uploadedAt: "desc" },
    });
    importId = excelImport?.id;
  }

  if (!excelImport || !importId) {
    return null;
  }

  // 2. Fetch Units and Lines for capacities and shift hours
  const units = await prisma.unit.findMany({ include: { lines: true } });
  const capacities: Record<string, number> = {};
  const unitShiftHours: Record<string, number> = {};
  units.forEach(u => {
    capacities[u.code] = u.lines.length || u.capacity || 0;
    unitShiftHours[u.code] = u.shiftHours || 10;
  });

  // 3. Fetch Production Plans and Dailies
  const plans = await prisma.productionPlan.findMany({
    where: {
      importId,
      ...(filters.unit ? { unitCode: filters.unit } : {}),
      ...(filters.line ? { lineName: filters.line } : {}),
      ...(filters.buyer ? { buyer: filters.buyer } : {}),
      ...(filters.styleRef ? { styleRef: filters.styleRef } : {}),
    },
    include: {
      daily: true,
    },
  });

  // Convert to StylePlanRow format
  const rows: StylePlanRow[] = plans.map(p => {
    const dailyMap: Record<string, number> = {};
    p.daily.forEach(d => {
      dailyMap[d.dateString] = d.quantity;
    });

    return {
      id: p.id,
      unit: p.unitCode,
      line: p.lineName || "",
      manpower: p.manpower,
      styleRef: p.styleRef,
      article: p.article,
      buyer: p.buyer,
      type: p.type,
      smv: p.smv,
      orderQty: p.orderQty,
      planQty: p.planQty,
      psd: p.psd,
      daily: dailyMap,
    };
  });

  // 4. Fetch Direct SAH Recaps
  const sahDirectRecords = await prisma.lineDailySAH.findMany({
    where: { importId },
  });
  const sahDirect: DirectRecapMap = {};
  sahDirectRecords.forEach(r => {
    if (!sahDirect[r.unitId]) sahDirect[r.unitId] = {};
    // Map with both unitId and unitCode if available
    const uCode = units.find(u => u.id === r.unitId)?.code || r.unitId;
    if (!sahDirect[uCode]) sahDirect[uCode] = {};
    if (!sahDirect[uCode][r.lineName]) sahDirect[uCode][r.lineName] = {};
    sahDirect[uCode][r.lineName][r.dateString] = r.sah;
  });

  // 5. Fetch Direct Machine HR Recaps
  const mhDirectRecords = await prisma.lineDailyMachineHour.findMany({
    where: { importId },
  });
  const machineHourDirect: DirectRecapMap = {};
  mhDirectRecords.forEach(r => {
    const uCode = units.find(u => u.id === r.unitId)?.code || r.unitId;
    if (!machineHourDirect[uCode]) machineHourDirect[uCode] = {};
    if (!machineHourDirect[uCode][r.lineName]) machineHourDirect[uCode][r.lineName] = {};
    machineHourDirect[uCode][r.lineName][r.dateString] = r.machineHour;
  });

  // 6. Date Keys
  const dateKeys = excelImport.dateKeys && excelImport.dateKeys.length > 0
    ? excelImport.dateKeys
    : Array.from(
        new Set(
          plans.flatMap(p => p.daily.map(d => d.dateString))
        )
      ).sort();

  // 7. Execute Central Calculation Engine
  const report = generateFullReportDTO({
    importId,
    fileName: excelImport.fileName,
    rows,
    dateKeys,
    sahDirect,
    machineHourDirect,
    capacities,
    unitShiftHours,
  });

  const runningLines = computeRunningLines(rows, dateKeys, capacities);
  const changeOver = computeChangeOver(rows, dateKeys);
  const lineDetail = computeLineDetail(rows, dateKeys, sahDirect, machineHourDirect, unitShiftHours);

  return {
    report,
    runningLines,
    changeOver,
    lineDetail,
    rawRows: rows,
  };
}

export async function getCalculationAudit(params: {
  importId?: string;
  metric: 'sah' | 'planPCS' | 'machineHour' | 'workingHour' | 'efficiency';
  unit?: string;
  line?: string;
  dateKey?: string;
}): Promise<CalculationAuditDetail | null> {
  const data = await getProductionReportData({ importId: params.importId });
  if (!data) return null;

  return traceMetricCalculation({
    metric: params.metric,
    unit: params.unit,
    line: params.line,
    dateKey: params.dateKey,
    rows: data.rawRows,
  });
}
