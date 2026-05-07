import { CardGridSkeleton, Skeleton } from "@/components/Skeletons";

export default function ProductsLoading() {
  return (
    <div className="bg-background text-foreground">
      <div className="mx-auto max-w-site space-y-5 px-[var(--gutter)] py-6 lg:py-8">
        <Skeleton className="h-4 w-64" />
        <div className="flex flex-wrap items-end justify-between gap-3">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="border-y border-border py-3">
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-9 flex-1 max-w-md" />
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-28" />
          </div>
        </div>
        <CardGridSkeleton count={8} />
      </div>
    </div>
  );
}
