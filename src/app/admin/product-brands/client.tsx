"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Plus, Search, Trash2, X } from "lucide-react";

import { confirmAction } from "@/lib/confirm-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";

type Row = { id: string; name: string; slug: string; count: number };

export function ProductBrandsClient({ initial }: { initial: Row[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return initial;
    return initial.filter((b) =>
      b.name.toLowerCase().includes(s) || b.slug.toLowerCase().includes(s),
    );
  }, [initial, q]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    const res = await fetch("/api/admin/product-brands", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setBusy(false);
    if (res.ok) {
      toast.success("Product brand created");
      setName(""); setOpen(false);
      router.refresh();
    } else toast.error("Failed to create product brand");
  };

  const [editing, setEditing] = useState<Row | null>(null);
  const [editName, setEditName] = useState("");
  const startEdit = (row: Row) => { setEditing(row); setEditName(row.name); };
  const update = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    const res = await fetch(`/api/admin/product-brands/${editing.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: editName }),
    });
    setBusy(false);
    if (res.ok) {
      toast.success("Product brand updated");
      setEditing(null);
      router.refresh();
    } else toast.error("Failed to update product brand");
  };

  const del = async (id: string, label: string) => {
    const ok = await confirmAction({
      title: `Delete "${label}"?`,
      description:
        "Products tagged with this brand will keep their other info; the product-brand tag will simply be cleared on those products.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    const res = await fetch(`/api/admin/product-brands?id=${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Product brand deleted"); router.refresh(); }
    else toast.error("Failed to delete");
  };

  return (
    <div className="space-y-4">
      <div className="adm-top !mb-0">
        <div>
          <div className="crumb">Admin</div>
          <h1 className="font-head text-3xl font-normal uppercase leading-none tracking-wide">Product Brands</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manufacturer of the part itself (Brembo, NGK, EBC, K&amp;N). Different from the bike-make brand it fits.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <button type="button" className="btn-red !px-4 !py-2.5">
              <Plus className="h-3.5 w-3.5" /> New product brand
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New product brand</DialogTitle></DialogHeader>
            <form onSubmit={create} className="space-y-3">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Brembo" required />
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={busy}>Create</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="toolbar !mb-0">
        <div className="relative min-w-[220px] max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search product brands…"
            className="h-9 !pl-8 !pr-8"
          />
          {q && (
            <button type="button" onClick={() => setQ("")}
              className="absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Clear search"
            ><X className="h-3 w-3" /></button>
          )}
        </div>
      </div>

      <div className="table-wrap">
        <table className="t">
          <thead>
            <tr>
              <th>Name</th>
              <th>Slug</th>
              <th className="!text-right">Products</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={4} className="!py-10 !text-center text-muted-foreground">
                {initial.length === 0 ? "No product brands yet." : "No product brands match your search."}
              </td></tr>
            ) : filtered.map((b) => (
              <tr key={b.id}>
                <td className="font-semibold">{b.name}</td>
                <td><span className="kbd">{b.slug}</span></td>
                <td className="!text-right">{b.count}</td>
                <td className="!text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(b)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="icon"
                      onClick={() => del(b.id, b.name)}
                      className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!editing} onOpenChange={(v) => { if (!v) setEditing(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit product brand</DialogTitle></DialogHeader>
          <form onSubmit={update} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} required />
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
