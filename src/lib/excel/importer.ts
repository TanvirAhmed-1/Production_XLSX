import crypto from "crypto";
import { prisma } from "../prisma";
import { ParsedExcelResult } from "./parser";
import { UNIT_ORDER, UNIT_LABEL, UNIT_GROUP } from "../calculations/running-lines";

export interface ImportExecutionResult {
  importId: string;
  fileName: string;
  totalSheets: number;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  unitsCount: number;
  linesCount: number;
  stylesCount: number;
  datesCount: number;
  sahRecapFound: boolean;
  machineHrRecapFound: boolean;
  validationWarningsCount: number;
  status: "SUCCESS" | "FAILED";
  errorMessage?: string;
}

export async function importExcelToDatabase(
  parsed: ParsedExcelResult,
  originalFileName: string,
  fileSize: number = 0
): Promise<ImportExecutionResult> {
  // 1. Ensure Units exist in DB
  const unitCodeMap: Record<string, string> = {}; // unitCode -> unitId
  for (const u of UNIT_ORDER) {
    const existing = await prisma.unit.findUnique({ where: { code: u } });
    if (existing) {
      unitCodeMap[u] = existing.id;
    } else {
      const created = await prisma.unit.create({
        data: {
          code: u,
          name: UNIT_LABEL[u] || u,
          group: UNIT_GROUP[u] || "B1",
          shiftHours: 10.0,
          capacity: parsed.capacities[u] || 0,
        },
      });
      unitCodeMap[u] = created.id;
    }
  }

  // 2. Ensure Production Lines exist in DB
  const uniqueLines = Array.from(new Set(parsed.rows.map(r => `${r.unit}:::${r.line}`)));
  const lineKeyMap: Record<string, string> = {}; // "unitCode:::lineName" -> lineId

  for (const item of uniqueLines) {
    const [u, lineName] = item.split(":::");
    if (!lineName) continue;
    const unitId = unitCodeMap[u];
    if (!unitId) continue;

    const existing = await prisma.line.findUnique({
      where: { unitId_lineName: { unitId, lineName } },
    });
    if (existing) {
      lineKeyMap[item] = existing.id;
    } else {
      const created = await prisma.line.create({
        data: {
          unitId,
          lineName,
          manpower: parsed.rows.find(r => r.unit === u && r.line === lineName)?.manpower || 25,
          capacity: 1,
        },
      });
      lineKeyMap[item] = created.id;
    }
  }

  // 3. Create the ExcelImport Record
  const excelImport = await prisma.excelImport.create({
    data: {
      fileName: originalFileName,
      originalFileName,
      fileSize,
      status: "PROCESSING",
      totalSheets: parsed.totalSheets,
      totalRows: parsed.totalRows,
      validRows: parsed.validRows,
      invalidRows: parsed.invalidRows,
      month: parsed.month,
      dateKeys: parsed.dateKeys,
    },
  });

  const importId = excelImport.id;

  // 4. Batch Insert Production Plans & Dailies with pre-generated UUIDs
  const planDataList: Array<{
    id: string;
    importId: string;
    unitId: string;
    lineId: string | null;
    lineName: string | null;
    unitCode: string;
    styleRef: string;
    article: string | null;
    buyer: string;
    type: string | null;
    smv: number;
    orderQty: number;
    planQty: number;
    manpower: number;
  }> = [];

  const dailyDataList: Array<{
    id: string;
    productionPlanId: string;
    date: Date;
    dateString: string;
    quantity: number;
  }> = [];

  for (const r of parsed.rows) {
    const unitId = unitCodeMap[r.unit];
    if (!unitId) continue;
    const lineId = lineKeyMap[`${r.unit}:::${r.line}`] || null;
    const planId = crypto.randomUUID();

    planDataList.push({
      id: planId,
      importId,
      unitId,
      lineId,
      lineName: r.line || null,
      unitCode: r.unit,
      styleRef: r.styleRef,
      article: r.article || null,
      buyer: r.buyer,
      type: r.type || null,
      smv: r.smv,
      orderQty: r.orderQty,
      planQty: r.planQty,
      manpower: r.manpower,
    });

    for (const [dateStr, q] of Object.entries(r.daily || {})) {
      if (q > 0) {
        dailyDataList.push({
          id: crypto.randomUUID(),
          productionPlanId: planId,
          date: new Date(dateStr),
          dateString: dateStr,
          quantity: q,
        });
      }
    }
  }

  // Insert Plans in chunks of 500
  for (let i = 0; i < planDataList.length; i += 500) {
    await prisma.productionPlan.createMany({
      data: planDataList.slice(i, i + 500),
    });
  }

  // Insert Dailies in chunks of 1000
  for (let i = 0; i < dailyDataList.length; i += 1000) {
    await prisma.productionPlanDaily.createMany({
      data: dailyDataList.slice(i, i + 1000),
    });
  }

  // 5. Batch Insert Direct SAH Recaps
  const sahEntries: Array<{
    id: string;
    importId: string;
    unitId: string;
    lineId: string | null;
    lineName: string;
    date: Date;
    dateString: string;
    sah: number;
  }> = [];

  let sahRecapFound = false;
  for (const [u, lines] of Object.entries(parsed.sahDirect)) {
    const unitId = unitCodeMap[u];
    if (!unitId) continue;
    for (const [lineName, dates] of Object.entries(lines)) {
      const lineId = lineKeyMap[`${u}:::${lineName}`] || null;
      for (const [dateStr, val] of Object.entries(dates)) {
        if (typeof val === "number" && !isNaN(val)) {
          sahRecapFound = true;
          sahEntries.push({
            id: crypto.randomUUID(),
            importId,
            unitId,
            lineId,
            lineName,
            date: new Date(dateStr),
            dateString: dateStr,
            sah: val,
          });
        }
      }
    }
  }

  if (sahEntries.length > 0) {
    for (let i = 0; i < sahEntries.length; i += 1000) {
      await prisma.lineDailySAH.createMany({
        data: sahEntries.slice(i, i + 1000),
        skipDuplicates: true,
      });
    }
  }

  // 6. Batch Insert Direct Machine HR Recaps
  const mhEntries: Array<{
    id: string;
    importId: string;
    unitId: string;
    lineId: string | null;
    lineName: string;
    date: Date;
    dateString: string;
    machineHour: number;
  }> = [];

  let machineHrRecapFound = false;
  for (const [u, lines] of Object.entries(parsed.machineHourDirect)) {
    const unitId = unitCodeMap[u];
    if (!unitId) continue;
    for (const [lineName, dates] of Object.entries(lines)) {
      const lineId = lineKeyMap[`${u}:::${lineName}`] || null;
      for (const [dateStr, val] of Object.entries(dates)) {
        if (typeof val === "number" && !isNaN(val)) {
          machineHrRecapFound = true;
          mhEntries.push({
            id: crypto.randomUUID(),
            importId,
            unitId,
            lineId,
            lineName,
            date: new Date(dateStr),
            dateString: dateStr,
            machineHour: val,
          });
        }
      }
    }
  }

  if (mhEntries.length > 0) {
    for (let i = 0; i < mhEntries.length; i += 1000) {
      await prisma.lineDailyMachineHour.createMany({
        data: mhEntries.slice(i, i + 1000),
        skipDuplicates: true,
      });
    }
  }

  // 7. Insert Validation Errors/Warnings
  if (parsed.validationErrors.length > 0) {
    const errEntries = parsed.validationErrors.slice(0, 200).map(e => ({
      id: crypto.randomUUID(),
      importId,
      sheetName: e.sheetName,
      rowNumber: e.rowNumber,
      columnName: e.columnName || null,
      errorType: e.errorType,
      message: e.message,
      rawValue: e.rawValue || null,
    }));

    await prisma.importValidationError.createMany({
      data: errEntries,
    });
  }

  // 8. Update ExcelImport status to SUCCESS
  await prisma.excelImport.update({
    where: { id: importId },
    data: {
      status: "SUCCESS",
      processedAt: new Date(),
    },
  });

  return {
    importId,
    fileName: originalFileName,
    totalSheets: parsed.totalSheets,
    totalRows: parsed.totalRows,
    validRows: parsed.validRows,
    invalidRows: parsed.invalidRows,
    unitsCount: Object.keys(unitCodeMap).length,
    linesCount: uniqueLines.length,
    stylesCount: new Set(parsed.rows.map(r => r.styleRef)).size,
    datesCount: parsed.dateKeys.length,
    sahRecapFound,
    machineHrRecapFound,
    validationWarningsCount: parsed.validationErrors.length,
    status: "SUCCESS",
  };
}
