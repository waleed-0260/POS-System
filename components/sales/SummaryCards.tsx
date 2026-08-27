"use client";

import { useEffect, useRef, useState } from "react";
import { Receipt, TrendingUp, Tag, BarChart2, Star } from "lucide-react";

import { formatPKR } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { buildSalesQuery, type SalesFilters, type SalesSummary } from "@/components/sales/types";

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
  label,
  value,
  subtext,
  loading,
}: {
  icon: typeof Receipt;
  label: string;
  value: string;
  subtext: string;
  loading: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <p className="text-xs text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className="h-7 w-24" />
          ) : (
            <p className="text-xl font-bold">{value}</p>
          )}
          <p className="text-xs text-muted-foreground">{subtext}</p>
        </div>
        <div className="rounded-lg bg-muted p-2 text-muted-foreground">
          <Icon className="size-4" />
        </div>
      </CardContent>
    </Card>
  );
}

export function SummaryCards({ filters }: { filters: SalesFilters }) {
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const query = buildSalesQuery(filters, { page: 1, limit: 1 });
    fetch(`/api/sales?${query}`)
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
  }, [
    filters.period,
    filters.startDate,
    filters.endDate,
    filters.categoryId,
    filters.subCategoryId,
    filters.status,
    filters.search,
  ]);

  const totalSales = useCountUp(summary?.totalSales ?? 0);
  const totalRevenue = useCountUp(summary?.totalRevenue ?? 0);
  const totalDiscount = useCountUp(summary?.totalDiscount ?? 0);
  const averageBillValue = useCountUp(summary?.averageBillValue ?? 0);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <SummaryCard
        icon={Receipt}
        label="Total Sales"
        value={String(Math.round(totalSales))}
        subtext="transactions"
        loading={loading}
      />
      <SummaryCard
        icon={TrendingUp}
        label="Total Revenue"
        value={formatPKR(totalRevenue)}
        subtext="collected"
        loading={loading}
      />
      <SummaryCard
        icon={Tag}
        label="Total Discount Given"
        value={formatPKR(totalDiscount)}
        subtext="saved by customers"
        loading={loading}
      />
      <SummaryCard
        icon={BarChart2}
        label="Average Bill Value"
        value={formatPKR(averageBillValue)}
        subtext="per transaction"
        loading={loading}
      />
      <SummaryCard
        icon={Star}
        label="Top Category"
        value={summary?.topCategory ?? "—"}
        subtext="by quantity sold"
        loading={loading}
      />
    </div>
  );
}
