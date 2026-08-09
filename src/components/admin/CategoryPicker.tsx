"use client";

import { useMemo, useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { Combobox, type ComboOption } from "@/components/ui/combobox";

export type PickerCategory = {
  id: string;
  name: string;
  parentId: string | null;
  path: string;
  childCount: number;
};

// Drill-down picker for hierarchical categories. Renders one searchable
// combobox per level: the first lists top-level rows, each subsequent level
// appears once the user picks a parent. Only leaves (rows with no children)
// can be the final selection — the form value is set the moment the user
// lands on a leaf. Picking a non-leaf clears the value until the chain
// bottoms out. Each level is type-to-filter + scrollable.
export function CategoryPicker({
  categories,
  value,
  onChange,
  disabled,
  emptyLabel = "Select category",
}: {
  categories: PickerCategory[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  emptyLabel?: string;
}) {
  const byId = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const childrenOf = useMemo(() => {
    const m = new Map<string | null, PickerCategory[]>();
    for (const c of categories) {
      const key = c.parentId;
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(c);
    }
    for (const arr of m.values()) arr.sort((a, b) => a.name.localeCompare(b.name));
    return m;
  }, [categories]);

  // The chain (root → … → leaf) is derived synchronously from the external
  // `value` so it's already correct on the first render after form.reset in
  // edit mode — no race where the pickers briefly paint empty.
  const externalChain = useMemo<string[]>(() => {
    if (!value) return [];
    const target = byId.get(value);
    if (!target) return [];
    const path: string[] = [];
    let cur: PickerCategory | undefined = target;
    while (cur) {
      path.unshift(cur.id);
      cur = cur.parentId ? byId.get(cur.parentId) : undefined;
    }
    return path;
  }, [value, byId]);

  // Local "in-progress" chain, used while mid-drilldown on a non-leaf (which
  // clears the external `value` until a leaf is hit) so the pickers keep
  // showing their parent picks. Reset only when a NEW non-empty value comes
  // in (parent form opens a different product), never when value goes empty.
  const [draftChain, setDraftChain] = useState<string[] | null>(null);
  useEffect(() => {
    if (value) setDraftChain(null);
  }, [value]);
  const chain = draftChain ?? externalChain;

  const setLevel = (idx: number, id: string) => {
    const next = chain.slice(0, idx);
    if (id) next[idx] = id;
    setDraftChain(next);
    const picked = id ? byId.get(id) : undefined;
    if (picked && picked.childCount === 0) {
      onChange(picked.id);
    } else {
      onChange("");
    }
  };

  // Always show level 0; show each subsequent level whose parent is picked.
  const levels: { parentId: string | null; pickedId: string }[] = [];
  levels.push({ parentId: null, pickedId: chain[0] ?? "" });
  for (let i = 0; i < chain.length; i++) {
    const parent = byId.get(chain[i]);
    if (parent && parent.childCount > 0) {
      levels.push({ parentId: parent.id, pickedId: chain[i + 1] ?? "" });
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        {levels.map((lvl, idx) => {
          const source = childrenOf.get(lvl.parentId) ?? [];
          if (source.length === 0) return null;
          const options: ComboOption[] = source.map((c) => ({
            value: c.id,
            label: c.name,
            hint: c.childCount > 0 ? "▸" : undefined,
          }));
          return (
            <div key={`${lvl.parentId ?? "root"}-${idx}`} className="flex items-center gap-1.5">
              {idx > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
              <Combobox
                options={options}
                value={lvl.pickedId}
                onChange={(v) => setLevel(idx, v)}
                disabled={disabled}
                placeholder={idx === 0 ? emptyLabel : "Choose…"}
                searchPlaceholder="Search…"
                emptyText="No categories found."
                className="h-9 min-w-[180px]"
              />
            </div>
          );
        })}
      </div>
      {value ? (
        <p className="font-mono text-[11px] text-muted-foreground">
          /{byId.get(value)?.path}
        </p>
      ) : chain.length > 0 ? (
        <p className="text-[11px] text-amber-600">
          Pick a final category (no further sub-options) to save.
        </p>
      ) : null}
    </div>
  );
}
