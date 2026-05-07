import { fmtMoney } from "@/lib/format";

export function TopProductsList({
  rows,
}: {
  rows: { name: string; quantity: number; revenue: number }[];
}) {
  if (rows.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
        No sales yet.
      </div>
    );
  }
  const max = Math.max(...rows.map((r) => r.revenue), 1);
  return (
    <ul className="space-y-3">
      {rows.map((r, i) => (
        <li key={i} className="space-y-1">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="truncate">{r.name}</span>
            <span className="shrink-0 tabular-nums">{fmtMoney(r.revenue)}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-primary/40"
              style={{ width: `${(r.revenue / max) * 100}%` }}
            />
          </div>
          <div className="text-[11px] text-muted-foreground">{r.quantity} sold</div>
        </li>
      ))}
    </ul>
  );
}
