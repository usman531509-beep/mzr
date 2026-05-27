"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { confirmAction } from "@/lib/confirm-store";
import { Button } from "@/components/ui/button";

export function TradeRequestActions({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyAction, setBusyAction] = useState<"approve" | "reject" | null>(null);

  const decide = async (action: "approve" | "reject") => {
    if (action === "reject") {
      const ok = await confirmAction({
        title: "Reject this trade application?",
        description: "The applicant will keep their account but won't get the trade pricing tier.",
        confirmLabel: "Reject",
        destructive: true,
      });
      if (!ok) return;
    }
    setBusyAction(action);
    try {
      const res = await fetch(`/api/trade-requests/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        toast.error("Could not update the request.");
        return;
      }
      startTransition(() => router.refresh());
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div className="flex justify-end gap-2">
      <Button
        size="sm"
        variant="outline"
        disabled={pending || busyAction !== null}
        onClick={() => decide("reject")}
      >
        {busyAction === "reject"
          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
          : <X className="h-3.5 w-3.5" />}
        Reject
      </Button>
      <Button
        size="sm"
        disabled={pending || busyAction !== null}
        onClick={() => decide("approve")}
      >
        {busyAction === "approve"
          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
          : <Check className="h-3.5 w-3.5" />}
        Approve
      </Button>
    </div>
  );
}
