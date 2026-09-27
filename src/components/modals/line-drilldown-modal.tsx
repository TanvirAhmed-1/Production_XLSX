"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Layers, Users, Clock, Target, TrendingUp, RefreshCw, X } from "lucide-react";

interface LineDrilldownModalProps {
  lineName: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function LineDrilldownModal({ lineName, isOpen, onClose }: LineDrilldownModalProps) {
  const [loading, setLoading] = React.useState(false);
  const [lineDetails, setLineDetails] = React.useState<any | null>(null);

  React.useEffect(() => {
    if (!lineName || !isOpen) return;

    async function fetchLineDetails() {
      setLoading(true);
      try {
        const [dashRes, ordersRes] = await Promise.all([
          fetch(`/api/analytics/dashboard?lineName=${encodeURIComponent(lineName!)}`),
          fetch(`/api/analytics/orders?lineName=${encodeURIComponent(lineName!)}&pageSize=50`)
        ]);

        if (dashRes.ok && ordersRes.ok) {
          const dash = await dashRes.json();
          const orders = await ordersRes.json();
          setLineDetails({
            kpis: dash.kpis,
            trend: dash.efficiencyTrend,
            orders: orders.data
          });
        }
      } catch (err) {
        console.error("Failed to load line details:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchLineDetails();
  }, [lineName, isOpen]);

  if (!lineName) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto custom-scrollbar">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                <Layers className="h-5 w-5 text-sky-600" />
                Line Performance Drill-Down: {lineName}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Detailed breakdown of daily output, assigned styles, manpower, and efficiency
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <RefreshCw className="h-6 w-6 animate-spin text-sky-500 mr-2" />
            <span>Loading line performance details...</span>
          </div>
        ) : lineDetails ? (
          <div className="space-y-4 py-2">
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-2.5 dark:border-slate-800 dark:bg-slate-900">
                <span className="text-[10px] text-slate-500 block">Actual Output</span>
                <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                  {lineDetails.kpis.totalActualProduction.toLocaleString()} pcs
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Plan: {lineDetails.kpis.totalPlannedProduction.toLocaleString()}
                </span>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-2.5 dark:border-slate-800 dark:bg-slate-900">
                <span className="text-[10px] text-slate-500 block">Line Efficiency</span>
                <span className="text-base font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                  {lineDetails.kpis.averageEfficiency}%
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Achieved: {lineDetails.kpis.targetAchievementRate}%
                </span>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-2.5 dark:border-slate-800 dark:bg-slate-900">
                <span className="text-[10px] text-slate-500 block">Actual SAH</span>
                <span className="text-base font-bold text-slate-800 dark:text-slate-200 font-mono">
                  {lineDetails.kpis.totalSAH.toFixed(1)} hrs
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Target: {lineDetails.kpis.targetSAH.toFixed(1)}
                </span>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-2.5 dark:border-slate-800 dark:bg-slate-900">
                <span className="text-[10px] text-slate-500 block">Active Orders</span>
                <span className="text-base font-bold text-slate-800 dark:text-slate-200 font-mono">
                  {lineDetails.orders.length}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Styles running
                </span>
              </div>
            </div>

            {/* Allocated Styles and Orders Table */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                Allocated Styles & Orders on {lineName}
              </h4>
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-x-auto max-h-56">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 text-xs">
                      <TableHead>Buyer</TableHead>
                      <TableHead>Style Ref</TableHead>
                      <TableHead>PO NO</TableHead>
                      <TableHead>Color</TableHead>
                      <TableHead className="text-right">Order Qty</TableHead>
                      <TableHead className="text-right">Planned Qty</TableHead>
                      <TableHead className="text-right">Actual Qty</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lineDetails.orders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-4 text-xs text-slate-400">
                          No order records found for this line.
                        </TableCell>
                      </TableRow>
                    ) : (
                      lineDetails.orders.map((ord: any) => (
                        <TableRow key={ord.id} className="text-xs">
                          <TableCell className="font-bold">{ord.buyer}</TableCell>
                          <TableCell className="font-medium text-sky-600 dark:text-sky-400">{ord.style}</TableCell>
                          <TableCell className="font-mono text-[11px]">{ord.poNo || "N/A"}</TableCell>
                          <TableCell className="max-w-[120px] truncate">{ord.color || "N/A"}</TableCell>
                          <TableCell className="text-right font-mono">{ord.orderQty.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-mono">{ord.planQty.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-mono font-bold text-emerald-600">{ord.actualQty.toLocaleString()}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-[9px] py-0">{ord.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Daily Breakdown */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                Daily Output & Efficiency (October 2026)
              </h4>
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-x-auto max-h-56">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 text-xs">
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Target (Pcs)</TableHead>
                      <TableHead className="text-right">Actual Output</TableHead>
                      <TableHead className="text-right">Gap Variance</TableHead>
                      <TableHead className="text-right">Efficiency %</TableHead>
                      <TableHead className="text-right">Achievement %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lineDetails.trend.map((d: any) => (
                      <TableRow key={d.date} className="text-xs">
                        <TableCell className="font-medium">{d.date}</TableCell>
                        <TableCell className="text-right font-mono">{d.target.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-mono font-bold text-emerald-600">{d.actual.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-mono text-[11px]">
                          <span className={d.gap > 0 ? "text-rose-600" : "text-emerald-600"}>
                            {d.gap > 0 ? `-${d.gap.toLocaleString()}` : `+${Math.abs(d.gap).toLocaleString()}`}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-indigo-600">{d.efficiency}%</TableCell>
                        <TableCell className="text-right font-mono">{d.achievementRate}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        ) : null}

        <DialogFooter className="border-t pt-3">
          <Button size="sm" onClick={onClose} className="text-xs">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
