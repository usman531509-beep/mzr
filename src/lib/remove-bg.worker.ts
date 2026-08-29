/// <reference lib="webworker" />
// Runs the ENTIRE background-removal pipeline (matting + matte cleanup +
// compositing) inside a Web Worker, using OffscreenCanvas. This keeps the main
// thread completely free so the UI / loader never freezes while it works.
//
// The worker is long-lived (one per tab): the model stays cached in it, so the
// first request downloads it and later ones are fast.
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

// Flood in from the border and knock out a solid, uniform backdrop the model
// kept opaque (flat logos etc.). Skips when the border is already transparent.
function knockoutBorderBackground(data: Uint8ClampedArray, w: number, h: number) {
  let r = 0, g = 0, b = 0, n = 0;
  const sample = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    if (data[i + 3] > 200) { r += data[i]; g += data[i + 1]; b += data[i + 2]; n++; }
  };
  for (let x = 0; x < w; x++) { sample(x, 0); sample(x, h - 1); }
  for (let y = 0; y < h; y++) { sample(0, y); sample(w - 1, y); }

  const borderLen = 2 * (w + h);
  if (n < borderLen * 0.4) return;

  const br = r / n, bg = g / n, bb = b / n;
  const TOL2 = 52 * 52 * 3;
  const close = (i: number) => {
    const dr = data[i] - br, dg = data[i + 1] - bg, db = data[i + 2] - bb;
    return dr * dr + dg * dg + db * db <= TOL2;
  };

  const visited = new Uint8Array(w * h);
  const stack: number[] = [];
  const push = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const p = y * w + x;
    if (visited[p]) return;
    const i = p * 4;
    if (data[i + 3] <= 8) { visited[p] = 1; return; }
    if (!close(i)) return;
    visited[p] = 1;
    data[i + 3] = 0;
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

async function composite(original: Blob, cutout: Blob, s: Settings): Promise<Blob> {
  const [origBmp, cutBmp] = await Promise.all([
    createImageBitmap(original),
    createImageBitmap(cutout),
  ]);
  const w = cutBmp.width;
  const h = cutBmp.height;

  const cut = new OffscreenCanvas(w, h);
  const cutCtx = cut.getContext("2d")!;
  cutCtx.drawImage(cutBmp, 0, 0);
  const cutData = cutCtx.getImageData(0, 0, w, h);

  // Clean the matte: kill low/uncertain alpha (grungy backdrops the model left
  // as faint pixels), solidify the confident subject, steepen the rest.
  {
    const d = cutData.data;
    const LOW = 95, HIGH = 200;
    for (let p = 0; p < w * h; p++) {
      const i = p * 4;
      const a0 = d[i + 3];
      if (a0 <= LOW) { d[i + 3] = 0; continue; }
      if (a0 >= HIGH) { d[i + 3] = 255; continue; }
      const tt = (a0 - LOW) / (HIGH - LOW);
      const a = Math.round(tt * tt * 255);
      d[i + 3] = a;
      const k = a / 255;
      d[i]     = Math.min(255, Math.round(d[i]     + (255 - d[i])     * (1 - k) * 0.5));
      d[i + 1] = Math.min(255, Math.round(d[i + 1] + (255 - d[i + 1]) * (1 - k) * 0.5));
      d[i + 2] = Math.min(255, Math.round(d[i + 2] + (255 - d[i + 2]) * (1 - k) * 0.5));
    }
    knockoutBorderBackground(cutData.data, w, h);
    cutCtx.putImageData(cutData, 0, 0);
  }

  const out = new OffscreenCanvas(w, h);
  const ctx = out.getContext("2d")!;

  if (s.transparent) {
    ctx.putImageData(cutData, 0, 0);
    origBmp.close(); cutBmp.close();
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
    const src = new OffscreenCanvas(w, h);
    const sctx = src.getContext("2d")!;
    sctx.drawImage(origBmp, 0, 0, w, h);
    const od = sctx.getImageData(0, 0, w, h).data;

    let sum = 0, count = 0;
    const edge = Math.max(2, Math.round(Math.min(w, h) * 0.02));
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const onEdge = x < edge || y < edge || x >= w - edge || y >= h - edge;
        if (!onEdge) continue;
        const i = (y * w + x) * 4;
        sum += 0.299 * od[i] + 0.587 * od[i + 1] + 0.114 * od[i + 2];
        count++;
      }
    }
    const bg = count ? sum / count : 255;

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
        const drop = bg - lum;
        if (drop < 16) continue;
        const strength = Math.min(1, drop / Math.max(40, bg * 0.45));
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
  origBmp.close(); cutBmp.close();

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
  const cutout = await removeBackground(input, {
    model: "isnet_quint8",
    output: { format: "image/png", quality: 0.9 },
    // We're already inside a worker — run inference here directly.
    proxyToWorker: false,
  });
  return composite(input, cutout, settings);
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
