import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runAudit() {
  console.log('=== RUNNING GARMENTS PRODUCTION DATABASE AUDIT ===\n');

  // 1. Check Import Batches
  const batches = await prisma.importBatch.findMany();
  console.log(`1. Total Import Batches: ${batches.length}`);
  batches.forEach(b => {
    console.log(`   - Batch [${b.id}] | File: "${b.fileName}" | Month: ${b.month} | TotalRows: ${b.totalRows} | ImportedRows: ${b.importedRows} | Created: ${b.createdAt.toISOString()}`);
  });
  console.log();

  // 2. Check Units
  const units = await prisma.unit.findMany({ include: { lines: true } });
  console.log(`2. Total Units: ${units.length}`);
  units.forEach(u => {
    console.log(`   - Unit [${u.code}] "${u.name}": ${u.lines.length} lines configured`);
  });
  console.log();

  // 3. Check Production Lines
  const allLines = await prisma.productionLine.findMany({ orderBy: [{ unitCode: 'asc' }, { name: 'asc' }] });
  console.log(`3. Total Production Lines in DB: ${allLines.length}`);
  
  const unitLineCounts = {};
  allLines.forEach(l => {
    unitLineCounts[l.unitCode] = (unitLineCounts[l.unitCode] || 0) + 1;
  });
  console.log('   Line Counts by Unit:', unitLineCounts);
  console.log();

  // 4. Check Unique Buyers
  const buyers = await prisma.buyer.findMany({ orderBy: { name: 'asc' } });
  console.log(`4. Total Buyers in DB: ${buyers.length}`);
  buyers.forEach(b => console.log(`   - Buyer: ${b.name}`));
  console.log();

  // 5. Check Orders
  const totalOrders = await prisma.order.count();
  const orderAgg = await prisma.order.aggregate({
    _sum: { orderQty: true, planQty: true }
  });
  console.log(`5. Total Orders in DB: ${totalOrders}`);
  console.log(`   - Total Order Qty: ${orderAgg._sum.orderQty?.toLocaleString()} pcs`);
  console.log(`   - Total Plan Qty (Order Master): ${orderAgg._sum.planQty?.toLocaleString()} pcs`);
  console.log();

  // 6. Check Production Daily Records
  const totalDaily = await prisma.productionDaily.count();
  const dailyDates = await prisma.productionDaily.findMany({
    distinct: ['dateString'],
    select: { dateString: true },
    orderBy: { dateString: 'asc' }
  });
  console.log(`6. Total Production Daily Records: ${totalDaily}`);
  console.log(`   - Number of distinct production dates: ${dailyDates.length}`);
  console.log(`   - Date range: ${dailyDates[0]?.dateString} to ${dailyDates[dailyDates.length - 1]?.dateString}`);
  console.log();

  // 7. Check Daily Aggregations (Overall)
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
  const gap = dailyAgg._sum.gap || 0;
  const targetSah = dailyAgg._sum.targetSah || 0;
  const actualSah = dailyAgg._sum.actualSah || 0;
  const clockHours = dailyAgg._sum.clockHours || 0;
  const achievementRate = planned > 0 ? ((actual / planned) * 100).toFixed(1) : 0;
  const efficiency = clockHours > 0 ? ((actualSah / clockHours) * 100).toFixed(1) : 0;

  console.log(`7. Production Totals:`);
  console.log(`   - Planned Production: ${planned.toLocaleString()} pcs`);
  console.log(`   - Actual Production:  ${actual.toLocaleString()} pcs`);
  console.log(`   - Production Gap:     ${gap.toLocaleString()} pcs`);
  console.log(`   - Target SAH:         ${targetSah.toLocaleString()} hrs`);
  console.log(`   - Actual SAH:         ${actualSah.toLocaleString()} hrs`);
  console.log(`   - Total Clock Hours:  ${clockHours.toLocaleString()} hrs`);
  console.log(`   - Target Achievement: ${achievementRate}%`);
  console.log(`   - Efficiency:         ${efficiency}%`);
  console.log();

  // 8. Check Unit-wise Totals
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

  console.log(`8. Unit-wise Production Breakdown:`);
  for (const us of unitStats) {
    const u = units.find(unit => unit.id === us.unitId);
    const uPlanned = us._sum.targetQty || 0;
    const uActual = us._sum.actualQty || 0;
    const uAch = uPlanned > 0 ? ((uActual / uPlanned) * 100).toFixed(1) : 0;
    const uActSah = us._sum.actualSah || 0;
    const uClkHrs = us._sum.clockHours || 0;
    const uEff = uClkHrs > 0 ? ((uActSah / uClkHrs) * 100).toFixed(1) : 0;
    console.log(`   - [${u?.code}] ${u?.name}:`);
    console.log(`       Planned: ${uPlanned.toLocaleString()} pcs | Actual: ${uActual.toLocaleString()} pcs | Achievement: ${uAch}% | Efficiency: ${uEff}%`);
  }
  console.log();

  // 9. Check Unique Lines in ProductionDaily GroupBy vs ProductionLine Table
  const dailyLineGroupBy = await prisma.productionDaily.groupBy({
    by: ['lineId'],
    _sum: { targetQty: true, actualQty: true }
  });
  console.log(`9. Unique lineId in ProductionDaily: ${dailyLineGroupBy.length}`);
  
  // Check if any lineId in ProductionDaily does not match ProductionLine or if there are duplicate line names
  const lineNamesCount = {};
  allLines.forEach(l => {
    lineNamesCount[l.name] = (lineNamesCount[l.name] || 0) + 1;
  });
  const duplicateLineNames = Object.entries(lineNamesCount).filter(([name, count]) => count > 1);
  console.log(`   - Duplicate line names in ProductionLine: ${duplicateLineNames.length}`);
  if (duplicateLineNames.length > 0) {
    console.log('     Duplicates:', duplicateLineNames);
  }

  // Check what getDashboardData returns
  console.log('\n=== AUDIT COMPLETE ===');
}

runAudit().catch(console.error).finally(() => prisma.$disconnect());
