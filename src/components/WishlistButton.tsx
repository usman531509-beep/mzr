"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useWishlist, type WishlistItem } from "@/lib/wishlist-store";

export function WishlistButton({
  product,
  className,
  size = "md",
}: {
  product: WishlistItem;
  className?: string;
  size?: "sm" | "md";
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const has = useWishlist((s) => s.items.some((i) => i.productId === product.productId));
  const add = useWishlist((s) => s.add);
  const remove = useWishlist((s) => s.remove);

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!session?.user?.id) {
      toast.message("Sign in to use the wishlist");
      router.push("/login?callbackUrl=/products");
      return;
    }
    if (has) {
      remove(product.productId);
      toast("Removed from wishlist");
    } else {
      add(product);
      toast.success("Added to wishlist");
    }
  };

  const px = size === "sm" ? "h-7 w-7" : "h-9 w-9";
  return (
    <button
      type="button"
      aria-label={has ? "Remove from wishlist" : "Add to wishlist"}
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center rounded-full border transition",
        px,
        has
          ? "border-rose-500/40 bg-rose-500/15 text-rose-400 hover:bg-rose-500/25"
          : "border-border bg-card/80 text-muted-foreground backdrop-blur hover:border-rose-500/30 hover:text-rose-400",
        className,
      )}
    >
      <Heart className={cn(size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4", has && "fill-current")} />
    </button>
  );
}
