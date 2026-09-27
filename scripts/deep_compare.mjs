import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('=== 1. ANALYZING Birichina- Month of October Sign off Production Plan- 26th October.xlsx ===');
  const birichinaPath = path.resolve('Birichina- Month of October Sign off Production Plan- 26th October.xlsx');
  const buf1 = fs.readFileSync(birichinaPath);
  const wb1 = XLSX.read(buf1, { type: 'buffer' });
  console.log('Sheet names:', wb1.SheetNames);
  const sheet1 = wb1.Sheets[wb1.SheetNames[0]];
  const rows1 = XLSX.utils.sheet_to_json(sheet1, { header: 1 });
  console.log('Total rows in Birichina sheet:', rows1.length);

  const headerRow = rows1[0];

  const birichinaLines = new Set();
  const unitLines = { B2: new Set(), U02: new Set(), U03: new Set(), U04: new Set(), OTHER: new Set() };
  let totalCol17_OrderQty = 0;
  let totalCol34_PlanQty = 0;
  let totalDailyTargetSum = 0;
  let validOrderRowCount = 0;

  // Find date columns (serial numbers > 40000)
  const dateCols = [];
  for (let c = 35; c < headerRow.length; c++) {
    const val = headerRow[c];
    if (typeof val === 'number' && val > 40000 && val < 50000) {
      dateCols.push(c);
    }
  }
  console.log('Date columns count:', dateCols.length);

  for (let i = 1; i < rows1.length; i++) {
    const row = rows1[i];
    if (!row || row.length === 0) continue;
    const lineName = (row[0] || '').toString().trim();
    const col4_buyer = (row[4] || '').toString().trim();
    const col33 = (row[33] || '').toString().trim();

    if (lineName) {
      birichinaLines.add(lineName);
      if (lineName.startsWith('B2')) unitLines.B2.add(lineName);
      else if (lineName.startsWith('U02')) unitLines.U02.add(lineName);
      else if (lineName.startsWith('U03')) unitLines.U03.add(lineName);
      else if (lineName.startsWith('U04')) unitLines.U04.add(lineName);
      else unitLines.OTHER.add(lineName);
    }

    if (lineName && col4_buyer && col33 !== 'Plan/Day' && col33 !== 'SAH' && col33 !== 'Machine HR' && col33 !== 'Effi. plan/D') {
      validOrderRowCount++;
      if (typeof row[17] === 'number') totalCol17_OrderQty += row[17];
      if (typeof row[34] === 'number') totalCol34_PlanQty += row[34];

      for (const colIdx of dateCols) {
        const dVal = row[colIdx];
        if (typeof dVal === 'number' && dVal > 0) {
          totalDailyTargetSum += dVal;
        }
      }
    }
  }

  console.log('Birichina Unique Lines Count:', birichinaLines.size);
  console.log('Unit Breakdown:', {
    B2: unitLines.B2.size,
    U02: unitLines.U02.size,
    U03: unitLines.U03.size,
    U04: unitLines.U04.size,
    OTHER: unitLines.OTHER.size,
  });
  console.log('Valid Order Rows:', validOrderRowCount);
  console.log('Total Col 17 (Order Qty):', totalCol17_OrderQty.toLocaleString());
  console.log('Total Col 34 (Plan Qty):', totalCol34_PlanQty.toLocaleString());
  console.log('Total Daily Target Sum (Days 1-31):', totalDailyTargetSum.toLocaleString());

  console.log('\n=== 2. ANALYZING Production_lines_2026-09-27.xlsx ===');
  try {
    const prodPath = path.resolve('Production_lines_2026-09-27.xlsx');
    const buf2 = fs.readFileSync(prodPath);
    const wb2 = XLSX.read(buf2, { type: 'buffer' });
    console.log('Sheet names in exported file:', wb2.SheetNames);
    const sheet2 = wb2.Sheets[wb2.SheetNames[0]];
    const rows2 = XLSX.utils.sheet_to_json(sheet2);
    console.log('Total rows in exported file:', rows2.length);
    if (rows2.length > 0) {
      console.log('Sample row in exported file:', rows2[0]);
    }
    const exportLines = new Set(rows2.map(r => r['Line'] || r['Line Name'] || r['lineName'] || Object.values(r)[0]));
    console.log('Exported Unique Lines Count:', exportLines.size);
    
    // Sum Target Qty & Actual Qty in exported file
    let expTargetSum = 0;
    let expActualSum = 0;
    for (const r of rows2) {
      const tgt = Number(r['Planned Target'] || r['Target'] || r['Target Qty'] || r['target'] || 0);
      const act = Number(r['Actual Output'] || r['Actual'] || r['Actual Qty'] || r['actual'] || 0);
      expTargetSum += tgt;
      expActualSum += act;
    }
    console.log('Exported Total Target Sum:', expTargetSum.toLocaleString());
    console.log('Exported Total Actual Sum:', expActualSum.toLocaleString());

    // Check which 23 lines are in exported file but not in Birichina
    const extraLines = [...exportLines].filter(l => !birichinaLines.has(l));
    console.log('Extra lines count in exported file:', extraLines.length);
    console.log('Extra lines:', extraLines);
  } catch (e) {
    console.log('Could not read Production_lines_2026-09-27.xlsx:', e.message);
  }

  console.log('\n=== 3. ANALYZING CURRENT DATABASE STATE ===');
  const dbLines = await prisma.productionLine.findMany();
  console.log('DB Lines total count in database:', dbLines.length);

  const dbOrders = await prisma.order.count();
  console.log('DB Orders total count:', dbOrders);

  const dbDaily = await prisma.productionDaily.count();
  console.log('DB Daily total count:', dbDaily);

  const dbOrderSums = await prisma.order.aggregate({
    _sum: { orderQty: true, planQty: true }
  });
  console.log('DB Order Qty Sum:', dbOrderSums._sum.orderQty?.toLocaleString());
  console.log('DB Plan Qty Sum:', dbOrderSums._sum.planQty?.toLocaleString());

  const dbDailySums = await prisma.productionDaily.aggregate({
    _sum: { targetQty: true, actualQty: true, gap: true, targetSah: true, actualSah: true, clockHours: true }
  });
  console.log('DB Daily Target Qty Sum:', dbDailySums._sum.targetQty?.toLocaleString());
  console.log('DB Daily Actual Qty Sum:', dbDailySums._sum.actualQty?.toLocaleString());

  const batches = await prisma.importBatch.findMany();
  console.log('DB Batches:', batches);

  await prisma.$disconnect();
}

main().catch(console.error);
