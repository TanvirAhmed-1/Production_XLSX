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
  Download,
  ListOrdered,
  ChevronLeft,
  ChevronRight,
  RefreshCw
} from "lucide-react";

interface OrderRow {
  id: string;
  orderCode: string;
  buyer: string;
  unit: string;
  line: string;
  style: string;
  article?: string;
  poNo?: string;
  color?: string;
  season?: string;
  orderQty: number;
  planQty: number;
  actualQty: number;
  remainingQty: number;
  smv: number;
  achievementRate: number;
  status: string;
}

interface OrdersTableProps {
  onExport?: () => void;
}

export function OrdersTable({ onExport }: OrdersTableProps) {
  const [orders, setOrders] = React.useState<OrderRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [totalPages, setTotalPages] = React.useState(1);
  const [totalCount, setTotalCount] = React.useState(0);
  const [search, setSearch] = React.useState("");
  const [selectedStatus, setSelectedStatus] = React.useState("ALL");

  const fetchOrders = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        ...(search ? { search } : {}),
        ...(selectedStatus !== "ALL" ? { orderStatus: selectedStatus } : {})
      });
      const res = await fetch(`/api/analytics/orders?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.data || []);
        setTotalPages(data.totalPages || 1);
        setTotalCount(data.total || 0);
      }
    } catch (err) {
      console.error("Failed to load orders:", err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, selectedStatus]);

  React.useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return (
    <Card className="shadow-sm border-slate-200/90 dark:border-slate-800">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <ListOrdered className="h-4 w-4 text-sky-600 dark:text-sky-400" />
              All Garments Orders & Styles
            </CardTitle>
            <CardDescription className="text-xs">
              Detailed tracking of order quantities, styles, PO numbers, colors, and remaining balances
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
              <span>Export Orders</span>
            </Button>
          </div>
        </div>

        {/* Search & Filter bar */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2.5 pt-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-48 sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Search style, PO, color, order..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="h-8 pl-8 text-xs"
              />
            </div>

            <SearchableSelect
              label="Status:"
              placeholder="All Statuses"
              searchPlaceholder="Search status..."
              allOptionLabel="All Statuses"
              allOptionValue="ALL"
              value={selectedStatus}
              options={[
                { label: "On Track", value: "ON_TRACK" },
                { label: "In Progress", value: "IN_PROGRESS" },
                { label: "Delayed", value: "DELAYED" },
                { label: "Completed", value: "COMPLETED" }
              ]}
              onChange={(val) => {
                setSelectedStatus(val);
                setPage(1);
              }}
              dropdownWidth="w-52"
            />
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Total Orders: <span className="font-bold text-slate-900 dark:text-slate-100">{totalCount.toLocaleString()}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80 dark:bg-slate-900/80">
                <TableHead className="font-semibold">Buyer</TableHead>
                <TableHead className="font-semibold">Style Ref</TableHead>
                <TableHead className="font-semibold">PO NO</TableHead>
                <TableHead className="font-semibold">Color</TableHead>
                <TableHead className="font-semibold">Unit / Line</TableHead>
                <TableHead className="font-semibold">Season</TableHead>
                <TableHead className="text-right font-semibold">Order Qty</TableHead>
                <TableHead className="text-right font-semibold">Planned Qty</TableHead>
                <TableHead className="text-right font-semibold">Actual Produced</TableHead>
                <TableHead className="text-right font-semibold">Remaining</TableHead>
                <TableHead className="text-right font-semibold">SMV</TableHead>
                <TableHead className="text-center font-semibold">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-10 text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin text-sky-500" />
                      <span>Loading orders data...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-10 text-slate-400">
                    No orders match the current search criteria.
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((ord) => {
                  let badgeVariant: any = "secondary";
                  if (ord.status === "COMPLETED") badgeVariant = "success";
                  else if (ord.status === "ON_TRACK") badgeVariant = "info";
                  else if (ord.status === "DELAYED") badgeVariant = "destructive";
                  else badgeVariant = "warning";

                  return (
                    <TableRow key={ord.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                      <TableCell className="font-bold text-slate-900 dark:text-slate-100">
                        {ord.buyer}
                      </TableCell>
                      <TableCell className="font-medium text-xs text-sky-700 dark:text-sky-300">
                        {ord.style}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-600 dark:text-slate-400">
                        {ord.poNo || "N/A"}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 dark:text-slate-400 max-w-[130px] truncate" title={ord.color}>
                        {ord.color || "N/A"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[10px] py-0 font-semibold">{ord.unit}</Badge>
                          <span className="text-xs font-semibold">{ord.line}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {ord.season || "Spring-2027"}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        {ord.orderQty.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium text-slate-700 dark:text-slate-300">
                        {ord.planQty.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {ord.actualQty.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-xs text-rose-600 dark:text-rose-400">
                        {ord.remainingQty.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-slate-500">
                        {ord.smv}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={badgeVariant} className="text-[10px] font-semibold">
                          {ord.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 dark:border-slate-800 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              aria-label="Rows per page"
              className="rounded border border-slate-200 bg-white px-2 py-1 text-xs focus:outline-none dark:border-slate-850 dark:bg-slate-900"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <div className="flex items-center gap-2 font-medium">
            <span>Page {page} of {totalPages}</span>
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
