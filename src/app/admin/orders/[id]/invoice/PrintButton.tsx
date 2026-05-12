"use client";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Printer } from "lucide-react";

export function PrintButton() {
  const sp = useSearchParams();
  const autoprint = sp.get("autoprint") === "1";

  // When linked with ?autoprint=1 (from the admin orders sheet's "Print
  // invoice" button), pop the browser print dialog as soon as the page is
  // ready. Small delay so fonts and layout settle first.
  useEffect(() => {
    if (!autoprint) return;
    const t = setTimeout(() => window.print(), 250);
    return () => clearTimeout(t);
  }, [autoprint]);

  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700"
    >
      <Printer className="h-3.5 w-3.5" />
      Print
    </button>
  );
}
