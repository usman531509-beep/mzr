import Link from "next/link";
import { ShieldCheck, Truck } from "lucide-react";

// Full-screen split-screen shell for the auth / utility pages (login, register,
// track). Left: MZR brand + selling points. Right: the page's own form, passed
// as children. The site chrome (header/footer) is hidden on these routes via
// SiteChrome, so this component owns the whole viewport.

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-auth2">
      {/* LEFT — brand / marketing */}
      <aside className="h-auth2-brand">
        <Link href="/" className="h-auth2-logo" aria-label="MZR Spare home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="MZR Spare" />
        </Link>

        <div className="h-auth2-brand-mid">
          <h2>
            The right part for your ride. <em>First time.</em>
          </h2>
          <p className="desc">
            Join thousands of riders, garages and workshops who trust MZR Spare
            for genuine and verified aftermarket motorbike parts.
          </p>

          <div className="h-auth2-feat">
            <span className="ico"><ShieldCheck /></span>
            <div>
              <b>Fitment Guaranteed</b>
              <span>Every part checked to fit your exact make, model and year.</span>
            </div>
          </div>
          <div className="h-auth2-feat">
            <span className="ico"><Truck /></span>
            <div>
              <b>Same-Day Dispatch</b>
              <span>Order before 3pm UK time and we ship it the same day.</span>
            </div>
          </div>
        </div>

        <div className="h-auth2-proof">
          <span className="h-auth2-stars">★★★★★</span>
          <p>Trusted by <b>500+</b> riders &amp; garages nationwide</p>
        </div>
      </aside>

      {/* RIGHT — the page's form */}
      <main className="h-auth2-form">
        <div className="h-auth2-form-in">{children}</div>
      </main>
    </div>
  );
}
