import * as XLSX from 'xlsx';
import crypto from 'crypto';
import prisma from '@/lib/prisma';

export interface ExcelImportResult {
  success: boolean;
  batchId?: string;
  totalRows: number;
  importedRows: number;
  skippedRows: number;
  linesCount: number;
  buyersCount: number;
  dailyCount: number;
  errors: string[];
  message: string;
  verification?: any;
}

// ===== COLUMN INDEX CONSTANTS (verified from deep audit) =====
const C = {
  LINE: 0,
  MANPOWER: 1,
  UNIT: 2,
  ORDER_STATUS: 3,
  BUYER: 4,
  ORDER_CODE: 5,
  OCS: 6,
  SUB_OC: 7,
  STYLE_REF: 8,
  ENGAGE: 9,
  ORDER_DEPT: 10,
  LEAD_MM: 11,
  MERCHANT: 12,
  ARTICLE: 13,
  SEASON: 14,
  PO_NO: 15,
  COLOR: 16,
  ODR_QTY: 17,
  SMV: 18,
  MAIN_CAT: 19,
  SUB_CAT: 20,
  TYPE: 21,
  OTT: 22,
  REV_OTT: 23,
  PCD: 24,
  PSD: 25,
  PFD: 26,
  EX_FAC: 27,
  REV_DEL: 28,
  O_CREATED: 29,
  FOB: 30,
  SALES_VAL: 31,
  WORK_DAYS: 32,
  PLAN_DAY_LABEL: 33,
  PLAN_QTY: 34,
  DATE_START: 35,
  DATE_END: 65,
};

// ===== HELPER FUNCTIONS =====

function normalizeUnitCode(rawUnit: string, lineName: string): string {
  const unit = (rawUnit || '').trim();
  const line = (lineName || '').trim();

  if (unit === 'B1U2' || unit === 'U02') return 'U02';
  if (unit === 'B1U3' || unit === 'U03') return 'U03';
  if (unit === 'B1U4' || unit === 'U04') return 'U04';
  if (unit === 'B2' || unit.startsWith('B2')) return 'B2';

  if (line.startsWith('U02')) return 'U02';
  if (line.startsWith('U03')) return 'U03';
  if (line.startsWith('U04')) return 'U04';
  if (line.startsWith('B2')) return 'B2';

  return 'U02';
}

function safeStr(val: any): string | null {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  return s.length > 0 ? s : null;
}

function safeInt(val: any, fallback = 0): number {
  if (val === null || val === undefined || val === '') return fallback;
  const n = Number(val);
  return isNaN(n) ? fallback : Math.round(n);
}

function safeFloat(val: any, fallback = 0): number {
  if (val === null || val === undefined || val === '') return fallback;
  const n = Number(val);
  return isNaN(n) ? fallback : Number(n.toFixed(4));
}

function parseExcelDate(val: any): Date | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number' && val > 30000 && val < 60000) {
    const d = XLSX.SSF.parse_date_code(val);
    return new Date(Date.UTC(d.y, d.m - 1, d.d));
  }
  if (val instanceof Date) return val;
  const parsed = new Date(val);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function isOrderItemRow(row: any[]): boolean {
  const buyer = safeStr(row[C.BUYER]);
  const orderCode = safeStr(row[C.ORDER_CODE]);
  const styleRef = safeStr(row[C.STYLE_REF]);
  return !!(buyer && orderCode && styleRef);
}

function isSubtotalRow(row: any[]): boolean {
  const label = safeStr(row[C.PLAN_DAY_LABEL]);
  return label === 'Plan/Day' || label === 'SAH' || label === 'Machine HR' || label === 'Effi. plan/D';
}

function getSubtotalType(row: any[]): string | null {
  const label = safeStr(row[C.PLAN_DAY_LABEL]);
  if (label === 'Plan/Day') return 'PLAN';
  if (label === 'SAH') return 'SAH';
  if (label === 'Machine HR') return 'CLOCK_HOURS';
  if (label === 'Effi. plan/D') return 'EFFICIENCY';
  return null;
}

