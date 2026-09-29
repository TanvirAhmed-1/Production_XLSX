import { NextRequest, NextResponse } from "next/server";
import { getCalculationAudit } from "@/lib/reports/report-service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const importId = searchParams.get("importId") || undefined;
    const metric = (searchParams.get("metric") || "sah") as 'sah' | 'planPCS' | 'machineHour' | 'workingHour' | 'efficiency';
    const unit = searchParams.get("unit") || undefined;
    const line = searchParams.get("line") || undefined;
    const dateKey = searchParams.get("dateKey") || undefined;

    const audit = await getCalculationAudit({
      importId,
      metric,
      unit,
      line,
      dateKey,
    });

    if (!audit) {
      return NextResponse.json({ error: "Audit trace not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, audit });
  } catch (error: unknown) {
    console.error("Audit trace error:", error);
    const msg = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
