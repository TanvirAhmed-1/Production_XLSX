import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function inspectDbAndQuery() {
  console.log('=== Batches ===');
  const batches = await prisma.importBatch.findMany();
  console.log(batches);

  console.log('=== Orders Sample ===');
  const orders = await prisma.order.findMany({ take: 3 });
  console.log(orders);

  console.log('=== ProductionDaily Sample ===');
  const daily = await prisma.productionDaily.findMany({ take: 3 });
  console.log(daily);

  console.log('=== ProductionLines ===');
  const lines = await prisma.productionLine.findMany();
  console.log(`Total Lines: ${lines.length}`);
  const totalMp = lines.reduce((a, b) => a + b.manpower, 0);
  console.log(`Total Manpower from lines table: ${totalMp}`);

  console.log('=== Test Default Dashboard Query (no params) ===');
  const dailyAggNoFilter = await prisma.productionDaily.aggregate({
    _sum: {
      targetQty: true,
      actualQty: true,
      gap: true,
      targetSah: true,
      actualSah: true,
      clockHours: true
    }
  });
  console.log('No filter aggregate:', dailyAggNoFilter._sum);

  console.log('=== Test Query with month="2026-10" ===');
  const dailyAggMonth = await prisma.productionDaily.aggregate({
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
  console.log('Month="2026-10" aggregate:', dailyAggMonth._sum);

  console.log('=== Test Query with month="ALL" or undefined ===');
  // Check if month in daily records is '2026-10'
  const distinctMonths = await prisma.productionDaily.findMany({
    select: { month: true },
    distinct: ['month']
  });
  console.log('Distinct months in DB:', distinctMonths);

  await prisma.$disconnect();
}

inspectDbAndQuery().catch(console.error);
