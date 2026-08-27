import { auth } from "@/lib/auth";
import { db } from "@/src/prisma/db";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "OWNER") {
    return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const items = await db.orm.public.SaleItem
    .where({ productId: id })
    .select("quantity", "subtotal")
    .include("sale", (s) => s.select("createdAt"))
    .all();

  const totalUnitsSold = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalRevenue = items.reduce((sum, item) => sum + Number(item.subtotal), 0);

  let lastSoldAt: string | null = null;
  for (const item of items) {
    const createdAt = item.sale?.createdAt;
    if (createdAt && (!lastSoldAt || createdAt > lastSoldAt)) {
      lastSoldAt = createdAt;
    }
  }

  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const recentUnits = items
    .filter((item) => item.sale?.createdAt && new Date(item.sale.createdAt) >= threeMonthsAgo)
    .reduce((sum, item) => sum + item.quantity, 0);

  return Response.json({
    success: true,
    data: {
      totalUnitsSold,
      totalRevenue,
      lastSoldAt,
      avgMonthlySales: recentUnits / 3,
    },
  });
}
