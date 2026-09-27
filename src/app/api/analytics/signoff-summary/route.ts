import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { buildWhereClause } from "@/lib/analytics-service";

export interface SignOffSummaryRow {
  key: string;
  unitCode: string;
  unitName: string;
  linesCount: number;
  manpower: number;
  planPcs: number;
  planSah: number;
  clockHours: number;
  plannedEff: number;
  actualPcs: number;
  actualSah: number;
  actualEff: number;
  variancePcs: number;
  varianceSah: number;
  achievementRate: number;
  isSubtotal?: boolean;
  isGrandTotal?: boolean;
  subRows?: SignOffSummaryRow[];
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month") || undefined;
    const batchId = searchParams.get("batchId") || undefined;
    const unitCode = searchParams.get("unitCode") || undefined;

    const where = buildWhereClause({ month, batchId, unitCode });

    // 1. Fetch units with their lines
    const units = await prisma.unit.findMany({
      include: {
        lines: {
          orderBy: { name: 'asc' }
        }
      },
      orderBy: { code: 'asc' }
    });

    const rows: SignOffSummaryRow[] = [];

    let b1Lines = 0;
    let b1Mo = 0;
    let b1PlanPcs = 0;
    let b1PlanSah = 0;
    let b1ClkHrs = 0;
    let b1ActPcs = 0;
    let b1ActSah = 0;

    let grandLines = 0;
    let grandMo = 0;
    let grandPlanPcs = 0;
    let grandPlanSah = 0;
    let grandClkHrs = 0;
    let grandActPcs = 0;
    let grandActSah = 0;

    // Process each unit in standard garments order (U02, U03, U04, B2)
    const unitOrder = ["U02", "U03", "U04", "B2"];
    const sortedUnits = [...units].sort((a, b) => {
      const idxA = unitOrder.indexOf(a.code);
      const idxB = unitOrder.indexOf(b.code);
      return (idxA >= 0 ? idxA : 99) - (idxB >= 0 ? idxB : 99);
    });

