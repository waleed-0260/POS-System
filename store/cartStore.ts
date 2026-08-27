import { create } from "zustand";
import { round2 } from "@/lib/utils";

export type SearchResult = {
  id: string;
  name: string;
  sku: string;
  sellingPrice: number;
  quantity: number;
  lowStockThreshold: number;
  unit: string;
  category: { name: string };
  subCategory: { name: string } | null;
};

export interface CartItem {
  productId: string;
  name: string;
  sku: string;
  originalPrice: number;
  unitPrice: number;
  quantity: number;
  maxQuantity: number;
  subtotal: number;
}

interface CartStore {
  items: CartItem[];
  totalItems: number;
  totalQuantity: number;
  grandTotal: number;
  addItem: (product: SearchResult) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, qty: number) => void;
  updatePrice: (productId: string, price: number) => void;
  clearCart: () => void;
  loadItems: (items: CartItem[]) => void;
}

function withTotals(items: CartItem[]) {
  return {
    items,
    totalItems: items.length,
    totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
    grandTotal: round2(items.reduce((sum, item) => sum + item.subtotal, 0)),
  };
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  totalItems: 0,
  totalQuantity: 0,
  grandTotal: 0,

  addItem: (product) => {
    const existing = get().items.find((item) => item.productId === product.id);

    if (existing) {
      const nextQty = Math.min(existing.quantity + 1, existing.maxQuantity || existing.quantity);
      const items = get().items.map((item) =>
        item.productId === product.id
          ? { ...item, quantity: nextQty, subtotal: round2(item.unitPrice * nextQty) }
          : item
      );
      set(withTotals(items));
      return;
    }

    const newItem: CartItem = {
      productId: product.id,
      name: product.name,
      sku: product.sku,
      originalPrice: product.sellingPrice,
      unitPrice: product.sellingPrice,
      quantity: 1,
      maxQuantity: product.quantity,
      subtotal: round2(product.sellingPrice),
    };
    set(withTotals([...get().items, newItem]));
  },

  removeItem: (productId) => {
    set(withTotals(get().items.filter((item) => item.productId !== productId)));
  },

  updateQuantity: (productId, qty) => {
    const items = get().items.map((item) => {
      if (item.productId !== productId) return item;
      const clamped = Math.max(1, Math.min(qty, item.maxQuantity));
      return { ...item, quantity: clamped, subtotal: round2(item.unitPrice * clamped) };
    });
    set(withTotals(items));
  },

  updatePrice: (productId, price) => {
    const items = get().items.map((item) => {
      if (item.productId !== productId) return item;
      const safePrice = Math.max(0, price);
      return { ...item, unitPrice: safePrice, subtotal: round2(safePrice * item.quantity) };
    });
    set(withTotals(items));
  },

  clearCart: () => set(withTotals([])),

  loadItems: (items) => set(withTotals(items)),
}));
