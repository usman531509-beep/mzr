import sharp from "sharp";

const MAX_BYTES = 200 * 1024; // 200 KB target ceiling
const MAX_DIMENSION = 1600;   // hard cap on width/height before quality loop

export type CompressedImage = {
  buffer: Buffer;
  contentType: string;
  ext: string;
};

/**
 * Iteratively compress an image so its final byte size is ≤ ~200 KB.
 *
 * Strategy: convert to JPEG (or keep PNG for screenshots), shrink the long
 * side to MAX_DIMENSION, then loop quality 80 → 30 in 10-point steps until
 * the encoded buffer fits. As a last resort we resize down further so even
 * very-noisy photos always fit under the cap.
 */
export async function compressUnder200KB(input: Buffer): Promise<CompressedImage> {
  // If the original is already small enough and is a regular jpeg/png/webp,
  // we still re-encode through sharp to strip metadata and apply the dim cap.
  const meta = await sharp(input).metadata();
  const isPng = meta.format === "png" && meta.hasAlpha === true;
  const ext   = isPng ? "png" : "jpg";
  const contentType = isPng ? "image/png" : "image/jpeg";

  let pipeline = sharp(input).rotate(); // honour EXIF orientation
  if ((meta.width ?? 0) > MAX_DIMENSION || (meta.height ?? 0) > MAX_DIMENSION) {
    pipeline = pipeline.resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside" });
  }

  const encode = async (qual: number, p: sharp.Sharp): Promise<Buffer> =>
    isPng
      ? p.clone().png({ compressionLevel: 9, palette: true, quality: qual }).toBuffer()
      : p.clone().jpeg({ quality: qual, mozjpeg: true }).toBuffer();

  // Quality sweep 80 → 30
  for (const quality of [80, 70, 60, 50, 40, 30]) {
    const out = await encode(quality, pipeline);
    if (out.length <= MAX_BYTES) {
      return { buffer: out, contentType, ext };
    }
  }

  // Still too big — start halving dimensions while keeping quality at 60.
  let scale = 0.75;
  for (let i = 0; i < 5; i++) {
    const w = Math.max(320, Math.round((meta.width ?? MAX_DIMENSION) * scale));
    const h = Math.max(320, Math.round((meta.height ?? MAX_DIMENSION) * scale));
    const smaller = sharp(input)
      .rotate()
      .resize({ width: w, height: h, fit: "inside" });
    const out = await encode(50, smaller);
    if (out.length <= MAX_BYTES) {
      return { buffer: out, contentType, ext };
    }
    scale *= 0.75;
  }

  // Give up gracefully — return whatever the smallest attempt was.
  const finalBuf = await encode(40, sharp(input).rotate().resize({ width: 800, height: 800, fit: "inside" }));
  return { buffer: finalBuf, contentType, ext };
}
