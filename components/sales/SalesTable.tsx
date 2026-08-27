"use client";

import { Fragment, useEffect, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight, Receipt } from "lucide-react";

import { cn, formatPKR } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BillDetail } from "@/components/sales/BillDetail";
import { buildSalesQuery, type SaleDetail, type SaleListItem, type SalesFilters } from "@/components/sales/types";

function formatDateTime(value: string) {
  const date = new Date(value);
  const datePart = new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", year: "numeric" }).format(
    date
  );
  const timePart = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).format(
    date
  );
  return `${datePart}, ${timePart}`;
}

function SortIcon({ active, ascending }: { active: boolean; ascending: boolean }) {
  if (!active) return <ArrowUpDown className="size-3.5 text-muted-foreground" />;
  return ascending ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />;
}

type SalesTableProps = {
  filters: SalesFilters;
  onFiltersChange: (partial: Partial<SalesFilters>) => void;
  onClearFilters: () => void;
  shopName: string;
  canRefund: boolean;
};

export function SalesTable({ filters, onFiltersChange, onClearFilters, shopName, canRefund }: SalesTableProps) {
  const [sales, setSales] = useState<SaleListItem[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailCache, setDetailCache] = useState<Record<string, SaleDetail>>({});
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const query = buildSalesQuery(filters);
    fetch(`/api/sales?${query}`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        if (json.success) {
          setSales(json.data.sales);
          setPagination(json.data.pagination);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [filters]);

  const toggleRow = async (saleId: string) => {
    if (expandedId === saleId) {
      setExpandedId(null);
      return;
    }

    setExpandedId(saleId);

    if (!detailCache[saleId]) {
      setDetailLoading(true);
      try {
        const res = await fetch(`/api/sales/${saleId}`);
        const json = await res.json();
        if (json.success) {
          setDetailCache((prev) => ({ ...prev, [saleId]: json.data }));
        }
      } finally {
        setDetailLoading(false);
      }
    }
  };

  const handleRefunded = (saleId: string) => {
    setSales((prev) => prev.map((s) => (s.id === saleId ? { ...s, status: "REFUNDED" } : s)));
    setDetailCache((prev) =>
      prev[saleId] ? { ...prev, [saleId]: { ...prev[saleId], status: "REFUNDED" } } : prev
    );
  };

  const toggleSort = (kind: "date" | "amount") => {
    const isActive = filters.sort.startsWith(kind);
    const ascending = filters.sort.endsWith("asc");
    const nextAscending = isActive ? !ascending : false;
    onFiltersChange({ sort: `${kind}_${nextAscending ? "asc" : "desc"}` as SalesFilters["sort"], page: 1 });
  };

  const { total, page, limit, totalPages } = pagination;
  const rangeStart = total === 0 ? 0 : (page - 1) * limit + 1;
  const rangeEnd = Math.min(total, page * limit);

  return (
    <div className="flex flex-col gap-3 rounded-lg border">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left">
              <th className="p-2 font-medium">Bill ID</th>
              <th className="p-2 font-medium">
                <button type="button" onClick={() => toggleSort("date")} className="flex items-center gap-1">
                  Date &amp; Time
                  <SortIcon active={filters.sort.startsWith("date")} ascending={filters.sort.endsWith("asc")} />
                </button>
              </th>
              <th className="p-2 text-right font-medium">Items</th>
              <th className="p-2 text-right font-medium">Qty</th>
              <th className="p-2 text-right font-medium">Discount</th>
              <th className="p-2 text-right font-medium">
                <button
                  type="button"
                  onClick={() => toggleSort("amount")}
                  className="ml-auto flex items-center gap-1"
                >
                  Net Payable
                  <SortIcon active={filters.sort.startsWith("amount")} ascending={filters.sort.endsWith("asc")} />
                </button>
              </th>
              <th className="p-2 font-medium">Cashier</th>
              <th className="p-2 font-medium">Status</th>
              <th className="w-10 p-2" />
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b">
                  <td className="p-2" colSpan={9}>
                    <Skeleton className="h-6 w-full" />
                  </td>
                </tr>
              ))}

            {!loading && sales.length === 0 && (
              <tr>
                <td colSpan={9} className="p-10 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Receipt className="size-8" />
                    <p className="text-sm">No sales found for the selected filters</p>
                    <Button type="button" variant="outline" size="sm" onClick={onClearFilters}>
                      Clear Filters
                    </Button>
                  </div>
                </td>
              </tr>
            )}

            {!loading &&
              sales.map((sale) => {
                const expanded = expandedId === sale.id;
                return (
                  <Fragment key={sale.id}>
                    <tr
                      onClick={() => toggleRow(sale.id)}
                      className="cursor-pointer border-b transition-colors hover:bg-muted/50"
                    >
                      <td className="p-2 font-mono font-semibold">{sale.billId}</td>
                      <td className="p-2">{formatDateTime(sale.createdAt)}</td>
                      <td className="p-2 text-right">{sale.itemCount}</td>
                      <td className="p-2 text-right">{sale.totalQuantity}</td>
                      <td className="p-2 text-right">
                        {sale.discount > 0 ? formatPKR(sale.discount) : "—"}
                      </td>
                      <td className="p-2 text-right font-bold">{formatPKR(sale.netPayable)}</td>
                      <td className="p-2">{sale.user?.name ?? "—"}</td>
                      <td className="p-2">
                        <Badge
                          variant={sale.status === "COMPLETED" ? "default" : "destructive"}
                          className={
                            sale.status === "COMPLETED"
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                              : undefined
                          }
                        >
                          {sale.status === "COMPLETED" ? "Completed" : "Refunded"}
                        </Badge>
                      </td>
                      <td className="p-2" onClick={(e) => e.stopPropagation()}>
                        <button type="button" onClick={() => toggleRow(sale.id)} className="flex">
                          <ChevronRight
                            className={cn("size-4 text-muted-foreground transition-transform", expanded && "rotate-90")}
                          />
                        </button>
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td colSpan={9} className="p-0">
                        <div
                          className={cn(
                            "grid transition-[grid-template-rows] duration-300 ease-in-out",
                            expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                          )}
                        >
                          <div className="overflow-hidden">
                            <BillDetail
                              detail={detailCache[sale.id] ?? null}
                              loading={expanded && detailLoading && !detailCache[sale.id]}
                              canRefund={canRefund}
                              shopName={shopName}
                              onClose={() => setExpandedId(null)}
                              onRefunded={() => handleRefunded(sale.id)}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  </Fragment>
                );
              })}
          </tbody>
        </table>
      </div>

      {!loading && sales.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t p-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>
              Showing {rangeStart}–{rangeEnd} of {total} sales
            </span>
            <Select
              value={String(limit)}
              onValueChange={(value) => value && onFiltersChange({ limit: Number(value), page: 1 })}
            >
              <SelectTrigger className="h-7 w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
            <span>rows</span>
          </div>

          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => onFiltersChange({ page: page - 1 })}
            >
              ← Previous
            </Button>
            <span className="px-2 text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => onFiltersChange({ page: page + 1 })}
            >
              Next →
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
