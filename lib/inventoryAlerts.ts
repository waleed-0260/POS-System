import { db } from "@/src/prisma/db";

export async function getInventoryAlertCounts() {
  const products = await db.orm.public.Product
    .where({ isActive: true })
    .select("quantity", "lowStockThreshold")
    .all();

  let lowStock = 0;
  let outOfStock = 0;
  for (const product of products) {
    if (product.quantity === 0) outOfStock += 1;
    else if (product.quantity <= product.lowStockThreshold) lowStock += 1;
  }

  return { lowStock, outOfStock, total: lowStock + outOfStock };
}
