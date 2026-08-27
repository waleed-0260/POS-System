import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ProductForm } from "@/components/products/ProductForm";

export default async function AddProductPage() {
  const session = await auth();
  if (!session || session.user.role !== "OWNER") redirect("/");

  return <ProductForm mode="add" />;
}
