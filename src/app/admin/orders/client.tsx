"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, Plus, Search, ShieldCheck, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { Separator } from "@/components/ui/separator";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  Table, TableHeader, TableHead, TableRow, TableBody, TableCell,
} from "@/components/ui/table";
import { fmtMoney } from "@/lib/format";

type OrderRow = {
  id: string;
  status: string;
  total: number;
  customer: string;
  email: string;
  phone: string;
  address: string;
  items: { name: string; qty: number; price: number }[];
  createdAt: string;
  createdByAdmin: string | null;
};

const STATUSES = ["PENDING", "PAID", "SHIPPED", "DELIVERED", "CANCELLED"] as const;

const STATUS_TRIGGER: Record<string, string> = {
  PENDING:   "border-amber-500/40 text-amber-300",
  PAID:      "border-blue-500/40 text-blue-300",
  SHIPPED:   "border-indigo-500/40 text-indigo-300",
  DELIVERED: "border-emerald-500/40 text-emerald-300",
  CANCELLED: "border-rose-500/40 text-rose-300",
};

export function OrdersClient({ initial }: { initial: OrderRow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState<OrderRow | null>(null);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return initial.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (!s) return true;
      return (
        o.id.toLowerCase().includes(s) ||
        o.customer.toLowerCase().includes(s) ||
        o.email.toLowerCase().includes(s) ||
        o.phone.toLowerCase().includes(s)
      );
    });
  }, [initial, q, statusFilter]);

  const setStatus = async (id: string, status: string) => {
    const res = await fetch(`/api/admin/orders/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      toast.success(`Order set to ${status}`);
      router.refresh();
    } else toast.error("Failed to update status");
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} of {initial.length} orders
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/orders/new">
            <Plus className="h-3.5 w-3.5" /> New order
          </Link>
        </Button>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search id, customer, email, phone…"
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
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                  {initial.length === 0 ? "No orders yet." : "No orders match these filters."}
                </TableCell></TableRow>
              ) : filtered.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-xs">{o.id.slice(0, 8)}…</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-medium">{o.customer}</span>
                      {o.createdByAdmin && (
                        <Badge className="gap-1 bg-blue-500/15 text-blue-300 ring-1 ring-inset ring-blue-500/30 hover:bg-blue-500/15">
                          <ShieldCheck className="h-3 w-3" /> By admin
                        </Badge>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground">{o.email}</div>
                    {o.createdByAdmin && (
                      <div className="text-[10px] text-muted-foreground">via {o.createdByAdmin}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{new Date(o.createdAt).toLocaleDateString("en-GB")}</TableCell>
                  <TableCell>
                    <Select value={o.status} onValueChange={(v) => setStatus(o.id, v)}>
                      <SelectTrigger className={`h-8 w-[140px] border ${STATUS_TRIGGER[o.status] ?? ""}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right font-medium">{fmtMoney(o.total)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setOpen(o)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Sheet open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <SheetContent className="w-full sm:max-w-md">
          {open && (
            <>
              <SheetHeader>
                <SheetTitle>Order #{open.id.slice(0, 8)}</SheetTitle>
                <SheetDescription>{new Date(open.createdAt).toLocaleString("en-GB")}</SheetDescription>
              </SheetHeader>

              <div className="mt-5 space-y-5">
                <div className="flex items-center justify-between">
                  <OrderStatusBadge status={open.status} />
                  <div className="text-lg font-bold">{fmtMoney(open.total)}</div>
                </div>

                <Separator />

                <section>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Items</h3>
                  <ul className="space-y-2">
                    {open.items.map((i, idx) => (
                      <li key={idx} className="flex justify-between text-sm">
                        <span>{i.name} <span className="text-muted-foreground">× {i.qty}</span></span>
                        <span className="tabular-nums">{fmtMoney(i.price * i.qty)}</span>
                      </li>
                    ))}
                  </ul>
                </section>

                <Separator />

                <section>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Shipping</h3>
                  <div className="rounded-md border border-border p-3 text-sm">
                    <div className="font-medium">{open.customer}</div>
                    <div className="text-muted-foreground">{open.email}</div>
                    <div className="text-muted-foreground">{open.phone}</div>
                    <div className="mt-2 text-muted-foreground">{open.address}</div>
                  </div>
                </section>

                <Separator />

                <section>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Update status</h3>
                  <Select value={open.status} onValueChange={(v) => { setStatus(open.id, v); setOpen({ ...open, status: v }); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </section>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
