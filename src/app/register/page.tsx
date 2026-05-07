"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Loader2, ArrowRight, ShieldCheck, Truck, Headphones } from "lucide-react";

import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter,
} from "@/components/ui/card";

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
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-5xl px-4 pt-6 lg:px-6">
        <Breadcrumbs items={[{ label: "Create account" }]} />
      </div>
      <div className="mx-auto grid w-full max-w-5xl gap-8 px-4 pb-12 pt-6 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:px-6 lg:py-12">
        {/* Left: perks */}
        <div className="order-2 space-y-4 lg:order-1">
          <div>
            <h1 className="font-head text-3xl font-black uppercase leading-tight tracking-tight">
              Join <span className="text-primary">MZR Parts.</span>
            </h1>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              Faster checkout, order tracking, and price drop alerts on parts that fit your bike.
            </p>
          </div>
          <ul className="space-y-2.5">
            {[
              { icon: Truck, t: "Free shipping over £200", s: "Same-day dispatch before 3pm." },
              { icon: ShieldCheck, t: "Genuine parts guarantee", s: "OEM-grade, verified aftermarket." },
              { icon: Headphones, t: "Real human support", s: "Mon–Fri 9–6 · Sat 9–5." },
            ].map((p) => (
              <li key={p.t} className="flex items-start gap-3 rounded-md border border-border bg-card p-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <p.icon className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold">{p.t}</div>
                  <div className="text-[11px] text-muted-foreground">{p.s}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Right: form */}
        <Card className="order-1 w-full lg:order-2">
          <CardHeader>
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <span className="font-head text-lg font-black">M</span>
            </div>
            <CardTitle className="text-2xl">Create your account</CardTitle>
            <CardDescription>Takes less than a minute.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              {err && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {err}
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" autoComplete="new-password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" required />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                {loading ? "Creating account…" : "Create account"}
                {!loading && <ArrowRight className="h-3.5 w-3.5" />}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="border-t border-border pt-4">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
