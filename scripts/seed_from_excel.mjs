import XLSX from 'xlsx';
import path from 'path';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seed() {
  console.log('Starting fast bulk Excel import and database seed...');
  const filePath = path.resolve('Birichina- Month of October Sign off Production Plan- 26th October.xlsx');
  const workbook = XLSX.readFile(filePath);
  
  const sheet = workbook.Sheets['Birichina'] || workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  console.log(`Loaded sheet with ${rows.length} rows`);
  
  const headerRow = rows[0];
  
  // Find date columns
  const dateColumns = [];
  for (let c = 35; c < headerRow.length; c++) {
    const val = headerRow[c];
    if (typeof val === 'number' && val > 40000 && val < 50000) {
      const d = XLSX.SSF.parse_date_code(val);
      const yyyy = d.y;
      const mm = String(d.m).padStart(2, '0');
      const dd = String(d.d).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      dateColumns.push({
        colIndex: c,
        serial: val,
        dateStr,
        date: new Date(Date.UTC(yyyy, d.m - 1, d.d, 0, 0, 0))
      });
    }
  }
  
  console.log(`Identified ${dateColumns.length} daily date columns`);

  // Clear existing records
  console.log('Clearing existing tables...');
  await prisma.productionDaily.deleteMany();
  await prisma.order.deleteMany();
  await prisma.productionLine.deleteMany();
  await prisma.buyer.deleteMany();
  await prisma.unit.deleteMany();
  await prisma.importBatch.deleteMany();

  // Create Units
  const unitMap = new Map();
  const rawUnits = [
    { code: 'U02', name: 'Unit 02 (B1U2)' },
    { code: 'U03', name: 'Unit 03 (B1U3)' },
    { code: 'U04', name: 'Unit 04 (B1U4)' },
    { code: 'B2', name: 'Unit B2' }
  ];
  
  for (const u of rawUnits) {
    const id = crypto.randomUUID();
    await prisma.unit.create({
      data: {
        id,
        code: u.code,
        name: u.name,
      }
    });
    unitMap.set(u.code, id);
  }

  function normalizeUnit(rawUnit, lineName) {
    if (!rawUnit && lineName) {
      if (lineName.startsWith('U02')) return 'U02';
      if (lineName.startsWith('U03')) return 'U03';
      if (lineName.startsWith('U04')) return 'U04';
      if (lineName.startsWith('B2')) return 'B2';
    }
    if (rawUnit === 'B1U2' || rawUnit === 'U02') return 'U02';
    if (rawUnit === 'B1U3' || rawUnit === 'U03') return 'U03';
    if (rawUnit === 'B1U4' || rawUnit === 'U04') return 'U04';
    if (rawUnit === 'B2' || rawUnit === 'B2  ') return 'B2';
    return 'U02';
  }

  // Pre-scan all Lines and Buyers
  const lineDefMap = new Map(); // lineName -> { id, unitId, unitCode, manpower }
  const buyerDefMap = new Map(); // buyerName -> { id, name }

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;
    const lineName = (row[0] || '').toString().trim();
    const manpowerRaw = row[1];
    const unitRaw = (row[2] || '').toString().trim();
    const buyerRaw = (row[4] || '').toString().trim();
    const col33 = (row[33] || '').toString().trim();

    if (lineName && !lineDefMap.has(lineName)) {
      const unitCode = normalizeUnit(unitRaw, lineName);
      const unitId = unitMap.get(unitCode) || unitMap.get('U02');
      lineDefMap.set(lineName, {
        id: crypto.randomUUID(),
        name: lineName,
        unitId,
        unitCode,
        manpower: (typeof manpowerRaw === 'number' && manpowerRaw > 0) ? manpowerRaw : 25,
        workingHours: 10.0,
        status: 'ACTIVE'
      });
    }

    if (buyerRaw && col33 !== 'Plan/Day' && col33 !== 'SAH' && !buyerDefMap.has(buyerRaw)) {
      buyerDefMap.set(buyerRaw, {
        id: crypto.randomUUID(),
        name: buyerRaw
      });
    }
  }

  console.log(`Inserting ${lineDefMap.size} Lines and ${buyerDefMap.size} Buyers...`);
  await prisma.productionLine.createMany({ data: Array.from(lineDefMap.values()) });
  await prisma.buyer.createMany({ data: Array.from(buyerDefMap.values()) });

  const batchId = crypto.randomUUID();
  await prisma.importBatch.create({
    data: {
      id: batchId,
      fileName: 'Birichina- Month of October Sign off Production Plan- 26th October.xlsx',
      fileSize: 1388527,
      month: '2026-10',
      totalRows: rows.length - 1,
      status: 'SUCCESS'
    }
  });

  // Collect all Orders and Daily Production Records
  const ordersToInsert = [];
  const dailyRecordsToInsert = [];

  function getActualVariance(lineIndex, dateIndex) {
    const seed = (lineIndex * 17 + dateIndex * 31) % 100;
    if (lineIndex % 8 === 0) return 0.96 + (seed % 10) * 0.01;
    if (lineIndex % 7 === 0) return 0.58 + (seed % 16) * 0.01;
    if (lineIndex % 5 === 0) return 0.72 + (seed % 10) * 0.01;
    return 0.82 + (seed % 14) * 0.01;
  }

  let lineIndex = 0;
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const lineName = (row[0] || '').toString().trim();
    const buyerRaw = (row[4] || '').toString().trim();
    const col33 = (row[33] || '').toString().trim();

    if (!lineName || !buyerRaw || col33 === 'Plan/Day' || col33 === 'SAH' || col33 === 'Machine HR' || col33 === 'Effi. plan/D') {
      continue;
    }

    const lineObj = lineDefMap.get(lineName);
    const buyerObj = buyerDefMap.get(buyerRaw);
    if (!lineObj || !buyerObj) continue;

    lineIndex++;
    const orderId = crypto.randomUUID();
    const orderCode = (row[5] || `ORD-${lineName}-${i}`).toString().trim();
    const ocs = row[6] ? row[6].toString().trim() : null;
    const subOc = row[7] ? row[7].toString().trim() : null;
    const styleRef = row[8] ? row[8].toString().trim() : 'N/A';
    const article = row[13] ? row[13].toString().trim() : null;
    const season = row[14] ? row[14].toString().trim() : 'N/A';
    const poNo = row[15] ? row[15].toString().trim() : null;
    const color = row[16] ? row[16].toString().trim() : null;
    const orderQty = typeof row[17] === 'number' ? Math.round(row[17]) : 0;
    const smv = typeof row[18] === 'number' ? Number(row[18].toFixed(2)) : 2.5;
    const mainCategory = row[19] ? row[19].toString().trim() : 'UNDERWEAR';
    const subCategory = row[20] ? row[20].toString().trim() : 'BOXER';
    const productType = row[21] ? row[21].toString().trim() : 'P1';
    const orderStatus = row[3] ? row[3].toString().trim() : 'Confirmed';
    const fobPrice = typeof row[30] === 'number' ? Number(row[30].toFixed(2)) : 0.0;
    const salesValue = typeof row[31] === 'number' ? Number(row[31].toFixed(2)) : 0.0;
    const planQty = typeof row[34] === 'number' ? Math.round(row[34]) : 0;

    ordersToInsert.push({
      id: orderId,
      orderCode: `${orderCode}-${i}`,
      ocs,
      subOc,
      buyerId: buyerObj.id,
      buyerName: buyerRaw,
      unitId: lineObj.unitId,
      unitCode: lineObj.unitCode,
      lineId: lineObj.id,
      lineName,
      styleRef,
      article,
      season,
      poNo,
      color,
      orderQty,
      planQty,
      smv,
      mainCategory,
      subCategory,
      productType,
      orderStatus,
      fobPrice,
      salesValue,
      leadMerchant: row[11] ? row[11].toString().trim() : null,
      orderDept: row[10] ? row[10].toString().trim() : null,
      importBatchId: batchId
    });

    for (let dIdx = 0; dIdx < dateColumns.length; dIdx++) {
      const colMeta = dateColumns[dIdx];
      const targetVal = row[colMeta.colIndex];
      
      if (typeof targetVal === 'number' && targetVal > 0) {
        const targetQty = Math.round(targetVal);
        const varianceFactor = getActualVariance(lineIndex, dIdx);
        const actualQty = Math.round(targetQty * varianceFactor);
        const gap = targetQty - actualQty;
        const targetSah = Number(((targetQty * smv) / 60).toFixed(2));
        const actualSah = Number(((actualQty * smv) / 60).toFixed(2));
        const clockHours = (lineObj.manpower || 25) * 10;
        const efficiency = Number(((actualSah / clockHours) * 100).toFixed(2));
        const plannedEfficiency = Number(((targetSah / clockHours) * 100).toFixed(2));
        const achievementRate = Number(((actualQty / targetQty) * 100).toFixed(2));

        dailyRecordsToInsert.push({
          id: crypto.randomUUID(),
          date: colMeta.date,
          dateString: colMeta.dateStr,
          month: '2026-10',
          orderId,
          lineId: lineObj.id,
          unitId: lineObj.unitId,
          buyerId: buyerObj.id,
          targetQty,
          actualQty,
          gap,
          smv,
          targetSah,
          actualSah,
          clockHours,
          efficiency,
          plannedEfficiency,
          achievementRate,
          manpower: lineObj.manpower || 25,
          importBatchId: batchId
        });
      }
    }
  }

  console.log(`Bulk inserting ${ordersToInsert.length} Orders in chunks...`);
  const chunkSize = 500;
  for (let i = 0; i < ordersToInsert.length; i += chunkSize) {
    const chunk = ordersToInsert.slice(i, i + chunkSize);
    await prisma.order.createMany({ data: chunk });
    console.log(`  Orders inserted: ${Math.min(i + chunkSize, ordersToInsert.length)} / ${ordersToInsert.length}`);
  }

  console.log(`Bulk inserting ${dailyRecordsToInsert.length} Daily Records in chunks...`);
  for (let i = 0; i < dailyRecordsToInsert.length; i += chunkSize) {
    const chunk = dailyRecordsToInsert.slice(i, i + chunkSize);
    await prisma.productionDaily.createMany({ data: chunk });
    console.log(`  Daily records inserted: ${Math.min(i + chunkSize, dailyRecordsToInsert.length)} / ${dailyRecordsToInsert.length}`);
  }

  // Update Unit metrics
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

  // Update batch record
  await prisma.importBatch.update({
    where: { id: batchId },
    data: {
      importedRows: ordersToInsert.length,
      summary: JSON.stringify({
        lines: lineDefMap.size,
        orders: ordersToInsert.length,
        dailyRecords: dailyRecordsToInsert.length,
        month: '2026-10'
      })
    }
  });

  // Seed default system settings
  const defaultSettings = [
    { key: 'lowEfficiencyThreshold', value: '60' },
    { key: 'mediumEfficiencyThreshold', value: '80' },
    { key: 'highEfficiencyThreshold', value: '100' },
    { key: 'defaultWorkingHours', value: '10' }
  ];

  for (const s of defaultSettings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      create: s,
      update: { value: s.value }
    });
  }

  console.log(`\n========================================`);
  console.log(`Database Seed Completed Successfully!`);
  console.log(`Units: ${unitMap.size}`);
  console.log(`Lines: ${lineDefMap.size}`);
  console.log(`Buyers: ${buyerDefMap.size}`);
  console.log(`Orders: ${ordersToInsert.length}`);
  console.log(`Daily Records: ${dailyRecordsToInsert.length}`);
  console.log(`========================================\n`);
}

seed()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
