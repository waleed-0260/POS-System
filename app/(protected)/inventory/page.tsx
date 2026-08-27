import { Suspense } from "react";
import { InventoryPageClient } from "@/components/inventory/InventoryPageClient";
import { Skeleton } from "@/components/ui/skeleton";

function InventoryPageSkeleton() {
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

export default function InventoryPage() {
  return (
    <Suspense fallback={<InventoryPageSkeleton />}>
      <InventoryPageClient />
    </Suspense>
  );
}
