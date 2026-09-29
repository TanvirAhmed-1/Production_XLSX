"use client";

import React, { useState } from "react";
import { Calendar, Package, Clock, Gauge, Percent, Layers, AlertCircle } from "lucide-react";
import { DailySummaryResult, LineDetailResult } from "@/lib/calculations";

interface DailyProductionReportProps {
  daily: DailySummaryResult[];
  lineDetail: LineDetailResult;
  onAuditClick: (params: { metric: 'sah' | 'planPCS' | 'machineHour'; dateKey: string }) => void;
}

export function DailyProductionReport({
  daily,
  lineDetail,
  onAuditClick,
}: DailyProductionReportProps) {
  const [selectedDate, setSelectedDate] = useState<string>(
    daily.find(d => d.planPCS > 0)?.dateKey || daily[0]?.dateKey || ""
  );

  const currentDay = daily.find(d => d.dateKey === selectedDate) || daily[0];

  // Get active lines on this date
  const linesOnDate = lineDetail.records
    .map(r => ({
      unit: r.unit,
      unitLabel: r.unitLabel,
      line: r.line,
      manpower: r.manpower,
      metric: r.daily[selectedDate] || {
        pcs: 0,
        sah: 0,
        machineHour: 0,
        workingHour: 0,
        efficiency: 0,
      },
    }))
    .filter(l => l.metric.pcs > 0 || l.metric.sah > 0)
    .sort((a, b) => b.metric.pcs - a.metric.pcs);

  return (
    <div className="space-y-6">
      {/* Date Selector Carousel / Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Select Planning Date (October 2026)
          </span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
          {daily.map(d => {
            const isSelected = d.dateKey === selectedDate;
            const dayNum = d.dateKey.split("-")[2];
            const hasData = d.planPCS > 0;

            return (
              <button
                key={d.dateKey}
                onClick={() => setSelectedDate(d.dateKey)}
                className={`flex flex-col items-center min-w-[54px] py-2 px-1.5 rounded-xl border text-xs transition ${
                  isSelected
                    ? "bg-indigo-600 border-indigo-500 text-white font-bold shadow-md shadow-indigo-600/30 scale-105"
                    : d.isWeeklyOff
                    ? "bg-rose-950/20 border-rose-900/40 text-rose-400/80 hover:bg-rose-950/40"
                    : hasData
                    ? "bg-slate-800/80 border-slate-700/80 text-slate-200 hover:bg-slate-700"
                    : "bg-slate-950/60 border-slate-800 text-slate-500 hover:text-slate-400"
                }`}
              >
                <span className="text-[10px] uppercase">{d.isWeeklyOff ? "Fri" : "Day"}</span>
                <span className="text-sm font-black">{dayNum}</span>
                <span className="text-[9px] mt-0.5 opacity-80">
                  {hasData ? `${(d.planPCS / 1000).toFixed(0)}k` : "—"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day KPI Cards */}
      {currentDay && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div
            onClick={() => onAuditClick({ metric: "planPCS", dateKey: currentDay.dateKey })}
            className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-md hover:border-indigo-500/50 cursor-pointer transition"
          >
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-medium uppercase">Plan PCS</span>
              <Package className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-xl font-bold text-white">
              {currentDay.planPCS.toLocaleString()}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Planned output</p>
          </div>

          <div
            onClick={() => onAuditClick({ metric: "sah", dateKey: currentDay.dateKey })}
            className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-md hover:border-indigo-500/50 cursor-pointer transition"
          >
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-medium uppercase">SAH</span>
              <Clock className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-xl font-bold text-purple-300">
              {currentDay.sah.toLocaleString(undefined, { maximumFractionDigits: 1 })}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Standard Allowed Hours</p>
          </div>

          <div
            onClick={() => onAuditClick({ metric: "machineHour", dateKey: currentDay.dateKey })}
            className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-md hover:border-indigo-500/50 cursor-pointer transition"
          >
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-medium uppercase">Machine HR</span>
              <Gauge className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-xl font-bold text-amber-300">
              {currentDay.machineHour.toLocaleString()}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Clock capacity</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-md">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-medium uppercase">Efficiency</span>
              <Percent className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl font-bold text-emerald-300">
              {currentDay.efficiency.toFixed(2)}%
            </div>
            <p className="text-[10px] text-slate-400 mt-1">SAH / Machine HR</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-md">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-medium uppercase">Running Lines</span>
              <Layers className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-xl font-bold text-cyan-300">
              {currentDay.runningLines}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">SAH &gt; 0 that day</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-md">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-medium uppercase">Idle Lines</span>
              <AlertCircle className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-xl font-bold text-rose-300">
              {currentDay.idleLines}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Capacity - Running</p>
          </div>
        </div>
      )}

      {/* Lines Running on this Date */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-white">
              Lines Operating on {selectedDate} ({linesOnDate.length} Active Lines)
            </h4>
            <p className="text-xs text-slate-400">
              Output breakdown calculated from individual style orders
            </p>
          </div>
        </div>

        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[11px] sticky top-0 border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-4">Unit</th>
                <th className="py-2.5 px-4">Line</th>
                <th className="py-2.5 px-4 text-center">Manpower</th>
                <th className="py-2.5 px-4 text-right">Plan PCS</th>
                <th className="py-2.5 px-4 text-right">SAH</th>
                <th className="py-2.5 px-4 text-right">Machine HR</th>
                <th className="py-2.5 px-4 text-right">Working HR</th>
                <th className="py-2.5 px-4 text-right">Efficiency %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {linesOnDate.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No production planned on this date {currentDay?.isWeeklyOff && "(Weekly Off Day - Friday)"}
                  </td>
                </tr>
              ) : (
                linesOnDate.map((l, i) => (
                  <tr key={i} className="hover:bg-slate-800/50 transition">
                    <td className="py-2.5 px-4 font-medium text-slate-300">{l.unitLabel}</td>
                    <td className="py-2.5 px-4 font-bold text-white">{l.line}</td>
                    <td className="py-2.5 px-4 text-center font-mono text-slate-400">{l.manpower}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-100">
                      {l.metric.pcs.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-indigo-400 font-semibold">
                      {l.metric.sah.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-amber-400">
                      {l.metric.machineHour.toFixed(1)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-300">
                      {l.metric.workingHour.toFixed(1)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs ${
                          l.metric.efficiency >= 70
                            ? "bg-emerald-500/20 text-emerald-400"
                            : l.metric.efficiency >= 60
                            ? "bg-amber-500/20 text-amber-400"
                            : "bg-rose-500/20 text-rose-400"
                        }`}
                      >
                        {l.metric.efficiency.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
