"use client";

import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Clock, Award, TrendingUp, CheckCircle2 } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell
} from "recharts";

interface ManpowerAnalysisProps {
  unitPerformance: any[];
  linePerformance: any[];
}

export function ManpowerAnalysis({ unitPerformance, linePerformance }: ManpowerAnalysisProps) {
  const manpowerByUnit = React.useMemo(() => {
    return unitPerformance.map(u => ({
      unit: u.unitCode,
      manpower: u.totalManpower,
      actualPcs: u.actual,
      pcsPerWorker: u.totalManpower > 0 ? Math.round(u.actual / u.totalManpower) : 0,
      efficiency: u.efficiency
    }));
  }, [unitPerformance]);

  const topEfficientManpowerLines = React.useMemo(() => {
    return [...linePerformance]
      .sort((a, b) => (b.actual / b.manpower) - (a.actual / a.manpower))
      .slice(0, 8)
      .map(l => ({
        lineName: l.lineName,
        pcsPerWorker: Math.round(l.actual / l.manpower),
        manpower: l.manpower,
        actual: l.actual,
        efficiency: l.efficiency
      }));
  }, [linePerformance]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Manpower Distribution by Unit */}
        <Card className="shadow-sm border-slate-200/90 dark:border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Users className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              Manpower Distribution by Manufacturing Unit
            </CardTitle>
            <CardDescription className="text-xs">
              Allocated operators and sewing workforce across U02, U03, U04, and B2
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={manpowerByUnit} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} opacity={0.7} />
                  <XAxis dataKey="unit" tick={{ fontSize: 12, fontWeight: 600 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="manpower" name="Assigned Operators" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={36}>
                    {manpowerByUnit.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={['#8b5cf6', '#6366f1', '#3b82f6', '#06b6d4'][index % 4]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Productivity (Pcs per Operator) */}
        <Card className="shadow-sm border-slate-200/90 dark:border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Highest Output per Worker (Productivity Benchmark)
            </CardTitle>
            <CardDescription className="text-xs">
              Average pieces produced per operator across top lines
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topEfficientManpowerLines} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" opacity={0.7} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="lineName" type="category" tick={{ fontSize: 11 }} width={65} />
                  <Tooltip formatter={(value: any) => [`${value.toLocaleString()} pcs / worker`, "Productivity"]} />
                  <Bar dataKey="pcsPerWorker" name="Pcs Produced / Operator" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
