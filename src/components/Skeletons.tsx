// Lightweight, dependency-free skeleton primitives used by `loading.tsx`
// route boundaries. Tailwind's `animate-pulse` is enough — no need for a
// shimmer library. The colours match the dark theme (`bg-muted/60`).

import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted/60", className)} />;
}

/** Page-level skeleton with a header strip and a generic content card. */
export function PageSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-4 p-4 lg:p-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-9 w-full max-w-md" />
      <div className="rounded-lg border border-border p-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-border/40 py-3 last:border-b-0">
            <Skeleton className="h-10 w-10 rounded" />
            <Skeleton className="h-4 flex-1 max-w-[40%]" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-7 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Grid of card-shaped skeletons — used for product grids. */
export function CardGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-lg border border-border">
          <Skeleton className="aspect-[4/3] w-full rounded-none" />
          <div className="space-y-2 p-3.5">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-7 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Stat row skeleton — used by the dashboard. */
export function StatsRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border p-4">
          <Skeleton className="mb-2 h-3 w-16" />
          <Skeleton className="h-7 w-24" />
        </div>
      ))}
    </div>
  );
}
