"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, Mail } from "lucide-react";
import { AuthShell } from "@/components/AuthShell";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [devLink, setDevLink] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }
      setSent(true);
      if (data.devLink) setDevLink(data.devLink);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell>
      <h1>Forgot password?</h1>
      <p className="sub">Enter your email and we&apos;ll send you a link to reset it.</p>

      {sent ? (
        <>
          <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] px-4 py-3.5 text-[13.5px] leading-relaxed text-emerald-800">
            If an account exists for <b>{email}</b>, we&apos;ve sent a reset link.
            Check your inbox.
          </div>
          {devLink && (
            <div className="mb-4 rounded-xl border border-line bg-soft p-3.5 text-[12.5px]">
              <div className="mb-1.5 font-bold uppercase tracking-wider text-muted-foreground">
                Dev · email not wired yet — open this link
              </div>
              <a href={devLink} className="break-all font-medium text-red">{devLink}</a>
            </div>
          )}
        </>
      ) : (
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
                id="email" type="email" autoComplete="email"
                value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com" required
              />
            </div>
          </div>
          <button type="submit" className="h-auth-btn" disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {busy ? "Sending…" : "Send reset link"}
            {!busy && <ArrowRight className="h-4 w-4" />}
          </button>
        </form>
      )}

      <p className="h-auth-alt">
        Remembered it? <Link href="/login">Back to sign in</Link>
      </p>
    </AuthShell>
  );
}
