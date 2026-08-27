import { auth } from "@/lib/auth";
import { db } from "@/src/prisma/db";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const sale = await db.orm.public.Sale
    .where({ id })
    .include("user", (u) => u.select("name"))
    .include("saleItems", (items) =>
      items.include("product", (p) =>
        p.include("category", (c) => c.select("name")).include("subCategory", (sc) => sc.select("name"))
      )
    )
    .first();

  if (!sale) {
    return Response.json({ success: false, error: "Sale not found" }, { status: 404 });
  }

  return Response.json({
    success: true,
    data: {
      id: sale.id,
      billId: sale.billId,
      totalAmount: Number(sale.totalAmount),
      discount: Number(sale.discount),
      netPayable: Number(sale.netPayable),
      amountReceived: Number(sale.amountReceived),
      changeReturned: Number(sale.changeReturned),
      status: sale.status,
      createdAt: sale.createdAt,
      user: sale.user ? { name: sale.user.name } : null,
      saleItems: sale.saleItems.map((item) => ({
        id: item.id,
        productName: item.productName,
        unitPrice: Number(item.unitPrice),
        quantity: item.quantity,
        subtotal: Number(item.subtotal),
        product: {
          category: { name: item.product?.category?.name ?? "" },
          subCategory: item.product?.subCategory ? { name: item.product.subCategory.name } : null,
        },
      })),
    },
  });
}
