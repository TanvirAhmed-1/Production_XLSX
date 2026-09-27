import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkBatch1() {
  const batch1Id = 'da96fe64-0203-4415-8632-da91b258b078';
  console.log(`Checking metrics for Batch 1 [${batch1Id}]:\n`);

  // 1. Unique lines in Batch 1
  const lineStats = await prisma.productionDaily.groupBy({
    by: ['lineId'],
    where: { importBatchId: batch1Id },
    _sum: {
      targetQty: true,
      actualQty: true,
      gap: true,
      targetSah: true,
      actualSah: true,
      clockHours: true
    }
  });
  console.log(`Unique lines in Batch 1: ${lineStats.length}`);

  const lineIds = lineStats.map(l => l.lineId);
  const lines = await prisma.productionLine.findMany({
    where: { id: { in: lineIds } }
  });

  const unitLines = {};
  lines.forEach(l => {
    unitLines[l.unitCode] = (unitLines[l.unitCode] || 0) + 1;
  });
  console.log('Unit line counts for Batch 1:', unitLines);

  // 2. Production totals for Batch 1
  const agg = await prisma.productionDaily.aggregate({
    where: { importBatchId: batch1Id },
    _sum: {
      targetQty: true,
      actualQty: true,
      gap: true,
      targetSah: true,
      actualSah: true,
      clockHours: true
    }
  });

  const target = agg._sum.targetQty || 0;
  const actual = agg._sum.actualQty || 0;
  const gap = target - actual;
  const targetSah = agg._sum.targetSah || 0;
  const actualSah = agg._sum.actualSah || 0;
  const clockHours = agg._sum.clockHours || 0;
  const ach = target > 0 ? ((actual / target) * 100).toFixed(1) : 0;
  const eff = clockHours > 0 ? ((actualSah / clockHours) * 100).toFixed(1) : 0;

  console.log('\nProduction Totals for Batch 1:');
  console.log(`- Total Planned: ${target.toLocaleString()} pcs`);
  console.log(`- Total Actual:  ${actual.toLocaleString()} pcs`);
  console.log(`- Total Gap:     ${gap.toLocaleString()} pcs`);
  console.log(`- Target SAH:    ${targetSah.toLocaleString()} hrs`);
  console.log(`- Actual SAH:    ${actualSah.toLocaleString()} hrs`);
  console.log(`- Clock Hours:   ${clockHours.toLocaleString()} hrs`);
  console.log(`- Achievement:   ${ach}%`);
  console.log(`- Efficiency:    ${eff}%`);

  // 3. Unit-wise breakdown for Batch 1
  const unitStats = await prisma.productionDaily.groupBy({
    by: ['unitId'],
    where: { importBatchId: batch1Id },
    _sum: {
      targetQty: true,
      actualQty: true,
      gap: true,
      targetSah: true,
      actualSah: true,
      clockHours: true
    }
  });

  const units = await prisma.unit.findMany();
  const unitMap = new Map(units.map(u => [u.id, u]));

  console.log('\nUnit Breakdown for Batch 1:');
  for (const u of unitStats) {
    const unit = unitMap.get(u.unitId);
    const uTarget = u._sum.targetQty || 0;
    const uActual = u._sum.actualQty || 0;
    const uGap = uTarget - uActual;
    const uAch = uTarget > 0 ? ((uActual / uTarget) * 100).toFixed(1) : 0;
    const uActSah = u._sum.actualSah || 0;
    const uClkHrs = u._sum.clockHours || 0;
    const uEff = uClkHrs > 0 ? ((uActSah / uClkHrs) * 100).toFixed(1) : 0;
    console.log(`- [${unit?.code}] ${unit?.name}:`);
    console.log(`    Planned: ${uTarget.toLocaleString()} pcs`);
    console.log(`    Actual:  ${uActual.toLocaleString()} pcs`);
    console.log(`    Gap:     ${uGap.toLocaleString()} pcs`);
    console.log(`    Ach:     ${uAch}% | Eff: ${uEff}%`);
  }
}

checkBatch1().catch(console.error).finally(() => prisma.$disconnect());
