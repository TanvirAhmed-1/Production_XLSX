import prisma from '@/lib/prisma';

export interface FilterParams {
  month?: string;
  batchId?: string;
  startDate?: string;
  endDate?: string;
  unitCode?: string;
  lineName?: string;
  buyerName?: string;
  styleRef?: string;
  season?: string;
  orderStatus?: string;
  search?: string;
}

export function buildWhereClause(filters: FilterParams) {
  const where: any = {};

  if (filters.batchId && filters.batchId !== 'ALL') {
    where.importBatchId = filters.batchId;
  }

  if (filters.month && filters.month !== 'ALL') {
    where.month = filters.month;
  }

  if (filters.startDate || filters.endDate) {
    where.dateString = {};
    if (filters.startDate) where.dateString.gte = filters.startDate;
    if (filters.endDate) where.dateString.lte = filters.endDate;
  }

  if (filters.unitCode && filters.unitCode !== 'ALL') {
    where.unit = { code: filters.unitCode };
  }

  if (filters.lineName && filters.lineName !== 'ALL') {
    where.line = { name: filters.lineName };
  }

  if (filters.buyerName && filters.buyerName !== 'ALL') {
    where.buyer = { name: filters.buyerName };
  }

  if (filters.styleRef) {
    where.order = { ...where.order, styleRef: { contains: filters.styleRef, mode: 'insensitive' } };
  }

  if (filters.season && filters.season !== 'ALL') {
    where.order = { ...where.order, season: filters.season };
  }

  if (filters.orderStatus && filters.orderStatus !== 'ALL') {
    where.order = { ...where.order, orderStatus: filters.orderStatus };
  }

  return where;
}

