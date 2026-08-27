"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Download, Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { buildInventoryQuery, type InventoryFilters } from "@/components/inventory/types";

type SubCategory = { id: string; name: string };
type Category = { id: string; name: string; subCategories: SubCategory[] };

const sortOptions: { value: InventoryFilters["sortBy"]; label: string }[] = [
  { value: "name_asc", label: "Name A–Z" },
  { value: "name_desc", label: "Name Z–A" },
  { value: "price_asc", label: "Price: Low–High" },
  { value: "price_desc", label: "Price: High–Low" },
  { value: "qty_asc", label: "Quantity: Low–High" },
  { value: "qty_desc", label: "Quantity: High–Low" },
  { value: "updated_desc", label: "Last Updated" },
];

type InventoryFilterBarProps = {
  filters: InventoryFilters;
  onFiltersChange: (partial: Partial<InventoryFilters>) => void;
};

export function InventoryFilterBar({ filters, onFiltersChange }: InventoryFilterBarProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchDraft, setSearchDraft] = useState(filters.search ?? "");

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
        onFiltersChange({ search: searchDraft || undefined, page: 1 });
      }
    }, 250);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchDraft]);

  const subCategories = useMemo(
    () => categories.find((c) => c.id === filters.categoryId)?.subCategories ?? [],
    [categories, filters.categoryId]
  );

  const handleExport = () => {
    const query = buildInventoryQuery(filters);
    window.open(`/api/inventory/export?${query}`, "_blank");
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border p-3">
      <div className="relative min-w-64 flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchDraft}
          onChange={(e) => setSearchDraft(e.target.value)}
          placeholder="Search by name, SKU, or brand..."
          className="h-8 pl-8"
        />
      </div>

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
        value={filters.stockStatus ?? "all"}
        onValueChange={(value) =>
          onFiltersChange({
            stockStatus: !value || value === "all" ? undefined : (value as InventoryFilters["stockStatus"]),
            page: 1,
          })
        }
      >
        <SelectTrigger className="w-36">
          <SelectValue placeholder="All Stock" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Stock</SelectItem>
          <SelectItem value="in_stock">In Stock</SelectItem>
          <SelectItem value="low_stock">Low Stock</SelectItem>
          <SelectItem value="out_of_stock">Out of Stock</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.sortBy}
        onValueChange={(value) => value && onFiltersChange({ sortBy: value as InventoryFilters["sortBy"] })}
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          {sortOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="ml-auto flex items-center gap-2">
        <Button type="button" variant="outline" onClick={handleExport}>
          <Download />
          Export CSV
        </Button>
        <Button type="button" render={<Link href="/products/add" />}>
          <Plus />
          Add Product
        </Button>
      </div>
    </div>
  );
}
