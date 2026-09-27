import { NextRequest, NextResponse } from 'next/server';
import { getOrdersReport } from '@/lib/analytics-service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10);
    const filters = {
      batchId: searchParams.get('batchId') || undefined,
      unitCode: searchParams.get('unitCode') || undefined,
      lineName: searchParams.get('lineName') || undefined,
      buyerName: searchParams.get('buyerName') || undefined,
      season: searchParams.get('season') || undefined,
      orderStatus: searchParams.get('orderStatus') || undefined,
      search: searchParams.get('search') || undefined,
    };

    const data = await getOrdersReport(filters, page, pageSize);
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('Orders API Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch orders' }, { status: 500 });
  }
}
