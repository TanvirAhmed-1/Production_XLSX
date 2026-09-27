"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Factory, Users, Layers, TrendingUp, ArrowUpRight, ArrowRight } from "lucide-react";

interface UnitData {
  unitId: string;
  unitCode: string;
  unitName: string;
  totalLines: number;
  totalManpower: number;
  target: number;
  actual: number;
  gap: number;
  sah: number;
  efficiency: number;
  achievementRate: number;
}

interface UnitPerformanceSectionProps {
  units: UnitData[];
  onSelectUnit?: (unitCode: string) => void;
}

export function UnitPerformanceSection({ units, onSelectUnit }: UnitPerformanceSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Factory className="h-4 w-4 text-sky-600 dark:text-sky-400" />
            Unit-wise Factory Capacity & Performance
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Comparative performance across manufacturing units: U02, U03, U04, and B2
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {units.map((unit) => {
          return (
            <Card
              key={unit.unitId}
              className="border-slate-200/90 hover:border-sky-400 transition-all shadow-sm hover:shadow-md dark:border-slate-800 dark:hover:border-sky-600"
            >
              <CardHeader className="pb-2 flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800/80">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
                      {unit.unitCode}
                    </CardTitle>
                    <Badge variant="outline" className="text-[10px] font-semibold">
                      {unit.unitName}
                    </Badge>
                  </div>
                </div>

                <Badge
                  variant={unit.efficiency >= 75 ? "success" : unit.efficiency >= 60 ? "info" : "warning"}
                  className="text-xs font-bold font-mono"
                >
                  {unit.efficiency}% Eff
                </Badge>
              </CardHeader>

              <CardContent className="pt-3 space-y-3">
                {/* Production Stats */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800/60">
                    <span className="text-[10px] text-slate-500 block">Actual Output</span>
                    <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400 font-mono">
                      {unit.actual.toLocaleString()} pcs
                    </span>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800/60">
                    <span className="text-[10px] text-slate-500 block">Planned Target</span>
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-200 font-mono">
                      {unit.target.toLocaleString()} pcs
                    </span>
                  </div>
                </div>

                {/* Capacity Details */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <Layers className="h-3 w-3 text-sky-500" />
                      Total Lines:
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{unit.totalLines} lines</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3 text-indigo-500" />
                      Manpower:
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{unit.totalManpower.toLocaleString()} operators</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-amber-500" />
                      Produced SAH:
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{unit.sah.toLocaleString()} hrs</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <span>Target Achievement:</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">{unit.achievementRate}%</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="w-full bg-slate-100 rounded-full h-2 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-2 rounded-full ${
                        unit.achievementRate >= 90
                          ? "bg-emerald-500"
                          : unit.achievementRate >= 75
                          ? "bg-sky-500"
                          : "bg-amber-500"
                      }`}
                      style={{ width: `${Math.min(100, unit.achievementRate)}%` }}
                    />
                  </div>
                </div>

                {/* Drill Down Action */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSelectUnit?.(unit.unitCode)}
                  className="w-full h-8 text-xs font-semibold gap-1.5 border-slate-200 hover:bg-sky-50 hover:text-sky-700 dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  <span>Filter by {unit.unitCode}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
