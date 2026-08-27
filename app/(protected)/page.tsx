import { db } from "@/src/prisma/db";
import { PosHome } from "@/components/pos/PosHome";

// This reads live shop settings on every request — it must never be
// prerendered/cached as static output (that would bake a build-time DB
// snapshot into the page and require DB access at build time).
export const dynamic = "force-dynamic";

export default async function Page() {
  const settings = await db.orm.public.ShopSettings.first();

  return <PosHome shopName={settings?.shopName ?? "POS System"} />;
}
