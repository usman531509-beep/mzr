import Link from "next/link";
import {
  ArrowRight, CheckCircle2, Clock, Headset, Percent,
  ShieldCheck, Truck,
} from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TradeAccountForm } from "@/components/TradeAccountForm";

export const dynamic = "force-dynamic";

export default async function TradeAccountPage() {
  const session = await auth();

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
        country: user.country ?? "United Kingdom",
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
    <div className="container" style={{ padding: "30px 20px 60px" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <span className="tag-inline">Trade</span>
        <h1 className="text-[28px] font-extrabold tracking-tight" style={{ margin: "8px 0 4px" }}>
          Apply for a trade account
        </h1>
        <p className="muted" style={{ margin: "0 0 18px" }}>
          Garages, workshops, delivery companies, fleets and mechanics receive
          approved trade pricing across selected categories.
        </p>

        {alreadyApproved ? (
          <div
            className="panel flex flex-col items-start gap-4 sm:flex-row"
            style={{ background: "#e6f7ec", borderColor: "#bfe8cd" }}
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-ok">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <div className="flex-1">
              <h2 className="m-0 text-base font-extrabold text-ink">
                You&apos;re a trade customer
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                Your trade account is active — wholesale pricing and terms
                are applied automatically at checkout, no code needed.
              </p>
              <Link
                href="/products"
                className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-bold text-red hover:underline"
              >
                Start shopping <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        ) : pending ? (
          <div className="alert flex items-start gap-3">
            <Clock className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <strong>Application received.</strong> We received your trade
              application on{" "}
              <strong>
                {pending.createdAt.toLocaleDateString("en-GB", { dateStyle: "long" })}
              </strong>
              . Our team will review it and contact you shortly — usually
              within 1–2 business days.
            </div>
          </div>
        ) : (
          <>
            <div className="alert">
              All applications reviewed within 1 working day. You can shop at
              retail prices in the meantime.
            </div>

            {/* Benefits */}
            <div className="panel">
              <div className="grid gap-4 sm:grid-cols-2">
                <Benefit
                  icon={<Percent className="h-4 w-4" />}
                  title="Wholesale pricing"
                  sub="Trade discounts apply automatically at checkout — no code needed."
                />
                <Benefit
                  icon={<Truck className="h-4 w-4" />}
                  title="Priority dispatch"
                  sub="Same-day if ordered before 3pm UK time. Bulk orders get a dedicated picker."
                />
                <Benefit
                  icon={<ShieldCheck className="h-4 w-4" />}
                  title="OEM-grade guarantee"
                  sub="Every part verified before it leaves the warehouse — workshop-ready."
                />
                <Benefit
                  icon={<Headset className="h-4 w-4" />}
                  title="Dedicated support"
                  sub="One contact for orders, returns and fitment questions."
                />
              </div>
            </div>

            <TradeAccountForm prefill={prefill} />
          </>
        )}
      </div>
    </div>
  );
}

function Benefit({
  icon, title, sub,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-soft text-red">
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-[13px] font-bold text-ink">{title}</div>
        <div className="text-[12.5px] leading-relaxed text-muted-foreground">
          {sub}
        </div>
      </div>
    </div>
  );
}
