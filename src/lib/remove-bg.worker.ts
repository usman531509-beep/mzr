/// <reference lib="webworker" />
// Background removal, in a Web Worker (OffscreenCanvas) so the main thread never
// blocks. Two strategies, picked automatically:
//
//   1. SOLID background (product on white/black/etc. — most product photos):
//      chroma knockout — flood from the border removing the backdrop colour.
//      Keeps EVERY foreground part (small components, enclosed areas). This is
//      what makes it "intelligent": it removes the background, not the object.
//
//   2. COMPLEX background (cluttered/textured photo): the AI saliency matting
//      model (@imgly / ISNet) + matte cleanup.
import { removeBackground } from "@imgly/background-removal";

type Settings = {
  keepShadow: boolean;
  transparent: boolean;
  trim: boolean;
  brighten: boolean;
};

function parseInstructions(text?: string): Settings {
  const t = (text ?? "").toLowerCase();
  const has = (...w: string[]) => w.some((x) => t.includes(x));
  const wantsWhite = has("white", "white background", "studio", "opaque");
  return {
    keepShadow: has("keep shadow", "with shadow", "keep the shadow"),
    transparent: !wantsWhite,
    trim: has("crop", "trim", "tight", "zoom"),
    brighten: true,
  };
}

async function shrink(file: Blob, max = 1280): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  if (scale === 1) { bitmap.close(); return file; }
  const canvas = new OffscreenCanvas(
    Math.round(bitmap.width * scale),
    Math.round(bitmap.height * scale),
  );
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.convertToBlob({ type: "image/jpeg", quality: 0.95 });
}

async function toImageData(blob: Blob): Promise<ImageData> {
  const bmp = await createImageBitmap(blob);
  const c = new OffscreenCanvas(bmp.width, bmp.height);
  const ctx = c.getContext("2d")!;
  ctx.drawImage(bmp, 0, 0);
  bmp.close();
  return ctx.getImageData(0, 0, c.width, c.height);
}

// Is the backdrop a single uniform colour? Sample the border and measure how
// tightly the pixels cluster. Returns the backdrop colour, or null if the
// border is varied (a real/complex background → use AI matting instead).
function detectSolidBg(
  data: Uint8ClampedArray, w: number, h: number,
): { r: number; g: number; b: number } | null {
  const step = Math.max(1, Math.round((w + h) / 240));
  const idx: number[] = [];
  for (let x = 0; x < w; x += step) { idx.push((0 * w + x) * 4); idx.push(((h - 1) * w + x) * 4); }
  for (let y = 0; y < h; y += step) { idx.push((y * w + 0) * 4); idx.push((y * w + (w - 1)) * 4); }
  const n = idx.length || 1;
  let r = 0, g = 0, b = 0;
  for (const i of idx) { r += data[i]; g += data[i + 1]; b += data[i + 2]; }
  const mr = r / n, mg = g / n, mb = b / n;
  let vs = 0;
  for (const i of idx) {
    const dr = data[i] - mr, dg = data[i + 1] - mg, db = data[i + 2] - mb;
    vs += dr * dr + dg * dg + db * db;
  }
  const variance = vs / n; // mean squared colour distance from the border mean
  // ≈ stddev < 28 per channel → treat as a uniform solid backdrop.
  if (variance > 28 * 28 * 3) return null;
  return { r: mr, g: mg, b: mb };
}

