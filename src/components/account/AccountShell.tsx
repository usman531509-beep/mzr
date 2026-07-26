"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";

const NAV = [
  { href: "/account",          label: "Overview" },
  { href: "/account/orders",   label: "Orders" },
  { href: "/account/payments", label: "Payments" },
  { href: "/account/profile",  label: "Profile" },
];

type User = { name?: string | null; email?: string | null };

export function AccountShell({
  user, children,
}: {
  user: User;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="portal-scope">
      <div className="container" style={{ padding: "24px 20px 48px" }}>
        <div className="account">
          {/* Left nav card — reference .acc-side (white card, red active row) */}
          <aside className="acc-side">
            <div style={{ padding: "2px 12px 12px" }}>
              <div className="font-head" style={{ fontSize: 24, lineHeight: 1, letterSpacing: ".02em" }}>
                My Account
              </div>
              <div
                className="muted"
                style={{ fontSize: 12, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                title={user.email ?? undefined}
              >
                {user.name || user.email || "Welcome"}
              </div>
            </div>
            {NAV.map((it) => {
              const active =
                pathname === it.href ||
                (it.href !== "/account" && pathname.startsWith(`${it.href}/`));
              return (
                <Link key={it.href} href={it.href} className={cn(active && "active")}>
                  {it.label}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="block w-full cursor-pointer rounded-md border-0 bg-transparent text-left hover:bg-soft"
              style={{ padding: "9px 12px", marginTop: 8, fontSize: 14, fontWeight: 500, color: "var(--bad)", fontFamily: "inherit" }}
            >
              Sign out
            </button>
          </aside>

          {/* Content column */}
          <div className="min-w-0">{children}</div>
        </div>
      </div>

      <Toaster />
    </div>
  );
}
