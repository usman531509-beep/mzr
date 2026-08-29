"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Trash2, Upload, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { CategoryPicker, type PickerCategory } from "@/components/admin/CategoryPicker";
import { removeImageBackground } from "@/lib/remove-bg";
import { confirmAction } from "@/lib/confirm-store";

const RASTER = /^image\/(png|jpe?g|webp)$/i;

export type Brand = { id: string; name: string };
export type ProductBrand = { id: string; name: string };
export type Category = PickerCategory & { slug: string };
export type BikeModel = {
  id: string; name: string; brandId: string;
  yearStart: number; yearEnd: number;
  brand: { name: string };
};

type Compat = { bikeModelId: string; yearFrom: number; yearTo: number };

export type PartFormValues = {
  name: string;
  description: string;
  price: number;
  costPrice: number | null;
  stock: number;
  sku: string;
  oemNumber: string;
  // Multi-brand: a part can fit several bike makes. The dialog requires
  // at least one tick before save. All ticked brands are treated equally;
  // the server picks one to populate the legacy Product.brandId column,
  // but that's an internal detail not surfaced to the admin.
  brandIds: string[];
  productBrandId: string;
  categoryId: string;
  featured: boolean;
  demanding: boolean;
  active: boolean;
};

const schema = z.object({
  name: z.string().min(2, "Name is too short"),
  description: z.string().min(2, "Description is too short"),
  price: z.coerce.number().positive("Retail price must be > 0"),
  // Cost price is optional. Empty string → null.
  costPrice: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? null : v),
    z.coerce.number().nonnegative("Cost can't be negative").nullable(),
  ),
  stock: z.coerce.number().int().min(0, "Stock cannot be negative"),
  sku: z.string().optional().default(""),
  oemNumber: z.string().max(64).optional().default(""),
  brandIds: z.array(z.string()).min(1, "Pick at least one bike brand"),
  productBrandId: z.string().optional().default(""),
  categoryId: z.string().min(1, "Pick a category"),
  featured: z.boolean().default(false),
  demanding: z.boolean().default(false),
  active: z.boolean().default(true),
});

// Human-readable labels for API field errors so the toast names the actual
// problem field instead of a raw key.
const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  description: "Description",
  price: "Retail price",
  costPrice: "Cost price",
  stock: "Stock",
  sku: "SKU",
  oemNumber: "OEM number",
  brandIds: "Bike brand",
  brandId: "Bike brand",
  productBrandId: "Part brand",
  categoryId: "Category",
  images: "Images",
  compatibilities: "Bike fitment",
};

// Turn any /api/admin/products error response into a clear, specific message.
// Handles three shapes: a plain string (DB/business errors), a zod flatten
// ({ formErrors, fieldErrors }) from server-side validation, and an unknown
// fallback.
function apiErrorMessage(data: unknown): string {
  const err = (data as { error?: unknown })?.error;
  if (typeof err === "string" && err.trim()) return err;
  if (err && typeof err === "object") {
    const flat = err as { formErrors?: string[]; fieldErrors?: Record<string, string[]> };
    const parts: string[] = [];
    if (Array.isArray(flat.formErrors)) parts.push(...flat.formErrors.filter(Boolean));
    if (flat.fieldErrors && typeof flat.fieldErrors === "object") {
      for (const [key, msgs] of Object.entries(flat.fieldErrors)) {
        if (Array.isArray(msgs) && msgs.length) {
          parts.push(`${FIELD_LABELS[key] ?? key}: ${msgs[0]}`);
        }
      }
    }
    if (parts.length) return parts.join(" · ");
  }
  return "Save failed — please check the highlighted fields and try again.";
}

export type PartDialogProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  brands: Brand[];
  productBrands: ProductBrand[];
  categories: Category[];
  models: BikeModel[];
  // Optional existing part for edit mode
  existing?: {
    id: string;
    name: string; description: string; price: number; costPrice: number | null; stock: number;
    sku: string | null; oemNumber: string | null;
    // Full set of bike-brand ids — used to hydrate the multi-select.
    brandIds: string[];
    productBrandId: string | null;
    // Nullable when the product is currently orphaned (its category was
    // soft-deleted). The form still requires a pick on save — schema below
    // enforces a non-empty string at submit time.
    categoryId: string | null;
    featured: boolean; demanding: boolean; active: boolean;
    images: string[]; compatibilities: Compat[];
  };
  // Pre-select category when opened from a category card
  defaultCategoryId?: string;
  onSaved?: () => void;
};

