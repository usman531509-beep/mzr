"use client";

import Link from "next/link";
import { Trash2, ShoppingBag } from "lucide-react";

import { useCart, cartTotals } from "@/lib/cart-store";
import { fmtMoney } from "@/lib/format";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default function CartPage() {
  const items = useCart((s) => s.items);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const totals = cartTotals(items);

  return (
    <div className="container" style={{ padding: "24px 20px 48px" }}>
      <Breadcrumbs className="mb-4" items={[{ label: "Basket" }]} />

      <h1 className="font-head text-[34px] uppercase leading-none tracking-[0.02em] text-ink lg:text-[42px]">
        Your basket
      </h1>

      {items.length === 0 ? (
        <div className="panel center mt" style={{ padding: "64px 24px" }}>
          <ShoppingBag className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <h2 className="mb-1 text-lg font-bold text-ink">Your basket is empty</h2>
          <p className="muted mx-auto mb-5 max-w-sm text-sm">
            Browse our catalogue and add some parts to your basket.
          </p>
          <Link href="/products" className="btn btn-red">
            Shop parts
          </Link>
        </div>
      ) : (
        <div className="split mt">
          {/* Line items */}
          <div className="table-wrap" style={{ height: "fit-content" }}>
            <table className="t">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Unit</th>
                  <th>Total</th>
                  <th aria-label="Remove" />
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.productId}>
                    <td>
                      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                        <div
                          style={{
                            width: 56,
                            height: 56,
                            flexShrink: 0,
                            overflow: "hidden",
                            borderRadius: 8,
                            border: "1px solid var(--line)",
                            background: "#fff",
                          }}
                        >
                          {i.image ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={i.image}
                              alt=""
                              className="h-full w-full object-contain p-0.5"
                            />
                          ) : null}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <Link
                            href={`/products/${i.slug}`}
                            className="line-clamp-2 text-[13.5px] font-bold leading-tight text-ink hover:text-red"
                          >
                            {i.name}
                          </Link>
                          <div className="muted" style={{ fontSize: 12 }}>
                            {fmtMoney(i.price)} each
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="qty">
                        <button
                          type="button"
                          onClick={() => setQty(i.productId, i.quantity - 1)}
                          disabled={i.quantity <= 1}
                          className="disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label="Decrease quantity"
                        >
                          −
                        </button>
                        <input
                          value={i.quantity}
                          readOnly
                          aria-label="Quantity"
                          style={{ width: 40, textAlign: "center" }}
                        />
                        <button
                          type="button"
                          onClick={() => setQty(i.productId, i.quantity + 1)}
                          disabled={i.quantity >= i.stock}
                          className="disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="tabular-nums">{fmtMoney(i.price)}</td>
                    <td className="font-bold tabular-nums">{fmtMoney(i.price * i.quantity)}</td>
                    <td>
                      <button
                        type="button"
                        onClick={() => remove(i.productId)}
                        aria-label={`Remove ${i.name}`}
                        className="text-muted-foreground transition hover:text-red"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Order summary */}
          <div className="summary">
            <h3
              className="font-head"
              style={{
                margin: "0 0 12px",
                fontSize: 22,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              Order summary
            </h3>
            <div className="ln">
              <span>Subtotal</span>
              <span className="tabular-nums">{fmtMoney(totals.subtotal)}</span>
            </div>
            <div className="ln">
              <span>Shipping</span>
              {totals.shipping === 0 ? (
                <span style={{ color: "var(--ok)", fontWeight: 700 }}>FREE</span>
              ) : (
                <span className="tabular-nums">{fmtMoney(totals.shipping)}</span>
              )}
            </div>
            <div className="ln">
              <span>VAT (20%)</span>
              <span className="tabular-nums">{fmtMoney(totals.tax)}</span>
            </div>
            <div className="ln total">
              <span>Total</span>
              <span className="tabular-nums text-red">{fmtMoney(totals.total)}</span>
            </div>
            <Link
              href="/checkout"
              className="btn btn-red"
              style={{ width: "100%", justifyContent: "center", marginTop: 14 }}
            >
              Checkout
            </Link>
            <Link
              href="/products"
              className="btn btn-ghost"
              style={{ width: "100%", textAlign: "center", marginTop: 8, display: "inline-block" }}
            >
              Continue shopping
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
