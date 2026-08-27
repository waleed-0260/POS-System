import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/src/prisma/db";

const updateSubCategorySchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "OWNER") {
    return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await db.orm.public.SubCategory.first({ id });
  if (!existing) {
    return Response.json({ success: false, error: "Sub-category not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = updateSubCategorySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { success: false, error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 }
    );
  }

  if (parsed.data.name) {
    const duplicate = await db.orm.public.SubCategory
      .where({ categoryId: existing.categoryId })
      .where((s) => s.name.ilike(parsed.data.name!))
      .first();
    if (duplicate && duplicate.id !== id) {
      return Response.json(
        { success: false, error: "Sub-category name already exists in this category" },
        { status: 400 }
      );
    }
  }

  const subCategory = await db.orm.public.SubCategory.where({ id }).update(parsed.data);
  return Response.json({ success: true, data: subCategory });
}
