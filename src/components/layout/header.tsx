"use client";

import React from "react";
import {
  Factory,
  UploadCloud,
  GitCompare,
  RefreshCw,
  Sparkles,
  Calendar,
  Layers,
  ChevronDown,
} from "lucide-react";

interface HeaderProps {
  currentImportId?: string;
  imports: Array<{ id: string; fileName: string; uploadedAt: string }>;
  onSelectImport: (id: string) => void;
  onOpenUpload: () => void;
  onOpenCompare: () => void;
  onRefresh: () => void;
  isLoading?: boolean;
}

export function Header({
  currentImportId,
  imports,
  onSelectImport,
  onOpenUpload,
  onOpenCompare,
  onRefresh,
  isLoading = false,
}: HeaderProps) {
  const currentImport = imports.find(i => i.id === currentImportId) || imports[0];

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-3.5 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 shadow-sm">
      {/* Brand & Active Snapshot */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white shadow-md shadow-indigo-600/30">
            <Factory className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-white tracking-tight">
                BIRICHINA INTELLIGENCE
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Engine
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Calculation-Based Garments Production Management System
            </p>
          </div>
        </div>

        {/* Snapshot Selector */}
        {imports.length > 0 && (
          <div className="hidden lg:flex items-center gap-2 pl-4 border-l border-slate-800">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-slate-400">Snapshot:</span>
              <select
                value={currentImportId}
                onChange={e => onSelectImport(e.target.value)}
                className="bg-transparent text-white font-medium focus:outline-none cursor-pointer pr-1"
              >
                {imports.map(imp => (
                  <option key={imp.id} value={imp.id} className="bg-slate-900 text-slate-200">
                    {imp.fileName} ({new Date(imp.uploadedAt).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Quick Action Buttons */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/80 transition"
          title="Refresh Report Data"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-indigo-400" : ""}`} />
        </button>

        {imports.length >= 2 && (
          <button
            onClick={onOpenCompare}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition shadow-sm"
          >
            <GitCompare className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline">Compare Snapshots</span>
          </button>
        )}

        <button
          onClick={onOpenUpload}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 transition"
        >
          <UploadCloud className="w-3.5 h-3.5" />
          <span>Upload Plan</span>
        </button>
      </div>
    </header>
  );
}
