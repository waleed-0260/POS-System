import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/src/prisma/db";

const refundSchema = z.object({
  reason: z.string().min(10, "Reason must be at least 10 characters"),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "OWNER") {
    return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = refundSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { success: false, error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 }
    );
  }

  try {
    const sale = await db.transaction(async (tx) => {
      const existing = await tx.orm.public.Sale.first({ id });
      if (!existing) {
        throw new Error("Sale not found");
      }
      if (existing.status !== "COMPLETED") {
        throw new Error("Only completed sales can be refunded");
      }

      const saleItems = await tx.orm.public.SaleItem.where({ saleId: id }).all();

      for (const item of saleItems) {
        const product = await tx.orm.public.Product.first({ id: item.productId });
        if (!product) continue;

        const previousQty = product.quantity;
        const newQty = previousQty + item.quantity;

        await tx.orm.public.Product.where({ id: item.productId }).update({ quantity: newQty });

        await tx.orm.public.StockLog.create({
          productId: item.productId,
          changeType: "RETURN",
          quantityChange: item.quantity,
          previousQty,
          newQty,
          userId: session.user.id,
          notes: parsed.data.reason,
        });
      }

      return tx.orm.public.Sale.where({ id }).update({ status: "REFUNDED" });
    });

    if (!sale) {
      return Response.json({ success: false, error: "Sale not found" }, { status: 404 });
    }

    return Response.json({ success: true, data: { billId: sale.billId, status: sale.status } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process refund";
    return Response.json({ success: false, error: message }, { status: 400 });
  }
}
