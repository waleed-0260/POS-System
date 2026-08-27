import { NextRequest } from "next/server";
import * as XLSX from "xlsx";
import { auth } from "@/lib/auth";

const columns = [
  "name*",
  "sku",
  "category*",
  "sub_category",
  "brand",
  "description",
  "buying_price*",
  "selling_price*",
  "quantity*",
  "low_stock_threshold",
  "unit",
];

const exampleRows = [
  ["Pilot G2 Pen (Black)", "PEN-002", "Stationery", "Pens & Pencils", "Pilot", "Smooth gel pen", 40, 60, 100, 5, "Piece"],
  ["A5 Notebook 100 Pages", "", "Stationery", "Notebooks", "Student Choice", "", 60, 90, 150, 5, "Piece"],
  ["Cricket Bat", "", "Sports", "Cricket", "Cosco", "Full size cricket bat", 800, 1200, 10, 3, "Piece"],
];

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "OWNER") {
    return Response.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const format = request.nextUrl.searchParams.get("format") === "xlsx" ? "xlsx" : "csv";

  if (format === "xlsx") {
    const worksheet = XLSX.utils.aoa_to_sheet([columns, ...exampleRows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Products");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    return new Response(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="product-import-template.xlsx"',
      },
    });
  }

  const csv = [columns.join(","), ...exampleRows.map((row) => row.join(","))].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="product-import-template.csv"',
    },
  });
}
