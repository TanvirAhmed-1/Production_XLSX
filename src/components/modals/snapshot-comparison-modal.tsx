"use client";

import React, { useState, useEffect } from "react";
import { X, GitCompare, ArrowRight, TrendingUp, TrendingDown, Clock, Package, Gauge, Percent } from "lucide-react";

interface SnapshotItem {
  id: string;
  fileName: string;
  uploadedAt: string;
  month?: string;
}

interface SnapshotComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  imports: SnapshotItem[];
}

export function SnapshotComparisonModal({
  isOpen,
  onClose,
  imports,
}: SnapshotComparisonModalProps) {
  const [snapshotA, setSnapshotA] = useState<string>(imports[1]?.id || imports[0]?.id || "");
  const [snapshotB, setSnapshotB] = useState<string>(imports[0]?.id || "");
  const [dataA, setDataA] = useState<any>(null);
  const [dataB, setDataB] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    if (imports.length >= 2 && !snapshotA) {
      setSnapshotA(imports[1].id);
      setSnapshotB(imports[0].id);
    }
  }, [isOpen, imports]);

  const fetchComparison = async () => {
    if (!snapshotA || !snapshotB) return;
    setLoading(true);
    try {
      const [resA, resB] = await Promise.all([
        fetch(`/api/reports/production?importId=${snapshotA}`),
        fetch(`/api/reports/production?importId=${snapshotB}`),
      ]);
      const jsonA = await resA.json();
      const jsonB = await resB.json();

      setDataA(jsonA.report || null);
      setDataB(jsonB.report || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (snapshotA && snapshotB && isOpen) {
      fetchComparison();
    }
  }, [snapshotA, snapshotB, isOpen]);

  if (!isOpen) return null;

  const sumA = dataA?.summary;
  const sumB = dataB?.summary;

  const metrics = [
    {
      label: "Plan Quantity (PCS)",
      icon: Package,
      valA: sumA?.totalPlanPCS || 0,
      valB: sumB?.totalPlanPCS || 0,
      format: (v: number) => v.toLocaleString() + " pcs",
      diff: (sumB?.totalPlanPCS || 0) - (sumA?.totalPlanPCS || 0),
    },
    {
      label: "Plan SAH",
      icon: Clock,
      valA: sumA?.totalSAH || 0,
      valB: sumB?.totalSAH || 0,
      format: (v: number) => v.toLocaleString(undefined, { maximumFractionDigits: 1 }) + " SAH",
      diff: (sumB?.totalSAH || 0) - (sumA?.totalSAH || 0),
    },
    {
      label: "Machine Hours",
      icon: Gauge,
      valA: sumA?.totalMachineHour || 0,
      valB: sumB?.totalMachineHour || 0,
      format: (v: number) => v.toLocaleString() + " hrs",
      diff: (sumB?.totalMachineHour || 0) - (sumA?.totalMachineHour || 0),
    },
    {
      label: "Overall Efficiency %",
      icon: Percent,
      valA: sumA?.overallEfficiency || 0,
      valB: sumB?.overallEfficiency || 0,
      format: (v: number) => `${v.toFixed(2)}%`,
      diff: (sumB?.overallEfficiency || 0) - (sumA?.overallEfficiency || 0),
      isPct: true,
    },
    {
      label: "Active Production Lines",
      icon: TrendingUp,
      valA: sumA?.activeLines || 0,
      valB: sumB?.activeLines || 0,
      format: (v: number) => v.toString(),
      diff: (sumB?.activeLines || 0) - (sumA?.activeLines || 0),
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
              <GitCompare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-white">
                Historical Snapshot Comparison
              </h3>
              <p className="text-xs text-slate-400">
                Compare Plan revisions side-by-side with automatic variance calculation
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
          {/* Selectors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800">
            <div>
              <label className="text-xs font-semibold uppercase text-slate-400 mb-1.5 block">
                Baseline Snapshot [A]
              </label>
              <select
                value={snapshotA}
                onChange={e => setSnapshotA(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                {imports.map(imp => (
                  <option key={imp.id} value={imp.id}>
                    {imp.fileName} ({new Date(imp.uploadedAt).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase text-slate-400 mb-1.5 block">
                Comparison Snapshot [B]
              </label>
              <select
                value={snapshotB}
                onChange={e => setSnapshotB(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                {imports.map(imp => (
                  <option key={imp.id} value={imp.id}>
                    {imp.fileName} ({new Date(imp.uploadedAt).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Comparison Table */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-slate-400">Computing snapshot variance...</p>
            </div>
          ) : (
            <div className="border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Metric</th>
                    <th className="py-3 px-4 text-right">Snapshot [A]</th>
                    <th className="py-3 px-4 text-right">Snapshot [B]</th>
                    <th className="py-3 px-4 text-right">Difference [B - A]</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {metrics.map((m, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 font-sans font-medium text-slate-200 flex items-center gap-2">
                        <m.icon className="w-4 h-4 text-purple-400" />
                        {m.label}
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-300">
                        {m.format(m.valA)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-white">
                        {m.format(m.valB)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs ${
                            m.diff > 0
                              ? "bg-emerald-500/20 text-emerald-400"
                              : m.diff < 0
                              ? "bg-rose-500/20 text-rose-400"
                              : "text-slate-500"
                          }`}
                        >
                          {m.diff > 0 ? `+${m.isPct ? m.diff.toFixed(2) + '%' : m.diff.toLocaleString()}` : m.isPct ? m.diff.toFixed(2) + '%' : m.diff.toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3.5 border-t border-slate-800 bg-slate-950/60">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-medium text-slate-200 transition"
          >
            Close Comparison
          </button>
        </div>
      </div>
    </div>
  );
}