export async function getDashboardData(filters: FilterParams = {}) {
  const where = buildWhereClause(filters);

  // 1. Overall Totals and Aggregations
  const dailyAgg = await prisma.productionDaily.aggregate({
    where,
    _sum: {
      targetQty: true,
      actualQty: true,
      gap: true,
      targetSah: true,
      actualSah: true,
      clockHours: true,
      manpower: true
    },
    _avg: {
      efficiency: true,
      achievementRate: true
    },
    _count: {
      id: true
    }
  });

  const totalPlannedProduction = dailyAgg._sum.targetQty || 0;
  const totalActualProduction = dailyAgg._sum.actualQty || 0;
  const totalGap = dailyAgg._sum.gap || 0;
  const totalTargetSah = dailyAgg._sum.targetSah || 0;
  const totalActualSah = dailyAgg._sum.actualSah || 0;
  const totalClockHours = dailyAgg._sum.clockHours || 0;
  const averageEfficiency = totalClockHours > 0 ? Number(((totalActualSah / totalClockHours) * 100).toFixed(1)) : 0;
  const targetAchievementRate = totalPlannedProduction > 0 ? Number(((totalActualProduction / totalPlannedProduction) * 100).toFixed(1)) : 0;

  // Order Counts & Order Qty
  const orderWhere: any = {};
  if (filters.batchId && filters.batchId !== 'ALL') orderWhere.importBatchId = filters.batchId;
  if (filters.unitCode && filters.unitCode !== 'ALL') orderWhere.unitCode = filters.unitCode;
  if (filters.lineName && filters.lineName !== 'ALL') orderWhere.lineName = filters.lineName;
  if (filters.buyerName && filters.buyerName !== 'ALL') orderWhere.buyerName = filters.buyerName;
  if (filters.season && filters.season !== 'ALL') orderWhere.season = filters.season;

  const orderAgg = await prisma.order.aggregate({
    where: orderWhere,
    _sum: { orderQty: true, planQty: true },
    _count: { id: true }
  });

  const totalOrderQty = orderAgg._sum.orderQty || 0;
  const totalOrders = orderAgg._count.id || 0;

  // Unique active lines & dynamic active manpower
  const linesCountAgg = await prisma.productionDaily.groupBy({
    by: ['lineId'],
    where,
  });
  const activeLineIds = linesCountAgg.map(l => l.lineId).filter(Boolean);
  const totalActiveLines = activeLineIds.length;

  let totalManpower = 0;
  if (totalActiveLines > 0) {
    const activeLines = await prisma.productionLine.findMany({
      where: { id: { in: activeLineIds } },
      select: { manpower: true }
    });
    totalManpower = activeLines.reduce((acc, l) => acc + (l.manpower || 25), 0);
  }

  const linesManpowerAgg = await prisma.productionLine.aggregate({
    where: filters.unitCode && filters.unitCode !== 'ALL' ? { unitCode: filters.unitCode } : {},
    _sum: { manpower: true },
    _count: { id: true }
  });
  const totalRegisteredLines = linesManpowerAgg._count.id || 0;

  // 2. Line Performance & Rankings
  const lineStats = await prisma.productionDaily.groupBy({
    by: ['lineId'],
    where,
    _sum: {
      targetQty: true,
      actualQty: true,
      gap: true,
      targetSah: true,
      actualSah: true,
      clockHours: true
    },
    _count: { id: true }
  });

  const lineIds = lineStats.map(s => s.lineId);
  const linesInfo = await prisma.productionLine.findMany({
    where: { id: { in: lineIds } },
    include: { unit: true }
  });
  const linesInfoMap = new Map(linesInfo.map(l => [l.id, l]));

  const linePerformanceList = lineStats.map(stat => {
    const line = linesInfoMap.get(stat.lineId);
    const target = stat._sum.targetQty || 0;
    const actual = stat._sum.actualQty || 0;
    const gap = stat._sum.gap || 0;
    const actSah = stat._sum.actualSah || 0;
    const clkHrs = stat._sum.clockHours || 0;
    const eff = clkHrs > 0 ? Number(((actSah / clkHrs) * 100).toFixed(1)) : 0;
    const ach = target > 0 ? Number(((actual / target) * 100).toFixed(1)) : 0;

    return {
      lineId: stat.lineId,
      lineName: line?.name || 'Unknown',
      unitCode: line?.unitCode || 'U02',
      unitName: line?.unit?.name || 'Unit',
      manpower: line?.manpower || 25,
      target,
      actual,
      gap,
      sah: actSah,
      efficiency: eff,
      achievementRate: ach,
      status: eff >= 85 ? 'HIGH' : eff >= 70 ? 'NORMAL' : eff >= 60 ? 'NEEDS_ATTENTION' : 'LOW'
    };
  });

  linePerformanceList.sort((a, b) => b.efficiency - a.efficiency);

  const topLines = linePerformanceList.slice(0, 5);
  const lowestLines = [...linePerformanceList].reverse().slice(0, 5);

  const highestLineEfficiency = linePerformanceList[0]?.efficiency || 0;
  const lowestLineEfficiency = linePerformanceList[linePerformanceList.length - 1]?.efficiency || 0;

  // 3. Efficiency Trend by Date
  const dateTrendStats = await prisma.productionDaily.groupBy({
    by: ['dateString'],
    where,
    _sum: {
      targetQty: true,
      actualQty: true,
      targetSah: true,
      actualSah: true,
      clockHours: true,
      gap: true
    },
    orderBy: { dateString: 'asc' }
  });

  const efficiencyTrend = dateTrendStats.map(d => {
    const actSah = d._sum.actualSah || 0;
    const clkHrs = d._sum.clockHours || 0;
    const target = d._sum.targetQty || 0;
    const actual = d._sum.actualQty || 0;
    return {
      date: d.dateString,
      shortDate: d.dateString.substring(5), // "10-01"
      target,
      actual,
      gap: d._sum.gap || 0,
      targetSah: d._sum.targetSah || 0,
      actualSah: actSah,
      efficiency: clkHrs > 0 ? Number(((actSah / clkHrs) * 100).toFixed(1)) : 0,
      achievementRate: target > 0 ? Number(((actual / target) * 100).toFixed(1)) : 0
    };
  });

  // 4. Unit-wise Performance
  const unitStats = await prisma.productionDaily.groupBy({
    by: ['unitId'],
    where,
    _sum: {
      targetQty: true,
      actualQty: true,
      gap: true,
      targetSah: true,
      actualSah: true,
      clockHours: true
    }
  });

  const unitIds = unitStats.map(u => u.unitId);
  const unitsInfo = await prisma.unit.findMany({
    where: { id: { in: unitIds } }
  });
  const unitsInfoMap = new Map(unitsInfo.map(u => [u.id, u]));

  const unitPerformance = unitStats.map(u => {
    const unit = unitsInfoMap.get(u.unitId);
    const target = u._sum.targetQty || 0;
    const actual = u._sum.actualQty || 0;
    const actSah = u._sum.actualSah || 0;
    const clkHrs = u._sum.clockHours || 0;
    const eff = clkHrs > 0 ? Number(((actSah / clkHrs) * 100).toFixed(1)) : 0;
    const ach = target > 0 ? Number(((actual / target) * 100).toFixed(1)) : 0;

    return {
      unitId: u.unitId,
      unitCode: unit?.code || 'U02',
      unitName: unit?.name || 'Unit',
      totalLines: unit?.totalLines || 0,
      totalManpower: unit?.totalManpower || 0,
      target,
      actual,
      gap: u._sum.gap || 0,
      sah: actSah,
      efficiency: eff,
      achievementRate: ach
    };
  });
  unitPerformance.sort((a, b) => b.actual - a.actual);

  // 5. Buyer Performance
  const buyerStats = await prisma.productionDaily.groupBy({
    by: ['buyerId'],
    where,
    _sum: {
      targetQty: true,
      actualQty: true,
      gap: true,
      targetSah: true,
      actualSah: true,
      clockHours: true
    }
  });

  const buyerIds = buyerStats.map(b => b.buyerId);
  const buyersInfo = await prisma.buyer.findMany({
    where: { id: { in: buyerIds } }
  });
  const buyersInfoMap = new Map(buyersInfo.map(b => [b.id, b]));

  const buyerPerformance = buyerStats.map(b => {
    const buyer = buyersInfoMap.get(b.buyerId);
    const target = b._sum.targetQty || 0;
    const actual = b._sum.actualQty || 0;
    const actSah = b._sum.actualSah || 0;
    const clkHrs = b._sum.clockHours || 0;
    const eff = clkHrs > 0 ? Number(((actSah / clkHrs) * 100).toFixed(1)) : 0;
    const ach = target > 0 ? Number(((actual / target) * 100).toFixed(1)) : 0;

    return {
      buyerId: b.buyerId,
      buyerName: buyer?.name || 'Unknown',
      target,
      actual,
      gap: b._sum.gap || 0,
      sah: actSah,
      efficiency: eff,
      achievementRate: ach
    };
  });
  buyerPerformance.sort((a, b) => b.actual - a.actual);

  // 6. Alerts & Attention Required
  const settings = await getSettings();
  const lowThreshold = Number(settings.lowEfficiencyThreshold || 60);

  const lowPerformingLines = linePerformanceList.filter(l => l.efficiency < lowThreshold);
  const linesWithLargeGaps = [...linePerformanceList].sort((a, b) => b.gap - a.gap).slice(0, 5);

  return {
    kpis: {
      totalOrderQty,
      totalOrders,
      totalPlannedProduction,
      totalActualProduction,
      totalGap,
      averageEfficiency,
      highestLineEfficiency,
      lowestLineEfficiency,
      totalActiveLines,
      totalRegisteredLines,
      totalManpower,
      totalSAH: totalActualSah,
      targetSAH: totalTargetSah,
      targetAchievementRate,
      status: averageEfficiency >= 80 ? 'EXCELLENT' : averageEfficiency >= 65 ? 'GOOD' : 'ATTENTION_NEEDED'
    },
    topLines,
    lowestLines,
    linePerformance: linePerformanceList,
    efficiencyTrend,
    unitPerformance,
    buyerPerformance,
    alerts: {
      lowPerformingLinesCount: lowPerformingLines.length,
      lowPerformingLines: lowPerformingLines.slice(0, 10),
      linesWithLargeGaps,
      lowThreshold
    }
  };
}

