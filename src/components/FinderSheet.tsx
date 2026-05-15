"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";

type Brand = { id: string; name: string; slug: string };
type Model = { id: string; name: string; brandId: string; yearStart: number; yearEnd: number };

const ANY = "__any__";

export function FinderSheet({
  open, onClose, brands, models,
}: {
  open: boolean;
  onClose: () => void;
  brands: Brand[];
  models: Model[];
}) {
  const router = useRouter();
  const [brandSlug, setBrandSlug] = useState("");
  const [modelId, setModelId]     = useState("");
  const [year, setYear]           = useState("");

  // Reset state when sheet closes so reopening starts blank.
  useEffect(() => {
    if (!open) {
      setBrandSlug("");
      setModelId("");
      setYear("");
    }
  }, [open]);

  const brandId = useMemo(
    () => brands.find((b) => b.slug === brandSlug)?.id,
    [brandSlug, brands],
  );
  const filteredModels = useMemo(
    () => (brandId ? models.filter((m) => m.brandId === brandId) : []),
    [brandId, models],
  );
  const selectedModel = useMemo(
    () => models.find((m) => m.id === modelId),
    [modelId, models],
  );
  // Year picker shows the model's full range as a single combined option
  // (e.g. "2020–2022"). The server treats a "yyyy-yyyy" value as overlap
  // matching against ProductCompatibility.
  const yearRangeValue = selectedModel
    ? `${selectedModel.yearStart}-${selectedModel.yearEnd}`
    : "";
  const yearRangeLabel = selectedModel
    ? `${selectedModel.yearStart}–${selectedModel.yearEnd}`
    : "";

  // Reset dependent fields when parent changes.
  useEffect(() => { setModelId(""); setYear(""); }, [brandSlug]);
  useEffect(() => { setYear(""); }, [modelId]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = new URLSearchParams();
    if (brandSlug) p.set("brand", brandSlug);
    if (modelId)   p.set("model", modelId);
    if (year)      p.set("year",  year);
    onClose();
    router.push(`/products${p.toString() ? `?${p.toString()}` : ""}`);
  };

  const empty = brands.length === 0;

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent side="bottom" className="rounded-t-2xl p-0 sm:max-w-none">
        <div className="border-b border-border bg-[linear-gradient(135deg,rgba(232,21,27,0.18),rgba(232,21,27,0.04))] px-5 py-4">
          <SheetHeader>
            <SheetTitle className="font-head text-lg font-extrabold uppercase tracking-wide">
              Find your part
            </SheetTitle>
            <SheetDescription className="text-[11.5px]">
              Pick your bike we'll show only matching parts.
            </SheetDescription>
          </SheetHeader>
        </div>

        {empty ? (
          <div className="px-5 py-8 text-center">
            <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Catalogue setup pending
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              No bike brands or models are registered yet. Check back once the admin populates the catalogue.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-3 px-5 py-5 pb-7">
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Brand</Label>
              <Select
                value={brandSlug || ANY}
                onValueChange={(v) => setBrandSlug(v === ANY ? "" : v)}
              >
                <SelectTrigger><SelectValue placeholder="Select brand" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY}>All brands</SelectItem>
                  {brands.map((b) => <SelectItem key={b.id} value={b.slug}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Model</Label>
              <Select
                value={modelId || ANY}
                onValueChange={(v) => setModelId(v === ANY ? "" : v)}
                disabled={!brandSlug}
              >
                <SelectTrigger>
                  <SelectValue placeholder={brandSlug ? "Select model" : "Pick a brand first"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY}>Any model</SelectItem>
                  {filteredModels.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name} ({m.yearStart}–{m.yearEnd})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Year</Label>
              <Select
                value={year || ANY}
                onValueChange={(v) => setYear(v === ANY ? "" : v)}
                disabled={!selectedModel}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedModel ? "Any year" : "Pick a model first"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY}>Any year</SelectItem>
                  {yearRangeValue && (
                    <SelectItem value={yearRangeValue}>{yearRangeLabel}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="mt-2 h-12 w-full text-base">
              <Search className="h-4 w-4" /> Find my parts
            </Button>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
