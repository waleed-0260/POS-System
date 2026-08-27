import { NextRequest } from "next/server";
import { z } from "zod";
import { or } from "@prisma/orm-family-sql/orm-client";
import { auth } from "@/lib/auth";
import { db } from "@/src/prisma/db";
import { resolveDateRange, resolveSort } from "@/lib/salesFilters";

const saleItemSchema = z.object({
  productId: z.string().min(1),
  productName: z.string().min(1),
  unitPrice: z.number().nonnegative(),
  quantity: z.number().int().positive(),
  subtotal: z.number().nonnegative(),
});

const createSaleSchema = z.object({
  items: z.array(saleItemSchema).min(1, "Cart is empty"),
  totalAmount: z.number().nonnegative(),
  discount: z.number().nonnegative(),
  netPayable: z.number().nonnegative(),
  amountReceived: z.number().nonnegative(),
  changeReturned: z.number(),
});

function generateBillId(count: number, now: Date) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `BILL-${y}${m}${d}-${String(count + 1).padStart(3, "0")}`;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createSaleSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { success: false, error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 }
    );
  }

  const { items, totalAmount, discount, netPayable, amountReceived, changeReturned } = parsed.data;

  try {
    const sale = await db.transaction(async (tx) => {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

      const { count } = await tx.orm.public.Sale
        .where((s) => s.createdAt.gte(startOfDay.toISOString()))
        .where((s) => s.createdAt.lt(endOfDay.toISOString()))
        .aggregate((aggregate) => ({ count: aggregate.count() }));

      const billId = generateBillId(count, now);

      const products = new Map<string, { quantity: number; name: string; isActive: boolean }>();
      for (const item of items) {
        const product = await tx.orm.public.Product.first({ id: item.productId });
        if (!product || !product.isActive) {
          throw new Error(`Product not found: ${item.productName}`);
        }
        if (product.quantity < item.quantity) {
          throw new Error(`Insufficient stock for ${product.name} — only ${product.quantity} left`);
        }
        products.set(item.productId, product);
      }

      const createdSale = await tx.orm.public.Sale.create({
        billId,
        totalAmount: String(totalAmount),
        discount: String(discount),
        netPayable: String(netPayable),
        amountReceived: String(amountReceived),
        changeReturned: String(changeReturned),
        status: "COMPLETED",
        userId: session.user.id,
      });

      for (const item of items) {
        const product = products.get(item.productId)!;
        const previousQty = product.quantity;
        const newQty = previousQty - item.quantity;

        await tx.orm.public.SaleItem.create({
          saleId: createdSale.id,
          productId: item.productId,
          productName: item.productName,
          unitPrice: String(item.unitPrice),
          quantity: item.quantity,
          subtotal: String(item.subtotal),
        });

        await tx.orm.public.Product.where({ id: item.productId }).update({ quantity: newQty });

        await tx.orm.public.StockLog.create({
          productId: item.productId,
          changeType: "SALE",
          quantityChange: -item.quantity,
          previousQty,
          newQty,
          userId: session.user.id,
        });
      }

      return createdSale;
    });

    return Response.json(
      {
        success: true,
        data: {
          id: sale.id,
          billId: sale.billId,
          totalAmount,
          discount,
          netPayable,
          amountReceived,
          changeReturned,
          createdAt: sale.createdAt,
          saleItems: items,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to complete sale";
    return Response.json({ success: false, error: message }, { status: 400 });
  }
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const sp = request.nextUrl.searchParams;
  const { start, end } = resolveDateRange(sp.get("period"), sp.get("startDate"), sp.get("endDate"));
  const statusParam = sp.get("status");
  const status = statusParam === "COMPLETED" || statusParam === "REFUNDED" ? statusParam : null;
  const search = sp.get("search")?.trim();
  const { field: sortField, ascending } = resolveSort(sp.get("sort"));
  const page = Math.max(1, Number(sp.get("page") ?? 1));
  const limit = Math.max(1, Number(sp.get("limit") ?? 20));
  const categoryId = sp.get("categoryId");
  const subCategoryId = sp.get("subCategoryId");

  let productIds: string[] | null = null;
  if (subCategoryId) {
    const products = await db.orm.public.Product.where({ subCategoryId }).select("id").all();
    productIds = products.map((p) => p.id);
  } else if (categoryId) {
    const products = await db.orm.public.Product.where({ categoryId }).select("id").all();
    productIds = products.map((p) => p.id);
  }

  function baseQuery() {
    let query = db.orm.public.Sale
      .where((s) => s.createdAt.gte(start.toISOString()))
      .where((s) => s.createdAt.lte(end.toISOString()));

    if (status) {
      query = query.where({ status });
    }

    if (productIds) {
      const ids = productIds;
      query = query.where((s) => s.saleItems.some((si) => si.productId.in(ids)));
    }

    if (search) {
      const like = `%${search}%`;
      const numeric = Number(search);
      const isNumeric = search !== "" && Number.isFinite(numeric);
      query = query.where((s) => {
        const textMatch = or(s.billId.ilike(like), s.saleItems.some((si) => si.productName.ilike(like)));
        return isNumeric ? or(textMatch, s.netPayable.eq(String(numeric))) : textMatch;
      });
    }

    return query;
  }

  const { count, revenue, discountSum } = await baseQuery().aggregate((aggregate) => ({
    count: aggregate.count(),
    revenue: aggregate.sum("netPayable"),
    discountSum: aggregate.sum("discount"),
  }));

  let topCategory: string | null = null;
  if (count > 0) {
    const filteredSaleIds = (await baseQuery().select("id").all()).map((s) => s.id);
    const items = await db.orm.public.SaleItem
      .where((si) => si.saleId.in(filteredSaleIds))
      .select("quantity")
      .include("product", (p) => p.include("category", (c) => c.select("name")))
      .all();

    const totals = new Map<string, number>();
    for (const item of items) {
      const name = item.product?.category?.name;
      if (!name) continue;
      totals.set(name, (totals.get(name) ?? 0) + item.quantity);
    }
    let max = 0;
    for (const [name, qty] of totals) {
      if (qty > max) {
        max = qty;
        topCategory = name;
      }
    }
  }

  const salesRaw = await baseQuery()
    .orderBy((s) => (ascending ? s[sortField].asc() : s[sortField].desc()))
    .limit(limit)
    .offset((page - 1) * limit)
    .include("user", (u) => u.select("name"))
    .include("saleItems", (saleItems) =>
      saleItems.combine({ itemCount: saleItems.count(), totalQuantity: saleItems.sum("quantity") })
    )
    .all();

  const sales = salesRaw.map((sale) => ({
    id: sale.id,
    billId: sale.billId,
    totalAmount: Number(sale.totalAmount),
    discount: Number(sale.discount),
    netPayable: Number(sale.netPayable),
    amountReceived: Number(sale.amountReceived),
    changeReturned: Number(sale.changeReturned),
    status: sale.status,
    createdAt: sale.createdAt,
    itemCount: sale.saleItems.itemCount,
    totalQuantity: sale.saleItems.totalQuantity ?? 0,
    user: sale.user ? { name: sale.user.name } : null,
  }));

  const revenueNumber = Number(revenue ?? 0);

  return Response.json({
    success: true,
    data: {
      sales,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(count / limit)),
      },
      summary: {
        totalSales: count,
        totalRevenue: revenueNumber,
        totalDiscount: Number(discountSum ?? 0),
        averageBillValue: count > 0 ? revenueNumber / count : 0,
        topCategory,
      },
    },
  });
}
