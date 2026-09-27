"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileSpreadsheet,
  Layers,
  Users,
  Clock,
  TrendingUp,
  Download,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Filter
} from "lucide-react";

interface SummaryRow {
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
}

interface SignOffData {
  title: string;
  month: string;
  signOffDate: string;
  rows: SummaryRow[];
  budgetSah: number;
  budgetVar: number;
  openDays: number;
}

export function SignoffPlanSummary({
  month = "2026-10",
  batchId,
  unitCode,
}: {
  month?: string;
  batchId?: string;
  unitCode?: string;
}) {
  const [data, setData] = useState<SignOffData | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"all" | "plan" | "variance">("all");

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (month && month !== "ALL") params.append("month", month);
      if (batchId && batchId !== "ALL") params.append("batchId", batchId);
      if (unitCode && unitCode !== "ALL") params.append("unitCode", unitCode);

      const res = await fetch(`/api/analytics/signoff-summary?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch signoff summary");
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Signoff summary error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [month, batchId, unitCode]);

  const handleExport = () => {
    window.open(`/api/excel/export?type=summary&month=${month || "2026-10"}`, "_blank");
  };

  if (loading) {
    return (
      <Card className="shadow-sm border-slate-200 dark:border-slate-800">
        <CardContent className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
          <p className="text-sm font-medium">Generating Executive Sign-off Plan Summary...</p>
        </CardContent>
      </Card>
    );
  }

  if (!data || !data.rows || data.rows.length === 0) {
    return (
      <Card className="shadow-sm border-slate-200 dark:border-slate-800">
        <CardContent className="p-8 text-center text-slate-500">
          <FileSpreadsheet className="h-10 w-10 mx-auto mb-2 text-slate-400" />
          <p className="font-semibold text-slate-700 dark:text-slate-300">No Sign-off Plan Records Available</p>
          <p className="text-xs text-slate-400 mt-1">Upload an Excel production plan to view the executive sign-off breakdown.</p>
        </CardContent>
      </Card>
    );
  }

  const grandTotal = data.rows.find((r) => r.isGrandTotal);

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <Card className="shadow-md border-emerald-200/70 dark:border-emerald-900/60 bg-gradient-to-r from-emerald-50/60 via-slate-50 to-teal-50/50 dark:from-emerald-950/30 dark:via-slate-900 dark:to-teal-950/30">
        <CardHeader className="pb-3 border-b border-emerald-100 dark:border-emerald-900/40">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-emerald-600 text-white font-bold hover:bg-emerald-700 flex items-center gap-1">
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  Excel Master Summary Sheet
                </Badge>
                <Badge variant="outline" className="border-emerald-500 text-emerald-700 dark:text-emerald-400 font-mono text-xs">
                  Sign-off Plan: 28-Sep & 21-Oct
                </Badge>
                <Badge variant="secondary" className="text-xs font-semibold">
                  Open Working Days: {data.openDays} Days
                </Badge>
              </div>
              <CardTitle className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                {data.title}
              </CardTitle>
              <CardDescription className="text-xs text-slate-600 dark:text-slate-400">
                Executive factory sign-off breakdown across Unit 02, Unit 03, Unit 04, B1 Subtotal, Unit B2, and Birichina Grand Total.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex bg-slate-200/80 dark:bg-slate-800 p-0.5 rounded-lg text-xs font-semibold">
                <button
                  onClick={() => setViewMode("all")}
                  className={`px-3 py-1.5 rounded-md transition-colors ${
                    viewMode === "all"
                      ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  All Metrics
                </button>
                <button
                  onClick={() => setViewMode("plan")}
                  className={`px-3 py-1.5 rounded-md transition-colors ${
                    viewMode === "plan"
                      ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  Sign-off Plan Only
                </button>
                <button
                  onClick={() => setViewMode("variance")}
                  className={`px-3 py-1.5 rounded-md transition-colors ${
                    viewMode === "variance"
                      ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  Plan vs Actual Variance
                </button>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                className="h-9 gap-1.5 font-semibold text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800"
              >
                <Download className="h-4 w-4" />
                Export Summary
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Quick Highlights Strip */}
        {grandTotal && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 p-4 bg-white/60 dark:bg-slate-950/40 border-b border-emerald-100 dark:border-emerald-900/30 text-xs">
            <div className="space-y-0.5">
              <span className="text-slate-500 block font-medium">Total Lines</span>
              <span className="font-extrabold text-base text-slate-900 dark:text-slate-100 font-mono">
                {grandTotal.linesCount} Lines
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block">Across 4 Units</span>
            </div>

            <div className="space-y-0.5">
              <span className="text-slate-500 block font-medium">Total Manpower (MO)</span>
              <span className="font-extrabold text-base text-slate-900 dark:text-slate-100 font-mono">
                {grandTotal.manpower.toLocaleString()} MO
              </span>
              <span className="text-[10px] text-slate-500 block">Avg {(grandTotal.manpower / (grandTotal.linesCount || 1)).toFixed(1)} / line</span>
            </div>

            <div className="space-y-0.5">
              <span className="text-slate-500 block font-medium">Planned Target</span>
              <span className="font-extrabold text-base text-emerald-700 dark:text-emerald-400 font-mono">
                {grandTotal.planPcs.toLocaleString()} pcs
              </span>
              <span className="text-[10px] text-slate-500 block">{grandTotal.planSah.toLocaleString()} SAH</span>
            </div>

            <div className="space-y-0.5">
              <span className="text-slate-500 block font-medium">Planned Efficiency</span>
              <span className="font-extrabold text-base text-indigo-600 dark:text-indigo-400 font-mono">
                {grandTotal.plannedEff}%
              </span>
              <span className="text-[10px] text-slate-500 block">From {grandTotal.clockHours.toLocaleString()} Clk Hrs</span>
            </div>

            <div className="space-y-0.5">
              <span className="text-slate-500 block font-medium">Actual Output</span>
              <span className="font-extrabold text-base text-sky-600 dark:text-sky-400 font-mono">
                {grandTotal.actualPcs.toLocaleString()} pcs
              </span>
              <span className="text-[10px] text-slate-500 block">{grandTotal.actualSah.toLocaleString()} SAH</span>
            </div>

            <div className="space-y-0.5">
              <span className="text-slate-500 block font-medium">Target Achievement</span>
              <span className="font-extrabold text-base text-teal-600 dark:text-teal-400 font-mono">
                {grandTotal.achievementRate}%
              </span>
              <span className="text-[10px] text-rose-500 font-semibold block">
                {grandTotal.variancePcs < 0 ? `${grandTotal.variancePcs.toLocaleString()} Gap` : "Achieved"}
              </span>
            </div>
          </div>
        )}
      </Card>

      {/* Main Sign-Off Plan Matrix Table */}
      <Card className="shadow-lg border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-xs text-left border-collapse whitespace-nowrap">
            {/* Multi-Level Table Header */}
            <thead>
              <tr className="bg-slate-800 text-slate-200 text-[11px] font-bold uppercase tracking-wider border-b border-slate-700">
                <th colSpan={3} className="px-3 py-2.5 text-center border-r border-slate-700 bg-slate-900 text-slate-100">
                  Unit Capacity Information
                </th>
                {(viewMode === "all" || viewMode === "plan") && (
                  <th colSpan={4} className="px-3 py-2.5 text-center border-r border-slate-700 bg-emerald-950 text-emerald-200">
                    Sign-Off Production Plan (Target)
                  </th>
                )}
                {(viewMode === "all" || viewMode === "variance") && (
                  <th colSpan={4} className="px-3 py-2.5 text-center border-r border-slate-700 bg-blue-950 text-blue-200">
                    Actual Production Output
                  </th>
                )}
                {(viewMode === "all" || viewMode === "variance") && (
                  <th colSpan={3} className="px-3 py-2.5 text-center bg-purple-950 text-purple-200">
                    Variance & Achievement Rate
                  </th>
                )}
              </tr>

              <tr className="bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700 text-[11px]">
                {/* Unit Details */}
                <th className="px-3 py-2.5 text-center"># of Line</th>
                <th className="px-3 py-2.5 text-center">MO (Manpower)</th>
                <th className="px-3 py-2.5 text-left border-r border-slate-300 dark:border-slate-700">Unit Name</th>

                {/* Plan Metrics */}
                {(viewMode === "all" || viewMode === "plan") && (
                  <>
                    <th className="px-3 py-2.5 text-right font-mono text-emerald-800 dark:text-emerald-300">Plan PCS</th>
                    <th className="px-3 py-2.5 text-right font-mono">SAH (Target)</th>
                    <th className="px-3 py-2.5 text-right font-mono">CLK HOUR</th>
                    <th className="px-3 py-2.5 text-right font-mono border-r border-slate-300 dark:border-slate-700 text-indigo-700 dark:text-indigo-300">
                      Planned Eff%
                    </th>
                  </>
                )}

                {/* Actual Metrics */}
                {(viewMode === "all" || viewMode === "variance") && (
                  <>
                    <th className="px-3 py-2.5 text-right font-mono text-sky-800 dark:text-sky-300">Actual PCS</th>
                    <th className="px-3 py-2.5 text-right font-mono">Actual SAH</th>
                    <th className="px-3 py-2.5 text-right font-mono">Actual Eff%</th>
                    <th className="px-3 py-2.5 text-right font-mono border-r border-slate-300 dark:border-slate-700">Clock Hours</th>
                  </>
                )}

                {/* Variance Metrics */}
                {(viewMode === "all" || viewMode === "variance") && (
                  <>
                    <th className="px-3 py-2.5 text-right font-mono">Variance PCS</th>
                    <th className="px-3 py-2.5 text-right font-mono">Variance SAH</th>
                    <th className="px-3 py-2.5 text-center">Achievement %</th>
                  </>
                )}
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.rows.map((row) => {
                const isB1Total = row.key === "B1-TOTAL";
                const isB2Total = row.key === "B2-TOTAL";
                const isGrandTotal = row.isGrandTotal;

                let rowBg = "hover:bg-slate-50 dark:hover:bg-slate-800/50";
                if (isGrandTotal) {
                  rowBg = "bg-emerald-700 text-white font-black hover:bg-emerald-800 shadow-md text-[13px]";
                } else if (isB1Total) {
                  rowBg = "bg-emerald-50 dark:bg-emerald-950/40 font-extrabold text-emerald-950 dark:text-emerald-200 border-y-2 border-emerald-300 dark:border-emerald-700";
                } else if (isB2Total) {
                  rowBg = "bg-teal-50/80 dark:bg-teal-950/40 font-extrabold text-teal-950 dark:text-teal-200 border-y-2 border-teal-300 dark:border-teal-700";
                }

                return (
                  <tr key={row.key} className={`transition-colors ${rowBg}`}>
                    {/* Line Count */}
                    <td className="px-3 py-3 text-center font-bold font-mono">
                      {row.linesCount}
                    </td>

                    {/* Manpower */}
                    <td className="px-3 py-3 text-center font-bold font-mono">
                      {row.manpower.toLocaleString()}
                    </td>

                    {/* Unit */}
                    <td className="px-3 py-3 font-semibold border-r border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-1.5">
                        {isGrandTotal ? (
                          <Sparkles className="h-4 w-4 text-amber-300 animate-pulse" />
                        ) : isB1Total || isB2Total ? (
                          <Layers className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        ) : null}
                        <span className={isGrandTotal ? "tracking-wide" : ""}>{row.unitCode}</span>
                        {!isGrandTotal && !isB1Total && !isB2Total && (
                          <span className="text-[10px] text-slate-400 font-normal">({row.unitName})</span>
                        )}
                      </div>
                    </td>

                    {/* Plan PCS */}
                    {(viewMode === "all" || viewMode === "plan") && (
                      <>
                        <td className="px-3 py-3 text-right font-mono font-bold">
                          {row.planPcs.toLocaleString()}
                        </td>
                        <td className="px-3 py-3 text-right font-mono">
                          {row.planSah.toLocaleString()}
                        </td>
                        <td className="px-3 py-3 text-right font-mono">
                          {row.clockHours.toLocaleString()}
                        </td>
                        <td className="px-3 py-3 text-right font-mono font-extrabold border-r border-slate-200 dark:border-slate-700">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded ${
                              isGrandTotal
                                ? "bg-emerald-800 text-white"
                                : row.plannedEff >= 70
                                ? "text-emerald-700 dark:text-emerald-300 font-bold"
                                : "text-amber-700 dark:text-amber-300 font-bold"
                            }`}
                          >
                            {row.plannedEff}%
                          </span>
                        </td>
                      </>
                    )}

                    {/* Actual PCS */}
                    {(viewMode === "all" || viewMode === "variance") && (
                      <>
                        <td className="px-3 py-3 text-right font-mono font-bold">
                          {row.actualPcs.toLocaleString()}
                        </td>
                        <td className="px-3 py-3 text-right font-mono">
                          {row.actualSah.toLocaleString()}
                        </td>
                        <td className="px-3 py-3 text-right font-mono font-bold">
                          {row.actualEff}%
                        </td>
                        <td className="px-3 py-3 text-right font-mono border-r border-slate-200 dark:border-slate-700">
                          {row.clockHours.toLocaleString()}
                        </td>
                      </>
                    )}

                    {/* Variance */}
                    {(viewMode === "all" || viewMode === "variance") && (
                      <>
                        <td className={`px-3 py-3 text-right font-mono font-bold ${
                          isGrandTotal ? "text-white" : row.variancePcs >= 0 ? "text-emerald-600" : "text-rose-600"
                        }`}>
                          {row.variancePcs > 0 ? `+${row.variancePcs.toLocaleString()}` : row.variancePcs.toLocaleString()}
                        </td>
                        <td className={`px-3 py-3 text-right font-mono ${
                          isGrandTotal ? "text-white" : row.varianceSah >= 0 ? "text-emerald-600" : "text-rose-600"
                        }`}>
                          {row.varianceSah > 0 ? `+${row.varianceSah.toLocaleString()}` : row.varianceSah.toLocaleString()}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <Badge
                            className={`font-mono font-bold text-xs ${
                              isGrandTotal
                                ? "bg-white text-emerald-900"
                                : row.achievementRate >= 85
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : row.achievementRate >= 70
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            }`}
                          >
                            {row.achievementRate}%
                          </Badge>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
