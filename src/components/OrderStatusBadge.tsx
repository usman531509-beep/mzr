import { cn } from "@/lib/utils";

type Status = "PENDING" | "PAID" | "SHIPPED" | "DELIVERED" | "CANCELLED" | string;

// Reference-theme status pills (.st in theme.css):
//   ok   → green   (delivered)
//   warn → amber   (pending)
//   info → blue    (paid / shipped)
//   bad  → red     (cancelled)
//   muted→ grey    (anything unknown)
const VARIANT: Record<string, string> = {
  PENDING:   "warn",
  PAID:      "info",
  SHIPPED:   "info",
  DELIVERED: "ok",
  CANCELLED: "bad",
};

export function OrderStatusBadge({
  status,
  className,
}: {
  status: Status;
  className?: string;
}) {
  return (
    <span className={cn("st", VARIANT[status] ?? "muted", className)}>
      {status}
    </span>
  );
}
