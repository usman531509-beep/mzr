"use client";

import { useMemo, useState } from "react";
import { Clock, History, MapPin, Phone, ShieldCheck } from "lucide-react";
import { fmtMoney } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";

export type UserOrderItem = {
  id: string;
  name: string;
  quantity: number;
  price: number;
  originalPrice: number;
  image: string | null;
};

export type UserOrderRow = {
  id: string;
  orderNumber?: string | null;
  status: "PENDING" | "PAID" | "SHIPPED" | "DELIVERED" | "CANCELLED" | string;
  total: number;
  createdAt: string;
  byAdmin: boolean;
  shipping: string;
  phone: string;
  items: UserOrderItem[];
};

const STATUSES = ["PENDING", "PAID", "SHIPPED", "DELIVERED", "CANCELLED"] as const;

const STATUS_DOT: Record<string, string> = {
  PENDING:   "bg-amber-400",
  PAID:      "bg-blue-400",
  SHIPPED:   "bg-indigo-400",
  DELIVERED: "bg-emerald-400",
  CANCELLED: "bg-rose-400",
};

export function UserOrdersButton({
  userName,
  orders,
}: {
  userName: string;
  orders: UserOrderRow[];
}) {
  const [open, setOpen] = useState(false);

  const counts = useMemo(() => {
    const out: Record<string, number> = { PENDING: 0, PAID: 0, SHIPPED: 0, DELIVERED: 0, CANCELLED: 0 };
    for (const o of orders) out[o.status] = (out[o.status] ?? 0) + 1;
    return out;
  }, [orders]);

  const total = orders.length;
  const totalSpent = orders
    .filter((o) => o.status !== "CANCELLED")
    .reduce((s, o) => s + Number(o.total), 0);

  if (total === 0) {
    return <span className="text-xs text-muted-foreground">No orders</span>;
  }

  return (
    <>
      <div className="flex flex-col items-start gap-1">
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <History className="h-3.5 w-3.5" /> Order history
          <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono">
            {total}
          </span>
        </Button>
        <span className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
          {STATUSES.map((s) =>
            counts[s] > 0 ? (
              <span key={s} className="inline-flex items-center gap-1">
                <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[s]}`} />
                <span className="font-mono">{counts[s]}</span>
                <span className="opacity-70">{s.toLowerCase()}</span>
              </span>
            ) : null,
          )}
        </span>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              {userName}&apos;s order history
            </DialogTitle>
            <DialogDescription>
              {total} order{total === 1 ? "" : "s"} · {fmtMoney(totalSpent)} spent (excl. cancelled)
            </DialogDescription>
          </DialogHeader>

          <div className="mb-2 flex flex-wrap gap-1.5">
            {STATUSES.map((s) =>
              counts[s] > 0 ? (
                <Badge
                  key={s}
                  variant="secondary"
                  className="gap-1.5 text-[11px] uppercase tracking-wider"
                >
                  <span className={`h-2 w-2 rounded-full ${STATUS_DOT[s]}`} />
                  {s} · {counts[s]}
                </Badge>
              ) : null,
            )}
          </div>

          <div className="max-h-[65vh] space-y-3 overflow-y-auto pr-1">
            {orders.map((o) => {
              const totalUnits = o.items.reduce((s, i) => s + i.quantity, 0);
              return (
                <div key={o.id} className="rounded-lg border border-border bg-card/40">
                  <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-4 py-2.5">
                    <span className="font-mono text-[11px] text-muted-foreground">{o.orderNumber ?? `#${o.id.slice(0, 8)}`}</span>
                    <OrderStatusBadge status={o.status} />
                    {o.byAdmin && (
                      <span className="st info whitespace-nowrap">
                        <ShieldCheck className="mr-1 inline h-3 w-3 align-[-2px]" /> By admin
                      </span>
                    )}
                    <span className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(o.createdAt).toLocaleString("en-GB")}
                    </span>
                  </div>

                  <ul className="divide-y divide-border/60">
                    {o.items.map((it) => {
                      const discounted = it.originalPrice > it.price;
                      return (
                        <li key={it.id} className="flex items-center gap-3 px-4 py-2.5">
                          <Thumb src={it.image} alt={it.name} />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium">{it.name}</div>
                            <div className="text-[11px] text-muted-foreground">
                              {discounted ? (
                                <>
                                  <span className="text-emerald-700">{fmtMoney(it.price)}</span>{" "}
                                  <span className="line-through">{fmtMoney(it.originalPrice)}</span>
                                </>
                              ) : (
                                fmtMoney(it.price)
                              )}{" "}
                              × {it.quantity}
                            </div>
                          </div>
                          <div className="text-sm font-medium tabular-nums">
                            {fmtMoney(it.price * it.quantity)}
                          </div>
                        </li>
                      );
                    })}
                  </ul>

                  <div className="flex flex-wrap items-end justify-between gap-3 border-t border-border/60 px-4 py-2.5 text-[12px]">
                    <div className="space-y-0.5 text-muted-foreground">
                      {o.shipping && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3 w-3" /> <span>{o.shipping}</span>
                        </div>
                      )}
                      {o.phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3 w-3" /> <span>{o.phone}</span>
                        </div>
                      )}
                    </div>
                    <div className="ml-auto text-right">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {totalUnits} item{totalUnits === 1 ? "" : "s"}
                      </div>
                      <div className="text-base font-bold tabular-nums">{fmtMoney(o.total)}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Thumb({ src, alt }: { src: string | null; alt: string }) {
  return (
    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded border border-border bg-muted">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      ) : null}
    </div>
  );
}
