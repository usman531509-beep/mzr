"use client";

import { useMemo, useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export type PickerCategory = {
  id: string;
  name: string;
  parentId: string | null;
  path: string;
  childCount: number;
};

// Drill-down picker for hierarchical categories. Renders one Select per
// level: the first lists top-level rows, each subsequent level appears once
// the user picks a parent. Only leaves (rows with no children) can be the
// final selection — the form value is set the moment the user lands on a
// leaf. Picking a non-leaf clears the value until the chain bottoms out.
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

  // chain[0] = top-level pick, chain[1] = its child, etc. Only the leaf is
  // emitted up to `onChange`.
  const [chain, setChain] = useState<string[]>([]);

  // Sync internal chain from external `value` (edit mode or external reset).
  useEffect(() => {
    if (!value) { setChain([]); return; }
    const target = byId.get(value);
    if (!target) { setChain([]); return; }
    // Walk up parent chain to build the full path of ids root→leaf.
    const path: string[] = [];
    let cur: PickerCategory | undefined = target;
    while (cur) {
      path.unshift(cur.id);
      cur = cur.parentId ? byId.get(cur.parentId) : undefined;
    }
    setChain(path);
  }, [value, byId]);

  const setLevel = (idx: number, id: string) => {
    const next = chain.slice(0, idx);
    if (id) next[idx] = id;
    setChain(next);
    // Emit value only when the selection is a leaf (no children).
    const picked = id ? byId.get(id) : undefined;
    if (picked && picked.childCount === 0) {
      onChange(picked.id);
    } else {
      onChange("");
    }
  };

  // Build the list of dropdowns to render. Always show level 0; show each
  // subsequent level whose parent is already picked.
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
          const options = childrenOf.get(lvl.parentId) ?? [];
          if (options.length === 0) return null;
          return (
            <div key={`${lvl.parentId ?? "root"}-${idx}`} className="flex items-center gap-1.5">
              {idx > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
              <Select
                value={lvl.pickedId}
                onValueChange={(v) => setLevel(idx, v)}
                disabled={disabled}
              >
                <SelectTrigger className="h-9 min-w-[160px]">
                  <SelectValue placeholder={idx === 0 ? emptyLabel : "Choose…"} />
                </SelectTrigger>
                <SelectContent>
                  {options.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                      {c.childCount > 0 && (
                        <span className="ml-1 text-[10px] text-muted-foreground">▸</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
