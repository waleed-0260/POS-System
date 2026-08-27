"use client";

import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const pageTitles: Record<string, string> = {
  "/": "New Sale",
  "/sales": "Sales History",
  "/inventory": "Inventory",
  "/products/add": "Add Product",
  "/dashboard": "Dashboard",
  "/orders": "Orders",
  "/settings": "Settings",
};

function resolveTitle(pathname: string) {
  if (pageTitles[pathname]) return pageTitles[pathname];
  const match = Object.keys(pageTitles).find(
    (path) => path !== "/" && pathname.startsWith(path)
  );
  return match ? pageTitles[match] : "POS System";
}

export function Header() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const initials = session?.user?.name
    ?.split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background px-4 md:px-6">
      <h1 className="text-base font-semibold">{resolveTitle(pathname)}</h1>
      <Avatar className="size-8">
        <AvatarFallback>{initials || "?"}</AvatarFallback>
      </Avatar>
    </header>
  );
}
