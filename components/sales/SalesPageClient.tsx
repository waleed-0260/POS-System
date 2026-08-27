"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { SummaryCards } from "@/components/sales/SummaryCards";
import { FilterBar } from "@/components/sales/FilterBar";
import { SalesTable } from "@/components/sales/SalesTable";
import type { SalesFilters } from "@/components/sales/types";

function parseFilters(params: URLSearchParams): SalesFilters {
  const period = params.get("period");
  const sort = params.get("sort");
  const status = params.get("status");

  return {
    period: period === "week" || period === "15days" || period === "month" || period === "custom" ? period : "today",
    startDate: params.get("startDate") ?? undefined,
    endDate: params.get("endDate") ?? undefined,
    categoryId: params.get("categoryId") ?? undefined,
    subCategoryId: params.get("subCategoryId") ?? undefined,
    status: status === "COMPLETED" || status === "REFUNDED" ? status : undefined,
    search: params.get("search") ?? undefined,
    sort:
      sort === "date_asc" || sort === "amount_asc" || sort === "amount_desc" ? sort : "date_desc",
    page: Math.max(1, Number(params.get("page")) || 1),
    limit: Number(params.get("limit")) || 20,
  };
}

export function SalesPageClient({ shopName, canRefund }: { shopName: string; canRefund: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);

  const setFilters = useCallback(
    (partial: Partial<SalesFilters>) => {
      const merged: SalesFilters = { ...filters, ...partial };
      const params = new URLSearchParams();
      params.set("period", merged.period);
      if (merged.period === "custom") {
        if (merged.startDate) params.set("startDate", merged.startDate);
        if (merged.endDate) params.set("endDate", merged.endDate);
      }
      if (merged.categoryId) params.set("categoryId", merged.categoryId);
      if (merged.subCategoryId) params.set("subCategoryId", merged.subCategoryId);
      if (merged.status) params.set("status", merged.status);
      if (merged.search) params.set("search", merged.search);
      params.set("sort", merged.sort);
      params.set("page", String(merged.page));
      params.set("limit", String(merged.limit));
      router.push(`${pathname}?${params.toString()}`);
    },
    [filters, pathname, router]
  );

  const clearFilters = useCallback(() => {
    router.push(pathname);
  }, [pathname, router]);

  return (
    <div className="flex flex-col gap-4">
      <SummaryCards filters={filters} />
      <FilterBar filters={filters} onFiltersChange={setFilters} />
      <SalesTable
        filters={filters}
        onFiltersChange={setFilters}
        onClearFilters={clearFilters}
        shopName={shopName}
        canRefund={canRefund}
      />
    </div>
  );
}
