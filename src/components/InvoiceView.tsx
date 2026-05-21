import { fmtMoney } from "@/lib/format";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import type { OrderStatus } from "@prisma/client";

// Pure presentational invoice. Both the admin route (/admin/orders/[id]/invoice)
// and the customer route (/account/orders/[id]/invoice) render this — the page
// components handle auth and data loading.

export type InvoiceOrder = {
  id: string;
  orderNumber: string | null;
  status: OrderStatus;
  total: string | number;
  shippingFee: string | number;
  discount: string | number;
  createdAt: Date;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  shippingAddressLine2: string | null;
  shippingCity: string;
  shippingCounty: string | null;
  shippingPostcode: string;
  shippingCountry: string;
  notes: string | null;
  items: Array<{
    id: string;
    name: string;
    price: string | number;
    quantity: number;
  }>;
};

export function InvoiceView({ order }: { order: InvoiceOrder }) {
  // VAT: 20% applied to (subtotal + shipping − discount). The shipping/discount
  // breakdown is persisted on the order, but legacy rows can have shipping = 0;
  // for those we invert the VAT formula off the saved total so the printed
  // figures still reconcile.
  const subtotal = order.items.reduce(
    (s, it) => s + Number(it.price) * it.quantity,
    0,
  );
  const discount = Number(order.discount ?? 0);
  const storedShipping = Number(order.shippingFee ?? 0);
  const shipping = storedShipping > 0
    ? storedShipping
    : Math.max(0, +(Number(order.total) / 1.20 - subtotal + discount).toFixed(2));
  const taxable = Math.max(0, subtotal + shipping - discount);
  const tax = +(taxable * 0.20).toFixed(2);
  const ref = order.orderNumber ?? order.id;

  return (
    <div className="mx-auto max-w-3xl px-8 py-10 print:px-0 print:py-4">
      <div className="mb-8 flex items-start justify-between gap-6">
        <div>
          <div className="text-2xl font-black tracking-tight">MZR PARTS</div>
          <div className="mt-1 text-xs text-gray-500">
            Motorbike Spares &amp; Accessories
          </div>
          <div className="mt-3 text-xs leading-relaxed text-gray-600">
            support@mzrparts.com<br />
            Mon–Fri 9–6 · Sat 9–5
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-gray-500">
            Invoice
          </div>
          <div className="mt-1 font-mono text-lg font-bold tracking-tight">{ref}</div>
          <div className="mt-2 text-xs text-gray-600">
            {new Date(order.createdAt).toLocaleString("en-GB")}
          </div>
          <div className="mt-2">
            <OrderStatusBadge status={order.status} />
          </div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-6 rounded-md border border-gray-200 bg-gray-50 p-4 text-xs print:bg-white">
        <div>
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
            Bill to
          </div>
          <div className="font-semibold">{order.customerName}</div>
          <div className="text-gray-700">{order.customerEmail}</div>
          <div className="text-gray-700">{order.customerPhone}</div>
        </div>
        <div>
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
            Ship to
          </div>
          <div>{order.shippingAddress}</div>
          {order.shippingAddressLine2 && <div>{order.shippingAddressLine2}</div>}
          <div>
            {order.shippingCity}
            {order.shippingCounty ? `, ${order.shippingCounty}` : ""}
          </div>
          {order.shippingPostcode && <div className="font-mono">{order.shippingPostcode}</div>}
          <div>{order.shippingCountry}</div>
        </div>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-gray-300 text-left text-[11px] uppercase tracking-widest text-gray-500">
            <th className="py-2">Item</th>
            <th className="py-2 text-right">Qty</th>
            <th className="py-2 text-right">Unit</th>
            <th className="py-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((it) => (
            <tr key={it.id} className="border-b border-gray-200">
              <td className="py-2">{it.name}</td>
              <td className="py-2 text-right tabular-nums">{it.quantity}</td>
              <td className="py-2 text-right tabular-nums">{fmtMoney(Number(it.price))}</td>
              <td className="py-2 text-right tabular-nums">
                {fmtMoney(Number(it.price) * it.quantity)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 ml-auto w-full max-w-sm text-sm">
        <Row label="Subtotal" value={fmtMoney(subtotal)} />
        <Row label="Shipping" value={shipping === 0 ? "Free" : fmtMoney(shipping)} />
        {discount > 0 && <Row label="Discount" value={`−${fmtMoney(discount)}`} />}
        <Row label="VAT (20%)" value={fmtMoney(tax)} />
        <div className="my-2 border-t border-gray-300" />
        <Row label="Total" value={fmtMoney(Number(order.total))} strong />
      </div>

      {order.notes && (
        <div className="mt-8 rounded-md border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700 print:bg-white">
          <div className="mb-1 font-semibold uppercase tracking-widest text-gray-500">
            Notes
          </div>
          {order.notes}
        </div>
      )}

      <div className="mt-10 text-center text-[10px] text-gray-500">
        Thank you for your order — MZR Parts
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between py-1 ${strong ? "text-base font-bold" : ""}`}>
      <span className={strong ? "" : "text-gray-600"}>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
