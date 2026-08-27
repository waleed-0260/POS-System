import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/src/prisma/db";
import { ProductForm, type ExistingProduct } from "@/components/products/ProductForm";
import { Button } from "@/components/ui/button";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "OWNER") redirect("/");

  const { id } = await params;
  const product = await db.orm.public.Product.first({ id });

  if (!product) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-16 text-center">
        <h1 className="text-lg font-semibold">Product not found</h1>
        <p className="text-sm text-muted-foreground">
          It may have been removed, or the link is incorrect.
        </p>
        <Button render={<Link href="/inventory" />}>Back to Inventory</Button>
      </div>
    );
  }

  const existing: ExistingProduct = {
    id: product.id,
    name: product.name,
    sku: product.sku,
    categoryId: product.categoryId,
    subCategoryId: product.subCategoryId,
    brand: product.brand,
    description: product.description,
    buyingPrice: Number(product.buyingPrice),
    sellingPrice: Number(product.sellingPrice),
    quantity: product.quantity,
    lowStockThreshold: product.lowStockThreshold,
    unit: product.unit,
    imageUrl: product.imageUrl,
    isActive: product.isActive,
  };

  return <ProductForm mode="edit" product={existing} />;
}
