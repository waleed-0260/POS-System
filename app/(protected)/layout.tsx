import { Suspense } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { InventoryAlertBadge } from "@/components/layout/InventoryAlertBadge";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar
        inventoryBadge={
          <Suspense fallback={null}>
            <InventoryAlertBadge />
          </Suspense>
        }
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
