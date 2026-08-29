"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { ImagePlus, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { removeImageBackground } from "@/lib/remove-bg";
import { confirmAction } from "@/lib/confirm-store";

const RASTER = /^image\/(png|jpe?g|webp)$/i;

// Single-image uploader for admin forms (category images, brand logos, …).
// Mirrors the product image pipeline: downscale in the browser to dodge
// Vercel's 4.5 MB serverless body cap, POST to /api/upload (Supabase Storage
// in prod, local disk in dev), then hand the resulting URL back to the form.

type Props = {
  value: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  hint?: string;
  className?: string;
  // Logos read better contained (whole mark visible); photos can cover.
  fit?: "contain" | "cover";
};

export function ImageUpload({
  value, onChange, label, hint, className, fit = "contain",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  // Button label while working ("Removing background…" → "Uploading…").
  const [busyLabel, setBusyLabel] = useState("Uploading…");

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (inputRef.current) inputRef.current.value = ""; // allow re-selecting

    // Ask (before showing any loader) whether to remove the background. Only
    // offer it for raster photos — SVG/vector isn't supported by the model.
    let wantBg = false;
    if (RASTER.test(file.type)) {
      wantBg = await confirmAction({
        title: "Remove background?",
        description:
          "Remove the image background before uploading? This runs on your device and can take a few seconds. Choose “No” to upload the image as-is.",
        confirmLabel: "Yes, remove",
        cancelLabel: "No, upload as-is",
      });
    }

    setUploading(true);
    try {
      const down = await downscaleForUpload(file);
      let prepared: Blob = down;
      let filename = down.name;
      if (wantBg) {
        setBusyLabel("Removing background…");
        try {
          prepared = await removeImageBackground(file);
          filename = file.name.replace(/\.[^.]+$/, "") + ".png";
        } catch (bgErr) {
          console.error("[ImageUpload remove-bg]", bgErr);
          toast.warning("Couldn't remove the background — uploading the original.");
        }
      }
      setBusyLabel("Uploading…");
      const fd = new FormData();
      fd.append("file", prepared, filename);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const raw = await res.text();
      let parsed: { url?: string; error?: string } = {};
      try { parsed = raw ? JSON.parse(raw) : {}; } catch { /* non-JSON infra error */ }
      if (!res.ok || !parsed.url) {
        throw new Error(
          parsed.error
          ?? (res.status === 413 ? "File is too large — try a smaller image" : null)
          ?? (res.status === 401 ? "Sign in as admin to upload" : null)
          ?? `Upload failed (HTTP ${res.status})`,
        );
      }
      onChange(parsed.url);
      toast.success("Image uploaded");
    } catch (err) {
      console.error("[ImageUpload]", err);
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      {label && <Label>{label}</Label>}
      <div className="flex items-center gap-3">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
          {value ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={value}
                alt=""
                className={cn("h-full w-full bg-white", fit === "cover" ? "object-cover" : "object-contain p-1.5")}
              />
              <button
                type="button"
                onClick={() => onChange(null)}
                className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow transition hover:brightness-110"
                aria-label="Remove image"
              >
                <X className="h-3 w-3" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground transition hover:bg-muted/60 hover:text-foreground"
            >
              {uploading
                ? <Loader2 className="h-5 w-5 animate-spin [will-change:transform]" />
                : <ImagePlus className="h-5 w-5" />}
              <span className="text-[10px] font-medium">{uploading ? busyLabel : "Add image"}</span>
            </button>
          )}
        </div>

        <div className="min-w-0 space-y-1.5">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium transition hover:bg-muted disabled:opacity-50"
          >
            {uploading
              ? <Loader2 className="h-3.5 w-3.5 animate-spin [will-change:transform]" />
              : <ImagePlus className="h-3.5 w-3.5" />}
            {uploading ? busyLabel : value ? "Replace" : "Upload"}
          </button>
          {hint && <p className="text-[11px] leading-snug text-muted-foreground">{hint}</p>}
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
    </div>
  );
}

// Resize + re-encode in the browser before upload so large phone photos don't
// trip Vercel's 4.5 MB serverless body limit (which 413s before the server's
// sharp compressor runs). Small images and non-images pass through untouched.
async function downscaleForUpload(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  if (file.size < 1_500_000) return file;
  try {
    const url = URL.createObjectURL(file);
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    URL.revokeObjectURL(url);

    const MAX_DIM = 2000;
    const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, w, h);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.82),
    );
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}
