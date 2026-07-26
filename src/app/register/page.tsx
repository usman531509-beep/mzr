"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Loader2, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    <div className="container">
      <div className="auth">
        <h1>Create your account</h1>
        <p className="sub">Get a faster checkout, track orders and save your bikes.</p>

        <form onSubmit={submit}>
          {err && (
            <div className="mb-3.5 rounded-lg border border-red/30 bg-red-soft px-3 py-2.5 text-[13px] font-medium text-red">
              {err}
            </div>
          )}
          <div className="field">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe" required className="h-auto"
            />
          </div>
          <div className="field">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email" type="email" autoComplete="email"
              value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com" required className="h-auto"
            />
          </div>
          <div className="field">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password" type="password" autoComplete="new-password" minLength={6}
              value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters" required className="h-auto"
            />
          </div>
          <Button
            type="submit"
            className="h-11 w-full font-bold uppercase tracking-wider"
            disabled={loading}
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {loading ? "Creating account…" : "Create account"}
            {!loading && <ArrowRight className="h-3.5 w-3.5" />}
          </Button>
        </form>

        <p className="muted center" style={{ marginTop: 14, fontSize: 13 }}>
          Already registered? <Link href="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
