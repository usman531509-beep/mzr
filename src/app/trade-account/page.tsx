import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight, CheckCircle2, Clock, Headset, Percent,
  ShieldCheck, Truck, Wrench,
} from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TradeAccountForm } from "@/components/TradeAccountForm";
import { Card, CardContent } from "@/components/ui/card";

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
    <div className="bg-background text-foreground">
      <div className="mx-auto grid max-w-7xl gap-10 px-[var(--gutter)] py-10 lg:grid-cols-[1fr_minmax(0,1.05fr)] lg:gap-14 lg:py-16">
        {/* LEFT — branding + benefits */}
        <aside className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-ink-800 to-ink-900 p-7 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:p-10">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(232,21,27,0.28),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(232,21,27,0.10),transparent_55%)]"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red/60 to-transparent"
          />
          <Wrench
            aria-hidden
            className="pointer-events-none absolute -right-6 -bottom-6 h-56 w-56 stroke-[0.4] text-red/10"
          />

          <div className="relative flex h-full flex-col">
            <Link href="/" className="inline-flex w-fit items-center" aria-label="MZR Parts home">
              <Image
                src="/logo.png"
                alt="MZR Parts"
                width={617}
                height={405}
                className="h-24 w-auto lg:h-32"
                priority
              />
            </Link>

            <div className="mt-6 lg:mt-6">
              <div className="eyebrow mb-3">Trade accounts</div>
              <h1 className="font-head text-4xl font-extrabold uppercase leading-[1.05] tracking-tight lg:text-5xl">
                Stock your <em className="not-italic text-red">workshop</em> for less
              </h1>
              <p className="mt-2 max-w-md text-[15px] leading-relaxed text-white/65">
                Workshops, dealers and fleet operators get wholesale terms,
                account invoicing and priority dispatch. Apply once we&apos;ll
                set you up within 1–2 business days.
              </p>
            </div>

            <ul className="mt-8 space-y-3">
              <Benefit
                icon={<Percent className="h-4 w-4" />}
                title="Wholesale pricing"
                sub="Trade discounts apply automatically at checkout no code needed."
              />
              <Benefit
                icon={<Truck className="h-4 w-4" />}
                title="Priority dispatch"
                sub="Same-day if ordered before 3pm UK time. Bulk orders get a dedicated picker."
              />
              <Benefit
                icon={<ShieldCheck className="h-4 w-4" />}
                title="OEM-grade guarantee"
                sub="Every part verified before it leaves the warehouse workshop-ready."
              />
              <Benefit
                icon={<Headset className="h-4 w-4" />}
                title="Dedicated support"
                sub="One contact for orders, returns and fitment questions."
              />
            </ul>

            <div className="mt-auto pt-8">
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/40">
                Trusted by traders
              </p>
              <p className="mt-1 text-[12px] text-white/55">
                30+ brands · Same-day UK dispatch · 30-day returns
              </p>
            </div>
          </div>
        </aside>

        {/* RIGHT — application form / status */}
        <div className="min-w-0">
          {alreadyApproved ? (
            <Card className="border-emerald-500/30 bg-emerald-500/[0.04]">
              <CardContent className="flex flex-col items-start gap-4 p-8 sm:flex-row">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
                  <CheckCircle2 className="h-5 w-5" />
                </span>
                <div className="flex-1">
                  <h2 className="font-head text-xl font-extrabold uppercase tracking-wide">
                    You&apos;re a trade customer
                  </h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    Your trade account is active — wholesale pricing and terms
                    are applied automatically at checkout, no code needed.
                  </p>
                  <Link
                    href="/products"
                    className="mt-4 inline-flex items-center gap-1.5 font-head text-[13px] font-bold uppercase tracking-wider text-red transition hover:opacity-80"
                  >
                    Start shopping <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : pending ? (
            <Card className="border-amber-500/30 bg-amber-500/[0.04]">
              <CardContent className="flex flex-col items-start gap-4 p-8 sm:flex-row">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-300">
                  <Clock className="h-5 w-5" />
                </span>
                <div className="flex-1">
                  <h2 className="font-head text-xl font-extrabold uppercase tracking-wide">
                    Application received
                  </h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    We received your trade application on{" "}
                    <strong className="text-foreground">
                      {pending.createdAt.toLocaleDateString("en-GB", { dateStyle: "long" })}
                    </strong>
                    . Our team will review it and contact you shortly — usually
                    within 1–2 business days.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div>
              {/* Mobile-only heading; on lg+ the headline lives in the left panel */}
              <div className="mb-5 lg:hidden">
                <div className="eyebrow mb-2">Application form</div>
                <h2 className="font-head text-2xl font-extrabold uppercase tracking-tight">
                  Apply now
                </h2>
              </div>
              <TradeAccountForm prefill={prefill} />
            </div>
          )}
        </div>
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
    <li className="flex items-start gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-red/30 bg-red/10 text-red">
        {icon}
      </span>
      <div className="min-w-0">
        <div className="font-head text-[13px] font-bold uppercase tracking-wide text-white">
          {title}
        </div>
        <div className="text-[12.5px] leading-relaxed text-white/55">
          {sub}
        </div>
      </div>
    </li>
  );
}
