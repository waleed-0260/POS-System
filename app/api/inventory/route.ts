import { NextRequest } from "next/server";
import { or } from "@prisma/orm-family-sql/orm-client";
import { auth } from "@/lib/auth";
import { db } from "@/src/prisma/db";

type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

function matchesStockStatus(status: StockStatus | null, quantity: number, lowStockThreshold: number) {
  if (status === "in_stock") return quantity > lowStockThreshold;
  if (status === "low_stock") return quantity > 0 && quantity <= lowStockThreshold;
  if (status === "out_of_stock") return quantity === 0;
  return true;
}

function sortProducts<T extends { name: string; sellingPrice: number; quantity: number; updatedAt: string }>(
  products: T[],
  sortBy: string | null
) {
  const sorted = [...products];
  switch (sortBy) {
    case "name_desc":
      return sorted.sort((a, b) => b.name.localeCompare(a.name));
    case "price_asc":
      return sorted.sort((a, b) => a.sellingPrice - b.sellingPrice);
    case "price_desc":
      return sorted.sort((a, b) => b.sellingPrice - a.sellingPrice);
    case "qty_asc":
      return sorted.sort((a, b) => a.quantity - b.quantity);
    case "qty_desc":
      return sorted.sort((a, b) => b.quantity - a.quantity);
    case "updated_desc":
      return sorted.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    case "name_asc":
    default:
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
  }
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const sp = request.nextUrl.searchParams;
  const search = sp.get("search")?.trim();
  const categoryId = sp.get("categoryId");
  const subCategoryId = sp.get("subCategoryId");
  const stockStatusParam = sp.get("stockStatus");
  const stockStatus: StockStatus | null =
    stockStatusParam === "in_stock" || stockStatusParam === "low_stock" || stockStatusParam === "out_of_stock"
      ? stockStatusParam
      : null;
  const sortBy = sp.get("sortBy");
  const page = Math.max(1, Number(sp.get("page") ?? 1));
  const limit = Math.max(1, Number(sp.get("limit") ?? 20));

  // Summary always reflects the full active inventory, regardless of filters.
  const allActive = await db.orm.public.Product
    .where({ isActive: true })
    .select("sellingPrice", "buyingPrice", "quantity", "lowStockThreshold")
    .all();

  const summary = allActive.reduce(
    (acc, product) => {
      acc.totalProducts += 1;
      acc.totalRetailValue += Number(product.sellingPrice) * product.quantity;
      acc.totalCostValue += Number(product.buyingPrice) * product.quantity;
      if (product.quantity === 0) acc.outOfStockCount += 1;
      else if (product.quantity <= product.lowStockThreshold) acc.lowStockCount += 1;
      return acc;
    },
    { totalProducts: 0, totalRetailValue: 0, totalCostValue: 0, lowStockCount: 0, outOfStockCount: 0 }
  );

  let query = db.orm.public.Product.where({ isActive: true });
  if (categoryId) query = query.where({ categoryId });
  if (subCategoryId) query = query.where({ subCategoryId });
  if (search) {
    const like = `%${search}%`;
    query = query.where((p) => or(p.name.ilike(like), p.sku.ilike(like), p.brand.ilike(like)));
  }

  const rowsRaw = await query
    .select(
      "id",
      "name",
      "sku",
      "brand",
      "unit",
      "sellingPrice",
      "buyingPrice",
      "quantity",
      "lowStockThreshold",
      "isActive",
      "updatedAt"
    )
    .include("category", (c) => c.select("id", "name"))
    .include("subCategory", (sc) => sc.select("id", "name"))
    .all();

  let products = rowsRaw.map((product) => ({
    id: product.id,
    name: product.name,
    sku: product.sku,
    brand: product.brand,
    unit: product.unit,
    sellingPrice: Number(product.sellingPrice),
    buyingPrice: Number(product.buyingPrice),
    quantity: product.quantity,
    lowStockThreshold: product.lowStockThreshold,
    isActive: product.isActive,
    updatedAt: product.updatedAt,
    category: product.category ? { id: product.category.id, name: product.category.name } : { id: "", name: "" },
    subCategory: product.subCategory ? { id: product.subCategory.id, name: product.subCategory.name } : null,
  }));

  products = products.filter((p) => matchesStockStatus(stockStatus, p.quantity, p.lowStockThreshold));
  products = sortProducts(products, sortBy);

  const total = products.length;
  const start = (page - 1) * limit;
  const paged = products.slice(start, start + limit);

  return Response.json({
    success: true,
    data: {
      products: paged,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      summary,
    },
  });
}
