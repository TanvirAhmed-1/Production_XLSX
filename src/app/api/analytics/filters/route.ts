import { NextResponse } from 'next/server';
import { getFilterOptions } from '@/lib/analytics-service';

export async function GET() {
  try {
    const filters = await getFilterOptions();
    return NextResponse.json(filters);
  } catch (err: any) {
    console.error('Filters API Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch filters' }, { status: 500 });
  }
}
