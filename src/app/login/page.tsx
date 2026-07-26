"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn, getSession } from "next-auth/react";
import { Briefcase, Loader2, ShieldCheck, User as UserIcon, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const sp = useSearchParams();
  // Middleware sends users here as ?callbackUrl=…
  const callbackUrl = sp.get("callbackUrl") || sp.get("from") || "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const fillDemo = (e: string, p: string) => { setEmail(e); setPassword(p); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await signIn("credentials", { email, password, redirect: false });
      if (!res || res.error) {
        setError("Wrong email or password.");
        return;
      }
      // Pick the destination from the freshly-issued session so admins land
      // straight on /admin without a trampoline route.
      const session = await getSession();
      const role = session?.user?.role;
      const safeCallback = callbackUrl.startsWith("/") ? callbackUrl : "";
      const dest =
        safeCallback ||
        (role === "ADMIN" || role === "MANAGER" || role === "STAFF" ? "/admin" : "/account");
      // Hard navigation (not router.replace) so the browser fully commits the
      // Set-Cookie response from signIn before the next request fires. With a
      // soft navigation, middleware sometimes ran on the next route before the
      // JWT cookie was readable and bounced the user back to /login.
      window.location.href = dest;
    } catch {
      setError("Sign in failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const errorMessage = error;

  return (
    <div className="container">
      <div className="auth">
        <h1>Welcome back</h1>
        <p className="sub">Sign in to access orders, trade pricing and saved parts.</p>

        <form onSubmit={submit}>
          {errorMessage && (
            <div className="mb-3.5 rounded-lg border border-red/30 bg-red-soft px-3 py-2.5 text-[13px] font-medium text-red">
              {errorMessage}
            </div>
          )}
          <div className="field">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email" name="email" type="email" autoComplete="email"
              value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com" required
              className="h-auto"
            />
          </div>
          <div className="field">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <a href="#" className="text-[13px]">Forgot password?</a>
            </div>
            <Input
              id="password" name="password" type="password" autoComplete="current-password"
              value={password} onChange={(e) => setPassword(e.target.value)} required
              className="h-auto"
            />
          </div>
          <SubmitButton busy={busy} />
        </form>

        <p className="muted center" style={{ marginTop: 14, fontSize: 13 }}>
          New here? <Link href="/register">Create account</Link>
          {" · "}
          <Link href="/trade-account">Apply for trade</Link>
        </p>

        <div className="hr" />

        {/* Demo accounts — one click to autofill the form above. */}
        <div>
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Demo accounts · one click to autofill
          </div>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => fillDemo("admin@mzrparts.com", "admin123")}
              className="flex w-full items-center gap-3 rounded-lg border border-line bg-white p-3 text-left transition hover:border-red/50"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-red-soft text-red">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-ink">Administrator</span>
                <span className="block truncate text-[11px] text-muted-foreground">admin@mzrparts.com · admin123</span>
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            <button
              type="button"
              onClick={() => fillDemo("user@mzrparts.com", "user123")}
              className="flex w-full items-center gap-3 rounded-lg border border-line bg-white p-3 text-left transition hover:border-red/50"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-700">
                <UserIcon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-ink">Customer</span>
                <span className="block truncate text-[11px] text-muted-foreground">user@mzrparts.com · user123</span>
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            <button
              type="button"
              onClick={() => fillDemo("trader@mzrparts.com", "trader123")}
              className="flex w-full items-center gap-3 rounded-lg border border-line bg-white p-3 text-left transition hover:border-red/50"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-amber-500/10 text-amber-700">
                <Briefcase className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-ink">Trader</span>
                <span className="block truncate text-[11px] text-muted-foreground">trader@mzrparts.com · trader123</span>
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
            Admins land on the admin dashboard. Customers go to the storefront. Traders see discounted pricing on their portal.
          </p>
        </div>
      </div>
    </div>
  );
}

function SubmitButton({ busy }: { busy: boolean }) {
  return (
    <Button
      type="submit"
      className="h-11 w-full font-bold uppercase tracking-wider"
      disabled={busy}
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
      {busy ? "Signing in…" : "Sign in"}
      {!busy && <ArrowRight className="h-3.5 w-3.5" />}
    </Button>
  );
}
