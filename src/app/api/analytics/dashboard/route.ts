import { NextRequest, NextResponse } from 'next/server';
import { getDashboardData } from '@/lib/analytics-service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filters = {
      month: searchParams.get('month') || undefined,
      batchId: searchParams.get('batchId') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      unitCode: searchParams.get('unitCode') || undefined,
      lineName: searchParams.get('lineName') || undefined,
      buyerName: searchParams.get('buyerName') || undefined,
      styleRef: searchParams.get('styleRef') || undefined,
      season: searchParams.get('season') || undefined,
      orderStatus: searchParams.get('orderStatus') || undefined,
    };

    const data = await getDashboardData(filters);
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('Dashboard API Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
