"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LayoutDashboard, ShoppingBag, User, LogOut, ArrowLeft } from "lucide-react";

import { cn } from "@/lib/utils";
import { Breadcrumbs, type Crumb } from "@/components/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Toaster } from "@/components/ui/sonner";

const NAV = [
  { href: "/account",         label: "Overview", icon: LayoutDashboard },
  { href: "/account/orders",  label: "Orders",   icon: ShoppingBag },
  { href: "/account/profile", label: "Profile",  icon: User },
];

function accountCrumbs(pathname: string): Crumb[] {
  const items: Crumb[] = [{ label: "My Account", href: "/account" }];
  const match = NAV.find((n) =>
    n.href !== "/account" && (pathname === n.href || pathname.startsWith(`${n.href}/`)),
  );
  if (match) items.push({ label: match.label });
  return items;
}

export function AccountShell({
  user, children,
}: {
  user: { name?: string | null; email?: string | null };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const initial = (user.name || user.email || "?").trim()[0]?.toUpperCase() || "?";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[260px_1fr] lg:px-6">
        <aside className="space-y-4">
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to store
          </Link>

          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <Avatar><AvatarFallback>{initial}</AvatarFallback></Avatar>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{user.name ?? "Welcome"}</div>
                <div className="truncate text-[11px] text-muted-foreground">{user.email}</div>
              </div>
            </div>
          </div>

          <nav className="space-y-0.5">
            {NAV.map((n) => {
              const active = pathname === n.href || (n.href !== "/account" && pathname.startsWith(n.href));
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={cn(
                    "flex h-9 items-center gap-2.5 rounded-md px-3 text-sm transition-colors",
                    active
                      ? "bg-primary/10 text-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  <n.icon className={cn("h-4 w-4", active && "text-primary")} />
                  <span>{n.label}</span>
                  {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}
                </Link>
              );
            })}
            <Button
              variant="ghost"
              className="mt-2 w-full justify-start gap-2.5 px-3 text-muted-foreground hover:text-foreground"
              onClick={() => signOut({ callbackUrl: "/" })}
            >
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </nav>
        </aside>

        <main>
          <Breadcrumbs className="mb-5" items={accountCrumbs(pathname)} />
          {children}
        </main>
      </div>
      <Toaster />
    </div>
  );
}
