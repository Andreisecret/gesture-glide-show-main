import type { Slide } from "./deckStore";

// Lazy import pdfjs to keep SSR safe
export async function loadPdfToSlides(
  file: File,
  onProgress?: (p: number) => void,
): Promise<Slide[]> {
  const pdfjs: any = await import("pdfjs-dist");
  // Vite worker import
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const slides: Slide[] = [];
  const target = 1920;

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 1 });
    const scale = Math.min(target / viewport.width, (target * 9) / 16 / viewport.height, 2);
    const scaled = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(scaled.width);
    canvas.height = Math.ceil(scaled.height);
    const ctx = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx, viewport: scaled, canvas }).promise;
    const blob: Blob = await new Promise((r) => canvas.toBlob((b) => r(b!), "image/jpeg", 0.92)!);
    slides.push({
      index: i - 1,
      url: URL.createObjectURL(blob),
      width: canvas.width,
      height: canvas.height,
    });
    onProgress?.(i / doc.numPages);
  }
  return slides;
}
