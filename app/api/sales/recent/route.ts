import { auth } from "@/lib/auth";
import { db } from "@/src/prisma/db";

export async function GET() {
  const session = await auth();
  if (!session) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const sales = await db.orm.public.Sale
    .orderBy((s) => s.createdAt.desc())
    .limit(5)
    .include("saleItems", (si) => si.select("productName", "quantity", "unitPrice", "subtotal"))
    .all();

  const data = sales.map((sale) => ({
    id: sale.id,
    billId: sale.billId,
    totalAmount: Number(sale.totalAmount),
    discount: Number(sale.discount),
    netPayable: Number(sale.netPayable),
    amountReceived: Number(sale.amountReceived),
    changeReturned: Number(sale.changeReturned),
    createdAt: sale.createdAt,
    saleItems: sale.saleItems.map((item) => ({
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      subtotal: Number(item.subtotal),
    })),
  }));

  return Response.json({ success: true, data });
}
