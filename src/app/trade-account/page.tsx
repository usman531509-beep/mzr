import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TradeAccountForm } from "@/components/TradeAccountForm";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TradeAccountPage() {
  const session = await auth();

  // If signed-in, prefill form and check existing trade status / pending request.
  let prefill: {
    contactName?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
  } = {};
  let alreadyApproved = false;
  let pending: { createdAt: Date } | null = null;

  if (session?.user?.id) {
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (user) {
      prefill = {
        contactName: user.name ?? "",
        email: user.email,
        phone: user.phone ?? "",
        address: user.address ?? "",
        city: user.city ?? "",
        country: user.country ?? "",
      };
      alreadyApproved = user.tradeApproved;
      if (!alreadyApproved) {
        pending = await prisma.tradeAccountRequest.findFirst({
          where: { userId: user.id, status: "PENDING" },
          select: { createdAt: true },
        });
      }
    }
  }

  return (
    <div className="bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-[var(--gutter)] py-10 lg:py-14">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">Open a trade account</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Workshops, dealers and fleet operators apply for a trade account to get
            wholesale terms. We review every application and get back within 1–2 business days.
          </p>
        </div>

        {alreadyApproved ? (
          <Card>
            <CardContent className="flex items-start gap-3 p-6">
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-500" />
              <div>
                <h2 className="font-semibold">You&apos;re a trade customer</h2>
                <p className="text-sm text-muted-foreground">
                  Your trade account is active. Trade pricing and terms are applied automatically at checkout.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : pending ? (
          <Card>
            <CardContent className="flex items-start gap-3 p-6">
              <Clock className="mt-0.5 h-5 w-5 text-amber-500" />
              <div>
                <h2 className="font-semibold">Application received</h2>
                <p className="text-sm text-muted-foreground">
                  We received your trade application on {pending.createdAt.toLocaleDateString()}.
                  Our team will review it and contact you shortly.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <TradeAccountForm prefill={prefill} />
        )}
      </div>
    </div>
  );
}