// Flood in from the border, removing only pixels that match the backdrop colour
// and are reachable from the edge — so every foreground object (however small)
// survives. Soft-fades the boundary for a clean anti-aliased edge.
function colorKnockout(
  data: Uint8ClampedArray, w: number, h: number, bg: { r: number; g: number; b: number },
) {
  const HARD = 40;   // ≤ this colour distance → definitely backdrop → transparent
  const SOFT = 96;   // ≥ this → definitely foreground → stop
  const dist = (i: number) => {
    const dr = data[i] - bg.r, dg = data[i + 1] - bg.g, db = data[i + 2] - bg.b;
    return Math.sqrt((dr * dr + dg * dg + db * db) / 3);
  };
  const visited = new Uint8Array(w * h);
  const stack: number[] = [];
  const push = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const p = y * w + x;
    if (visited[p]) return;
    const i = p * 4;
    const d = dist(i);
    if (d >= SOFT) return; // foreground — don't cross it
    visited[p] = 1;
    if (d <= HARD) {
      data[i + 3] = 0;
    } else {
      // Anti-alias the belt/edge: fade alpha across the HARD→SOFT band.
      const f = (d - HARD) / (SOFT - HARD);
      data[i + 3] = Math.round(data[i + 3] * f);
    }
    stack.push(p);
  };
  for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
  for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
  while (stack.length) {
    const p = stack.pop()!;
    const x = p % w, y = (p / w) | 0;
    push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1);
  }
}

// Clean an AI matte: kill low/uncertain alpha, solidify the confident subject.
function matteCleanup(data: Uint8ClampedArray, w: number, h: number) {
  const LOW = 95, HIGH = 200;
  for (let p = 0; p < w * h; p++) {
    const i = p * 4;
    const a0 = data[i + 3];
    if (a0 <= LOW) { data[i + 3] = 0; continue; }
    if (a0 >= HIGH) { data[i + 3] = 255; continue; }
    const tt = (a0 - LOW) / (HIGH - LOW);
    const a = Math.round(tt * tt * 255);
    data[i + 3] = a;
    const k = a / 255;
    data[i]     = Math.min(255, Math.round(data[i]     + (255 - data[i])     * (1 - k) * 0.5));
    data[i + 1] = Math.min(255, Math.round(data[i + 1] + (255 - data[i + 1]) * (1 - k) * 0.5));
    data[i + 2] = Math.min(255, Math.round(data[i + 2] + (255 - data[i + 2]) * (1 - k) * 0.5));
  }
}

// For AI mattes that kept a solid backdrop opaque (flat logos): knock out the
// border-connected solid colour.
function knockoutBorderBackground(data: Uint8ClampedArray, w: number, h: number) {
  let r = 0, g = 0, b = 0, n = 0;
  const sample = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    if (data[i + 3] > 200) { r += data[i]; g += data[i + 1]; b += data[i + 2]; n++; }
  };
  for (let x = 0; x < w; x++) { sample(x, 0); sample(x, h - 1); }
  for (let y = 0; y < h; y++) { sample(0, y); sample(w - 1, y); }
  if (n < 2 * (w + h) * 0.4) return;
  colorKnockout(data, w, h, { r: r / n, g: g / n, b: b / n });
}

