"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 3'><rect width='4' height='3' fill='%231C1E21'/></svg>`,
  );

// Product detail gallery with clickable thumbnails. Server passes the full
// list of image URLs; this component owns the selected-index state so the
// main image swaps in place. Thumbnails get a primary-coloured ring when
// active, hover lift otherwise. Falls back to a single placeholder when
// the product has no images at all.
export function ProductImageGallery({
  images, name, featured, soldOut,
}: {
  images: string[];
  name: string;
  featured?: boolean;
  soldOut?: boolean;
}) {
  const safeImages = images.length > 0 ? images : [PLACEHOLDER];
  const [active, setActive] = useState(0);
  // Clamp in case the prop changes (e.g. router.refresh after admin edit).
  const idx = Math.min(active, safeImages.length - 1);
  const mainImg = safeImages[idx];

  return (
    // The wrapper is width-constrained and centred inside the left column.
    // Without this, the gallery stretched to fill a 1.1fr column on wide
    // viewports, which left a lot of dead dark space around portrait
    // product photos and made the thumbnail strip look stranded at the
    // left edge. A square card centred with a max-width gives a balanced
    // product-detail look.
    <div className="mx-auto w-full max-w-[560px] space-y-2">
      <Card className="overflow-hidden">
        <div className="relative aspect-square bg-secondary">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={mainImg}
            src={mainImg}
            alt={name}
            // key swap + opacity transition gives a small cross-fade when
            // the admin clicks a thumbnail.
            className="h-full w-full object-contain p-4 transition-opacity duration-200"
          />
          {featured && (
            <Badge variant="default" className="absolute left-3 top-3 text-[10px]">
              Featured
            </Badge>
          )}
          {soldOut && (
            <Badge variant="destructive" className="absolute right-3 top-3 text-[10px]">
              Sold out
            </Badge>
          )}
        </div>
      </Card>

      {safeImages.length > 1 && (
        // Thumbnails span the same width as the main card and use 5 cols
        // (the dialog allows up to 6 images so a 5-wide strip catches the
        // common case neatly; a 6th would wrap to row 2, which is fine).
        <div className="grid grid-cols-5 gap-2">
          {safeImages.map((src, i) => {
            const isActive = i === idx;
            return (
              <button
                key={`${src}-${i}`}
                type="button"
                onClick={() => setActive(i)}
                aria-label={`View image ${i + 1} of ${safeImages.length}`}
                aria-current={isActive}
                className={cn(
                  "group overflow-hidden rounded-md border bg-secondary transition",
                  isActive
                    ? "border-primary ring-2 ring-primary/60"
                    : "border-border hover:border-primary/40",
                )}
              >
                <div className="aspect-square">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt=""
                    className={cn(
                      "h-full w-full object-contain p-1.5 transition group-hover:scale-[1.03]",
                      !isActive && "opacity-80 group-hover:opacity-100",
                    )}
                  />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
