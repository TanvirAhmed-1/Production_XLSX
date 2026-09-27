"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { GlobalFilterBar, FilterState } from "@/components/dashboard/global-filter-bar";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { ProductionCharts } from "@/components/dashboard/production-charts";
import { LinePerformanceTable } from "@/components/dashboard/line-performance-table";
import { AttentionRequired } from "@/components/dashboard/attention-required";
import { DailyProductionReport } from "@/components/dashboard/daily-production-report";
import { UnitPerformanceSection } from "@/components/dashboard/unit-performance-section";
import { BuyerPerformanceSection } from "@/components/dashboard/buyer-performance-section";
import { ProductionCalendar } from "@/components/dashboard/production-calendar";
import { ManpowerAnalysis } from "@/components/dashboard/manpower-analysis";
import { ManagementSummary } from "@/components/dashboard/management-summary";
import { OrdersTable } from "@/components/orders/orders-table";
import { ExcelMasterSheet } from "@/components/dashboard/excel-master-sheet";
import { ExcelImportModal } from "@/components/modals/excel-import-modal";
import { LineDrilldownModal } from "@/components/modals/line-drilldown-modal";
import { SettingsModal } from "@/components/modals/settings-modal";
import { DeleteConfirmationModal } from "@/components/shared/delete-confirmation-modal";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  FileSpreadsheet,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  History,
  Sliders,
  Trash2,
  Eye,
  CheckCircle2,
} from "lucide-react";

const initialFilters: FilterState = {
  batchId: "ALL",
  month: "ALL",
  unitCode: "ALL",
  lineName: "ALL",
  buyerName: "ALL",
  season: "ALL",
  orderStatus: "ALL",
  styleRef: "",
  startDate: "",
  endDate: "",
  search: "",
};

