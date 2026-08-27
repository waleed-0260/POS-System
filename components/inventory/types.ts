export type InventoryProduct = {
  id: string;
  name: string;
  sku: string;
  brand: string | null;
  unit: string;
  sellingPrice: number;
  buyingPrice: number;
  quantity: number;
  lowStockThreshold: number;
  isActive: boolean;
  updatedAt: string;
  category: { id: string; name: string };
  subCategory: { id: string; name: string } | null;
};

export type InventorySummary = {
  totalProducts: number;
  totalRetailValue: number;
  totalCostValue: number;
  lowStockCount: number;
  outOfStockCount: number;
};

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

export type SortBy =
  | "name_asc"
  | "name_desc"
  | "price_asc"
  | "price_desc"
  | "qty_asc"
  | "qty_desc"
  | "updated_desc";

export type InventoryFilters = {
  search?: string;
  categoryId?: string;
  subCategoryId?: string;
  stockStatus?: StockStatus;
  sortBy: SortBy;
  page: number;
  limit: number;
};

export function buildInventoryQuery(filters: InventoryFilters, overrides: Record<string, string | number> = {}) {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.categoryId) params.set("categoryId", filters.categoryId);
  if (filters.subCategoryId) params.set("subCategoryId", filters.subCategoryId);
  if (filters.stockStatus) params.set("stockStatus", filters.stockStatus);
  params.set("sortBy", filters.sortBy);
  params.set("page", String(filters.page));
  params.set("limit", String(filters.limit));

  for (const [key, value] of Object.entries(overrides)) {
    params.set(key, String(value));
  }

  return params.toString();
}

export function stockStatusOf(quantity: number, lowStockThreshold: number): StockStatus {
  if (quantity === 0) return "out_of_stock";
  if (quantity <= lowStockThreshold) return "low_stock";
  return "in_stock";
}

export type ProductDetail = {
  id: string;
  name: string;
  sku: string;
  brand: string | null;
  description: string | null;
  unit: string;
  sellingPrice: number;
  buyingPrice?: number;
  quantity: number;
  lowStockThreshold: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  category: { id: string; name: string } | null;
  subCategory: { id: string; name: string } | null;
};

export type StockLogEntry = {
  id: string;
  changeType: "SALE" | "RESTOCK" | "ADJUSTMENT" | "RETURN";
  quantityChange: number;
  previousQty: number;
  newQty: number;
  notes: string | null;
  createdAt: string;
  user: { name: string } | null;
};

export type ProductPerformance = {
  totalUnitsSold: number;
  totalRevenue: number;
  lastSoldAt: string | null;
  avgMonthlySales: number;
};
