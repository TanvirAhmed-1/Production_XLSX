"use client";

import React from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableFooter
} from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Download, Eye, TrendingUp, CheckCircle2 } from "lucide-react";

interface DailyProductionRow {
  date: string;
  shortDate: string;
  target: number;
  actual: number;
  gap: number;
  targetSah: number;
  actualSah: number;
  efficiency: number;
  achievementRate: number;
}

interface DailyProductionReportProps {
  data: DailyProductionRow[];
  onDateClick?: (dateStr: string) => void;
  onExport?: () => void;
}

export function DailyProductionReport({ data, onDateClick, onExport }: DailyProductionReportProps) {
  const totals = React.useMemo(() => {
    const totalTarget = data.reduce((acc, r) => acc + r.target, 0);
    const totalActual = data.reduce((acc, r) => acc + r.actual, 0);
    const totalGap = data.reduce((acc, r) => acc + r.gap, 0);
    const totalTargetSah = data.reduce((acc, r) => acc + r.targetSah, 0);
    const totalActualSah = data.reduce((acc, r) => acc + r.actualSah, 0);
    const avgEff = data.length > 0 ? Number((data.reduce((acc, r) => acc + r.efficiency, 0) / data.length).toFixed(1)) : 0;
    const avgAch = totalTarget > 0 ? Number(((totalActual / totalTarget) * 100).toFixed(1)) : 0;

    return {
      totalTarget,
      totalActual,
      totalGap,
      totalTargetSah,
      totalActualSah,
      avgEff,
      avgAch
    };
  }, [data]);

  return (
    <Card className="shadow-sm border-slate-200/90 dark:border-slate-800">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-sky-600 dark:text-sky-400" />
              Daily Production Report (October 2026)
            </CardTitle>
            <CardDescription className="text-xs">
              Day-by-day production volume, SAH outputs, efficiency rates, and target achievements
            </CardDescription>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            className="h-8 gap-1 text-xs border-slate-200 dark:border-slate-700"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Daily Report</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80 dark:bg-slate-900/80">
                <TableHead className="font-semibold">Date</TableHead>
                <TableHead className="text-right font-semibold">Planned Target (Pcs)</TableHead>
                <TableHead className="text-right font-semibold">Actual Output (Pcs)</TableHead>
                <TableHead className="text-right font-semibold">Gap Variance</TableHead>
                <TableHead className="text-right font-semibold">Target SAH</TableHead>
                <TableHead className="text-right font-semibold">Actual SAH</TableHead>
                <TableHead className="text-right font-semibold">Efficiency %</TableHead>
                <TableHead className="text-right font-semibold">Achievement %</TableHead>
                <TableHead className="text-center font-semibold">Status</TableHead>
                <TableHead className="text-right font-semibold pr-4">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => {
                let badgeVariant: any = "secondary";
                let status = "On Track";
                if (row.achievementRate >= 95) {
                  badgeVariant = "success";
                  status = "High Output";
                } else if (row.achievementRate >= 80) {
                  badgeVariant = "info";
                  status = "Normal";
                } else {
                  badgeVariant = "warning";
                  status = "Below Plan";
                }

                return (
                  <TableRow
                    key={row.date}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <TableCell className="font-bold text-slate-900 dark:text-slate-100">
                      {row.date}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      {row.target.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {row.actual.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-semibold">
                      <span className={row.gap > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600"}>
                        {row.gap > 0 ? `-${row.gap.toLocaleString()}` : `+${Math.abs(row.gap).toLocaleString()}`}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-slate-500">
                      {row.targetSah.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {row.actualSah.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
                      {row.efficiency}%
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-xs">
                      {row.achievementRate}%
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={badgeVariant} className="text-[10px] font-semibold">
                        {status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDateClick?.(row.date)}
                        className="h-7 px-2 text-xs font-semibold text-sky-600 hover:text-sky-700 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-950/50"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        <span>View Lines</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow className="bg-slate-100/80 font-bold dark:bg-slate-850">
                <TableCell>Total Month Output</TableCell>
                <TableCell className="text-right font-mono">{totals.totalTarget.toLocaleString()}</TableCell>
                <TableCell className="text-right font-mono text-emerald-600 dark:text-emerald-400">{totals.totalActual.toLocaleString()}</TableCell>
                <TableCell className="text-right font-mono text-rose-600">-{totals.totalGap.toLocaleString()}</TableCell>
                <TableCell className="text-right font-mono">{totals.totalTargetSah.toLocaleString()}</TableCell>
                <TableCell className="text-right font-mono">{totals.totalActualSah.toLocaleString()}</TableCell>
                <TableCell className="text-right font-mono text-indigo-600 dark:text-indigo-400">{totals.avgEff}% (Avg)</TableCell>
                <TableCell className="text-right font-mono">{totals.avgAch}%</TableCell>
                <TableCell colSpan={2} className="text-center">Sign-off Month Total</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
