"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { formatPKR } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type RestockTarget = {
  id: string;
  name: string;
  quantity: number;
  buyingPrice: number;
};

type RestockModalProps = {
  product: RestockTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (result: { productId: string; newQuantity: number; quantityAdded: number; productName: string }) => void;
};

export function RestockModal({ product, open, onOpenChange, onSuccess }: RestockModalProps) {
  const [quantityToAdd, setQuantityToAdd] = useState("");
  const [newBuyingPrice, setNewBuyingPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setQuantityToAdd("");
      setNewBuyingPrice("");
      setNotes("");
    }
  }, [open, product?.id]);

  if (!product) return null;

  const addQty = Number(quantityToAdd) || 0;
  const canSubmit = addQty >= 1 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/products/${product.id}/restock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantityToAdd: addQty,
          ...(newBuyingPrice ? { newBuyingPrice: Number(newBuyingPrice) } : {}),
          ...(notes ? { notes } : {}),
        }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error ?? "Failed to restock product");
        return;
      }

      toast.success(
        `Restocked ${product.name} — added ${json.data.quantityAdded} units. New stock: ${json.data.newQuantity}`
      );
      onOpenChange(false);
      onSuccess({ ...json.data, productName: product.name });
    } catch {
      toast.error("Failed to restock product");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Restock — {product.name}</DialogTitle>
          <DialogDescription>Add new stock and optionally update the buying price.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Current Stock</span>
            <span className="font-medium">{product.quantity} units</span>
          </div>

          <Separator />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="quantityToAdd">Quantity to Add</Label>
            <Input
              id="quantityToAdd"
              type="number"
              min={1}
              value={quantityToAdd}
              onChange={(e) => setQuantityToAdd(e.target.value)}
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="newBuyingPrice">Updated Buying Price</Label>
            <Input
              id="newBuyingPrice"
              type="number"
              min={0}
              step="0.01"
              value={newBuyingPrice}
              onChange={(e) => setNewBuyingPrice(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              current: {formatPKR(product.buyingPrice)} — leave blank to keep current
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="restockNotes">Notes</Label>
            <Textarea
              id="restockNotes"
              placeholder="e.g. New stock from supplier"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <Separator />

          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">New Stock Will Be</span>
            <span className="font-semibold">
              {product.quantity} + {addQty || 0} = {product.quantity + addQty}
            </span>
          </div>
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
          <Button
            disabled={!canSubmit}
            onClick={handleSubmit}
            className="bg-emerald-600 text-white hover:bg-emerald-600/90"
          >
            {submitting ? "Adding..." : "Add Stock"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
