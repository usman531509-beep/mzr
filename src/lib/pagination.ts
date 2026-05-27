// Server-safe pagination helpers. Pure functions — no React, no hooks — so
// they can be imported from server components without the "client function
// from server" runtime error you'd get when importing from the Pagination
// component (which is "use client" for router/searchParams).

export function parsePagination(
  sp: Record<string, string | string[] | undefined>,
  { defaultSize = 25, maxSize = 100 }: { defaultSize?: number; maxSize?: number } = {},
) {
  const pageRaw = typeof sp.page === "string" ? parseInt(sp.page, 10) : NaN;
  const sizeRaw = typeof sp.pageSize === "string" ? parseInt(sp.pageSize, 10) : NaN;
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const pageSize = Number.isFinite(sizeRaw) && sizeRaw > 0
    ? Math.min(sizeRaw, maxSize)
    : defaultSize;
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}
