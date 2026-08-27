"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { Download, Upload, RotateCcw } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

type Category = { id: string; name: string; subCategories: { id: string; name: string }[] };

type ParsedRow = {
  name: string;
  sku: string;
  category: string;
  sub_category: string;
  brand: string;
  description: string;
  buying_price: number;
  selling_price: number;
  quantity: number;
  low_stock_threshold: number;
  unit: string;
};

type RowLevel = "ready" | "warning" | "error";
type ValidatedRow = ParsedRow & { level: RowLevel; message?: string };

const HEADER_MAP: Record<string, keyof ParsedRow> = {
  name: "name",
  sku: "sku",
  category: "category",
  sub_category: "sub_category",
  subcategory: "sub_category",
  brand: "brand",
  description: "description",
  buying_price: "buying_price",
  buyingprice: "buying_price",
  selling_price: "selling_price",
  sellingprice: "selling_price",
  quantity: "quantity",
  low_stock_threshold: "low_stock_threshold",
  lowstockthreshold: "low_stock_threshold",
  unit: "unit",
};

function normalizeHeader(header: string) {
  return header.trim().toLowerCase().replace(/\*/g, "").replace(/\s+/g, "_");
}

function toNumber(value: unknown) {
  if (value === undefined || value === null || value === "") return NaN;
  return Number(value);
}

function rowsFromCsvText(csvText: string): ParsedRow[] {
  const { data } = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  return data
    .filter((raw) => Object.values(raw).some((v) => String(v ?? "").trim() !== ""))
    .map((raw) => {
      const row: Partial<ParsedRow> = {};
      for (const [key, value] of Object.entries(raw)) {
        const mapped = HEADER_MAP[normalizeHeader(key)];
        if (!mapped) continue;
        (row as Record<string, unknown>)[mapped] =
          mapped === "buying_price" || mapped === "selling_price" || mapped === "quantity" || mapped === "low_stock_threshold"
            ? toNumber(value)
            : String(value ?? "").trim();
      }
      return {
        name: row.name ?? "",
        sku: row.sku ?? "",
        category: row.category ?? "",
        sub_category: row.sub_category ?? "",
        brand: row.brand ?? "",
        description: row.description ?? "",
        buying_price: row.buying_price ?? NaN,
        selling_price: row.selling_price ?? NaN,
        quantity: row.quantity ?? NaN,
        low_stock_threshold: Number.isFinite(row.low_stock_threshold) ? (row.low_stock_threshold as number) : 5,
        unit: row.unit || "Piece",
      };
    });
}

function validateRows(rows: ParsedRow[], categories: Category[]): ValidatedRow[] {
  const skuCounts = new Map<string, number>();
  for (const row of rows) {
    if (row.sku) skuCounts.set(row.sku, (skuCounts.get(row.sku) ?? 0) + 1);
  }

  return rows.map((row) => {
    if (!row.name || row.name.trim().length < 2) {
      return { ...row, level: "error", message: "Missing or invalid name" };
    }
    if (!row.category) {
      return { ...row, level: "error", message: "Missing category" };
    }
    const category = categories.find((c) => c.name.toLowerCase() === row.category.toLowerCase());
    if (!category) {
      return { ...row, level: "error", message: `Category "${row.category}" not found` };
    }
    if (row.sub_category) {
      const sub = category.subCategories.find((s) => s.name.toLowerCase() === row.sub_category.toLowerCase());
      if (!sub) {
        return { ...row, level: "error", message: `Sub-category "${row.sub_category}" not found` };
      }
    }
    if (!Number.isFinite(row.buying_price) || row.buying_price < 0) {
      return { ...row, level: "error", message: "Invalid buying price" };
    }
    if (!Number.isFinite(row.selling_price) || row.selling_price < 0) {
      return { ...row, level: "error", message: "Invalid selling price" };
    }
    if (!Number.isFinite(row.quantity) || row.quantity < 0) {
      return { ...row, level: "error", message: "Invalid quantity" };
    }
    if (row.sku && (skuCounts.get(row.sku) ?? 0) > 1) {
      return { ...row, level: "error", message: "Duplicate SKU in file" };
    }
    if (row.selling_price < row.buying_price) {
      return { ...row, level: "warning", message: "Selling price below buying price" };
    }
    return { ...row, level: "ready" };
  });
}

