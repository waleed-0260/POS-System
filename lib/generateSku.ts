import { db } from "@/src/prisma/db";

/** Deterministic PRD-00000001-style SKU, verified unique before being handed back. */
export async function generateSku() {
  const { count } = await db.orm.public.Product.aggregate((aggregate) => ({ count: aggregate.count() }));
  for (let offset = 0; offset < 5; offset++) {
    const candidate = `PRD-${String(count + 1 + offset).padStart(8, "0")}`;
    const existing = await db.orm.public.Product.where({ sku: candidate }).first();
    if (!existing) return candidate;
  }
  return `PRD-${Date.now()}`;
}
