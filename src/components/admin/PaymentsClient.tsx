"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  CheckCircle2, Clock4, CreditCard, ExternalLink, Receipt, RotateCcw, Search,
  XCircle, X,
} from "lucide-react";

import { fmtMoney } from "@/lib/format";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type PaymentStatus = "PENDING" | "SUCCEEDED" | "FAILED" | "CANCELED" | "REFUNDED";

export type PaymentRow = {
  id: string;
  providerPaymentId: string;
  provider: string;
  status: PaymentStatus | string;
  amount: number;
  currency: string;
  receiptUrl: string | null;
  failureMessage: string | null;
  createdAt: string;
  order: {
    id: string;
    orderNumber: string | null;
    customerName: string;
    customerEmail: string;
    total: number;
    status: string;
  };
  user: { name: string | null; email: string } | null;
};

// Status → reference .st pill variant (theme.css) per payments.html:
// Succeeded=ok, Pending=warn, Failed=bad, Canceled=muted, Refunded=info.
const STATUS_META: Record<string, { label: string; icon: typeof CheckCircle2; variant: string }> = {
  SUCCEEDED: { label: "Succeeded", icon: CheckCircle2, variant: "ok" },
  PENDING:   { label: "Pending",   icon: Clock4,       variant: "warn" },
  FAILED:    { label: "Failed",    icon: XCircle,      variant: "bad" },
  CANCELED:  { label: "Canceled",  icon: XCircle,      variant: "muted" },
  REFUNDED:  { label: "Refunded",  icon: RotateCcw,    variant: "info" },
};

export function PaymentsClient({ rows }: { rows: PaymentRow[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const status = params.get("status") ?? "";

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((p) =>
      p.providerPaymentId.toLowerCase().includes(needle) ||
      (p.order.orderNumber ?? "").toLowerCase().includes(needle) ||
      p.order.customerEmail.toLowerCase().includes(needle) ||
      p.order.customerName.toLowerCase().includes(needle),
    );
  }, [rows, q]);

  const pushParam = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value && value !== "all") next.set(key, value); else next.delete(key);
    router.push(`${pathname}?${next.toString()}`);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[260px] flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search PI id, order number, customer email…"
            className="h-9 pl-8 pr-8"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              className="absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        <Select value={status || "all"} onValueChange={(v) => pushParam("status", v)}>
          <SelectTrigger className="h-9 w-[170px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="SUCCEEDED">Succeeded</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="FAILED">Failed</SelectItem>
            <SelectItem value="CANCELED">Canceled</SelectItem>
            <SelectItem value="REFUNDED">Refunded</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto text-xs text-muted-foreground">
          {filtered.length} of {rows.length}
        </div>
      </div>

      <div className="table-wrap">
        <table className="t">
          <thead>
            <tr>
              <th>Payment</th>
              <th>Order</th>
              <th>Customer</th>
              <th>Status</th>
              <th className="text-right">Amount</th>
              <th>When</th>
              <th className="text-right">Receipt</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-10 text-center text-sm text-muted-foreground">
                  <CreditCard className="mx-auto mb-2 h-6 w-6" />
                  {rows.length === 0 ? "No payments yet." : "No payments match these filters."}
                </td>
              </tr>
            ) : filtered.map((p) => {
              const meta = STATUS_META[p.status] ?? STATUS_META.PENDING;
              const Icon = meta.icon;
              return (
                <tr key={p.id} className="align-top">
                  <td>
                    <div className="font-mono text-[11px]">{p.providerPaymentId}</div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{p.provider}</div>
                  </td>
                  <td>
                    <Link
                      href={`/admin/orders`}
                      className="font-mono text-xs text-ink hover:underline"
                    >
                      {p.order.orderNumber ?? `${p.order.id.slice(0, 8)}…`}
                    </Link>
                    <div className="text-[11px] text-muted-foreground">
                      Order total {fmtMoney(p.order.total)} · {p.order.status}
                    </div>
                  </td>
                  <td className="text-sm">
                    <div>{p.user?.name ?? p.order.customerName}</div>
                    <div className="text-[11px] text-muted-foreground">{p.order.customerEmail}</div>
                  </td>
                  <td>
                    <span className={`st ${meta.variant} whitespace-nowrap`}>
                      <Icon className="mr-1 inline h-3 w-3 align-[-2px]" />
                      {meta.label}
                    </span>
                    {p.failureMessage && (
                      <div className="mt-1 line-clamp-2 max-w-[260px] text-[11px] text-rose-700/80" title={p.failureMessage}>
                        {p.failureMessage}
                      </div>
                    )}
                  </td>
                  <td className="text-right font-medium tabular-nums">
                    {fmtMoney(p.amount)}
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {p.currency}
                    </div>
                  </td>
                  <td className="text-sm">
                    <div>{new Date(p.createdAt).toLocaleDateString("en-GB")}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {new Date(p.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </td>
                  <td className="text-right">
                    {p.receiptUrl ? (
                      <a
                        href={p.receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-red hover:underline"
                      >
                        <Receipt className="h-3.5 w-3.5" /> View
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
