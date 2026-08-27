import { NextRequest } from "next/server";
import { or } from "@prisma/orm-family-sql/orm-client";
import { auth } from "@/lib/auth";
import { db } from "@/src/prisma/db";
import { resolveDateRange } from "@/lib/salesFilters";

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

  const sp = request.nextUrl.searchParams;
  const { start, end } = resolveDateRange(sp.get("period"), sp.get("startDate"), sp.get("endDate"));
  const statusParam = sp.get("status");
  const status = statusParam === "COMPLETED" || statusParam === "REFUNDED" ? statusParam : null;
  const search = sp.get("search")?.trim();
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

  const sales = await query
    .orderBy((s) => s.createdAt.desc())
    .include("user", (u) => u.select("name"))
    .include("saleItems", (saleItems) =>
      saleItems.combine({ itemCount: saleItems.count(), totalQuantity: saleItems.sum("quantity") })
    )
    .all();

  const header = [
    "Bill ID",
    "Date",
    "Time",
    "Items Count",
    "Total Qty",
    "Grand Total (PKR)",
    "Discount (PKR)",
    "Net Payable (PKR)",
    "Cashier",
  ];

  const rows = sales.map((sale) => {
    const date = new Date(sale.createdAt);
    return [
      sale.billId,
      date.toLocaleDateString("en-PK"),
      date.toLocaleTimeString("en-PK"),
      sale.saleItems.itemCount,
      sale.saleItems.totalQuantity ?? 0,
      Number(sale.totalAmount),
      Number(sale.discount),
      Number(sale.netPayable),
      sale.user?.name ?? "—",
    ]
      .map(csvEscape)
      .join(",");
  });

  const csv = [header.join(","), ...rows].join("\n");
  const filename = `sales-export-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
