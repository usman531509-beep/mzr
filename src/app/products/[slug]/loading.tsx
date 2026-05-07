import { Skeleton } from "@/components/Skeletons";

export default function ProductDetailLoading() {
  return (
    <div className="bg-background text-foreground">
      <div className="mx-auto grid max-w-site gap-8 px-[var(--gutter)] py-8 lg:grid-cols-2">
        <Skeleton className="aspect-square w-full" />
        <div className="space-y-4">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="h-10 w-32" />
          <div className="space-y-2 pt-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          <Skeleton className="h-11 w-full max-w-xs" />
        </div>
      </div>
    </div>
  );
}
