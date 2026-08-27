import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/src/prisma/db";
import { generateSku } from "@/lib/generateSku";
import { productUnits } from "@/lib/validations/product";

const importRowSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(120),
  sku: z
    .string()
    .trim()
    .max(50)
    .regex(/^[a-zA-Z0-9-]*$/, "SKU may only contain letters, numbers, and hyphens")
    .optional(),
  category: z.string().trim().min(1, "Category is required"),
  sub_category: z.string().trim().optional(),
  brand: z.string().trim().optional(),
  description: z.string().trim().optional(),
  buying_price: z.number().min(0).max(9999999),
  selling_price: z.number().min(0).max(9999999),
  quantity: z.number().int().min(0),
  low_stock_threshold: z.number().int().min(0).optional(),
  unit: z.string().trim().optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "OWNER") {
    return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const rows = Array.isArray(body?.rows) ? body.rows : [];

  const categories = await db.orm.public.Category.select("id", "name").all();
  const subCategories = await db.orm.public.SubCategory.select("id", "name", "categoryId").all();

  let imported = 0;
  let failed = 0;
  const errors: { row: number; error: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    try {
      const parsed = importRowSchema.parse(rows[i]);

      const category = categories.find((c) => c.name.toLowerCase() === parsed.category.toLowerCase());
      if (!category) throw new Error(`Category "${parsed.category}" not found`);

      let subCategoryId: string | null = null;
      if (parsed.sub_category) {
        const sub = subCategories.find(
          (s) => s.categoryId === category.id && s.name.toLowerCase() === parsed.sub_category!.toLowerCase()
        );
        if (!sub) {
          throw new Error(`Sub-category "${parsed.sub_category}" not found in "${parsed.category}"`);
        }
        subCategoryId = sub.id;
      }

      let sku = parsed.sku?.trim();
      if (sku) {
        const existing = await db.orm.public.Product.where({ sku }).first();
        if (existing) throw new Error(`SKU "${sku}" already exists`);
      } else {
        sku = await generateSku();
      }

      const unit = (productUnits as readonly string[]).includes(parsed.unit ?? "")
        ? (parsed.unit as (typeof productUnits)[number])
        : "Piece";

      await db.transaction(async (tx) => {
        const created = await tx.orm.public.Product.create({
          name: parsed.name,
          sku: sku!,
          categoryId: category.id,
          subCategoryId,
          brand: parsed.brand || null,
          description: parsed.description || null,
          buyingPrice: String(parsed.buying_price),
          sellingPrice: String(parsed.selling_price),
          quantity: parsed.quantity,
          lowStockThreshold: parsed.low_stock_threshold ?? 5,
          unit,
        });

        if (parsed.quantity > 0) {
          await tx.orm.public.StockLog.create({
            productId: created.id,
            changeType: "RESTOCK",
            quantityChange: parsed.quantity,
            previousQty: 0,
            newQty: parsed.quantity,
            notes: "Opening stock (bulk import)",
            userId: session.user.id,
          });
        }
      });

      imported += 1;
    } catch (error) {
      failed += 1;
      const message =
        error instanceof z.ZodError
          ? error.issues.map((issue) => issue.message).join(", ")
          : error instanceof Error
            ? error.message
            : "Unknown error";
      errors.push({ row: i, error: message });
    }
  }

  return Response.json({ success: true, data: { imported, failed, errors } });
}
