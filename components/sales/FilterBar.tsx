"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { buildSalesQuery, type Period, type SalesFilters } from "@/components/sales/types";

type SubCategory = { id: string; name: string };
type Category = { id: string; name: string; subCategories: SubCategory[] };

const periods: { value: Period; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "15days", label: "Last 15 Days" },
  { value: "month", label: "This Month" },
  { value: "custom", label: "Custom" },
];

type FilterBarProps = {
  filters: SalesFilters;
  onFiltersChange: (partial: Partial<SalesFilters>) => void;
};

export function FilterBar({ filters, onFiltersChange }: FilterBarProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchDraft, setSearchDraft] = useState(filters.search ?? "");
  const [customStart, setCustomStart] = useState(filters.startDate ?? "");
  const [customEnd, setCustomEnd] = useState(filters.endDate ?? "");

  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setCategories(json.data);
      });
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => {
      if (searchDraft !== (filters.search ?? "")) {
        onFiltersChange({ search: searchDraft || undefined });
      }
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchDraft]);

  const subCategories = useMemo(
    () => categories.find((c) => c.id === filters.categoryId)?.subCategories ?? [],
    [categories, filters.categoryId]
  );

  const handleExport = () => {
    const query = buildSalesQuery(filters);
    window.open(`/api/sales/export?${query}`, "_blank");
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border p-0.5">
          {periods.map((period) => (
            <button
              key={period.value}
              type="button"
              onClick={() => onFiltersChange({ period: period.value, page: 1 })}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                filters.period === period.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {period.label}
            </button>
          ))}
        </div>

        {filters.period === "custom" && (
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="h-8 w-36"
            />
            <span className="text-sm text-muted-foreground">to</span>
            <Input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="h-8 w-36"
            />
            <Button
              type="button"
              size="sm"
              disabled={!customStart || !customEnd}
              onClick={() => onFiltersChange({ startDate: customStart, endDate: customEnd, page: 1 })}
            >
              Apply
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={filters.categoryId ?? "all"}
          onValueChange={(value) =>
            onFiltersChange({
              categoryId: !value || value === "all" ? undefined : value,
              subCategoryId: undefined,
              page: 1,
            })
          }
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {filters.categoryId && (
          <Select
            value={filters.subCategoryId ?? "all"}
            onValueChange={(value) =>
              onFiltersChange({ subCategoryId: !value || value === "all" ? undefined : value, page: 1 })
            }
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Sub-categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sub-categories</SelectItem>
              {subCategories.map((sub) => (
                <SelectItem key={sub.id} value={sub.id}>
                  {sub.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select
          value={filters.status ?? "all"}
          onValueChange={(value) =>
            onFiltersChange({
              status: !value || value === "all" ? undefined : (value as "COMPLETED" | "REFUNDED"),
              page: 1,
            })
          }
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="REFUNDED">Refunded</SelectItem>
          </SelectContent>
        </Select>

        <div className="relative ml-auto min-w-64 flex-1 sm:flex-none">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder="Search by Bill ID, product or amount..."
            className="h-8 pl-8"
          />
        </div>

        <Button type="button" variant="outline" onClick={handleExport}>
          <Download />
          Export CSV
        </Button>
      </div>
    </div>
  );
}
