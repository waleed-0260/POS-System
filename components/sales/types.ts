export type SaleStatus = "COMPLETED" | "REFUNDED" | "PARTIAL_REFUND";

export type SaleListItem = {
  id: string;
  billId: string;
  totalAmount: number;
  discount: number;
  netPayable: number;
  amountReceived: number;
  changeReturned: number;
  status: SaleStatus;
  createdAt: string;
  itemCount: number;
  totalQuantity: number;
  user: { name: string } | null;
};

export type SaleDetail = {
  id: string;
  billId: string;
  totalAmount: number;
  discount: number;
  netPayable: number;
  amountReceived: number;
  changeReturned: number;
  status: SaleStatus;
  createdAt: string;
  user: { name: string } | null;
  saleItems: Array<{
    id: string;
    productName: string;
    unitPrice: number;
    quantity: number;
    subtotal: number;
    product: {
      category: { name: string };
      subCategory: { name: string } | null;
    };
  }>;
};

export type SalesSummary = {
  totalSales: number;
  totalRevenue: number;
  totalDiscount: number;
  averageBillValue: number;
  topCategory: string | null;
};

export type Period = "today" | "week" | "15days" | "month" | "custom";
export type SortOption = "date_asc" | "date_desc" | "amount_asc" | "amount_desc";

export type SalesFilters = {
  period: Period;
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  subCategoryId?: string;
  status?: "COMPLETED" | "REFUNDED";
  search?: string;
  sort: SortOption;
  page: number;
  limit: number;
};

/** Builds the query string sent to /api/sales* endpoints from a filters object. */
export function buildSalesQuery(filters: SalesFilters, overrides: Record<string, string | number> = {}) {
  const params = new URLSearchParams();
  params.set("period", filters.period);
  if (filters.period === "custom") {
    if (filters.startDate) params.set("startDate", filters.startDate);
    if (filters.endDate) params.set("endDate", filters.endDate);
  }
  if (filters.categoryId) params.set("categoryId", filters.categoryId);
  if (filters.subCategoryId) params.set("subCategoryId", filters.subCategoryId);
  if (filters.status) params.set("status", filters.status);
  if (filters.search) params.set("search", filters.search);
  params.set("sort", filters.sort);
  params.set("page", String(filters.page));
  params.set("limit", String(filters.limit));

  for (const [key, value] of Object.entries(overrides)) {
    params.set(key, String(value));
  }

  return params.toString();
}
