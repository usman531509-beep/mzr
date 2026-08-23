"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard, ShoppingBag, CreditCard, User as UserIcon,
  Menu, ChevronLeft, ChevronRight, ChevronDown, Home, LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Toaster } from "@/components/ui/sonner";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Only highlight on an exact match (Overview sits alongside its siblings). */
  exact?: boolean;
};

const NAV: NavItem[] = [
  { href: "/account",          label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/account/orders",   label: "Orders",   icon: ShoppingBag },
  { href: "/account/payments", label: "Payments", icon: CreditCard },
  { href: "/account/profile",  label: "Profile",  icon: UserIcon },
];

const LABELS: Record<string, string> = {
  "/account":          "Overview",
  "/account/orders":   "Orders",
  "/account/payments": "Payments",
  "/account/profile":  "Profile",
};

type User = { name?: string | null; email?: string | null };

// Customer portal shell — mirrors the admin console (AdminShell) so the two
// portals feel identical: a light sidebar rail on desktop, a slide-in drawer on
// mobile, and a top bar with a breadcrumb + account menu. The storefront chrome
// is hidden on /account (SiteChrome HIDE_ALL) so this owns the whole screen.
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
    <div className="portal-scope flex h-screen overflow-hidden bg-[#f4f5f7] text-foreground">
      {/* Desktop sidebar rail */}
      <aside
        className={cn(
          "relative hidden h-full shrink-0 border-r border-line bg-white text-ink transition-[width] duration-200 lg:flex lg:flex-col",
          collapsed ? "w-[70px]" : "w-[240px]",
        )}
      >
        <SidebarHeader collapsed={collapsed} />
        <SidebarNav collapsed={collapsed} pathname={pathname} />
        <SidebarUser collapsed={collapsed} user={user} />
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="absolute -right-3 top-20 z-10 hidden h-6 w-6 items-center justify-center rounded-full border border-line bg-white text-muted-foreground shadow-sm hover:text-red lg:flex"
          aria-label="Toggle sidebar"
        >
          <ChevronLeft className={cn("h-3.5 w-3.5 transition", collapsed && "rotate-180")} />
        </button>
      </aside>

      {/* Mobile drawer */}
      <Sheet open={mobOpen} onOpenChange={setMobOpen}>
        <SheetContent side="left" className="z-[100] flex w-[264px] flex-col border-line bg-white p-0 text-ink">
          <SheetHeader className="shrink-0 flex-row items-center gap-2 space-y-0 px-4 py-2.5 text-left">
            <Image src="/logo.png" alt="MZR Spare" width={617} height={405} className="h-16 w-auto shrink-0" />
            <SheetTitle className="text-base font-semibold text-muted-foreground">Customer</SheetTitle>
          </SheetHeader>
          <Separator className="bg-line" />
          <SidebarNav collapsed={false} pathname={pathname} onNavigate={() => setMobOpen(false)} />
          <SidebarUser collapsed={false} user={user} />
        </SheetContent>
      </Sheet>

      {/* Main column */}
      <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        <header className="z-20 flex h-16 shrink-0 items-center gap-3 border-b border-line bg-white/90 px-4 backdrop-blur-sm lg:px-7">
          <Button variant="ghost" size="icon" className="-ml-1 lg:hidden" onClick={() => setMobOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <AccountBreadcrumb pathname={pathname} />

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <Link
              href="/"
              className="hidden h-9 items-center gap-2 rounded-full border border-line bg-white px-3.5 text-[13px] font-semibold text-ink/80 transition hover:border-red hover:bg-soft hover:text-red sm:inline-flex"
            >
              <Home className="h-4 w-4" /> View store
            </Link>
            <span className="hidden h-7 w-px bg-line sm:block" />
            <HeaderUserMenu user={user} />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-[#f4f5f7] p-4 lg:px-7 lg:py-6">{children}</main>
      </div>

      <Toaster />
    </div>
  );
}

function SidebarHeader({ collapsed }: { collapsed: boolean }) {
  return (
    <div className={cn("flex h-[68px] shrink-0 items-center gap-2 border-b border-line px-[18px]", collapsed && "justify-center px-2")}>
      <Link href="/account" aria-label="My account" className="flex min-w-0 items-center gap-2">
        <Image
          src="/logo.png"
          alt="MZR Spare"
          width={617}
          height={405}
          priority
          className={cn("w-auto shrink-0", collapsed ? "h-8" : "h-16")}
        />
        {!collapsed && <span className="truncate text-base font-semibold text-muted-foreground">Customer</span>}
      </Link>
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
    <nav className="min-h-0 flex-1 overflow-y-auto py-2">
      <div className="space-y-0.5 px-2">
        {NAV.map((it) => {
          const active = it.exact
            ? pathname === it.href
            : pathname === it.href || pathname.startsWith(`${it.href}/`);
          return (
            <Link
              key={it.href}
              href={it.href}
              onClick={onNavigate}
              title={collapsed ? it.label : undefined}
              className={cn(
                "flex h-9 w-full items-center gap-2.5 rounded-lg px-3 text-[13px] no-underline transition-colors hover:no-underline",
                active
                  ? "bg-red-soft font-semibold text-red"
                  : "text-ink/75 hover:bg-soft hover:text-red",
                collapsed && "justify-center px-0",
              )}
            >
              <it.icon className={cn("h-4 w-4 shrink-0", active && "text-red")} />
              {!collapsed && <span className="truncate">{it.label}</span>}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function SidebarUser({ collapsed, user }: { collapsed: boolean; user: User }) {
  const initial = (user.name || user.email || "?").trim()[0]?.toUpperCase() || "?";
  return (
    <div className={cn("shrink-0 border-t border-line p-2", collapsed && "px-1")}>
      <div className={cn("mb-2 flex items-center gap-2 px-1", collapsed && "justify-center px-0")}>
        <Avatar className="h-7 w-7">
          <AvatarFallback className="bg-red-soft text-[11px] font-bold text-red">{initial}</AvatarFallback>
        </Avatar>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12px] font-medium leading-tight text-ink">{user.name ?? "Customer"}</div>
            <div className="truncate text-[10px] leading-tight text-muted-foreground">{user.email}</div>
          </div>
        )}
      </div>
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

function AccountBreadcrumb({ pathname }: { pathname: string }) {
  const matched = Object.keys(LABELS)
    .filter((p) => pathname === p || pathname.startsWith(`${p}/`))
    .sort((a, b) => b.length - a.length)[0];
  const section = matched ? LABELS[matched] : "Overview";
  const crumbs = [{ label: "Account", href: "/account" }, { label: section }];
  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-0.5 text-sm">
      {crumbs.map((c, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <Fragment key={`${c.label}-${i}`}>
            {i > 0 && <ChevronRight className="mx-0.5 h-4 w-4 shrink-0 text-muted-foreground/40" />}
            {c.href && !isLast ? (
              <Link
                href={c.href}
                className="flex shrink-0 items-center gap-1.5 rounded-lg px-1.5 py-1 font-medium text-muted-foreground transition hover:bg-soft hover:text-red"
              >
                <LayoutDashboard className="h-4 w-4 text-red" />
                {c.label}
              </Link>
            ) : (
              <span className="flex min-w-0 items-center px-1.5 py-1 font-semibold text-ink">
                <span className="truncate">{c.label}</span>
              </span>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}

function HeaderUserMenu({ user }: { user: User }) {
  const name = user.name || user.email || "Account";
  const initial = (user.name || user.email || "?").trim()[0]?.toUpperCase() || "?";
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
            <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">Customer</span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Signed in</span>
          <span className="truncate text-sm font-medium normal-case">{name}</span>
          {user.email && <span className="truncate text-[11px] font-normal text-muted-foreground">{user.email}</span>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/account/profile" className="cursor-pointer">
            <UserIcon className="h-4 w-4" />
            Profile
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
