import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/src/prisma/db";

const updateCategorySchema = z.object({
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
  const body = await request.json();
  const parsed = updateCategorySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { success: false, error: parsed.error.issues.map((i) => i.message).join(", ") },
      { status: 400 }
    );
  }

  if (parsed.data.name) {
    const duplicate = await db.orm.public.Category.where((c) => c.name.ilike(parsed.data.name!)).first();
    if (duplicate && duplicate.id !== id) {
      return Response.json({ success: false, error: "Category name already exists" }, { status: 400 });
    }
  }

  const category = await db.orm.public.Category.where({ id }).update(parsed.data);
  if (!category) {
    return Response.json({ success: false, error: "Category not found" }, { status: 404 });
  }

  return Response.json({ success: true, data: category });
}
