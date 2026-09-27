"use client";

import React, { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { ExcelMasterSheet } from "@/components/dashboard/excel-master-sheet";
import { ExcelImportModal } from "@/components/modals/excel-import-modal";
import { SettingsModal } from "@/components/modals/settings-modal";

export default function ExcelViewPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

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
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onOpenImportModal={() => setIsImportModalOpen(true)}
          onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
          activeMonth="October 2026"
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
          <div className="max-w-7xl mx-auto space-y-6">
            <ExcelMasterSheet initialMonth="2026-10" />
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
