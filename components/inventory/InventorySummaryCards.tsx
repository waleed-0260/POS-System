"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Package, TrendingUp, DollarSign, AlertTriangle, XCircle, Lock } from "lucide-react";

import { cn, formatPKR } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  buildInventoryQuery,
  type InventoryFilters,
  type InventorySummary,
  type StockStatus,
} from "@/components/inventory/types";

function useCountUp(target: number, durationMs = 600) {
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    const start = performance.now();
    let frame: number;

    function tick(now: number) {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(from + (target - from) * eased);
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return value;
}

function SummaryCard({
  icon: Icon,
  iconClassName,
  label,
  value,
  loading,
  locked,
  onClick,
}: {
  icon: typeof Package;
  iconClassName: string;
  label: string;
  value: string;
  loading: boolean;
  locked?: boolean;
  onClick?: () => void;
}) {
  const content = (
    <Card
      onClick={onClick}
      className={cn(onClick && "cursor-pointer transition-shadow hover:shadow-md")}
    >
      <CardContent className="flex items-center justify-between gap-2">
        <div className="flex flex-col gap-1">
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            {label}
            {locked && <Lock className="size-3" />}
          </p>
          {loading ? (
            <Skeleton className="h-7 w-24" />
          ) : (
            <p className="text-xl font-bold">{locked ? "———" : value}</p>
          )}
        </div>
        <div className={cn("rounded-lg p-2", iconClassName)}>
          <Icon className="size-4" />
        </div>
      </CardContent>
    </Card>
  );

  if (!locked) return content;

  return (
    <Tooltip>
      <TooltipTrigger render={<div />}>{content}</TooltipTrigger>
      <TooltipContent>Owner access only</TooltipContent>
    </Tooltip>
  );
}

type InventorySummaryCardsProps = {
  filters: InventoryFilters;
  onStockStatusClick: (status: StockStatus) => void;
};

export function InventorySummaryCards({ filters, onStockStatusClick }: InventorySummaryCardsProps) {
  const { data: session } = useSession();
  const isOwner = session?.user?.role === "OWNER";

  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const query = buildInventoryQuery(filters, { page: 1, limit: 1 });
    fetch(`/api/inventory?${query}`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        if (json.success) setSummary(json.data.summary);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filters.search, filters.categoryId, filters.subCategoryId, filters.stockStatus]);

  const totalProducts = useCountUp(summary?.totalProducts ?? 0);
  const totalRetailValue = useCountUp(summary?.totalRetailValue ?? 0);
  const totalCostValue = useCountUp(summary?.totalCostValue ?? 0);
  const lowStockCount = useCountUp(summary?.lowStockCount ?? 0);
  const outOfStockCount = useCountUp(summary?.outOfStockCount ?? 0);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <SummaryCard
        icon={Package}
        iconClassName="bg-blue-500/15 text-blue-600 dark:text-blue-400"
        label="Total Products"
        value={String(Math.round(totalProducts))}
        loading={loading}
      />
      <SummaryCard
        icon={TrendingUp}
        iconClassName="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
        label="Total Stock Value (Retail)"
        value={formatPKR(totalRetailValue)}
        loading={loading}
      />
      <SummaryCard
        icon={DollarSign}
        iconClassName="bg-purple-500/15 text-purple-600 dark:text-purple-400"
        label="Total Stock Value (Cost)"
        value={formatPKR(totalCostValue)}
        loading={loading}
        locked={!isOwner}
      />
      <SummaryCard
        icon={AlertTriangle}
        iconClassName="bg-amber-500/15 text-amber-600 dark:text-amber-400"
        label="Low Stock Items"
        value={String(Math.round(lowStockCount))}
        loading={loading}
        onClick={() => onStockStatusClick("low_stock")}
      />
      <SummaryCard
        icon={XCircle}
        iconClassName="bg-destructive/15 text-destructive"
        label="Out of Stock"
        value={String(Math.round(outOfStockCount))}
        loading={loading}
        onClick={() => onStockStatusClick("out_of_stock")}
      />
    </div>
  );
}
