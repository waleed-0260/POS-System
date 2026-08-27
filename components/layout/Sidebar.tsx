"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  Home,
  History,
  Boxes,
  PlusCircle,
  Upload,
  Tag,
  ChevronDown,
  LayoutDashboard,
  Truck,
  Settings,
  LogOut,
  Package,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";

const topNavItems = [
  { href: "/", label: "New Sale", icon: Home },
  { href: "/sales", label: "Sales History", icon: History },
  { href: "/inventory", label: "Inventory", icon: Boxes },
];

const bottomNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/orders", label: "Orders", icon: Truck, comingSoon: true },
  { href: "/settings", label: "Settings", icon: Settings },
];

const productsSubItems = [
  { href: "/products/add", label: "Add Product", icon: PlusCircle },
  { href: "/products/import", label: "Bulk Import", icon: Upload },
  { href: "/products/categories", label: "Categories", icon: Tag },
];

function NavLink({
  href,
  label,
  icon: Icon,
  isActive,
  comingSoon,
  badge,
  indent,
}: {
  href: string;
  label: string;
  icon: typeof Home;
  isActive: boolean;
  comingSoon?: boolean;
  badge?: React.ReactNode;
  indent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center justify-center gap-2.5 rounded-lg px-2 py-2 text-sm font-medium transition-colors md:justify-start md:px-3",
        indent && "md:pl-8",
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span className="hidden md:inline">{label}</span>
      {comingSoon && (
        <Badge variant="secondary" className="hidden md:inline-flex">
          Coming Soon
        </Badge>
      )}
      {badge}
    </Link>
  );
}

export function Sidebar({ inventoryBadge }: { inventoryBadge?: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isOwner = session?.user?.role === "OWNER";
  const onProductsRoute = pathname.startsWith("/products");
  const [productsOpen, setProductsOpen] = useState(onProductsRoute);

  const initials = session?.user?.name
    ?.split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <aside className="flex h-screen w-16 shrink-0 flex-col border-r bg-card md:w-60">
      <div className="flex h-14 items-center justify-center border-b px-2 md:justify-start md:px-4">
        <span className="hidden truncate font-heading text-sm font-semibold md:inline">
          {process.env.NEXT_PUBLIC_APP_NAME ?? "POS System"}
        </span>
        <span className="text-sm font-semibold md:hidden">POS</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
        {topNavItems.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            isActive={item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)}
            badge={item.href === "/inventory" ? inventoryBadge : undefined}
          />
        ))}

        {isOwner && (
          <Collapsible open={productsOpen || onProductsRoute} onOpenChange={setProductsOpen}>
            <CollapsibleTrigger className="flex w-full items-center justify-center gap-2.5 rounded-lg px-2 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:justify-start md:px-3">
              <Package className="size-4 shrink-0" />
              <span className="hidden md:inline">Products</span>
              <ChevronDown
                className={cn(
                  "hidden size-3.5 shrink-0 transition-transform md:ml-auto md:inline",
                  (productsOpen || onProductsRoute) && "rotate-180"
                )}
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="flex flex-col gap-1 pt-1">
              {productsSubItems.map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  isActive={pathname.startsWith(item.href)}
                  indent
                />
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        {bottomNavItems.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            isActive={pathname.startsWith(item.href)}
            comingSoon={item.comingSoon}
          />
        ))}
      </nav>

      <div className="flex flex-col gap-2 border-t p-2 md:p-3">
        <div className="flex items-center gap-2.5 px-1">
          <Avatar className="size-8 shrink-0">
            <AvatarFallback>{initials || "?"}</AvatarFallback>
          </Avatar>
          <div className="hidden min-w-0 flex-col md:flex">
            <span className="truncate text-sm font-medium">{session?.user?.name}</span>
            <Badge variant="outline" className="w-fit text-[0.65rem]">
              {session?.user?.role}
            </Badge>
          </div>
        </div>

        <Button
          variant="ghost"
          className="justify-center text-muted-foreground md:justify-start"
          onClick={() => signOut({ redirectTo: "/login" })}
        >
          <LogOut className="size-4" />
          <span className="hidden md:inline">Sign Out</span>
        </Button>
      </div>
    </aside>
  );
}
