"use client";

import { useState } from "react";
import { Printer, RotateCcw, X } from "lucide-react";

import { formatPKR } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ReceiptModal, type ReceiptSale } from "@/components/pos/ReceiptModal";
import { RefundDialog } from "@/components/sales/RefundDialog";
import type { SaleDetail } from "@/components/sales/types";

function formatFullDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(value)
  );
}

function formatFullTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(new Date(value));
}

type BillDetailProps = {
  detail: SaleDetail | null;
  loading: boolean;
  canRefund: boolean;
  shopName: string;
  onClose: () => void;
  onRefunded: () => void;
};

export function BillDetail({ detail, loading, canRefund, shopName, onClose, onRefunded }: BillDetailProps) {
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);

  if (loading || !detail) {
    return (
      <div className="flex flex-col gap-2 p-4">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const receiptSale: ReceiptSale = {
    id: detail.id,
    billId: detail.billId,
    totalAmount: detail.totalAmount,
    discount: detail.discount,
    netPayable: detail.netPayable,
    amountReceived: detail.amountReceived,
    changeReturned: detail.changeReturned,
    createdAt: detail.createdAt,
    saleItems: detail.saleItems.map((item) => ({
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: item.subtotal,
    })),
  };

  return (
    <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-[1fr_280px]">
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left">
              <th className="p-2 font-medium">Product Name</th>
              <th className="p-2 font-medium">Category</th>
              <th className="p-2 text-right font-medium">Unit Price</th>
              <th className="p-2 text-right font-medium">Qty</th>
              <th className="p-2 text-right font-medium">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {detail.saleItems.map((item) => (
              <tr key={item.id} className="border-b last:border-b-0">
                <td className="p-2 font-medium">{item.productName}</td>
                <td className="p-2 text-muted-foreground">
                  {item.product.category.name}
                  {item.product.subCategory ? ` · ${item.product.subCategory.name}` : ""}
                </td>
                <td className="p-2 text-right">{formatPKR(item.unitPrice)}</td>
                <td className="p-2 text-right">{item.quantity}</td>
                <td className="p-2 text-right font-medium">{formatPKR(item.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border p-3 text-sm">
        <div className="flex flex-col gap-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Grand Total</span>
            <span>{formatPKR(detail.totalAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Discount Applied</span>
            <span>{formatPKR(detail.discount)}</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>Net Payable</span>
            <span>{formatPKR(detail.netPayable)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Amount Received</span>
            <span>{formatPKR(detail.amountReceived)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Change Returned</span>
            <span>{formatPKR(detail.changeReturned)}</span>
          </div>
        </div>

        <div className="border-t pt-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Cashier</span>
            <span>{detail.user?.name ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Date</span>
            <span>{formatFullDate(detail.createdAt)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Time</span>
            <span>{formatFullTime(detail.createdAt)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Bill ID</span>
            <span className="font-mono">{detail.billId}</span>
          </div>
        </div>

        <div className="mt-1 flex flex-col gap-1.5">
          <Button type="button" variant="outline" onClick={() => setReceiptOpen(true)}>
            <Printer />
            Print Receipt
          </Button>
          {canRefund && detail.status === "COMPLETED" && (
            <Button
              type="button"
              variant="outline"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setRefundOpen(true)}
            >
              <RotateCcw />
              Process Refund
            </Button>
          )}
          <Button type="button" variant="ghost" onClick={onClose}>
            <X />
            Close
          </Button>
        </div>
      </div>

      <ReceiptModal
        open={receiptOpen}
        onOpenChange={setReceiptOpen}
        sale={receiptSale}
        shopName={shopName}
      />

      <RefundDialog
        open={refundOpen}
        onOpenChange={setRefundOpen}
        saleId={detail.id}
        billId={detail.billId}
        itemCount={detail.saleItems.length}
        onRefunded={onRefunded}
      />
    </div>
  );
}
