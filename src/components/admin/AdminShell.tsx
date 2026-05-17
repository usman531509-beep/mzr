"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard, Package, Layers, Tag, Bike, ShoppingCart, Users, Briefcase, Receipt, Boxes,
  Activity, Truck, ClipboardList, MapPin, PackageCheck, Megaphone,
  Menu, ChevronLeft, ChevronDown, ExternalLink, Home, LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Breadcrumbs, type Crumb } from "@/components/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Toaster } from "@/components/ui/sonner";
import { canAccessModule, type ModuleKey } from "@/lib/permissions";

const NAV = [
  { group: "Overview", items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard }] },
  {
    group: "Catalogue",
    items: [
      { href: "/admin/products",    label: "Products",    icon: Package },
      { href: "/admin/stock",       label: "Stock",       icon: Boxes },
      { href: "/admin/categories",  label: "Categories",  icon: Layers },
      { href: "/admin/brands",      label: "Brands",      icon: Tag },
      { href: "/admin/bike-models", label: "Bike Models", icon: Bike },
    ],
  },
  {
    group: "Sales",
    items: [
      { href: "/admin/orders",   label: "Orders",   icon: ShoppingCart },
      { href: "/admin/expenses", label: "Expenses", icon: Receipt },
    ],
  },
  {
    group: "Marketing",
    items: [
      { href: "/admin/offers", label: "Offers", icon: Megaphone },
    ],
  },
  {
    group: "People",
    items: [
      { href: "/admin/users", label: "Users", icon: Users },
      {
        label: "Trader management",
        icon: Briefcase,
        children: [
          { href: "/admin/trade-requests",  label: "Trade Requests"  },
          { href: "/admin/trade-discounts", label: "Trade Discounts" },
        ],
      },
    ],
  },
  {
    group: "Procurement",
    items: [
      { href: "/admin/suppliers",       label: "Suppliers",       icon: Truck },
      { href: "/admin/purchase-orders", label: "Purchase Orders", icon: ClipboardList },
      { href: "/admin/stock-received",  label: "Stock Received",  icon: PackageCheck },
    ],
  },
  {
    group: "Shipping",
    items: [
      { href: "/admin/couriers", label: "Couriers", icon: MapPin },
    ],
  },
  {
    group: "Audit",
    items: [
      { href: "/admin/activity", label: "Activity log", icon: Activity },
    ],
  },
];

type NavLeaf = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };
type NavParent = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  children: { href: string; label: string }[];
};
type NavItem = NavLeaf | NavParent;
const isParent = (i: NavItem): i is NavParent => "children" in i;

// href → module key, used to gate sidebar items by permission.
const HREF_TO_KEY: Record<string, ModuleKey> = {
  "/admin":                 "dashboard",
  "/admin/products":        "products",
  "/admin/stock":           "stock",
  "/admin/categories":      "categories",
  "/admin/brands":          "brands",
  "/admin/bike-models":     "bike-models",
  "/admin/orders":          "orders",
  "/admin/expenses":        "expenses",
  "/admin/offers":          "offers",
  "/admin/users":           "users",
  "/admin/trade-requests":  "trade-requests",
  "/admin/trade-discounts": "trade-discounts",
  "/admin/suppliers":       "suppliers",
  "/admin/purchase-orders": "purchase-orders",
  "/admin/stock-received":  "stock-received",
  "/admin/couriers":        "couriers",
  "/admin/activity":        "activity",
};

function filterNav(role?: string, permissions: string[] = []) {
  return NAV
    .map((g) => {
      const items = (g.items as NavItem[]).flatMap<NavItem>((it) => {
        if (isParent(it)) {
          const visible = it.children.filter((c) => {
            const key = HREF_TO_KEY[c.href];
            return key && canAccessModule(role, permissions, key);
          });
          if (visible.length === 0) return [];
          return [{ ...it, children: visible }];
        }
        const key = HREF_TO_KEY[it.href];
        return key && canAccessModule(role, permissions, key) ? [it] : [];
      });
      return { ...g, items };
    })
    .filter((g) => g.items.length > 0);
}

type User = { name?: string | null; email?: string | null };

