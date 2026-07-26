import Link from "next/link";
import { getActiveOffers } from "@/lib/offers-cache";
import { SITE_PHONE, SITE_PHONE_TEL } from "@/lib/site";

// Async server component. Renders the top utility strip from the reference
// design (.h-strip): active offers on the left, quick links on the right.
// Offers still come from the database — deactivating every offer in
// /admin/offers hides the message but keeps the strip's quick links.
export async function Topbar() {
  const offers = await getActiveOffers();

  return (
    <div className="h-strip">
      <div className="h-strip-in">
        <div className="flex min-w-0 flex-wrap items-center gap-x-4">
          {offers.length > 0 ? (
            offers.map((o, i) => (
              <span key={o.id} className={i > 0 ? "hidden md:inline" : undefined}>
                <span className="red-dot" />
                {o.icon ? <span className="mr-1">{o.icon}</span> : null}
                {o.text}
              </span>
            ))
          ) : (
            <span>
              <span className="red-dot" />
              Motorbike &amp; moped parts specialist · Trade customers save up to 20%
            </span>
          )}
        </div>
        <div className="hidden items-center gap-2 md:flex">
          <Link href="/trade-account" className="!text-red font-semibold hover:underline">
            Apply for trade pricing →
          </Link>
          <span aria-hidden>&nbsp;|&nbsp;</span>
          <Link href="/track" className="!text-muted-foreground hover:underline">Track order</Link>
          <span aria-hidden>&nbsp;|&nbsp;</span>
          <a href={`tel:${SITE_PHONE_TEL}`} className="!text-muted-foreground hover:underline">📞 {SITE_PHONE}</a>
        </div>
      </div>
    </div>
  );
}
