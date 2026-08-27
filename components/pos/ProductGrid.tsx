"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Package } from "lucide-react";

import { cn, formatPKR } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useCartStore, type SearchResult } from "@/store/cartStore";

function stockStatus(quantity: number, lowStockThreshold: number) {
  if (quantity === 0) return { label: "Out of Stock", className: "bg-destructive/10 text-destructive" };
  if (quantity <= lowStockThreshold) {
    return { label: "Low Stock", className: "bg-amber-500/15 text-amber-600 dark:text-amber-400" };
  }
  return { label: "In Stock", className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" };
}

export function ProductGrid({ refreshKey = 0 }: { refreshKey?: number }) {
  const [products, setProducts] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const addItem = useCartStore((state) => state.addItem);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/products/search?limit=100")
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        if (json.success) setProducts(json.data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const handleAdd = (product: SearchResult) => {
    if (product.quantity === 0) return;
    addItem(product);
    toast.success(`${product.name} added to cart`);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-lg border bg-muted/40" />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-muted-foreground">
        <Package className="size-8" />
        <p className="text-sm">No products available</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
      {products.map((product) => {
        const status = stockStatus(product.quantity, product.lowStockThreshold);
        const outOfStock = product.quantity === 0;

        return (
          <div
            key={product.id}
            onClick={() => handleAdd(product)}
            className={cn(
              "flex flex-col justify-between gap-2 rounded-lg border p-3 text-left transition-colors",
              outOfStock ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:border-primary/50 hover:bg-muted/40"
            )}
          >
            <div>
              <p className="line-clamp-2 text-sm font-semibold">{product.name}</p>
              <p className="text-xs text-muted-foreground">{product.category.name}</p>
              <span
                className={cn(
                  "mt-1 inline-block rounded-full px-1.5 py-0.5 text-[0.65rem] font-medium",
                  status.className
                )}
              >
                {status.label}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold">{formatPKR(product.sellingPrice)}</span>
              <Button
                size="sm"
                disabled={outOfStock}
                onClick={(e) => {
                  e.stopPropagation();
                  handleAdd(product);
                }}
              >
                Add
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