export async function getFilterOptions() {
  const [units, lines, buyers, seasons, months, batches] = await Promise.all([
    prisma.unit.findMany({ select: { code: true, name: true } }),
    prisma.productionLine.findMany({ select: { name: true, unitCode: true }, orderBy: { name: 'asc' } }),
    prisma.buyer.findMany({ select: { name: true }, orderBy: { name: 'asc' } }),
    prisma.order.findMany({
      where: { season: { not: null } },
      distinct: ['season'],
      select: { season: true }
    }),
    prisma.productionDaily.findMany({
      distinct: ['month'],
      select: { month: true },
      orderBy: { month: 'desc' }
    }),
    prisma.importBatch.findMany({
      select: { id: true, fileName: true, month: true, totalRows: true, createdAt: true },
      orderBy: { createdAt: 'desc' }
    })
  ]);

  return {
    units: units.map(u => ({ label: `${u.code} (${u.name})`, value: u.code })),
    lines: lines.map(l => ({ label: l.name, value: l.name, unit: l.unitCode })),
    buyers: buyers.map(b => ({ label: b.name, value: b.name })),
    seasons: seasons.map(s => ({ label: s.season!, value: s.season! })),
    months: months.map(m => ({ label: m.month, value: m.month })),
    batches: batches.map(b => ({
      label: `${b.fileName} (${b.month})`,
      value: b.id,
      month: b.month,
      fileName: b.fileName
    }))
  };
}

