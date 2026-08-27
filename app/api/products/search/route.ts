import { NextRequest } from "next/server";
import { or } from "@prisma/orm-family-sql/orm-client";
import { auth } from "@/lib/auth";
import { db } from "@/src/prisma/db";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const q = request.nextUrl.searchParams.get("q")?.trim();
  const limitParam = Number(request.nextUrl.searchParams.get("limit"));
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 200) : 10;

  let query = db.orm.public.Product.where({ isActive: true });
  if (q) {
    const term = `%${q}%`;
    query = query.where((p) => or(p.name.ilike(term), p.sku.ilike(term), p.brand.ilike(term)));
  }

  const results = await query
    .select("id", "name", "sku", "sellingPrice", "quantity", "lowStockThreshold", "unit")
    .include("category", (c) => c.select("name"))
    .include("subCategory", (sc) => sc.select("name"))
    .orderBy((p) => p.name.asc())
    .limit(limit)
    .all();

  const data = results.map((product) => ({
    id: product.id,
    name: product.name,
    sku: product.sku,
    sellingPrice: Number(product.sellingPrice),
    quantity: product.quantity,
    lowStockThreshold: product.lowStockThreshold,
    unit: product.unit,
    category: { name: product.category?.name ?? "" },
    subCategory: product.subCategory ? { name: product.subCategory.name } : null,
  }));

  return Response.json({ success: true, data });
}
