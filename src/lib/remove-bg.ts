// Main-thread entry point for on-device background removal.
//
// The actual work (matting model + matte cleanup + compositing) runs in a
// dedicated Web Worker (remove-bg.worker.ts) so the main thread NEVER blocks —
// the UI/loader stays responsive the whole time. Output is a transparent PNG by
// default (pass `{ instructions: "white" }` for a studio-white JPEG backdrop).

export type BgOptions = {
  /** Free-text instructions. Recognised keywords tweak the result. */
  instructions?: string;
};

let _worker: Worker | null = null;

function getWorker(): Worker {
  if (!_worker) {
    _worker = new Worker(new URL("./remove-bg.worker.ts", import.meta.url));
  }
  return _worker;
}

export function removeImageBackground(
  file: File | Blob,
  opts: BgOptions = {},
): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    let worker: Worker;
    try {
      worker = getWorker();
    } catch (e) {
      reject(e instanceof Error ? e : new Error("Worker unavailable"));
      return;
    }

    const id = Math.random().toString(36).slice(2);

    // Safety net — never hang forever if the worker stalls.
    const timer = setTimeout(() => {
      worker.removeEventListener("message", onMsg);
      reject(new Error("Background removal timed out"));
    }, 45_000);

    const onMsg = (e: MessageEvent) => {
      const data = e.data;
      if (!data || data.id !== id) return;
      clearTimeout(timer);
      worker.removeEventListener("message", onMsg);
      if (data.ok) resolve(data.blob as Blob);
      else reject(new Error(data.error || "Background removal failed"));
    };

    worker.addEventListener("message", onMsg);
    worker.postMessage({ id, file, instructions: opts.instructions });
  });
}
