import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { db } from "@/src/prisma/db";
import { SalesPageClient } from "@/components/sales/SalesPageClient";
import { Skeleton } from "@/components/ui/skeleton";

function SalesPageSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

export default async function SalesHistoryPage() {
  const [session, settings] = await Promise.all([auth(), db.orm.public.ShopSettings.first()]);

  return (
    <Suspense fallback={<SalesPageSkeleton />}>
      <SalesPageClient
        shopName={settings?.shopName ?? "POS System"}
        canRefund={session?.user.role === "OWNER"}
      />
    </Suspense>
  );
}
