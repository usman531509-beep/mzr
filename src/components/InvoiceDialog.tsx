"use client";

import { useState } from "react";
import { FileText, Printer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { InvoiceView, type InvoiceOrder } from "@/components/InvoiceView";

// Wraps the invoice in a modal. The trigger button matches the inline action
// style on /account/orders. The dialog content itself is white (overrides the
// dark site theme) and carries `data-invoice-print` so the print stylesheet in
// globals.css can hide everything else on the page.

export function InvoiceDialog({ order }: { order: InvoiceOrder }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <FileText className="h-3.5 w-3.5" /> View invoice
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          data-invoice-print
          className="max-w-3xl gap-0 overflow-hidden bg-white p-0 text-black [&>button:last-child]:hidden"
        >
          {/* Visually-hidden title satisfies Radix's a11y requirement (every
              DialogContent needs a DialogTitle, even if we don't show one). */}
          <DialogTitle className="sr-only">
            Invoice {order.orderNumber ?? order.id}
          </DialogTitle>
          {/* Toolbar — hidden when printing because the wrapper toggles
              visibility to only the invoice body below. */}
          <div className="flex items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-5 py-3 text-sm print:hidden">
            <div className="font-mono text-xs text-gray-500">
              Invoice {order.orderNumber ?? order.id}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-gray-300 text-gray-700 hover:bg-gray-100"
                onClick={() => window.print()}
              >
                <Printer className="h-3.5 w-3.5" /> Print / save PDF
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-gray-700 hover:bg-gray-100"
                onClick={() => setOpen(false)}
              >
                <X className="h-3.5 w-3.5" /> Close
              </Button>
            </div>
          </div>
          <div className="max-h-[80vh] overflow-y-auto print:max-h-none print:overflow-visible">
            <InvoiceView order={order} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
