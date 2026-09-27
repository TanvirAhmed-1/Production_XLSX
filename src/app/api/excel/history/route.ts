import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const batches = await prisma.importBatch.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    return NextResponse.json(batches);
  } catch (err: any) {
    console.error('History API Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch import history' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const batchId = searchParams.get('id');

    if (!batchId) {
      return NextResponse.json({ error: 'Batch ID is required' }, { status: 400 });
    }

    // Delete associated production daily records and orders if associated with this batch
    await prisma.productionDaily.deleteMany({ where: { importBatchId: batchId } });
    await prisma.order.deleteMany({ where: { importBatchId: batchId } });
    await prisma.importBatch.delete({ where: { id: batchId } });

    return NextResponse.json({ success: true, message: 'Batch and associated records removed successfully' });
  } catch (err: any) {
    console.error('Batch Delete Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to delete batch' }, { status: 500 });
  }
}
