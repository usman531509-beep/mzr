"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Plus, Search, Trash2, X } from "lucide-react";

import { confirmAction } from "@/lib/confirm-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableHeader, TableHead, TableRow, TableBody, TableCell,
} from "@/components/ui/table";

type Row = { id: string; name: string; brand: string; brandId: string; yearStart: number; yearEnd: number; count: number };

export function BikeModelsClient({
  initial, brands,
}: {
  initial: Row[]; brands: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    brandId: brands[0]?.id ?? "",
    yearStart: 2020,
    yearEnd: new Date().getFullYear(),
  });
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const [brandFilter, setBrandFilter] = useState("all");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return initial.filter((m) => {
      if (brandFilter !== "all" && m.brand !== brandFilter) return false;
      if (!s) return true;
      return m.name.toLowerCase().includes(s) || m.brand.toLowerCase().includes(s);
    });
  }, [initial, q, brandFilter]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/admin/bike-models", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) {
      toast.success("Bike model created");
      setForm({ ...form, name: "" });
      setOpen(false);
      router.refresh();
    } else {
      toast.error(data.error ?? "Failed to create");
    }
  };
  const [editing, setEditing] = useState<Row | null>(null);
  const [editForm, setEditForm] = useState({
    name: "", brandId: "", yearStart: 2020, yearEnd: new Date().getFullYear(),
  });
  const startEdit = (row: Row) => {
    setEditing(row);
    setEditForm({
      name: row.name, brandId: row.brandId,
      yearStart: row.yearStart, yearEnd: row.yearEnd,
    });
  };
  const update = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    const res = await fetch(`/api/admin/bike-models/${editing.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(editForm),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) {
      toast.success("Bike model updated");
      setEditing(null);
      router.refresh();
    } else {
      toast.error(data.error ?? "Failed to update");
    }
  };

  const del = async (id: string, label: string) => {
    const ok = await confirmAction({
      title: `Delete "${label}"?`,
      description: "Removes this bike model and any product fitments linked to it. This can't be undone.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    const res = await fetch(`/api/admin/bike-models?id=${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Bike model deleted"); router.refresh(); }
    else toast.error("Failed to delete");
  };

  return (
    <div className="space-y-4">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bike models</h1>
          <p className="text-sm text-muted-foreground">Models drive the compatibility filter on the storefront.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-3.5 w-3.5" /> New model</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New bike model</DialogTitle></DialogHeader>
            <form onSubmit={create} className="space-y-3">
              <div className="space-y-1.5">
                <Label>Brand</Label>
                <Select value={form.brandId} onValueChange={(v) => setForm({ ...form, brandId: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Model name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. CBR 250R" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Year start</Label>
                  <Input type="number" value={form.yearStart} onChange={(e) => setForm({ ...form, yearStart: Number(e.target.value) })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Year end</Label>
                  <Input type="number" value={form.yearEnd} onChange={(e) => setForm({ ...form, yearEnd: Number(e.target.value) })} />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={busy}>Create</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search models or brand…"
            className="h-9 pl-8 pr-8"
          />
          {q && (
            <button type="button" onClick={() => setQ("")}
              className="absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Clear search"
            ><X className="h-3 w-3" /></button>
          )}
        </div>
        <Select value={brandFilter} onValueChange={setBrandFilter}>
          <SelectTrigger className="h-9 w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All brands</SelectItem>
            {brands.map((b) => <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Brand</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Years</TableHead>
                <TableHead className="text-right">Parts fitted</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                  {initial.length === 0 ? "No bike models yet." : "No models match these filters."}
                </TableCell></TableRow>
              ) : filtered.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.brand}</TableCell>
                  {/* Compose the display label inline so admins don't have
                      to type "CBR 150 (2020-2023)" into the model name. The
                      stored `name` stays clean ("CBR 150") — the years come
                      from the dedicated yearStart/yearEnd inputs. */}
                  <TableCell>
                    {m.name} <span className="text-muted-foreground">({m.yearStart}–{m.yearEnd})</span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{m.yearStart}–{m.yearEnd}</TableCell>
                  <TableCell className="text-right">{m.count}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(m)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        onClick={() => del(m.id, `${m.brand} ${m.name}`)}
                        className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(v) => { if (!v) setEditing(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit bike model</DialogTitle></DialogHeader>
          <form onSubmit={update} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Brand</Label>
              <Select value={editForm.brandId} onValueChange={(v) => setEditForm({ ...editForm, brandId: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Model name</Label>
              <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Year start</Label>
                <Input type="number" value={editForm.yearStart} onChange={(e) => setEditForm({ ...editForm, yearStart: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Year end</Label>
                <Input type="number" value={editForm.yearEnd} onChange={(e) => setEditForm({ ...editForm, yearEnd: Number(e.target.value) })} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
              <Button type="submit" disabled={busy}>Save changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
