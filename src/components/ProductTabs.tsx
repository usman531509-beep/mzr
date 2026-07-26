"use client";

import { useState } from "react";
import { RotateCcw, ShieldCheck, Truck } from "lucide-react";

export type Fitment = { id: string; make: string; model: string; years: string };

// Client-side tabbed panel for the product detail page. Replaces the old
// anchor-only tabs (which just jumped to #ids and never switched content) with
// real tab state — Description / Fitment / Delivery & returns.
export function ProductTabs({
  description,
  fitments,
}: {
  description: string;
  fitments: Fitment[];
}) {
  const tabs = [
    { key: "description", label: "Description" },
    ...(fitments.length > 0 ? [{ key: "fitment", label: "Fitment" }] : []),
    { key: "delivery", label: "Delivery & returns" },
  ];
  const [active, setActive] = useState("description");

  return (
    <div className="mt-9">
      <div className="tabs !mt-0" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={active === t.key}
            className={active === t.key ? "on" : ""}
            onClick={() => setActive(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="max-w-[780px] py-5 text-[15px] text-[#333]">
        {active === "description" && (
          <p className="m-0 whitespace-pre-line leading-[1.7]">{description}</p>
        )}

        {active === "fitment" && (
          <div className="fitlist">
            <div className="row h">
              <div>Make</div>
              <div>Model</div>
              <div>Years</div>
            </div>
            {fitments.map((f) => (
              <div className="row" key={f.id}>
                <div style={{ fontWeight: 700 }}>{f.make}</div>
                <div>{f.model}</div>
                <div className="muted tabular-nums">{f.years}</div>
              </div>
            ))}
          </div>
        )}

        {active === "delivery" && (
          <div className="space-y-4">
            <div className="grid g-3">
              <TrustItem icon={Truck} label="Fast shipping" />
              <TrustItem icon={RotateCcw} label="30-day returns" />
              <TrustItem icon={ShieldCheck} label="Genuine parts" />
            </div>
            <div className="space-y-2 text-[14px] leading-relaxed text-[#444]">
              <p>
                <strong>Dispatch:</strong> Orders placed before 3pm on a working day are
                dispatched the same day. Standard UK delivery is 2–4 working days.
              </p>
              <p>
                <strong>Returns:</strong> Unused parts in their original packaging can be
                returned within 30 days for a full refund. Get in touch and we&apos;ll arrange it.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TrustItem({
  icon: Icon, label,
}: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-line bg-soft px-3 py-2.5">
      <Icon className="h-4 w-4 shrink-0 text-red" />
      <span className="text-xs font-medium">{label}</span>
    </div>
  );
}
