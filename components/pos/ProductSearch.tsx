"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";

import { cn, formatPKR } from "@/lib/utils";
import { useCartStore, type SearchResult } from "@/store/cartStore";

export type ProductSearchHandle = {
  focus: () => void;
};

function stockStatus(quantity: number, lowStockThreshold: number) {
  if (quantity === 0) return { label: "Out of Stock", className: "bg-destructive/10 text-destructive" };
  if (quantity <= lowStockThreshold) return { label: "Low Stock", className: "bg-amber-500/15 text-amber-600 dark:text-amber-400" };
  return { label: "In Stock", className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" };
}

export const ProductSearch = forwardRef<ProductSearchHandle>(function ProductSearch(_props, ref) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlighted, setHighlighted] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestId = useRef(0);

  const addItem = useCartStore((state) => state.addItem);

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
  }));

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const term = query.trim();
    if (!term) {
      setResults([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const thisRequest = ++requestId.current;
      setLoading(true);
      try {
        const res = await fetch(`/api/products/search?q=${encodeURIComponent(term)}`);
        const json = await res.json();
        if (thisRequest !== requestId.current) return;
        setResults(json.success ? json.data : []);
        setOpen(true);
        setHighlighted(0);
      } finally {
        if (thisRequest === requestId.current) setLoading(false);
      }
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectProduct = (product: SearchResult) => {
    if (product.quantity === 0) return;
    addItem(product);
    setQuery("");
    setResults([]);
    setOpen(false);
    inputRef.current?.focus();
    toast.success(`${product.name} added to cart`);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || results.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlighted((prev) => Math.min(prev + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlighted((prev) => Math.max(prev - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const product = results[highlighted];
      if (product) selectProduct(product);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search by product name, SKU, or brand..."
          className="h-12 w-full rounded-lg border border-input bg-transparent pr-3 pl-10 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>

      {open && (
        <div className="absolute z-40 mt-1.5 max-h-96 w-full overflow-y-auto rounded-lg border bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10">
          {loading && results.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">Searching...</div>
          )}

          {!loading && results.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No products found for &quot;{query}&quot;
            </div>
          )}

          {results.map((product, index) => {
            const status = stockStatus(product.quantity, product.lowStockThreshold);
            const outOfStock = product.quantity === 0;

            return (
              <button
                key={product.id}
                type="button"
                disabled={outOfStock}
                onMouseEnter={() => setHighlighted(index)}
                onClick={() => selectProduct(product)}
                className={cn(
                  "flex w-full items-center justify-between gap-3 border-b px-4 py-2.5 text-left last:border-b-0",
                  outOfStock
                    ? "cursor-not-allowed opacity-50"
                    : "cursor-pointer",
                  !outOfStock && index === highlighted && "bg-muted"
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold">{product.name}</span>
                    <span className={cn("shrink-0 rounded-full px-1.5 py-0.5 text-[0.65rem] font-medium", status.className)}>
                      {status.label}
                    </span>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {product.category.name}
                    {product.subCategory ? ` · ${product.subCategory.name}` : ""}
                  </p>
                </div>
                <span className="shrink-0 font-bold">{formatPKR(product.sellingPrice)}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
});
