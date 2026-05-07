"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Briefcase, Loader2, ShieldCheck, User as UserIcon, ArrowRight } from "lucide-react";

import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function LoginPage() {
  const sp = useSearchParams();
  // Middleware sends users here as ?callbackUrl=…
  const callbackUrl = sp.get("callbackUrl") || sp.get("from") || "";
  const errorParam = sp.get("error");

  // Hidden CSRF token — fetched on mount from NextAuth's csrf endpoint.
  const [csrf, setCsrf] = useState("");
  const [csrfReady, setCsrfReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/csrf", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setCsrf(d.csrfToken);
        setCsrfReady(true);
      })
      .catch(() => setCsrfReady(true)); // still let user submit; server will reject if needed
    return () => { cancelled = true; };
  }, []);

  // Where to land after auth — /post-login decides admin vs storefront.
  const postLoginUrl = `/post-login${callbackUrl ? `?to=${encodeURIComponent(callbackUrl)}` : ""}`;

  // Demo-account autofill (controlled inputs).
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const fillDemo = (e: string, p: string) => { setEmail(e); setPassword(p); };

  const errorMessage =
    errorParam === "CredentialsSignin"
      ? "Wrong email or password."
      : errorParam
        ? "Sign in failed. Please try again."
        : null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-5xl px-4 pt-6 lg:px-6">
        <Breadcrumbs items={[{ label: "Sign in" }]} />
      </div>
      <div className="mx-auto grid w-full max-w-5xl gap-8 px-4 pb-12 pt-6 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:px-6 lg:py-12">
        {/* Left: form */}
        <Card className="w-full">
          <CardHeader>
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <span className="font-head text-lg font-black">M</span>
            </div>
            <CardTitle className="text-2xl">Welcome back</CardTitle>
            <CardDescription>Sign in to manage your orders or admin panel.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              method="POST"
              action="/api/auth/callback/credentials"
              className="space-y-4"
            >
              <input type="hidden" name="csrfToken" value={csrf} />
              <input type="hidden" name="callbackUrl" value={postLoginUrl} />
              {errorMessage && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {errorMessage}
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email" name="email" type="email" autoComplete="email"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com" required
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <a href="#" className="text-xs text-muted-foreground hover:text-foreground">Forgot?</a>
                </div>
                <Input
                  id="password" name="password" type="password" autoComplete="current-password"
                  value={password} onChange={(e) => setPassword(e.target.value)} required
                />
              </div>
              <SubmitButton ready={csrfReady} />
            </form>
          </CardContent>
          <CardFooter className="border-t border-border pt-4">
            <p className="text-sm text-muted-foreground">
              New to MZR Parts?{" "}
              <Link href="/register" className="font-medium text-primary hover:underline">
                Create an account
              </Link>
            </p>
          </CardFooter>
        </Card>

        {/* Right: brand + demo accounts */}
        <div className="space-y-4">
          <div>
            <h1 className="font-head text-3xl font-black uppercase leading-tight tracking-tight">
              Built for <span className="text-primary">riders.</span>
            </h1>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Manage products, orders, and inventory — or shop genuine spare parts for your bike.
            </p>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Demo accounts
              </CardTitle>
              <CardDescription>One click to autofill.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <button
                type="button"
                onClick={() => fillDemo("admin@mzrparts.com", "admin123")}
                className="flex w-full items-center gap-3 rounded-md border border-border bg-background p-3 text-left transition hover:border-primary/40"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">Administrator</div>
                  <div className="truncate text-[11px] text-muted-foreground">admin@mzrparts.com · admin123</div>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
              <button
                type="button"
                onClick={() => fillDemo("user@mzrparts.com", "user123")}
                className="flex w-full items-center gap-3 rounded-md border border-border bg-background p-3 text-left transition hover:border-primary/40"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-300">
                  <UserIcon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">Customer</div>
                  <div className="truncate text-[11px] text-muted-foreground">user@mzrparts.com · user123</div>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
              <button
                type="button"
                onClick={() => fillDemo("trader@mzrparts.com", "trader123")}
                className="flex w-full items-center gap-3 rounded-md border border-border bg-background p-3 text-left transition hover:border-primary/40"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-amber-500/10 text-amber-300">
                  <Briefcase className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">Trader</div>
                  <div className="truncate text-[11px] text-muted-foreground">trader@mzrparts.com · trader123</div>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
              <Separator className="my-2" />
              <p className="text-[11px] text-muted-foreground">
                Admins land on the admin dashboard. Customers go to the storefront. Traders see discounted pricing on their portal.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SubmitButton({ ready }: { ready: boolean }) {
  return (
    <Button type="submit" className="w-full" disabled={!ready}>
      {!ready ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
      {!ready ? "Loading…" : "Sign in"}
      {ready && <ArrowRight className="h-3.5 w-3.5" />}
    </Button>
  );
}
