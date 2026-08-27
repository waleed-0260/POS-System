import { auth } from "@/lib/auth";
import { db } from "@/src/prisma/db";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const logs = await db.orm.public.StockLog
    .where({ productId: id })
    .orderBy((log) => log.createdAt.desc())
    .limit(20)
    .include("user", (u) => u.select("name"))
    .all();

  const data = logs.map((log) => ({
    id: log.id,
    changeType: log.changeType,
    quantityChange: log.quantityChange,
    previousQty: log.previousQty,
    newQty: log.newQty,
    notes: log.notes,
    createdAt: log.createdAt,
    user: log.user ? { name: log.user.name } : null,
  }));

  return Response.json({ success: true, data });
}
