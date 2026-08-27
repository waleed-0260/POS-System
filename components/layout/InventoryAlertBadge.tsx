import { unstable_cache } from "next/cache";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { getInventoryAlertCounts } from "@/lib/inventoryAlerts";

const getCachedAlertCounts = unstable_cache(getInventoryAlertCounts, ["inventory-alert-counts"], {
  revalidate: 300,
});

export async function InventoryAlertBadge() {
  const { lowStock, outOfStock, total } = await getCachedAlertCounts();

  if (total === 0) return null;

  return (
    <Badge
      className={cn(
        "ml-auto hidden md:inline-flex",
        outOfStock > 0 ? "bg-destructive/15 text-destructive" : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
      )}
    >
      {total}
    </Badge>
  );
}
