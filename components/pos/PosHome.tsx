"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { useCartStore, type CartItem, type SearchResult } from "@/store/cartStore";
import { ProductSearch, type ProductSearchHandle } from "@/components/pos/ProductSearch";
import { ProductGrid } from "@/components/pos/ProductGrid";
import { CartTable } from "@/components/pos/CartTable";
import { CheckoutPanel, type CheckoutPanelHandle } from "@/components/pos/CheckoutPanel";
import { Button } from "@/components/ui/button";

const HELD_BILL_KEY = "pos_held_bill";

export function PosHome({ shopName }: { shopName: string }) {
  const items = useCartStore((state) => state.items);
  const clearCart = useCartStore((state) => state.clearCart);
  const loadItems = useCartStore((state) => state.loadItems);

  const searchRef = useRef<ProductSearchHandle>(null);
  const checkoutRef = useRef<CheckoutPanelHandle>(null);

  const [hasHeldBill, setHasHeldBill] = useState(false);
  const [gridRefreshKey, setGridRefreshKey] = useState(0);

  useEffect(() => {
    setHasHeldBill(!!localStorage.getItem(HELD_BILL_KEY));
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "F2") {
        event.preventDefault();
        searchRef.current?.focus();
      } else if (event.key === "F5") {
        event.preventDefault();
        checkoutRef.current?.triggerCompleteSale();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleHoldBill = () => {
    if (items.length === 0) return;
    localStorage.setItem(HELD_BILL_KEY, JSON.stringify(items));
    clearCart();
    setHasHeldBill(true);
    toast.info("Bill held — tap Resume to continue");
  };

  const handleResume = async () => {
    const raw = localStorage.getItem(HELD_BILL_KEY);
    if (!raw) {
      setHasHeldBill(false);
      return;
    }

    let heldItems: CartItem[] = [];
    try {
      heldItems = JSON.parse(raw);
    } catch {
      localStorage.removeItem(HELD_BILL_KEY);
      setHasHeldBill(false);
      return;
    }

    const restored: CartItem[] = [...items];
    let skipped = 0;

    for (const held of heldItems) {
      try {
        const res = await fetch(`/api/products/search?q=${encodeURIComponent(held.sku)}`);
        const json = await res.json();
        const live: SearchResult | undefined = json.success
          ? json.data.find((p: SearchResult) => p.sku === held.sku)
          : undefined;

        if (!live || live.quantity === 0) {
          skipped += 1;
          continue;
        }

        const quantity = Math.min(held.quantity, live.quantity);
        const existing = restored.find((item) => item.productId === held.productId);
        if (existing) {
          existing.quantity = Math.min(existing.quantity + quantity, live.quantity);
          existing.subtotal = Math.round(existing.unitPrice * existing.quantity * 100) / 100;
        } else {
          restored.push({
            ...held,
            quantity,
            maxQuantity: live.quantity,
            subtotal: Math.round(held.unitPrice * quantity * 100) / 100,
          });
        }
      } catch {
        skipped += 1;
      }
    }

    loadItems(restored);
    localStorage.removeItem(HELD_BILL_KEY);
    setHasHeldBill(false);

    if (skipped > 0) {
      toast.warning(`${skipped} item(s) from the held bill are no longer available and were skipped`);
    } else {
      toast.success("Held bill resumed");
    }
  };

  return (
    <div className="flex h-full flex-col gap-4">
      {hasHeldBill && (
        <div className="flex items-center justify-between rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm text-amber-700 dark:text-amber-400">
          <span>You have a held bill</span>
          <Button size="sm" variant="outline" onClick={handleResume}>
            Resume
          </Button>
        </div>
      )}

      <div className="grid flex-1 grid-cols-1 gap-4 overflow-hidden lg:grid-cols-[1fr_320px]">
        <div className="flex min-h-0 flex-col gap-4">
          <ProductSearch ref={searchRef} />

          <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto rounded-lg border p-3">
            <p className="text-xs font-medium text-muted-foreground">All Products</p>
            <ProductGrid refreshKey={gridRefreshKey} />
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            <CartTable />
          </div>
        </div>

        <CheckoutPanel
          ref={checkoutRef}
          shopName={shopName}
          onHoldBill={handleHoldBill}
          onSaleComplete={() => {
            searchRef.current?.focus();
            setGridRefreshKey((key) => key + 1);
          }}
        />
      </div>
    </div>
  );
}
