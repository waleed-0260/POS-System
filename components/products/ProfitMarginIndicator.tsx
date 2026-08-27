"use client";

import { cn, formatPKR } from "@/lib/utils";

type ProfitMarginIndicatorProps = {
  buyingPrice: number;
  sellingPrice: number;
};

export function ProfitMarginIndicator({ buyingPrice, sellingPrice }: ProfitMarginIndicatorProps) {
  const buying = Number.isFinite(buyingPrice) ? buyingPrice : 0;
  const selling = Number.isFinite(sellingPrice) ? sellingPrice : 0;

  const profit = selling - buying;
  const margin = selling > 0 ? (profit / selling) * 100 : 0;
  const markup = buying > 0 ? (profit / buying) * 100 : null;

  const colorClass =
    margin > 20
      ? "text-emerald-600 dark:text-emerald-400"
      : margin >= 0
        ? "text-amber-600 dark:text-amber-400"
        : "text-destructive";

  return (
    <div className="flex flex-col gap-1 rounded-lg border bg-muted/30 p-3 text-sm">
      <div className="flex justify-between">
        <span className="text-muted-foreground">Profit</span>
        <span className={cn("font-semibold", colorClass)}>{formatPKR(profit)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Margin</span>
        <span className={cn("font-semibold", colorClass)}>{margin.toFixed(1)}%</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Markup</span>
        <span className={cn("font-semibold", colorClass)}>{markup === null ? "—" : `${markup.toFixed(1)}%`}</span>
      </div>
      {selling < buying && (
        <p className="mt-1 text-xs font-medium text-destructive">⚠ Selling below cost price</p>
      )}
    </div>
  );
}
