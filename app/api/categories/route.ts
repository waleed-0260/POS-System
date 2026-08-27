import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/src/prisma/db";

const createCategorySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60),
});

export async function GET(request: NextRequest) {
  const includeInactive = request.nextUrl.searchParams.get("includeInactive") === "true";

  if (includeInactive) {
    const session = await auth();
    if (!session) {
      return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "OWNER") {
      return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const categories = await db.orm.public.Category
      .select("id", "name", "isActive")
      .orderBy((c) => c.name.asc())
      .include("subCategories", (sc) =>
        sc.select("id", "name", "isActive", "categoryId").orderBy((s) => s.name.asc())
      )
      .all();

    const products = await db.orm.public.Product
      .where({ isActive: true })
      .select("categoryId", "subCategoryId")
      .all();

    const categoryCounts = new Map<string, number>();
    const subCategoryCounts = new Map<string, number>();
    for (const product of products) {
      categoryCounts.set(product.categoryId, (categoryCounts.get(product.categoryId) ?? 0) + 1);
      if (product.subCategoryId) {
        subCategoryCounts.set(product.subCategoryId, (subCategoryCounts.get(product.subCategoryId) ?? 0) + 1);
      }
    }

    const data = categories.map((category) => ({
      id: category.id,
      name: category.name,
      isActive: category.isActive,
      productCount: categoryCounts.get(category.id) ?? 0,
      subCategories: category.subCategories.map((sub) => ({
        id: sub.id,
        name: sub.name,
        isActive: sub.isActive,
        productCount: subCategoryCounts.get(sub.id) ?? 0,
      })),
    }));

    return Response.json({ success: true, data });
  }

  const categories = await db.orm.public.Category
    .where({ isActive: true })
    .select("id", "name")
    .orderBy((c) => c.name.asc())
    .include("subCategories", (sc) =>
      sc.where({ isActive: true }).select("id", "name").orderBy((s) => s.name.asc())
    )
    .all();

  return Response.json({ success: true, data: categories });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "OWNER") {
    return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createCategorySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { success: false, error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 }
    );
  }

  const existing = await db.orm.public.Category.where((c) => c.name.ilike(parsed.data.name)).first();
  if (existing) {
    return Response.json({ success: false, error: "Category name already exists" }, { status: 400 });
  }

  const category = await db.orm.public.Category.create({ name: parsed.data.name });
  return Response.json({ success: true, data: category }, { status: 201 });
}
