"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { confirmAction } from "@/lib/confirm-store";
import { fmtMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AdminFilterBar } from "@/components/admin/AdminFilterBar";
import { DateRangeFilter } from "@/components/admin/DateRangeFilter";

type Expense = {
  id: string;
  title: string;
  category: string;
  amount: number;
  paidOn: string;
  vendor: string | null;
  paymentMethod: string | null;
  notes: string | null;
  createdBy: string | null;
};

const CATEGORY_PRESETS = [
  "Inventory",
  "Logistics",
  "Rent",
  "Utilities",
  "Salaries",
  "Marketing",
  "Software",
  "Office",
  "Other",
];

export function ExpensesClient({
  expenses, totalAmount, totalCount, allCategories,
}: {
  expenses: Expense[];
  totalAmount: number;
  totalCount: number;
  allCategories: string[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Expense | null>(null);
  const [open, setOpen] = useState(false);

  const filterCategories = Array.from(
    new Set([...CATEGORY_PRESETS, ...allCategories]),
  );

  const startCreate = () => { setEditing(null); setOpen(true); };
  const startEdit = (e: Expense) => { setEditing(e); setOpen(true); };

  const remove = async (id: string, title: string) => {
    const ok = await confirmAction({
      title: `Delete expense "${title}"?`,
      description: "Removes this expense from the books permanently.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    const res = await fetch(`/api/admin/expenses/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Expense deleted");
      router.refresh();
    } else toast.error("Failed to delete");
  };

  return (
    <div className="space-y-4">
      <DateRangeFilter />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <AdminFilterBar
          searchPlaceholder="Search title, vendor, notes…"
          filters={[
            {
              param: "category",
              label: "Category",
              any: "All categories",
              options: filterCategories.map((c) => ({ value: c, label: c })),
            },
          ]}
        />
        <Button onClick={startCreate}>
          <Plus className="h-3.5 w-3.5" /> New expense
        </Button>
      </div>

      <div className="grid g-2 !mb-0">
        <Stat label="Total" value={fmtMoney(totalAmount)} />
        <Stat label="Entries" value={String(totalCount)} />
      </div>

      <div className="table-wrap">
        <table className="t">
          <thead>
            <tr>
              <th>Date</th>
              <th>Title</th>
              <th>Category</th>
              <th>Vendor</th>
              <th>Payment</th>
              <th className="text-right">Amount</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-sm text-muted-foreground">
                  No expenses recorded for this range.
                </td>
              </tr>
            ) : expenses.map((e) => (
              <tr key={e.id}>
                <td className="text-sm text-muted-foreground">
                  {new Date(e.paidOn).toLocaleDateString("en-GB")}
                </td>
                <td>
                  <div className="font-medium">{e.title}</div>
                  {e.notes && (
                    <div className="line-clamp-1 text-xs text-muted-foreground">{e.notes}</div>
                  )}
                </td>
                <td>
                  <span className="st muted">{e.category}</span>
                </td>
                <td className="text-sm">{e.vendor ?? "—"}</td>
                <td className="text-sm">{e.paymentMethod ?? "—"}</td>
                <td className="text-right font-medium tabular-nums">
                  {fmtMoney(e.amount)}
                </td>
                <td className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(e)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="icon"
                      onClick={() => remove(e.id, e.title)}
                      className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Remount with a fresh key whenever the dialog opens for a different
          expense (or for create), so the internal form state always starts
          from the right defaults. */}
      <ExpenseDialog
        key={`${open ? "open" : "closed"}-${editing?.id ?? "new"}`}
        open={open}
        onOpenChange={setOpen}
        expense={editing}
        categoryPresets={filterCategories}
        onSaved={() => { setOpen(false); router.refresh(); }}
      />
    </div>
  );
}

// Reference .stat card (theme.css) — label + value.
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <div className="lbl">{label}</div>
      <div className="val tabular-nums">{value}</div>
    </div>
  );
}

function ExpenseDialog({
  open, onOpenChange, expense, categoryPresets, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  expense: Expense | null;
  categoryPresets: string[];
  onSaved: () => void;
}) {
  const isEdit = !!expense;

  // Format a date as YYYY-MM-DD using local time (toISOString uses UTC and
  // can roll the date back/forward across the day boundary in some zones).
  const localDate = (d: Date) => {
    const y  = d.getFullYear();
    const m  = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  };

  const [form, setForm] = useState(() => ({
    title: expense?.title ?? "",
    category: expense?.category ?? "Inventory",
    amount: expense ? String(expense.amount) : "",
    paidOn: expense ? localDate(new Date(expense.paidOn)) : localDate(new Date()),
    vendor: expense?.vendor ?? "",
    paymentMethod: expense?.paymentMethod ?? "",
    notes: expense?.notes ?? "",
  }));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setErr("Amount must be a positive number.");
      return;
    }
    setBusy(true);
    try {
      const url = isEdit ? `/api/admin/expenses/${expense!.id}` : "/api/admin/expenses";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, amount }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        const msg = data.error ?? `Server returned ${res.status}`;
        setErr(msg);
        toast.error(msg);
        return;
      }
      toast.success(isEdit ? "Expense updated" : "Expense recorded");
      onSaved();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit expense" : "New expense"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update the recorded expense." : "Record an operational expense."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label className="mb-1.5 block text-xs">Title *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">Category *</Label>
            <Select
              value={form.category === "" ? undefined : (categoryPresets.includes(form.category) ? form.category : "__custom__")}
              onValueChange={(v) => {
                if (v === "__custom__") {
                  setForm({ ...form, category: "" });
                } else {
                  setForm({ ...form, category: v });
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pick a category" />
              </SelectTrigger>
              <SelectContent>
                {categoryPresets.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
                <SelectItem value="__custom__">Other (type below)</SelectItem>
              </SelectContent>
            </Select>
            {!categoryPresets.includes(form.category) && (
              <Input
                placeholder="Custom category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="mt-2"
                required
              />
            )}
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">Amount *</Label>
            <Input
              type="number" step="0.01" min="0"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              required
            />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">Date *</Label>
            <Input
              type="date"
              value={form.paidOn}
              onChange={(e) => setForm({ ...form, paidOn: e.target.value })}
              required
            />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">Vendor</Label>
            <Input value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} />
          </div>
          <div className="col-span-2">
            <Label className="mb-1.5 block text-xs">Payment method</Label>
            <Input
              placeholder="Cash, bank transfer, card…"
              value={form.paymentMethod}
              onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
            />
          </div>
          <div className="col-span-2">
            <Label className="mb-1.5 block text-xs">Notes</Label>
            <Textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          {err && <p className="col-span-2 text-sm text-destructive">{err}</p>}
          <DialogFooter className="col-span-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              {isEdit ? "Save changes" : "Record expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
