"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Megaphone, Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";

// Curated set of preset icons — a quick-pick palette in the offer dialog.
// Keep it small enough to fit in a single popover grid without scrolling.
// Admins can still type any character into the icon field directly.
const PRESET_ICONS: Array<{ char: string; hint: string }> = [
  { char: "🎉", hint: "Celebration"   },
  { char: "🔥", hint: "Hot deal"      },
  { char: "✨", hint: "Special"       },
  { char: "🚚", hint: "Shipping"      },
  { char: "📦", hint: "Delivery"      },
  { char: "🚀", hint: "Fast / launch" },
  { char: "⚡", hint: "Flash sale"    },
  { char: "💰", hint: "Savings"       },
  { char: "🏷️", hint: "Price tag"     },
  { char: "💯", hint: "100% guarantee" },
  { char: "🛡️", hint: "Warranty"      },
  { char: "🎁", hint: "Free gift"     },
  { char: "⭐", hint: "Featured"      },
  { char: "🆕", hint: "New"           },
  { char: "🆓", hint: "Free"          },
  { char: "🛒", hint: "Shopping"      },
  { char: "🏍️", hint: "Motorbike"     },
  { char: "🛞", hint: "Tyre"          },
  { char: "🔧", hint: "Parts"         },
  { char: "📍", hint: "Location"      },
];

type Row = {
  id: string;
  text: string;
  icon: string | null;
  active: boolean;
  position: number;
};

export function OffersClient({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Row | null>(null);
  const [creating, setCreating] = useState(false);

  const del = async (id: string, label: string) => {
    if (!confirm(`Delete offer "${label}"?`)) return;
    const res = await fetch(`/api/admin/offers/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      toast.error(data.error ?? "Could not delete");
      return;
    }
    toast.success("Offer deleted");
    router.refresh();
  };

  const activeCount = rows.filter((r) => r.active).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[12px] text-muted-foreground">
          {activeCount === 0 ? (
            <>The top bar is currently <strong className="text-foreground">hidden</strong> — no active offers.</>
          ) : (
            <>{activeCount} active offer{activeCount === 1 ? "" : "s"} showing in the top bar.</>
          )}
        </p>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-3.5 w-3.5" /> New offer
        </Button>
      </div>

      <div className="rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">Icon</TableHead>
              <TableHead>Text</TableHead>
              <TableHead className="w-[100px] text-center">Position</TableHead>
              <TableHead className="w-[160px]">Status</TableHead>
              <TableHead className="w-[100px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="p-10 text-center text-sm text-muted-foreground">
                  <Megaphone className="mx-auto mb-2 h-6 w-6" />
                  No offers yet — click &ldquo;New offer&rdquo; to add one.
                </TableCell>
              </TableRow>
            ) : rows.map((o) => (
              <TableRow key={o.id} className="align-top">
                <TableCell className="text-center text-lg">
                  {o.icon ?? <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell>
                  <div className="text-sm font-medium">{o.text}</div>
                </TableCell>
                <TableCell className="text-center text-sm tabular-nums">{o.position}</TableCell>
                <TableCell>
                  <OfferActiveToggle id={o.id} active={o.active} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(o)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="icon"
                      onClick={() => del(o.id, o.text)}
                      className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <OfferDialog
        key={creating ? "create" : (editing?.id ?? "closed")}
        open={creating || !!editing}
        offer={editing}
        onClose={() => { setCreating(false); setEditing(null); }}
        onSaved={() => { setCreating(false); setEditing(null); router.refresh(); }}
      />
    </div>
  );
}

function OfferActiveToggle({ id, active }: { id: string; active: boolean }) {
  const router = useRouter();
  const [optimistic, setOptimistic] = useState(active);
  const [busy, setBusy] = useState(false);

  const toggle = async (next: boolean) => {
    setOptimistic(next);
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/offers/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ active: next }),
      });
      if (!res.ok) {
        setOptimistic(!next);
        toast.error("Could not update offer");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Switch checked={optimistic} onCheckedChange={toggle} disabled={busy} />
      <span className={`text-xs ${optimistic ? "text-emerald-400" : "text-muted-foreground"}`}>
        {optimistic ? "Active" : "Hidden"}
      </span>
    </div>
  );
}

function OfferDialog({
  open, offer, onClose, onSaved,
}: {
  open: boolean;
  offer: Row | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!offer;
  const [form, setForm] = useState({
    text: offer?.text ?? "",
    icon: offer?.icon ?? "",
    position: offer?.position ?? 0,
  });
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.text.trim()) {
      toast.error("Text is required");
      return;
    }
    setBusy(true);
    try {
      const url = isEdit ? `/api/admin/offers/${offer!.id}` : "/api/admin/offers";
      const method = isEdit ? "PATCH" : "POST";
      const body: Record<string, unknown> = {
        text: form.text.trim(),
        icon: form.icon.trim() || null,
      };
      if (isEdit) body.position = form.position;
      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? "Could not save");
        return;
      }
      toast.success(isEdit ? "Offer updated" : "Offer created");
      onSaved();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit offer" : "New offer"}</DialogTitle>
          <DialogDescription>
            Shown in the storefront top bar when active. The icon is an
            emoji or single glyph rendered before the text — leave blank for
            none.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-[120px_1fr] gap-3">
            <Field label="Icon">
              <IconPicker
                value={form.icon}
                onChange={(v) => setForm({ ...form, icon: v })}
              />
            </Field>
            <Field label="Text *">
              <Input
                value={form.text}
                onChange={(e) => setForm({ ...form, text: e.target.value })}
                placeholder="Free shipping on orders over £200"
                maxLength={200}
                required
              />
            </Field>
          </div>
          {isEdit && (
            <Field label="Position (lower shows first)">
              <Input
                type="number"
                value={form.position}
                onChange={(e) => setForm({ ...form, position: Number(e.target.value) || 0 })}
                className="w-24"
              />
            </Field>
          )}
          <DialogFooter className="flex-row gap-2 sm:gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
              {isEdit ? "Save changes" : "Create offer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

/**
 * Icon input + preset emoji picker. The text input remains editable so
 * admins can paste any glyph; the dropdown is just a quick-pick palette.
 * "None" inside the dropdown clears the value so an offer can render with
 * just text.
 */
function IconPicker({
  value, onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div className="flex items-stretch gap-1">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="🎉"
        maxLength={8}
        className="text-center"
      />
      <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            title="Pick an icon"
            aria-label="Pick an icon"
          >
            <span className="text-base leading-none">▾</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-2" align="end">
          <div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <span>Pick an icon</span>
            <button
              type="button"
              onClick={() => { onChange(""); setPickerOpen(false); }}
              className="text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          </div>
          <div className="grid grid-cols-5 gap-1">
            {PRESET_ICONS.map((p) => {
              const active = value === p.char;
              return (
                <button
                  key={p.char}
                  type="button"
                  title={p.hint}
                  onClick={() => { onChange(p.char); setPickerOpen(false); }}
                  className={`flex h-10 items-center justify-center rounded-md border text-xl transition ${
                    active
                      ? "border-primary bg-primary/10"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  <span>{p.char}</span>
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
