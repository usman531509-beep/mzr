"use client";

import { useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// URL-driven pagination. The current page is read from `?page=` so the
// server-rendered list (which fetches via skip/take based on the same param)
// stays the single source of truth. Other filters in the URL are preserved
// across page changes.

export function Pagination({
  total, pageSize, currentPage, className,
}: {
  total: number;
  pageSize: number;
  currentPage: number;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, currentPage), totalPages);

  const go = (next: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next <= 1) params.delete("page");
    else params.set("page", String(next));
    const qs = params.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  };

  // Build a compact page list: 1 … (n-1) n (n+1) … last. Avoids rendering
  // dozens of buttons when total pages is large.
  const pageList = useMemo(() => {
    const out: Array<number | "…"> = [];
    const push = (v: number | "…") => out.push(v);
    const range = (a: number, b: number) => {
      for (let i = a; i <= b; i++) push(i);
    };
    if (totalPages <= 7) {
      range(1, totalPages);
    } else if (page <= 4) {
      range(1, 5);
      push("…");
      push(totalPages);
    } else if (page >= totalPages - 3) {
      push(1);
      push("…");
      range(totalPages - 4, totalPages);
    } else {
      push(1);
      push("…");
      range(page - 1, page + 1);
      push("…");
      push(totalPages);
    }
    return out;
  }, [page, totalPages]);

  if (totalPages <= 1) {
    return total > 0 ? (
      <div className={cn("flex items-center justify-end pt-3 text-[12px] text-muted-foreground", className)}>
        Showing {total} {total === 1 ? "item" : "items"}
      </div>
    ) : null;
  }

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className={cn(
      "flex flex-wrap items-center justify-between gap-2 pt-3 text-[12px] text-muted-foreground",
      className,
    )}>
      <div>
        Showing <span className="font-semibold text-foreground">{start}</span>–
        <span className="font-semibold text-foreground">{end}</span> of{" "}
        <span className="font-semibold text-foreground">{total}</span>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost" size="sm"
          disabled={page <= 1}
          onClick={() => go(page - 1)}
          className="h-8 gap-1 px-2"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Prev</span>
        </Button>
        {pageList.map((p, i) =>
          p === "…" ? (
            <span key={`gap-${i}`} className="px-1 text-muted-foreground/60">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </span>
          ) : (
            <Button
              key={p}
              variant={p === page ? "default" : "ghost"}
              size="sm"
              onClick={() => go(p)}
              className={cn(
                "h-8 min-w-[2rem] px-2 tabular-nums",
                p === page && "pointer-events-none",
              )}
              aria-current={p === page ? "page" : undefined}
            >
              {p}
            </Button>
          ),
        )}
        <Button
          variant="ghost" size="sm"
          disabled={page >= totalPages}
          onClick={() => go(page + 1)}
          className="h-8 gap-1 px-2"
          aria-label="Next page"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// `parsePagination` is a server-safe helper and lives in @/lib/pagination —
// import it from there directly in server components.
