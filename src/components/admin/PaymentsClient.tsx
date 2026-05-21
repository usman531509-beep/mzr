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
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

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

const STATUS_META: Record<string, { label: string; icon: typeof CheckCircle2; className: string }> = {
  SUCCEEDED: { label: "Succeeded", icon: CheckCircle2, className: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30" },
  PENDING:   { label: "Pending",   icon: Clock4,       className: "bg-amber-500/15 text-amber-300 ring-amber-500/30" },
  FAILED:    { label: "Failed",    icon: XCircle,      className: "bg-rose-500/15 text-rose-300 ring-rose-500/30" },
  CANCELED:  { label: "Canceled",  icon: XCircle,      className: "bg-muted text-muted-foreground ring-border" },
  REFUNDED:  { label: "Refunded",  icon: RotateCcw,    className: "bg-blue-500/15 text-blue-300 ring-blue-500/30" },
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

      <div className="rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Payment</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>When</TableHead>
              <TableHead className="text-right">Receipt</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="p-10 text-center text-sm text-muted-foreground">
                  <CreditCard className="mx-auto mb-2 h-6 w-6" />
                  {rows.length === 0 ? "No payments yet." : "No payments match these filters."}
                </TableCell>
              </TableRow>
            ) : filtered.map((p) => {
              const meta = STATUS_META[p.status] ?? STATUS_META.PENDING;
              const Icon = meta.icon;
              return (
                <TableRow key={p.id} className="align-top">
                  <TableCell>
                    <div className="font-mono text-[11px]">{p.providerPaymentId}</div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{p.provider}</div>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/admin/orders`}
                      className="font-mono text-xs hover:underline"
                    >
                      {p.order.orderNumber ?? `${p.order.id.slice(0, 8)}…`}
                    </Link>
                    <div className="text-[11px] text-muted-foreground">
                      Order total {fmtMoney(p.order.total)} · {p.order.status}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    <div>{p.user?.name ?? p.order.customerName}</div>
                    <div className="text-[11px] text-muted-foreground">{p.order.customerEmail}</div>
                  </TableCell>
                  <TableCell>
                    <Badge className={`gap-1 ring-1 ring-inset ${meta.className} hover:${meta.className}`}>
                      <Icon className="h-3 w-3" /> {meta.label}
                    </Badge>
                    {p.failureMessage && (
                      <div className="mt-1 line-clamp-2 max-w-[260px] text-[11px] text-rose-400/80" title={p.failureMessage}>
                        {p.failureMessage}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {fmtMoney(p.amount)}
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {p.currency}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    <div>{new Date(p.createdAt).toLocaleDateString("en-GB")}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {new Date(p.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {p.receiptUrl ? (
                      <a
                        href={p.receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        <Receipt className="h-3.5 w-3.5" /> View
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
