"use client";

import React from "react";
import { Factory, Calculator, HelpCircle } from "lucide-react";
import { UnitSummaryResult, GroupSummaryResult } from "@/lib/calculations";

interface UnitPerformanceSectionProps {
  units: UnitSummaryResult[];
  groups: {
    b1: GroupSummaryResult;
    b2: GroupSummaryResult;
    total: GroupSummaryResult;
  };
  onAuditClick: (params: { metric: 'sah' | 'planPCS' | 'machineHour'; unit?: string }) => void;
}

export function UnitPerformanceSection({
  units,
  groups,
  onAuditClick,
}: UnitPerformanceSectionProps) {
  const b1Units = units.filter(u => u.group === "B1");
  const b2Units = units.filter(u => u.group === "B2");

  const renderUnitRow = (u: UnitSummaryResult) => (
    <tr key={u.unitCode} className="hover:bg-slate-800/40 transition">
      <td className="py-3 px-4 font-semibold text-white flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-indigo-500" />
        {u.unitName}
      </td>
      <td className="py-3 px-4 text-center font-mono text-slate-300">
        {u.activeLines} / {u.capacity}
      </td>
      <td
        onClick={() => onAuditClick({ metric: "planPCS", unit: u.unitCode })}
        className="py-3 px-4 text-right font-mono text-slate-100 hover:text-indigo-400 cursor-pointer underline decoration-dotted transition"
      >
        {u.planPCS.toLocaleString()}
      </td>
      <td
        onClick={() => onAuditClick({ metric: "sah", unit: u.unitCode })}
        className="py-3 px-4 text-right font-mono text-indigo-400 font-semibold hover:text-indigo-300 cursor-pointer underline decoration-dotted transition"
      >
        {u.sah.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
      </td>
      <td
        onClick={() => onAuditClick({ metric: "machineHour", unit: u.unitCode })}
        className="py-3 px-4 text-right font-mono text-amber-400 hover:text-amber-300 cursor-pointer underline decoration-dotted transition"
      >
        {u.machineHour.toLocaleString()}
      </td>
      <td className="py-3 px-4 text-right font-mono text-slate-300">
        {u.workingHour.toFixed(1)}
      </td>
      <td className="py-3 px-4 text-right font-mono font-bold">
        <span
          className={`px-2 py-0.5 rounded-full text-xs ${
            u.efficiency >= 70
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              : u.efficiency >= 65
              ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
              : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
          }`}
        >
          {u.efficiency.toFixed(2)}%
        </span>
      </td>
      <td className="py-3 px-4 text-right font-mono text-slate-400">
        {u.budgetPCS ? u.budgetPCS.toLocaleString() : "—"}
      </td>
      <td className="py-3 px-4 text-right font-mono">
        {u.variancePCS !== undefined ? (
          <span className={u.variancePCS >= 0 ? "text-emerald-400" : "text-rose-400"}>
            {u.variancePCS > 0 ? `+${u.variancePCS.toLocaleString()}` : u.variancePCS.toLocaleString()}
          </span>
        ) : (
          "—"
        )}
      </td>
    </tr>
  );

  const renderGroupSubtotal = (title: string, g: GroupSummaryResult, colorClass: string) => (
    <tr className={`border-t border-b border-slate-700 font-bold ${colorClass}`}>
      <td className="py-3 px-4 text-white uppercase text-xs tracking-wider flex items-center gap-2">
        <Factory className="w-4 h-4" />
        {title} Total
      </td>
      <td className="py-3 px-4 text-center font-mono">{g.activeLines} / {g.capacity}</td>
      <td className="py-3 px-4 text-right font-mono">{g.planPCS.toLocaleString()}</td>
      <td className="py-3 px-4 text-right font-mono text-indigo-300">
        {g.sah.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
      </td>
      <td className="py-3 px-4 text-right font-mono text-amber-300">{g.machineHour.toLocaleString()}</td>
      <td className="py-3 px-4 text-right font-mono">{g.workingHour.toFixed(1)}</td>
      <td className="py-3 px-4 text-right font-mono">
        <span className="px-2.5 py-1 rounded-full text-xs bg-slate-900/80 border border-current">
          {g.efficiency.toFixed(2)}%
        </span>
      </td>
      <td className="py-3 px-4 text-right font-mono text-slate-400">
        {g.budgetPCS ? g.budgetPCS.toLocaleString() : "—"}
      </td>
      <td className="py-3 px-4 text-right font-mono">
        {g.variancePCS !== undefined ? (
          <span className={g.variancePCS >= 0 ? "text-emerald-400" : "text-rose-400"}>
            {g.variancePCS > 0 ? `+${g.variancePCS.toLocaleString()}` : g.variancePCS.toLocaleString()}
          </span>
        ) : (
          "—"
        )}
      </td>
    </tr>
  );

  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Factory className="w-5 h-5 text-indigo-400" />
            Unit & Group Performance Summary
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            B1, B2, and Birichina Factory Totals calculated from structured source records
          </p>
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-400">
          <Calculator className="w-4 h-4 text-indigo-400" />
          <span>Click any PCS / SAH / Machine HR cell to view full audit breakdown</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-800">
            <tr>
              <th className="py-3 px-4">Unit / Group</th>
              <th className="py-3 px-4 text-center">Active Lines</th>
              <th className="py-3 px-4 text-right">Plan PCS</th>
              <th className="py-3 px-4 text-right">Plan SAH</th>
              <th className="py-3 px-4 text-right">Machine HR</th>
              <th className="py-3 px-4 text-right">Working HR</th>
              <th className="py-3 px-4 text-right">Efficiency %</th>
              <th className="py-3 px-4 text-right">Budget PCS</th>
              <th className="py-3 px-4 text-right">Variance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {/* B1 Units */}
            {b1Units.map(renderUnitRow)}
            {renderGroupSubtotal("B1 Group", groups.b1, "bg-indigo-950/40 text-indigo-200")}

            {/* B2 Units */}
            {b2Units.map(renderUnitRow)}
            {renderGroupSubtotal("B2 Group", groups.b2, "bg-purple-950/40 text-purple-200")}

            {/* Factory Grand Total */}
            <tr className="bg-slate-950 border-t-2 border-indigo-500 font-black text-sm text-white">
              <td className="py-4 px-4 uppercase tracking-wider flex items-center gap-2 text-indigo-300">
                <Factory className="w-5 h-5 text-indigo-400" />
                Birichina Grand Total
              </td>
              <td className="py-4 px-4 text-center font-mono">
                {groups.total.activeLines} / {groups.total.capacity}
              </td>
              <td
                onClick={() => onAuditClick({ metric: "planPCS" })}
                className="py-4 px-4 text-right font-mono hover:text-indigo-400 cursor-pointer underline decoration-dotted transition"
              >
                {groups.total.planPCS.toLocaleString()}
              </td>
              <td
                onClick={() => onAuditClick({ metric: "sah" })}
                className="py-4 px-4 text-right font-mono text-indigo-400 hover:text-indigo-300 cursor-pointer underline decoration-dotted transition"
              >
                {groups.total.sah.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
              </td>
              <td
                onClick={() => onAuditClick({ metric: "machineHour" })}
                className="py-4 px-4 text-right font-mono text-amber-400 hover:text-amber-300 cursor-pointer underline decoration-dotted transition"
              >
                {groups.total.machineHour.toLocaleString()}
              </td>
              <td className="py-4 px-4 text-right font-mono">
                {groups.total.workingHour.toFixed(1)}
              </td>
              <td className="py-4 px-4 text-right font-mono">
                <span className="px-3 py-1 rounded-full text-xs font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                  {groups.total.efficiency.toFixed(2)}%
                </span>
              </td>
              <td className="py-4 px-4 text-right font-mono text-slate-400">
                {groups.total.budgetPCS ? groups.total.budgetPCS.toLocaleString() : "—"}
              </td>
              <td className="py-4 px-4 text-right font-mono">
                {groups.total.variancePCS !== undefined ? (
                  <span className={groups.total.variancePCS >= 0 ? "text-emerald-400" : "text-rose-400"}>
                    {groups.total.variancePCS > 0 ? `+${groups.total.variancePCS.toLocaleString()}` : groups.total.variancePCS.toLocaleString()}
                  </span>
                ) : (
                  "—"
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
