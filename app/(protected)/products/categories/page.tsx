import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { CategoryManager } from "@/components/products/CategoryManager";

export default async function CategoriesPage() {
  const session = await auth();
  if (!session || session.user.role !== "OWNER") redirect("/");

  return (
    <div className="mx-auto max-w-5xl">
      <CategoryManager />
    </div>
  );
}
