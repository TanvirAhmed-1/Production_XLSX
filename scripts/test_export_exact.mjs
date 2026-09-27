import { PrismaClient } from '@prisma/client';
import XLSX from 'xlsx';
const prisma = new PrismaClient();

async function testExport() {
  const lineStats = await prisma.productionDaily.groupBy({
    by: ['lineId'],
    where: { month: '2026-10' },
    _sum: {
      targetQty: true,
      actualQty: true,
      gap: true,
      targetSah: true,
      actualSah: true,
      clockHours: true
    }
  });

  const lineIds = lineStats.map(s => s.lineId);
  const linesInfo = await prisma.productionLine.findMany({
    where: { id: { in: lineIds } },
    include: { unit: true }
  });
  const linesInfoMap = new Map(linesInfo.map(l => [l.id, l]));

  const exportRows = lineStats.map(stat => {
    const line = linesInfoMap.get(stat.lineId);
    const target = stat._sum.targetQty || 0;
    const actual = stat._sum.actualQty || 0;
    const gap = stat._sum.gap || 0;
    const sah = Number((stat._sum.actualSah || 0).toFixed(2));
    const clockHours = stat._sum.clockHours || 1;
    const efficiency = Number(((sah / clockHours) * 100).toFixed(1));
    const achievementRate = target > 0 ? Number(((actual / target) * 100).toFixed(1)) : 0;

    let status = 'NORMAL';
    if (efficiency >= 85) status = 'HIGH';
    else if (efficiency >= 70) status = 'NORMAL';
    else if (efficiency >= 60) status = 'NEEDS_ATTENTION';
    else status = 'LOW';

    return {
      'Line Name': line ? line.name : 'Unknown',
      'Unit': line ? line.unitCode : 'N/A',
      'Manpower': line ? line.manpower : 25,
      'Target Qty': target,
      'Actual Qty': actual,
      'Gap': gap,
      'SAH': sah,
      'Efficiency %': `${efficiency}%`,
      'Achievement %': `${achievementRate}%`,
      'Status': status
    };
  });

  const totalTarget = exportRows.reduce((a, b) => a + b['Target Qty'], 0);
  const totalActual = exportRows.reduce((a, b) => a + b['Actual Qty'], 0);

  const unitBreakdown = {};
  for (const r of exportRows) {
    unitBreakdown[r.Unit] = (unitBreakdown[r.Unit] || 0) + 1;
  }

  console.log('=== TEST EXPORT OF LINES ===');
  console.log('Export Rows Count:', exportRows.length);
  console.log('Export Total Target Qty:', totalTarget.toLocaleString());
  console.log('Export Total Actual Qty:', totalActual.toLocaleString());
  console.log('Export Unit Breakdown:', unitBreakdown);

  await prisma.$disconnect();
}

testExport().catch(console.error);
