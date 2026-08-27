"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { formatDistanceToNow } from "date-fns";
import { ArrowDown, ArrowUp, ArrowUpDown, Ban, Package, Pencil, PlusCircle } from "lucide-react";
import { toast } from "sonner";

import { cn, formatPKR } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  buildInventoryQuery,
  stockStatusOf,
  type InventoryFilters,
  type InventoryProduct,
} from "@/components/inventory/types";
import type { RestockTarget } from "@/components/inventory/RestockModal";

function getPageNumbers(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "ellipsis")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push("ellipsis");
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total - 1) pages.push("ellipsis");
  pages.push(total);
  return pages;
}

function SortIcon({ active, ascending }: { active: boolean; ascending: boolean }) {
  if (!active) return <ArrowUpDown className="size-3.5 text-muted-foreground" />;
  return ascending ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />;
}

const stockBadgeClass: Record<string, string> = {
  in_stock: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  low_stock: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  out_of_stock: "bg-destructive/15 text-destructive",
};

const stockLabel: Record<string, string> = {
  in_stock: "In Stock",
  low_stock: "Low Stock",
  out_of_stock: "Out of Stock",
};

const rowTintClass: Record<string, string> = {
  in_stock: "",
  low_stock: "bg-amber-50 dark:bg-amber-950/20",
  out_of_stock: "bg-red-50 dark:bg-red-950/20",
};

export type InventoryTableHandle = {
  patchProductQuantity: (productId: string, newQuantity: number) => void;
};

type InventoryTableProps = {
  filters: InventoryFilters;
  onFiltersChange: (partial: Partial<InventoryFilters>) => void;
  onClearFilters: () => void;
  onRowClick: (productId: string) => void;
  onRestock: (product: RestockTarget) => void;
};

