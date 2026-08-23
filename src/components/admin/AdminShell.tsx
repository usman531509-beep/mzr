"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard, Package, Layers, Tag, Bike, ShoppingCart, Users, Briefcase, Receipt, Boxes,
  Activity, Truck, ClipboardList, MapPin, PackageCheck, Megaphone, CreditCard,
  Menu, ChevronLeft, ChevronDown, ChevronRight, Home, LogOut, Settings,
  BarChart3, LineChart, PoundSterling,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type Crumb } from "@/components/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Toaster } from "@/components/ui/sonner";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { canAccessModule, type ModuleKey } from "@/lib/permissions";

const NAV = [
  { group: "Overview", items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard }] },
  {
    group: "Catalogue",
    items: [
      { href: "/admin/products",        label: "Products",        icon: Package },
      { href: "/admin/stock",           label: "Stock",           icon: Boxes },
      { href: "/admin/categories",      label: "Categories",      icon: Layers },
      { href: "/admin/brands",          label: "Bike Brands",     icon: Tag },
      { href: "/admin/product-brands",  label: "Product Brands",  icon: Tag },
      { href: "/admin/bike-models",     label: "Bike Models",     icon: Bike },
    ],
  },
  {
    group: "Sales",
    items: [
      { href: "/admin/orders",   label: "Orders",   icon: ShoppingCart },
      { href: "/admin/payments", label: "Payments", icon: CreditCard },
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
    group: "Reports",
    items: [
      { href: "/admin/reports",            label: "Overview",     icon: BarChart3, exact: true },
      { href: "/admin/reports/sales",      label: "Sales",        icon: LineChart },
      { href: "/admin/reports/inventory",  label: "Inventory",    icon: Boxes },
      { href: "/admin/reports/financial",  label: "Financial",    icon: PoundSterling },
    ],
  },
  {
    group: "Audit",
    items: [
      { href: "/admin/activity", label: "Activity log", icon: Activity },
    ],
  },
];

