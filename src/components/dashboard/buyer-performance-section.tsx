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
import { Briefcase, ArrowRight, TrendingUp, Download, Eye } from "lucide-react";

interface BuyerData {
  buyerId: string;
  buyerName: string;
  target: number;
  actual: number;
  gap: number;
  sah: number;
  efficiency: number;
  achievementRate: number;
}

interface BuyerPerformanceSectionProps {
  buyers: BuyerData[];
  onSelectBuyer?: (buyerName: string) => void;
  onExport?: () => void;
}

export function BuyerPerformanceSection({ buyers, onSelectBuyer, onExport }: BuyerPerformanceSectionProps) {
  return (
    <Card className="shadow-sm border-slate-200/90 dark:border-slate-800">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              Buyer-wise Production & Efficiency Report
            </CardTitle>
            <CardDescription className="text-xs">
              Performance breakdown and volume distribution across all global buyers and brands
            </CardDescription>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            className="h-8 gap-1 text-xs border-slate-200 dark:border-slate-700"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Buyers</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80 dark:bg-slate-900/80">
                <TableHead className="font-semibold">Buyer / Brand</TableHead>
                <TableHead className="text-right font-semibold">Planned Target (Pcs)</TableHead>
                <TableHead className="text-right font-semibold">Actual Output (Pcs)</TableHead>
                <TableHead className="text-right font-semibold">Production Gap</TableHead>
                <TableHead className="text-right font-semibold">Generated SAH</TableHead>
                <TableHead className="text-right font-semibold">Efficiency %</TableHead>
                <TableHead className="text-right font-semibold">Achievement %</TableHead>
                <TableHead className="text-center font-semibold">Status</TableHead>
                <TableHead className="text-right font-semibold pr-4">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {buyers.map((buyer) => {
                let badgeVariant: any = "secondary";
                let status = "Normal";
                if (buyer.achievementRate >= 90) {
                  badgeVariant = "success";
                  status = "Excellent";
                } else if (buyer.achievementRate >= 80) {
                  badgeVariant = "info";
                  status = "On Track";
                } else {
                  badgeVariant = "warning";
                  status = "Deficit";
                }

                return (
                  <TableRow
                    key={buyer.buyerId}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <TableCell className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-violet-500" />
                      <span>{buyer.buyerName}</span>
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      {buyer.target.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {buyer.actual.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-semibold">
                      <span className={buyer.gap > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600"}>
                        {buyer.gap > 0 ? `-${buyer.gap.toLocaleString()}` : `+${Math.abs(buyer.gap).toLocaleString()}`}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-slate-600 dark:text-slate-400">
                      {buyer.sah.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
                      {buyer.efficiency}%
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-xs">
                      {buyer.achievementRate}%
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
                        onClick={() => onSelectBuyer?.(buyer.buyerName)}
                        className="h-7 px-2 text-xs font-semibold text-violet-600 hover:text-violet-700 hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-950/50"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        <span>Filter Buyer</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
