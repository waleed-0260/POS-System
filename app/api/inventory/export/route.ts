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

function csvEscape(value: string | number) {
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  const isOwner = session.user.role === "OWNER";

  const sp = request.nextUrl.searchParams;
  const search = sp.get("search")?.trim();
  const categoryId = sp.get("categoryId");
  const subCategoryId = sp.get("subCategoryId");
  const stockStatusParam = sp.get("stockStatus");
  const stockStatus: StockStatus | null =
    stockStatusParam === "in_stock" || stockStatusParam === "low_stock" || stockStatusParam === "out_of_stock"
      ? stockStatusParam
      : null;

  let query = db.orm.public.Product.where({ isActive: true });
  if (categoryId) query = query.where({ categoryId });
  if (subCategoryId) query = query.where({ subCategoryId });
  if (search) {
    const like = `%${search}%`;
    query = query.where((p) => or(p.name.ilike(like), p.sku.ilike(like), p.brand.ilike(like)));
  }

  const rows = await query
    .include("category", (c) => c.select("name"))
    .include("subCategory", (sc) => sc.select("name"))
    .all();

  const filtered = rows.filter((p) => matchesStockStatus(stockStatus, p.quantity, p.lowStockThreshold));
  filtered.sort((a, b) => a.name.localeCompare(b.name));

  const header = [
    "SKU",
    "Product Name",
    "Category",
    "Sub-Category",
    "Brand",
    "Selling Price (PKR)",
    "Buying Price (PKR)",
    "Quantity",
    "Low Stock Threshold",
    "Unit",
    "Status",
    "Last Updated",
  ];

  const csvRows = filtered.map((product) => {
    const status = product.quantity === 0 ? "Out of Stock" : product.quantity <= product.lowStockThreshold ? "Low Stock" : "In Stock";
    return [
      product.sku,
      product.name,
      product.category?.name ?? "",
      product.subCategory?.name ?? "",
      product.brand ?? "",
      Number(product.sellingPrice),
      isOwner ? Number(product.buyingPrice) : "",
      product.quantity,
      product.lowStockThreshold,
      product.unit,
      status,
      new Date(product.updatedAt).toLocaleString("en-PK"),
    ]
      .map(csvEscape)
      .join(",");
  });

  const csv = [header.join(","), ...csvRows].join("\n");
  const filename = `inventory-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
