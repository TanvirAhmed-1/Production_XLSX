"use client";

import React, { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { ExcelMasterSheet } from "@/components/dashboard/excel-master-sheet";
import { SignoffPlanSummary } from "@/components/dashboard/signoff-plan-summary";
import { ExcelImportModal } from "@/components/modals/excel-import-modal";
import { SettingsModal } from "@/components/modals/settings-modal";
import { FileSpreadsheet, ShieldCheck } from "lucide-react";

export default function ExcelViewPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [selectedSheet, setSelectedSheet] = useState<"matrix" | "summary">("summary");

  return (
    <div className="flex h-screen bg-slate-100 dark:bg-slate-950 overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        activeTab="excel-master"
        setActiveTab={(tab) => {
          if (tab === "overview") {
            window.location.href = "/";
          } else {
            window.location.href = `/?tab=${tab}`;
          }
        }}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          activeTab="excel-view"
          onOpenSidebar={() => setSidebarOpen(!sidebarOpen)}
          onOpenImportModal={() => setIsImportModalOpen(true)}
          onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
          onExport={() => {}}
          onRefresh={() => {}}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Sheet Tabs Bar matching Excel workbook sheet tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
              <button
                onClick={() => setSelectedSheet("summary")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-all ${
                  selectedSheet === "summary"
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/20"
                    : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
                }`}
              >
                <ShieldCheck className="h-4 w-4" />
                <span>Executive Sign-Off Plan Summary (Summary Sheet)</span>
              </button>

              <button
                onClick={() => setSelectedSheet("matrix")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-all ${
                  selectedSheet === "matrix"
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/20"
                    : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
                }`}
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span>Full 31-Day Excel Master Grid (Birichina Sheet)</span>
              </button>
            </div>

            {selectedSheet === "summary" ? (
              <SignoffPlanSummary month="2026-10" />
            ) : (
              <ExcelMasterSheet initialMonth="2026-10" />
            )}
          </div>
        </main>
      </div>

      {/* Modals */}
      <ExcelImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={() => window.location.reload()}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />
    </div>
  );
}