export const InventoryTable = forwardRef<InventoryTableHandle, InventoryTableProps>(function InventoryTable(
  { filters, onFiltersChange, onClearFilters, onRowClick, onRestock },
  ref
) {
  const { data: session } = useSession();
  const isOwner = session?.user?.role === "OWNER";

  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
  const [deactivateTarget, setDeactivateTarget] = useState<InventoryProduct | null>(null);
  const [deactivating, setDeactivating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const query = buildInventoryQuery(filters);
    fetch(`/api/inventory?${query}`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        if (json.success) {
          setProducts(json.data.products);
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

  useImperativeHandle(ref, () => ({
    patchProductQuantity: (productId, newQuantity) => {
      setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, quantity: newQuantity } : p)));
    },
  }));

  const toggleSort = (kind: "name" | "price" | "qty") => {
    const isActive = filters.sortBy.startsWith(kind);
    const ascending = filters.sortBy.endsWith("asc");
    const nextAscending = isActive ? !ascending : kind !== "name" ? false : true;
    onFiltersChange({ sortBy: `${kind}_${nextAscending ? "asc" : "desc"}` as InventoryFilters["sortBy"] });
  };

  const handleDeactivate = async () => {
    if (!deactivateTarget) return;
    setDeactivating(true);
    try {
      const res = await fetch(`/api/products/${deactivateTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: false }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error ?? "Failed to deactivate product");
        return;
      }
      toast.success(`${deactivateTarget.name} deactivated`);
      const id = deactivateTarget.id;
      setDeactivateTarget(null);
      setRemovingIds((prev) => new Set(prev).add(id));
      setTimeout(() => {
        setProducts((prev) => prev.filter((p) => p.id !== id));
        setRemovingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }, 250);
    } catch {
      toast.error("Failed to deactivate product");
    } finally {
      setDeactivating(false);
    }
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
              <th className="p-2 font-medium">SKU</th>
              <th className="p-2 font-medium">
                <button type="button" onClick={() => toggleSort("name")} className="flex items-center gap-1">
                  Product Name
                  <SortIcon active={filters.sortBy.startsWith("name")} ascending={filters.sortBy.endsWith("asc")} />
                </button>
              </th>
              <th className="p-2 font-medium">Category</th>
              <th className="p-2 font-medium">Sub-Category</th>
              <th className="p-2 text-right font-medium">
                <button
                  type="button"
                  onClick={() => toggleSort("price")}
                  className="ml-auto flex items-center gap-1"
                >
                  Selling Price
                  <SortIcon active={filters.sortBy.startsWith("price")} ascending={filters.sortBy.endsWith("asc")} />
                </button>
              </th>
              {isOwner && (
                <>
                  <th className="p-2 text-right font-medium">
                    <button
                      type="button"
                      onClick={() => toggleSort("price")}
                      className="ml-auto flex items-center gap-1"
                    >
                      Buying Price
                      <SortIcon
                        active={filters.sortBy.startsWith("price")}
                        ascending={filters.sortBy.endsWith("asc")}
                      />
                    </button>
                  </th>
                  <th className="p-2 text-right font-medium">Margin</th>
                </>
              )}
              <th className="p-2 text-right font-medium">
                <button type="button" onClick={() => toggleSort("qty")} className="ml-auto flex items-center gap-1">
                  Quantity
                  <SortIcon active={filters.sortBy.startsWith("qty")} ascending={filters.sortBy.endsWith("asc")} />
                </button>
              </th>
              <th className="p-2 font-medium">Status</th>
              <th className="p-2 font-medium">Last Updated</th>
              <th className="p-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b">
                  <td className="p-2" colSpan={isOwner ? 10 : 8}>
                    <Skeleton className="h-6 w-full" />
                  </td>
                </tr>
              ))}

            {!loading && products.length === 0 && (
              <tr>
                <td colSpan={isOwner ? 10 : 8} className="p-10 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Package className="size-8" />
                    <p className="text-sm">No products found</p>
                    <Button type="button" variant="outline" size="sm" onClick={onClearFilters}>
                      Clear Filters
                    </Button>
                  </div>
                </td>
              </tr>
            )}

            {!loading &&
              products.map((product) => {
                const status = stockStatusOf(product.quantity, product.lowStockThreshold);
                const margin =
                  product.sellingPrice > 0
                    ? (((product.sellingPrice - product.buyingPrice) / product.sellingPrice) * 100).toFixed(1)
                    : "0.0";

                return (
                  <tr
                    key={product.id}
                    onClick={() => onRowClick(product.id)}
                    className={cn(
                      "cursor-pointer border-b transition-all hover:brightness-95",
                      rowTintClass[status],
                      removingIds.has(product.id) && "opacity-0"
                    )}
                  >
                    <td className="p-2 font-mono text-xs text-muted-foreground">{product.sku}</td>
                    <td className="p-2">
                      <p className="font-semibold">{product.name}</p>
                      {product.brand && <p className="text-xs text-muted-foreground">{product.brand}</p>}
                    </td>
                    <td className="p-2">{product.category.name}</td>
                    <td className="p-2 text-muted-foreground">{product.subCategory?.name ?? "—"}</td>
                    <td className="p-2 text-right">{formatPKR(product.sellingPrice)}</td>
                    {isOwner && (
                      <>
                        <td className="p-2 text-right">{formatPKR(product.buyingPrice)}</td>
                        <td className="p-2 text-right">{margin}%</td>
                      </>
                    )}
                    <td
                      className={cn(
                        "p-2 text-right font-bold",
                        status === "out_of_stock"
                          ? "text-destructive"
                          : status === "low_stock"
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-emerald-600 dark:text-emerald-400"
                      )}
                    >
                      {product.quantity}
                    </td>
                    <td className="p-2">
                      <Badge className={stockBadgeClass[status]}>{stockLabel[status]}</Badge>
                    </td>
                    <td className="p-2 whitespace-nowrap text-muted-foreground">
                      <Tooltip>
                        <TooltipTrigger render={<span />}>
                          {formatDistanceToNow(new Date(product.updatedAt), { addSuffix: true })}
                        </TooltipTrigger>
                        <TooltipContent>{new Date(product.updatedAt).toLocaleString()}</TooltipContent>
                      </Tooltip>
                    </td>
                    <td className="p-2" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        {isOwner && (
                          <Button variant="ghost" size="icon-sm" render={<Link href={`/products/edit/${product.id}`} />}>
                            <Pencil className="size-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() =>
                            onRestock({
                              id: product.id,
                              name: product.name,
                              quantity: product.quantity,
                              buyingPrice: product.buyingPrice,
                            })
                          }
                        >
                          <PlusCircle className="size-4" />
                        </Button>
                        {isOwner && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => setDeactivateTarget(product)}
                          >
                            <Ban className="size-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {!loading && products.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t p-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>
              Showing {rangeStart}–{rangeEnd} of {total} products
            </span>
            <Select
              value={String(limit)}
              onValueChange={(value) => value && onFiltersChange({ limit: Number(value), page: 1 })}
            >
              <SelectTrigger className="h-7 w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
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
            {getPageNumbers(page, totalPages).map((entry, i) =>
              entry === "ellipsis" ? (
                <span key={`ellipsis-${i}`} className="px-1.5 text-muted-foreground">
                  …
                </span>
              ) : (
                <Button
                  key={entry}
                  type="button"
                  variant={entry === page ? "default" : "outline"}
                  size="sm"
                  className="w-8"
                  onClick={() => onFiltersChange({ page: entry })}
                >
                  {entry}
                </Button>
              )
            )}
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

      <AlertDialog open={!!deactivateTarget} onOpenChange={(open) => !open && setDeactivateTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate {deactivateTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              It will be hidden from POS search and inventory. Stock logs are preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deactivating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deactivating}
              onClick={handleDeactivate}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {deactivating ? "Deactivating..." : "Deactivate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});
