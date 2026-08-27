import { auth } from "@/lib/auth";
import { db } from "@/src/prisma/db";

export async function GET() {
  const session = await auth();
  if (!session) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const products = await db.orm.public.Product.where({ isActive: true }).select("brand").all();
  const brands = Array.from(
    new Set(products.map((p) => p.brand).filter((brand): brand is string => !!brand))
  ).sort((a, b) => a.localeCompare(b));

  return Response.json({ success: true, data: brands });
}
