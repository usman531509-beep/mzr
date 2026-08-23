# Email notifications — plan / to-do

A single reference for **every transactional email** the store needs, who receives
it, what triggers it, and where in the code it should be sent from. Nothing here
is implemented yet — this is the spec to build against when we wire up email.

> Status legend: 🔴 not built · 🟡 flow exists, email not wired · 🟢 done

---

## 1. Current state (infra)

- **No mail provider is connected.** There is no `sendEmail()` helper, no
  templates, no SMTP/API keys.
- `src/app/api/forgot-password/route.ts` already builds a reset link but only
  **logs** it (and returns it in dev) — email delivery is a `TODO`.
- Contact details live in one place: `src/lib/site.ts`
  (`SITE_EMAIL = info@mzrspare.com`, `SITE_SUPPORT_EMAIL`, `SITE_PHONE`, …).
- Newsletter capture (`src/components/home/Newsletter.tsx`) is UI-only —
  "list gets connected later".

### What we need to build first (shared plumbing)
1. **Mail provider** — recommend provisioning via the Vercel Marketplace
   (e.g. Resend) so keys land in env automatically. (Load the `marketplace`
   skill when we start.)
2. **`sendEmail()` helper** — `src/lib/mail.ts`: `to`, `subject`, `react/html`,
   from `SITE_EMAIL`, with a `bcc` to `SITE_SUPPORT_EMAIL` for admin copies.
3. **Templates** — one branded layout (logo, red header, footer with
   phone/email/address from `site.ts`) reused by all emails.
4. **Fire-and-forget + safe** — never let a failed email break the order/API
   (wrap in try/catch, log on failure), mirroring how `logActivity()` behaves.
5. **Idempotency** — send status emails only on a real transition (the order
   PATCH already computes `prevStatus !== newStatus`; reuse that).

---

## 2. Customer emails

| # | Email | Trigger (event) | Where to hook | Key content | Status |
|---|-------|-----------------|---------------|-------------|--------|
| C1 | **Order confirmation** | Customer places an order (order row created) | `src/app/api/checkout/intent/route.ts` (customer checkout) + `src/app/api/orders/route.ts` (admin-placed) | Order number, items, qty, prices, totals (incl. VAT), delivery address, "what's next" | 🔴 |
| C2 | **Payment received** | Order flips to `PAID` | `src/app/api/checkout/confirm/route.ts` and `src/app/api/pay/[token]/confirm/route.ts` | Order number, amount paid, receipt/invoice summary | 🔴 |
| C3 | **Payment request / "please pay" link** | A `PENDING` order needs settling (admin creates order with pay link, or a chase) | `src/app/api/admin/orders/route.ts` (pay token is generated here → `/pay/<token>`) | Amount due, **`/pay/<token>` link**, order summary, expiry note | 🟡 (link generated, never emailed) |
| C4 | **Order shipped** | Status → `SHIPPED` (courier + tracking set) | `src/app/api/admin/orders/[id]/route.ts` (PATCH, `enteringShipped`) | Courier name, **tracking number + tracking URL**, items, ETA | 🔴 |
| C5 | **Order delivered** | Status → `DELIVERED` (delivery completion) | `src/app/api/admin/orders/[id]/route.ts` (PATCH) | "Delivered" confirmation, order number, ask for review / support link | 🔴 |
| C6 | **Order cancelled** | Status → `CANCELLED` | `src/app/api/admin/orders/[id]/route.ts` (PATCH) | Cancellation notice, refund note if it was paid, contact for questions | 🔴 |
| C7 | **Order amended** | Admin edits an existing order (items/total change) | `src/app/api/admin/orders/[id]/amend/route.ts` | What changed (old → new), new total, updated pay link if now owing | 🔴 |
| C8 | **Welcome / account created** | New registration | `src/app/api/register/route.ts` | Welcome, what they can do, link to account | 🔴 |
| C9 | **Password reset** | Forgot-password requested | `src/app/api/forgot-password/route.ts` | Reset link (already built), 1-hour expiry note | 🟡 (link logged, not emailed) |
| C10 | **Trade account — received** | Customer submits trade application | `src/app/api/trade-requests/route.ts` (POST) | "We've got your application, we'll review it" | 🔴 |
| C11 | **Trade account — approved** | Admin approves the request | `src/app/api/trade-requests/[id]/route.ts` (PATCH, `APPROVED`) | Approved 🎉, trade discount now active, how it applies | 🟡 (code note says "communicated out-of-band") |
| C12 | **Trade account — rejected** | Admin rejects the request | `src/app/api/trade-requests/[id]/route.ts` (PATCH, `REJECTED`) | Polite decline, reason if any, how to re-apply | 🟡 |
| C13 | **Newsletter confirmation** *(nice-to-have)* | Newsletter signup | `src/components/home/Newsletter.tsx` (+ a new route) | Subscription confirmed / double opt-in | 🔴 |

---

## 3. Admin / staff emails

Sent to `SITE_SUPPORT_EMAIL` (or a configurable admin-notifications address).

| # | Email | Trigger (event) | Where to hook | Key content | Status |
|---|-------|-----------------|---------------|-------------|--------|
| A1 | **New order placed** | Any new order created | same hooks as C1 | Order number, customer, items, total — link to `/admin/orders` | 🔴 |
| A2 | **Payment received** *(optional)* | Order flips to `PAID` | same hooks as C2 | Order + amount — "money's in" | 🔴 |
| A3 | **New trade account request** | Customer submits trade application | `src/app/api/trade-requests/route.ts` (POST) | Applicant details — link to `/admin/trade-requests` to approve/reject | 🔴 |
| A4 | **Low-stock alert** *(nice-to-have)* | Product stock ≤ `lowStockThreshold` after an order deducts stock | order status PATCH / FIFO deduction (`src/lib/fifo.ts`) or a scheduled digest | Which products, current qty — link to `/admin/stock` | 🔴 |
| A5 | **Order cancelled** *(optional)* | Status → `CANCELLED` | `src/app/api/admin/orders/[id]/route.ts` | Which order, by whom | 🔴 |

---

## 4. Suggested build order (when we start)

1. **Plumbing** — mail provider + `src/lib/mail.ts` + base template.
2. **Highest value first:**
   - C1 Order confirmation + A1 New-order (admin)
   - C2 Payment received
   - C3 Payment-request link (the "please pay" chase) + C4 Shipped + C5 Delivered
3. **Account/lifecycle:** C9 Password reset, C8 Welcome, C10–C12 Trade flow + A3.
4. **Nice-to-have:** C6/C7 cancelled/amended, A4 low-stock, C13 newsletter, A2/A5.

## 5. Notes / decisions to confirm later
- One admin-notification recipient vs. per-role? (default: `SITE_SUPPORT_EMAIL`)
- Attach a PDF invoice to C2, or keep it an HTML summary + portal link?
- Tracking URL for C4 — we already store courier + tracking number; build the
  courier's tracking-URL template into the `Courier` model or map it in code.
- Do customers self-cancel? If yes, add an admin "order cancelled by customer".
