"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  FileSpreadsheet,
  Download,
  Search,
  RefreshCw,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Eye,
  Table as TableIcon,
  Layers,
  Sparkles,
  ArrowUpDown,
  Filter
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/shared/searchable-select";

interface ExcelMasterSheetProps {
  initialMonth?: string;
  onExport?: () => void;
}

type ViewMode = "TARGET" | "ACTUAL" | "BOTH";

export function ExcelMasterSheet({ initialMonth = "2026-10", onExport }: ExcelMasterSheetProps) {
  const [rows, setRows] = useState<any[]>([]);
  const [dateColumns, setDateColumns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRows, setTotalRows] = useState(0);
  const [summaryTotals, setSummaryTotals] = useState<any>({});
  const [lineSummaries, setLineSummaries] = useState<Record<string, Record<string, any>>>({});

  // Filter States
  const [search, setSearch] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("ALL");
  const [selectedLine, setSelectedLine] = useState("ALL");
  const [selectedBuyer, setSelectedBuyer] = useState("ALL");
  const [viewMode, setViewMode] = useState<ViewMode>("TARGET");
  const [density, setDensity] = useState<"compact" | "normal">("compact");

  // Filter options
  const [filterOptions, setFilterOptions] = useState<{
    units: { label: string; value: string }[];
    lines: { label: string; value: string; unit: string }[];
    buyers: { label: string; value: string }[];
  }>({
    units: [],
    lines: [],
    buyers: []
  });

  // Load filter options once
  useEffect(() => {
    async function loadFilters() {
      try {
        const res = await fetch("/api/analytics/filters");
        if (res.ok) {
          const data = await res.json();
          setFilterOptions({
            units: data.units || [],
            lines: data.lines || [],
            buyers: data.buyers || []
          });
        }
      } catch (e) {
        console.error("Failed to load filters:", e);
      }
    }
    loadFilters();
  }, []);

  const filteredLines = useMemo(() => {
    if (selectedUnit === "ALL") return filterOptions.lines;
    return filterOptions.lines.filter(l => l.unit === selectedUnit);
  }, [selectedUnit, filterOptions.lines]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        month: initialMonth,
        ...(search ? { search } : {}),
        ...(selectedUnit !== "ALL" ? { unitCode: selectedUnit } : {}),
        ...(selectedLine !== "ALL" ? { lineName: selectedLine } : {}),
        ...(selectedBuyer !== "ALL" ? { buyerName: selectedBuyer } : {})
      });

      const res = await fetch(`/api/excel/sheet?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setRows(data.rows || []);
        setDateColumns(data.dateColumns || []);
        setTotalPages(data.totalPages || 1);
        setTotalRows(data.totalRows || 0);
        setSummaryTotals(data.summary || {});
        setLineSummaries(data.lineSummaries || {});
      }
    } catch (err) {
      console.error("Failed to fetch Excel sheet data:", err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, initialMonth, search, selectedUnit, selectedLine, selectedBuyer]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Compute column totals for visible rows
  const visibleDayTotals = useMemo(() => {
    const totals: Record<string, { target: number; actual: number }> = {};
    for (const d of dateColumns) {
      totals[d.dateStr] = { target: 0, actual: 0 };
    }

    let totalPlan = 0;
    let totalActual = 0;

    for (const row of rows) {
      totalPlan += row.planQty || 0;
      totalActual += row.actualQty || 0;
      for (const d of dateColumns) {
        const dayVal = row.daily?.[d.dateStr];
        if (dayVal) {
          totals[d.dateStr].target += dayVal.target || 0;
          totals[d.dateStr].actual += dayVal.actual || 0;
        }
      }
    }

    return { dayTotals: totals, totalPlan, totalActual };
  }, [rows, dateColumns]);

  const groupedRows = useMemo(() => {
    const groups: Record<string, any[]> = {};
    for (const row of rows) {
      if (!groups[row.lineName]) groups[row.lineName] = [];
      groups[row.lineName].push(row);
    }
    return groups;
  }, [rows]);

  const handleExportSheet = () => {
    const params = new URLSearchParams({
      month: initialMonth,
      ...(selectedUnit !== "ALL" ? { unitCode: selectedUnit } : {}),
      ...(selectedLine !== "ALL" ? { lineName: selectedLine } : {}),
      ...(selectedBuyer !== "ALL" ? { buyerName: selectedBuyer } : {})
    });
    window.open(`/api/excel/export?${params.toString()}`, '_blank');
  };

  return (
    <Card className="shadow-md border-slate-300 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-950">
      {/* Excel Sheet Ribbon Header */}
      <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 px-4 py-3 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 backdrop-blur border border-white/20 shadow-inner">
              <FileSpreadsheet className="h-6 w-6 text-emerald-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                  Excel Plan Master Grid
                  <Badge className="bg-emerald-900/60 text-emerald-200 border border-emerald-400/30 text-[10px] py-0">
                    Sign-Off Plan (October 2026)
                  </Badge>
                </h2>
              </div>
              <p className="text-xs text-emerald-100/80">
                Exact replica of the uploaded Excel Sign-off Production Plan matrix with line, buyer, style & daily columns
              </p>
            </div>
          </div>

          {/* Quick Metrics & Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-lg bg-emerald-900/50 px-3 py-1 text-xs border border-emerald-500/30">
              <span className="text-emerald-300 text-[11px]">Total Rows:</span>
              <span className="font-bold font-mono text-white">{totalRows.toLocaleString()}</span>
            </div>

            <div className="flex items-center gap-1.5 rounded-lg bg-emerald-900/50 px-3 py-1 text-xs border border-emerald-500/30">
              <span className="text-emerald-300 text-[11px]">Planned Target:</span>
              <span className="font-bold font-mono text-white">
                {summaryTotals.totalPlanQty ? (summaryTotals.totalPlanQty / 1_000_000).toFixed(2) + "M pcs" : "-"}
              </span>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportSheet}
              className="h-8 gap-1.5 text-xs font-semibold bg-white text-emerald-900 hover:bg-emerald-50 shadow-sm border-0"
            >
              <Download className="h-3.5 w-3.5 text-emerald-700" />
              <span>Export Raw Excel</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Spreadsheet Control Toolbar */}
      <div className="border-b border-slate-200 bg-slate-50/90 p-3 dark:border-slate-800 dark:bg-slate-900/90 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Search */}
          <div className="relative w-48 sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Search Style, PO, Color, Buyer..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="h-8 pl-8 text-xs bg-white dark:bg-slate-850"
            />
          </div>

          {/* Unit Filter */}
          <SearchableSelect
            label="Unit:"
            placeholder="All Units"
            searchPlaceholder="Search unit..."
            allOptionLabel="All Units"
            allOptionValue="ALL"
            value={selectedUnit}
            options={filterOptions.units.map(u => ({ label: u.label, value: u.value }))}
            onChange={(val) => {
              setSelectedUnit(val);
              setSelectedLine("ALL");
              setPage(1);
            }}
            dropdownWidth="w-48"
          />

          {/* Line Filter */}
          <SearchableSelect
            label="Line:"
            placeholder="All Lines"
            searchPlaceholder="Search line..."
            allOptionLabel="All Lines"
            allOptionValue="ALL"
            value={selectedLine}
            options={filteredLines.map(l => ({ label: l.label, value: l.value, unit: l.unit }))}
            onChange={(val) => {
              setSelectedLine(val);
              setPage(1);
            }}
            dropdownWidth="w-64"
          />

          {/* Buyer Filter */}
          <SearchableSelect
            label="Buyer:"
            placeholder="All Buyers"
            searchPlaceholder="Search buyer..."
            allOptionLabel="All Buyers"
            allOptionValue="ALL"
            value={selectedBuyer}
            options={filterOptions.buyers.map(b => ({ label: b.label, value: b.value }))}
            onChange={(val) => {
              setSelectedBuyer(val);
              setPage(1);
            }}
            dropdownWidth="w-64"
          />
        </div>

        {/* View Mode & Density Selector */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5 text-xs font-medium dark:border-slate-800 dark:bg-slate-850">
            <button
              type="button"
              onClick={() => setViewMode("TARGET")}
              className={`rounded px-2.5 py-1 transition-all ${
                viewMode === "TARGET"
                  ? "bg-emerald-600 text-white font-bold shadow-xs"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
              }`}
            >
              Plan Target
            </button>
            <button
              type="button"
              onClick={() => setViewMode("ACTUAL")}
              className={`rounded px-2.5 py-1 transition-all ${
                viewMode === "ACTUAL"
                  ? "bg-emerald-600 text-white font-bold shadow-xs"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
              }`}
            >
              Actual Output
            </button>
            <button
              type="button"
              onClick={() => setViewMode("BOTH")}
              className={`rounded px-2.5 py-1 transition-all ${
                viewMode === "BOTH"
                  ? "bg-emerald-600 text-white font-bold shadow-xs"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400"
              }`}
            >
              Plan / Actual
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="h-8 gap-1 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Reload</span>
          </Button>
        </div>
      </div>

      {/* Spreadsheet Matrix Grid */}
      <CardContent className="p-0">
        <div className="relative overflow-x-auto overflow-y-auto max-h-[70vh] border-b border-slate-200 dark:border-slate-800 select-text custom-scrollbar">
          <table className="w-full text-left text-xs border-collapse font-sans">
            {/* Top Multi-level Header */}
            <thead className="sticky top-0 z-30 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-semibold shadow-xs">
              {/* Category Super Header */}
              <tr className="border-b border-slate-300 dark:border-slate-700 text-[11px] bg-slate-200/90 dark:bg-slate-850">
                <th colSpan={13} className="px-3 py-1 text-left font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 border-r border-slate-300 dark:border-slate-700 sticky left-0 z-40 bg-slate-200 dark:bg-slate-850">
                  📋 Garments Order & Production Line Master Specification
                </th>
                <th colSpan={dateColumns.length} className="px-3 py-1 text-center font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950/60 border-r border-slate-300 dark:border-slate-700">
                  📅 Daily Production Schedule (October 2026 — Day 01 to Day 31)
                </th>
                <th colSpan={3} className="px-3 py-1 text-center font-bold uppercase tracking-wider text-indigo-800 dark:text-indigo-300 bg-indigo-100/80 dark:bg-indigo-950/60">
                  📊 Sign-Off Summary
                </th>
              </tr>

              {/* Column Detail Header */}
              <tr className="border-b border-slate-300 dark:border-slate-700 text-[11px] whitespace-nowrap">
                {/* Fixed Frozen Columns */}
                <th className="px-2.5 py-2 border-r border-slate-300 dark:border-slate-700 text-center w-10 font-bold bg-slate-100 dark:bg-slate-900 sticky left-0 z-30">#</th>
                <th className="px-3 py-2 border-r border-slate-300 dark:border-slate-700 font-bold bg-slate-100 dark:bg-slate-900 sticky left-10 z-30">Line</th>
                <th className="px-2.5 py-2 border-r border-slate-300 dark:border-slate-700 text-center font-bold bg-slate-100 dark:bg-slate-900 sticky left-28 z-30">Unit</th>
                <th className="px-3 py-2 border-r border-slate-300 dark:border-slate-700 font-bold bg-slate-100 dark:bg-slate-900">Buyer</th>
                <th className="px-3 py-2 border-r border-slate-300 dark:border-slate-700 font-bold bg-slate-100 dark:bg-slate-900">Style Ref</th>
                <th className="px-3 py-2 border-r border-slate-300 dark:border-slate-700 font-bold bg-slate-100 dark:bg-slate-900">PO NO</th>
                <th className="px-3 py-2 border-r border-slate-300 dark:border-slate-700 font-bold bg-slate-100 dark:bg-slate-900">Color</th>
                <th className="px-2.5 py-2 border-r border-slate-300 dark:border-slate-700 text-center font-bold bg-slate-100 dark:bg-slate-900">Season</th>
                <th className="px-2.5 py-2 border-r border-slate-300 dark:border-slate-700 text-right font-bold bg-slate-100 dark:bg-slate-900">SMV</th>
                <th className="px-2.5 py-2 border-r border-slate-300 dark:border-slate-700 text-center font-bold bg-slate-100 dark:bg-slate-900">Op.</th>
                <th className="px-3 py-2 border-r border-slate-300 dark:border-slate-700 text-right font-bold bg-slate-100 dark:bg-slate-900">Order Qty</th>
                <th className="px-3 py-2 border-r border-slate-300 dark:border-slate-700 text-right font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200">Plan Qty</th>
                <th className="px-2.5 py-2 border-r border-slate-300 dark:border-slate-700 text-center font-bold bg-slate-100 dark:bg-slate-900">Status</th>

                {/* Day-by-Day Columns (01 to 31) */}
                {dateColumns.map((d) => (
                  <th
                    key={d.dateStr}
                    className="px-2.5 py-2 border-r border-slate-300 dark:border-slate-700 text-center font-mono font-bold bg-emerald-50/50 dark:bg-emerald-950/30 min-w-[62px]"
                  >
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">{d.dayName}</div>
                    <div className="text-xs text-slate-900 dark:text-slate-100">{d.dayNum}</div>
                  </th>
                ))}

                {/* Total Columns */}
                <th className="px-3 py-2 border-r border-slate-300 dark:border-slate-700 text-right font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200">Month Plan</th>
                <th className="px-3 py-2 border-r border-slate-300 dark:border-slate-700 text-right font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200">Actual Out</th>
                <th className="px-3 py-2 text-right font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200">Gap</th>
              </tr>
            </thead>

            {/* Matrix Data Rows */}
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-950">
              {loading ? (
                <tr>
                  <td colSpan={16 + dateColumns.length} className="text-center py-16 text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="h-6 w-6 animate-spin text-emerald-600" />
                      <span className="text-sm font-semibold">Loading Excel Plan Sheet Matrix...</span>
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={16 + dateColumns.length} className="text-center py-16 text-slate-400">
                    No orders match your filter criteria.
                  </td>
                </tr>
              ) : (
                Object.entries(groupedRows).map(([lineName, lineRows]) => (
                  <React.Fragment key={lineName}>
                    {lineRows.map((row) => {
                      const isLow = row.actualQty < row.planQty * 0.75;
                      return (
                        <tr
                          key={row.id}
                          className="hover:bg-amber-50/60 dark:hover:bg-slate-850/80 transition-colors whitespace-nowrap group"
                        >
                          {/* Frozen row index */}
                          <td className="px-2.5 py-1.5 border-r border-slate-200 dark:border-slate-800 text-center font-mono text-[11px] text-slate-400 bg-slate-50/80 dark:bg-slate-900/80 sticky left-0 z-20 group-hover:bg-amber-100/80 dark:group-hover:bg-slate-800">
                            {row.rowIndex}
                          </td>

                          {/* Frozen Line */}
                          <td className="px-3 py-1.5 border-r border-slate-200 dark:border-slate-800 font-bold text-slate-900 dark:text-slate-100 bg-slate-50/80 dark:bg-slate-900/80 sticky left-10 z-20 group-hover:bg-amber-100/80 dark:group-hover:bg-slate-800">
                            {row.lineName}
                          </td>

                          {/* Frozen Unit */}
                          <td className="px-2.5 py-1.5 border-r border-slate-200 dark:border-slate-800 text-center bg-slate-50/80 dark:bg-slate-900/80 sticky left-28 z-20 group-hover:bg-amber-100/80 dark:group-hover:bg-slate-800">
                            <Badge variant="outline" className="text-[10px] py-0 px-1 font-semibold text-slate-600 border-slate-300 dark:border-slate-700 dark:text-slate-300">
                              {row.unitCode}
                            </Badge>
                          </td>

                          {/* Buyer */}
                          <td className="px-3 py-1.5 border-r border-slate-200 dark:border-slate-800 font-semibold text-slate-800 dark:text-slate-200">
                            {row.buyerName}
                          </td>

                          {/* Style Ref */}
                          <td className="px-3 py-1.5 border-r border-slate-200 dark:border-slate-800 font-medium text-sky-700 dark:text-sky-300">
                            {row.styleRef}
                          </td>

                          {/* PO NO */}
                          <td className="px-3 py-1.5 border-r border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                            {row.poNo}
                          </td>

                          {/* Color */}
                          <td className="px-3 py-1.5 border-r border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 max-w-[120px] truncate" title={row.color}>
                            {row.color}
                          </td>

                          {/* Season */}
                          <td className="px-2.5 py-1.5 border-r border-slate-200 dark:border-slate-800 text-center text-slate-500 text-[11px]">
                            {row.season}
                          </td>

                          {/* SMV */}
                          <td className="px-2.5 py-1.5 border-r border-slate-200 dark:border-slate-800 text-right font-mono text-[11px] text-slate-600 dark:text-slate-400">
                            {row.smv.toFixed(2)}
                          </td>

                          {/* Operators */}
                          <td className="px-2.5 py-1.5 border-r border-slate-200 dark:border-slate-800 text-center font-mono text-[11px] text-slate-500">
                            {row.manpower}
                          </td>

                          {/* Order Qty */}
                          <td className="px-3 py-1.5 border-r border-slate-200 dark:border-slate-800 text-right font-mono font-medium">
                            {row.orderQty.toLocaleString()}
                          </td>

                          {/* Month Plan Qty */}
                          <td className="px-3 py-1.5 border-r border-slate-200 dark:border-slate-800 text-right font-mono font-bold text-slate-900 dark:text-slate-100 bg-emerald-50/30 dark:bg-emerald-950/20">
                            {row.planQty.toLocaleString()}
                          </td>

                          {/* Status */}
                          <td className="px-2.5 py-1.5 border-r border-slate-200 dark:border-slate-800 text-center">
                            <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                              {row.orderStatus}
                            </span>
                          </td>

                          {/* Day Columns */}
                          {dateColumns.map((d) => {
                            const dayVal = row.daily?.[d.dateStr];
                            const target = dayVal?.target || 0;
                            const actual = dayVal?.actual || 0;

                            if (!target && !actual) {
                              return (
                                <td
                                  key={d.dateStr}
                                  className="px-2 py-1.5 border-r border-slate-200 dark:border-slate-800 text-center text-slate-300 dark:text-slate-700 font-mono text-[11px]"
                                >
                                  -
                                </td>
                              );
                            }

                            return (
                              <td
                                key={d.dateStr}
                                className="px-2 py-1.5 border-r border-slate-200 dark:border-slate-800 text-right font-mono text-[11px]"
                              >
                                {viewMode === "TARGET" && (
                                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                                    {target.toLocaleString()}
                                  </span>
                                )}
                                {viewMode === "ACTUAL" && (
                                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                    {actual.toLocaleString()}
                                  </span>
                                )}
                                {viewMode === "BOTH" && (
                                  <div className="flex flex-col text-[10px] leading-tight">
                                    <span className="text-slate-500">{target}</span>
                                    <span className="font-bold text-emerald-600">{actual}</span>
                                  </div>
                                )}
                              </td>
                            );
                          })}

                          {/* Totals */}
                          <td className="px-3 py-1.5 border-r border-slate-200 dark:border-slate-800 text-right font-mono font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50/30 dark:bg-indigo-950/20">
                            {row.planQty.toLocaleString()}
                          </td>

                          <td className="px-3 py-1.5 border-r border-slate-200 dark:border-slate-800 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/20">
                            {row.actualQty.toLocaleString()}
                          </td>

                          <td className="px-3 py-1.5 text-right font-mono font-bold text-rose-600 dark:text-rose-400 bg-rose-50/30 dark:bg-rose-950/20">
                            {row.gapQty > 0 ? `-${row.gapQty.toLocaleString()}` : `+${Math.abs(row.gapQty).toLocaleString()}`}
                          </td>
                        </tr>
                      );
                    })}

                    {/* LINE SUMMARIES */}
                    {lineSummaries && lineSummaries[lineName] && (
                      <>
                        {/* Plan/Day */}
                        <tr className="bg-sky-50/30 dark:bg-sky-950/20 border-t-2 border-slate-300 dark:border-slate-700 font-semibold">
                          <td colSpan={13} className="px-3 py-1.5 border-r border-slate-300 dark:border-slate-700 text-right text-[11px] text-sky-800 dark:text-sky-300 uppercase sticky left-0 z-10 bg-sky-50 dark:bg-sky-950">Plan/Day</td>
                          {dateColumns.map(d => {
                            const val = lineSummaries[lineName][d.dateStr]?.targetQty;
                            return (
                              <td key={d.dateStr} className="px-2 py-1.5 border-r border-slate-300 dark:border-slate-700 text-right font-mono text-[11px] font-bold text-sky-800 dark:text-sky-300 bg-white/50 dark:bg-slate-950/50">
                                {val > 0 ? val.toLocaleString() : '-'}
                              </td>
                            );
                          })}
                          <td colSpan={3} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-900 border-l border-slate-300 dark:border-slate-700"></td>
                        </tr>
                        {/* SAH */}
                        <tr className="bg-emerald-50/30 dark:bg-emerald-950/20 font-semibold">
                          <td colSpan={13} className="px-3 py-1.5 border-r border-slate-300 dark:border-slate-700 text-right text-[11px] text-emerald-800 dark:text-emerald-300 uppercase sticky left-0 z-10 bg-emerald-50 dark:bg-emerald-950">SAH</td>
                          {dateColumns.map(d => {
                            const val = lineSummaries[lineName][d.dateStr]?.targetSah;
                            return (
                              <td key={d.dateStr} className="px-2 py-1.5 border-r border-slate-300 dark:border-slate-700 text-right font-mono text-[11px] font-bold text-emerald-800 dark:text-emerald-300 bg-white/50 dark:bg-slate-950/50">
                                {val > 0 ? val.toFixed(2) : '-'}
                              </td>
                            );
                          })}
                          <td colSpan={3} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-900 border-l border-slate-300 dark:border-slate-700"></td>
                        </tr>
                        {/* Machine HR */}
                        <tr className="bg-amber-50/30 dark:bg-amber-950/20 font-semibold">
                          <td colSpan={13} className="px-3 py-1.5 border-r border-slate-300 dark:border-slate-700 text-right text-[11px] text-amber-800 dark:text-amber-300 uppercase sticky left-0 z-10 bg-amber-50 dark:bg-amber-950">Machine HR</td>
                          {dateColumns.map(d => {
                            const val = lineSummaries[lineName][d.dateStr]?.clockHours;
                            return (
                              <td key={d.dateStr} className="px-2 py-1.5 border-r border-slate-300 dark:border-slate-700 text-right font-mono text-[11px] font-bold text-amber-800 dark:text-amber-300 bg-white/50 dark:bg-slate-950/50">
                                {val > 0 ? val.toFixed(2) : '-'}
                              </td>
                            );
                          })}
                          <td colSpan={3} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-900 border-l border-slate-300 dark:border-slate-700"></td>
                        </tr>
                        {/* Effi. plan/l */}
                        <tr className="bg-indigo-50/30 dark:bg-indigo-950/20 border-b-4 border-slate-400 dark:border-slate-600 font-semibold">
                          <td colSpan={13} className="px-3 py-1.5 border-r border-slate-300 dark:border-slate-700 text-right text-[11px] text-indigo-800 dark:text-indigo-300 uppercase sticky left-0 z-10 bg-indigo-50 dark:bg-indigo-950">Effi. plan/l</td>
                          {dateColumns.map(d => {
                            const val = lineSummaries[lineName][d.dateStr]?.plannedEfficiency;
                            return (
                              <td key={d.dateStr} className="px-2 py-1.5 border-r border-slate-300 dark:border-slate-700 text-right font-mono text-[11px] font-bold text-indigo-800 dark:text-indigo-300 bg-white/50 dark:bg-slate-950/50">
                                {val > 0 ? val.toFixed(1) + '%' : '-'}
                              </td>
                            );
                          })}
                          <td colSpan={3} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-900 border-l border-slate-300 dark:border-slate-700"></td>
                        </tr>
                      </>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>

            {/* Bottom Sticky Totals Row */}
            <tfoot className="sticky bottom-0 z-30 bg-slate-100 dark:bg-slate-900 border-t-2 border-slate-400 dark:border-slate-600 font-bold text-slate-900 dark:text-slate-100 text-xs shadow-lg whitespace-nowrap">
              <tr>
                <td colSpan={11} className="px-3 py-2 border-r border-slate-300 dark:border-slate-700 text-right uppercase tracking-wider font-extrabold sticky left-0 z-30 bg-slate-100 dark:bg-slate-900">
                  Visible Rows Total ({rows.length} records):
                </td>
                <td className="px-3 py-2 border-r border-slate-300 dark:border-slate-700 text-right font-mono text-emerald-700 dark:text-emerald-300 font-extrabold bg-emerald-100/50 dark:bg-emerald-950/50">
                  {visibleDayTotals.totalPlan.toLocaleString()}
                </td>
                <td className="px-2.5 py-2 border-r border-slate-300 dark:border-slate-700 text-center font-bold">
                  -
                </td>

                {/* Daily Column Sums */}
                {dateColumns.map((d) => {
                  const daySum = visibleDayTotals.dayTotals[d.dateStr];
                  return (
                    <td
                      key={d.dateStr}
                      className="px-2 py-2 border-r border-slate-300 dark:border-slate-700 text-right font-mono text-[11px] font-bold bg-slate-200/50 dark:bg-slate-850"
                    >
                      {viewMode === "TARGET" && daySum?.target.toLocaleString()}
                      {viewMode === "ACTUAL" && daySum?.actual.toLocaleString()}
                      {viewMode === "BOTH" && `${daySum?.target || 0}/${daySum?.actual || 0}`}
                    </td>
                  );
                })}

                {/* Final Totals */}
                <td className="px-3 py-2 border-r border-slate-300 dark:border-slate-700 text-right font-mono font-extrabold text-indigo-700 dark:text-indigo-300 bg-indigo-100/50 dark:bg-indigo-950/50">
                  {visibleDayTotals.totalPlan.toLocaleString()}
                </td>
                <td className="px-3 py-2 border-r border-slate-300 dark:border-slate-700 text-right font-mono font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-100/50 dark:bg-emerald-950/50">
                  {visibleDayTotals.totalActual.toLocaleString()}
                </td>
                <td className="px-3 py-2 text-right font-mono font-extrabold text-rose-700 dark:text-rose-300 bg-rose-100/50 dark:bg-rose-950/50">
                  -{(visibleDayTotals.totalPlan - visibleDayTotals.totalActual).toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Excel Pagination Controls */}
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 dark:border-slate-800 text-xs text-slate-500 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <span>Rows per sheet page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              aria-label="Rows per page"
              className="rounded border border-slate-200 bg-white px-2 py-1 text-xs focus:outline-none dark:border-slate-800 dark:bg-slate-850 text-slate-800 dark:text-slate-200"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
          </div>

          <div className="flex items-center gap-2 font-medium">
            <span>
              Showing Page <span className="font-bold text-slate-900 dark:text-slate-100">{page}</span> of{" "}
              <span className="font-bold text-slate-900 dark:text-slate-100">{totalPages}</span> ({totalRows.toLocaleString()} total rows)
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1 || loading}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="h-7 w-7 p-0"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages || loading}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="h-7 w-7 p-0"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
