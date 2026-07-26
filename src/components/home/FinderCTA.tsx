import Link from "next/link";

// Reference Trade CTA (.h-trade) — the big red panel promoting the trade
// account near the bottom of the home page.

export function FinderCTA() {
  return (
    <section className="h-section">
      <div className="h-container">
        <div className="h-trade">
          <div className="h-trade-in">
            <div>
              <span className="h-eyebrow">For Garages, Workshops &amp; Fleets</span>
              <h2>
                Run a workshop?
                <br />
                <em className="!text-white">Buy like one.</em>
              </h2>
              <p className="!text-white/85">
                Apply for a verified trade account and unlock approved trade
                pricing, volume rebates and priority dispatch on every part
                you fit.
              </p>
              <ul className="[&_li::before]:!bg-white [&_li::before]:!text-red">
                <li>Trade discounts off list</li>
                <li>Priority dispatch</li>
                <li>Volume rebates</li>
                <li>Dedicated support</li>
              </ul>
              <Link
                href="/trade-account"
                className="btn-red !bg-white !text-red !shadow-none hover:!bg-ink hover:!text-white"
              >
                Apply for Trade Account
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            </div>
            <div className="h-trade-card">
              <h4>Trade Perks</h4>
              <div className="h-perk">
                <div className="h-perk-i">£</div>
                <div>
                  <b>Approved Trade Pricing</b>
                  <span>Across all stocked brands</span>
                </div>
              </div>
              <div className="h-perk">
                <div className="h-perk-i">⚡</div>
                <div>
                  <b>Same-Day Dispatch</b>
                  <span>Trade orders before 3pm UK</span>
                </div>
              </div>
              <div className="h-perk">
                <div className="h-perk-i">📋</div>
                <div>
                  <b>Priority Support</b>
                  <span>For verified businesses</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
