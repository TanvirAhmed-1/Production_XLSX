"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheck, TrendingUp, Users, Factory, AlertTriangle, ArrowRight } from "lucide-react";

interface ManagementSummaryProps {
  kpis: any;
  topLines: any[];
  lowestLines: any[];
  unitPerformance: any[];
  alerts: any;
  onNavigateTab?: (tab: string) => void;
}

export function ManagementSummary({
  kpis,
  topLines,
  lowestLines,
  unitPerformance,
  alerts,
  onNavigateTab
}: ManagementSummaryProps) {
  return (
    <div className="space-y-6">
      {/* Executive Card Header */}
      <Card className="border-sky-200/90 bg-gradient-to-r from-sky-900 to-indigo-950 text-white shadow-md">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-6 w-6 text-sky-400" />
                <h2 className="text-xl font-bold tracking-tight text-white">
                  Executive Garments Management Summary
                </h2>
              </div>
              <p className="text-xs text-sky-200 mt-1 max-w-2xl">
                Signed-off monthly production plan overview, workforce capacity, and operational efficiency analysis.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-xs px-3 py-1 font-semibold">
                Factory Status: Operational ({kpis.averageEfficiency}% Avg Efficiency)
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-sky-800/60 text-xs">
            <div>
              <span className="text-sky-300 block text-[11px]">Total Planned Output</span>
              <span className="text-xl font-extrabold text-white font-mono mt-0.5 block">
                {(kpis.totalPlannedProduction / 1_000_000).toFixed(2)}M pcs
              </span>
            </div>
            <div>
              <span className="text-sky-300 block text-[11px]">Actual Production</span>
              <span className="text-xl font-extrabold text-emerald-400 font-mono mt-0.5 block">
                {(kpis.totalActualProduction / 1_000_000).toFixed(2)}M pcs
              </span>
            </div>
            <div>
              <span className="text-sky-300 block text-[11px]">Total Workforce</span>
              <span className="text-xl font-extrabold text-white font-mono mt-0.5 block">
                {kpis.totalManpower.toLocaleString()} Operators
              </span>
            </div>
            <div>
              <span className="text-sky-300 block text-[11px]">Produced SAH</span>
              <span className="text-xl font-extrabold text-sky-400 font-mono mt-0.5 block">
                {kpis.totalSAH.toLocaleString()} hrs
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grid: 3 Focus Areas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 1. Production Overview */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Factory className="h-4 w-4 text-sky-600" />
              Production Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
              <span className="text-slate-500">Total Confirmed Orders:</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">{kpis.totalOrders.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
              <span className="text-slate-500">Total Order Volume:</span>
              <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">{(kpis.totalOrderQty / 1_000_000).toFixed(2)}M pcs</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
              <span className="text-slate-500">Total Planned Pcs:</span>
              <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">{(kpis.totalPlannedProduction / 1_000_000).toFixed(2)}M pcs</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
              <span className="text-slate-500">Target Achievement:</span>
              <span className="font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">{kpis.targetAchievementRate}%</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Total Output Gap:</span>
              <span className="font-bold text-rose-600 dark:text-rose-400 font-mono">-{kpis.totalGap.toLocaleString()} pcs</span>
            </div>
          </CardContent>
        </Card>

        {/* 2. Efficiency & Capacity Overview */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-indigo-600" />
              Efficiency & Capacity
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
              <span className="text-slate-500">Average Factory Efficiency:</span>
              <span className="font-extrabold text-indigo-600 dark:text-indigo-400 font-mono text-sm">{kpis.averageEfficiency}%</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
              <span className="text-slate-500">Highest Line Output:</span>
              <span className="font-bold text-emerald-600 font-mono">{topLines[0]?.lineName || "None"} ({kpis.highestLineEfficiency}%)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
              <span className="text-slate-500">Lowest Line Output:</span>
              <span className="font-bold text-rose-600 font-mono">{lowestLines[0]?.lineName || "None"} ({kpis.lowestLineEfficiency}%)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
              <span className="text-slate-500">Total Active Lines:</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">{kpis.totalActiveLines} lines</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Average Operators / Line:</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">
                {kpis.totalActiveLines > 0 ? (kpis.totalManpower / kpis.totalActiveLines).toFixed(1) : "0.0"} workers
              </span>
            </div>
          </CardContent>
        </Card>

        {/* 3. Executive Alerts */}
        <Card className="shadow-sm border-rose-200 dark:border-rose-950">
          <CardHeader className="pb-3 border-b border-rose-100 dark:border-rose-950/60">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-rose-800 dark:text-rose-300">
              <AlertTriangle className="h-4 w-4 text-rose-600" />
              Executive Key Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3 text-xs">
            <div className="p-2.5 rounded-lg bg-rose-50/70 border border-rose-100 dark:bg-rose-950/30 dark:border-rose-900/40">
              <span className="font-bold text-rose-900 dark:text-rose-200 block">
                {alerts.lowPerformingLinesCount} Lines Operating Below {alerts.lowThreshold}%
              </span>
              <span className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 block">
                Bottlenecks identified in line sewing operations needing technical line-balancing.
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-100 dark:bg-amber-950/30 dark:border-amber-900/40">
              <span className="font-bold text-amber-900 dark:text-amber-200 block">
                Top Production Gaps
              </span>
              <span className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 block">
                Total cumulative output gap is {kpis.totalGap.toLocaleString()} pcs across signed-off styles.
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigateTab?.("attention-required")}
              className="w-full h-8 text-xs font-semibold gap-1 text-rose-700 border-rose-200 hover:bg-rose-50 dark:border-rose-900 dark:text-rose-300"
            >
              <span>View All Problematic Lines</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
