"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { formatDistanceToNow } from "date-fns";

import { cn, formatPKR } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { ProductDetail, ProductPerformance, StockLogEntry } from "@/components/inventory/types";
import type { RestockTarget } from "@/components/inventory/RestockModal";

const changeTypeStyles: Record<StockLogEntry["changeType"], string> = {
  SALE: "bg-destructive/15 text-destructive",
  RESTOCK: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  ADJUSTMENT: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  RETURN: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
};

const changeTypeLabels: Record<StockLogEntry["changeType"], string> = {
  SALE: "Sale",
  RESTOCK: "Restock",
  ADJUSTMENT: "Adjustment",
  RETURN: "Return",
};

type ProductDetailSheetProps = {
  productId: string | null;
  onOpenChange: (open: boolean) => void;
  onRestock: (product: RestockTarget) => void;
};

export function ProductDetailSheet({ productId, onOpenChange, onRestock }: ProductDetailSheetProps) {
  const { data: session } = useSession();
  const isOwner = session?.user?.role === "OWNER";

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [stockLogs, setStockLogs] = useState<StockLogEntry[] | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);
  const [performance, setPerformance] = useState<ProductPerformance | null>(null);
  const [performanceLoading, setPerformanceLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("history");

  useEffect(() => {
    if (!productId) {
      setProduct(null);
      setStockLogs(null);
      setPerformance(null);
      setActiveTab("history");
      return;
    }

    setLoading(true);
    setLogsLoading(true);
    setStockLogs(null);
    setPerformance(null);
    setActiveTab("history");

    fetch(`/api/products/${productId}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setProduct(json.data);
      })
      .finally(() => setLoading(false));

    fetch(`/api/products/${productId}/stock-logs`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setStockLogs(json.data);
      })
      .finally(() => setLogsLoading(false));
  }, [productId]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === "performance" && isOwner && !performance && productId) {
      setPerformanceLoading(true);
      fetch(`/api/products/${productId}/performance`)
        .then((res) => res.json())
        .then((json) => {
          if (json.success) setPerformance(json.data);
        })
        .finally(() => setPerformanceLoading(false));
    }
  };

  const margin =
    product && isOwner && product.buyingPrice !== undefined && product.sellingPrice > 0
      ? (((product.sellingPrice - product.buyingPrice) / product.sellingPrice) * 100).toFixed(1)
      : null;

  return (
    <Sheet open={!!productId} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {loading || !product ? (
          <div className="flex flex-col gap-3 p-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <>
            <SheetHeader>
              <SheetTitle className="text-lg">{product.name}</SheetTitle>
              <SheetDescription className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="font-mono">
                  {product.sku}
                </Badge>
                <Badge variant={product.isActive ? "default" : "destructive"}>
                  {product.isActive ? "Active" : "Inactive"}
                </Badge>
                <span>
                  {product.category?.name ?? "—"}
                  {product.subCategory ? ` · ${product.subCategory.name}` : ""}
                  {product.brand ? ` · ${product.brand}` : ""} · {product.unit}
                </span>
              </SheetDescription>
            </SheetHeader>

            <div className="flex flex-col gap-4 px-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Selling Price</p>
                  <p className="font-semibold">{formatPKR(product.sellingPrice)}</p>
                </div>
                {isOwner && product.buyingPrice !== undefined && (
                  <div>
                    <p className="text-muted-foreground">Buying Price</p>
                    <p className="font-semibold">{formatPKR(product.buyingPrice)}</p>
                  </div>
                )}
                {isOwner && margin !== null && (
                  <div>
                    <p className="text-muted-foreground">Profit Margin</p>
                    <p className="font-semibold">{margin}%</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground">Current Stock</p>
                  <p className="font-semibold">{product.quantity} units</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Low Stock Threshold</p>
                  <p className="font-semibold">{product.lowStockThreshold} units</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p className="font-semibold">{new Date(product.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Last Updated</p>
                  <p className="font-semibold">
                    {formatDistanceToNow(new Date(product.updatedAt), { addSuffix: true })}
                  </p>
                </div>
              </div>

              {product.description && (
                <div className="text-sm">
                  <p className="text-muted-foreground">Description</p>
                  <p>{product.description}</p>
                </div>
              )}

              <Separator />

              <Tabs value={activeTab} onValueChange={(v) => v && handleTabChange(v)}>
                <TabsList>
                  <TabsTrigger value="history">Stock History</TabsTrigger>
                  {isOwner && <TabsTrigger value="performance">Sales Performance</TabsTrigger>}
                </TabsList>

                <TabsContent value="history" className="mt-3">
                  {logsLoading ? (
                    <div className="flex flex-col gap-2">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-8 w-full" />
                      ))}
                    </div>
                  ) : !stockLogs || stockLogs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No stock history yet</p>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b bg-muted/50 text-left">
                            <th className="p-2 font-medium">Date</th>
                            <th className="p-2 font-medium">Type</th>
                            <th className="p-2 text-right font-medium">Change</th>
                            <th className="p-2 text-right font-medium">Prev → New</th>
                            <th className="p-2 font-medium">Notes</th>
                            <th className="p-2 font-medium">Cashier</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stockLogs.map((log) => (
                            <tr key={log.id} className="border-b last:border-b-0">
                              <td className="p-2 whitespace-nowrap">
                                {new Date(log.createdAt).toLocaleString()}
                              </td>
                              <td className="p-2">
                                <Badge className={changeTypeStyles[log.changeType]}>
                                  {changeTypeLabels[log.changeType]}
                                </Badge>
                              </td>
                              <td
                                className={cn(
                                  "p-2 text-right font-medium",
                                  log.quantityChange > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
                                )}
                              >
                                {log.quantityChange > 0 ? "+" : ""}
                                {log.quantityChange}
                              </td>
                              <td className="p-2 text-right text-muted-foreground">
                                {log.previousQty} → {log.newQty}
                              </td>
                              <td className="p-2 text-muted-foreground">{log.notes ?? "—"}</td>
                              <td className="p-2">{log.user?.name ?? "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </TabsContent>

                {isOwner && (
                  <TabsContent value="performance" className="mt-3">
                    {performanceLoading ? (
                      <div className="grid grid-cols-2 gap-3">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <Skeleton key={i} className="h-12 w-full" />
                        ))}
                      </div>
                    ) : performance ? (
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground">Units Sold (All Time)</p>
                          <p className="font-semibold">{performance.totalUnitsSold}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Revenue (All Time)</p>
                          <p className="font-semibold">{formatPKR(performance.totalRevenue)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Last Sold</p>
                          <p className="font-semibold">
                            {performance.lastSoldAt
                              ? formatDistanceToNow(new Date(performance.lastSoldAt), { addSuffix: true })
                              : "Never"}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Avg Monthly Sales (3mo)</p>
                          <p className="font-semibold">{performance.avgMonthlySales.toFixed(1)} units</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No sales data yet</p>
                    )}
                  </TabsContent>
                )}
              </Tabs>
            </div>

            <SheetFooter className="flex-row justify-end gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  onRestock({
                    id: product.id,
                    name: product.name,
                    quantity: product.quantity,
                    buyingPrice: product.buyingPrice ?? 0,
                  })
                }
              >
                Restock
              </Button>
              {isOwner && (
                <Button variant="outline" render={<Link href={`/products/edit/${product.id}`} />}>
                  Edit Product
                </Button>
              )}
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
