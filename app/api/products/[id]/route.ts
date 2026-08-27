import { auth } from "@/lib/auth";
import { db } from "@/src/prisma/db";
import { partialProductSchema } from "@/lib/validations/product";

function stripBuyingPrice<T extends { buyingPrice?: unknown }>(product: T): T {
  const { buyingPrice: _buyingPrice, ...rest } = product;
  return rest as T;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const product = await db.orm.public.Product
    .where({ id })
    .include("category", (c) => c.select("id", "name"))
    .include("subCategory", (sc) => sc.select("id", "name"))
    .first();
  if (!product) {
    return Response.json({ success: false, error: "Product not found" }, { status: 404 });
  }

  const shaped = {
    ...product,
    sellingPrice: Number(product.sellingPrice),
    buyingPrice: Number(product.buyingPrice),
    category: product.category ? { id: product.category.id, name: product.category.name } : null,
    subCategory: product.subCategory ? { id: product.subCategory.id, name: product.subCategory.name } : null,
  };

  const data = session.user.role === "OWNER" ? shaped : stripBuyingPrice(shaped);
  return Response.json({ success: true, data });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "OWNER") {
    return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = partialProductSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { success: false, error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 }
    );
  }

  const existing = await db.orm.public.Product.first({ id });
  if (!existing) {
    return Response.json({ success: false, error: "Product not found" }, { status: 404 });
  }

  // Stock quantity only ever changes through the Restock flow, so a PATCH can never
  // silently overwrite it — even if a caller includes it in the body.
  const { quantity: _quantity, buyingPrice, sellingPrice, sku, ...rest } = parsed.data;

  if (sku && sku !== existing.sku) {
    const skuTaken = await db.orm.public.Product.where({ sku }).first();
    if (skuTaken && skuTaken.id !== id) {
      return Response.json({ success: false, error: "SKU already exists" }, { status: 400 });
    }
  }

  const updatePayload = {
    ...rest,
    ...(sku !== undefined ? { sku } : {}),
    ...(buyingPrice !== undefined ? { buyingPrice: String(buyingPrice) } : {}),
    ...(sellingPrice !== undefined ? { sellingPrice: String(sellingPrice) } : {}),
  };

  // Nothing left to change (e.g. the only field sent was `quantity`, which is always
  // stripped) — treat as a no-op success instead of running an empty UPDATE.
  if (Object.keys(updatePayload).length === 0) {
    return Response.json({ success: true, data: existing });
  }

  try {
    const product = await db.transaction(async (tx) => {
      const updated = await tx.orm.public.Product.where({ id }).update(updatePayload);

      if (buyingPrice !== undefined && buyingPrice !== Number(existing.buyingPrice)) {
        await tx.orm.public.StockLog.create({
          productId: id,
          changeType: "ADJUSTMENT",
          quantityChange: 0,
          previousQty: existing.quantity,
          newQty: existing.quantity,
          notes: `Buying price updated from PKR ${Number(existing.buyingPrice).toFixed(2)} to PKR ${buyingPrice.toFixed(2)}`,
          userId: session.user.id,
        });
      }

      return updated;
    });

    if (!product) {
      return Response.json({ success: false, error: "Product not found" }, { status: 404 });
    }

    return Response.json({ success: true, data: product });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update product";
    return Response.json({ success: false, error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "OWNER") {
    return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const product = await db.orm.public.Product.where({ id }).update({ isActive: false });
  if (!product) {
    return Response.json({ success: false, error: "Product not found" }, { status: 404 });
  }

  return Response.json({ success: true, data: product });
}
