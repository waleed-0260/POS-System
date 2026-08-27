"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { InventorySummaryCards } from "@/components/inventory/InventorySummaryCards";
import { InventoryFilterBar } from "@/components/inventory/InventoryFilterBar";
import { InventoryTable, type InventoryTableHandle } from "@/components/inventory/InventoryTable";
import { ProductDetailSheet } from "@/components/inventory/ProductDetailSheet";
import { RestockModal, type RestockTarget } from "@/components/inventory/RestockModal";
import type { InventoryFilters, StockStatus } from "@/components/inventory/types";

function parseFilters(params: URLSearchParams): InventoryFilters {
  const stockStatus = params.get("stockStatus");
  const sortBy = params.get("sortBy");

  return {
    search: params.get("search") ?? undefined,
    categoryId: params.get("categoryId") ?? undefined,
    subCategoryId: params.get("subCategoryId") ?? undefined,
    stockStatus:
      stockStatus === "in_stock" || stockStatus === "low_stock" || stockStatus === "out_of_stock"
        ? stockStatus
        : undefined,
    sortBy:
      sortBy === "name_desc" ||
      sortBy === "price_asc" ||
      sortBy === "price_desc" ||
      sortBy === "qty_asc" ||
      sortBy === "qty_desc" ||
      sortBy === "updated_desc"
        ? sortBy
        : "name_asc",
    page: Math.max(1, Number(params.get("page")) || 1),
    limit: Number(params.get("limit")) || 20,
  };
}

export function InventoryPageClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);

  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [restockTarget, setRestockTarget] = useState<RestockTarget | null>(null);
  const [restockOpen, setRestockOpen] = useState(false);

  const tableRef = useRef<InventoryTableHandle>(null);

  const setFilters = useCallback(
    (partial: Partial<InventoryFilters>) => {
      const merged: InventoryFilters = { ...filters, ...partial };
      const params = new URLSearchParams();
      if (merged.search) params.set("search", merged.search);
      if (merged.categoryId) params.set("categoryId", merged.categoryId);
      if (merged.subCategoryId) params.set("subCategoryId", merged.subCategoryId);
      if (merged.stockStatus) params.set("stockStatus", merged.stockStatus);
      params.set("sortBy", merged.sortBy);
      params.set("page", String(merged.page));
      params.set("limit", String(merged.limit));
      router.push(`${pathname}?${params.toString()}`);
    },
    [filters, pathname, router]
  );

  const clearFilters = useCallback(() => {
    router.push(pathname);
  }, [pathname, router]);

  const handleStockStatusClick = useCallback(
    (status: StockStatus) => {
      setFilters({ stockStatus: status, page: 1 });
    },
    [setFilters]
  );

  const openRestock = useCallback((product: RestockTarget) => {
    setRestockTarget(product);
    setRestockOpen(true);
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <InventorySummaryCards filters={filters} onStockStatusClick={handleStockStatusClick} />
      <InventoryFilterBar filters={filters} onFiltersChange={setFilters} />
      <InventoryTable
        ref={tableRef}
        filters={filters}
        onFiltersChange={setFilters}
        onClearFilters={clearFilters}
        onRowClick={setSelectedProductId}
        onRestock={openRestock}
      />

      <ProductDetailSheet
        productId={selectedProductId}
        onOpenChange={(open) => !open && setSelectedProductId(null)}
        onRestock={openRestock}
      />

      <RestockModal
        product={restockTarget}
        open={restockOpen}
        onOpenChange={setRestockOpen}
        onSuccess={(result) => {
          tableRef.current?.patchProductQuantity(result.productId, result.newQuantity);
        }}
      />
    </div>
  );
}
