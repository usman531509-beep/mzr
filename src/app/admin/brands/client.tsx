"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Image as ImageIcon, Pencil, Plus, Search, Trash2, X } from "lucide-react";

import { confirmAction } from "@/lib/confirm-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { ImageUpload } from "@/components/admin/ImageUpload";

type Row = { id: string; name: string; slug: string; logoUrl: string | null; count: number };

export function BrandsClient({ initial }: { initial: Row[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
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
    const res = await fetch("/api/admin/brands", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, logoUrl }),
    });
    setBusy(false);
    if (res.ok) {
      toast.success("Brand created");
      setName(""); setLogoUrl(null); setOpen(false);
      router.refresh();
    } else toast.error("Failed to create brand");
  };
  const [editing, setEditing] = useState<Row | null>(null);
  const [editName, setEditName] = useState("");
  const [editLogoUrl, setEditLogoUrl] = useState<string | null>(null);
  const startEdit = (row: Row) => { setEditing(row); setEditName(row.name); setEditLogoUrl(row.logoUrl); };
  const update = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    const res = await fetch(`/api/admin/brands/${editing.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: editName, logoUrl: editLogoUrl }),
    });
    setBusy(false);
    if (res.ok) {
      toast.success("Brand updated");
      setEditing(null);
      router.refresh();
    } else toast.error("Failed to update brand");
  };

  const del = async (id: string, label: string) => {
    const ok = await confirmAction({
      title: `Delete "${label}"?`,
      description: "Brands with linked products or bike models can't be deleted — those would orphan. Remove or reassign first.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    const res = await fetch(`/api/admin/brands?id=${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Brand deleted"); router.refresh(); }
    else toast.error("Failed to delete");
  };

  return (
    <div className="space-y-4">
      <div className="adm-top !mb-0">
        <div>
          <div className="crumb">Admin</div>
          <h1 className="font-head text-3xl font-normal uppercase leading-none tracking-wide">Bike Brands</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manufacturers used on products and as bike-model parents.</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setName(""); setLogoUrl(null); } }}>
          <DialogTrigger asChild>
            <button type="button" className="btn-red !px-4 !py-2.5">
              <Plus className="h-3.5 w-3.5" /> New brand
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New brand</DialogTitle></DialogHeader>
            <form onSubmit={create} className="space-y-3">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ducati" required />
              </div>
              <ImageUpload
                label="Logo (optional)"
                hint="Shown on the home page 'Shop by Bike' tiles. Falls back to the brand initial if empty."
                fit="contain"
                value={logoUrl}
                onChange={setLogoUrl}
              />
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
            placeholder="Search brands…"
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
              <th className="!w-16">Logo</th>
              <th>Name</th>
              <th>Slug</th>
              <th className="!text-right">Products</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={5} className="!py-10 !text-center text-muted-foreground">
                {initial.length === 0 ? "No brands yet." : "No brands match your search."}
              </td></tr>
            ) : filtered.map((b) => (
              <tr key={b.id}>
                <td>
                  {b.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={b.logoUrl}
                      alt=""
                      className="h-9 w-9 rounded border border-border bg-white object-contain p-0.5"
                    />
                  ) : (
                    <span className="flex h-9 w-9 items-center justify-center rounded border border-dashed border-border text-muted-foreground">
                      <ImageIcon className="h-4 w-4" />
                    </span>
                  )}
                </td>
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
          <DialogHeader><DialogTitle>Edit brand</DialogTitle></DialogHeader>
          <form onSubmit={update} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} required />
            </div>
            <ImageUpload
              label="Logo (optional)"
              hint="Shown on the home page 'Shop by Bike' tiles."
              fit="contain"
              value={editLogoUrl}
              onChange={setEditLogoUrl}
            />
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