export function PartDialog({
  open, onOpenChange, brands, productBrands, categories, models, existing, defaultCategoryId, onSaved,
}: PartDialogProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<string[]>([]);
  const [compats, setCompats] = useState<Compat[]>([]);
  const [uploading, setUploading] = useState(false);
  // Label shown on the button while working ("Removing background…" → "Uploading…").
  const [busyLabel, setBusyLabel] = useState("Uploading…");

  // No bike brand ticked by default — the admin must consciously pick which
  // makes the part fits (the form rejects a save with none, with a clear
  // "Pick at least one bike brand" message).
  const defaultBrandIds: string[] = [];

  const form = useForm<PartFormValues>({
    resolver: zodResolver(schema) as never,
    defaultValues: {
      name: "", description: "", price: 0, costPrice: null, stock: 0, sku: "", oemNumber: "",
      brandIds: defaultBrandIds,
      productBrandId: "",
      categoryId: defaultCategoryId ?? "",
      featured: false, demanding: false, active: true,
    },
  });

  // Reset form whenever the dialog opens with new data
  useEffect(() => {
    if (!open) return;
    if (existing) {
      form.reset({
        name: existing.name,
        description: existing.description,
        price: existing.price,
        costPrice: existing.costPrice,
        stock: existing.stock,
        sku: existing.sku ?? "",
        oemNumber: existing.oemNumber ?? "",
        brandIds: existing.brandIds.length ? existing.brandIds : defaultBrandIds,
        productBrandId: existing.productBrandId ?? "",
        categoryId: existing.categoryId ?? "",
        featured: existing.featured,
        demanding: existing.demanding,
        active: existing.active,
      });
      setImages(existing.images);
      setCompats(existing.compatibilities);
    } else {
      form.reset({
        name: "", description: "", price: 0, costPrice: null, stock: 0, sku: "", oemNumber: "",
        brandIds: defaultBrandIds,
        productBrandId: "",
        categoryId: defaultCategoryId ?? "",
        featured: false, demanding: false, active: true,
      });
      setImages([]);
      setCompats([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, existing?.id, defaultCategoryId]);

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const list = Array.from(files);
    if (fileRef.current) fileRef.current.value = ""; // allow re-selecting

    // Ask once (before any loader) whether to remove the background. Only offer
    // it when there's a raster photo — SVG/vector isn't supported by the model.
    let wantBg = false;
    if (list.some((f) => RASTER.test(f.type))) {
      wantBg = await confirmAction({
        title: "Remove background?",
        description:
          "Remove the image background before uploading? This runs on your device and can take a few seconds. Choose “No” to upload the image(s) as-is.",
        confirmLabel: "Yes, remove",
        cancelLabel: "No, upload as-is",
      });
    }

    setUploading(true);
    try {
      for (const f of list) {
        // Downscale + re-encode in the browser before posting. Phone photos
        // routinely exceed Vercel's 4.5 MB body-size cap on serverless
        // functions, which silently 413s before the server-side sharp
        // compressor ever sees them. Shrinking client-side avoids that AND
        // saves upload time on slow connections.
        const down = await downscaleForUpload(f);

        let prepared: Blob = down;
        let filename = down.name;
        if (wantBg && RASTER.test(f.type)) {
          setBusyLabel("Removing background…");
          try {
            // Pass the original — the helper shrinks + cleans edges itself
            // (avoids a second JPEG re-encode from downscaleForUpload).
            const cut = await removeImageBackground(f);
            prepared = cut;
            filename = f.name.replace(/\.[^.]+$/, "") + ".png";
          } catch (bgErr) {
            // eslint-disable-next-line no-console
            console.error("[PartDialog remove-bg]", bgErr);
            toast.warning("Couldn't remove the background — uploading the original.");
          }
        }

        setBusyLabel("Uploading…");
        const fd = new FormData();
        fd.append("file", prepared, filename);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        // The body-size limiter (and other infra errors) return non-JSON,
        // which used to surface as "Unexpected token <" in the toast. Read
        // text first, try to parse, fall back to a status-aware message.
        const raw = await res.text();
        let parsed: { url?: string; error?: string } = {};
        try { parsed = raw ? JSON.parse(raw) : {}; } catch { /* non-JSON */ }
        if (!res.ok || !parsed.url) {
          const reason =
            parsed.error
            ?? (res.status === 413 ? "File is too large — try a smaller image" : null)
            ?? (res.status === 401 ? "Sign in as admin to upload images" : null)
            ?? `Upload failed (HTTP ${res.status})`;
          throw new Error(reason);
        }
        setImages((cur) => [...cur, parsed.url!]);
      }
      toast.success(`${files.length} image${files.length > 1 ? "s" : ""} uploaded`);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[PartDialog upload]", err);
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const addCompat = () => {
    const m = models[0];
    if (!m) return;
    setCompats((c) => [...c, { bikeModelId: m.id, yearFrom: m.yearStart, yearTo: m.yearEnd }]);
  };

  const submit = form.handleSubmit(async (values) => {
    const payload = {
      ...values,
      sku: values.sku || null,
      oemNumber: values.oemNumber || null,
      productBrandId: values.productBrandId || null,
      images,
      compatibilities: compats,
    };
    const url = existing ? `/api/admin/products/${existing.id}` : `/api/admin/products`;
    const method = existing ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(apiErrorMessage(d));
      return;
    }
    toast.success(existing ? "Part updated" : "Part created");
    onOpenChange(false);
    onSaved?.();
    router.refresh();
  }, (errors) => {
    // Client-side (zod) validation failed — surface the specific fields so
    // clicking save on an invalid form isn't a silent no-op.
    const parts = Object.entries(errors)
      .map(([key, e]) => {
        const msg = (e as { message?: string })?.message;
        return msg ? `${FIELD_LABELS[key] ?? key}: ${msg}` : FIELD_LABELS[key] ?? key;
      })
      .filter(Boolean);
    toast.error(parts.length ? parts.join(" · ") : "Please fill in the required fields.");
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        // `!duration-75` overrides the shared Dialog's 200ms animation. The
        // form is large (≈15 Radix-wrapped inputs + the brand checkbox
        // grid) so the fade+zoom feels sluggish on click — at 75ms it
        // reads as instant without losing the entrance hint.
        className="max-w-3xl max-h-[90vh] overflow-y-auto !duration-75"
        // Lock the dialog to explicit Cancel / Save changes / X close so an
        // accidental backdrop click can't wipe an admin's half-filled form.
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{existing ? "Edit part" : "Add a new part"}</DialogTitle>
          <DialogDescription>
            {existing ? "Update part details, images, and compatibility." : "Fill in details and pick which bikes this part fits."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-6">
          {/* Identity ─ name + description run full width at the top so the
              admin can write a long descriptive name without truncation. */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...form.register("name")} placeholder="e.g. Sintered Front Brake Pads" />
              {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" rows={3} {...form.register("description")} />
              {form.formState.errors.description && <p className="text-xs text-destructive">{form.formState.errors.description.message}</p>}
            </div>
          </div>

          {/* Pricing & Inventory — 3-column row groups the related fields and
              avoids the awkward half-width Stock input the previous layout
              left dangling on its own row. */}
          <FormSection title="Pricing & Inventory">
            <div className="grid gap-3 sm:grid-cols-3">
              {/* Cost price leads — admins typically enter what they paid
                  first, then mark up to set retail. The flow now matches
                  that mental order: cost → retail → stock. */}
              <div className="space-y-1.5">
                <Label>
                  Cost price (GBP) <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input type="number" min={0} step="0.01" placeholder="What you paid" {...form.register("costPrice")} />
                {form.formState.errors.costPrice && <p className="text-xs text-destructive">{form.formState.errors.costPrice.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Retail price (GBP)</Label>
                <Input type="number" min={0} step="0.01" {...form.register("price")} />
                {form.formState.errors.price && <p className="text-xs text-destructive">{form.formState.errors.price.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Stock</Label>
                <Input type="number" min={0} {...form.register("stock")} />
              </div>
            </div>
          </FormSection>

          {/* Bike brand fitment — inline checkbox grid. Every brand visible
              at once, all ticked brands are treated equally. The server
              still stores one in `Product.brandId` for legacy displays but
              there's no "primary" concept exposed to the admin. */}
          <FormSection
            title="Bike brand fitment"
            subtitle="Tick every motorcycle make this part fits."
          >
            <Controller
              control={form.control}
              name="brandIds"
              render={({ field }) => (
                <div className="space-y-2">
                  <div className="rounded-md border border-line bg-white p-3">
                    {brands.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No bike brands yet — add some in Admin → Bike Brands.</p>
                    ) : (
                      <div className="grid gap-x-4 gap-y-2 sm:grid-cols-3 lg:grid-cols-4">
                        {brands.map((b) => {
                          const isOn = field.value.includes(b.id);
                          return (
                            <label
                              key={b.id}
                              className={cn(
                                "flex cursor-pointer select-none items-center gap-2 rounded px-2 py-1.5 text-sm transition",
                                isOn ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                              )}
                            >
                              <Checkbox
                                checked={isOn}
                                onCheckedChange={(v) => {
                                  const next = !!v
                                    ? Array.from(new Set([...field.value, b.id]))
                                    : field.value.filter((x) => x !== b.id);
                                  field.onChange(next);
                                }}
                              />
                              <span className="truncate">{b.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {form.formState.errors.brandIds && (
                    <p className="text-xs text-destructive">{form.formState.errors.brandIds.message as string}</p>
                  )}
                </div>
              )}
            />
          </FormSection>

          {/* Brand & identification details — product brand sits alongside
              the manufacturer codes since they're all "who made this and how
              do I cross-reference it". */}
          <FormSection title="Brand & identification">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>
                  Product brand <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Controller
                  control={form.control}
                  name="productBrandId"
                  render={({ field }) => (
                    <Combobox
                      value={field.value || ""}
                      onChange={(v) => field.onChange(v)}
                      placeholder="Select product brand"
                      searchPlaceholder="Search brands…"
                      emptyText="No brands found."
                      options={[
                        { value: "", label: "— None —" },
                        ...productBrands.map((b) => ({ value: b.id, label: b.name })),
                      ]}
                    />
                  )}
                />
                <p className="text-[11px] text-muted-foreground">Brembo, NGK, EBC…</p>
              </div>
              <div className="space-y-1.5">
                <Label>SKU <span className="text-muted-foreground">(optional)</span></Label>
                <Input {...form.register("sku")} placeholder="e.g. MZR-BRK-001" />
              </div>
              <div className="space-y-1.5">
                <Label>OEM number <span className="text-muted-foreground">(optional)</span></Label>
                <Input {...form.register("oemNumber")} placeholder="e.g. 06430-K0R-V01" />
                <p className="text-[11px] text-muted-foreground">Manufacturer&apos;s part number.</p>
              </div>
            </div>
          </FormSection>

          {/* Category — wide picker, full width. */}
          <FormSection title="Category">
            <Controller
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <CategoryPicker
                  categories={categories}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            {form.formState.errors.categoryId && (
              <p className="mt-1 text-xs text-destructive">{form.formState.errors.categoryId.message}</p>
            )}
          </FormSection>

          {/* Settings — Featured / In demand / Active live together because
              they all affect storefront surfacing. */}
          <FormSection title="Settings">
            <div className="flex flex-wrap items-center gap-6">
              <Controller
                control={form.control}
                name="featured"
                render={({ field }) => (
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(!!v)} />
                    Featured
                  </label>
                )}
              />
              <Controller
                control={form.control}
                name="demanding"
                render={({ field }) => (
                  <label className="flex items-center gap-2 text-sm" title="Surface on the home page 'In demand' banner">
                    <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(!!v)} />
                    In demand
                  </label>
                )}
              />
              <Controller
                control={form.control}
                name="active"
                render={({ field }) => (
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(!!v)} />
                    Active
                  </label>
                )}
              />
            </div>
          </FormSection>

          <Separator />

          {/* Images */}
          <section>
            <div className="mb-2 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Images</h3>
                <p className="text-xs text-muted-foreground">You&apos;ll be asked to remove the background · stored on Supabase.</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin [will-change:transform]" /> : <Upload className="h-3.5 w-3.5" />}
                {uploading ? busyLabel : "Upload"}
              </Button>
              <input ref={fileRef} type="file" accept="image/*" multiple onChange={upload} className="hidden" />
            </div>
            {images.length === 0 ? (
              <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No images yet. Click <strong>Upload</strong> above.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {images.map((u, i) => (
                  <div key={u} className="group relative aspect-square overflow-hidden rounded-md border border-border bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={u} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setImages(images.filter((_, idx) => idx !== i))}
                      className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 transition group-hover:opacity-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <Separator />

          {/* Compatibility */}
          <section>
            <div className="mb-2 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Fits these bikes</h3>
                <p className="text-xs text-muted-foreground">Buyers can find this part by selecting their model + year.</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addCompat}>
                <Plus className="h-3.5 w-3.5" /> Add bike
              </Button>
            </div>
            {compats.length === 0 ? (
              <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No compatibility set yet buyers won't find this via the bike-model filter.
              </div>
            ) : (
              <div className="space-y-2">
                {compats.map((c, i) => {
                  const m = models.find((m) => m.id === c.bikeModelId) ?? models[0];
                  return (
                    <div key={i} className={cn("grid items-center gap-2", "grid-cols-[1fr_90px_90px_36px]")}>
                      <Combobox
                        value={c.bikeModelId}
                        onChange={(v) => {
                          const next = [...compats];
                          const newM = models.find((mm) => mm.id === v)!;
                          next[i] = { bikeModelId: newM.id, yearFrom: newM.yearStart, yearTo: newM.yearEnd };
                          setCompats(next);
                        }}
                        placeholder="Select bike model"
                        searchPlaceholder="Search models…"
                        emptyText="No models found."
                        options={models.map((mm) => ({
                          value: mm.id,
                          label: `${mm.brand.name} ${mm.name} (${mm.yearStart}–${mm.yearEnd})`,
                        }))}
                      />
                      <Input
                        type="number"
                        min={m.yearStart}
                        max={m.yearEnd}
                        value={c.yearFrom}
                        onChange={(e) => {
                          const next = [...compats];
                          next[i] = { ...next[i], yearFrom: Number(e.target.value) };
                          setCompats(next);
                        }}
                      />
                      <Input
                        type="number"
                        min={m.yearStart}
                        max={m.yearEnd}
                        value={c.yearTo}
                        onChange={(e) => {
                          const next = [...compats];
                          next[i] = { ...next[i], yearTo: Number(e.target.value) };
                          setCompats(next);
                        }}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setCompats(compats.filter((_, idx) => idx !== i))}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
            {compats.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {compats.map((c, i) => {
                  const m = models.find((mm) => mm.id === c.bikeModelId);
                  if (!m) return null;
                  return (
                    <Badge key={i} variant="secondary" className="text-[10px]">
                      {m.brand.name} {m.name} · {c.yearFrom}–{c.yearTo}
                    </Badge>
                  );
                })}
              </div>
            )}
          </section>

          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {existing ? "Save changes" : "Create part"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Resize + re-encode an image in the browser before upload, so we never
// trip Vercel's 4.5 MB serverless body-size limit on phone photos. Returns
// the original File untouched for non-image types or files that already
// fit comfortably. Falls back to the original if anything in the Canvas
// pipeline fails — better to attempt the upload than block on a quirky
// image format.
async function downscaleForUpload(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  // ≤ 1.5 MB is fine to send raw — server-side sharp still trims to 200 KB.
  if (file.size < 1_500_000) return file;
  try {
    const url = URL.createObjectURL(file);
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    URL.revokeObjectURL(url);

    const MAX_DIM = 2000;
    const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, w, h);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.82),
    );
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", {
      type: "image/jpeg",
    });
  } catch {
    return file;
  }
}

// Light grouped section used throughout the dialog. Title sits flush with
// an optional subtitle; children get a small left-pad-free body. Keeps the
// form readable without the visual weight of a full Card per section.
function FormSection({
  title, subtitle, children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      <div>{children}</div>
    </section>
  );
}
