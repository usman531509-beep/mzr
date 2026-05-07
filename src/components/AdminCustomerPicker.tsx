"use client";

import { useEffect, useState } from "react";
import { Briefcase, Loader2, Search, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export type PickedCustomer = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  tradeApproved: boolean;
};

export function AdminCustomerPicker({
  selected,
  onSelect,
  onClear,
}: {
  selected: PickedCustomer | null;
  onSelect: (u: PickedCustomer) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<PickedCustomer[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/admin/users/search?q=${encodeURIComponent(q)}`);
        const data = await r.json();
        setResults(data.users ?? []);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [open, q]);

  return (
    <Card className="border-blue-500/30 bg-blue-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Briefcase className="h-4 w-4 text-blue-400" />
          Order on behalf of customer
        </CardTitle>
        <CardDescription>
          You&apos;re signed in as an admin. Pick a customer and the order will be
          placed under their account, tagged as created by you.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {selected ? (
          <div className="flex items-center justify-between gap-3 rounded-md border border-blue-500/30 bg-background p-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{selected.name || selected.email}</span>
                {selected.tradeApproved && (
                  <Badge className="gap-1 bg-amber-500/15 text-amber-300 ring-1 ring-inset ring-amber-500/30 hover:bg-amber-500/15">
                    <Briefcase className="h-3 w-3" /> Trader
                  </Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground">{selected.email}</div>
            </div>
            <Button type="button" size="sm" variant="ghost" onClick={onClear}>
              <X className="h-3.5 w-3.5" /> Clear
            </Button>
          </div>
        ) : !open ? (
          <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
            Pick customer
          </Button>
        ) : (
          <div className="space-y-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search name, email, phone…"
                className="h-9 pl-8"
              />
              {loading && (
                <Loader2 className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
              )}
            </div>
            <ul className="max-h-[280px] overflow-y-auto rounded-md border border-border bg-background">
              {results.length === 0 ? (
                <li className="p-3 text-sm text-muted-foreground">No customers found.</li>
              ) : (
                results.map((u) => (
                  <li key={u.id}>
                    <button
                      type="button"
                      onClick={() => { onSelect(u); setOpen(false); setQ(""); }}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition hover:bg-accent"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium">{u.name || u.email}</span>
                          {u.tradeApproved && (
                            <Badge className="gap-1 bg-amber-500/15 text-amber-300 ring-1 ring-inset ring-amber-500/30 hover:bg-amber-500/15">
                              <Briefcase className="h-3 w-3" /> Trader
                            </Badge>
                          )}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">{u.email}</div>
                      </div>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
