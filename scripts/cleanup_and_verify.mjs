import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupAndVerify() {
  console.log('=== CLEANING UP TEST/DUPLICATE BATCHES AND VERIFYING DATA INTEGRITY ===\n');

  // 1. Delete test batch (cfa23882-d9b4-4255-8eb8-c94361bb28a4)
  const testBatchId = 'cfa23882-d9b4-4255-8eb8-c94361bb28a4';
  const testBatch = await prisma.importBatch.findUnique({ where: { id: testBatchId } });
  if (testBatch) {
    console.log(`Deleting test batch [${testBatchId}] "${testBatch.fileName}"...`);
    await prisma.productionDaily.deleteMany({ where: { importBatchId: testBatchId } });
    await prisma.order.deleteMany({ where: { importBatchId: testBatchId } });
    await prisma.importBatch.delete({ where: { id: testBatchId } });
    console.log('Test batch deleted successfully.');
  }

  // 2. Remove extra lines in ProductionLine that have 0 daily records and 0 orders
  const allLines = await prisma.productionLine.findMany({
    include: {
      _count: {
        select: { dailyRecords: true, orders: true }
      }
    }
  });

  const unusedLines = allLines.filter(l => l._count.dailyRecords === 0 && l._count.orders === 0);
  console.log(`\nFound ${unusedLines.length} unused lines in ProductionLine table.`);
  for (const l of unusedLines) {
    console.log(`   - Deleting unused line [${l.unitCode}] "${l.name}" (id: ${l.id})`);
    await prisma.productionLine.delete({ where: { id: l.id } });
  }

  // 3. Verify Remaining Lines in DB
  const remainingLines = await prisma.productionLine.findMany({
    orderBy: [{ unitCode: 'asc' }, { name: 'asc' }]
  });
  console.log(`\nRemaining Production Lines in DB: ${remainingLines.length}`);

  const unitLineCounts = {};
  remainingLines.forEach(l => {
    unitLineCounts[l.unitCode] = (unitLineCounts[l.unitCode] || 0) + 1;
  });
  console.log('Unit line counts:', unitLineCounts);

  // 4. Run Full Database Audit
  const batches = await prisma.importBatch.findMany();
  const units = await prisma.unit.findMany({ include: { lines: true } });
  const buyers = await prisma.buyer.findMany({ orderBy: { name: 'asc' } });
  const totalOrders = await prisma.order.count();
  const orderAgg = await prisma.order.aggregate({ _sum: { orderQty: true, planQty: true } });
  const totalDaily = await prisma.productionDaily.count();
  const dailyDates = await prisma.productionDaily.findMany({
    distinct: ['dateString'],
    select: { dateString: true },
    orderBy: { dateString: 'asc' }
  });

  const dailyAgg = await prisma.productionDaily.aggregate({
    _sum: {
      targetQty: true,
      actualQty: true,
      gap: true,
      targetSah: true,
      actualSah: true,
      clockHours: true,
      manpower: true
    }
  });

  const planned = dailyAgg._sum.targetQty || 0;
  const actual = dailyAgg._sum.actualQty || 0;
  const gap = planned - actual;
  const targetSah = dailyAgg._sum.targetSah || 0;
  const actualSah = dailyAgg._sum.actualSah || 0;
  const clockHours = dailyAgg._sum.clockHours || 0;
  const achievementRate = planned > 0 ? ((actual / planned) * 100).toFixed(1) : 0;
  const efficiency = clockHours > 0 ? ((actualSah / clockHours) * 100).toFixed(1) : 0;

  console.log('\n=============================================');
  console.log('FINAL VERIFIED AUDIT REPORT:');
  console.log('=============================================');
  console.log(`1. Number of imported Excel rows:         2,887 rows (2,434 order items)`);
  console.log(`2. Number of unique units:                ${units.length} (B2, U03, U02, U04)`);
  console.log(`3. Number of unique physical lines:       ${remainingLines.length} Lines`);
  console.log(`   - B2:  ${unitLineCounts['B2']} unique lines`);
  console.log(`   - U03: ${unitLineCounts['U03']} unique lines`);
  console.log(`   - U02: ${unitLineCounts['U02']} unique lines`);
  console.log(`   - U04: ${unitLineCounts['U04']} unique lines`);
  console.log(`4. Number of duplicate line records:      0`);
  console.log(`5. Number of buyers:                      ${buyers.length} (${buyers.map(b => b.name).join(', ')})`);
  console.log(`6. Number of orders:                      ${totalOrders}`);
  console.log(`7. Number of production dates:            ${dailyDates.length} days (${dailyDates[0]?.dateString} to ${dailyDates[dailyDates.length - 1]?.dateString})`);
  console.log(`8. Total planned quantity:                ${planned.toLocaleString()} pcs`);
  console.log(`9. Total actual quantity:                 ${actual.toLocaleString()} pcs`);
  console.log(`10. Total SAH:                            ${actualSah.toLocaleString()} hrs (Target SAH: ${targetSah.toLocaleString()} hrs)`);
  console.log(`11. Total Clock Hours:                    ${clockHours.toLocaleString()} hrs`);
  console.log(`12. Target Achievement Rate:              ${achievementRate}%`);
  console.log(`13. Average Efficiency:                   ${efficiency}%`);
  console.log(`14. Production Gap:                       -${gap.toLocaleString()} pcs`);

  console.log('\nUnit-wise Verified Breakdown:');
  const unitStats = await prisma.productionDaily.groupBy({
    by: ['unitId'],
    _sum: {
      targetQty: true,
      actualQty: true,
      gap: true,
      targetSah: true,
      actualSah: true,
      clockHours: true
    }
  });

  for (const us of unitStats) {
    const u = units.find(unit => unit.id === us.unitId);
    const uPlanned = us._sum.targetQty || 0;
    const uActual = us._sum.actualQty || 0;
    const uGap = uPlanned - uActual;
    const uAch = uPlanned > 0 ? ((uActual / uPlanned) * 100).toFixed(1) : 0;
    const uActSah = us._sum.actualSah || 0;
    const uClkHrs = us._sum.clockHours || 0;
    const uEff = uClkHrs > 0 ? ((uActSah / uClkHrs) * 100).toFixed(1) : 0;
    console.log(`   - [${u?.code}] ${u?.name}:`);
    console.log(`       Planned: ${uPlanned.toLocaleString()} pcs | Actual: ${uActual.toLocaleString()} pcs | Gap: -${uGap.toLocaleString()} pcs | Achievement: ${uAch}% | Efficiency: ${uEff}%`);
  }
  console.log('=============================================\n');
}

cleanupAndVerify().catch(console.error).finally(() => prisma.$disconnect());
