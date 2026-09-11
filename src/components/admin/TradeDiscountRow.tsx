"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function TradeDiscountRow({
  categoryId,
  initial,
  global = false,
}: {
  categoryId?: string;
  initial: number;
  /** When true, edits the store-wide baseline discount instead of a category. */
  global?: boolean;
}) {
  const router = useRouter();
  const [percent, setPercent] = useState(String(initial || ""));
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const dirty = String(initial || "") !== percent;

  const save = async () => {
    const n = percent === "" ? 0 : Number(percent);
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      toast.error("Enter 0–100");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/trade-discounts`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(global ? { global: true, percent: n } : { categoryId, percent: n }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? "Could not save");
        return;
      }
      toast.success(
        global
          ? (n > 0 ? `Global discount set to ${n}%` : "Global discount cleared")
          : (n > 0 ? `Discount set to ${n}%` : "Discount removed"),
      );
      startTransition(() => router.refresh());
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        min={0}
        max={100}
        value={percent}
        onChange={(e) => setPercent(e.target.value)}
        placeholder="0"
        className="h-8 w-20"
      />
      <span className="text-sm text-muted-foreground">%</span>
      <Button size="sm" disabled={!dirty || busy} onClick={save}>
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
      </Button>
    </div>
  );
}
