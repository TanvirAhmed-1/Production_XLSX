import { NextRequest, NextResponse } from 'next/server';
import { getDashboardData, getOrdersReport } from '@/lib/analytics-service';
import { exportDataToExcel } from '@/lib/excel-importer';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'lines'; // 'lines' | 'orders' | 'units' | 'buyers' | 'daily'
    const filters = {
      month: searchParams.get('month') || undefined,
      batchId: searchParams.get('batchId') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      unitCode: searchParams.get('unitCode') || undefined,
      lineName: searchParams.get('lineName') || undefined,
      buyerName: searchParams.get('buyerName') || undefined,
      season: searchParams.get('season') || undefined,
    };

    let exportRows: any[] = [];
    let fileName = `Production_${type}_${new Date().toISOString().substring(0, 10)}.xlsx`;

    if (type === 'orders') {
      const ordersRes = await getOrdersReport(filters, 1, 5000);
      exportRows = ordersRes.data.map(o => ({
        'Order Code': o.orderCode,
        'Buyer': o.buyer,
        'Unit': o.unit,
        'Line': o.line,
        'Style Ref': o.style,
        'Article': o.article,
        'PO NO': o.poNo,
        'Color': o.color,
        'Season': o.season,
        'Order Qty': o.orderQty,
        'Plan Qty': o.planQty,
        'Actual Qty': o.actualQty,
        'Remaining Qty': o.remainingQty,
        'SMV': o.smv,
        'Achievement %': `${o.achievementRate}%`,
        'Status': o.status,
        'FOB Price': o.fobPrice,
        'Sales Value': o.salesValue
      }));
    } else {
      const dash = await getDashboardData(filters);
      if (type === 'units') {
        exportRows = dash.unitPerformance.map(u => ({
          'Unit Code': u.unitCode,
          'Unit Name': u.unitName,
          'Total Lines': u.totalLines,
          'Total Manpower': u.totalManpower,
          'Target Qty': u.target,
          'Actual Qty': u.actual,
          'Gap': u.gap,
          'SAH': u.sah,
          'Efficiency %': `${u.efficiency}%`,
          'Achievement %': `${u.achievementRate}%`
        }));
      } else if (type === 'buyers') {
        exportRows = dash.buyerPerformance.map(b => ({
          'Buyer': b.buyerName,
          'Target Qty': b.target,
          'Actual Qty': b.actual,
          'Gap': b.gap,
          'SAH': b.sah,
          'Efficiency %': `${b.efficiency}%`,
          'Achievement %': `${b.achievementRate}%`
        }));
      } else if (type === 'daily') {
        exportRows = dash.efficiencyTrend.map(d => ({
          'Date': d.date,
          'Target Qty': d.target,
          'Actual Qty': d.actual,
          'Gap': d.gap,
          'Target SAH': d.targetSah,
          'Actual SAH': d.actualSah,
          'Efficiency %': `${d.efficiency}%`,
          'Achievement %': `${d.achievementRate}%`
        }));
      } else {
        // default lines
        exportRows = dash.linePerformance.map(l => ({
          'Line Name': l.lineName,
          'Unit': l.unitCode,
          'Manpower': l.manpower,
          'Target Qty': l.target,
          'Actual Qty': l.actual,
          'Gap': l.gap,
          'SAH': l.sah,
          'Efficiency %': `${l.efficiency}%`,
          'Achievement %': `${l.achievementRate}%`,
          'Status': l.status
        }));
      }
    }

    const excelBuffer = exportDataToExcel(exportRows, type.toUpperCase());

    return new Response(new Uint8Array(excelBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`
      }
    });
  } catch (err: any) {
    console.error('Export API Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to export Excel' }, { status: 500 });
  }
}
