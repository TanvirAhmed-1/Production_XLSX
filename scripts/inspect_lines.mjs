import XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function inspectLines() {
  const filePath = './Birichina- Month of October Sign off Production Plan- 26th October.xlsx';
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets['Birichina'];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  console.log(`Excel Total Rows: ${rows.length}`);

  const excelLines = new Map(); // lineName -> { unit, rowsCount, totalTarget }
  const dateCols = [];
  const header = rows[0];
  for (let c = 35; c < header.length; c++) {
    const val = header[c];
    if (typeof val === 'number' && val > 40000 && val < 50000) {
      dateCols.push(c);
    }
  }

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length === 0) continue;
    const rawLine = (r[0] || '').toString().trim();
    const rawUnit = (r[2] || '').toString().trim();
    const col33 = (r[33] || '').toString().trim();
    
    // Check if line has any planned production in date columns
    let lineTarget = 0;
    for (const c of dateCols) {
      const v = Number(r[c]) || 0;
      lineTarget += v;
    }

    if (rawLine) {
      if (!excelLines.has(rawLine)) {
        excelLines.set(rawLine, {
          rawLine,
          rawUnit,
          rowsCount: 0,
          targetSum: 0,
          stylesCount: 0,
          hasPlanDays: false
        });
      }
      const item = excelLines.get(rawLine);
      item.rowsCount++;
      item.targetSum += lineTarget;
      if (col33 !== 'Plan/Day' && col33 !== 'SAH' && lineTarget > 0) {
        item.stylesCount++;
      }
      if (col33 === 'Plan/Day') {
        item.hasPlanDays = true;
      }
    }
  }

  console.log(`\nDistinct Line Strings in Column A of Excel: ${excelLines.size}`);

  const linesWithTarget = [];
  const linesZeroTarget = [];

  for (const [name, info] of excelLines.entries()) {
    if (info.targetSum > 0) {
      linesWithTarget.push(info);
    } else {
      linesZeroTarget.push(info);
    }
  }

  console.log(`Lines with Target > 0: ${linesWithTarget.length}`);
  console.log(`Lines with Target == 0: ${linesZeroTarget.length}`);

  console.log('\nBreakdown of Lines with Target > 0 by Unit:');
  const unitBreakdown = {};
  for (const l of linesWithTarget) {
    let u = l.rawUnit;
    if (l.rawLine.startsWith('U02')) u = 'U02';
    else if (l.rawLine.startsWith('U03')) u = 'U03';
    else if (l.rawLine.startsWith('U04')) u = 'U04';
    else if (l.rawLine.startsWith('B2')) u = 'B2';
    unitBreakdown[u] = (unitBreakdown[u] || 0) + 1;
  }
  console.log(unitBreakdown);

  console.log('\nBreakdown of ALL 136 Line Strings by Unit:');
  const allUnitBreakdown = {};
  for (const l of excelLines.values()) {
    let u = l.rawUnit;
    if (l.rawLine.startsWith('U02')) u = 'U02';
    else if (l.rawLine.startsWith('U03')) u = 'U03';
    else if (l.rawLine.startsWith('U04')) u = 'U04';
    else if (l.rawLine.startsWith('B2')) u = 'B2';
    allUnitBreakdown[u] = (allUnitBreakdown[u] || 0) + 1;
  }
  console.log(allUnitBreakdown);

  console.log('\nLines with Target == 0 (Empty / Placeholder / Unassigned / Inactive lines):');
  linesZeroTarget.forEach(l => {
    console.log(`   - "${l.rawLine}" (Unit: ${l.rawUnit}, rows: ${l.rowsCount}, hasPlanDays: ${l.hasPlanDays})`);
  });

  const dbLines = await prisma.productionLine.findMany();
  console.log(`\nDB Total Lines: ${dbLines.length}`);
}

inspectLines().catch(console.error).finally(() => prisma.$disconnect());
