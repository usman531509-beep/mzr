import { Fragment } from "react";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export type Crumb = { label: string; href?: string };

// Reusable breadcrumb trail. Always starts with a Home icon → "/".
// The last crumb is rendered as plain text (current page); earlier ones
// without an href are also non-clickable. Truncates long labels on mobile.

export function Breadcrumbs({
  items,
  className,
}: {
  items: Crumb[];
  className?: string;
}) {
  return (
    <nav
      className={cn(
        "flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[12.5px] text-muted-foreground",
        className,
      )}
      aria-label="Breadcrumb"
    >
      <Link
        href="/"
        className="inline-flex items-center transition hover:text-foreground"
        aria-label="Home"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>
      {items.map((it, i) => {
        const isLast = i === items.length - 1;
        return (
          <Fragment key={`${it.label}-${i}`}>
            <ChevronRight className="h-3 w-3 shrink-0 opacity-60" />
            {it.href && !isLast ? (
              <Link
                href={it.href}
                className="truncate transition hover:text-foreground"
              >
                {it.label}
              </Link>
            ) : (
              <span className="max-w-[200px] truncate text-foreground sm:max-w-none">
                {it.label}
              </span>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
