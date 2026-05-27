"use client";

import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useConfirmStore } from "@/lib/confirm-store";

// Singleton confirm-dialog. Mounted once in the root layout; every
// `confirmAction({...})` call from anywhere in the app flows through here.

export function ConfirmDialog() {
  const open = useConfirmStore((s) => s.open);
  const options = useConfirmStore((s) => s.options);
  const resolve = useConfirmStore((s) => s.resolve);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resolve(false); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{options?.title ?? "Are you sure?"}</DialogTitle>
          {options?.description && (
            <DialogDescription className="pt-1">
              {options.description}
            </DialogDescription>
          )}
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => resolve(false)}
          >
            {options?.cancelLabel ?? "Cancel"}
          </Button>
          <Button
            type="button"
            variant={options?.destructive ? "destructive" : "default"}
            onClick={() => resolve(true)}
            autoFocus
          >
            {options?.confirmLabel ?? "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
