"use client";

import React, { useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import { DailySummaryResult, UnitSummaryResult } from "@/lib/calculations";

interface ProductionChartsProps {
  daily: DailySummaryResult[];
  units: UnitSummaryResult[];
}

export function ProductionCharts({ daily, units }: ProductionChartsProps) {
  const [activeChart, setActiveChart] = useState<"trend" | "efficiency" | "units" | "running">("trend");

  const trendData = daily.map(d => ({
    date: d.dateKey.slice(5), // "10-01"
    pcs: d.planPCS,
    sah: Math.round(d.sah),
    efficiency: Number(d.efficiency.toFixed(1)),
    runningLines: d.runningLines,
    idleLines: d.idleLines,
  }));

  const unitData = units.map(u => ({
    unit: u.unitName,
    planPCS: u.planPCS,
    sah: Math.round(u.sah),
    efficiency: Number(u.efficiency.toFixed(1)),
    lines: u.activeLines,
  }));

  return (
    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight">
            Production Visualizations & Analytics
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Dynamic charts powered by the central calculation engine
          </p>
        </div>
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800">
          <button
            onClick={() => setActiveChart("trend")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeChart === "trend"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Plan PCS & SAH
          </button>
          <button
            onClick={() => setActiveChart("efficiency")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeChart === "efficiency"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Daily Efficiency %
          </button>
          <button
            onClick={() => setActiveChart("running")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeChart === "running"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Running Lines
          </button>
          <button
            onClick={() => setActiveChart("units")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeChart === "units"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Unit Comparison
          </button>
        </div>
      </div>

      <div className="h-80 w-full">
        {activeChart === "trend" && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trendData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  borderColor: "#334155",
                  borderRadius: "0.75rem",
                  fontSize: "12px",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
              <Bar dataKey="pcs" name="Plan PCS" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="sah" name="Plan SAH" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}

        {activeChart === "efficiency" && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
              <YAxis
                stroke="#94a3b8"
                fontSize={11}
                domain={[0, 100]}
                tickFormatter={v => `${v}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  borderColor: "#334155",
                  borderRadius: "0.75rem",
                  fontSize: "12px",
                }}
                formatter={(v: number) => [`${v}%`, "Daily Efficiency"]}
              />
              <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
              <ReferenceLine y={70} stroke="#10b981" strokeDasharray="4 4" label={{ value: "Target 70%", fill: "#10b981", fontSize: 11 }} />
              <Line
                type="monotone"
                dataKey="efficiency"
                name="Efficiency %"
                stroke="#10b981"
                strokeWidth={3}
                dot={{ fill: "#10b981", r: 3 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}

        {activeChart === "running" && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  borderColor: "#334155",
                  borderRadius: "0.75rem",
                  fontSize: "12px",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
              <Line
                type="monotone"
                dataKey="runningLines"
                name="Running Lines (SAH > 0)"
                stroke="#06b6d4"
                strokeWidth={2.5}
                dot={{ fill: "#06b6d4", r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="idleLines"
                name="Idle Lines"
                stroke="#f43f5e"
                strokeWidth={2}
                dot={{ fill: "#f43f5e", r: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}

        {activeChart === "units" && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={unitData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
              <XAxis dataKey="unit" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  borderColor: "#334155",
                  borderRadius: "0.75rem",
                  fontSize: "12px",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
              <Bar dataKey="planPCS" name="Plan PCS" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="sah" name="SAH" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
