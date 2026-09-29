"use client";

import React from "react";
import { Layers, Download } from "lucide-react";
import { RunningLinesResult } from "@/lib/calculations";

interface RunLinesReportProps {
  runningLines: RunningLinesResult;
}

export function RunLinesReport({ runningLines }: RunLinesReportProps) {
  const { dateKeys, unitRows, groups } = runningLines;

  const handleExportCSV = () => {
    const headers = ["Category / Unit", "Capacity", ...dateKeys];
    const rows: string[][] = [];

    unitRows.forEach(u => {
      rows.push([u.label, u.capacity.toString(), ...u.values.map(String)]);
    });

    rows.push(["B1 Total Running", groups.b1.capacity.toString(), ...groups.b1.totalRunning.map(String)]);
    rows.push(["B1 Idle", groups.b1.capacity.toString(), ...groups.b1.idle.map(String)]);
    rows.push(["B2 Total Running", groups.b2.capacity.toString(), ...groups.b2.totalRunning.map(String)]);
    rows.push(["B2 Idle", groups.b2.capacity.toString(), ...groups.b2.idle.map(String)]);
    rows.push(["Factory Total Running", groups.factory.capacity.toString(), ...groups.factory.totalRunning.map(String)]);
    rows.push(["Factory Total Idle", groups.factory.capacity.toString(), ...groups.factory.idle.map(String)]);

    const csv = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csv);
    link.download = "Birichina_Running_Lines_Matrix.csv";
    link.click();
  };

  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden space-y-4">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            Running Lines Automation Matrix
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Lines with planned SAH &gt; 0 that day (Capacity vs Running vs Idle)
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition"
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </button>
      </div>

      {/* Matrix */}
      <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
        <table className="w-full text-xs text-left border-collapse font-mono">
          <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[11px] sticky top-0 border-b border-slate-800 z-10 font-sans">
            <tr>
              <th className="py-2.5 px-3 sticky left-0 bg-slate-950 z-20 border-r border-slate-800 min-w-[140px]">
                Unit / Group
              </th>
              <th className="py-2.5 px-2 text-center border-r border-slate-800">Cap</th>
              {dateKeys.map(dk => {
                const dayNum = dk.split("-")[2];
                const dObj = new Date(dk);
                const isFri = !isNaN(dObj.getTime()) && dObj.getUTCDay() === 5;
                return (
                  <th
                    key={dk}
                    className={`py-2.5 px-2 text-center min-w-[36px] border-r border-slate-800/40 ${
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
            {/* Units */}
            {unitRows.map(u => (
              <tr key={u.key} className="hover:bg-slate-800/40 transition">
                <td className="py-2 px-3 sticky left-0 bg-slate-900 z-10 border-r border-slate-800 font-sans font-medium text-slate-200">
                  {u.label}
                </td>
                <td className="py-2 px-2 text-center text-slate-400 border-r border-slate-800 font-bold">
                  {u.capacity}
                </td>
                {u.values.map((v, i) => {
                  const dObj = new Date(dateKeys[i]);
                  const isFri = !isNaN(dObj.getTime()) && dObj.getUTCDay() === 5;
                  return (
                    <td
                      key={i}
                      className={`py-2 px-2 text-center border-r border-slate-800/40 ${
                        isFri ? "bg-rose-950/20 text-rose-300/80" : ""
                      } ${v > 0 ? "text-cyan-300 font-bold" : "text-slate-600"}`}
                    >
                      {v > 0 ? v : "—"}
                    </td>
                  );
                })}
              </tr>
            ))}

            {/* B1 Subtotal & Idle */}
            <tr className="bg-indigo-950/30 text-indigo-200 font-bold border-t border-slate-700">
              <td className="py-2 px-3 sticky left-0 bg-slate-950 z-10 border-r border-slate-800 font-sans">
                B1 Running Lines
              </td>
              <td className="py-2 px-2 text-center text-indigo-300 border-r border-slate-800">
                {groups.b1.capacity}
              </td>
              {groups.b1.totalRunning.map((v, i) => (
                <td key={i} className="py-2 px-2 text-center border-r border-slate-800/40 text-indigo-300">
                  {v}
                </td>
              ))}
            </tr>
            <tr className="bg-rose-950/20 text-rose-300 text-[11px]">
              <td className="py-1.5 px-3 sticky left-0 bg-slate-950 z-10 border-r border-slate-800 font-sans italic">
                B1 Idle Lines
              </td>
              <td className="py-1.5 px-2 text-center border-r border-slate-800">—</td>
              {groups.b1.idle.map((v, i) => (
                <td key={i} className="py-1.5 px-2 text-center border-r border-slate-800/40 text-rose-400/90">
                  {v > 0 ? v : 0}
                </td>
              ))}
            </tr>

            {/* B2 Subtotal & Idle */}
            <tr className="bg-purple-950/30 text-purple-200 font-bold border-t border-slate-700">
              <td className="py-2 px-3 sticky left-0 bg-slate-950 z-10 border-r border-slate-800 font-sans">
                B2 Running Lines
              </td>
              <td className="py-2 px-2 text-center text-purple-300 border-r border-slate-800">
                {groups.b2.capacity}
              </td>
              {groups.b2.totalRunning.map((v, i) => (
                <td key={i} className="py-2 px-2 text-center border-r border-slate-800/40 text-purple-300">
                  {v}
                </td>
              ))}
            </tr>
            <tr className="bg-rose-950/20 text-rose-300 text-[11px]">
              <td className="py-1.5 px-3 sticky left-0 bg-slate-950 z-10 border-r border-slate-800 font-sans italic">
                B2 Idle Lines
              </td>
              <td className="py-1.5 px-2 text-center border-r border-slate-800">—</td>
              {groups.b2.idle.map((v, i) => (
                <td key={i} className="py-1.5 px-2 text-center border-r border-slate-800/40 text-rose-400/90">
                  {v > 0 ? v : 0}
                </td>
              ))}
            </tr>

            {/* Factory Total & Idle */}
            <tr className="bg-slate-950 border-t-2 border-cyan-500 font-black text-white text-xs">
              <td className="py-3 px-3 sticky left-0 bg-slate-950 z-10 border-r border-slate-800 font-sans uppercase text-cyan-300">
                Factory Total Running
              </td>
              <td className="py-3 px-2 text-center text-cyan-300 border-r border-slate-800">
                {groups.factory.capacity}
              </td>
              {groups.factory.totalRunning.map((v, i) => (
                <td key={i} className="py-3 px-2 text-center border-r border-slate-800/40 text-cyan-300 font-bold">
                  {v}
                </td>
              ))}
            </tr>
            <tr className="bg-slate-950 text-rose-400 text-[11px] font-semibold">
              <td className="py-2 px-3 sticky left-0 bg-slate-950 z-10 border-r border-slate-800 font-sans uppercase">
                Factory Total Idle
              </td>
              <td className="py-2 px-2 text-center border-r border-slate-800">—</td>
              {groups.factory.idle.map((v, i) => (
                <td key={i} className="py-2 px-2 text-center border-r border-slate-800/40">
                  {v}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
