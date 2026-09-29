"use client";

import React, { useState } from "react";
import { Download, Search, Filter, Layers } from "lucide-react";
import { LineDetailResult, LineDetailRecord } from "@/lib/calculations";

interface LinePerformanceTableProps {
  lineDetail: LineDetailResult;
}

export function LinePerformanceTable({ lineDetail }: LinePerformanceTableProps) {
  const [selectedUnit, setSelectedUnit] = useState<string>("ALL");
  const [metric, setMetric] = useState<"pcs" | "sah" | "machineHour" | "workingHour" | "efficiency" | "manpower">("pcs");
  const [searchTerm, setSearchTerm] = useState<string>("");

  const units = Array.from(new Set(lineDetail.records.map(r => r.unit)));

  const filteredRecords = lineDetail.records.filter(r => {
    if (selectedUnit !== "ALL" && r.unit !== selectedUnit) return false;
    if (searchTerm && !r.line.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const getCellVal = (rec: LineDetailRecord, dk: string): string => {
    if (metric === "manpower") return rec.manpower.toString();
    const d = rec.daily[dk];
    if (!d) return "—";

    if (metric === "pcs") return d.pcs > 0 ? d.pcs.toLocaleString() : "—";
    if (metric === "sah") return d.sah > 0 ? d.sah.toFixed(1) : "—";
    if (metric === "machineHour") return d.machineHour > 0 ? d.machineHour.toFixed(0) : "—";
    if (metric === "workingHour") return d.workingHour > 0 ? d.workingHour.toFixed(1) : "—";
    if (metric === "efficiency") return d.efficiency > 0 ? `${d.efficiency.toFixed(1)}%` : "—";
    return "—";
  };

  const getTotalVal = (rec: LineDetailRecord): string => {
    if (metric === "manpower") return rec.manpower.toString();
    if (metric === "pcs") return rec.totals.pcs.toLocaleString();
    if (metric === "sah") return rec.totals.sah.toFixed(1);
    if (metric === "machineHour") return rec.totals.machineHour.toFixed(0);
    if (metric === "workingHour") return rec.totals.workingHour.toFixed(1);
    if (metric === "efficiency") return `${rec.totals.efficiency.toFixed(1)}%`;
    return "—";
  };

  const handleExportCSV = () => {
    const headers = ["Unit", "Line", "Manpower", ...lineDetail.dateKeys, "Total"];
    const rows = filteredRecords.map(rec => [
      rec.unit,
      rec.line,
      rec.manpower,
      ...lineDetail.dateKeys.map(dk => getCellVal(rec, dk)),
      getTotalVal(rec),
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Line_Detail_${metric.toUpperCase()}_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden space-y-4">
      {/* Controls Bar */}
      <div className="p-4 border-b border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            Line Detail Performance Matrix
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Full 31-day line level metrics with direct SAH & Machine HR recap resolution
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Metric Selector Buttons */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950 border border-slate-800">
            {(
              [
                { id: "pcs", label: "Plan PCS" },
                { id: "sah", label: "SAH" },
                { id: "machineHour", label: "Machine HR" },
                { id: "workingHour", label: "Working HR" },
                { id: "efficiency", label: "Effi %" },
                { id: "manpower", label: "Manpower" },
              ] as const
            ).map(m => (
              <button
                key={m.id}
                onClick={() => setMetric(m.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                  metric === m.id
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Unit Filter */}
          <select
            value={selectedUnit}
            onChange={e => setSelectedUnit(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Units ({units.length})</option>
            {units.map(u => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search line..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-32 md:w-40"
            />
          </div>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition"
          >
            <Download className="w-3.5 h-3.5" />
            CSV
          </button>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[11px] sticky top-0 border-b border-slate-800 z-10">
            <tr>
              <th className="py-2.5 px-3 sticky left-0 bg-slate-950 z-20 border-r border-slate-800">Unit</th>
              <th className="py-2.5 px-3 sticky left-16 bg-slate-950 z-20 border-r border-slate-800">Line</th>
              <th className="py-2.5 px-2 text-center border-r border-slate-800">MP</th>
              {lineDetail.dateKeys.map(dk => {
                const dayNum = dk.split("-")[2];
                const dObj = new Date(dk);
                const isFri = !isNaN(dObj.getTime()) && dObj.getUTCDay() === 5;
                return (
                  <th
                    key={dk}
                    className={`py-2.5 px-2 text-right min-w-[50px] border-r border-slate-800/40 ${
                      isFri ? "bg-rose-950/40 text-rose-300" : ""
                    }`}
                  >
                    {dayNum}
                  </th>
                );
              })}
              <th className="py-2.5 px-3 text-right sticky right-0 bg-slate-950 z-20 border-l border-slate-800 font-bold text-white">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {filteredRecords.map(rec => (
              <tr key={`${rec.unit}:::${rec.line}`} className="hover:bg-slate-800/40 transition">
                <td className="py-2 px-3 sticky left-0 bg-slate-900 z-10 border-r border-slate-800 font-sans font-medium text-slate-300">
                  {rec.unit}
                </td>
                <td className="py-2 px-3 sticky left-16 bg-slate-900 z-10 border-r border-slate-800 font-sans font-bold text-white">
                  {rec.line}
                </td>
                <td className="py-2 px-2 text-center text-slate-400 border-r border-slate-800">
                  {rec.manpower}
                </td>
                {lineDetail.dateKeys.map(dk => {
                  const val = getCellVal(rec, dk);
                  const dObj = new Date(dk);
                  const isFri = !isNaN(dObj.getTime()) && dObj.getUTCDay() === 5;

                  return (
                    <td
                      key={dk}
                      className={`py-2 px-2 text-right border-r border-slate-800/40 ${
                        isFri ? "bg-rose-950/20 text-rose-300/80" : ""
                      } ${val !== "—" ? "text-slate-100 font-medium" : "text-slate-600"}`}
                    >
                      {val}
                    </td>
                  );
                })}
                <td className="py-2 px-3 text-right sticky right-0 bg-slate-900 z-10 border-l border-slate-800 font-bold text-indigo-400">
                  {getTotalVal(rec)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