    for (const unit of sortedUnits) {
      const unitWhere = {
        ...where,
        unitId: unit.id
      };

      const dailyAgg = await prisma.productionDaily.aggregate({
        where: unitWhere,
        _sum: {
          targetQty: true,
          actualQty: true,
          targetSah: true,
          actualSah: true,
          clockHours: true
        }
      });

      const activeLinesAgg = await prisma.productionDaily.groupBy({
        by: ['lineId'],
        where: unitWhere
      });

      const activeLineIds = activeLinesAgg.map(l => l.lineId);
      const activeLines = unit.lines.filter(l => activeLineIds.includes(l.id));
      
      const linesCount = activeLines.length > 0 ? activeLines.length : (activeLinesAgg.length > 0 ? activeLinesAgg.length : unit.lines.length);
      const manpower = activeLines.length > 0 
        ? activeLines.reduce((s, l) => s + (l.manpower || 25), 0)
        : unit.lines.reduce((s, l) => s + (l.manpower || 25), 0);

      const planPcs = dailyAgg._sum.targetQty || 0;
      const planSah = dailyAgg._sum.targetSah || 0;
      const clkHrs = dailyAgg._sum.clockHours || 0;
      const actualPcs = dailyAgg._sum.actualQty || 0;
      const actualSah = dailyAgg._sum.actualSah || 0;

      // When clock hours not directly stored, standard garments clock hours = manpower * workingHours (10) * workingDays (26)
      const effectiveClkHrs = clkHrs > 0 ? clkHrs : (manpower * 10 * 26);
      const plannedEff = effectiveClkHrs > 0 ? Number(((planSah / effectiveClkHrs) * 100).toFixed(1)) : 0;
      const actualEff = effectiveClkHrs > 0 ? Number(((actualSah / effectiveClkHrs) * 100).toFixed(1)) : 0;
      const variancePcs = actualPcs - planPcs;
      const varianceSah = actualSah - planSah;
      const achievementRate = planPcs > 0 ? Number(((actualPcs / planPcs) * 100).toFixed(1)) : 0;

      const unitRow: SignOffSummaryRow = {
        key: unit.code,
        unitCode: unit.code,
        unitName: unit.name,
        linesCount,
        manpower,
        planPcs,
        planSah: Number(planSah.toFixed(1)),
        clockHours: effectiveClkHrs,
        plannedEff,
        actualPcs,
        actualSah: Number(actualSah.toFixed(1)),
        actualEff,
        variancePcs,
        varianceSah: Number(varianceSah.toFixed(1)),
        achievementRate
      };

      rows.push(unitRow);

      // Accumulate to B1 Total (U02, U03, U04)
      if (['U02', 'U03', 'U04'].includes(unit.code)) {
        b1Lines += linesCount;
        b1Mo += manpower;
        b1PlanPcs += planPcs;
        b1PlanSah += planSah;
        b1ClkHrs += effectiveClkHrs;
        b1ActPcs += actualPcs;
        b1ActSah += actualSah;
      }

      // Grand Totals
      grandLines += linesCount;
      grandMo += manpower;
      grandPlanPcs += planPcs;
      grandPlanSah += planSah;
      grandClkHrs += effectiveClkHrs;
      grandActPcs += actualPcs;
      grandActSah += actualSah;

      // After U04, insert B1 Total Subtotal
      if (unit.code === 'U04') {
        const b1PlanEff = b1ClkHrs > 0 ? Number(((b1PlanSah / b1ClkHrs) * 100).toFixed(1)) : 0;
        const b1ActEff = b1ClkHrs > 0 ? Number(((b1ActSah / b1ClkHrs) * 100).toFixed(1)) : 0;
        const b1Ach = b1PlanPcs > 0 ? Number(((b1ActPcs / b1PlanPcs) * 100).toFixed(1)) : 0;

        rows.push({
          key: 'B1-TOTAL',
          unitCode: 'B1 Total',
          unitName: 'B1 Factory Total (U02 + U03 + U04)',
          linesCount: b1Lines,
          manpower: b1Mo,
          planPcs: b1PlanPcs,
          planSah: Number(b1PlanSah.toFixed(1)),
          clockHours: b1ClkHrs,
          plannedEff: b1PlanEff,
          actualPcs: b1ActPcs,
          actualSah: Number(b1ActSah.toFixed(1)),
          actualEff: b1ActEff,
          variancePcs: b1ActPcs - b1PlanPcs,
          varianceSah: Number((b1ActSah - b1PlanSah).toFixed(1)),
          achievementRate: b1Ach,
          isSubtotal: true
        });
      }

      // After B2, insert B2 Total Subtotal
      if (unit.code === 'B2') {
        const b2PlanEff = effectiveClkHrs > 0 ? Number(((planSah / effectiveClkHrs) * 100).toFixed(1)) : 0;
        const b2ActEff = effectiveClkHrs > 0 ? Number(((actualSah / effectiveClkHrs) * 100).toFixed(1)) : 0;
        const b2Ach = planPcs > 0 ? Number(((actualPcs / planPcs) * 100).toFixed(1)) : 0;

        rows.push({
          key: 'B2-TOTAL',
          unitCode: 'B2 Total',
          unitName: 'Unit B2 Total Capacity',
          linesCount,
          manpower,
          planPcs,
          planSah: Number(planSah.toFixed(1)),
          clockHours: effectiveClkHrs,
          plannedEff: b2PlanEff,
          actualPcs,
          actualSah: Number(actualSah.toFixed(1)),
          actualEff: b2ActEff,
          variancePcs: actualPcs - planPcs,
          varianceSah: Number((actualSah - planSah).toFixed(1)),
          achievementRate: b2Ach,
          isSubtotal: true
        });
      }
    }

    // Grand Total Row (Birichina Total)
    const grandPlanEff = grandClkHrs > 0 ? Number(((grandPlanSah / grandClkHrs) * 100).toFixed(1)) : 0;
    const grandActEff = grandClkHrs > 0 ? Number(((grandActSah / grandClkHrs) * 100).toFixed(1)) : 0;
    const grandAch = grandPlanPcs > 0 ? Number(((grandActPcs / grandPlanPcs) * 100).toFixed(1)) : 0;

    const grandTotalRow: SignOffSummaryRow = {
      key: 'BIRICHINA-GRAND-TOTAL',
      unitCode: 'Birichina',
      unitName: 'Birichina Overall Sign-off Total',
      linesCount: grandLines,
      manpower: grandMo,
      planPcs: grandPlanPcs,
      planSah: Number(grandPlanSah.toFixed(1)),
      clockHours: grandClkHrs,
      plannedEff: grandPlanEff,
      actualPcs: grandActPcs,
      actualSah: Number(grandActSah.toFixed(1)),
      actualEff: grandActEff,
      variancePcs: grandActPcs - grandPlanPcs,
      varianceSah: Number((grandActSah - grandPlanSah).toFixed(1)),
      achievementRate: grandAch,
      isGrandTotal: true
    };

    rows.push(grandTotalRow);

    return NextResponse.json({
      title: `Month of ${month || "Oct'26"} Sign off Plan Summary`,
      month: month || "2026-10",
      signOffDate: "28-Sep / 21-Oct",
      rows,
      budgetSah: 566920,
      budgetVar: Number((grandPlanSah - 566920).toFixed(1)),
      openDays: 26
    });
  } catch (error: any) {
    console.error("Error in signoff summary API:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
