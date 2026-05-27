import { redirect } from "next/navigation";

// Legacy route. The site now renders every category drill-in inside
// /products?category=<path> so the customer never sees a full page reload
// when clicking around the sidebar/mega-menu. We keep this route as a 301
// so external links and old bookmarks still land in the right place.

export default async function LegacyCategoryRedirect({
  params, searchParams,
}: {
  params: Promise<{ path: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { path } = await params;
  const sp = await searchParams;
  const extras = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "string") extras.set(k, v);
  }
  const qs = extras.toString();
  redirect(`/products?category=${path.join("/")}${qs ? `&${qs}` : ""}`);
}
