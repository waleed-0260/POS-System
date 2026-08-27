import { NextRequest } from "next/server";
import { or } from "@prisma/orm-family-sql/orm-client";
import { auth } from "@/lib/auth";
import { db } from "@/src/prisma/db";
import { productSchema } from "@/lib/validations/product";
import { generateSku } from "@/lib/generateSku";

function stripBuyingPrice<T extends { buyingPrice?: unknown }>(product: T): T {
  const { buyingPrice: _buyingPrice, ...rest } = product;
  return rest as T;
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get("search")?.trim();
  const categoryId = searchParams.get("categoryId");
  const subCategoryId = searchParams.get("subCategoryId");
  const stockStatus = searchParams.get("stockStatus") ?? "all";
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.max(1, Number(searchParams.get("limit") ?? 20));

  let query = db.orm.public.Product.where({ isActive: true });

  if (search) {
    const term = `%${search}%`;
    query = query.where((p) => or(p.name.ilike(term), p.sku.ilike(term), p.brand.ilike(term)));
  }
  if (categoryId) {
    query = query.where({ categoryId });
  }
  if (subCategoryId) {
    query = query.where({ subCategoryId });
  }
  if (stockStatus === "out_of_stock") {
    query = query.where((p) => p.quantity.lte(0));
  } else if (stockStatus === "in_stock") {
    query = query.where((p) => p.quantity.gt(0));
  }

  if (stockStatus === "low_stock") {
    const all = await query
      .orderBy((p) => p.name.asc())
      .all();
    const lowStock = all.filter((p) => p.quantity > 0 && p.quantity <= p.lowStockThreshold);
    const total = lowStock.length;
    const start = (page - 1) * limit;
    const pageItems = lowStock.slice(start, start + limit);
    const data = session.user.role === "OWNER" ? pageItems : pageItems.map(stripBuyingPrice);

    return Response.json({
      success: true,
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }

  const { total } = await query.aggregate((aggregate) => ({ total: aggregate.count() }));

  const products = await query
    .orderBy((p) => p.name.asc())
    .limit(limit)
    .offset((page - 1) * limit)
    .all();

  const data = session.user.role === "OWNER" ? products : products.map(stripBuyingPrice);

  return Response.json({
    success: true,
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "OWNER") {
    return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { success: false, error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 }
    );
  }

  const data = parsed.data;

  let sku = data.sku?.trim();
  if (sku) {
    const existing = await db.orm.public.Product.where({ sku }).first();
    if (existing) {
      return Response.json({ success: false, error: "SKU already exists" }, { status: 400 });
    }
  } else {
    sku = await generateSku();
  }

  try {
    const product = await db.transaction(async (tx) => {
      const created = await tx.orm.public.Product.create({
        ...data,
        sku,
        lowStockThreshold: data.lowStockThreshold ?? 5,
        buyingPrice: String(data.buyingPrice),
        sellingPrice: String(data.sellingPrice),
      });

      if (data.quantity > 0) {
        await tx.orm.public.StockLog.create({
          productId: created.id,
          changeType: "RESTOCK",
          quantityChange: data.quantity,
          previousQty: 0,
          newQty: data.quantity,
          notes: "Opening stock",
          userId: session.user.id,
        });
      }

      return created;
    });

    return Response.json({ success: true, data: product }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create product";
    return Response.json({ success: false, error: message }, { status: 400 });
  }
}
