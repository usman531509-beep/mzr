import { cn } from "@/lib/utils";

type Status = "PENDING" | "PAID" | "SHIPPED" | "DELIVERED" | "CANCELLED" | string;

const STYLES: Record<string, string> = {
  PENDING:   "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  PAID:      "bg-blue-500/15 text-blue-300 ring-blue-500/30",
  SHIPPED:   "bg-indigo-500/15 text-indigo-300 ring-indigo-500/30",
  DELIVERED: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  CANCELLED: "bg-rose-500/15 text-rose-300 ring-rose-500/30",
};

export function OrderStatusBadge({
  status,
  className,
}: {
  status: Status;
  className?: string;
}) {
  const style = STYLES[status] ?? "bg-muted text-muted-foreground ring-border";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ring-1 ring-inset",
        style,
        className,
      )}
    >
      {status}
    </span>
  );
}
