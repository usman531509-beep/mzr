import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

// Reference `.stat` card: white panel, uppercase muted label, big ink value,
// small coloured delta line underneath.
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
    accent === "success" ? "bg-ok/10 text-ok ring-ok/20" :
    accent === "warning" ? "bg-gold/10 text-gold ring-gold/20" :
    "bg-red/10 text-red ring-red/20";
  const subTone =
    accent === "success" ? "text-ok" :
    accent === "warning" ? "text-gold" :
    accent === "primary" ? "text-red" :
    "text-muted-foreground";
  return (
    <Card className="rounded-[10px] border-line shadow-none">
      <CardContent className="flex items-center justify-between p-4">
        <div className="min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="mt-1 truncate text-2xl font-extrabold tracking-tight text-ink">{value}</div>
          {sub && <div className={cn("mt-0.5 text-[11px]", subTone)}>{sub}</div>}
        </div>
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] ring-1", tone)}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}
