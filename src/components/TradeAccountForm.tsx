"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ArrowRight, Building2, Check, CheckCircle2, Loader2, MapPin,
  Send, User as UserIcon,
} from "lucide-react";
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

// Wizard steps — title/sub shown in the body, short label under each dot.
const STEPS = [
  { label: "Details",  title: "Your details",     sub: "The person we'll be talking to about your trade account." },
  { label: "Business", title: "Your business",    sub: "So we know who we're setting up an account for." },
  { label: "Address",  title: "Business address", sub: "UK trading address used on the trade account record." },
  { label: "Finish",   title: "Anything else?",   sub: "Optional context that helps us approve you faster." },
];

// Required fields gating each step's "Next".
const REQUIRED: (keyof ReturnType<typeof emptyForm>)[][] = [
  ["contactName", "email", "phone"],
  ["companyName"],
  ["address"],
  [],
];

export function TradeAccountForm({ prefill = {} }: { prefill?: Prefill }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState(() => emptyForm(prefill));

  const set = <K extends keyof typeof form>(k: K, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const last = STEPS.length - 1;
  const stepValid = (s: number) =>
    REQUIRED[s].every((k) => String(form[k] ?? "").trim() !== "");

  const next = () => { if (stepValid(step)) setStep((s) => Math.min(s + 1, last)); };
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stepValid(0) || !stepValid(1) || !stepValid(2)) return;
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
      setStep(0);
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
      <div className="rounded-[22px] border border-emerald-500/30 bg-emerald-500/[0.05] p-8">
        <div className="flex flex-col items-start gap-4 sm:flex-row">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700">
            <CheckCircle2 className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <h2 className="font-head text-xl font-extrabold uppercase tracking-wide text-ink">
              Application submitted
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              Thanks — we&apos;ve received your trade account request and will
              get back to you within 1–2 business days at the email you provided.
            </p>
            <Button variant="outline" size="sm" className="mt-5" onClick={() => setSubmitted(false)}>
              Submit another application
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="h-wizard">
      {/* Stepper */}
      <div className="h-wizard-steps">
        {STEPS.map((s, i) => {
          const done = step > i;
          const active = step === i;
          return (
            <div key={s.label} className={`h-wizard-step${active ? " active" : ""}${done ? " done" : ""}`}>
              <div className="dot">{done ? <Check /> : i + 1}</div>
              <span className="lbl">{s.label}</span>
            </div>
          );
        })}
      </div>

      {/* Body */}
      <div className="h-wizard-body">
        <h3>{STEPS[step].title}</h3>
        <p className="step-sub">{STEPS[step].sub}</p>

        {step === 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" required full>
              <Input value={form.contactName} onChange={(e) => set("contactName", e.target.value)} placeholder="Sarah Khan" />
            </Field>
            <Field label="Email" required>
              <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="sarah@workshop.co.uk" />
            </Field>
            <Field label="Phone" required>
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="07xxx xxxxxx" />
            </Field>
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Company name" required full>
              <Input value={form.companyName} onChange={(e) => set("companyName", e.target.value)} placeholder="Northside Motors Ltd" />
            </Field>
            <Field label="Website (optional)">
              <Input placeholder="https://" value={form.companyWebsite} onChange={(e) => set("companyWebsite", e.target.value)} />
            </Field>
            <Field label="VAT number (optional)">
              <Input value={form.vatNumber} onChange={(e) => set("vatNumber", e.target.value)} placeholder="GB123456789" />
            </Field>
            <Field label="Business type">
              <Select value={form.businessType} onValueChange={(v) => set("businessType", v)}>
                <SelectTrigger><SelectValue placeholder="Choose one…" /></SelectTrigger>
                <SelectContent>
                  {BUSINESS_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Estimated monthly volume">
              <Input placeholder="e.g. £2,000–£5,000" value={form.monthlyVolume} onChange={(e) => set("monthlyVolume", e.target.value)} />
            </Field>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Address line 1" required full>
              <Input value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="House number and street" autoComplete="address-line1" />
            </Field>
            <Field label="Address line 2 (optional)" full>
              <Input value={form.addressLine2} onChange={(e) => set("addressLine2", e.target.value)} placeholder="Unit, building, estate" autoComplete="address-line2" />
            </Field>
            <Field label="Town / City">
              <Input value={form.city} onChange={(e) => set("city", e.target.value)} autoComplete="address-level2" />
            </Field>
            <Field label="County (optional)">
              <Input value={form.county} onChange={(e) => set("county", e.target.value)} placeholder="e.g. Greater London" autoComplete="address-level1" />
            </Field>
            <Field label="Postcode">
              <Input value={form.postcode} onChange={(e) => set("postcode", e.target.value.toUpperCase())} placeholder="SW1A 1AA" autoComplete="postal-code" />
            </Field>
            <Field label="Country">
              <Input value={form.country} onChange={(e) => set("country", e.target.value)} autoComplete="country-name" />
            </Field>
          </div>
        )}

        {step === 3 && (
          <>
            <Field label="Notes (optional)" full>
              <Textarea
                rows={4}
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Tell us a bit about your business and what you'd typically buy."
              />
            </Field>
            <div className="mt-4 rounded-xl border border-line bg-soft p-4 text-[12.5px] leading-relaxed text-muted-foreground">
              <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-ink">Review</div>
              <div><b className="text-ink">{form.contactName}</b> · {form.email} · {form.phone}</div>
              <div>{[form.companyName, form.businessType].filter(Boolean).join(" · ")}</div>
              <div>{[form.address, form.city, form.postcode, form.country].filter(Boolean).join(", ")}</div>
            </div>
          </>
        )}

        {error && (
          <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}
      </div>

      {/* Footer nav */}
      <div className="h-wizard-foot">
        {step > 0 ? (
          <Button type="button" variant="outline" onClick={back} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        ) : (
          <span className="text-[12px] text-muted-foreground">Step {step + 1} of {STEPS.length}</span>
        )}

        {step < last ? (
          <Button type="button" onClick={next} disabled={!stepValid(step)} className="gap-2">
            Next <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button type="submit" disabled={submitting} className="gap-2">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            {submitting ? "Submitting…" : "Submit application"}
          </Button>
        )}
      </div>
    </form>
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
