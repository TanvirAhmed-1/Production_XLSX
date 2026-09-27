"use client";

import React from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  LineChart,
  AreaChart,
  Bar,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Cell
} from "recharts";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp, Award, AlertTriangle, Factory, Briefcase } from "lucide-react";

interface ProductionChartsProps {
  efficiencyTrend: {
    date: string;
    shortDate: string;
    target: number;
    actual: number;
    gap: number;
    efficiency: number;
    achievementRate: number;
  }[];
  topLines: {
    lineName: string;
    unitCode: string;
    efficiency: number;
    actual: number;
    target: number;
  }[];
  lowestLines: {
    lineName: string;
    unitCode: string;
    efficiency: number;
    actual: number;
    target: number;
    gap: number;
  }[];
  unitPerformance: {
    unitCode: string;
    unitName: string;
    totalLines: number;
    totalManpower: number;
    target: number;
    actual: number;
    efficiency: number;
    achievementRate: number;
  }[];
  buyerPerformance: {
    buyerName: string;
    target: number;
    actual: number;
    efficiency: number;
    achievementRate: number;
  }[];
  onLineClick?: (lineName: string) => void;
  onUnitClick?: (unitCode: string) => void;
  onBuyerClick?: (buyerName: string) => void;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur text-xs dark:border-slate-800 dark:bg-slate-900/95">
        <p className="font-bold text-slate-800 dark:text-slate-100 mb-1.5">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={`item-${index}`} className="flex items-center justify-between gap-4 py-0.5">
            <span className="flex items-center gap-1.5" style={{ color: entry.color }}>
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
              {entry.name}:
            </span>
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {typeof entry.value === 'number'
                ? entry.name.toLowerCase().includes('eff') || entry.name.toLowerCase().includes('%') || entry.name.toLowerCase().includes('rate')
                  ? `${entry.value}%`
                  : entry.value.toLocaleString()
                : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export function ProductionCharts({
  efficiencyTrend,
  topLines,
  lowestLines,
  unitPerformance,
  buyerPerformance,
  onLineClick,
  onUnitClick,
  onBuyerClick
}: ProductionChartsProps) {
  const [topLinesLimit, setTopLinesLimit] = React.useState<number>(5);

  return (
    <div className="space-y-6">
      {/* 1. Target vs Actual & Efficiency Trend Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Target vs Actual Daily Chart */}
        <Card className="shadow-sm border-slate-200/90 dark:border-slate-800">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                Target vs Actual Production (Daily)
              </CardTitle>
              <CardDescription className="text-xs">
                Comparison of daily planned output vs actual garments produced
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-[11px] font-medium border-sky-300 text-sky-700 dark:border-sky-800 dark:text-sky-300">
              Daily Output
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={efficiencyTrend} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} opacity={0.7} />
                  <XAxis dataKey="shortDate" tick={{ fontSize: 11 }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Bar dataKey="target" name="Target (Planned)" fill="#38bdf8" radius={[4, 4, 0, 0]} maxBarSize={16} />
                  <Bar dataKey="actual" name="Actual Production" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={16} />
                  <Line type="monotone" dataKey="actual" name="Output Trend" stroke="#047857" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Date-wise Efficiency Trend */}
        <Card className="shadow-sm border-slate-200/90 dark:border-slate-800">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                Daily Efficiency Trend (%)
              </CardTitle>
              <CardDescription className="text-xs">
                Actual factory efficiency curve with 80% benchmark target
              </CardDescription>
            </div>
            <Badge variant="success" className="text-[11px] font-medium">
              80% Benchmark
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={efficiencyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="effGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} opacity={0.7} />
                  <XAxis dataKey="shortDate" tick={{ fontSize: 11 }} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickLine={false} tickFormatter={(v) => `${v}%`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <ReferenceLine y={80} stroke="#ef4444" strokeDasharray="4 4" label={{ value: '80% Target', position: 'insideTopRight', fill: '#ef4444', fontSize: 10 }} />
                  <Area type="monotone" dataKey="efficiency" name="Efficiency %" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#effGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. Top Performing Lines vs Bottom Low Performing Lines */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performing Lines */}
        <Card className="shadow-sm border-slate-200/90 dark:border-slate-800">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Award className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                Top Performing Lines (Highest Efficiency)
              </CardTitle>
              <CardDescription className="text-xs">
                Production lines with the highest efficiency percentage
              </CardDescription>
            </div>
            <div className="flex items-center gap-1 text-xs">
              <span className="text-[11px] text-slate-400">Show:</span>
              {[5, 10].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setTopLinesLimit(num)}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                    topLinesLimit === num ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  Top {num}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topLines.slice(0, topLinesLimit)}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" opacity={0.7} />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
                  <YAxis dataKey="lineName" type="category" tick={{ fontSize: 11 }} width={65} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="efficiency"
                    name="Efficiency %"
                    fill="#10b981"
                    radius={[0, 4, 4, 0]}
                    onClick={(entry) => onLineClick?.(entry.lineName)}
                    className="cursor-pointer"
                  >
                    {topLines.slice(0, topLinesLimit).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? "#059669" : "#10b981"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Low Performing Lines */}
        <Card className="shadow-sm border-slate-200/90 dark:border-slate-800">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                Low Performing Lines (Immediate Attention)
              </CardTitle>
              <CardDescription className="text-xs">
                Production lines with lowest efficiency or output deficits
              </CardDescription>
            </div>
            <Badge variant="destructive" className="text-[11px] font-medium">
              Action Needed
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={lowestLines.slice(0, 5)}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" opacity={0.7} />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
                  <YAxis dataKey="lineName" type="category" tick={{ fontSize: 11 }} width={65} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="efficiency"
                    name="Efficiency %"
                    fill="#f43f5e"
                    radius={[0, 4, 4, 0]}
                    onClick={(entry) => onLineClick?.(entry.lineName)}
                    className="cursor-pointer"
                  >
                    {lowestLines.slice(0, 5).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.efficiency < 60 ? "#e11d48" : "#f59e0b"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Unit-wise & Buyer-wise Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Unit Performance Breakdown */}
        <Card className="shadow-sm border-slate-200/90 dark:border-slate-800">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Factory className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                Unit-wise Output & Efficiency Comparison
              </CardTitle>
              <CardDescription className="text-xs">
                Performance breakdown across U02, U03, U04, and B2 units
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={unitPerformance} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} opacity={0.7} />
                  <XAxis dataKey="unitCode" tick={{ fontSize: 12, fontWeight: 600 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                  <Bar
                    dataKey="target"
                    name="Target Pcs"
                    fill="#93c5fd"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={30}
                  />
                  <Bar
                    dataKey="actual"
                    name="Actual Pcs"
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={30}
                    onClick={(entry) => onUnitClick?.(entry.unitCode)}
                    className="cursor-pointer"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Buyer Distribution */}
        <Card className="shadow-sm border-slate-200/90 dark:border-slate-800">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                Buyer-wise Production Volume
              </CardTitle>
              <CardDescription className="text-xs">
                Output volume distribution by customer/brand
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={buyerPerformance.slice(0, 7)}
                  margin={{ top: 10, right: 10, left: -10, bottom: 25 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} opacity={0.7} />
                  <XAxis dataKey="buyerName" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="actual"
                    name="Produced Pcs"
                    fill="#8b5cf6"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={32}
                    onClick={(entry) => onBuyerClick?.(entry.buyerName)}
                    className="cursor-pointer"
                  >
                    {buyerPerformance.slice(0, 7).map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={['#8b5cf6', '#6366f1', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899'][index % 7]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