type NavLeaf = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** When true, the item only highlights for an exact pathname match.
   *  Used for "Overview"-style items that are conceptual siblings of
   *  their deeper neighbours rather than ancestors (e.g. /admin/reports
   *  sitting alongside /admin/reports/sales). */
  exact?: boolean;
};
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
  "/admin/product-brands":  "product-brands",
  "/admin/bike-models":     "bike-models",
  "/admin/orders":          "orders",
  "/admin/payments":        "payments",
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
  // Reports landing is visible to anyone with the operational `reports.view`
  // key — that's the lowest tier. The Financial sub-item is gated on the
  // stricter `reports.financial` key separately below.
  "/admin/reports":            "reports.view",
  "/admin/reports/sales":      "reports.view",
  "/admin/reports/inventory":  "reports.view",
  "/admin/reports/financial":  "reports.financial",
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
    // Viewport-locked shell: the whole admin fills exactly one screen and never
    // scrolls the window — only the <main> content column scrolls internally.
    // This keeps the dark sidebar pinned regardless of content height. (We
    // can't use `position: sticky` here because the storefront's global
    // `body { overflow-x: hidden }` turns <body> into the scroll container,
    // which stops a sticky child from pinning to the viewport.)
    <div className="portal-scope flex h-screen overflow-hidden bg-[#f4f5f7] text-foreground">
      {/* Desktop sidebar — themed light rail (white + red accents) to match
          the storefront. Full-height, fixed within the locked shell; its nav
          scrolls internally so the user/footer row stays pinned to the bottom. */}
      <aside
        className={cn(
          "relative hidden h-full shrink-0 border-r border-line bg-white text-ink transition-[width] duration-200 lg:flex lg:flex-col",
          collapsed ? "w-[70px]" : "w-[240px]",
        )}
      >
        <SidebarHeader collapsed={collapsed} />
        <SidebarNav collapsed={collapsed} pathname={pathname} nav={filteredNav} />
        <SidebarUser collapsed={collapsed} user={user} />
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="absolute -right-3 top-20 z-10 hidden h-6 w-6 items-center justify-center rounded-full border border-line bg-white text-muted-foreground shadow-sm hover:text-red lg:flex"
          aria-label="Toggle sidebar"
        >
          <ChevronLeft className={cn("h-3.5 w-3.5 transition", collapsed && "rotate-180")} />
        </button>
      </aside>

      {/* Mobile drawer — same dark treatment as the desktop rail */}
      <Sheet open={mobOpen} onOpenChange={setMobOpen}>
        <SheetContent side="left" className="flex w-[260px] flex-col border-line bg-white p-0 text-ink">
          <SheetHeader className="shrink-0 flex-row items-center gap-2 space-y-0 px-4 py-2.5 text-left">
            <Image src="/logo.png" alt="MZR Spare" width={617} height={405} className="h-16 w-auto shrink-0" />
            <SheetTitle className="text-base font-semibold text-muted-foreground">Admin</SheetTitle>
          </SheetHeader>
          <Separator className="bg-line" />
          <SidebarNav collapsed={false} pathname={pathname} nav={filteredNav} onNavigate={() => setMobOpen(false)} />
          <SidebarUser collapsed={false} user={user} />
        </SheetContent>
      </Sheet>

      {/* Main — light content column (.adm-main). Fills the locked shell and
          owns the only scroll region: the top bar stays fixed while <main>
          scrolls. */}
      <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        <header className="z-20 flex h-16 shrink-0 items-center gap-3 border-b border-line bg-white/90 px-4 backdrop-blur-sm lg:px-7">
          <Button variant="ghost" size="icon" className="-ml-1 lg:hidden" onClick={() => setMobOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <AdminBreadcrumb crumbs={adminCrumbs(pathname)} />

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <Link
              href="/"
              className="hidden h-9 items-center gap-2 rounded-full border border-line bg-white px-3.5 text-[13px] font-semibold text-ink/80 transition hover:border-red hover:bg-soft hover:text-red sm:inline-flex"
            >
              <Home className="h-4 w-4" /> View store
            </Link>
            <span className="hidden h-7 w-px bg-line sm:block" />
            <HeaderUserMenu user={user} role={role} />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-[#f4f5f7] p-4 lg:px-7 lg:py-6">{children}</main>
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
  "/admin/brands":       "Bike Brands",
  "/admin/product-brands": "Product Brands",
  "/admin/bike-models":  "Bike Models",
  "/admin/orders":       "Orders",
  "/admin/payments":     "Payments",
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
  "/admin/reports":            "Reports",
  "/admin/reports/sales":      "Sales report",
  "/admin/reports/inventory":  "Inventory report",
  "/admin/reports/financial":  "Financial report",
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

// Modern admin breadcrumb: a dashboard-icon root (→ /admin) followed by
// chevron-separated crumbs, with the current page bold. Intentionally its own
// component (not the storefront <Breadcrumbs>) so the admin trail can lead
// with an icon and use chevrons instead of the storefront's "Home · … · …".
function AdminBreadcrumb({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-0.5 text-sm">
      {crumbs.map((c, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <Fragment key={`${c.label}-${i}`}>
            {i > 0 && (
              <ChevronRight className="mx-0.5 h-4 w-4 shrink-0 text-muted-foreground/40" />
            )}
            {c.href && !isLast ? (
              <Link
                href={c.href}
                className="flex shrink-0 items-center gap-1.5 rounded-lg px-1.5 py-1 font-medium text-muted-foreground transition hover:bg-soft hover:text-red"
              >
                {i === 0 && <LayoutDashboard className="h-4 w-4 text-red" />}
                {c.label}
              </Link>
            ) : (
              <span className="flex min-w-0 items-center gap-1.5 px-1.5 py-1 font-semibold text-ink">
                {i === 0 && <LayoutDashboard className="h-4 w-4 shrink-0 text-red" />}
                <span className="truncate">{c.label}</span>
              </span>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}

// Top-bar account menu: shows who is signed in and opens profile settings.
function HeaderUserMenu({ user, role }: { user: User; role?: string }) {
  const name = user.name || user.email || "Account";
  const initial = (user.name || user.email || "?").trim()[0]?.toUpperCase() || "?";
  const roleLabel = role ? role.charAt(0) + role.slice(1).toLowerCase() : "Staff";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 text-left transition hover:bg-soft"
          aria-label="Account menu"
        >
          <Avatar className="h-9 w-9 ring-2 ring-red-soft">
            <AvatarFallback className="bg-red-soft text-[13px] font-bold text-red">{initial}</AvatarFallback>
          </Avatar>
          <span className="hidden min-w-0 leading-tight sm:block">
            <span className="block max-w-[140px] truncate text-[13px] font-semibold text-ink">{name}</span>
            <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">{roleLabel}</span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Signed in as {roleLabel.toLowerCase()}</span>
          <span className="truncate text-sm font-medium normal-case">{name}</span>
          {user.email && <span className="truncate text-[11px] font-normal text-muted-foreground">{user.email}</span>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/admin/settings" className="cursor-pointer">
            <Settings className="h-4 w-4" />
            Profile settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/" className="cursor-pointer">
            <Home className="h-4 w-4" />
            View store
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => signOut({ callbackUrl: "/" })}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SidebarHeader({ collapsed }: { collapsed: boolean }) {
  return (
    <div className={cn("flex h-[68px] shrink-0 items-center gap-2 border-b border-line px-[18px]", collapsed && "justify-center px-2")}>
      <Link href="/admin" aria-label="Admin dashboard" className="flex min-w-0 items-center gap-2">
        <Image
          src="/logo.png"
          alt="MZR Spare"
          width={617}
          height={405}
          priority
          className={cn("w-auto shrink-0", collapsed ? "h-8" : "h-16")}
        />
        {!collapsed && <span className="truncate text-base font-semibold text-muted-foreground">Admin</span>}
      </Link>
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
    <nav className="min-h-0 flex-1 overflow-y-auto py-2">
      {nav.length === 0 && !collapsed && (
        <div className="px-[18px] py-4 text-[11px] text-muted-foreground">
          No modules assigned. Ask an admin to grant access.
        </div>
      )}
      {nav.map((g) => (
        <div key={g.group}>
          {!collapsed && (
            // Reference `.adm-side h6` section label: dim grey, uppercase,
            // wide tracking, sitting flush with the 18px link gutter.
            <div className="px-[18px] pb-1.5 pt-3.5 text-[10px] font-bold uppercase tracking-[0.07em] text-muted-foreground">
              {g.group}
            </div>
          )}
          <div className="space-y-0.5 px-2">
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
  const active = pathname === item.href
    || (!item.exact && item.href !== "/admin" && pathname.startsWith(`${item.href}/`));
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "flex h-9 w-full items-center gap-2.5 rounded-lg px-3 text-[13px] no-underline transition-colors hover:no-underline",
        active
          ? "bg-red-soft font-semibold text-red"
          : "text-ink/75 hover:bg-soft hover:text-red",
        collapsed && "justify-center px-0",
      )}
      title={collapsed ? item.label : undefined}
    >
      <item.icon className={cn("h-4 w-4 shrink-0", active && "text-red")} />
      {!collapsed && <span className="truncate">{item.label}</span>}
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
                "flex h-9 w-full items-center justify-center rounded-lg text-[13px] no-underline transition-colors hover:no-underline",
                active
                  ? "bg-red-soft text-red"
                  : "text-ink/75 hover:bg-soft hover:text-red",
              )}
            >
              <item.icon className={cn("h-4 w-4 shrink-0", active && "text-red")} />
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
          "flex h-9 w-full items-center gap-2.5 rounded-lg px-3 text-[13px] transition-colors",
          isChildActive
            ? "font-semibold text-red"
            : "text-ink/75 hover:bg-soft hover:text-red",
        )}
        aria-expanded={open}
      >
        <item.icon className={cn("h-4 w-4 shrink-0", isChildActive && "text-red")} />
        <span className="truncate">{item.label}</span>
        <ChevronDown className={cn("ml-auto h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div>
          {item.children.map((c) => {
            const active = pathname === c.href || pathname.startsWith(`${c.href}/`);
            return (
              <Link
                key={c.href}
                href={c.href}
                onClick={onNavigate}
                className={cn(
                  "flex h-8 w-full items-center rounded-lg py-0 pl-[38px] pr-3 text-[12.5px] no-underline transition-colors hover:no-underline",
                  active
                    ? "bg-red-soft font-semibold text-red"
                    : "text-ink/75 hover:bg-soft hover:text-red",
                )}
              >
                <span className="truncate">{c.label}</span>
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
    <div className={cn("shrink-0 border-t border-line p-2", collapsed && "px-1")}>
      {/* User info row */}
      <div className={cn("mb-2 flex items-center gap-2 px-1", collapsed && "justify-center px-0")}>
        <Avatar className="h-7 w-7">
          <AvatarFallback className="bg-red-soft text-[11px] font-bold text-red">{initial}</AvatarFallback>
        </Avatar>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12px] font-medium leading-tight text-ink">{user.name ?? "Admin"}</div>
            <div className="truncate text-[10px] leading-tight text-muted-foreground">{user.email}</div>
          </div>
        )}
      </div>

      {/* Action buttons — always at the very bottom of the sidebar. */}
      <div className={cn("grid gap-1", collapsed ? "grid-cols-1" : "grid-cols-2")}>
        <Link
          href="/"
          title="Go to store"
          className="inline-flex items-center justify-center gap-1.5 rounded-md border border-line px-2 py-1 text-[11px] font-medium text-ink/75 transition hover:bg-soft hover:text-red"
        >
          <Home className="h-3.5 w-3.5" />
          {!collapsed && <span>Store</span>}
        </Link>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          title="Sign out"
          className="inline-flex items-center justify-center gap-1.5 rounded-md border border-red/30 bg-red-soft px-2 py-1 text-[11px] font-medium text-red transition hover:bg-red hover:text-white"
        >
          <LogOut className="h-3.5 w-3.5" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </div>
  );
}