async function composite(origBlob: Blob, cutData: ImageData, s: Settings): Promise<Blob> {
  const w = cutData.width, h = cutData.height;

  const cut = new OffscreenCanvas(w, h);
  cut.getContext("2d")!.putImageData(cutData, 0, 0);

  const out = new OffscreenCanvas(w, h);
  const ctx = out.getContext("2d")!;

  if (s.transparent) {
    ctx.putImageData(cutData, 0, 0);
    return out.convertToBlob({ type: "image/png" });
  }

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);

  let bMinX = w, bMinY = h, bMaxX = 0, bMaxY = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (cutData.data[(y * w + x) * 4 + 3] > 24) {
      if (x < bMinX) bMinX = x; if (x > bMaxX) bMaxX = x;
      if (y < bMinY) bMinY = y; if (y > bMaxY) bMaxY = y;
    }
  }
  const hasProduct = bMaxX > bMinX && bMaxY > bMinY;
  const nearPad = hasProduct ? Math.round(Math.max(bMaxX - bMinX, bMaxY - bMinY) * 0.14) : 0;

  if (s.keepShadow && hasProduct) {
    const origBmp = await createImageBitmap(origBlob);
    const src = new OffscreenCanvas(w, h);
    const sctx = src.getContext("2d")!;
    sctx.drawImage(origBmp, 0, 0, w, h);
    origBmp.close();
    const od = sctx.getImageData(0, 0, w, h).data;

    let sum = 0, count = 0;
    const edge = Math.max(2, Math.round(Math.min(w, h) * 0.02));
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const onEdge = x < edge || y < edge || x >= w - edge || y >= h - edge;
      if (!onEdge) continue;
      const i = (y * w + x) * 4;
      sum += 0.299 * od[i] + 0.587 * od[i + 1] + 0.114 * od[i + 2];
      count++;
    }
    const bgL = count ? sum / count : 255;

    const shadow = ctx.createImageData(w, h);
    const sd = shadow.data;
    let any = false;
    for (let y = 0; y < h; y++) {
      if (y < bMinY - nearPad || y > bMaxY + nearPad) continue;
      for (let x = 0; x < w; x++) {
        if (x < bMinX - nearPad || x > bMaxX + nearPad) continue;
        const i = (y * w + x) * 4;
        if (cutData.data[i + 3] > 24) continue;
        const lum = 0.299 * od[i] + 0.587 * od[i + 1] + 0.114 * od[i + 2];
        const drop = bgL - lum;
        if (drop < 16) continue;
        const strength = Math.min(1, drop / Math.max(40, bgL * 0.45));
        const a = Math.round(strength * (s.brighten ? 70 : 105));
        if (a <= 6) continue;
        any = true;
        sd[i] = 140; sd[i + 1] = 140; sd[i + 2] = 140; sd[i + 3] = a;
      }
    }
    if (any) {
      const layer = new OffscreenCanvas(w, h);
      layer.getContext("2d")!.putImageData(shadow, 0, 0);
      ctx.save();
      ctx.filter = "blur(4px)";
      ctx.globalAlpha = 0.85;
      ctx.drawImage(layer, 0, 0);
      ctx.restore();
    }
  }

  ctx.drawImage(cut, 0, 0);

  {
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    for (let p = 0; p < w * h; p++) {
      const i = p * 4;
      if (cutData.data[i + 3] > 8) continue;
      if (d[i] >= 225 && d[i + 1] >= 225 && d[i + 2] >= 225) {
        d[i] = 255; d[i + 1] = 255; d[i + 2] = 255; d[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  return out.convertToBlob({ type: "image/jpeg", quality: 0.95 });
}

async function process(file: Blob, instructions?: string): Promise<Blob> {
  const settings = parseInstructions(instructions);
  const input = await shrink(file);
  const inData = await toImageData(input);
  const w = inData.width, h = inData.height;

  const bg = detectSolidBg(inData.data, w, h);

  let cutData: ImageData;
  if (bg) {
    // Solid backdrop → colour knockout keeps every foreground part.
    cutData = new ImageData(new Uint8ClampedArray(inData.data), w, h);
    colorKnockout(cutData.data, w, h, bg);
  } else {
    // Complex backdrop → AI saliency matting + cleanup.
    const cutout = await removeBackground(input, {
      model: "isnet_quint8",
      output: { format: "image/png", quality: 0.9 },
      proxyToWorker: false,
    });
    cutData = await toImageData(cutout);
    matteCleanup(cutData.data, cutData.width, cutData.height);
    knockoutBorderBackground(cutData.data, cutData.width, cutData.height);
  }

  return composite(input, cutData, settings);
}

self.addEventListener("message", async (e: MessageEvent) => {
  const { id, file, instructions } = e.data ?? {};
  try {
    const blob = await process(file, instructions);
    (self as unknown as Worker).postMessage({ id, ok: true, blob });
  } catch (err) {
    (self as unknown as Worker).postMessage({
      id, ok: false, error: err instanceof Error ? err.message : String(err),
    });
  }
});
