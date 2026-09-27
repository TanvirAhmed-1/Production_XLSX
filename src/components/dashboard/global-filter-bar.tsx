"use client";

import React from "react";
import { Filter, X, RotateCcw, Search, Calendar, Check, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/shared/searchable-select";

export interface FilterState {
  batchId?: string;
  month?: string;
  unitCode: string;
  lineName: string;
  buyerName: string;
  season: string;
  orderStatus: string;
  styleRef: string;
  startDate: string;
  endDate: string;
  search?: string;
}

interface GlobalFilterBarProps {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  filterOptions: {
    units: { label: string; value: string }[];
    lines: { label: string; value: string; unit: string }[];
    buyers: { label: string; value: string }[];
    seasons: { label: string; value: string }[];
    months?: { label: string; value: string }[];
    batches?: { label: string; value: string; month?: string; fileName?: string }[];
  };
  onApply?: () => void;
  onReset?: () => void;
  onOpenUploadModal?: () => void;
}

export function GlobalFilterBar({
  filters,
  setFilters,
  filterOptions,
  onApply,
  onReset,
  onOpenUploadModal
}: GlobalFilterBarProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const filteredLines = React.useMemo(() => {
    if (!filters.unitCode || filters.unitCode === "ALL") {
      return filterOptions.lines;
    }
    return filterOptions.lines.filter(l => l.unit === filters.unitCode);
  }, [filters.unitCode, filterOptions.lines]);

  const activeFiltersCount = React.useMemo(() => {
    let count = 0;
    if (filters.batchId && filters.batchId !== "ALL") count++;
    if (filters.month && filters.month !== "ALL") count++;
    if (filters.unitCode && filters.unitCode !== "ALL") count++;
    if (filters.lineName && filters.lineName !== "ALL") count++;
    if (filters.buyerName && filters.buyerName !== "ALL") count++;
    if (filters.season && filters.season !== "ALL") count++;
    if (filters.orderStatus && filters.orderStatus !== "ALL") count++;
    if (filters.styleRef) count++;
    if (filters.startDate) count++;
    if (filters.endDate) count++;
    return count;
  }, [filters]);

  const clearFilter = (key: keyof FilterState, defaultVal: string = "ALL") => {
    setFilters(prev => ({ ...prev, [key]: defaultVal }));
  };

  const handleResetAll = () => {
    setFilters({
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
      search: ""
    });
    onReset?.();
  };

  return (
    <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm transition-all dark:border-slate-800 dark:bg-slate-900/90">
      {/* Top Main Filter Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400">
            <Filter className="h-4 w-4" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              Global Filter System
              {activeFiltersCount > 0 && (
                <span className="flex h-5 items-center justify-center rounded-full bg-sky-600 px-1.5 text-[10px] font-bold text-white">
                  {activeFiltersCount} active
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Quick Filter Inputs */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Uploaded Excel File / Batch Selector */}
          {filterOptions.batches && filterOptions.batches.length > 0 && (
            <SearchableSelect
              label="File:"
              placeholder="All Excel Files"
              searchPlaceholder="Search file..."
              allOptionLabel="All Excel Files"
              allOptionValue="ALL"
              value={filters.batchId || "ALL"}
              options={filterOptions.batches.map(b => ({
                label: b.label,
                value: b.value,
                badge: b.month
              }))}
              onChange={(bId) => {
                const selectedBatch = filterOptions.batches?.find(b => b.value === bId);
                setFilters(prev => ({
                  ...prev,
                  batchId: bId,
                  month: selectedBatch?.month || prev.month || "ALL"
                }));
              }}
              dropdownWidth="w-72"
            />
          )}

          {/* Month Selector */}
          {filterOptions.months && filterOptions.months.length > 0 && (
            <SearchableSelect
              label="Month:"
              placeholder="All Months"
              searchPlaceholder="Search month..."
              allOptionLabel="All Months"
              allOptionValue="ALL"
              value={filters.month || "ALL"}
              options={filterOptions.months.map(m => ({
                label: m.label,
                value: m.value
              }))}
              onChange={(val) => setFilters(prev => ({ ...prev, month: val }))}
              dropdownWidth="w-56"
            />
          )}

          {/* Unit selector */}
          <SearchableSelect
            label="Unit:"
            placeholder="All Units"
            searchPlaceholder="Search unit..."
            allOptionLabel="All Units"
            allOptionValue="ALL"
            value={filters.unitCode || "ALL"}
            options={filterOptions.units.map(u => ({
              label: u.label,
              value: u.value
            }))}
            onChange={(val) => {
              setFilters(prev => ({ ...prev, unitCode: val, lineName: "ALL" }));
            }}
            dropdownWidth="w-56"
          />

          {/* Line selector (Searchable with Unit Badges) */}
          <SearchableSelect
            label="Line:"
            placeholder="All Lines"
            searchPlaceholder="Search line (e.g. U02-01, B2-15)..."
            allOptionLabel="All Lines"
            allOptionValue="ALL"
            value={filters.lineName || "ALL"}
            options={filteredLines.map(l => ({
              label: l.label,
              value: l.value,
              unit: l.unit
            }))}
            onChange={(val) => setFilters(prev => ({ ...prev, lineName: val }))}
            dropdownWidth="w-64"
          />

          {/* Buyer selector */}
          <SearchableSelect
            label="Buyer:"
            placeholder="All Buyers"
            searchPlaceholder="Search buyer..."
            allOptionLabel="All Buyers"
            allOptionValue="ALL"
            value={filters.buyerName || "ALL"}
            options={filterOptions.buyers.map(b => ({
              label: b.label,
              value: b.value
            }))}
            onChange={(val) => setFilters(prev => ({ ...prev, buyerName: val }))}
            dropdownWidth="w-64"
          />

          {/* Expand more filters */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 gap-1.5 text-xs text-slate-700 dark:text-slate-300"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>{isExpanded ? "Fewer Filters" : "More Filters"}</span>
          </Button>

          {/* Reset button */}
          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetAll}
              className="h-8 gap-1 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/40"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset</span>
            </Button>
          )}
        </div>
      </div>

      {/* Expanded Advanced Filters */}
      {isExpanded && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 border-t border-slate-100 pt-3 dark:border-slate-800/80 animate-in fade-in-50 duration-200">
          {/* Style Ref Search */}
          <div>
            <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
              Style Ref / Article:
            </label>
            <Input
              placeholder="e.g. 4934P, 559068"
              value={filters.styleRef}
              onChange={(e) => setFilters(prev => ({ ...prev, styleRef: e.target.value }))}
              className="h-8 text-xs"
            />
          </div>

          {/* Season Selector */}
          <div>
            <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
              Season:
            </label>
            <SearchableSelect
              placeholder="All Seasons"
              searchPlaceholder="Search season..."
              allOptionLabel="All Seasons"
              allOptionValue="ALL"
              value={filters.season || "ALL"}
              options={filterOptions.seasons.map(s => ({
                label: s.label,
                value: s.value
              }))}
              onChange={(val) => setFilters(prev => ({ ...prev, season: val }))}
              className="w-full"
              triggerClassName="w-full justify-between bg-white dark:bg-slate-900 h-8"
              dropdownWidth="w-full min-w-[200px]"
            />
          </div>

          {/* Date Range Start */}
          <div>
            <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
              From Date:
            </label>
            <Input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
              className="h-8 text-xs"
            />
          </div>

          {/* Date Range End */}
          <div>
            <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
              To Date:
            </label>
            <Input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
              className="h-8 text-xs"
            />
          </div>
        </div>
      )}

      {/* Active Filter Tags */}
      {activeFiltersCount > 0 && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2 dark:border-slate-800/60">
          <span className="text-[11px] text-slate-400">Active:</span>

          {filters.batchId && filters.batchId !== "ALL" && (
            <Badge variant="secondary" className="gap-1 text-[11px] bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-medium">
              File: {filterOptions.batches?.find(b => b.value === filters.batchId)?.fileName || filters.batchId}
              <X className="h-3 w-3 cursor-pointer hover:text-rose-500" onClick={() => clearFilter("batchId")} />
            </Badge>
          )}

          {filters.month && filters.month !== "ALL" && (
            <Badge variant="secondary" className="gap-1 text-[11px] bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300">
              Month: {filters.month}
              <X className="h-3 w-3 cursor-pointer hover:text-rose-500" onClick={() => clearFilter("month")} />
            </Badge>
          )}

          {filters.unitCode && filters.unitCode !== "ALL" && (
            <Badge variant="secondary" className="gap-1 text-[11px] bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300">
              Unit: {filters.unitCode}
              <X className="h-3 w-3 cursor-pointer hover:text-rose-500" onClick={() => clearFilter("unitCode")} />
            </Badge>
          )}

          {filters.lineName && filters.lineName !== "ALL" && (
            <Badge variant="secondary" className="gap-1 text-[11px] bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300">
              Line: {filters.lineName}
              <X className="h-3 w-3 cursor-pointer hover:text-rose-500" onClick={() => clearFilter("lineName")} />
            </Badge>
          )}

          {filters.buyerName && filters.buyerName !== "ALL" && (
            <Badge variant="secondary" className="gap-1 text-[11px] bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
              Buyer: {filters.buyerName}
              <X className="h-3 w-3 cursor-pointer hover:text-rose-500" onClick={() => clearFilter("buyerName")} />
            </Badge>
          )}

          {filters.season && filters.season !== "ALL" && (
            <Badge variant="secondary" className="gap-1 text-[11px]">
              Season: {filters.season}
              <X className="h-3 w-3 cursor-pointer hover:text-rose-500" onClick={() => clearFilter("season")} />
            </Badge>
          )}

          {filters.styleRef && (
            <Badge variant="secondary" className="gap-1 text-[11px]">
              Style: {filters.styleRef}
              <X className="h-3 w-3 cursor-pointer hover:text-rose-500" onClick={() => clearFilter("styleRef", "")} />
            </Badge>
          )}

          {filters.startDate && (
            <Badge variant="secondary" className="gap-1 text-[11px]">
              From: {filters.startDate}
              <X className="h-3 w-3 cursor-pointer hover:text-rose-500" onClick={() => clearFilter("startDate", "")} />
            </Badge>
          )}

          {filters.endDate && (
            <Badge variant="secondary" className="gap-1 text-[11px]">
              To: {filters.endDate}
              <X className="h-3 w-3 cursor-pointer hover:text-rose-500" onClick={() => clearFilter("endDate", "")} />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
