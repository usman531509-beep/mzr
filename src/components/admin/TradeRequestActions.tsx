"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { confirmAction } from "@/lib/confirm-store";
import { Button } from "@/components/ui/button";

export function TradeRequestActions({
  id, hasLinkedUser, applicantEmail, applicantName,
}: {
  id: string;
  // True when the applicant submitted while signed in, so the request is
  // already tied to a User row. Drives the wording of the approve confirm.
  hasLinkedUser: boolean;
  applicantEmail: string;
  applicantName: string;
}) {
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
    } else {
      // Approve confirm — tell the admin exactly what will happen on the
      // user-account side. The API already handles all three cases
      // (linked user / existing email match / brand-new account); the
      // copy here just makes sure the admin isn't surprised when a fresh
      // user row shows up under /admin/users immediately after.
      const description = hasLinkedUser
        ? `${applicantName} already has an account (${applicantEmail}). Approving will turn on trade pricing for that account — every detail from this application is also visible on their profile under /admin/users.`
        : `No user account is linked yet. Approving will create a new account for ${applicantEmail} (or link to an existing one with that email if it exists). The new account gets temporary password "Trader123@" — you'll see it again after approval with a copy button, and the applicant is forced to change it on first sign-in. All details from this application — personal info, company info, address — appear on the new profile under /admin/users.`;
      const ok = await confirmAction({
        title: hasLinkedUser
          ? "Approve and grant trade pricing?"
          : "Approve and create a user account?",
        description,
        confirmLabel: hasLinkedUser ? "Approve" : "Approve & create account",
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
      const data = await res.json().catch(() => ({} as {
        outcome?: "linked" | "created" | "linked-existing-email" | "rejected";
        tempPassword?: string | null;
        email?: string;
      }));
      if (!res.ok) {
        toast.error("Could not update the request.");
        return;
      }
      if (action === "reject") {
        toast.success("Application rejected.");
      } else if (data.outcome === "created" && data.tempPassword) {
        // Brand-new account just got created. The temp password is the
        // ONE-AND-ONLY moment it's visible — show it in a sticky toast
        // with a copy action so the admin can pass it on out-of-band.
        const pw = data.tempPassword;
        const email = data.email ?? applicantEmail;
        toast.success("Trader account created", {
          description: `Email: ${email}\nTemp password: ${pw}\nThey'll be prompted to change it on first sign-in.`,
          duration: Infinity,
          action: {
            label: "Copy password",
            onClick: () => {
              navigator.clipboard.writeText(pw)
                .then(() => toast.success("Password copied to clipboard"))
                .catch(() => toast.error("Could not copy — select & copy manually"));
            },
          },
          // Render newlines in the description as actual line breaks.
          style: { whiteSpace: "pre-line" },
        });
      } else if (data.outcome === "linked-existing-email") {
        toast.success(`Linked to existing account ${applicantEmail} and approved. Open /admin/users to view their profile.`);
      } else {
        // outcome === "linked" — the applicant was signed in when they
        // submitted, so the request was already tied to their account.
        // Spell that out so admins don't wonder why no fresh user appeared.
        toast.success(`Trade access granted to existing account ${applicantEmail}. Open /admin/users to view their profile.`);
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
