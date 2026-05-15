"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { AdminProductFinder, type FinderProduct } from "@/components/admin/AdminProductFinder";

type UserOpt = {
  id: string; name: string; email: string; phone: string;
  address: string; city: string; country: string;
  tradeApproved: boolean;
};
type ProductOpt = {
  id: string; name: string; sku: string | null; oemNumber: string | null;
  price: number; stock: number; image?: string;
  brandId: string; categoryId: string;
  brand: string; category: string;
  fitments: { bikeModelId: string; yearFrom: number; yearTo: number }[];
};
type Line = { productId: string; quantity: number };

export function CreateOrderForm({
  users, products, brands, categories, models, discountByCategory,
}: {
  users: UserOpt[];
  products: ProductOpt[];
  brands: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  models: { id: string; name: string; brandId: string; yearStart: number; yearEnd: number }[];
  discountByCategory: Record<string, number>;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [userId, setUserId] = useState<string>("");
  const selectedUser = users.find((u) => u.id === userId);

  const [shipping, setShipping] = useState({
    customerName: "", customerEmail: "", customerPhone: "",
    shippingAddress: "", shippingCity: "", shippingCountry: "",
    notes: "",
  });
  const [status, setStatus] = useState("PENDING");

  // Auto-fill shipping when a user is selected.
  const onPickUser = (id: string) => {
    setUserId(id);
    const u = users.find((x) => x.id === id);
    if (u) {
      setShipping((s) => ({
        ...s,
        customerName: u.name || s.customerName,
        customerEmail: u.email,
        customerPhone: u.phone || s.customerPhone,
        shippingAddress: u.address || s.shippingAddress,
        shippingCity: u.city || s.shippingCity,
        shippingCountry: u.country || s.shippingCountry,
      }));
    }
  };

  // Shape the products to AdminProductFinder's expected type.
  const finderProducts = useMemo<FinderProduct[]>(
    () => products.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      oemNumber: p.oemNumber,
      price: p.price,
      stock: p.stock,
      image: p.image ?? null,
      brandId: p.brandId,
      brandName: p.brand,
      categoryId: p.categoryId,
      categoryName: p.category,
      fitments: p.fitments,
    })),
    [products],
  );

  const [lines, setLines] = useState<Line[]>([]);
  const addLine = (productId: string) => {
    setLines((ls) =>
      ls.some((l) => l.productId === productId)
        ? ls.map((l) => l.productId === productId ? { ...l, quantity: l.quantity + 1 } : l)
        : [...ls, { productId, quantity: 1 }]
    );
  };
  const setQty = (productId: string, n: number) => {
    setLines((ls) => ls.map((l) =>
      l.productId === productId ? { ...l, quantity: Math.max(1, Math.min(n, productMap.get(productId)?.stock ?? 1)) } : l
    ));
  };
  const remove = (productId: string) =>
    setLines((ls) => ls.filter((l) => l.productId !== productId));

  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const isTrader = !!selectedUser?.tradeApproved;

  const priceFor = (p: ProductOpt) => {
    const pct = isTrader ? (discountByCategory[p.categoryId] ?? 0) : 0;
    return pct > 0 ? +(p.price * (1 - pct / 100)).toFixed(2) : p.price;
  };

  const subtotal = lines.reduce((s, l) => {
    const p = productMap.get(l.productId);
    return p ? s + priceFor(p) * l.quantity : s;
  }, 0);
  const shippingFee = lines.length === 0 ? 0 : subtotal > 200 ? 0 : 9.99;
  const tax = +(subtotal * 0.05).toFixed(2);
  const grand = +(subtotal + shippingFee + tax).toFixed(2);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!userId) { setError("Pick a customer."); return; }
    if (lines.length === 0) { setError("Add at least one product."); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userId,
          ...shipping,
          status,
          items: lines,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not create the order.");
        return;
      }
      toast.success("Order created");
      router.push("/admin/orders");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <div className="space-y-4">
        <Card>
          <CardContent className="space-y-4 p-5">
            <div>
              <Label className="mb-1.5 block text-xs">Customer</Label>
              <Select value={userId} onValueChange={onPickUser}>
                <SelectTrigger><SelectValue placeholder="Pick a customer" /></SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {(u.name || u.email)}{u.tradeApproved ? " · Trade" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedUser?.tradeApproved && (
                <p className="mt-1.5 text-[12px] text-emerald-300">
                  Trade-approved customer — category discounts will be applied automatically.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Customer name" required>
                <Input value={shipping.customerName} onChange={(e) => setShipping({ ...shipping, customerName: e.target.value })} required />
              </Field>
              <Field label="Email" required>
                <Input type="email" value={shipping.customerEmail} onChange={(e) => setShipping({ ...shipping, customerEmail: e.target.value })} required />
              </Field>
              <Field label="Phone" required>
                <Input value={shipping.customerPhone} onChange={(e) => setShipping({ ...shipping, customerPhone: e.target.value })} required />
              </Field>
              <Field label="Status">
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["PENDING", "PAID", "SHIPPED", "DELIVERED", "CANCELLED"].map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Address" required full>
                <Input value={shipping.shippingAddress} onChange={(e) => setShipping({ ...shipping, shippingAddress: e.target.value })} required />
              </Field>
              <Field label="City" required>
                <Input value={shipping.shippingCity} onChange={(e) => setShipping({ ...shipping, shippingCity: e.target.value })} required />
              </Field>
              <Field label="Country" required>
                <Input value={shipping.shippingCountry} onChange={(e) => setShipping({ ...shipping, shippingCountry: e.target.value })} required />
              </Field>
              <Field label="Notes" full>
                <Textarea rows={2} value={shipping.notes} onChange={(e) => setShipping({ ...shipping, notes: e.target.value })} />
              </Field>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-5">
            <Label className="block text-xs">Add products</Label>
            <AdminProductFinder
              products={finderProducts}
              brands={brands}
              categories={categories}
              models={models}
              onAdd={(p) => addLine(p.id)}
            />
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardContent className="space-y-3 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Order summary</h2>
            {lines.length === 0 ? (
              <p className="text-sm text-muted-foreground">No items yet.</p>
            ) : (
              <ul className="space-y-2">
                {lines.map((l) => {
                  const p = productMap.get(l.productId);
                  if (!p) return null;
                  const eff = priceFor(p);
                  const discounted = eff !== p.price;
                  return (
                    <li key={l.productId} className="flex items-center gap-2">
                      <ProductThumb src={p.image} alt={p.name} size={36} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm">{p.name}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {discounted ? (
                            <>£{eff.toFixed(2)} <span className="line-through">£{p.price.toFixed(2)}</span></>
                          ) : (
                            <>£{p.price.toFixed(2)}</>
                          )}
                          {discounted && <Badge className="ml-1 bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-500/30 hover:bg-emerald-500/15">Trade</Badge>}
                        </div>
                      </div>
                      <Input
                        type="number"
                        min={1}
                        max={p.stock}
                        value={l.quantity}
                        onChange={(e) => setQty(l.productId, Number(e.target.value))}
                        className="h-8 w-16"
                      />
                      <div className="w-16 text-right text-sm tabular-nums">£{(eff * l.quantity).toFixed(2)}</div>
                      <Button type="button" size="icon" variant="ghost" onClick={() => remove(l.productId)} className="h-8 w-8 text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-1.5 p-5 text-sm">
            <Row label="Subtotal" value={`£${subtotal.toFixed(2)}`} />
            <Row label="Shipping" value={shippingFee === 0 ? "Free" : `£${shippingFee.toFixed(2)}`} />
            <Row label="Tax (5%)" value={`£${tax.toFixed(2)}`} />
            <div className="my-2 border-t border-border" />
            <Row label={<span className="font-semibold">Total</span>} value={<span className="font-bold">£{grand.toFixed(2)}</span>} />
          </CardContent>
        </Card>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" disabled={submitting} className="w-full">
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create order
        </Button>
      </div>
    </form>
  );
}

function ProductThumb({ src, alt, size = 44 }: { src?: string; alt: string; size?: number }) {
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded border border-border bg-muted"
      style={{ height: size, width: size }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      ) : null}
    </div>
  );
}

function Field({ label, children, required, full }: { label: string; children: React.ReactNode; required?: boolean; full?: boolean }) {
  return (
    <div className={full ? "col-span-2" : undefined}>
      <Label className="mb-1.5 block text-xs">
        {label}{required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
