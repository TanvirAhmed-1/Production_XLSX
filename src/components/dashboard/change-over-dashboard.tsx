"use client";

import React, { useState } from "react";
import { BarChart3, Download, RefreshCw, Zap } from "lucide-react";
import { ChangeOverResult } from "@/lib/calculations";

interface ChangeOverDashboardProps {
  changeOver: ChangeOverResult;
}

export function ChangeOverDashboard({ changeOver }: ChangeOverDashboardProps) {
  const { dateKeys, units, factoryDailyCounts, totalChangeovers } = changeOver;
  const unitKeys = Object.keys(units);

  const [selectedUnit, setSelectedUnit] = useState<string>(unitKeys[0] || "B1U2");

  const currentUnitData = units[selectedUnit] || units[unitKeys[0]];

  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden space-y-4">
      {/* Top Header */}
      <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            Change Over Timeline & Dominant Styles
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Total {totalChangeovers} Changeovers
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Timeline tracking style transitions, team numbers and daily dominant products per line
          </p>
        </div>

        {/* Unit Selector Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800">
          {unitKeys.map(u => (
            <button
              key={u}
              onClick={() => setSelectedUnit(u)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                selectedUnit === u
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {units[u]?.label || u}
            </button>
          ))}
        </div>
      </div>

      {/* Changeover Matrix Table */}
      <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
        <table className="w-full text-xs text-left border-collapse font-mono">
          <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[11px] sticky top-0 border-b border-slate-800 z-10 font-sans">
            <tr>
              <th className="py-2.5 px-3 sticky left-0 bg-slate-950 z-20 border-r border-slate-800 min-w-[70px]">
                Team No
              </th>
              <th className="py-2.5 px-3 sticky left-16 bg-slate-950 z-20 border-r border-slate-800 min-w-[90px]">
                Line
              </th>
              <th className="py-2.5 px-3 border-r border-slate-800 min-w-[130px]">
                Running Style
              </th>
              <th className="py-2.5 px-2 text-center border-r border-slate-800">
                COs
              </th>
              {dateKeys.map(dk => {
                const dayNum = dk.split("-")[2];
                const dObj = new Date(dk);
                const isFri = !isNaN(dObj.getTime()) && dObj.getUTCDay() === 5;
                return (
                  <th
                    key={dk}
                    className={`py-2.5 px-1 text-center min-w-[50px] border-r border-slate-800/40 ${
                      isFri ? "bg-rose-950/40 text-rose-300" : ""
                    }`}
                  >
                    {dayNum}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {currentUnitData?.lines.map(line => (
              <tr key={line.line} className="hover:bg-slate-800/40 transition">
                <td className="py-2 px-3 sticky left-0 bg-slate-900 z-10 border-r border-slate-800 font-bold text-indigo-400">
                  {line.teamNo}
                </td>
                <td className="py-2 px-3 sticky left-16 bg-slate-900 z-10 border-r border-slate-800 font-sans font-medium text-white">
                  {line.line}
                </td>
                <td className="py-2 px-3 border-r border-slate-800 font-sans text-slate-300 truncate max-w-[140px]" title={line.runningStyle}>
                  {line.runningStyle}
                </td>
                <td className="py-2 px-2 text-center border-r border-slate-800 font-bold">
                  {line.totalChangeovers > 0 ? (
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px]">
                      {line.totalChangeovers}
                    </span>
                  ) : (
                    <span className="text-slate-600">0</span>
                  )}
                </td>
                {dateKeys.map(dk => {
                  const entry = line.timeline[dk];
                  const dObj = new Date(dk);
                  const isFri = !isNaN(dObj.getTime()) && dObj.getUTCDay() === 5;

                  if (!entry) {
                    return (
                      <td
                        key={dk}
                        className={`py-1.5 px-1 text-center border-r border-slate-800/30 ${
                          isFri ? "bg-rose-950/20" : ""
                        }`}
                      >
                        <span className="text-slate-700 text-[10px]">—</span>
                      </td>
                    );
                  }

                  return (
                    <td
                      key={dk}
                      className={`py-1 px-1 border-r border-slate-800/30 text-center ${
                        isFri ? "bg-rose-950/20" : ""
                      }`}
                      title={entry.label}
                    >
                      <div
                        className={`px-1.5 py-1 rounded text-[10px] font-sans truncate ${
                          entry.isChangeover
                            ? "bg-amber-500/30 text-amber-200 border border-amber-500/50 font-bold shadow-sm"
                            : "bg-slate-800/80 text-slate-200 border border-slate-700/60"
                        }`}
                      >
                        {entry.styleRef}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}

            {/* Unit Daily Changeovers Summary */}
            <tr className="bg-slate-950 font-bold text-white border-t-2 border-indigo-500">
              <td colSpan={3} className="py-2.5 px-4 font-sans text-indigo-300">
                Daily Changeovers ({currentUnitData?.label || selectedUnit})
              </td>
              <td className="py-2.5 px-2 text-center text-indigo-300">
                {currentUnitData?.dailyCounts.reduce((s, v) => s + v, 0)}
              </td>
              {currentUnitData?.dailyCounts.map((c, i) => (
                <td
                  key={i}
                  className={`py-2 px-1 text-center border-r border-slate-800/40 ${
                    c > 0 ? "text-amber-300 font-bold" : "text-slate-600"
                  }`}
                >
                  {c > 0 ? c : "—"}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
