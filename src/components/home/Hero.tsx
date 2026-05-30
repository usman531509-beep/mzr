"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

type Brand = { id: string; name: string; slug: string };
type Model = { id: string; name: string; brandId: string; yearStart: number; yearEnd: number };

export function Hero({ brands, models }: { brands: Brand[]; models: Model[] }) {
  const router = useRouter();
  const hasCatalog = brands.length > 0;
  const [brandSlug, setBrandSlug] = useState("");
  const [modelId, setModelId] = useState("");
  const [year, setYear] = useState("");

  const brandId = useMemo(() => brands.find((b) => b.slug === brandSlug)?.id, [brandSlug, brands]);
  const filteredModels = useMemo(
    () => (brandId ? models.filter((m) => m.brandId === brandId) : []),
    [brandId, models],
  );
  const selectedModel = useMemo(
    () => models.find((m) => m.id === modelId),
    [modelId, models],
  );
  const yearRangeValue = selectedModel
    ? `${selectedModel.yearStart}-${selectedModel.yearEnd}`
    : "";
  const yearRangeLabel = selectedModel
    ? `${selectedModel.yearStart}–${selectedModel.yearEnd}`
    : "";

  useEffect(() => { setModelId(""); setYear(""); }, [brandSlug]);
  useEffect(() => { setYear(""); }, [modelId]);

  const find = (e: React.FormEvent) => {
    e.preventDefault();
    const p = new URLSearchParams();
    if (brandSlug) p.set("brand", brandSlug);
    if (modelId) p.set("model", modelId);
    if (year) p.set("year", year);
    router.push(`/products?${p.toString()}`);
  };

  return (
    <section className="relative flex items-center overflow-hidden bg-ink lg:min-h-[85vh]">
      <div className="absolute inset-0 hero-radial" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-red/60" />

      <div className="relative z-[2] mx-auto grid w-full max-w-site items-start gap-4 px-[var(--gutter)] pt-2 pb-5 sm:gap-6 sm:pb-6 lg:gap-12 lg:pb-20 lg:grid-cols-2">
        {/* MOBILE-ONLY logo on top, centered. Hidden on lg+. */}
        <div className="order-1 flex justify-center lg:hidden">
          <Image
            src="/logo.png"
            alt="MZR Spare — Motorbike Parts Specialist"
            width={617}
            height={405}
            priority
            className="h-44 w-auto sm:h-52"
          />
        </div>

        {/* LEFT — Hero copy. On mobile shows AFTER the finder (order-3). */}
        <div className="order-3 lg:order-1">
          {/* Desktop-only logo above the eyebrow (mobile centered logo lives in order-1). */}
          <div className="mb-2 hidden lg:block">
            <Image
              src="/logo.png"
              alt="MZR Spare — Motorbike Parts Specialist"
              width={717}
              height={605}
              priority
              className="h-64 w-auto xl:h-[360px]"
            />
          </div>

          <div className="hero-in mb-2 flex items-center gap-3">
            <span className="pulse-dot" />
            <span className="eyebrow">Find parts that fits your bike</span>
            <span className="h-px flex-1 bg-gradient-to-r from-red/50 to-transparent" />
          </div>

          <h1 className="hero-in delay-1 mb-1 font-head font-black uppercase leading-none tracking-tight">
            <span className="mb-1.5 block max-w-fit font-mono text-[11px] font-semibold uppercase tracking-wider text-white/60">
              Genuine + aftermarket spares
            </span>
            <span className="block leading-[0.9] text-white" style={{ fontSize: "clamp(40px,6vw,80px)" }}>
              Built for <span className="text-red">riders.</span>
            </span>
            <span
              className="block leading-[0.9] tracking-tight"
              style={{
                fontSize: "clamp(40px,5.5vw,72px)",
                color: "transparent",
                WebkitTextStroke: "1.5px rgba(255,255,255,0.2)",
              }}
            >
              Priced for life.
            </span>
          </h1>

          <p className="hero-in delay-2 mb-5 max-w-md text-[15px] font-light leading-relaxed text-white/65">
            Thousands of engine, body, brake & electrical parts in stock. Filter by your bike model and year see only what fits.
          </p>

          <div className="hero-in delay-3 flex flex-wrap gap-3.5">
            <a href="/products" className="btn-red">
              Shop all parts
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </a>
            <a href="/trade-account" className="btn-outline">Open a trade account</a>
          </div>
        </div>

        {/* RIGHT — Product finder panel. On mobile shows BETWEEN logo and copy (order-2). */}
        <div className="hero-in order-2 relative pt-0 lg:order-2 lg:pt-28">
          {/* Decorative gold star badge */}
          
          <div className="hero-panel-top relative overflow-hidden rounded-xl border border-white/10 bg-ink-800 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
            <div className="flex items-center gap-3 border-b border-white/10 bg-[linear-gradient(135deg,rgba(232,21,27,0.22),rgba(232,21,27,0.06))] px-4 py-3 sm:px-6 sm:py-5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red shadow-[0_4px_16px_rgba(232,21,27,0.4)] sm:h-12 sm:w-12">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="sm:h-6 sm:w-6">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
              </div>
              <div>
                <strong className="block font-head text-base font-extrabold uppercase tracking-wide text-white sm:text-lg">Find your part</strong>
                <span className="text-[11px] text-white/60 sm:text-[11.5px]">Pick your bike we'll show only matching parts</span>
              </div>
            </div>

            {hasCatalog ? (
              <form onSubmit={find} className="flex flex-col gap-2 px-4 py-4 sm:gap-2.5 sm:px-6 sm:py-5">
                <div>
                  <label className="ilabel">Brand</label>
                  <select className="ifield" value={brandSlug} onChange={(e) => setBrandSlug(e.target.value)}>
                    <option value="">Select brand</option>
                    {brands.map((b) => <option key={b.id} value={b.slug}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="ilabel">Model</label>
                  <select className="ifield" value={modelId} onChange={(e) => setModelId(e.target.value)} disabled={!brandSlug}>
                    <option value="">{brandSlug ? "Select model" : "Pick a brand first"}</option>
                    {filteredModels.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.yearStart}–{m.yearEnd})</option>)}
                  </select>
                </div>
                <div>
                  <label className="ilabel">Year</label>
                  <select className="ifield" value={year} onChange={(e) => setYear(e.target.value)} disabled={!selectedModel}>
                    <option value="">{selectedModel ? "Any year" : "Pick a model first"}</option>
                    {yearRangeValue && <option value={yearRangeValue}>{yearRangeLabel}</option>}
                  </select>
                </div>
                <button type="submit" className="btn-red mt-2 h-12 w-full">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                  Find my parts
                </button>
              </form>
            ) : (
              <div className="px-6 py-8 text-center">
                <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-white/40">
                  Catalogue setup pending
                </p>
                <p className="mt-2 text-sm text-white/65">
                  No bike brands or models are registered yet. The store admin will populate the catalogue from the admin panel.
                </p>
              </div>
            )}

            {/* <div className="flex items-center justify-between border-t border-white/10 bg-black/25 px-6 py-3">
              <span className="text-[13px] text-white/85">Don't know your model?</span>
              <a href="#" className="font-head text-[13px] font-bold uppercase tracking-wider text-red transition hover:opacity-70">
                Search by VIN →
              </a>
            </div> */}
          </div>
        </div>
      </div>
    </section>
  );
}
