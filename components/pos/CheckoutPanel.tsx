"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { cn, formatPKR, formatTime, round2 } from "@/lib/utils";
import { useCartStore } from "@/store/cartStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
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
import { ReceiptModal, type ReceiptSale } from "@/components/pos/ReceiptModal";

export type CheckoutPanelHandle = {
  triggerCompleteSale: () => void;
};

type RecentSale = {
  id: string;
  billId: string;
  netPayable: number;
  createdAt: string;
};

type CheckoutPanelProps = {
  shopName: string;
  onHoldBill: () => void;
  onSaleComplete: () => void;
};

export const CheckoutPanel = forwardRef<CheckoutPanelHandle, CheckoutPanelProps>(
  function CheckoutPanel({ shopName, onHoldBill, onSaleComplete }, ref) {
    const items = useCartStore((state) => state.items);
    const totalItems = useCartStore((state) => state.totalItems);
    const totalQuantity = useCartStore((state) => state.totalQuantity);
    const grandTotal = useCartStore((state) => state.grandTotal);
    const clearCart = useCartStore((state) => state.clearCart);

    const [discountMode, setDiscountMode] = useState<"flat" | "percent">("flat");
    const [discountInput, setDiscountInput] = useState("");
    const [amountReceived, setAmountReceived] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [clearDialogOpen, setClearDialogOpen] = useState(false);
    const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
    const [receiptOpen, setReceiptOpen] = useState(false);
    const [receiptSale, setReceiptSale] = useState<ReceiptSale | null>(null);

    const discountValue = Number(discountInput) || 0;
    const discountPKR = round2(
      discountMode === "flat" ? discountValue : (grandTotal * discountValue) / 100
    );
    const netPayable = Math.max(0, round2(grandTotal - discountPKR));
    const received = Number(amountReceived) || 0;
    const changeReturned = round2(received - netPayable);

    const canSubmit = items.length > 0 && received >= netPayable && !isSubmitting;

    const fetchRecentSales = useCallback(async () => {
      try {
        const res = await fetch("/api/sales/recent");
        const json = await res.json();
        if (json.success) setRecentSales(json.data);
      } catch {
        // best-effort — the strip just stays empty
      }
    }, []);

    useEffect(() => {
      fetchRecentSales();
    }, [fetchRecentSales]);

    const openReceiptFor = (sale: ReceiptSale) => {
      setReceiptSale(sale);
      setReceiptOpen(true);
    };

    const handleRecentSaleClick = async (saleId: string) => {
      try {
        const res = await fetch("/api/sales/recent");
        const json = await res.json();
        if (json.success) {
          const match = json.data.find((s: ReceiptSale) => s.id === saleId);
          if (match) openReceiptFor(match);
        }
      } catch {
        toast.error("Could not load that receipt");
      }
    };

    const handleCompleteSale = useCallback(async () => {
      if (items.length === 0) return;
      if (received < netPayable) return;
      if (isSubmitting) return;

      setIsSubmitting(true);
      try {
        const res = await fetch("/api/sales", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: items.map((item) => ({
              productId: item.productId,
              productName: item.name,
              unitPrice: item.unitPrice,
              quantity: item.quantity,
              subtotal: item.subtotal,
            })),
            totalAmount: grandTotal,
            discount: discountPKR,
            netPayable,
            amountReceived: received,
            changeReturned,
          }),
        });
        const json = await res.json();

        if (!json.success) {
          toast.error(json.error ?? "Failed to complete sale");
          return;
        }

        toast.success(
          `✓ Sale ${json.data.billId} completed · ${formatPKR(netPayable)} · Change: ${formatPKR(changeReturned)}`
        );
        clearCart();
        setDiscountInput("");
        setAmountReceived("");
        openReceiptFor(json.data);
        fetchRecentSales();
        onSaleComplete();
      } catch {
        toast.error("Failed to complete sale");
      } finally {
        setIsSubmitting(false);
      }
    }, [
      items,
      received,
      netPayable,
      isSubmitting,
      grandTotal,
      discountPKR,
      changeReturned,
      clearCart,
      fetchRecentSales,
      onSaleComplete,
    ]);

    useImperativeHandle(ref, () => ({
      triggerCompleteSale: () => {
        if (canSubmit) handleCompleteSale();
      },
    }));

    const changeDisplay = useMemo(() => {
      if (items.length === 0 || !amountReceived) return null;
      if (changeReturned > 0) {
        return { text: formatPKR(changeReturned), className: "font-bold text-emerald-600 dark:text-emerald-400" };
      }
      if (changeReturned === 0) {
        return { text: "Exact amount", className: "text-muted-foreground" };
      }
      return {
        text: `Insufficient — short by ${formatPKR(Math.abs(changeReturned))}`,
        className: "font-bold text-destructive",
      };
    }, [amountReceived, changeReturned, items.length]);

    return (
      <div className="flex h-full flex-col gap-4 rounded-lg border p-4">
        <div className="flex flex-col gap-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Items</span>
            <span className="font-medium">{totalItems}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Quantity</span>
            <span className="font-medium">{totalQuantity}</span>
          </div>

          <Separator className="my-1.5" />

          <div className="flex justify-between text-base">
            <span className="text-muted-foreground">Grand Total</span>
            <span className="font-semibold">{formatPKR(grandTotal)}</span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Discount</span>
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                min={0}
                value={discountInput}
                onChange={(e) => setDiscountInput(e.target.value)}
                placeholder="0"
                className="h-8 w-20 text-right"
              />
              <div className="flex rounded-lg border p-0.5">
                <button
                  type="button"
                  onClick={() => setDiscountMode("flat")}
                  className={cn(
                    "rounded-md px-2 py-1 text-xs font-medium",
                    discountMode === "flat" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  )}
                >
                  PKR
                </button>
                <button
                  type="button"
                  onClick={() => setDiscountMode("percent")}
                  className={cn(
                    "rounded-md px-2 py-1 text-xs font-medium",
                    discountMode === "percent" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  )}
                >
                  %
                </button>
              </div>
            </div>
          </div>
          {discountMode === "percent" && discountValue > 0 && (
            <p className="text-right text-xs text-muted-foreground">≈ {formatPKR(discountPKR)}</p>
          )}

          <Separator className="my-1.5" />

          <div className="flex justify-between text-base">
            <span className="text-muted-foreground">Net Payable</span>
            <span className="font-bold">{formatPKR(netPayable)}</span>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="amountReceived" className="text-sm text-muted-foreground">
            Amount Received
          </label>
          <Input
            id="amountReceived"
            type="number"
            min={0}
            value={amountReceived}
            onChange={(e) => setAmountReceived(e.target.value)}
            placeholder="0"
            className="h-14 text-2xl font-semibold"
          />
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Change to Return</span>
            <span className={changeDisplay?.className}>{changeDisplay?.text ?? formatPKR(0)}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            type="button"
            size="lg"
            disabled={!canSubmit}
            onClick={handleCompleteSale}
            className="w-full bg-emerald-600 text-white hover:bg-emerald-600/90"
          >
            {isSubmitting ? <Loader2 className="animate-spin" /> : null}
            Complete Sale
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" onClick={onHoldBill} disabled={items.length === 0}>
              Hold Bill
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setClearDialogOpen(true)}
              disabled={items.length === 0}
            >
              Clear Cart
            </Button>
          </div>
        </div>

        <Separator />

        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-medium text-muted-foreground">Last 5 Sales</p>
          {recentSales.length === 0 ? (
            <p className="text-xs text-muted-foreground">No sales yet today</p>
          ) : (
            recentSales.map((sale) => (
              <button
                key={sale.id}
                type="button"
                onClick={() => handleRecentSaleClick(sale.id)}
                className="flex items-center justify-between rounded-md px-2 py-1.5 text-xs hover:bg-muted"
              >
                <span className="font-medium">{sale.billId}</span>
                <span className="text-muted-foreground">{formatTime(sale.createdAt)}</span>
                <span className="font-semibold">{formatPKR(sale.netPayable)}</span>
              </button>
            ))
          )}
        </div>

        <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear the cart?</AlertDialogTitle>
              <AlertDialogDescription>
                This removes all {totalItems} item(s) from the current sale. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-white hover:bg-destructive/90"
                onClick={() => {
                  clearCart();
                  setClearDialogOpen(false);
                }}
              >
                Clear Cart
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <ReceiptModal
          open={receiptOpen}
          onOpenChange={setReceiptOpen}
          sale={receiptSale}
          shopName={shopName}
        />
      </div>
    );
  }
);
