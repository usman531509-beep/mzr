"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2, CheckCircle2, Loader2, MapPin, Send, User as UserIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type Prefill = {
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
};

const BUSINESS_TYPES = [
  "Independent workshop",
  "Dealership",
  "Fleet operator",
  "Delivery / courier business",
  "Racing team / track day",
  "Reseller",
  "Other",
];

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
  addressLine2: "",
  city: prefill.city ?? "",
  county: "",
  postcode: "",
  country: prefill.country ?? "United Kingdom",
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
      <Card className="border-emerald-500/30 bg-emerald-500/[0.04]">
        <CardContent className="flex flex-col items-start gap-4 p-8 sm:flex-row">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
            <CheckCircle2 className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <h2 className="font-head text-xl font-extrabold uppercase tracking-wide">
              Application submitted
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              Thanks — we&apos;ve received your trade account request and will
              get back to you within 1–2 business days at the email you provided.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-5"
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
    <form onSubmit={submit} className="space-y-5">
      <Section
        icon={<UserIcon className="h-3.5 w-3.5" />}
        title="Your details"
        sub="The person we'll be talking to about your trade account."
      >
        <Field label="Full name" required>
          <Input
            value={form.contactName}
            onChange={(e) => set("contactName", e.target.value)}
            placeholder="Sarah Khan"
            required
          />
        </Field>
        <Field label="Email" required>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="sarah@workshop.co.uk"
            required
          />
        </Field>
        <Field label="Phone" required>
          <Input
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="07xxx xxxxxx"
            required
          />
        </Field>
      </Section>

      <Section
        icon={<Building2 className="h-3.5 w-3.5" />}
        title="Your business"
        sub="So we know who we're setting up an account for."
      >
        <Field label="Company name" required>
          <Input
            value={form.companyName}
            onChange={(e) => set("companyName", e.target.value)}
            placeholder="Northside Motors Ltd"
            required
          />
        </Field>
        <Field label="Website (optional)">
          <Input
            placeholder="https://"
            value={form.companyWebsite}
            onChange={(e) => set("companyWebsite", e.target.value)}
          />
        </Field>
        <Field label="VAT number (optional)">
          <Input
            value={form.vatNumber}
            onChange={(e) => set("vatNumber", e.target.value)}
            placeholder="GB123456789"
          />
        </Field>
        <Field label="Business type">
          <Select
            value={form.businessType}
            onValueChange={(v) => set("businessType", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose one…" />
            </SelectTrigger>
            <SelectContent>
              {BUSINESS_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Estimated monthly volume" full>
          <Input
            placeholder="e.g. £2,000–£5,000"
            value={form.monthlyVolume}
            onChange={(e) => set("monthlyVolume", e.target.value)}
          />
        </Field>
      </Section>

      <Section
        icon={<MapPin className="h-3.5 w-3.5" />}
        title="Business address"
        sub="UK trading address used on the trade account record."
      >
        <Field label="Address line 1" required full>
          <Input
            value={form.address}
            onChange={(e) => set("address", e.target.value)}
            placeholder="House number and street"
            autoComplete="address-line1"
            required
          />
        </Field>
        <Field label="Address line 2 (optional)" full>
          <Input
            value={form.addressLine2}
            onChange={(e) => set("addressLine2", e.target.value)}
            placeholder="Unit, building, estate"
            autoComplete="address-line2"
          />
        </Field>
        <Field label="Town / City">
          <Input
            value={form.city}
            onChange={(e) => set("city", e.target.value)}
            autoComplete="address-level2"
          />
        </Field>
        <Field label="County (optional)">
          <Input
            value={form.county}
            onChange={(e) => set("county", e.target.value)}
            placeholder="e.g. Greater London"
            autoComplete="address-level1"
          />
        </Field>
        <Field label="Postcode">
          <Input
            value={form.postcode}
            onChange={(e) => set("postcode", e.target.value.toUpperCase())}
            placeholder="SW1A 1AA"
            autoComplete="postal-code"
          />
        </Field>
        <Field label="Country">
          <Input
            value={form.country}
            onChange={(e) => set("country", e.target.value)}
            autoComplete="country-name"
          />
        </Field>
      </Section>

      <Section icon={null} title="Anything else?" sub="Optional context, references, fleet size, anything that helps us approve faster.">
        <Field label="Notes" full>
          <Textarea
            rows={4}
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Tell us a bit about your business and what you'd typically buy."
          />
        </Field>
      </Section>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-ink-800/60 p-4">
        <div className="text-[12px] text-white/55">
          We review every application typical turnaround 1–2 business days.
          You&apos;ll hear from us at the email above.
        </div>
        <Button
          type="submit"
          disabled={submitting}
          size="lg"
          className="gap-2"
        >
          {submitting
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <Send className="h-3.5 w-3.5" />}
          {submitting ? "Submitting…" : "Submit application"}
        </Button>
      </div>
    </form>
  );
}

function Section({
  icon, title, sub, children,
}: {
  icon: React.ReactNode;
  title: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div className="flex items-start gap-2.5 border-b border-border pb-3">
          {icon && (
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-red/30 bg-red/10 text-red">
              {icon}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="font-head text-[15px] font-extrabold uppercase tracking-wider text-white">
              {title}
            </h3>
            {sub && <p className="mt-0.5 text-[12px] text-white/55">{sub}</p>}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">{children}</div>
      </CardContent>
    </Card>
  );
}

function Field({
  label, children, required, full,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  full?: boolean;
}) {
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