export async function parseAndImportExcel(buffer: Buffer, fileName: string): Promise<ExcelImportResult> {
  const errors: string[] = [];
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames.includes('Birichina') ? 'Birichina' : workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      throw new Error(`Sheet "${sheetName}" not found in uploaded file.`);
    }

    const allRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
    if (allRows.length < 2) {
      throw new Error('Excel file has no data rows.');
    }

    const headerRow = allRows[0];
    const dataRows = allRows.slice(1);

    // ===== 1. PARSE DATE COLUMNS =====
    const dateColumns: { colIndex: number; dateStr: string; date: Date }[] = [];
    for (let c = C.DATE_START; c <= Math.min(C.DATE_END, headerRow.length - 1); c++) {
      const val = headerRow[c];
      if (typeof val === 'number' && val > 40000 && val < 50000) {
        const d = XLSX.SSF.parse_date_code(val);
        const dateStr = `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
        dateColumns.push({
          colIndex: c,
          dateStr,
          date: new Date(Date.UTC(d.y, d.m - 1, d.d))
        });
      }
    }

    if (dateColumns.length === 0) {
      throw new Error('No date columns found in the Excel file (expected serial numbers in columns 35+).');
    }

    const month = dateColumns[0].dateStr.substring(0, 7);

    // ===== 2. CLASSIFY EVERY ROW =====
    const orderItemRows: { rowIndex: number; row: any[]; lineName: string }[] = [];
    const lineSubtotals: Record<string, Record<string, any[]>> = {};
    let currentLineName: string | null = null;

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      if (!row || row.every((c: any) => c === null || c === undefined)) continue;

      const lineName = safeStr(row[C.LINE]);
      if (lineName && /^[UB]/.test(lineName)) {
        currentLineName = lineName;
      }

      if (isOrderItemRow(row)) {
        orderItemRows.push({ rowIndex: i, row, lineName: currentLineName || lineName || '' });
      } else if (isSubtotalRow(row)) {
        const type = getSubtotalType(row);
        const ln = currentLineName || lineName;
        if (ln && type) {
          if (!lineSubtotals[ln]) lineSubtotals[ln] = {};
          lineSubtotals[ln][type] = row;
        }
      }
    }

    // ===== 3. SETUP UNITS =====
    const unitMap = new Map<string, string>();
    const unitDefs = [
      { code: 'U02', name: 'Unit 02 (B1U2)' },
      { code: 'U03', name: 'Unit 03 (B1U3)' },
      { code: 'U04', name: 'Unit 04 (B1U4)' },
      { code: 'B2',  name: 'Unit B2' }
    ];

    for (const u of unitDefs) {
      let unit = await prisma.unit.findUnique({ where: { code: u.code } });
      if (!unit) {
        unit = await prisma.unit.create({
          data: { id: crypto.randomUUID(), code: u.code, name: u.name }
        });
      }
      unitMap.set(u.code, unit.id);
    }

    // ===== 4. BATCH CREATION =====
    const batchId = crypto.randomUUID();
    await prisma.importBatch.create({
      data: {
        id: batchId,
        fileName,
        fileSize: buffer.length,
        month,
        totalRows: dataRows.length,
        status: 'PROCESSING'
      }
    });

    // ===== 5. EXTRACT LINES & BUYERS =====
    const lineDefMap = new Map<string, any>();
    const buyerDefMap = new Map<string, any>();

    for (const { row, lineName } of orderItemRows) {
      const ln = lineName || safeStr(row[C.LINE]) || '';
      if (!ln) continue;

      const buyerRaw = safeStr(row[C.BUYER]);
      const manpowerRaw = row[C.MANPOWER];
      const unitRaw = safeStr(row[C.UNIT]) || '';

      if (!lineDefMap.has(ln)) {
        const unitCode = normalizeUnitCode(unitRaw, ln);
        const unitId = unitMap.get(unitCode) || unitMap.get('U02')!;
        lineDefMap.set(ln, {
          id: crypto.randomUUID(),
          name: ln,
          unitId,
          unitCode,
          manpower: (typeof manpowerRaw === 'number' && manpowerRaw > 0) ? manpowerRaw : 25,
          workingHours: 10.0,
          status: 'ACTIVE'
        });
      }

      if (buyerRaw && !buyerDefMap.has(buyerRaw)) {
        buyerDefMap.set(buyerRaw, { id: crypto.randomUUID(), name: buyerRaw });
      }
    }

    // Upsert Lines & Buyers
    for (const line of lineDefMap.values()) {
      const existing = await prisma.productionLine.findUnique({ where: { name: line.name } });
      if (existing) {
        line.id = existing.id;
      } else {
        await prisma.productionLine.create({ data: line });
      }
    }

    for (const buyer of buyerDefMap.values()) {
      const existing = await prisma.buyer.findUnique({ where: { name: buyer.name } });
      if (existing) {
        buyer.id = existing.id;
      } else {
        await prisma.buyer.create({ data: buyer });
      }
    }

    // ===== 6. CREATE ORDERS (from order item rows only) =====
    const ordersToInsert: any[] = [];
    let totalPlanQty = 0;
    let totalOdrQty = 0;

    for (const { row, lineName } of orderItemRows) {
      const ln = lineName || safeStr(row[C.LINE]) || '';
      const buyerRaw = safeStr(row[C.BUYER]);
      if (!ln || !buyerRaw) continue;

      const lineObj = lineDefMap.get(ln);
      const buyerObj = buyerDefMap.get(buyerRaw);
      if (!lineObj || !buyerObj) continue;

      const orderCode = safeStr(row[C.ORDER_CODE]) || `ORD-${ln}-UNKNOWN`;
      const odrQty = safeInt(row[C.ODR_QTY], 0);
      const planQty = safeInt(row[C.PLAN_QTY], 0);
      const smv = safeFloat(row[C.SMV], 2.5);

      totalPlanQty += planQty;
      totalOdrQty += odrQty;

      ordersToInsert.push({
        id: crypto.randomUUID(),
        orderCode,
        ocs: safeStr(row[C.OCS]),
        subOc: safeStr(row[C.SUB_OC]),
        buyerId: buyerObj.id,
        buyerName: buyerRaw,
        unitId: lineObj.unitId,
        unitCode: lineObj.unitCode,
        lineId: lineObj.id,
        lineName: ln,
        styleRef: safeStr(row[C.STYLE_REF]) || 'N/A',
        article: safeStr(row[C.ARTICLE]),
        season: safeStr(row[C.SEASON]) || 'N/A',
        poNo: safeStr(row[C.PO_NO]),
        color: safeStr(row[C.COLOR]),
        orderQty: odrQty,
        planQty,
        smv,
        mainCategory: safeStr(row[C.MAIN_CAT]) || null,
        subCategory: safeStr(row[C.SUB_CAT]) || null,
        productType: safeStr(row[C.TYPE]) || null,
        orderStatus: safeStr(row[C.ORDER_STATUS]) || 'Confirmed',
        ott: parseExcelDate(row[C.OTT]),
        revisedOtt: parseExcelDate(row[C.REV_OTT]),
        pcd: parseExcelDate(row[C.PCD]),
        psd: parseExcelDate(row[C.PSD]),
        pfd: parseExcelDate(row[C.PFD]),
        exFactory: parseExcelDate(row[C.EX_FAC]),
        revisedDelivery: parseExcelDate(row[C.REV_DEL]),
        orderCreatedDate: parseExcelDate(row[C.O_CREATED]),
        fobPrice: safeFloat(row[C.FOB], 0),
        salesValue: safeFloat(row[C.SALES_VAL], 0),
        leadMerchant: safeStr(row[C.LEAD_MM]),
        orderDept: safeStr(row[C.ORDER_DEPT]),
        importBatchId: batchId
      });
    }

    // ===== 7. CREATE DAILY RECORDS (from Plan/Day subtotal rows) =====
    const dailyRecordsToInsert: any[] = [];

    // Build map: lineName -> first order
    const lineFirstOrderMap = new Map<string, any>();
    for (const order of ordersToInsert) {
      if (!lineFirstOrderMap.has(order.lineName)) {
        lineFirstOrderMap.set(order.lineName, order);
      }
    }

    for (const [lineName, subtotals] of Object.entries(lineSubtotals)) {
      const lineObj = lineDefMap.get(lineName);
      if (!lineObj) continue;

      const planRow = subtotals.PLAN;
      const sahRow = subtotals.SAH;
      const clockRow = subtotals.CLOCK_HOURS;
      const effRow = subtotals.EFFICIENCY;

      if (!planRow) continue;

      const firstOrder = lineFirstOrderMap.get(lineName);
      if (!firstOrder) continue;

      const buyerObj = buyerDefMap.get(firstOrder.buyerName);
      if (!buyerObj) continue;

      for (const dc of dateColumns) {
        const targetQty = safeInt(planRow[dc.colIndex], 0);
        if (targetQty <= 0) continue;

        const targetSah = safeFloat(sahRow ? sahRow[dc.colIndex] : 0, 0);
        const clockHours = safeFloat(clockRow ? clockRow[dc.colIndex] : 0, 0);
        const efficiency = safeFloat(effRow ? effRow[dc.colIndex] : 0, 0);

        const smv = firstOrder.smv || 2.5;
        const plannedEfficiency = efficiency * 100;

        dailyRecordsToInsert.push({
          id: crypto.randomUUID(),
          date: dc.date,
          dateString: dc.dateStr,
          month,
          orderId: firstOrder.id,
          lineId: lineObj.id,
          unitId: lineObj.unitId,
          buyerId: buyerObj.id,
          targetQty,
          actualQty: 0,
          gap: targetQty,
          smv,
          targetSah: targetSah > 0 ? targetSah : Number(((targetQty * smv) / 60).toFixed(2)),
          actualSah: 0,
          clockHours: clockHours > 0 ? clockHours : (lineObj.manpower || 25) * 10,
          efficiency: 0,
          plannedEfficiency: plannedEfficiency > 0 ? Number(plannedEfficiency.toFixed(2)) : 0,
          achievementRate: 0,
          manpower: lineObj.manpower || 25,
          importBatchId: batchId
        });
      }
    }

    // ===== 8. BULK INSERT =====
    const chunkSize = 500;
    for (let i = 0; i < ordersToInsert.length; i += chunkSize) {
      await prisma.order.createMany({ data: ordersToInsert.slice(i, i + chunkSize) });
    }

    for (let i = 0; i < dailyRecordsToInsert.length; i += chunkSize) {
      await prisma.productionDaily.createMany({ data: dailyRecordsToInsert.slice(i, i + chunkSize) });
    }

    // ===== 9. UPDATE UNIT METRICS =====
    for (const [code, unitId] of unitMap.entries()) {
      const linesCount = await prisma.productionLine.count({ where: { unitId } });
      const lineAgg = await prisma.productionLine.aggregate({
        where: { unitId },
        _sum: { manpower: true }
      });
      await prisma.unit.update({
        where: { id: unitId },
        data: {
          totalLines: linesCount,
          totalManpower: lineAgg._sum.manpower || 0
        }
      });
    }

    // ===== 10. VERIFICATION =====
    const [dbOrdersCount, dbDailyCount, dbDailyAgg, dbLineStats, dbDates] = await Promise.all([
      prisma.order.count({ where: { importBatchId: batchId } }),
      prisma.productionDaily.count({ where: { importBatchId: batchId } }),
      prisma.productionDaily.aggregate({
        where: { importBatchId: batchId },
        _sum: {
          targetQty: true,
          actualQty: true,
          gap: true,
          targetSah: true,
          actualSah: true,
          clockHours: true
        }
      }),
      prisma.productionDaily.groupBy({
        by: ['lineId', 'unitId'],
        where: { importBatchId: batchId },
        _sum: { targetQty: true, actualQty: true }
      }),
      prisma.productionDaily.findMany({
        where: { importBatchId: batchId },
        distinct: ['dateString'],
        select: { dateString: true }
      })
    ]);

    const lineIds = dbLineStats.map(l => l.lineId);
    const dbLines = await prisma.productionLine.findMany({
      where: { id: { in: lineIds } }
    });

    const unitBreakdown: Record<string, number> = {};
    dbLines.forEach(l => {
      unitBreakdown[l.unitCode] = (unitBreakdown[l.unitCode] || 0) + 1;
    });

    const dbPlannedQty = dbDailyAgg._sum.targetQty || 0;
    const dbTargetSah = dbDailyAgg._sum.targetSah || 0;

    const checks = [
      {
        name: 'Order Count',
        status: dbOrdersCount === ordersToInsert.length ? 'PASSED' : 'FAILED',
        expected: ordersToInsert.length,
        actual: dbOrdersCount,
      },
      {
        name: 'Daily Records Count',
        status: dbDailyCount === dailyRecordsToInsert.length ? 'PASSED' : 'FAILED',
        expected: dailyRecordsToInsert.length,
        actual: dbDailyCount,
      },
      {
        name: 'Physical Lines',
        status: dbLines.length === lineDefMap.size ? 'PASSED' : 'FAILED',
        expected: lineDefMap.size,
        actual: dbLines.length,
      },
      {
        name: 'Planned Quantity',
        status: dbPlannedQty > 0 ? 'PASSED' : 'FAILED',
        expected: `${totalPlanQty.toLocaleString()} pcs (order-level)`,
        actual: `${dbPlannedQty.toLocaleString()} pcs (daily-level)`,
      },
      {
        name: 'Production Dates',
        status: dbDates.length > 0 ? 'PASSED' : 'FAILED',
        expected: `${dateColumns.length} days`,
        actual: `${dbDates.length} days`,
      }
    ];

    const allPassed = checks.every(c => c.status === 'PASSED');

    const verification = {
      passed: allPassed,
      checksPassed: checks.filter(c => c.status === 'PASSED').length,
      totalChecks: checks.length,
      checks,
      dbPlannedQty,
      dbTargetSah,
      dbOrdersCount,
      dbDailyRecordsCount: dbDailyCount,
      dbLinesCount: dbLines.length,
      unitBreakdown,
      datesCount: dbDates.length,
      totalOdrQty,
      totalPlanQty,
      verifiedAt: new Date().toISOString()
    };

    await prisma.importBatch.update({
      where: { id: batchId },
      data: {
        importedRows: dbOrdersCount,
        status: allPassed ? 'SUCCESS' : 'WARNING',
        summary: JSON.stringify(verification)
      }
    });

    return {
      success: allPassed,
      batchId,
      totalRows: dataRows.length,
      importedRows: dbOrdersCount,
      skippedRows: dataRows.length - orderItemRows.length,
      linesCount: dbLines.length,
      buyersCount: buyerDefMap.size,
      dailyCount: dbDailyCount,
      errors,
      message: `Imported ${dbOrdersCount.toLocaleString()} orders and ${dbDailyCount.toLocaleString()} daily records across ${dbLines.length} lines. Plan QTY: ${totalPlanQty.toLocaleString()} pcs.`,
      verification
    };
  } catch (err: any) {
    errors.push(err.message || 'Unknown import error');
    return {
      success: false,
      totalRows: 0,
      importedRows: 0,
      skippedRows: 0,
      linesCount: 0,
      buyersCount: 0,
      dailyCount: 0,
      errors,
      message: err.message || 'Failed to import Excel file'
    };
  }
}

export function exportDataToExcel(records: any[], title: string = 'Production_Report'): Buffer {
  const worksheet = XLSX.utils.json_to_sheet(records);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}
