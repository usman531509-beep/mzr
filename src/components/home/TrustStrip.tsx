export function TrustStrip() {
  const items = [
    { ico: "🚚", t: "Same-day dispatch", s: "Order before 3pm" },
    { ico: "↩️", t: "30-day returns", s: "No-quibble policy" },
    { ico: "✅", t: "Genuine parts", s: "OEM + verified aftermarket" },
    { ico: "🔒", t: "Secure checkout", s: "256-bit encryption" },
    { ico: "💬", t: "Real support", s: "Mon–Fri 9–6, Sat 9–5" },
  ];
  return (
    <section className="border-t border-white/10 bg-ink-900">
      <div className="mx-auto grid max-w-site grid-cols-2 px-[var(--gutter)] md:grid-cols-3 lg:grid-cols-5">
        {items.map((i, idx) => (
          <div
            key={i.t}
            className={`flex items-center gap-3.5 px-4 py-5 transition hover:bg-white/[0.02] ${
              idx < items.length - 1 ? "lg:border-r" : ""
            } border-r border-white/10 ${idx % 2 === 1 ? "" : "border-b lg:border-b-0"} `}
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-ink-700 text-xl">
              {i.ico}
            </div>
            <div>
              <strong className="block font-head text-[13.5px] font-bold uppercase tracking-wide text-white">
                {i.t}
              </strong>
              <small className="text-[11.5px] text-white/40">{i.s}</small>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
