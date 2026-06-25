import type { Slide } from "./deckStore";
import { googleFetch } from "./googleAuth";

export function extractPresentationId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  // Accept a raw ID
  if (/^[a-zA-Z0-9_-]{20,}$/.test(trimmed)) return trimmed;
  const m = trimmed.match(/\/presentation\/d\/([a-zA-Z0-9_-]+)/);
  return m?.[1] ?? null;
}

type SlidesPresentation = {
  title?: string;
  pageSize?: { width?: { magnitude: number }; height?: { magnitude: number } };
  slides?: Array<{ objectId: string }>;
};

export async function loadGoogleSlides(
  presentationId: string,
  onProgress?: (p: number) => void,
): Promise<{ name: string; slides: Slide[] }> {
  const presRes = await googleFetch(
    `https://slides.googleapis.com/v1/presentations/${encodeURIComponent(
      presentationId,
    )}?fields=title,pageSize,slides.objectId`,
  );
  if (!presRes.ok) {
    if (presRes.status === 404) throw new Error("Presentation not found or you don't have access.");
    throw new Error(`Slides API failed (${presRes.status})`);
  }
  const pres = (await presRes.json()) as SlidesPresentation;
  const slideRefs = pres.slides ?? [];
  if (!slideRefs.length) throw new Error("This presentation has no slides.");

  const w = pres.pageSize?.width?.magnitude ?? 9144000;
  const h = pres.pageSize?.height?.magnitude ?? 5143500;
  const aspect = w / h;
  const targetW = 1600;
  const targetH = Math.round(targetW / aspect);

  const slides: Slide[] = [];
  for (let i = 0; i < slideRefs.length; i++) {
    const slideId = slideRefs[i].objectId;
    const thumbRes = await googleFetch(
      `https://slides.googleapis.com/v1/presentations/${encodeURIComponent(
        presentationId,
      )}/pages/${encodeURIComponent(
        slideId,
      )}/thumbnail?thumbnailProperties.mimeType=PNG&thumbnailProperties.thumbnailSize=LARGE`,
    );
    if (!thumbRes.ok) throw new Error(`Thumbnail failed for slide ${i + 1} (${thumbRes.status})`);
    const { contentUrl } = (await thumbRes.json()) as { contentUrl: string };
    // contentUrl is a short-lived public URL — fetch and convert to a stable blob.
    const imgRes = await fetch(contentUrl);
    if (!imgRes.ok) throw new Error(`Image fetch failed for slide ${i + 1}`);
    const blob = await imgRes.blob();
    slides.push({
      index: i,
      url: URL.createObjectURL(blob),
      width: targetW,
      height: targetH,
    });
    onProgress?.((i + 1) / slideRefs.length);
  }

  return { name: pres.title || "Google Slides deck", slides };
}
