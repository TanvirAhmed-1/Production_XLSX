import { NextRequest, NextResponse } from "next/server";
import { getProductionReportData } from "@/lib/reports/report-service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const importId = searchParams.get("importId") || undefined;
    const unit = searchParams.get("unit") || undefined;
    const line = searchParams.get("line") || undefined;
    const buyer = searchParams.get("buyer") || undefined;
    const styleRef = searchParams.get("styleRef") || undefined;

    const data = await getProductionReportData({
      importId,
      unit,
      line,
      buyer,
      styleRef,
    });

    if (!data) {
      return NextResponse.json(
        { error: "No production report data found. Please upload an Excel plan." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      report: data.report,
      runningLines: data.runningLines,
      changeOver: data.changeOver,
      lineDetail: data.lineDetail,
    });
  } catch (error: unknown) {
    console.error("Failed to generate production report:", error);
    const msg = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
