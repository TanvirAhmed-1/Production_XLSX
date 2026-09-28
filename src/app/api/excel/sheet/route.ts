import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const batchId = searchParams.get('batchId');
    const month = searchParams.get('month') || '2026-10';
    const unitCode = searchParams.get('unitCode');
    const lineName = searchParams.get('lineName');
    const buyerName = searchParams.get('buyerName');
    const season = searchParams.get('season');
    const search = searchParams.get('search')?.trim();
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10);

    // Build filter
    const where: any = {};

    if (batchId && batchId !== 'ALL') {
      where.importBatchId = batchId;
    }
    if (unitCode && unitCode !== 'ALL') {
      where.unitCode = unitCode;
    }
    if (lineName && lineName !== 'ALL') {
      where.lineName = lineName;
    }
    if (buyerName && buyerName !== 'ALL') {
      where.buyerName = buyerName;
    }
    if (season && season !== 'ALL') {
      where.season = season;
    }
    if (search) {
      where.OR = [
        { styleRef: { contains: search, mode: 'insensitive' } },
        { poNo: { contains: search, mode: 'insensitive' } },
        { color: { contains: search, mode: 'insensitive' } },
        { buyerName: { contains: search, mode: 'insensitive' } },
        { lineName: { contains: search, mode: 'insensitive' } },
        { orderCode: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get total count
    const totalCount = await prisma.order.count({ where });

    // Fetch orders with pagination
    const orders = await prisma.order.findMany({
      where,
      include: {
        line: {
          select: {
            manpower: true,
            workingHours: true,
          }
        },
        dailyRecords: {
          where: month && month !== 'ALL' ? { month } : undefined,
          select: {
            dateString: true,
            targetQty: true,
            actualQty: true,
            efficiency: true,
            targetSah: true,
            actualSah: true,
          }
        }
      },
      orderBy: [
        { lineName: 'asc' },
        { buyerName: 'asc' },
        { planQty: 'desc' },
      ],
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    // Extract all distinct date columns available for this month
    const distinctDates = await prisma.productionDaily.findMany({
      where: month && month !== 'ALL' ? { month } : undefined,
      select: { dateString: true },
      distinct: ['dateString'],
      orderBy: { dateString: 'asc' },
    });

    const dateColumns = distinctDates.map(d => {
      const parts = d.dateString.split('-');
      const dayNum = parseInt(parts[2], 10);
      const dateObj = new Date(`${d.dateString}T00:00:00Z`);
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
      return {
        dateStr: d.dateString,
        dayNum,
        dayName,
        shortLabel: `${dayNum} (${dayName})`
      };
    });

    // Format rows for Excel grid
    const rows = orders.map((ord, idx) => {
      const dailyMap: Record<string, { target: number; actual: number; eff: number }> = {};
      let totalActual = 0;
      let totalTarget = 0;

      for (const d of ord.dailyRecords) {
        dailyMap[d.dateString] = {
          target: d.targetQty || 0,
          actual: d.actualQty || 0,
          eff: (d as any).efficiency || 0,
        };
        totalActual += d.actualQty || 0;
        totalTarget += d.targetQty || 0;
      }

      return {
        rowIndex: (page - 1) * pageSize + idx + 1,
        id: ord.id,
        lineName: ord.lineName || 'N/A',
        manpower: ord.line?.manpower || 25,
        unitCode: ord.unitCode,
        orderStatus: ord.orderStatus || 'Confirmed',
        buyerName: ord.buyerName,
        orderCode: ord.orderCode,
        ocs: ord.ocs || 'N/A',
        subOc: ord.subOc || 'N/A',
        styleRef: ord.styleRef || 'N/A',
        article: ord.article || 'N/A',
        season: ord.season || 'N/A',
        poNo: ord.poNo || 'N/A',
        color: ord.color || 'N/A',
        orderQty: ord.orderQty,
        smv: ord.smv,
        mainCategory: ord.mainCategory || 'UNDERWEAR',
        subCategory: ord.subCategory || 'BOXER',
        productType: ord.productType || 'P1',
        fobPrice: ord.fobPrice || 0,
        salesValue: ord.salesValue || 0,
        planQty: ord.planQty || totalTarget,
        actualQty: totalActual,
        gapQty: (ord.planQty || totalTarget) - totalActual,
        daily: dailyMap,
      };
    });

    // Extract unique line names from the paginated orders
    const uniqueLineNames = Array.from(new Set(orders.map(o => o.lineName).filter((l): l is string => Boolean(l))));

    // Fetch line summaries (ProductionDaily records without orderId)
    const lineSummaryRecords = await prisma.productionDaily.findMany({
      where: {
        orderId: null,
        month: month && month !== 'ALL' ? month : undefined,
        line: {
          name: { in: uniqueLineNames }
        }
      },
      include: {
        line: {
          select: { name: true }
        }
      }
    });

    const lineSummaries: Record<string, Record<string, any>> = {};
    for (const rec of lineSummaryRecords) {
      const lineData = (rec as any).line;
      if (!lineData) continue;
      const ln = lineData.name;
      if (!lineSummaries[ln]) {
        lineSummaries[ln] = {};
      }
      lineSummaries[ln][rec.dateString] = {
        targetQty: rec.targetQty,
        targetSah: rec.targetSah,
        clockHours: rec.clockHours,
        plannedEfficiency: rec.plannedEfficiency,
      };
    }

    // Calculate Summary Totals for visible rows & global metrics
    const summaryAgg = await prisma.order.aggregate({
      where,
      _sum: {
        orderQty: true,
        planQty: true,
      }
    });

    return NextResponse.json({
      success: true,
      month,
      page,
      pageSize,
      totalRows: totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
      dateColumns,
      rows,
      lineSummaries,
      summary: {
        totalOrderQty: summaryAgg._sum.orderQty || 0,
        totalPlanQty: summaryAgg._sum.planQty || 0,
      }
    });
  } catch (error: any) {
    console.error('Failed to load Excel sheet data:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
