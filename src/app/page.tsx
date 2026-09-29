"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { KPICards } from "@/components/dashboard/kpi-cards";
import { ProductionCharts } from "@/components/dashboard/production-charts";
import { UnitPerformanceSection } from "@/components/dashboard/unit-performance-section";
import { DailyProductionReport } from "@/components/dashboard/daily-production-report";
import { LinePerformanceTable } from "@/components/dashboard/line-performance-table";
import { RunLinesReport } from "@/components/dashboard/run-lines-report";
import { ChangeOverDashboard } from "@/components/dashboard/change-over-dashboard";
import { BuyerPerformanceSection } from "@/components/dashboard/buyer-performance-section";
import { ExcelUploadCard } from "@/components/dashboard/excel-upload-card";
import { CalculationAuditModal } from "@/components/modals/calculation-audit-modal";
import { SnapshotComparisonModal } from "@/components/modals/snapshot-comparison-modal";
import { ProductionReportDTO, RunningLinesResult, ChangeOverResult, LineDetailResult, CalculationAuditDetail } from "@/lib/calculations";
import { RefreshCw, AlertTriangle, Layers, Calendar, Factory, ListOrdered, BarChart3, Briefcase, UploadCloud } from "lucide-react";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  // Data states
  const [report, setReport] = useState<ProductionReportDTO | null>(null);
  const [runningLines, setRunningLines] = useState<RunningLinesResult | null>(null);
  const [changeOver, setChangeOver] = useState<ChangeOverResult | null>(null);
  const [lineDetail, setLineDetail] = useState<LineDetailResult | null>(null);
  const [imports, setImports] = useState<Array<{ id: string; fileName: string; uploadedAt: string }>>([]);
  const [selectedImportId, setSelectedImportId] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [auditModalOpen, setAuditModalOpen] = useState<boolean>(false);
  const [auditData, setAuditData] = useState<CalculationAuditDetail | null>(null);
  const [auditLoading, setAuditLoading] = useState<boolean>(false);
  const [compareModalOpen, setCompareModalOpen] = useState<boolean>(false);

  // Fetch Imports History
  const fetchImports = async () => {
    try {
      const res = await fetch("/api/excel/history");
      const json = await res.json();
      if (json.success && json.imports) {
        setImports(json.imports);
        if (json.imports.length > 0 && !selectedImportId) {
          setSelectedImportId(json.imports[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch import history:", err);
    }
  };

  // Fetch Report Data
  const fetchReport = async (importId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const query = importId ? `?importId=${importId}` : "";
      const res = await fetch(`/api/reports/production${query}`);
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Failed to load production report.");
      }

      setReport(json.report);
      setRunningLines(json.runningLines);
      setChangeOver(json.changeOver);
      setLineDetail(json.lineDetail);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to fetch production report.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImports();
  }, []);

  useEffect(() => {
    fetchReport(selectedImportId);
  }, [selectedImportId]);

  // Audit Trigger Handler
  const handleOpenAudit = async (params: {
    metric: 'sah' | 'planPCS' | 'machineHour' | 'workingHour' | 'efficiency';
    unit?: string;
    line?: string;
    dateKey?: string;
  }) => {
    setAuditModalOpen(true);
    setAuditLoading(true);
    try {
      const query = new URLSearchParams({
        metric: params.metric,
        ...(selectedImportId ? { importId: selectedImportId } : {}),
        ...(params.unit ? { unit: params.unit } : {}),
        ...(params.line ? { line: params.line } : {}),
        ...(params.dateKey ? { dateKey: params.dateKey } : {}),
      });

      const res = await fetch(`/api/reports/audit?${query.toString()}`);
      const json = await res.json();
      if (json.success && json.audit) {
        setAuditData(json.audit);
      }
    } catch (err) {
      console.error("Failed to load audit trace:", err);
    } finally {
      setAuditLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
      />

      {/* Main Content Area */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Top Header */}
        <Header
          currentImportId={selectedImportId}
          imports={imports}
          onSelectImport={id => setSelectedImportId(id)}
          onOpenUpload={() => setActiveTab("upload")}
          onOpenCompare={() => setCompareModalOpen(true)}
          onRefresh={() => fetchReport(selectedImportId)}
          isLoading={loading}
        />

        {/* View Contents */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {loading && !report ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-medium text-slate-400">
                Running Calculation Engine from Database...
              </p>
            </div>
          ) : error ? (
            <div className="p-8 rounded-2xl bg-rose-950/30 border border-rose-500/40 text-center space-y-4">
              <div className="p-3 rounded-2xl bg-rose-500/20 text-rose-400 w-fit mx-auto border border-rose-500/30">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-white">Production Data Not Available</h3>
              <p className="text-xs text-rose-300 max-w-md mx-auto">{error}</p>
              <button
                onClick={() => setActiveTab("upload")}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-lg transition"
              >
                Upload Excel Production Plan
              </button>
            </div>
          ) : report ? (
            <>
              {/* Tab 1: Overview Dashboard */}
              {activeTab === "overview" && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <KPICards
                    summary={report.summary}
                    onAuditClick={metric => handleOpenAudit({ metric })}
                  />

                  <ProductionCharts daily={report.daily} units={report.units} />

                  <UnitPerformanceSection
                    units={report.units}
                    groups={report.groups}
                    onAuditClick={params => handleOpenAudit(params)}
                  />
                </div>
              )}

              {/* Tab 2: Daily Summary */}
              {activeTab === "daily-report" && lineDetail && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <DailyProductionReport
                    daily={report.daily}
                    lineDetail={lineDetail}
                    onAuditClick={params => handleOpenAudit(params)}
                  />
                </div>
              )}

              {/* Tab 3: Unit Summary */}
              {activeTab === "unit-summary" && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <UnitPerformanceSection
                    units={report.units}
                    groups={report.groups}
                    onAuditClick={params => handleOpenAudit(params)}
                  />
                </div>
              )}

              {/* Tab 4: Line Detail Report */}
              {activeTab === "line-detail" && lineDetail && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <LinePerformanceTable lineDetail={lineDetail} />
                </div>
              )}

              {/* Tab 5: Running Lines Matrix */}
              {activeTab === "run-lines" && runningLines && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <RunLinesReport runningLines={runningLines} />
                </div>
              )}

              {/* Tab 6: Change Over Timeline */}
              {activeTab === "change-over" && changeOver && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <ChangeOverDashboard changeOver={changeOver} />
                </div>
              )}

              {/* Tab 7: Buyers & Styles Portfolio */}
              {activeTab === "buyer-style" && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <BuyerPerformanceSection report={report} />
                </div>
              )}

              {/* Tab 8: Upload New Plan */}
              {activeTab === "upload" && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <ExcelUploadCard
                    onUploadSuccess={newImportId => {
                      fetchImports();
                      setSelectedImportId(newImportId);
                      setActiveTab("overview");
                    }}
                  />
                </div>
              )}

              {/* Tab 9: Snapshot Comparison */}
              {activeTab === "comparison" && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-4">
                    <h3 className="text-base font-bold text-white">Compare Production Plan Snapshots</h3>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      Select two historical plan imports to analyze changes in planned output, SAH, and efficiency.
                    </p>
                    <button
                      onClick={() => setCompareModalOpen(true)}
                      className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-semibold text-white shadow-lg transition"
                    >
                      Open Comparison Tool
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-4">
              <UploadCloud className="w-10 h-10 text-indigo-400 mx-auto" />
              <h3 className="text-base font-bold text-white">No Production Plan Uploaded</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Upload your Birichina production plan Excel workbook (.xlsx) to compute reports.
              </p>
              <button
                onClick={() => setActiveTab("upload")}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition"
              >
                Upload Plan Now
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Traceability Audit Breakdown Modal */}
      <CalculationAuditModal
        isOpen={auditModalOpen}
        onClose={() => setAuditModalOpen(false)}
        audit={auditData}
        isLoading={auditLoading}
      />

      {/* Snapshot Comparison Modal */}
      <SnapshotComparisonModal
        isOpen={compareModalOpen}
        onClose={() => setCompareModalOpen(false)}
        imports={imports}
      />
    </div>
  );
}
