import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/src/prisma/db";

const restockSchema = z.object({
  quantityToAdd: z.number().int().min(1),
  newBuyingPrice: z.number().nonnegative().optional(),
  notes: z.string().optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = restockSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { success: false, error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 }
    );
  }

  const { quantityToAdd, newBuyingPrice, notes } = parsed.data;

  try {
    const result = await db.transaction(async (tx) => {
      const product = await tx.orm.public.Product.first({ id });
      if (!product || !product.isActive) {
        throw new Error("Product not found");
      }

      const previousQty = product.quantity;
      const newQty = previousQty + quantityToAdd;

      await tx.orm.public.Product.where({ id }).update({
        quantity: newQty,
        ...(newBuyingPrice !== undefined ? { buyingPrice: String(newBuyingPrice) } : {}),
      });

      await tx.orm.public.StockLog.create({
        productId: id,
        changeType: "RESTOCK",
        quantityChange: quantityToAdd,
        previousQty,
        newQty,
        notes: notes || null,
        userId: session.user.id,
      });

      return { newQuantity: newQty };
    });

    return Response.json({
      success: true,
      data: {
        productId: id,
        newQuantity: result.newQuantity,
        quantityAdded: quantityToAdd,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to restock product";
    return Response.json({ success: false, error: message }, { status: 400 });
  }
}
