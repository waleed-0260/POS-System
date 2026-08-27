"use client";

import { formatPKR, formatTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type ReceiptSaleItem = {
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

export type ReceiptSale = {
  id: string;
  billId: string;
  totalAmount?: number;
  discount?: number;
  netPayable: number;
  amountReceived?: number;
  changeReturned?: number;
  createdAt: string;
  saleItems?: ReceiptSaleItem[];
};

type ReceiptModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: ReceiptSale | null;
  shopName: string;
};

export function ReceiptModal({ open, onOpenChange, sale, shopName }: ReceiptModalProps) {
  if (!sale) return null;

  const date = new Date(sale.createdAt);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="sr-only">Receipt {sale.billId}</DialogTitle>
        </DialogHeader>

        <div className="receipt-content font-mono text-xs">
          <p className="text-center text-sm font-bold">{shopName}</p>
          <p className="mt-1 text-center">
            {sale.billId} · {date.toLocaleDateString()} {formatTime(date)}
          </p>

          <div className="my-2 border-t border-dashed" />

          <div className="flex justify-between font-semibold">
            <span>Item</span>
            <span>Qty · Price · Subtotal</span>
          </div>
          {sale.saleItems?.map((item, index) => (
            <div key={index} className="mt-1 flex flex-col">
              <span className="truncate">{item.productName}</span>
              <span className="flex justify-end gap-2 text-muted-foreground">
                <span>{item.quantity}</span>
                <span>× {formatPKR(item.unitPrice)}</span>
                <span className="font-medium text-foreground">{formatPKR(item.subtotal)}</span>
              </span>
            </div>
          ))}

          <div className="my-2 border-t border-dashed" />

          <div className="flex flex-col gap-0.5">
            {sale.totalAmount !== undefined && (
              <div className="flex justify-between">
                <span>Total</span>
                <span>{formatPKR(sale.totalAmount)}</span>
              </div>
            )}
            {sale.discount !== undefined && sale.discount > 0 && (
              <div className="flex justify-between">
                <span>Discount</span>
                <span>-{formatPKR(sale.discount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold">
              <span>Net Payable</span>
              <span>{formatPKR(sale.netPayable)}</span>
            </div>
            {sale.amountReceived !== undefined && (
              <div className="flex justify-between">
                <span>Amount Received</span>
                <span>{formatPKR(sale.amountReceived)}</span>
              </div>
            )}
            {sale.changeReturned !== undefined && (
              <div className="flex justify-between">
                <span>Change</span>
                <span>{formatPKR(sale.changeReturned)}</span>
              </div>
            )}
          </div>

          <div className="my-2 border-t border-dashed" />

          <p className="text-center">Thank you for shopping with us!</p>
        </div>

        <DialogFooter className="print:hidden">
          <DialogClose render={<Button variant="outline" />}>Close</DialogClose>
          <Button onClick={() => window.print()}>Print Receipt</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
