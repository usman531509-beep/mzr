import { Fragment } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export type Crumb = { label: string; href?: string };

// Reusable breadcrumb trail, styled after the reference mockups' .crumb row:
// muted 13px text with "·" separators ("Home · Parts · Brakes"). Always
// starts with "Home" → "/". The last crumb is rendered as plain text
// (current page); earlier ones without an href are also non-clickable.
// Truncates long labels on mobile.

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
        "crumb flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] text-muted-foreground",
        className,
      )}
      aria-label="Breadcrumb"
    >
      <Link href="/" className="transition hover:text-red">
        Home
      </Link>
      {items.map((it, i) => {
        const isLast = i === items.length - 1;
        return (
          <Fragment key={`${it.label}-${i}`}>
            <span aria-hidden="true" className="opacity-60">
              ·
            </span>
            {it.href && !isLast ? (
              <Link
                href={it.href}
                className="truncate transition hover:text-red"
              >
                {it.label}
              </Link>
            ) : (
              <span className="max-w-[200px] truncate font-medium text-ink sm:max-w-none">
                {it.label}
              </span>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
