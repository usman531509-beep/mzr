"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import {
  ArrowRight, Eye, EyeOff, Loader2, Lock, Mail, User as UserIcon,
} from "lucide-react";

import { AuthShell } from "@/components/AuthShell";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setErr(d.error || "Registration failed");
      setLoading(false);
      return;
    }
    await signIn("credentials", { email, password, redirect: false });
    router.push("/");
    router.refresh();
  };

  return (
    <AuthShell>
      <h1>Create your account</h1>
      <p className="sub">Get a faster checkout, track orders and save your bikes.</p>

      <form onSubmit={submit}>
        {err && (
          <div className="mb-4 rounded-xl border border-red/30 bg-red-soft px-3.5 py-2.5 text-[13px] font-medium text-red">
            {err}
          </div>
        )}

        <div className="h-field">
          <label className="h-field-label" htmlFor="name">Full name</label>
          <div className="h-inp">
            <UserIcon className="lead" />
            <input
              id="name" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe" required
            />
          </div>
        </div>

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

        <div className="h-field">
          <label className="h-field-label" htmlFor="password">Password</label>
          <div className="h-inp">
            <Lock className="lead" />
            <input
              id="password" type={showPass ? "text" : "password"} autoComplete="new-password"
              minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters" required
            />
            <button
              type="button" className="eye" aria-label="Toggle password visibility"
              onClick={() => setShowPass((v) => !v)}
            >
              {showPass ? <EyeOff className="h-[17px] w-[17px]" /> : <Eye className="h-[17px] w-[17px]" />}
            </button>
          </div>
        </div>

        <button type="submit" className="h-auth-btn" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {loading ? "Creating account…" : "Create account"}
          {!loading && <ArrowRight className="h-4 w-4" />}
        </button>
      </form>

      <p className="h-auth-alt">
        Already registered? <Link href="/login">Sign in</Link>
      </p>
    </AuthShell>
  );
}