function rowsToCsv(rows: (ValidatedRow & { message?: string })[]) {
  const header = [
    "name",
    "sku",
    "category",
    "sub_category",
    "brand",
    "buying_price",
    "selling_price",
    "quantity",
    "unit",
    "Error Reason",
  ];
  const body = rows.map((r) =>
    [r.name, r.sku, r.category, r.sub_category, r.brand, r.buying_price, r.selling_price, r.quantity, r.unit, r.message ?? ""]
      .map((v) => {
        const str = String(v ?? "");
        return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
      })
      .join(",")
  );
  return [header.join(","), ...body].join("\n");
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const BATCH_SIZE = 50;

export function BulkImport() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [rows, setRows] = useState<ValidatedRow[] | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, imported: 0, failed: 0 });
  const [importComplete, setImportComplete] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const ensureCategories = async () => {
    if (categories.length > 0) return categories;
    const res = await fetch("/api/categories");
    const json = await res.json();
    const list: Category[] = json.success ? json.data : [];
    setCategories(list);
    return list;
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setParseError(null);

    const ext = file.name.split(".").pop()?.toLowerCase();
    let csvText: string;

    try {
      if (ext === "csv") {
        csvText = await file.text();
      } else if (ext === "xlsx" || ext === "xls") {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        csvText = XLSX.utils.sheet_to_csv(sheet);
      } else {
        setParseError("Unsupported file type — please upload a .csv, .xlsx, or .xls file");
        return;
      }

      const parsedRows = rowsFromCsvText(csvText);
      if (parsedRows.length === 0) {
        setParseError("No data rows found in the file");
        return;
      }

      const cats = await ensureCategories();
      setRows(validateRows(parsedRows, cats));
    } catch {
      setParseError("Failed to parse the file — please check the format and try again");
    }
  };

  const summary = useMemo(() => {
    if (!rows) return null;
    return {
      ready: rows.filter((r) => r.level === "ready").length,
      warning: rows.filter((r) => r.level === "warning").length,
      error: rows.filter((r) => r.level === "error").length,
      total: rows.length,
    };
  }, [rows]);

  const handleDownloadErrors = () => {
    if (!rows) return;
    const errorRows = rows.filter((r) => r.level === "error");
    downloadCsv("import-errors.csv", rowsToCsv(errorRows));
  };

  const handleReset = () => {
    setRows(null);
    setParseError(null);
    setImportComplete(false);
    setProgress({ done: 0, imported: 0, failed: 0 });
  };

  const handleImport = async () => {
    if (!rows) return;
    const importable = rows.filter((r) => r.level !== "error");
    setImporting(true);
    setProgress({ done: 0, imported: 0, failed: 0 });

    let imported = 0;
    let failed = 0;

    for (let i = 0; i < importable.length; i += BATCH_SIZE) {
      const batch = importable.slice(i, i + BATCH_SIZE);
      try {
        const res = await fetch("/api/products/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows: batch }),
        });
        const json = await res.json();
        if (json.success) {
          imported += json.data.imported;
          failed += json.data.failed;
        } else {
          failed += batch.length;
        }
      } catch {
        failed += batch.length;
      }
      setProgress({ done: Math.min(i + BATCH_SIZE, importable.length), imported, failed });
    }

    setImporting(false);
    setImportComplete(true);
  };

  if (importComplete) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Import Complete</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm">
            ✅ {progress.imported} products imported successfully
            {progress.failed > 0 && <> · ⚠ {progress.failed} skipped (errors)</>}
          </p>
          <div className="flex gap-2">
            <Button render={<Link href="/inventory" />}>View Inventory</Button>
            <Button variant="outline" onClick={handleReset}>
              Import Another File
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (importing) {
    const importable = rows?.filter((r) => r.level !== "error").length ?? 0;
    return (
      <Card>
        <CardHeader>
          <CardTitle>Importing Products...</CardTitle>
          <CardDescription>
            {progress.done} of {importable} rows processed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={importable > 0 ? (progress.done / importable) * 100 : 0} />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Bulk Import Products</CardTitle>
          <CardDescription>
            Upload a CSV or Excel file to add multiple products at once. Download the template below to
            get started.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button variant="outline" render={<a href="/api/products/import/template?format=csv" />}>
            <Download />
            Download CSV Template
          </Button>
          <Button variant="outline" render={<a href="/api/products/import/template?format=xlsx" />}>
            <Download />
            Download Excel Template
          </Button>
        </CardContent>
      </Card>

      {!rows && (
        <Card>
          <CardContent>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                handleFile(e.dataTransfer.files[0]);
              }}
              onClick={() => inputRef.current?.click()}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-10 text-center transition-colors",
                dragOver ? "border-primary bg-primary/5" : "border-input hover:bg-muted/50"
              )}
            >
              <Upload className="size-8 text-muted-foreground" />
              <p className="text-sm font-medium">Drag & drop your file here, or click to browse</p>
              <p className="text-xs text-muted-foreground">.csv, .xlsx, .xls — max 5MB</p>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
            </div>
            {parseError && <p className="mt-2 text-sm text-destructive">{parseError}</p>}
          </CardContent>
        </Card>
      )}

      {rows && summary && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                  ✅ {summary.ready} ready
                </span>
                <span className="font-medium text-amber-600 dark:text-amber-400">
                  ⚠ {summary.warning} warnings
                </span>
                <span className="font-medium text-destructive">❌ {summary.error} errors</span>
                <span className="text-muted-foreground">Total: {summary.total} rows</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {summary.error > 0 && (
                  <Button variant="outline" size="sm" onClick={handleDownloadErrors}>
                    <Download />
                    Download Error Report
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={handleReset}>
                  <RotateCcw />
                  Fix & Re-upload
                </Button>
                <Button size="sm" disabled={summary.ready + summary.warning === 0} onClick={handleImport}>
                  Import {summary.ready + summary.warning} Valid Rows
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/50 text-left">
                    <th className="p-2 font-medium">#</th>
                    <th className="p-2 font-medium">Name</th>
                    <th className="p-2 font-medium">SKU</th>
                    <th className="p-2 font-medium">Category</th>
                    <th className="p-2 font-medium">Sub-Category</th>
                    <th className="p-2 font-medium">Brand</th>
                    <th className="p-2 text-right font-medium">Buying</th>
                    <th className="p-2 text-right font-medium">Selling</th>
                    <th className="p-2 text-right font-medium">Qty</th>
                    <th className="p-2 font-medium">Unit</th>
                    <th className="p-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr
                      key={i}
                      className={cn(
                        "border-b last:border-b-0",
                        row.level === "error" && "bg-red-50 dark:bg-red-950/20",
                        row.level === "warning" && "bg-amber-50 dark:bg-amber-950/20"
                      )}
                    >
                      <td className="p-2 text-muted-foreground">{i + 1}</td>
                      <td className="p-2 font-medium">{row.name || "—"}</td>
                      <td className="p-2 font-mono">{row.sku || "auto"}</td>
                      <td className="p-2">{row.category || "—"}</td>
                      <td className="p-2 text-muted-foreground">{row.sub_category || "—"}</td>
                      <td className="p-2 text-muted-foreground">{row.brand || "—"}</td>
                      <td className="p-2 text-right">{Number.isFinite(row.buying_price) ? row.buying_price : "—"}</td>
                      <td className="p-2 text-right">{Number.isFinite(row.selling_price) ? row.selling_price : "—"}</td>
                      <td className="p-2 text-right">{Number.isFinite(row.quantity) ? row.quantity : "—"}</td>
                      <td className="p-2">{row.unit}</td>
                      <td className="p-2">
                        {row.level === "ready" && (
                          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">Ready</Badge>
                        )}
                        {row.level === "warning" && (
                          <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400">
                            Warning: {row.message}
                          </Badge>
                        )}
                        {row.level === "error" && (
                          <Badge className="bg-destructive/15 text-destructive">Error: {row.message}</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
