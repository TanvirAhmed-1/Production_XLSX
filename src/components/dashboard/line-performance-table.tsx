"use client";

import React from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell
} from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/shared/searchable-select";
import {
  Search,
  ArrowUpDown,
  Download,
  Eye,
  Layers,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

export interface LinePerformanceRow {
  lineId: string;
  lineName: string;
  unitCode: string;
  unitName?: string;
  manpower: number;
  target: number;
  actual: number;
  gap: number;
  sah: number;
  efficiency: number;
  achievementRate: number;
  status: string;
}

interface LinePerformanceTableProps {
  lines: LinePerformanceRow[];
  onLineClick?: (lineName: string) => void;
  onExport?: () => void;
}

type SortField = 'lineName' | 'unitCode' | 'manpower' | 'target' | 'actual' | 'gap' | 'efficiency' | 'achievementRate' | 'sah';

export function LinePerformanceTable({ lines, onLineClick, onExport }: LinePerformanceTableProps) {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedUnit, setSelectedUnit] = React.useState("ALL");
  const [selectedStatus, setSelectedStatus] = React.useState("ALL");
  const [sortField, setSortField] = React.useState<SortField>('efficiency');
  const [sortAsc, setSortAsc] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(15);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const filteredAndSortedLines = React.useMemo(() => {
    let result = lines.filter((l) => {
      const matchSearch =
        l.lineName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.unitCode.toLowerCase().includes(searchTerm.toLowerCase());
      const matchUnit = selectedUnit === "ALL" || l.unitCode === selectedUnit;
      const matchStatus = selectedStatus === "ALL" || l.status === selectedStatus;
      return matchSearch && matchUnit && matchStatus;
    });

    result.sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];
      if (typeof valA === 'string') {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortAsc ? valA - valB : valB - valA;
    });

    return result;
  }, [lines, searchTerm, selectedUnit, selectedStatus, sortField, sortAsc]);

  const totalPages = Math.ceil(filteredAndSortedLines.length / pageSize);
  const paginatedLines = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedLines.slice(start, start + pageSize);
  }, [filteredAndSortedLines, currentPage, pageSize]);

  return (
    <Card className="shadow-sm border-slate-200/90 dark:border-slate-800">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Layers className="h-4 w-4 text-sky-600 dark:text-sky-400" />
              Line-wise Production Performance & Efficiency
            </CardTitle>
            <CardDescription className="text-xs">
              Comprehensive report of all production lines, outputs, manpower, SAH, and performance status
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onExport}
              className="h-8 gap-1 text-xs border-slate-200 dark:border-slate-700"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export Lines</span>
            </Button>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2.5 pt-2">
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative w-48 sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Search Line (e.g. U02-01)..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-8 pl-8 text-xs"
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
              options={[
                { label: "Unit U02", value: "U02" },
                { label: "Unit U03", value: "U03" },
                { label: "Unit U04", value: "U04" },
                { label: "Unit B2", value: "B2" }
              ]}
              onChange={(val) => {
                setSelectedUnit(val);
                setCurrentPage(1);
              }}
              dropdownWidth="w-48"
            />

            {/* Status Filter */}
            <SearchableSelect
              label="Status:"
              placeholder="All Statuses"
              searchPlaceholder="Search status..."
              allOptionLabel="All Statuses"
              allOptionValue="ALL"
              value={selectedStatus}
              options={[
                { label: "High (≥85%)", value: "HIGH" },
                { label: "Normal (70–84%)", value: "NORMAL" },
                { label: "Needs Attention (60–69%)", value: "NEEDS_ATTENTION" },
                { label: "Low (<60%)", value: "LOW" }
              ]}
              onChange={(val) => {
                setSelectedStatus(val);
                setCurrentPage(1);
              }}
              dropdownWidth="w-56"
            />
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Showing <span className="font-bold text-slate-900 dark:text-slate-100">{filteredAndSortedLines.length}</span> lines
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80 dark:bg-slate-900/80">
                <TableHead onClick={() => handleSort('lineName')} className="cursor-pointer hover:text-slate-900 dark:hover:text-slate-100 font-semibold">
                  <div className="flex items-center gap-1">Line <ArrowUpDown className="h-3 w-3" /></div>
                </TableHead>
                <TableHead onClick={() => handleSort('unitCode')} className="cursor-pointer hover:text-slate-900 font-semibold">
                  <div className="flex items-center gap-1">Unit <ArrowUpDown className="h-3 w-3" /></div>
                </TableHead>
                <TableHead onClick={() => handleSort('manpower')} className="cursor-pointer hover:text-slate-900 text-right font-semibold">
                  <div className="flex items-center justify-end gap-1">Operators <ArrowUpDown className="h-3 w-3" /></div>
                </TableHead>
                <TableHead onClick={() => handleSort('target')} className="cursor-pointer hover:text-slate-900 text-right font-semibold">
                  <div className="flex items-center justify-end gap-1">Planned Target <ArrowUpDown className="h-3 w-3" /></div>
                </TableHead>
                <TableHead onClick={() => handleSort('actual')} className="cursor-pointer hover:text-slate-900 text-right font-semibold">
                  <div className="flex items-center justify-end gap-1">Actual Output <ArrowUpDown className="h-3 w-3" /></div>
                </TableHead>
                <TableHead onClick={() => handleSort('gap')} className="cursor-pointer hover:text-slate-900 text-right font-semibold">
                  <div className="flex items-center justify-end gap-1">Gap Variance <ArrowUpDown className="h-3 w-3" /></div>
                </TableHead>
                <TableHead onClick={() => handleSort('sah')} className="cursor-pointer hover:text-slate-900 text-right font-semibold">
                  <div className="flex items-center justify-end gap-1">SAH <ArrowUpDown className="h-3 w-3" /></div>
                </TableHead>
                <TableHead onClick={() => handleSort('efficiency')} className="cursor-pointer hover:text-slate-900 text-right font-semibold">
                  <div className="flex items-center justify-end gap-1">Efficiency % <ArrowUpDown className="h-3 w-3" /></div>
                </TableHead>
                <TableHead onClick={() => handleSort('achievementRate')} className="cursor-pointer hover:text-slate-900 text-right font-semibold">
                  <div className="flex items-center justify-end gap-1">Achieve % <ArrowUpDown className="h-3 w-3" /></div>
                </TableHead>
                <TableHead className="font-semibold text-center">Status</TableHead>
                <TableHead className="text-right font-semibold pr-4">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedLines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-8 text-slate-400">
                    No production lines match the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedLines.map((line) => {
                  let badgeVariant: any = "secondary";
                  let statusLabel = "Normal";
                  if (line.efficiency >= 85) {
                    badgeVariant = "success";
                    statusLabel = "High";
                  } else if (line.efficiency >= 70) {
                    badgeVariant = "info";
                    statusLabel = "Normal";
                  } else if (line.efficiency >= 60) {
                    badgeVariant = "warning";
                    statusLabel = "Needs Attention";
                  } else {
                    badgeVariant = "destructive";
                    statusLabel = "Low / Bottleneck";
                  }

                  return (
                    <TableRow
                      key={line.lineId}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <TableCell className="font-bold text-slate-900 dark:text-slate-100">
                        {line.lineName}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-semibold text-slate-600 dark:text-slate-300">
                          {line.unitCode}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {line.manpower}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        {line.target.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {line.actual.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-semibold">
                        <span className={line.gap > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600"}>
                          {line.gap > 0 ? `-${line.gap.toLocaleString()}` : `+${Math.abs(line.gap).toLocaleString()}`}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-slate-600 dark:text-slate-400">
                        {line.sah.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span
                            className={`font-bold font-mono text-xs ${
                              line.efficiency >= 85
                                ? "text-emerald-600 dark:text-emerald-400"
                                : line.efficiency < 60
                                ? "text-rose-600 dark:text-rose-400 font-extrabold"
                                : "text-slate-800 dark:text-slate-200"
                            }`}
                          >
                            {line.efficiency}%
                          </span>
                          <div className="w-12 bg-slate-200 rounded-full h-1.5 dark:bg-slate-700 hidden md:block">
                            <div
                              className={`h-1.5 rounded-full ${
                                line.efficiency >= 85
                                  ? "bg-emerald-500"
                                  : line.efficiency >= 70
                                  ? "bg-sky-500"
                                  : line.efficiency >= 60
                                  ? "bg-amber-500"
                                  : "bg-rose-500"
                              }`}
                              style={{ width: `${Math.min(100, line.efficiency)}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {line.achievementRate}%
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={badgeVariant} className="text-[10px] font-semibold">
                          {statusLabel}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onLineClick?.(line.lineName)}
                          className="h-7 px-2 text-xs font-semibold text-sky-600 hover:text-sky-700 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-950/50"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          <span>Drill Down</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 dark:border-slate-800 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                aria-label="Rows per page"
                className="rounded border border-slate-200 bg-white px-2 py-1 text-xs focus:outline-none dark:border-slate-850 dark:bg-slate-900"
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="flex items-center gap-2 font-medium">
              <span>
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="h-7 w-7 p-0"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="h-7 w-7 p-0"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