export default function DashboardPage() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [selectedMonth, setSelectedMonth] = useState<string>("2026-10");

  // Filter State
  const [filters, setFilters] = useState<FilterState>(initialFilters);

  // Filter Dropdown Options
  const [filterOptions, setFilterOptions] = useState<{
    units: { label: string; value: string }[];
    lines: { label: string; value: string; unit: string }[];
    buyers: { label: string; value: string }[];
    seasons: { label: string; value: string }[];
    months: { label: string; value: string }[];
    batches: { label: string; value: string; month?: string; fileName?: string }[];
  }>({
    units: [],
    lines: [],
    buyers: [],
    seasons: [],
    months: [{ label: "October 2026", value: "2026-10" }],
    batches: [],
  });

  // Data Loading State
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [dashboardData, setDashboardData] = useState<any>(null);

  // Modals
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [selectedLineForDrilldown, setSelectedLineForDrilldown] = useState<string | null>(null);
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    batchId: string;
    fileName: string;
  }>({
    isOpen: false,
    batchId: "",
    fileName: "",
  });

  // Import History State
  const [importHistory, setImportHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  // Fetch Filter Dropdown Options
  const fetchFilterOptions = useCallback(async () => {
    try {
      const res = await fetch("/api/analytics/filters");
      if (res.ok) {
        const data = await res.json();
        setFilterOptions(data);
      }
    } catch (err) {
      console.error("Failed to load filter options", err);
    }
  }, []);

  // Fetch Dashboard Analytics Data
  const fetchDashboardData = useCallback(async (currentFilters: FilterState, monthVal: string) => {
    try {
      const params = new URLSearchParams();
      if (currentFilters.batchId && currentFilters.batchId !== "ALL") params.append("batchId", currentFilters.batchId);
      if (currentFilters.month && currentFilters.month !== "ALL") {
        params.append("month", currentFilters.month);
      } else if (monthVal && (!currentFilters.batchId || currentFilters.batchId === "ALL")) {
        params.append("month", monthVal);
      }
      if (currentFilters.unitCode && currentFilters.unitCode !== "ALL") params.append("unitCode", currentFilters.unitCode);
      if (currentFilters.lineName && currentFilters.lineName !== "ALL") params.append("lineName", currentFilters.lineName);
      if (currentFilters.buyerName && currentFilters.buyerName !== "ALL") params.append("buyerName", currentFilters.buyerName);
      if (currentFilters.season && currentFilters.season !== "ALL") params.append("season", currentFilters.season);
      if (currentFilters.orderStatus && currentFilters.orderStatus !== "ALL") params.append("orderStatus", currentFilters.orderStatus);
      if (currentFilters.styleRef) params.append("styleRef", currentFilters.styleRef);
      if (currentFilters.startDate) params.append("startDate", currentFilters.startDate);
      if (currentFilters.endDate) params.append("endDate", currentFilters.endDate);

      const res = await fetch(`/api/analytics/dashboard?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setDashboardData(data);
      }
    } catch (err) {
      console.error("Failed to fetch dashboard data", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Fetch Import History
  const fetchImportHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch("/api/excel/history");
      if (res.ok) {
        const data = await res.json();
        setImportHistory(data);
      }
    } catch (err) {
      console.error("Failed to fetch import history", err);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  const promptDeleteBatch = (batchId: string, fileName: string) => {
    setDeleteModalState({
      isOpen: true,
      batchId,
      fileName,
    });
  };

  const confirmDeleteBatch = async () => {
    if (!deleteModalState.batchId) return;
    try {
      const res = await fetch(`/api/excel/history?id=${deleteModalState.batchId}`, { method: "DELETE" });
      if (res.ok) {
        if (filters.batchId === deleteModalState.batchId) {
          setFilters(prev => ({ ...prev, batchId: "ALL" }));
        }
        fetchImportHistory();
        fetchFilterOptions();
        fetchDashboardData({ ...filters, batchId: "ALL" }, selectedMonth);
      }
    } catch (err) {
      console.error("Failed to delete batch", err);
    }
  };

  const handleSelectBatch = (batchId: string, month?: string) => {
    setFilters(prev => ({
      ...prev,
      batchId,
      month: month || prev.month || "ALL"
    }));
    setActiveTab("overview");
  };

  useEffect(() => {
    fetchFilterOptions();
  }, [fetchFilterOptions]);

  useEffect(() => {
    fetchDashboardData(filters, selectedMonth);
  }, [filters, selectedMonth, fetchDashboardData]);

  useEffect(() => {
    if (activeTab === "import-history" || activeTab === "excel-import") {
      fetchImportHistory();
    }
  }, [activeTab, fetchImportHistory]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData(filters, selectedMonth);
  };

  // Export Data Handler
  const handleExport = (type: string = "filtered") => {
    const params = new URLSearchParams();
    params.append("type", type);
    if (filters.batchId && filters.batchId !== "ALL") params.append("batchId", filters.batchId);
    if (filters.month && filters.month !== "ALL") {
      params.append("month", filters.month);
    } else if (selectedMonth) {
      params.append("month", selectedMonth);
    }
    if (filters.unitCode && filters.unitCode !== "ALL") params.append("unitCode", filters.unitCode);
    if (filters.lineName && filters.lineName !== "ALL") params.append("lineName", filters.lineName);
    if (filters.buyerName && filters.buyerName !== "ALL") params.append("buyerName", filters.buyerName);
    if (filters.season && filters.season !== "ALL") params.append("season", filters.season);
    if (filters.orderStatus && filters.orderStatus !== "ALL") params.append("orderStatus", filters.orderStatus);
    if (filters.styleRef) params.append("styleRef", filters.styleRef);
    if (filters.startDate) params.append("startDate", filters.startDate);
    if (filters.endDate) params.append("endDate", filters.endDate);

    window.open(`/api/excel/export?${params.toString()}`, "_blank");
  };

  // Quick Drilldown / KPI card clicks
  const handleKPIClick = (kpiKey: string) => {
    if (kpiKey === "highest-line" || kpiKey === "lowest-line" || kpiKey === "lines") {
      setActiveTab("line-performance");
    } else if (kpiKey === "manpower") {
      setActiveTab("manpower-analysis");
    } else if (kpiKey === "avg-efficiency") {
      setActiveTab("efficiency-analysis");
    } else if (kpiKey === "order-qty") {
      setActiveTab("all-orders");
    }
  };

  const handleLineClick = (lineName: string) => {
    setSelectedLineForDrilldown(lineName);
  };

  const handleUnitClick = (unitCode: string) => {
    setFilters((prev) => ({ ...prev, unitCode }));
    setActiveTab("line-performance");
  };

  const handleBuyerClick = (buyerName: string) => {
    setFilters((prev) => ({ ...prev, buyerName }));
    setActiveTab("all-orders");
  };

  const handleDateClick = (dateStr: string) => {
    setFilters((prev) => ({
      ...prev,
      startDate: dateStr,
      endDate: dateStr,
    }));
    setActiveTab("daily-report");
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 font-sans">
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        alertCount={dashboardData?.alerts?.lowPerformingLinesCount || 0}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <Header
          activeTab={activeTab}
          onOpenSidebar={() => setSidebarOpen(true)}
          onOpenImportModal={() => setIsImportModalOpen(true)}
          onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
          onRefresh={handleRefresh}
          onExport={handleExport}
          isRefreshing={refreshing}
          alertCount={dashboardData?.alerts?.lowPerformingLinesCount || 0}
          selectedMonth={selectedMonth}
          onMonthChange={(m) => setSelectedMonth(m)}
          monthOptions={filterOptions?.months || [{ label: "October 2026", value: "2026-10" }]}
        />

        {/* Global Filter Bar */}
        <GlobalFilterBar
          filters={filters}
          setFilters={setFilters}
          filterOptions={filterOptions}
          onApply={() => fetchDashboardData(filters, selectedMonth)}
          onReset={() => {
            setFilters(initialFilters);
            fetchDashboardData(initialFilters, selectedMonth);
          }}
        />

        {/* Scrollable View Container */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6">
          {loading ? (
            <div className="flex min-h-[400px] flex-col items-center justify-center space-y-3">
              <RefreshCw className="h-8 w-8 animate-spin text-indigo-600" />
              <p className="text-sm font-medium text-slate-500">Loading production analytics from database...</p>
            </div>
          ) : dashboardData ? (
            <>
              {/* TAB: OVERVIEW */}
              {activeTab === "overview" && (
                <div className="space-y-6">
                  {/* Quick Excel Master Grid Banner */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-teal-50/60 to-white p-3.5 shadow-xs dark:border-emerald-900/60 dark:from-emerald-950/30 dark:to-slate-900">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
                        <FileSpreadsheet className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-emerald-950 dark:text-emerald-100">
                            Excel Plan Master Grid (Same as Uploaded Excel Sheet)
                          </h3>
                          <Badge className="bg-emerald-600 text-white text-[10px] py-0">Active Matrix</Badge>
                        </div>
                        <p className="text-xs text-emerald-700 dark:text-emerald-300">
                          View the full 31-day sign-off production matrix, style specifications, and line outputs in native spreadsheet layout.
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setActiveTab("excel-master")}
                      className="gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 shadow-xs"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Open Excel Plan Grid</span>
                    </Button>
                  </div>

                  {/* Top 10 KPI Cards */}
                  <KpiCards data={dashboardData.kpis} onCardClick={handleKPIClick} />

                  {/* Major Charts: Target vs Actual & Efficiency Trend */}
                  <ProductionCharts
                    efficiencyTrend={dashboardData.efficiencyTrend}
                    topLines={dashboardData.topLines}
                    lowestLines={dashboardData.lowestLines}
                    unitPerformance={dashboardData.unitPerformance}
                    buyerPerformance={dashboardData.buyerPerformance}
                  />

                  {/* High and Low Performing Lines Side by Side */}
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* Top Lines Card */}
                    <Card className="shadow-xs border-slate-200">
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                            <TrendingUp className="h-4 w-4" />
                          </div>
                          <div>
                            <CardTitle className="text-base font-semibold">Top Performing Lines</CardTitle>
                            <p className="text-xs text-slate-500">Highest operational efficiency</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-indigo-600"
                          onClick={() => setActiveTab("line-performance")}
                        >
                          View All Lines →
                        </Button>
                      </CardHeader>
                      <CardContent className="pt-2">
                        <div className="space-y-3">
                          {dashboardData.topLines.slice(0, 5).map((l: any, idx: number) => (
                            <div
                              key={l.lineName}
                              onClick={() => handleLineClick(l.lineName)}
                              className="group flex cursor-pointer items-center justify-between rounded-lg border border-slate-100 p-3 transition-colors hover:border-emerald-200 hover:bg-emerald-50/40"
                            >
                              <div className="flex items-center gap-3">
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                                  {idx + 1}
                                </span>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-slate-800 group-hover:text-emerald-700">
                                      {l.lineName}
                                    </span>
                                    <Badge variant="outline" className="text-[10px] py-0 px-1">
                                      {l.unitCode}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-slate-500">
                                    Target: {l.target.toLocaleString()} pcs • Actual: {l.actual.toLocaleString()} pcs
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="text-sm font-bold text-emerald-700">{l.efficiency}%</span>
                                <p className="text-[11px] text-slate-500">
                                  {l.target > 0 ? ((l.actual / l.target) * 100).toFixed(1) : 0}% Achieved
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Low Lines Card */}
                    <Card className="shadow-xs border-slate-200">
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 text-rose-700">
                            <TrendingDown className="h-4 w-4" />
                          </div>
                          <div>
                            <CardTitle className="text-base font-semibold">Low Performing Lines</CardTitle>
                            <p className="text-xs text-slate-500">Efficiency requiring supervision</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-indigo-600"
                          onClick={() => setActiveTab("line-performance")}
                        >
                          Analyze Gaps →
                        </Button>
                      </CardHeader>
                      <CardContent className="pt-2">
                        <div className="space-y-3">
                          {dashboardData.lowestLines.slice(0, 5).map((l: any, idx: number) => (
                            <div
                              key={l.lineName}
                              onClick={() => handleLineClick(l.lineName)}
                              className="group flex cursor-pointer items-center justify-between rounded-lg border border-slate-100 p-3 transition-colors hover:border-rose-200 hover:bg-rose-50/40"
                            >
                              <div className="flex items-center gap-3">
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-50 text-xs font-semibold text-rose-700">
                                  {idx + 1}
                                </span>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-slate-800 group-hover:text-rose-700">
                                      {l.lineName}
                                    </span>
                                    <Badge variant="outline" className="text-[10px] py-0 px-1">
                                      {l.unitCode}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-slate-500">
                                    Gap: -{l.gap.toLocaleString()} pcs • Target: {l.target.toLocaleString()}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="text-sm font-bold text-rose-600">{l.efficiency}%</span>
                                <p className="text-[11px] text-slate-500">
                                  {l.target > 0 ? ((l.actual / l.target) * 100).toFixed(1) : 0}% Achieved
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Attention Required / Anomalies */}
                  <AttentionRequired
                    alerts={dashboardData.alerts}
                    onLineClick={handleLineClick}
                    onOpenSettings={() => setIsSettingsModalOpen(true)}
                  />

                  {/* Unit Performance Section */}
                  <UnitPerformanceSection
                    units={dashboardData.unitPerformance}
                    onSelectUnit={handleUnitClick}
                  />

                  {/* Buyer Performance Section */}
                  <BuyerPerformanceSection
                    buyers={dashboardData.buyerPerformance}
                    onSelectBuyer={handleBuyerClick}
                    onExport={() => handleExport("buyer")}
                  />

                  {/* Line Performance Detailed Table */}
                  <LinePerformanceTable
                    lines={dashboardData.linePerformance}
                    onLineClick={handleLineClick}
                    onExport={() => handleExport("line")}
                  />

                  {/* Daily Production Report Section */}
                  <DailyProductionReport
                    data={dashboardData.efficiencyTrend}
                    onDateClick={handleDateClick}
                    onExport={() => handleExport("daily")}
                  />

                  {/* Production Calendar View */}
                  <ProductionCalendar
                    days={dashboardData.efficiencyTrend}
                    onSelectDate={handleDateClick}
                  />
                </div>
              )}

              {/* TAB: EXCEL MASTER GRID PLAN (SAME AS EXCEL DESIGN) */}
              {activeTab === "excel-master" && (
                <div className="space-y-6">
                  <ExcelMasterSheet
                    initialMonth={filters.month !== "ALL" ? filters.month : "2026-10"}
                    onExport={() => handleExport("orders")}
                  />
                </div>
              )}

              {/* TAB: DAILY PRODUCTION */}
              {activeTab === "daily-report" && (
                <div className="space-y-6">
                  <div className="flex flex-col gap-1">
                    <h2 className="text-xl font-bold text-slate-900">Daily Production Report</h2>
                    <p className="text-sm text-slate-500">
                      Day-by-day target, actual output, efficiency variance, and achievement percentages
                    </p>
                  </div>
                  <DailyProductionReport
                    data={dashboardData.efficiencyTrend}
                    onDateClick={handleDateClick}
                    onExport={() => handleExport("daily")}
                  />
                </div>
              )}

              {/* TAB: TARGET VS ACTUAL / PRODUCTION PLAN */}
              {(activeTab === "target-vs-actual" || activeTab === "production-plan") && (
                <div className="space-y-6">
                  <div className="flex flex-col gap-1">
                    <h2 className="text-xl font-bold text-slate-900">Target vs Actual Production Analysis</h2>
                    <p className="text-sm text-slate-500">
                      Comprehensive plan comparison, production variances, and fulfillment rates
                    </p>
                  </div>
                  <KpiCards data={dashboardData.kpis} onCardClick={handleKPIClick} />
                  <ProductionCharts
                    efficiencyTrend={dashboardData.efficiencyTrend}
                    topLines={dashboardData.topLines}
                    lowestLines={dashboardData.lowestLines}
                    unitPerformance={dashboardData.unitPerformance}
                    buyerPerformance={dashboardData.buyerPerformance}
                  />
                </div>
              )}

              {/* TAB: PRODUCTION CALENDAR */}
              {activeTab === "production-calendar" && (
                <div className="space-y-6">
                  <div className="flex flex-col gap-1">
                    <h2 className="text-xl font-bold text-slate-900">Monthly Production Calendar</h2>
                    <p className="text-sm text-slate-500">
                      Color-coded date grid showing plan adherence, actual quantities, and efficiency rating
                    </p>
                  </div>
                  <ProductionCalendar
                    days={dashboardData.efficiencyTrend}
                    onSelectDate={handleDateClick}
                  />
                </div>
              )}

              {/* TAB: LINE PERFORMANCE */}
              {activeTab === "line-performance" && (
                <div className="space-y-6">
                  <div className="flex flex-col gap-1">
                    <h2 className="text-xl font-bold text-slate-900">Line-wise Performance Master</h2>
                    <p className="text-sm text-slate-500">
                      Monitor all 113 production lines across U02, U03, U04, and B2 units
                    </p>
                  </div>
                  <LinePerformanceTable
                    lines={dashboardData.linePerformance}
                    onLineClick={handleLineClick}
                    onExport={() => handleExport("line")}
                  />
                </div>
              )}

              {/* TAB: EFFICIENCY ANALYSIS */}
              {activeTab === "efficiency-analysis" && (
                <div className="space-y-6">
                  <div className="flex flex-col gap-1">
                    <h2 className="text-xl font-bold text-slate-900">Efficiency Analytics & Benchmarking</h2>
                    <p className="text-sm text-slate-500">
                      Unit comparisons, top/bottom efficiency ranking, and daily efficiency fluctuation
                    </p>
                  </div>
                  <ProductionCharts
                    efficiencyTrend={dashboardData.efficiencyTrend}
                    topLines={dashboardData.topLines}
                    lowestLines={dashboardData.lowestLines}
                    unitPerformance={dashboardData.unitPerformance}
                    buyerPerformance={dashboardData.buyerPerformance}
                  />
                </div>
              )}

              {/* TAB: UNIT PERFORMANCE */}
              {activeTab === "unit-performance" && (
                <div className="space-y-6">
                  <div className="flex flex-col gap-1">
                    <h2 className="text-xl font-bold text-slate-900">Manufacturing Unit Comparison</h2>
                    <p className="text-sm text-slate-500">
                      Cross-unit comparison for U02, U03, U04, and B2 facilities
                    </p>
                  </div>
                  <UnitPerformanceSection
                    units={dashboardData.unitPerformance}
                    onSelectUnit={handleUnitClick}
                  />
                </div>
              )}

              {/* TAB: BUYER PERFORMANCE */}
              {activeTab === "buyer-performance" && (
                <div className="space-y-6">
                  <div className="flex flex-col gap-1">
                    <h2 className="text-xl font-bold text-slate-900">Buyer & Brand Analytics</h2>
                    <p className="text-sm text-slate-500">
                      Production breakdown for Marks & Spencer, H&M, GAP, Tesco, Next, Lidl, and others
                    </p>
                  </div>
                  <BuyerPerformanceSection
                    buyers={dashboardData.buyerPerformance}
                    onSelectBuyer={handleBuyerClick}
                    onExport={() => handleExport("buyer")}
                  />
                </div>
              )}

              {/* TAB: MANPOWER ANALYSIS */}
              {activeTab === "manpower-analysis" && (
                <div className="space-y-6">
                  <div className="flex flex-col gap-1">
                    <h2 className="text-xl font-bold text-slate-900">Manpower & Capacity Utilization</h2>
                    <p className="text-sm text-slate-500">
                      Operator allocation, SAH earned, and labor productivity by unit and line
                    </p>
                  </div>
                  <ManpowerAnalysis
                    unitPerformance={dashboardData.unitPerformance}
                    linePerformance={dashboardData.linePerformance}
                  />
                </div>
              )}

              {/* TAB: ALL ORDERS / DELAYED ORDERS */}
              {(activeTab === "all-orders" || activeTab === "order-performance" || activeTab === "delayed-orders") && (
                <div className="space-y-6">
                  <div className="flex flex-col gap-1">
                    <h2 className="text-xl font-bold text-slate-900">
                      {activeTab === "delayed-orders" ? "Delayed & Critical Orders" : "Order Master Management"}
                    </h2>
                    <p className="text-sm text-slate-500">
                      Track 2,400+ style orders, POs, colors, ordered qty, produced qty, and remaining balance
                    </p>
                  </div>
                  <OrdersTable onExport={() => handleExport("orders")} />
                </div>
              )}

              {/* TAB: PRODUCTION GAP / ATTENTION REQUIRED */}
              {(activeTab === "production-gap" || activeTab === "attention-required") && (
                <div className="space-y-6">
                  <div className="flex flex-col gap-1">
                    <h2 className="text-xl font-bold text-slate-900">Production Gap & Anomaly Alerts</h2>
                    <p className="text-sm text-slate-500">
                      Automatic detection of lines and orders lagging behind target production
                    </p>
                  </div>
                  <AttentionRequired
                    alerts={dashboardData.alerts}
                    onLineClick={handleLineClick}
                    onOpenSettings={() => setIsSettingsModalOpen(true)}
                  />
                </div>
              )}

              {/* TAB: MANAGEMENT SUMMARY / REPORTS */}
              {(activeTab === "management-summary" ||
                activeTab === "management-report" ||
                activeTab === "line-report" ||
                activeTab === "buyer-report" ||
                activeTab === "unit-report") && (
                <div className="space-y-6">
                  <div className="flex flex-col gap-1">
                    <h2 className="text-xl font-bold text-slate-900">Executive Management Summary</h2>
                    <p className="text-sm text-slate-500">
                      C-Level overview of garments production health, volume, and operational highlights
                    </p>
                  </div>
                  <ManagementSummary
                    kpis={dashboardData.kpis}
                    topLines={dashboardData.topLines}
                    lowestLines={dashboardData.lowestLines}
                    unitPerformance={dashboardData.unitPerformance}
                    alerts={dashboardData.alerts}
                    onNavigateTab={(tab) => setActiveTab(tab)}
                  />
                </div>
              )}

              {/* TAB: EXCEL IMPORT & DATA MANAGEMENT */}
              {(activeTab === "excel-import" ||
                activeTab === "import-history" ||
                activeTab === "data-validation") && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">Excel Data Management & Ingestion</h2>
                      <p className="text-sm text-slate-500">
                        Upload monthly production sign-off sheets, validate line mappings, and view historical imports
                      </p>
                    </div>
                    <Button
                      onClick={() => setIsImportModalOpen(true)}
                      className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                      <FileSpreadsheet className="h-4 w-4" />
                      Import New Excel File
                    </Button>
                  </div>

                  {/* Import History Table */}
                  <Card className="shadow-xs border-slate-200">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div className="flex items-center gap-2">
                        <History className="h-5 w-5 text-indigo-600" />
                        <CardTitle className="text-base font-semibold">Excel Ingestion Logs</CardTitle>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchImportHistory}
                        disabled={loadingHistory}
                        className="gap-1 text-xs"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${loadingHistory ? "animate-spin" : ""}`} />
                        Refresh Logs
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {loadingHistory ? (
                        <div className="py-8 text-center text-sm text-slate-500">Loading history logs...</div>
                      ) : importHistory.length === 0 ? (
                        <div className="py-8 text-center text-sm text-slate-500">
                          No Excel imports recorded yet. Click &quot;Import New Excel File&quot; to ingest your plan.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600 uppercase">
                              <tr>
                                <th className="px-4 py-3 whitespace-nowrap">File Name</th>
                                <th className="px-4 py-3 whitespace-nowrap">Month</th>
                                <th className="px-4 py-3 whitespace-nowrap">Status</th>
                                <th className="px-4 py-3 whitespace-nowrap">Imported Rows</th>
                                <th className="px-4 py-3 whitespace-nowrap">Daily Records</th>
                                <th className="px-4 py-3 whitespace-nowrap">Uploaded At</th>
                                <th className="px-4 py-3 text-right whitespace-nowrap">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {importHistory.map((h: any) => {
                                const isActive = filters.batchId === h.id;
                                return (
                                  <tr key={h.id} className={`hover:bg-slate-50/50 ${isActive ? "bg-indigo-50/40" : ""}`}>
                                    <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">
                                      <div className="flex items-center gap-2">
                                        <FileSpreadsheet className="h-4 w-4 text-emerald-600 shrink-0" />
                                        <span className="truncate max-w-[240px]" title={h.fileName}>{h.fileName}</span>
                                        {isActive && (
                                          <Badge className="bg-indigo-600 text-white text-[10px] py-0 px-1.5 font-semibold">
                                            Active View
                                          </Badge>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600 font-semibold whitespace-nowrap">{h.month}</td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                      <Badge
                                        variant={h.status === "SUCCESS" || h.status === "COMPLETED" ? "default" : "destructive"}
                                        className={h.status === "SUCCESS" || h.status === "COMPLETED" ? "bg-emerald-600 text-white text-xs" : "text-xs"}
                                      >
                                        {h.status}
                                      </Badge>
                                    </td>
                                    <td className="px-4 py-3 text-slate-700 font-semibold whitespace-nowrap">
                                      {h.importedRows || h.rowCount || 0}
                                    </td>
                                    <td className="px-4 py-3 text-slate-700 font-semibold whitespace-nowrap">
                                      {h.dailyRecordsCreated || (h.summary ? JSON.parse(h.summary)?.dailyRecords : "-")}
                                    </td>
                                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                                      {new Date(h.createdAt).toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3 text-right whitespace-nowrap">
                                      <div className="flex items-center justify-end gap-2">
                                        <Button
                                          variant={isActive ? "default" : "outline"}
                                          size="sm"
                                          onClick={() => handleSelectBatch(h.id, h.month)}
                                          className={`h-7 text-xs gap-1 ${isActive ? "bg-indigo-600 text-white" : "border-indigo-200 text-indigo-700 hover:bg-indigo-50"}`}
                                        >
                                          <Eye className="h-3.5 w-3.5" />
                                          {isActive ? "Active View" : "View Dashboard"}
                                        </Button>

                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => promptDeleteBatch(h.id, h.fileName)}
                                          className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                          title="Delete Batch & Records"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* TAB: SETTINGS */}
              {activeTab === "settings" && (
                <div className="space-y-6">
                  <div className="flex flex-col gap-1">
                    <h2 className="text-xl font-bold text-slate-900">System Preferences & Thresholds</h2>
                    <p className="text-sm text-slate-500">
                      Configure efficiency benchmarks, notification triggers, and production targets
                    </p>
                  </div>
                  <Card className="shadow-xs border-slate-200">
                    <CardHeader>
                      <CardTitle className="text-base font-semibold">Efficiency Alert Configuration</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-slate-600">
                        Adjust the baseline benchmarks used to trigger automatic alerts across all dashboards:
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="rounded-lg border border-rose-200 bg-rose-50/40 p-4">
                          <span className="text-xs font-semibold text-rose-700 uppercase">Critical Low</span>
                          <div className="mt-1 text-2xl font-bold text-rose-800">
                            &lt; {dashboardData.alerts?.lowThreshold || 60}%
                          </div>
                          <p className="mt-1 text-xs text-rose-600">Triggers urgent supervisor warning</p>
                        </div>
                        <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-4">
                          <span className="text-xs font-semibold text-amber-700 uppercase">Attention Needed</span>
                          <div className="mt-1 text-2xl font-bold text-amber-800">
                            {dashboardData.alerts?.lowThreshold || 60}% - 80%
                          </div>
                          <p className="mt-1 text-xs text-amber-600">Requires daily line tracking</p>
                        </div>
                        <div className="rounded-lg border border-indigo-200 bg-indigo-50/40 p-4">
                          <span className="text-xs font-semibold text-indigo-700 uppercase">Target Range</span>
                          <div className="mt-1 text-2xl font-bold text-indigo-800">
                            80% - 100%
                          </div>
                          <p className="mt-1 text-xs text-indigo-600">Normal operating parameters</p>
                        </div>
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-4">
                          <span className="text-xs font-semibold text-emerald-700 uppercase">High Benchmark</span>
                          <div className="mt-1 text-2xl font-bold text-emerald-800">
                            &gt; 100%
                          </div>
                          <p className="mt-1 text-xs text-emerald-600">Peak performance reward line</p>
                        </div>
                      </div>
                      <div className="pt-2">
                        <Button
                          onClick={() => setIsSettingsModalOpen(true)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                        >
                          <Sliders className="h-4 w-4" />
                          Modify Threshold Values
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </>
          ) : (
            <div className="flex min-h-[400px] flex-col items-center justify-center space-y-3 rounded-lg border border-dashed border-slate-300 p-8 text-center">
              <AlertCircle className="h-10 w-10 text-amber-500" />
              <h3 className="text-base font-semibold text-slate-800">No Production Data Found</h3>
              <p className="max-w-md text-sm text-slate-500">
                Please upload an Excel production sheet to populate line performance, order tracking, and efficiency analytics.
              </p>
              <Button
                onClick={() => setIsImportModalOpen(true)}
                className="mt-2 bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Upload Excel Sheet
              </Button>
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      <ExcelImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={() => {
          fetchFilterOptions();
          fetchDashboardData(filters, selectedMonth);
          fetchImportHistory();
        }}
      />

      <LineDrilldownModal
        lineName={selectedLineForDrilldown}
        isOpen={!!selectedLineForDrilldown}
        onClose={() => setSelectedLineForDrilldown(null)}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onSettingsSaved={() => fetchDashboardData(filters, selectedMonth)}
      />

      <DeleteConfirmationModal
        isOpen={deleteModalState.isOpen}
        onClose={() => setDeleteModalState(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDeleteBatch}
        title="Delete Excel Import Batch"
        fileName={deleteModalState.fileName}
      />
    </div>
  );
}
