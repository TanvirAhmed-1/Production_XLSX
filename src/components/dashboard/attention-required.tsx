"use client";

import React from "react";
import { AlertTriangle, AlertOctagon, TrendingDown, Eye, Sliders, ShieldAlert, CheckCircle2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface AttentionRequiredProps {
  alerts: {
    lowPerformingLinesCount: number;
    lowPerformingLines: any[];
    linesWithLargeGaps: any[];
    lowThreshold: number;
  };
  onLineClick?: (lineName: string) => void;
  onOpenSettings?: () => void;
}

export function AttentionRequired({ alerts, onLineClick, onOpenSettings }: AttentionRequiredProps) {
  const { lowPerformingLines = [], linesWithLargeGaps = [], lowThreshold = 60 } = alerts;

  return (
    <Card className="border-rose-200/80 bg-gradient-to-b from-rose-50/30 to-white shadow-sm dark:border-rose-950/60 dark:from-rose-950/20 dark:to-slate-900">
      <CardHeader className="pb-3 border-b border-rose-100 dark:border-rose-950/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base font-bold text-rose-900 dark:text-rose-200 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-rose-600 dark:text-rose-400 animate-pulse" />
              Attention Required — Problematic Lines & Production Gaps
            </CardTitle>
            <CardDescription className="text-xs text-rose-700/80 dark:text-rose-300/80">
              Automatic real-time anomaly detection for lines below {lowThreshold}% efficiency or severe output gaps
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenSettings}
              className="h-7 text-xs border-rose-200 text-rose-800 hover:bg-rose-100 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950"
            >
              <Sliders className="h-3 w-3 mr-1" />
              Configure Threshold ({lowThreshold}%)
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {lowPerformingLines.length === 0 && linesWithLargeGaps.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-6 text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-sm font-semibold">All production lines are performing above the {lowThreshold}% efficiency threshold!</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Low Efficiency Lines Column */}
            <div className="rounded-lg border border-rose-200/90 bg-white p-3.5 shadow-sm dark:border-rose-900/60 dark:bg-slate-900/90">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                  <AlertOctagon className="h-4 w-4 text-rose-600" />
                  Lines Below {lowThreshold}% Efficiency ({lowPerformingLines.length})
                </span>
                <Badge variant="destructive" className="text-[10px]">
                  Critical
                </Badge>
              </div>

              <div className="space-y-2">
                {lowPerformingLines.slice(0, 5).map((line) => (
                  <div
                    key={line.lineId}
                    className="flex items-center justify-between p-2 rounded-md bg-rose-50/60 hover:bg-rose-100/60 border border-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 dark:border-rose-900/40 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 dark:text-slate-100">{line.lineName}</span>
                        <Badge variant="outline" className="text-[10px] py-0 px-1 font-medium">
                          {line.unitCode}
                        </Badge>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Output: {line.actual.toLocaleString()} / {line.target.toLocaleString()} pcs
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-rose-600 dark:text-rose-400 font-mono">
                        {line.efficiency}%
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onLineClick?.(line.lineName)}
                        className="h-6 w-6 p-0 text-slate-500 hover:text-rose-600"
                        title="View Details"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Production Gaps Column */}
            <div className="rounded-lg border border-amber-200/90 bg-white p-3.5 shadow-sm dark:border-amber-900/60 dark:bg-slate-900/90">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <TrendingDown className="h-4 w-4 text-amber-600" />
                  Largest Output Gaps (Pcs Behind Target)
                </span>
                <Badge variant="warning" className="text-[10px]">
                  Variance
                </Badge>
              </div>

              <div className="space-y-2">
                {linesWithLargeGaps.slice(0, 5).map((line) => (
                  <div
                    key={line.lineId}
                    className="flex items-center justify-between p-2 rounded-md bg-amber-50/60 hover:bg-amber-100/60 border border-amber-100 dark:bg-amber-950/30 dark:hover:bg-amber-950/50 dark:border-amber-900/40 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 dark:text-slate-100">{line.lineName}</span>
                        <Badge variant="outline" className="text-[10px] py-0 px-1 font-medium">
                          {line.unitCode}
                        </Badge>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Achieved: {line.achievementRate}% of plan
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-amber-700 dark:text-amber-400 font-mono">
                        -{line.gap.toLocaleString()} pcs
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onLineClick?.(line.lineName)}
                        className="h-6 w-6 p-0 text-slate-500 hover:text-amber-600"
                        title="View Details"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
