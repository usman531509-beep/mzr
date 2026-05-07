import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  label, value, icon: Icon, sub, accent,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  sub?: string;
  accent?: "primary" | "success" | "warning";
}) {
  const tone =
    accent === "success" ? "bg-emerald-500/10 text-emerald-300 ring-emerald-500/20" :
    accent === "warning" ? "bg-amber-500/10 text-amber-300 ring-amber-500/20" :
    "bg-primary/10 text-primary ring-primary/20";
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="mt-1 truncate text-2xl font-bold tracking-tight">{value}</div>
          {sub && <div className="mt-0.5 text-[11px] text-muted-foreground">{sub}</div>}
        </div>
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-md ring-1", tone)}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}
