"use client";

import { useState } from "react";
import { ExternalLink, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";

type Courier = {
  id: string;
  name: string;
  slug: string;
  trackingUrl: string;
  logoUrl: string | null;
};

export function TrackClient({
  couriers,
  initialCourierId,
  initialNumber,
}: {
  couriers: Courier[];
  initialCourierId: string;
  initialNumber: string;
}) {
  const [courierId, setCourierId] = useState(initialCourierId || couriers[0]?.id || "");
  const [number, setNumber] = useState(initialNumber);
  const selected = couriers.find((c) => c.id === courierId) ?? null;

  if (couriers.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
        No couriers are set up yet. Please check back soon.
      </div>
    );
  }

  // Build the final URL by appending the tracking number to the courier URL.
  // If the URL already has a trailing slash we just concatenate; otherwise we
  // add one so the number lands as a clean path segment.
  const buildTrackingUrl = (base: string, tn: string) => {
    const n = encodeURIComponent(tn.trim());
    if (!n) return base;
    return base.endsWith("/") ? `${base}${n}` : `${base}/${n}`;
  };

  const finalUrl = selected && number.trim()
    ? buildTrackingUrl(selected.trackingUrl, number)
    : selected?.trackingUrl ?? "";

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !number.trim()) return;
    if (typeof window !== "undefined") {
      window.open(finalUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <form onSubmit={handleTrack} className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs">Courier</Label>
        <Select value={courierId} onValueChange={setCourierId}>
          <SelectTrigger>
            <SelectValue placeholder="Select a courier" />
          </SelectTrigger>
          <SelectContent>
            {couriers.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Tracking number</Label>
        <Input
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          placeholder="Paste the tracking number from your order"
          autoFocus
        />
      </div>

      <Button type="submit" className="w-full" disabled={!selected || !number.trim()}>
        <Search className="h-3.5 w-3.5" /> Track on {selected?.name ?? "courier"}
      </Button>

      {selected && (
        <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2 min-w-0">
            {selected.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={selected.logoUrl} alt="" className="h-5 w-5 shrink-0 rounded bg-white object-contain p-0.5" />
            )}
            <span className="truncate">{finalUrl || selected.trackingUrl}</span>
          </div>
          <a
            href={finalUrl || selected.trackingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1 text-primary hover:underline"
          >
            Open <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}
    </form>
  );
}
