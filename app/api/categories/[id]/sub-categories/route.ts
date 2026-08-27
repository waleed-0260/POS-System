import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/src/prisma/db";

const createSubCategorySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "OWNER") {
    return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const { id: categoryId } = await params;
  const category = await db.orm.public.Category.first({ id: categoryId });
  if (!category) {
    return Response.json({ success: false, error: "Category not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = createSubCategorySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { success: false, error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 }
    );
  }

  const existing = await db.orm.public.SubCategory
    .where({ categoryId })
    .where((s) => s.name.ilike(parsed.data.name))
    .first();
  if (existing) {
    return Response.json(
      { success: false, error: "Sub-category name already exists in this category" },
      { status: 400 }
    );
  }

  const subCategory = await db.orm.public.SubCategory.create({ name: parsed.data.name, categoryId });
  return Response.json({ success: true, data: subCategory }, { status: 201 });
}
