export function Topbar() {
  return (
    <div className="relative h-9 overflow-hidden bg-gradient-to-r from-red-600 via-red to-red-600">
      <div className="pointer-events-none absolute inset-0 [background:repeating-linear-gradient(90deg,rgba(255,255,255,0.04)_0,rgba(255,255,255,0.04)_1px,transparent_1px,transparent_60px)]" />
      <div className="relative mx-auto flex h-full w-full max-w-site items-center justify-between gap-4 px-[var(--gutter)]">
        <div className="hidden md:flex items-center gap-5 font-mono text-[13px] font-semibold tracking-wide text-white/90">
          <span>📍 Free shipping on orders over £200</span>
          <span>📦 Same-day dispatch before 3pm</span>
          <span className="hidden lg:inline">Mon–Fri 9–6 · Sat 9–5</span>
        </div>
        <div className="md:hidden font-mono text-[12.5px] font-semibold tracking-wide text-white/90">
          🚀 Free shipping over £200
        </div>
        <div className="flex items-center gap-4 font-mono text-[12.5px] font-semibold uppercase tracking-wider text-white/85">  
          <a href="#" className="hover:text-white transition">Help</a>
        </div>
      </div>
    </div>
  );
}
