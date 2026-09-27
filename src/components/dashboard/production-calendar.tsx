"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";

interface DailyEntry {
  date: string;
  shortDate: string;
  target: number;
  actual: number;
  gap: number;
  efficiency: number;
  achievementRate: number;
}

interface ProductionCalendarProps {
  days: DailyEntry[];
  onSelectDate?: (dateStr: string) => void;
}

export function ProductionCalendar({ days, onSelectDate }: ProductionCalendarProps) {
  return (
    <Card className="shadow-sm border-slate-200/90 dark:border-slate-800">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-sky-600 dark:text-sky-400" />
              Monthly Production Calendar (October 2026)
            </CardTitle>
            <CardDescription className="text-xs">
              Daily operational output grid with performance heatmap indicators
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> ≥85% Achieved</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-sky-500" /> 75–84%</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> &lt;75%</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
          {days.map((day) => {
            const isHigh = day.achievementRate >= 85;
            const isMedium = day.achievementRate >= 75 && day.achievementRate < 85;
            const dayNumber = parseInt(day.date.split('-')[2], 10);

            return (
              <div
                key={day.date}
                onClick={() => onSelectDate?.(day.date)}
                className={`p-3 rounded-xl border transition-all cursor-pointer hover:shadow-md hover:scale-[1.02] flex flex-col justify-between ${
                  isHigh
                    ? "bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/40"
                    : isMedium
                    ? "bg-sky-50/50 border-sky-200 dark:bg-sky-950/20 dark:border-sky-900/40"
                    : "bg-amber-50/50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/40"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      Oct {dayNumber}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                        isHigh
                          ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                          : isMedium
                          ? "bg-sky-500/20 text-sky-700 dark:text-sky-300"
                          : "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                      }`}
                    >
                      {day.efficiency}% Eff
                    </span>
                  </div>

                  <div className="mt-2 space-y-1 text-[11px]">
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>Actual:</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">
                        {(day.actual / 1000).toFixed(1)}k
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-500 dark:text-slate-500">
                      <span>Target:</span>
                      <span className="font-mono">{(day.target / 1000).toFixed(1)}k</span>
                    </div>
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between text-[10px] font-semibold text-sky-600 dark:text-sky-400">
                  <span>{day.achievementRate}% Achieved</span>
                  <ArrowRight className="h-3 w-3" />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
