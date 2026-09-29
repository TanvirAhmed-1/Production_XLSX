"use client";

import React from "react";
import {
  Layers,
  FileText,
  Users,
  Package,
  Clock,
  Gauge,
  TrendingUp,
  Percent,
  Calculator,
} from "lucide-react";

interface KPICardsProps {
  summary: {
    totalPlanPCS: number;
    totalSAH: number;
    totalMachineHour: number;
    totalWorkingHour: number;
    overallEfficiency: number;
    activeLines: number;
    totalStyles: number;
    totalBuyers: number;
    totalCapacity: number;
    budgetVariancePCS?: number;
    budgetVarianceSAH?: number;
    budgetVarianceEfficiency?: number;
  };
  onAuditClick: (metric: 'sah' | 'planPCS' | 'machineHour' | 'workingHour' | 'efficiency') => void;
}

export function KPICards({ summary, onAuditClick }: KPICardsProps) {
  const cards = [
    {
      title: "Plan Quantity",
      value: summary.totalPlanPCS.toLocaleString() + " pcs",
      subtitle: "Sum of daily style plans",
      icon: Package,
      color: "from-blue-600/20 to-blue-500/5 text-blue-400 border-blue-500/30",
      metric: "planPCS" as const,
      auditHint: "Click to audit PCS sum",
    },
    {
      title: "Plan SAH",
      value: summary.totalSAH.toLocaleString(undefined, { maximumFractionDigits: 1 }) + " SAH",
      subtitle: "Standard Allowed Hours",
      icon: Clock,
      color: "from-purple-600/20 to-purple-500/5 text-purple-400 border-purple-500/30",
      metric: "sah" as const,
      auditHint: "Click to audit Σ(Qty×SMV/60)",
    },
    {
      title: "Machine Hours",
      value: summary.totalMachineHour.toLocaleString() + " hrs",
      subtitle: "Direct recap & clock hours",
      icon: Gauge,
      color: "from-amber-600/20 to-amber-500/5 text-amber-400 border-amber-500/30",
      metric: "machineHour" as const,
      auditHint: "Click to audit machine hours",
    },
    {
      title: "Overall Efficiency",
      value: summary.overallEfficiency.toFixed(2) + "%",
      subtitle: "Total SAH / Machine HR",
      icon: Percent,
      color: summary.overallEfficiency >= 68
        ? "from-emerald-600/20 to-emerald-500/5 text-emerald-400 border-emerald-500/30"
        : "from-rose-600/20 to-rose-500/5 text-rose-400 border-rose-500/30",
      metric: "efficiency" as const,
      auditHint: "Click to audit aggregate efficiency",
    },
    {
      title: "Active Lines",
      value: `${summary.activeLines} / ${summary.totalCapacity}`,
      subtitle: "Lines with planned production",
      icon: Layers,
      color: "from-cyan-600/20 to-cyan-500/5 text-cyan-400 border-cyan-500/30",
      metric: null,
    },
    {
      title: "Total Styles",
      value: summary.totalStyles.toLocaleString(),
      subtitle: "Distinct style references",
      icon: FileText,
      color: "from-indigo-600/20 to-indigo-500/5 text-indigo-400 border-indigo-500/30",
      metric: null,
    },
    {
      title: "Active Buyers",
      value: summary.totalBuyers.toString(),
      subtitle: "Customer brands in plan",
      icon: Users,
      color: "from-sky-600/20 to-sky-500/5 text-sky-400 border-sky-500/30",
      metric: null,
    },
    {
      title: "Avg Working Hours",
      value: summary.totalWorkingHour.toFixed(1) + " hrs/line",
      subtitle: "Machine HR ÷ Manpower",
      icon: TrendingUp,
      color: "from-teal-600/20 to-teal-500/5 text-teal-400 border-teal-500/30",
      metric: "workingHour" as const,
      auditHint: "Click to audit working hours",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c, i) => (
        <div
          key={i}
          onClick={() => c.metric && onAuditClick(c.metric)}
          className={`relative group p-5 rounded-2xl bg-gradient-to-br ${c.color} bg-slate-900/80 border backdrop-blur-md shadow-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${
            c.metric ? "cursor-pointer" : ""
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {c.title}
            </span>
            <div className="p-2.5 rounded-xl bg-slate-800/80 text-white group-hover:bg-slate-700/80 transition">
              <c.icon className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black tracking-tight text-white">{c.value}</div>
            <p className="text-xs text-slate-400 mt-1">{c.subtitle}</p>
          </div>
          {c.metric && (
            <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500 group-hover:text-indigo-400 transition">
              <span className="flex items-center gap-1">
                <Calculator className="w-3 h-3" />
                {c.auditHint}
              </span>
              <span className="opacity-0 group-hover:opacity-100 transition">→</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
