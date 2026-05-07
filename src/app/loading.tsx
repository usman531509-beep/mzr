import { CardGridSkeleton, Skeleton } from "@/components/Skeletons";

export default function RootLoading() {
  return (
    <div className="mx-auto max-w-site space-y-8 px-[var(--gutter)] py-8">
      <div className="space-y-3">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-12 w-2/3 max-w-lg" />
        <Skeleton className="h-12 w-1/2 max-w-md" />
        <Skeleton className="h-4 w-3/4 max-w-xl" />
      </div>
      <CardGridSkeleton count={6} />
    </div>
  );
}
