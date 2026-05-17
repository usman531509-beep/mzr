import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

// Active storefront-top-bar offers. Cached for 5 minutes and tagged so admin
// mutations to /api/admin/offers can invalidate it on demand. The top bar is
// rendered on every request — without this cache every page would hit
// Postgres just to figure out whether to show the banner.

export const OFFERS_CACHE_TAG = "offers-active";

export type ActiveOffer = {
  id: string;
  text: string;
  icon: string | null;
};

export const getActiveOffers = unstable_cache(
  async (): Promise<ActiveOffer[]> => {
    return prisma.offer.findMany({
      where: { active: true },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      select: { id: true, text: true, icon: true },
    });
  },
  ["active-offers-v1"],
  { revalidate: 300, tags: [OFFERS_CACHE_TAG] },
);
