"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 3'><rect width='4' height='3' fill='%23f5f6f9'/></svg>`,
  );

// Product detail gallery with clickable thumbnails, styled to the reference
// .pdp-gallery / .thumbs pattern (white contain-fit stage, 70px square
// thumbnails with a red border on the active one). The server passes the
// full list of image URLs; this component owns the selected-index state so
// the main image swaps in place. Falls back to a single light placeholder
// when the product has no images at all.
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
    <div>
      <div className="pdp-gallery relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={mainImg}
          src={mainImg}
          alt={name}
          // key swap + opacity transition gives a small cross-fade when a
          // thumbnail is clicked.
          className="transition-opacity duration-200"
        />
        {(featured || soldOut) && (
          <div className="absolute left-3 top-3 z-[2] flex gap-1.5">
            {featured && <span className="tag red">Featured</span>}
            {soldOut && <span className="tag">Sold out</span>}
          </div>
        )}
      </div>

      {safeImages.length > 1 && (
        <div className="thumbs">
          {safeImages.map((src, i) => {
            const isActive = i === idx;
            return (
              <button
                key={`${src}-${i}`}
                type="button"
                onClick={() => setActive(i)}
                aria-label={`View image ${i + 1} of ${safeImages.length}`}
                aria-current={isActive}
                className={cn("thumb shrink-0 p-0", isActive && "on")}
                // Thumbs are background-image tiles in the reference; use
                // contain-on-white to match how part photos render site-wide.
                style={{
                  backgroundImage: `url("${src}")`,
                  backgroundColor: "#fff",
                  backgroundSize: "contain",
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "center",
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
