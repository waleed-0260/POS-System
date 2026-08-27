import { db } from "@/src/prisma/db";
import { PosHome } from "@/components/pos/PosHome";

export default async function Page() {
  const settings = await db.orm.public.ShopSettings.first();

  return <PosHome shopName={settings?.shopName ?? "POS System"} />;
}
