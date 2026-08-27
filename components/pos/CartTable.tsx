"use client";

import { useState } from "react";
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { cn, formatPKR } from "@/lib/utils";
import { useCartStore, type CartItem } from "@/store/cartStore";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function CartRow({ item, index }: { item: CartItem; index: number }) {
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const updatePrice = useCartStore((state) => state.updatePrice);
  const removeItem = useCartStore((state) => state.removeItem);

  const [editingPrice, setEditingPrice] = useState(false);
  const [priceDraft, setPriceDraft] = useState(String(item.unitPrice));

  const commitPrice = () => {
    const parsed = Number(priceDraft);
    updatePrice(item.productId, Number.isFinite(parsed) ? parsed : item.unitPrice);
    setEditingPrice(false);
  };

  const handleQtyChange = (raw: number) => {
    if (raw > item.maxQuantity) {
      toast.warning(`Only ${item.maxQuantity} units available`);
    }
    updateQuantity(item.productId, raw);
  };

  return (
    <TableRow className="animate-in fade-in slide-in-from-top-2 duration-200">
      <TableCell className="text-muted-foreground">{index + 1}</TableCell>

      <TableCell>
        <p className="font-semibold">{item.name}</p>
        <p className="text-xs text-muted-foreground">{item.sku}</p>
      </TableCell>

      <TableCell>
        {editingPrice ? (
          <Input
            autoFocus
            type="number"
            min={0}
            value={priceDraft}
            onChange={(e) => setPriceDraft(e.target.value)}
            onBlur={commitPrice}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitPrice();
              if (e.key === "Escape") {
                setPriceDraft(String(item.unitPrice));
                setEditingPrice(false);
              }
            }}
            className="h-8 w-24"
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setPriceDraft(String(item.unitPrice));
              setEditingPrice(true);
            }}
            className="text-left"
          >
            <span className="font-medium">{formatPKR(item.unitPrice)}</span>
            {item.unitPrice !== item.originalPrice && (
              <span className="block text-xs text-muted-foreground line-through">
                {formatPKR(item.originalPrice)}
              </span>
            )}
          </button>
        )}
      </TableCell>

      <TableCell>
        <div className="flex items-center justify-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => handleQtyChange(item.quantity - 1)}
            disabled={item.quantity <= 1}
          >
            <Minus />
          </Button>
          <Input
            type="number"
            value={item.quantity}
            onChange={(e) => handleQtyChange(Number(e.target.value) || 1)}
            className="h-8 w-14 text-center"
          />
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => handleQtyChange(item.quantity + 1)}
            disabled={item.quantity >= item.maxQuantity}
          >
            <Plus />
          </Button>
        </div>
      </TableCell>

      <TableCell className="text-right font-semibold">{formatPKR(item.subtotal)}</TableCell>

      <TableCell>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => removeItem(item.productId)}
        >
          <Trash2 />
        </Button>
      </TableCell>
    </TableRow>
  );
}

export function CartTable() {
  const items = useCartStore((state) => state.items);

  if (items.length === 0) {
    return (
      <div className={cn("flex flex-1 flex-col items-center justify-center gap-2 text-center text-muted-foreground")}>
        <ShoppingCart className="size-10" />
        <p className="text-sm">Search for a product above to start a sale</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">#</TableHead>
            <TableHead>Product</TableHead>
            <TableHead>Unit Price (PKR)</TableHead>
            <TableHead className="text-center">Qty</TableHead>
            <TableHead className="text-right">Subtotal (PKR)</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item, index) => (
            <CartRow key={item.productId} item={item} index={index} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
