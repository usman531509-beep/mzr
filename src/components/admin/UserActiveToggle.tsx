"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

export function UserActiveToggle({
  id,
  active,
  disabled,
}: {
  id: string;
  active: boolean;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [optimistic, setOptimistic] = useState(active);
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  const toggle = async (next: boolean) => {
    setOptimistic(next);
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ active: next }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setOptimistic(!next);
        toast.error(data.error ?? "Could not update user.");
        return;
      }
      toast.success(next ? "User activated" : "User deactivated");
      startTransition(() => router.refresh());
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Switch
        checked={optimistic}
        onCheckedChange={toggle}
        disabled={disabled || busy}
        aria-label={optimistic ? "Deactivate user" : "Activate user"}
      />
      <span className={`text-xs ${optimistic ? "text-emerald-400" : "text-muted-foreground"}`}>
        {optimistic ? "Active" : "Inactive"}
      </span>
    </div>
  );
}