export function AdminShell({
  user, role, permissions = [], children,
}: {
  user: User;
  role?: string;
  permissions?: string[];
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobOpen, setMobOpen] = useState(false);
  const pathname = usePathname();
  const filteredNav = filterNav(role, permissions);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          // Sticky full-height column. Nav scrolls internally so the footer
          // stays pinned to the bottom and the collapse-toggle chevron on
          // the right edge isn't clipped by an outer overflow.
          "sticky top-0 hidden h-screen shrink-0 border-r border-border bg-card transition-[width] duration-200 lg:flex lg:flex-col",
          collapsed ? "w-[70px]" : "w-[240px]",
        )}
      >
        <SidebarHeader collapsed={collapsed} />
        <SidebarNav collapsed={collapsed} pathname={pathname} nav={filteredNav} />
        <SidebarUser collapsed={collapsed} user={user} />
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="absolute -right-3 top-20 hidden h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm hover:text-foreground lg:flex"
          aria-label="Toggle sidebar"
        >
          <ChevronLeft className={cn("h-3.5 w-3.5 transition", collapsed && "rotate-180")} />
        </button>
      </aside>

      {/* Mobile drawer */}
      <Sheet open={mobOpen} onOpenChange={setMobOpen}>
        <SheetContent side="left" className="flex w-[260px] flex-col p-0">
          <SheetHeader className="shrink-0 px-4 py-5"><SheetTitle>MZR Admin</SheetTitle></SheetHeader>
          <Separator />
          <SidebarNav collapsed={false} pathname={pathname} nav={filteredNav} onNavigate={() => setMobOpen(false)} />
          <SidebarUser collapsed={false} user={user} />
        </SheetContent>
      </Sheet>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-background/95 px-4 lg:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <Breadcrumbs items={adminCrumbs(pathname)} />
          {/* (back-compat link kept off the visible bar — breadcrumbs cover it) */}
          {false && (
            <Link href="/admin" className="hidden text-sm text-muted-foreground hover:text-foreground">
              Admin
            </Link>
          )}
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/" className="gap-2">
                <Home className="h-3.5 w-3.5" /> View store
              </Link>
            </Button>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>

      <Toaster />
    </div>
  );
}

const ADMIN_LABELS: Record<string, string> = {
  "/admin":              "Dashboard",
  "/admin/products":     "Products",
  "/admin/stock":        "Stock",
  "/admin/categories":   "Categories",
  "/admin/brands":       "Brands",
  "/admin/bike-models":  "Bike Models",
  "/admin/orders":       "Orders",
  "/admin/expenses":     "Expenses",
  "/admin/offers":       "Offers",
  "/admin/users":        "Users",
  "/admin/trade-requests": "Trade Requests",
  "/admin/trade-discounts": "Trade Discounts",
  "/admin/suppliers":       "Suppliers",
  "/admin/purchase-orders": "Purchase Orders",
  "/admin/stock-received":  "Stock Received",
  "/admin/couriers":        "Couriers",
  "/admin/activity":        "Activity log",
};

function adminCrumbs(pathname: string): Crumb[] {
  const items: Crumb[] = [{ label: "Admin", href: "/admin" }];
  // Find the deepest matching admin label.
  const matched = Object.keys(ADMIN_LABELS)
    .filter((p) => pathname === p || pathname.startsWith(`${p}/`))
    .sort((a, b) => b.length - a.length)[0];
  if (matched && matched !== "/admin") {
    items.push({ label: ADMIN_LABELS[matched] });
  } else if (pathname === "/admin") {
    items.push({ label: "Dashboard" });
  }
  return items;
}

function SidebarHeader({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="flex h-14 items-center gap-2.5 px-4">
      {!collapsed && (
        <div className="leading-tight">
          <div className="font-head text-sm font-bold uppercase tracking-wider">MZR Admin</div>
          <div className="text-[10px] text-muted-foreground">Parts management</div>
        </div>
      )}
    </div>
  );
}

type NavGroup = { group: string; items: NavItem[] };

function SidebarNav({
  collapsed, pathname, onNavigate, nav,
}: {
  collapsed: boolean;
  pathname: string;
  onNavigate?: () => void;
  nav: NavGroup[];
}) {
  return (
    <nav className="min-h-0 flex-1 space-y-4 overflow-y-auto px-2 py-2">
      {nav.length === 0 && !collapsed && (
        <div className="px-3 py-4 text-[11px] text-muted-foreground">
          No modules assigned. Ask an admin to grant access.
        </div>
      )}
      {nav.map((g) => (
        <div key={g.group}>
          {!collapsed && (
            <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {g.group}
            </div>
          )}
          <div className="space-y-0.5">
            {(g.items as NavItem[]).map((it) =>
              isParent(it) ? (
                <NavParentItem
                  key={it.label}
                  item={it}
                  pathname={pathname}
                  collapsed={collapsed}
                  onNavigate={onNavigate}
                />
              ) : (
                <NavLeafItem
                  key={it.href}
                  item={it}
                  pathname={pathname}
                  collapsed={collapsed}
                  onNavigate={onNavigate}
                />
              ),
            )}
          </div>
        </div>
      ))}
    </nav>
  );
}

