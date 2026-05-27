"use client";

import { useState } from "react";
import {
  Briefcase, Building2, Calendar, Eye, ExternalLink, FileText, Globe2,
  Mail, MapPin, Phone, ShieldCheck, User as UserIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export type TradeRequestDetails = {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  // Applicant
  contactName: string;
  email: string;
  phone: string;
  // Business
  companyName: string;
  companyWebsite: string | null;
  vatNumber: string | null;
  businessType: string | null;
  monthlyVolume: string | null;
  // UK postal address
  address: string;
  addressLine2: string | null;
  city: string | null;
  county: string | null;
  postcode: string | null;
  country: string | null;
  // Optional notes + decision metadata
  notes: string | null;
  decisionNote: string | null;
  decidedAt: string | null;
};

// Read-only modal showing the full trade-request application, split into the
// same three sections the public form uses (Your details / Your business /
// Business address) plus the applicant's notes. Approve / Reject still live
// on the row itself.

export function TradeRequestView({ request }: { request: TradeRequestDetails }) {
  const [open, setOpen] = useState(false);
  const fullAddress = [
    request.address,
    request.addressLine2,
    request.city,
    request.county,
    request.postcode,
    request.country,
  ].filter(Boolean).join(", ");

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
      >
        <Eye className="h-3.5 w-3.5" /> View
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex flex-wrap items-center gap-2">
              <DialogTitle className="text-xl font-extrabold uppercase tracking-tight">
                {request.companyName}
              </DialogTitle>
              <StatusPill status={request.status} />
            </div>
            <DialogDescription className="flex items-center gap-1.5 pt-1">
              <Calendar className="h-3 w-3" />
              Submitted {new Date(request.createdAt).toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short" })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            <Section icon={<UserIcon className="h-3.5 w-3.5" />} title="Your details">
              <Row icon={<UserIcon className="h-3.5 w-3.5" />} label="Full name" value={request.contactName} />
              <Row icon={<Mail className="h-3.5 w-3.5" />} label="Email" value={request.email} mono />
              <Row icon={<Phone className="h-3.5 w-3.5" />} label="Phone" value={request.phone} mono />
            </Section>

            <Section icon={<Building2 className="h-3.5 w-3.5" />} title="Your business">
              <Row icon={<Building2 className="h-3.5 w-3.5" />} label="Company" value={request.companyName} />
              <Row icon={<Briefcase className="h-3.5 w-3.5" />} label="Business type" value={request.businessType ?? "—"} />
              <Row icon={<ShieldCheck className="h-3.5 w-3.5" />} label="VAT number" value={request.vatNumber ?? "—"} mono={!!request.vatNumber} />
              <Row icon={<FileText className="h-3.5 w-3.5" />} label="Monthly volume" value={request.monthlyVolume ?? "—"} />
              {request.companyWebsite && (
                <Row
                  icon={<Globe2 className="h-3.5 w-3.5" />}
                  label="Website"
                  value={
                    <a
                      href={request.companyWebsite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      {request.companyWebsite}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  }
                />
              )}
            </Section>

            <Section icon={<MapPin className="h-3.5 w-3.5" />} title="Business address">
              <Row icon={<MapPin className="h-3.5 w-3.5" />} label="Address line 1" value={request.address} />
              {request.addressLine2 && (
                <Row icon={<MapPin className="h-3.5 w-3.5" />} label="Address line 2" value={request.addressLine2} />
              )}
              <Row icon={<MapPin className="h-3.5 w-3.5" />} label="Town / City" value={request.city ?? "—"} />
              {request.county && (
                <Row icon={<MapPin className="h-3.5 w-3.5" />} label="County" value={request.county} />
              )}
              <Row icon={<MapPin className="h-3.5 w-3.5" />} label="Postcode" value={request.postcode ?? "—"} mono={!!request.postcode} />
              <Row icon={<MapPin className="h-3.5 w-3.5" />} label="Country" value={request.country ?? "—"} />
              <div className="pt-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                Single line
              </div>
              <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
                {fullAddress || "—"}
              </div>
            </Section>

            {request.notes && (
              <Section icon={<FileText className="h-3.5 w-3.5" />} title="Notes from applicant">
                <div className="whitespace-pre-wrap rounded-md border border-border bg-muted/30 px-3 py-2.5 text-sm">
                  {request.notes}
                </div>
              </Section>
            )}

            {request.status !== "PENDING" && (
              <Section icon={<ShieldCheck className="h-3.5 w-3.5" />} title="Decision">
                {request.decidedAt && (
                  <Row
                    icon={<Calendar className="h-3.5 w-3.5" />}
                    label="Decided on"
                    value={new Date(request.decidedAt).toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short" })}
                  />
                )}
                {request.decisionNote && (
                  <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
                    {request.decisionNote}
                  </div>
                )}
              </Section>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function StatusPill({ status }: { status: "PENDING" | "APPROVED" | "REJECTED" }) {
  const className = status === "APPROVED"
    ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-500/30 hover:bg-emerald-500/15"
    : status === "REJECTED"
      ? "bg-rose-500/15 text-rose-300 ring-1 ring-inset ring-rose-500/30 hover:bg-rose-500/15"
      : "bg-amber-500/15 text-amber-300 ring-1 ring-inset ring-amber-500/30 hover:bg-amber-500/15";
  return <Badge className={className}>{status.charAt(0) + status.slice(1).toLowerCase()}</Badge>;
}

function Section({
  icon, title, children,
}: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-1.5 border-b border-border pb-1.5">
        <span className="text-red">{icon}</span>
        <h3 className="font-head text-[12px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          {title}
        </h3>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Row({
  icon, label, value, mono,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/10 bg-ink-700 text-muted-foreground">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className={`text-sm ${mono ? "font-mono" : ""}`}>{value}</div>
      </div>
    </div>
  );
}
