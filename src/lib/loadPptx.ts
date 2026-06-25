import type { Slide } from "./deckStore";

const SLIDE_W = 1920;
const SLIDE_H = 1080;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: number | undefined;
  const timeout = new Promise<T>((_, reject) => {
    timer = window.setTimeout(() => reject(new Error(`${label} timed out`)), ms);
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timer) window.clearTimeout(timer);
  });
}

// Wait for all <img> inside a node to finish loading (or fail). Broken images
// can already be "complete" before listeners attach, so they must resolve too.
function waitForImages(root: HTMLElement, timeoutMs = 2500): Promise<void> {
  const imgs = Array.from(root.querySelectorAll("img"));
  if (imgs.length === 0) return Promise.resolve();

  return withTimeout(
    Promise.all(
      imgs.map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete && img.naturalWidth > 0) return resolve();

            const cleanup = () => {
              img.removeEventListener("load", onDone);
              img.removeEventListener("error", onDone);
            };
            const onDone = () => {
              cleanup();
              resolve();
            };

            img.addEventListener("load", onDone, { once: true });
            img.addEventListener("error", onDone, { once: true });
            img.decode?.().then(onDone).catch(onDone);
          }),
      ),
    ).then(() => undefined),
    timeoutMs,
    "PPTX image loading",
  ).catch(() => undefined);
}

function raf(): Promise<void> {
  return new Promise((r) => requestAnimationFrame(() => r()));
}

async function settleRenderedSlide(host: HTMLElement): Promise<void> {
  await raf();
  await raf();
  await waitForImages(host);
  await raf();
}

function slideFallback(index: number, width = SLIDE_W, height = SLIDE_H): Slide {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#888";
  ctx.font = `32px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`Slide ${index + 1} — rendering failed`, width / 2, height / 2);
  return { index, url: canvas.toDataURL(), width, height };
}

export async function loadPptxToSlides(
  file: File,
  onProgress?: (p: number) => void,
): Promise<Slide[]> {
  const buf = await file.arrayBuffer();

  const host = document.createElement("div");
  host.style.cssText = `position:fixed;left:-99999px;top:0;width:${SLIDE_W}px;pointer-events:none;opacity:0;`;
  document.body.appendChild(host);

  let viewer: any = null;
  try {
    const { init } = await import("pptx-preview");
    viewer = init(host, { width: SLIDE_W, mode: "list" });
    await withTimeout(viewer.load(buf), 30000, "PPTX parsing");

    const count = Number(viewer.slideCount ?? viewer.pptx?.slides?.length ?? 0);
    if (!count) throw new Error("No slides found in PPTX");

    const slides: Slide[] = [];
    for (let i = 0; i < count; i++) {
      try {
        viewer.renderSingleSlide(i);
        await withTimeout(settleRenderedSlide(host), 5000, `Slide ${i + 1} render`);
        const slide = await withTimeout(rasterizeSlide(host, i), 5000, `Slide ${i + 1} rasterize`);
        slides.push(slide);
      } catch (error) {
        console.warn(`PPTX slide ${i + 1} failed to render`, error);
        slides.push(slideFallback(i));
      }
      onProgress?.((i + 1) / count);
    }

    return slides;
  } catch (error) {
    console.error("PPTX conversion failed", error);
    throw error;
  } finally {
    viewer?.destroy?.();
    host.remove();
  }
}

async function rasterizeSlide(host: HTMLElement, index: number): Promise<Slide> {
  const { toBlob } = await import("html-to-image");

  const slideEl =
    host.querySelector<HTMLElement>(`.pptx-preview-slide-wrapper-${index}`) ??
    host.querySelector<HTMLElement>(".pptx-preview-slide-wrapper");

  if (!slideEl) throw new Error("slide wrapper not found");

  const width = parseFloat(slideEl.style.width ?? "") || slideEl.offsetWidth || SLIDE_W;
  const height = parseFloat(slideEl.style.height ?? "") || slideEl.offsetHeight || SLIDE_H;

  const blob = await toBlob(slideEl, { type: "image/jpeg", quality: 0.92, pixelRatio: 1 });
  if (!blob) throw new Error("rasterization produced no blob");

  return { index, url: URL.createObjectURL(blob), width, height };
}