export async function getOrdersReport(filters: FilterParams = {}, page = 1, pageSize = 50) {
  const where: any = {};
  if (filters.batchId && filters.batchId !== 'ALL') where.importBatchId = filters.batchId;
  if (filters.unitCode && filters.unitCode !== 'ALL') where.unitCode = filters.unitCode;
  if (filters.lineName && filters.lineName !== 'ALL') where.lineName = filters.lineName;
  if (filters.buyerName && filters.buyerName !== 'ALL') where.buyerName = filters.buyerName;
  if (filters.season && filters.season !== 'ALL') where.season = filters.season;
  if (filters.orderStatus && filters.orderStatus !== 'ALL') where.orderStatus = filters.orderStatus;
  if (filters.search) {
    where.OR = [
      { orderCode: { contains: filters.search, mode: 'insensitive' } },
      { styleRef: { contains: filters.search, mode: 'insensitive' } },
      { poNo: { contains: filters.search, mode: 'insensitive' } },
      { color: { contains: filters.search, mode: 'insensitive' } },
      { article: { contains: filters.search, mode: 'insensitive' } }
    ];
  }

  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        dailyRecords: {
          select: { actualQty: true, targetQty: true, targetSah: true, actualSah: true }
        }
      },
      orderBy: { planQty: 'desc' }
    })
  ]);

  const rows = orders.map(ord => {
    const totalActual = ord.dailyRecords.reduce((acc, r) => acc + r.actualQty, 0);
    const totalTarget = ord.dailyRecords.reduce((acc, r) => acc + r.targetQty, 0);
    const remainingQty = Math.max(0, ord.orderQty - totalActual);
    const ach = totalTarget > 0 ? Number(((totalActual / totalTarget) * 100).toFixed(1)) : 0;
    
    let status = 'IN_PROGRESS';
    if (totalActual >= ord.orderQty) status = 'COMPLETED';
    else if (ach >= 90) status = 'ON_TRACK';
    else if (ach < 60) status = 'DELAYED';

    return {
      id: ord.id,
      orderCode: ord.orderCode,
      buyer: ord.buyerName,
      unit: ord.unitCode,
      line: ord.lineName,
      style: ord.styleRef,
      article: ord.article,
      poNo: ord.poNo,
      color: ord.color,
      season: ord.season,
      orderQty: ord.orderQty,
      planQty: ord.planQty,
      actualQty: totalActual,
      remainingQty,
      smv: ord.smv,
      achievementRate: ach,
      status,
      fobPrice: ord.fobPrice,
      salesValue: ord.salesValue
    };
  });

  return { total, page, pageSize, totalPages: Math.ceil(total / pageSize), data: rows };
}

export async function getSettings() {
  const settings = await prisma.systemSetting.findMany();
  const res: Record<string, string> = {
    lowEfficiencyThreshold: '60',
    mediumEfficiencyThreshold: '80',
    highEfficiencyThreshold: '100',
    defaultWorkingHours: '10'
  };
  settings.forEach(s => {
    res[s.key] = s.value;
  });
  return res;
}

export async function updateSettings(newSettings: Record<string, string>) {
  for (const [key, value] of Object.entries(newSettings)) {
    await prisma.systemSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value }
    });
  }
  return getSettings();
}