function NavLeafItem({
  item, pathname, collapsed, onNavigate,
}: { item: NavLeaf; pathname: string; collapsed: boolean; onNavigate?: () => void }) {
  const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "flex h-9 items-center gap-2.5 rounded-md px-3 text-sm transition-colors",
        active
          ? "bg-primary/10 text-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
        collapsed && "justify-center px-0",
      )}
      title={collapsed ? item.label : undefined}
    >
      <item.icon className={cn("h-4 w-4 shrink-0", active && "text-primary")} />
      {!collapsed && <span className="truncate">{item.label}</span>}
      {!collapsed && active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}
    </Link>
  );
}

function NavParentItem({
  item, pathname, collapsed, onNavigate,
}: { item: NavParent; pathname: string; collapsed: boolean; onNavigate?: () => void }) {
  const isChildActive = item.children.some((c) => pathname === c.href || pathname.startsWith(`${c.href}/`));
  const [open, setOpen] = useState(isChildActive);
  // Keep open whenever a child becomes active (e.g. after navigation).
  if (isChildActive && !open) setOpen(true);

  if (collapsed) {
    // Collapsed: render children as flat icon buttons; the parent is implicit.
    return (
      <>
        {item.children.map((c) => {
          const active = pathname === c.href || pathname.startsWith(`${c.href}/`);
          return (
            <Link
              key={c.href}
              href={c.href}
              onClick={onNavigate}
              title={c.label}
              className={cn(
                "flex h-9 items-center justify-center rounded-md text-sm transition-colors",
                active ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <item.icon className={cn("h-4 w-4 shrink-0", active && "text-primary")} />
            </Link>
          );
        })}
      </>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-9 w-full items-center gap-2.5 rounded-md px-3 text-sm transition-colors",
          isChildActive
            ? "text-foreground"
            : "text-muted-foreground hover:bg-accent hover:text-foreground",
        )}
        aria-expanded={open}
      >
        <item.icon className={cn("h-4 w-4 shrink-0", isChildActive && "text-primary")} />
        <span className="truncate">{item.label}</span>
        <ChevronDown className={cn("ml-auto h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="mt-0.5 space-y-0.5 pl-7">
          {item.children.map((c) => {
            const active = pathname === c.href || pathname.startsWith(`${c.href}/`);
            return (
              <Link
                key={c.href}
                href={c.href}
                onClick={onNavigate}
                className={cn(
                  "flex h-8 items-center rounded-md px-3 text-[13px] transition-colors",
                  active
                    ? "bg-primary/10 text-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <span className="truncate">{c.label}</span>
                {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SidebarUser({ collapsed, user }: { collapsed: boolean; user: User }) {
  const initial = (user.name || user.email || "?").trim()[0]?.toUpperCase() || "?";
  return (
    <div className={cn("shrink-0 border-t border-border p-2", collapsed && "px-1")}>
      {/* User info row */}
      <div className={cn("mb-2 flex items-center gap-2 px-1", collapsed && "justify-center px-0")}>
        <Avatar className="h-7 w-7">
          <AvatarFallback className="text-[11px]">{initial}</AvatarFallback>
        </Avatar>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12px] font-medium leading-tight">{user.name ?? "Admin"}</div>
            <div className="truncate text-[10px] leading-tight text-muted-foreground">{user.email}</div>
          </div>
        )}
      </div>

      {/* Action buttons — always at the very bottom of the sidebar. */}
      <div className={cn("grid gap-1", collapsed ? "grid-cols-1" : "grid-cols-2")}>
        <Link
          href="/"
          title="Go to store"
          className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground"
        >
          <Home className="h-3.5 w-3.5" />
          {!collapsed && <span>Store</span>}
        </Link>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          title="Sign out"
          className="inline-flex items-center justify-center gap-1.5 rounded-md border border-destructive/30 bg-destructive/5 px-2 py-1 text-[11px] font-medium text-destructive transition hover:bg-destructive/15"
        >
          <LogOut className="h-3.5 w-3.5" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </div>
  );
}
