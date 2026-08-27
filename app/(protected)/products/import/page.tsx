import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { BulkImport } from "@/components/products/BulkImport";

export default async function ImportProductsPage() {
  const session = await auth();
  if (!session || session.user.role !== "OWNER") redirect("/");

  return (
    <div className="mx-auto max-w-6xl">
      <BulkImport />
    </div>
  );
}
