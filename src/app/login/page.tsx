"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn, getSession } from "next-auth/react";
import {
  ArrowRight, Briefcase, Eye, EyeOff, Loader2, Lock, Mail,
  ShieldCheck, User as UserIcon,
} from "lucide-react";

import { AuthShell } from "@/components/AuthShell";

export default function LoginPage() {
  const sp = useSearchParams();
  // Middleware sends users here as ?callbackUrl=…
  const callbackUrl = sp.get("callbackUrl") || sp.get("from") || "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
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
      // Hard navigation so the browser commits the Set-Cookie from signIn before
      // the next request fires (a soft nav sometimes raced middleware).
      window.location.href = dest;
    } catch {
      setError("Sign in failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell>
      <h1>Welcome back</h1>
      <p className="sub">Please enter your details to sign in.</p>

      <form onSubmit={submit}>
        {error && (
          <div className="mb-4 rounded-xl border border-red/30 bg-red-soft px-3.5 py-2.5 text-[13px] font-medium text-red">
            {error}
          </div>
        )}

        <div className="h-field">
          <label className="h-field-label" htmlFor="email">Email Address</label>
          <div className="h-inp">
            <Mail className="lead" />
            <input
              id="email" name="email" type="email" autoComplete="email"
              value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com" required
            />
          </div>
        </div>

        <div className="h-field">
          <div className="h-field-row">
            <label className="h-field-label" htmlFor="password">Password</label>
            <a href="#" className="h-auth-forgot">Forgot password?</a>
          </div>
          <div className="h-inp">
            <Lock className="lead" />
            <input
              id="password" name="password" type={showPass ? "text" : "password"}
              autoComplete="current-password"
              value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password" required
            />
            <button
              type="button" className="eye" aria-label="Toggle password visibility"
              onClick={() => setShowPass((v) => !v)}
            >
              {showPass ? <EyeOff className="h-[17px] w-[17px]" /> : <Eye className="h-[17px] w-[17px]" />}
            </button>
          </div>
        </div>

        <button type="submit" className="h-auth-btn" disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {busy ? "Signing in…" : "Sign In"}
          {!busy && <ArrowRight className="h-4 w-4" />}
        </button>
      </form>

      {/* Demo accounts — one click to autofill the form above. */}
      <div className="mt-7">
        <div className="mb-2.5 flex items-center gap-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          <span className="h-px flex-1 bg-line" />
          Demo accounts · one-click fill
          <span className="h-px flex-1 bg-line" />
        </div>
        <div className="space-y-2">
          <DemoBtn
            icon={<ShieldCheck className="h-4 w-4" />} tone="bg-red-soft text-red"
            title="Administrator" creds="admin@mzrparts.com · admin123"
            onClick={() => fillDemo("admin@mzrparts.com", "admin123")}
          />
          <DemoBtn
            icon={<UserIcon className="h-4 w-4" />} tone="bg-emerald-500/10 text-emerald-700"
            title="Customer" creds="user@mzrparts.com · user123"
            onClick={() => fillDemo("user@mzrparts.com", "user123")}
          />
          <DemoBtn
            icon={<Briefcase className="h-4 w-4" />} tone="bg-amber-500/10 text-amber-700"
            title="Trader" creds="trader@mzrparts.com · trader123"
            onClick={() => fillDemo("trader@mzrparts.com", "trader123")}
          />
        </div>
      </div>

      <p className="h-auth-alt">
        Don&apos;t have an account? <Link href="/register">Start for free</Link>
        {"  ·  "}
        <Link href="/trade-account">Apply for trade</Link>
      </p>
    </AuthShell>
  );
}

function DemoBtn({
  icon, tone, title, creds, onClick,
}: {
  icon: React.ReactNode; tone: string; title: string; creds: string; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl border border-line bg-white p-3 text-left transition hover:border-red/50 hover:shadow-sm"
    >
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tone}`}>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-ink">{title}</span>
        <span className="block truncate text-[11px] text-muted-foreground">{creds}</span>
      </span>
      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
    </button>
  );
}
