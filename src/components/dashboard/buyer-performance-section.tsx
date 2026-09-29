"use client";

import React, { useState } from "react";
import { Users, Search, Briefcase, Tag } from "lucide-react";
import { ProductionReportDTO } from "@/lib/calculations";

interface BuyerPerformanceSectionProps {
  report: ProductionReportDTO;
}

export function BuyerPerformanceSection({ report }: BuyerPerformanceSectionProps) {
  const [tab, setTab] = useState<"buyers" | "styles">("buyers");
  const [search, setSearch] = useState<string>("");

  const filteredBuyers = report.buyerStats.filter(b =>
    b.buyer.toLowerCase().includes(search.toLowerCase())
  );

  const filteredStyles = report.styleStats.filter(s =>
    s.styleRef.toLowerCase().includes(search.toLowerCase()) ||
    s.buyer.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden space-y-4">
      {/* Top Header & Search */}
      <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              Buyers & Style Portfolio Analytics
            </h3>
            <p className="text-xs text-slate-400">
              Distribution of order volume, planned output and SAH across buyers
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Tab Switcher */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950 border border-slate-800">
            <button
              onClick={() => setTab("buyers")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                tab === "buyers"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Buyers ({report.buyerStats.length})
            </button>
            <button
              onClick={() => setTab("styles")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                tab === "styles"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Styles ({report.styleStats.length})
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder={`Search ${tab}...`}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-36"
            />
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
        {tab === "buyers" ? (
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[11px] sticky top-0 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Buyer</th>
                <th className="py-3 px-4 text-center">Style Count</th>
                <th className="py-3 px-4 text-right">Order Qty</th>
                <th className="py-3 px-4 text-right">Plan Qty</th>
                <th className="py-3 px-4 text-right">Total SAH</th>
                <th className="py-3 px-4 text-right">Factory Share %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredBuyers.map((b, idx) => (
                <tr key={idx} className="hover:bg-slate-800/50 transition">
                  <td className="py-3 px-4 font-sans font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-sky-500" />
                    {b.buyer}
                  </td>
                  <td className="py-3 px-4 text-center text-slate-300 font-sans">{b.styleCount}</td>
                  <td className="py-3 px-4 text-right text-slate-300">{b.orderQty.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right font-bold text-slate-100">{b.planQty.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right text-indigo-400 font-semibold">
                    {b.sah.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-sky-500"
                          style={{ width: `${Math.min(100, b.sharePct)}%` }}
                        />
                      </div>
                      <span className="font-sans font-medium text-slate-300 w-10 text-right">
                        {b.sharePct.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[11px] sticky top-0 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Style Ref</th>
                <th className="py-3 px-4">Buyer</th>
                <th className="py-3 px-4">Article</th>
                <th className="py-3 px-4 text-right">SMV</th>
                <th className="py-3 px-4 text-right">Plan Qty</th>
                <th className="py-3 px-4 text-right">Total SAH</th>
                <th className="py-3 px-4">Lines Assigned</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredStyles.map((s, idx) => (
                <tr key={idx} className="hover:bg-slate-800/50 transition">
                  <td className="py-3 px-4 font-sans font-bold text-white">{s.styleRef}</td>
                  <td className="py-3 px-4 font-sans text-slate-300">{s.buyer}</td>
                  <td className="py-3 px-4 font-sans text-slate-400 max-w-xs truncate" title={s.article || ""}>
                    {s.article || "—"}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-300">{s.smv.toFixed(2)}</td>
                  <td className="py-3 px-4 text-right font-bold text-slate-100">{s.planQty.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right text-indigo-400 font-semibold">
                    {s.sah.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                  </td>
                  <td className="py-3 px-4 font-sans">
                    <div className="flex flex-wrap gap-1">
                      {s.lines.slice(0, 3).map(l => (
                        <span key={l} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {l}
                        </span>
                      ))}
                      {s.lines.length > 3 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                          +{s.lines.length - 3}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
