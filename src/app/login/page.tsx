"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn, getSession } from "next-auth/react";
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";

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
      const session = await getSession();
      const role = session?.user?.role;
      const safeCallback = callbackUrl.startsWith("/") ? callbackUrl : "";
      const dest =
        safeCallback ||
        (role === "ADMIN" || role === "MANAGER" || role === "STAFF" ? "/admin" : "/account");
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
            <Link href="/forgot-password" className="h-auth-forgot">Forgot password?</Link>
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

      <p className="h-auth-alt">
        Don&apos;t have an account? <Link href="/register">Start for free</Link>
        {"  ·  "}
        <Link href="/trade-account">Apply for trade</Link>
      </p>
    </AuthShell>
  );
}
