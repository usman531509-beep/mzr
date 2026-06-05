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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { CategoryPicker, type PickerCategory } from "@/components/admin/CategoryPicker";

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
  brandId: string;
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
  brandId: z.string().min(1, "Pick a bike brand"),
  productBrandId: z.string().optional().default(""),
  categoryId: z.string().min(1, "Pick a category"),
  featured: z.boolean().default(false),
  demanding: z.boolean().default(false),
  active: z.boolean().default(true),
});

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
    brandId: string;
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

  const form = useForm<PartFormValues>({
    resolver: zodResolver(schema) as never,
    defaultValues: {
      name: "", description: "", price: 0, costPrice: null, stock: 0, sku: "", oemNumber: "",
      brandId: brands[0]?.id ?? "",
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
        brandId: existing.brandId,
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
        brandId: brands[0]?.id ?? "",
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
    setUploading(true);
    try {
      for (const f of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", f);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Upload failed");
        setImages((cur) => [...cur, data.url]);
      }
      toast.success(`${files.length} image${files.length > 1 ? "s" : ""} uploaded`);
    } catch (err) {
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
      toast.error(typeof d.error === "string" ? d.error : "Save failed");
      return;
    }
    toast.success(existing ? "Part updated" : "Part created");
    onOpenChange(false);
    onSaved?.();
    router.refresh();
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit part" : "Add a new part"}</DialogTitle>
          <DialogDescription>
            {existing ? "Update part details, images, and compatibility." : "Fill in details and pick which bikes this part fits."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...form.register("name")} placeholder="e.g. Sintered Front Brake Pads" />
              {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" rows={4} {...form.register("description")} />
              {form.formState.errors.description && <p className="text-xs text-destructive">{form.formState.errors.description.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Retail price (GBP)</Label>
              <Input type="number" min={0} step="0.01" {...form.register("price")} />
              {form.formState.errors.price && <p className="text-xs text-destructive">{form.formState.errors.price.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>
                Cost price (GBP) <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input type="number" min={0} step="0.01" placeholder="What you paid for it" {...form.register("costPrice")} />
              {form.formState.errors.costPrice && <p className="text-xs text-destructive">{form.formState.errors.costPrice.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Stock</Label>
              <Input type="number" min={0} {...form.register("stock")} />
            </div>
            <div className="hidden sm:block" />
            <div className="space-y-1.5">
              <Label>Bike brand</Label>
              <Controller
                control={form.control}
                name="brandId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Select bike brand" /></SelectTrigger>
                    <SelectContent>
                      {brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
              <p className="text-[11px] text-muted-foreground">Which motorcycle make this part fits (Honda, Yamaha…).</p>
            </div>
            <div className="space-y-1.5">
              <Label>
                Product brand <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Controller
                control={form.control}
                name="productBrandId"
                render={({ field }) => (
                  <Select
                    value={field.value || "__none"}
                    onValueChange={(v) => field.onChange(v === "__none" ? "" : v)}
                  >
                    <SelectTrigger><SelectValue placeholder="Select product brand" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">— None —</SelectItem>
                      {productBrands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
              <p className="text-[11px] text-muted-foreground">Who manufactures the part itself (Brembo, NGK, EBC…).</p>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Category</Label>
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
              {form.formState.errors.categoryId && <p className="text-xs text-destructive">{form.formState.errors.categoryId.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>SKU (optional)</Label>
              <Input {...form.register("sku")} placeholder="e.g. MZR-BRK-001" />
            </div>
            <div className="space-y-1.5">
              <Label>OEM number (optional)</Label>
              <Input
                {...form.register("oemNumber")}
                placeholder="e.g. 06430-K0R-V01"
              />
              <p className="text-[11px] text-muted-foreground">
                Manufacturer's part number — helps buyers cross-reference fitment.
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-6 pb-1">
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
          </div>

          <Separator />

          {/* Images */}
          <section>
            <div className="mb-2 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Images</h3>
                <p className="text-xs text-muted-foreground">Stored locally in dev, on Cloudinary in production.</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                {uploading ? "Uploading…" : "Upload"}
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
                No compatibility set yet — buyers won't find this via the bike-model filter.
              </div>
            ) : (
              <div className="space-y-2">
                {compats.map((c, i) => {
                  const m = models.find((m) => m.id === c.bikeModelId) ?? models[0];
                  return (
                    <div key={i} className={cn("grid items-center gap-2", "grid-cols-[1fr_90px_90px_36px]")}>
                      <Select
                        value={c.bikeModelId}
                        onValueChange={(v) => {
                          const next = [...compats];
                          const newM = models.find((mm) => mm.id === v)!;
                          next[i] = { bikeModelId: newM.id, yearFrom: newM.yearStart, yearTo: newM.yearEnd };
                          setCompats(next);
                        }}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {models.map((mm) => (
                            <SelectItem key={mm.id} value={mm.id}>
                              {mm.brand.name} {mm.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
