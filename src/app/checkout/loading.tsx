import { Skeleton } from "@/components/Skeletons";

export default function CheckoutLoading() {
  return (
    <div className="mx-auto max-w-6xl px-[var(--gutter)] py-6 lg:py-8 space-y-6">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-9 w-40" />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-3 rounded-lg border border-border p-5">
          <Skeleton className="h-5 w-44" />
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          <Skeleton className="h-12 w-full" />
        </div>
        <div className="space-y-3 rounded-lg border border-border p-5">
          <Skeleton className="h-5 w-32" />
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}
        </div>
      </div>
    </div>
  );
}
