"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

type Brand = { id: string; name: string; slug: string };
type Model = { id: string; name: string; brandId: string; yearStart: number; yearEnd: number };

export function Hero({ brands, models }: { brands: Brand[]; models: Model[] }) {
  const router = useRouter();
  const hasCatalog = brands.length > 0;
  const [brandSlug, setBrandSlug] = useState("");
  const [modelId, setModelId] = useState("");
  const [year, setYear] = useState("");

  // Rotating emphasis word in the hero headline (framer-motion slide-up).
  const rotating = useMemo(
    () => [
      "First time.",
      "In stock.",
      "Guaranteed to fit.",
      "Trade rates.",
      "No hassle.",
    ],
    [],
  );
  const [titleNumber, setTitleNumber] = useState(0);

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

  useEffect(() => {
    const t = setTimeout(
      () => setTitleNumber((n) => (n === rotating.length - 1 ? 0 : n + 1)),
      2200,
    );
    return () => clearTimeout(t);
  }, [titleNumber, rotating]);

  const find = (e: React.FormEvent) => {
    e.preventDefault();
    const p = new URLSearchParams();
    if (brandSlug) p.set("brand", brandSlug);
    if (modelId) p.set("model", modelId);
    if (year) p.set("year", year);
    router.push(`/products?${p.toString()}`);
  };

  return (
    <section className="h-hero">
      <div className="h-hero-in">
        {/* LEFT — headline, lead copy, actions and stats */}
        <div>
          <h1>
            The right part
            <br />
            for your ride.
            <span className="h-rotate" aria-hidden="true">
              {rotating.map((word, i) => (
                <motion.em
                  key={word}
                  className="h-rotate-word"
                  initial={{ opacity: 0, y: "-120%" }}
                  transition={{ type: "spring", stiffness: 50, damping: 12 }}
                  animate={
                    titleNumber === i
                      ? { y: "0%", opacity: 1 }
                      : { y: titleNumber > i ? "-140%" : "140%", opacity: 0 }
                  }
                >
                  {word}
                </motion.em>
              ))}
            </span>
            <span className="sr-only">First time.</span>
          </h1>
          <p className="lead">
            Search thousands of scooter, moped and motorcycle parts by bike,
            brand, category, OEM or SKU. Trade pricing for garages, workshops
            and fleets.
          </p>
          <div className="h-hero-actions">
            <a href="/products" className="btn-red">
              Shop Parts
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </a>
            <a href="/trade-account" className="btn-ghost">Trade Account</a>
          </div>
        </div>

        {/* RIGHT — redesigned parts finder card (same logic, new skin) */}
        <div className="h-finder" id="hero-finder">
          <div className="h-finder-head">
            <h3>Motorbike Parts Finder</h3>
            <p className="sub">Three quick steps we&apos;ll show only parts that fit your ride.</p>
          </div>
          <div className="h-finder-body">
            {hasCatalog ? (
              <>
                <div className="h-finder-steps" aria-hidden="true">
                  <div className={`h-finder-step${brandSlug ? " done" : ""}`}>
                    <div className="dot">1</div><span>Make</span>
                  </div>
                  <div className={`h-finder-step${modelId ? " done" : ""}`}>
                    <div className="dot">2</div><span>Model</span>
                  </div>
                  <div className={`h-finder-step${year ? " done" : ""}`}>
                    <div className="dot">3</div><span>Year</span>
                  </div>
                </div>
                <form onSubmit={find}>
                  <div className="h-finder-fields">
                    <div className="h-finder-field">
                      <label>Manufacturer</label>
                      <select value={brandSlug} onChange={(e) => setBrandSlug(e.target.value)}>
                        <option value="">Select bike brand…</option>
                        {brands.map((b) => <option key={b.id} value={b.slug}>{b.name}</option>)}
                      </select>
                    </div>
                    <div className="h-finder-grid2">
                      <div className="h-finder-field">
                        <label>Model</label>
                        <select value={modelId} onChange={(e) => setModelId(e.target.value)} disabled={!brandSlug}>
                          <option value="">{brandSlug ? "Select model…" : "Pick a brand first"}</option>
                          {filteredModels.map((m) => (
                            <option key={m.id} value={m.id}>{m.name} ({m.yearStart}–{m.yearEnd})</option>
                          ))}
                        </select>
                      </div>
                      <div className="h-finder-field">
                        <label>Year</label>
                        <select value={year} onChange={(e) => setYear(e.target.value)} disabled={!selectedModel}>
                          <option value="">{selectedModel ? "Any year" : "Year…"}</option>
                          {yearRangeValue && <option value={yearRangeValue}>{yearRangeLabel}</option>}
                        </select>
                      </div>
                    </div>
                  </div>
                  <button type="submit" className="h-finder-cta">
                    Find My Parts
                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.8" viewBox="0 0 24 24">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                  </button>
                </form>
                <div className="h-finder-foot">
                  <span className="trust">Verified fitment data</span>
                  <a href="/products">Browse all parts →</a>
                </div>
              </>
            ) : (
              <div className="py-6 text-center">
                <p className="text-[11px] font-bold uppercase tracking-wider text-red">
                  Catalogue setup pending
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  No bike brands or models are registered yet. The store admin
                  will populate the catalogue from the admin panel.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
