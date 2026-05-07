"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ADMIN_MODULES, type ModuleKey } from "@/lib/permissions";

export function UserPermissionsButton({
  userId,
  userName,
  role,
  permissions,
}: {
  userId: string;
  userName: string;
  role: "USER" | "STAFF" | "MANAGER" | "ADMIN";
  permissions: string[];
}) {
  const router = useRouter();
  const isAdmin = role === "ADMIN";
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(() => new Set(permissions));
  const [busy, setBusy] = useState(false);

  // Group modules by their navigation group so the dialog mirrors the sidebar.
  const groups = useMemo(() => {
    const map = new Map<string, typeof ADMIN_MODULES>();
    for (const m of ADMIN_MODULES) {
      const arr = map.get(m.group) ?? [];
      arr.push(m);
      map.set(m.group, arr);
    }
    return Array.from(map.entries());
  }, []);

  const toggle = (key: ModuleKey) => {
    const next = new Set(checked);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setChecked(next);
  };

  const checkAll = () => setChecked(new Set(ADMIN_MODULES.map((m) => m.key)));
  const clearAll = () => setChecked(new Set());

  const save = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/permissions`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ permissions: Array.from(checked) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? "Could not save");
        return;
      }
      toast.success("Access updated");
      setOpen(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  // Re-sync local state if the prop changes after a successful save.
  const openDialog = () => {
    setChecked(new Set(permissions));
    setOpen(true);
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={openDialog}
        disabled={isAdmin}
        title={isAdmin ? "Admins have full access" : "Manage module access"}
      >
        <KeyRound className="h-3.5 w-3.5" /> Give access
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Module access — {userName}
            </DialogTitle>
            <DialogDescription>
              {isAdmin ? (
                <>Admins automatically have full access; this list is informational.</>
              ) : (
                <>Tick the modules this {role.toLowerCase()} can open in the admin panel.</>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="-mx-1 max-h-[60vh] space-y-4 overflow-y-auto px-1 py-2">
            {groups.map(([groupName, mods]) => (
              <div key={groupName}>
                <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {groupName}
                </div>
                <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {mods.map((m) => {
                    const on = isAdmin || checked.has(m.key);
                    return (
                      <li key={m.key}>
                        <label
                          className={
                            "flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm transition " +
                            (on ? "bg-primary/5 border-primary/30" : "hover:bg-accent")
                          }
                        >
                          <Checkbox
                            checked={on}
                            disabled={isAdmin}
                            onCheckedChange={() => toggle(m.key)}
                          />
                          <span>{m.label}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>

          <DialogFooter className="flex-row justify-between sm:justify-between">
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="ghost" onClick={checkAll} disabled={isAdmin}>
                Select all
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={clearAll} disabled={isAdmin}>
                Clear
              </Button>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="button" disabled={busy || isAdmin} onClick={save}>
                {busy && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                Save access
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
