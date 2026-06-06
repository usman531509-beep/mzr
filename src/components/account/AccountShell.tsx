"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard, ShoppingBag, User as UserIcon, CreditCard,
  Menu, ChevronLeft, Home, LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Breadcrumbs, type Crumb } from "@/components/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Toaster } from "@/components/ui/sonner";

const NAV = [
  {
    group: "My Account",
    items: [
      { href: "/account",          label: "Overview", icon: LayoutDashboard },
      { href: "/account/orders",   label: "Orders",   icon: ShoppingBag },
      { href: "/account/payments", label: "Payments", icon: CreditCard },
      { href: "/account/profile",  label: "Profile",  icon: UserIcon },
    ],
  },
];

type NavLeaf = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };

type User = { name?: string | null; email?: string | null };

export function AccountShell({
  user, children,
}: {
  user: User;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobOpen, setMobOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="portal-scope flex min-h-screen bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside
        // Radix Sheet (rendered below) injects `aria-hidden` /
        // `data-aria-hidden` on portal siblings when it opens for screen-
        // reader scoping. That DOM mutation can race with the React
        // hydration pass and trip "server attributes don't match client"
        // warnings on the sidebar even though our code never sets those
        // attributes. Suppressing here is the standard workaround — the
        // rest of the tree still hydrates strictly.
        suppressHydrationWarning
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 border-r border-border bg-card transition-[width] duration-200 lg:flex lg:flex-col",
          collapsed ? "w-[70px]" : "w-[240px]",
        )}
      >
        <SidebarHeader collapsed={collapsed} />
        <SidebarNav collapsed={collapsed} pathname={pathname} />
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
          <SheetHeader className="shrink-0 px-4 py-5"><SheetTitle>MZR Account</SheetTitle></SheetHeader>
          <Separator />
          <SidebarNav collapsed={false} pathname={pathname} onNavigate={() => setMobOpen(false)} />
          <SidebarUser collapsed={false} user={user} />
        </SheetContent>
      </Sheet>

      {/* Main */}
      {/* Radix Sheet (rendered above) injects aria-hidden / data-aria-hidden
          on every sibling element when its portal mounts — including this
          main pane — which mismatches the SSR markup and trips a hydration
          warning. Suppressing attribute diffs is the standard workaround;
          the rest of the tree still hydrates strictly. */}
      <div suppressHydrationWarning className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-background/95 px-4 lg:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <Breadcrumbs items={accountCrumbs(pathname)} />
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

const ACCOUNT_LABELS: Record<string, string> = {
  "/account":          "Overview",
  "/account/orders":   "Orders",
  "/account/payments": "Payments",
  "/account/profile":  "Profile",
};

function accountCrumbs(pathname: string): Crumb[] {
  const items: Crumb[] = [{ label: "My Account", href: "/account" }];
  const matched = Object.keys(ACCOUNT_LABELS)
    .filter((p) => pathname === p || pathname.startsWith(`${p}/`))
    .sort((a, b) => b.length - a.length)[0];
  if (matched && matched !== "/account") {
    items.push({ label: ACCOUNT_LABELS[matched] });
  } else if (pathname === "/account") {
    items.push({ label: "Overview" });
  }
  return items;
}

function SidebarHeader({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="flex h-14 items-center gap-2.5 px-4">
      {!collapsed && (
        <div className="leading-tight">
          <div className="font-head text-sm font-bold uppercase tracking-wider">MZR Account</div>
          <div className="text-[10px] text-muted-foreground">Your portal</div>
        </div>
      )}
    </div>
  );
}

function SidebarNav({
  collapsed, pathname, onNavigate,
}: {
  collapsed: boolean;
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="min-h-0 flex-1 space-y-4 overflow-y-auto px-2 py-2">
      {NAV.map((g) => (
        <div key={g.group}>
          {!collapsed && (
            <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {g.group}
            </div>
          )}
          <div className="space-y-0.5">
            {g.items.map((it) => (
              <NavLeafItem
                key={it.href}
                item={it}
                pathname={pathname}
                collapsed={collapsed}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function NavLeafItem({
  item, pathname, collapsed, onNavigate,
}: { item: NavLeaf; pathname: string; collapsed: boolean; onNavigate?: () => void }) {
  const active = pathname === item.href || (item.href !== "/account" && pathname.startsWith(item.href));
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

function SidebarUser({ collapsed, user }: { collapsed: boolean; user: User }) {
  const initial = (user.name || user.email || "?").trim()[0]?.toUpperCase() || "?";
  return (
    <div className={cn("shrink-0 border-t border-border p-2", collapsed && "px-1")}>
      <div className={cn("mb-2 flex items-center gap-2 px-1", collapsed && "justify-center px-0")}>
        <Avatar className="h-7 w-7">
          <AvatarFallback className="text-[11px]">{initial}</AvatarFallback>
        </Avatar>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12px] font-medium leading-tight">{user.name ?? "Welcome"}</div>
            <div className="truncate text-[10px] leading-tight text-muted-foreground">{user.email}</div>
          </div>
        )}
      </div>

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
