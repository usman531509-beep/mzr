"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

type Prefill = {
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
};

const emptyForm = (prefill: Prefill) => ({
  contactName: prefill.contactName ?? "",
  email: prefill.email ?? "",
  phone: prefill.phone ?? "",
  companyName: "",
  companyWebsite: "",
  vatNumber: "",
  businessType: "",
  monthlyVolume: "",
  address: prefill.address ?? "",
  city: prefill.city ?? "",
  country: prefill.country ?? "",
  notes: "",
});

export function TradeAccountForm({ prefill = {} }: { prefill?: Prefill }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState(() => emptyForm(prefill));

  const set = <K extends keyof typeof form>(k: K, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/trade-requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Could not submit your application.");
        return;
      }
      // Reset the form and show a success state. router.refresh() will swap
      // the page to the "Application received" card on the next render for
      // signed-in users; the success card below covers guest applicants too.
      setForm(emptyForm(prefill));
      setSubmitted(true);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Card>
        <CardContent className="flex flex-col items-start gap-3 p-6 sm:flex-row">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
          <div className="flex-1">
            <h2 className="font-semibold">Application submitted</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Thanks — we&apos;ve received your trade account request and will get
              back to you within 1–2 business days.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => setSubmitted(false)}
            >
              Submit another application
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <form onSubmit={submit} className="space-y-6">
          <Section title="Your details">
            <Field label="Full name" required>
              <Input value={form.contactName} onChange={(e) => set("contactName", e.target.value)} required />
            </Field>
            <Field label="Email" required>
              <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required />
            </Field>
            <Field label="Phone" required>
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} required />
            </Field>
          </Section>

          <Section title="Your business">
            <Field label="Company name" required>
              <Input value={form.companyName} onChange={(e) => set("companyName", e.target.value)} required />
            </Field>
            <Field label="Website">
              <Input placeholder="https://" value={form.companyWebsite} onChange={(e) => set("companyWebsite", e.target.value)} />
            </Field>
            <Field label="VAT / tax number">
              <Input value={form.vatNumber} onChange={(e) => set("vatNumber", e.target.value)} />
            </Field>
            <Field label="Business type">
              <Input placeholder="Workshop, dealer, fleet…" value={form.businessType} onChange={(e) => set("businessType", e.target.value)} />
            </Field>
            <Field label="Estimated monthly volume">
              <Input placeholder="e.g. £2,000–£5,000" value={form.monthlyVolume} onChange={(e) => set("monthlyVolume", e.target.value)} />
            </Field>
          </Section>

          <Section title="Business address">
            <Field label="Address" required full>
              <Input value={form.address} onChange={(e) => set("address", e.target.value)} required />
            </Field>
            <Field label="City">
              <Input value={form.city} onChange={(e) => set("city", e.target.value)} />
            </Field>
            <Field label="Country">
              <Input value={form.country} onChange={(e) => set("country", e.target.value)} />
            </Field>
          </Section>

          <Field label="Anything else we should know?" full>
            <Textarea rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </Field>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit application
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function Field({
  label, children, required, full,
}: { label: string; children: React.ReactNode; required?: boolean; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2" : undefined}>
      <Label className="mb-1.5 block text-xs">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
    </div>
  );
}
