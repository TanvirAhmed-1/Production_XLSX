import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function keepSingleBatch() {
  const batches = await prisma.importBatch.findMany({ orderBy: { createdAt: 'desc' } });
  console.log(`Found ${batches.length} batches.`);
  
  if (batches.length > 1) {
    const keepBatch = batches[0];
    const deleteBatches = batches.slice(1);
    console.log(`Keeping latest batch: [${keepBatch.id}] "${keepBatch.fileName}"`);
    for (const b of deleteBatches) {
      console.log(`Deleting previous duplicate batch: [${b.id}] "${b.fileName}"`);
      await prisma.productionDaily.deleteMany({ where: { importBatchId: b.id } });
      await prisma.order.deleteMany({ where: { importBatchId: b.id } });
      await prisma.importBatch.delete({ where: { id: b.id } });
    }
  }

  const orderCount = await prisma.order.count();
  const dailyCount = await prisma.productionDaily.count();
  const lineCount = await prisma.productionLine.count();
  const agg = await prisma.productionDaily.aggregate({ _sum: { targetQty: true, actualQty: true } });

  console.log('\n--- CLEAN DB STATE ---');
  console.log(`Batches: 1`);
  console.log(`Orders: ${orderCount}`);
  console.log(`Daily:  ${dailyCount}`);
  console.log(`Lines:  ${lineCount}`);
  console.log(`Planned Pcs: ${agg._sum.targetQty?.toLocaleString()}`);
  console.log(`Actual Pcs:  ${agg._sum.actualQty?.toLocaleString()}`);
}

keepSingleBatch().catch(console.error).finally(() => prisma.$disconnect());
