"use client";

import React from "react";
import { X, Calculator, Database, CheckCircle, Info, Layers, Tag } from "lucide-react";
import { CalculationAuditDetail } from "@/lib/calculations";

interface CalculationAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  audit: CalculationAuditDetail | null;
  isLoading?: boolean;
}

export function CalculationAuditModal({
  isOpen,
  onClose,
  audit,
  isLoading = false,
}: CalculationAuditModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-white flex items-center gap-2">
                Calculation Audit Breakdown
                {audit?.isDirectRecap && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Direct Excel Recap
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">
                100% Traceability & Underlying Data Math
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-slate-400">Tracing calculation records...</p>
            </div>
          ) : !audit ? (
            <p className="text-center text-slate-400 py-8">No calculation data available.</p>
          ) : (
            <>
              {/* Metric Hero Card */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Target Metric</p>
                  <p className="text-lg font-bold text-white mt-1">{audit.metric}</p>
                  {(audit.unit || audit.line || audit.dateKey) && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {audit.unit && (
                        <span className="text-[11px] px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                          Unit: {audit.unit}
                        </span>
                      )}
                      {audit.line && (
                        <span className="text-[11px] px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                          Line: {audit.line}
                        </span>
                      )}
                      {audit.dateKey && (
                        <span className="text-[11px] px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                          Date: {audit.dateKey}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Calculated Value</p>
                  <p className="text-2xl font-black text-indigo-400 mt-1">
                    {audit.totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Source: {audit.isDirectRecap ? "Excel Line Recap Row" : "Calculated from Production Rows"}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Source Rows</p>
                  <p className="text-2xl font-black text-emerald-400 mt-1">
                    {audit.rowsUsed.length.toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Contributing order rows</p>
                </div>
              </div>

              {/* Applied Formula Banner */}
              <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/30 flex items-start gap-3">
                <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-indigo-200">Applied Formula</h4>
                  <p className="text-xs text-indigo-300/90 font-mono mt-1">
                    {audit.formulaDescription}
                  </p>
                  {audit.isDirectRecap && (
                    <p className="text-xs text-emerald-300/90 mt-1">
                      ✓ Direct Excel recap verified: Using verbatim line recap value from Excel file.
                    </p>
                  )}
                </div>
              </div>

              {/* Contributing Rows Table */}
              {audit.rowsUsed.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                    <Database className="w-4 h-4 text-slate-400" />
                    Contributing Production Plan Rows ({audit.rowsUsed.length})
                  </h4>
                  <div className="border border-slate-700/80 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-950 text-slate-400 sticky top-0 border-b border-slate-800">
                        <tr>
                          <th className="py-2.5 px-3 font-medium">Style Ref</th>
                          <th className="py-2.5 px-3 font-medium">Buyer</th>
                          <th className="py-2.5 px-3 font-medium">Line</th>
                          <th className="py-2.5 px-3 font-medium text-right">Plan Qty</th>
                          <th className="py-2.5 px-3 font-medium text-right">SMV</th>
                          <th className="py-2.5 px-3 font-medium text-right">Calculated SAH</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {audit.rowsUsed.slice(0, 50).map((r, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/50 transition">
                            <td className="py-2 px-3 font-medium text-slate-200">{r.styleRef}</td>
                            <td className="py-2 px-3 text-slate-400">{r.buyer}</td>
                            <td className="py-2 px-3 text-slate-400">{r.line}</td>
                            <td className="py-2 px-3 text-right font-mono text-slate-200">
                              {r.qty.toLocaleString()}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-300">
                              {r.smv.toFixed(2)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-indigo-400 font-semibold">
                              {r.calculatedSAH.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {audit.rowsUsed.length > 50 && (
                    <p className="text-[11px] text-slate-500 mt-2 text-right">
                      Showing first 50 rows of {audit.rowsUsed.length}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3.5 border-t border-slate-800 bg-slate-950/60">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-medium text-slate-200 transition"
          >
            Close Audit
          </button>
        </div>
      </div>
    </div>
  );
}
