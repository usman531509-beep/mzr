"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { AuthShell } from "@/components/AuthShell";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetForm />
    </Suspense>
  );
}

function ResetForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not reset your password.");
        return;
      }
      setDone(true);
      setTimeout(() => router.push("/login"), 1600);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell>
      <h1>Set a new password</h1>
      <p className="sub">Choose a strong password for your account.</p>

      {!token ? (
        <div className="rounded-xl border border-red/30 bg-red-soft px-4 py-3.5 text-[13.5px] leading-relaxed text-red">
          This reset link is missing its token. Please use the link from your
          email, or{" "}
          <Link href="/forgot-password" className="font-bold">request a new one</Link>.
        </div>
      ) : done ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] px-4 py-3.5 text-[13.5px] text-emerald-800">
          Password updated. Redirecting you to sign in…
        </div>
      ) : (
        <form onSubmit={submit}>
          {error && (
            <div className="mb-4 rounded-xl border border-red/30 bg-red-soft px-3.5 py-2.5 text-[13px] font-medium text-red">
              {error}
            </div>
          )}
          <div className="h-field">
            <label className="h-field-label" htmlFor="password">New password</label>
            <div className="h-inp">
              <Lock className="lead" />
              <input
                id="password" type={show ? "text" : "password"} autoComplete="new-password"
                minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters" required
              />
              <button
                type="button" className="eye" aria-label="Toggle password visibility"
                onClick={() => setShow((v) => !v)}
              >
                {show ? <EyeOff className="h-[17px] w-[17px]" /> : <Eye className="h-[17px] w-[17px]" />}
              </button>
            </div>
          </div>
          <div className="h-field">
            <label className="h-field-label" htmlFor="confirm">Confirm password</label>
            <div className="h-inp">
              <Lock className="lead" />
              <input
                id="confirm" type={show ? "text" : "password"} autoComplete="new-password"
                minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)}
                placeholder="Re-enter password" required
              />
            </div>
          </div>
          <button type="submit" className="h-auth-btn" disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {busy ? "Updating…" : "Reset password"}
            {!busy && <ArrowRight className="h-4 w-4" />}
          </button>
        </form>
      )}

      <p className="h-auth-alt">
        <Link href="/login">Back to sign in</Link>
      </p>
    </AuthShell>
  );
}
