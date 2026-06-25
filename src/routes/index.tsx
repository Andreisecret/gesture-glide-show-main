import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { Upload, FileText, Loader2, Hand, Sparkles, Coffee, Presentation } from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { useDeck } from "@/lib/deckStore";
import { loadPdfToSlides } from "@/lib/loadPdf";
import { loadPptxToSlides } from "@/lib/loadPptx";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GestureDeck — Control slides with hand gestures" },
      { name: "description", content: "Upload a PDF or PPTX and navigate your presentation using webcam hand gestures. Fully in-browser, private by design." },
      { property: "og:title", content: "GestureDeck — Control slides with hand gestures" },
      { property: "og:description", content: "Upload a PDF or PPTX and navigate your presentation using webcam hand gestures." },
      { property: "og:url", content: "https://gesture-glide-show.lovable.app/" },
    ],
    links: [
      { rel: "canonical", href: "https://gesture-glide-show.lovable.app/" },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const navigate = useNavigate();
  const setDeck = useDeck((s) => s.setDeck);
  const slides = useDeck((s) => s.slides);
  const deckName = useDeck((s) => s.deckName);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState("Rasterizing slides");

  const handleFile = useCallback(async (file: File) => {
    const name = file.name.toLowerCase();
    const isPptx = name.endsWith(".pptx");
    const isPdf = name.endsWith(".pdf");
    if (!isPptx && !isPdf) {
      toast.error("Unsupported file", { description: "Upload a .pdf or .pptx file." });
      return;
    }
    try {
      setLoading(true); setProgress(0);
      setLoadingLabel(isPptx ? "Converting PPTX" : "Rasterizing slides");
      const out = isPptx
        ? await loadPptxToSlides(file, setProgress)
        : await loadPdfToSlides(file, setProgress);
      setDeck(file.name, out);
      toast.success(`Loaded ${out.length} slides`);
      navigate({ to: "/present" });
    } catch (e: any) {
      toast.error(isPptx ? "Failed to convert PPTX" : "Failed to load PDF", { description: e?.message ?? String(e) });
    } finally {
      setLoading(false);
    }
  }, [navigate, setDeck]);

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-5xl px-6 py-20">
        <section className="space-y-6 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/40 px-3 py-1 text-xs uppercase tracking-widest text-muted-foreground font-mono">
            <Sparkles className="size-3 text-primary" /> Webcam · MediaPipe · Private
          </span>
          <h1 className="font-mono text-5xl font-semibold tracking-tight md:text-6xl">
            Present with your <span className="text-primary">hands.</span>
          </h1>
          <p className="mx-auto max-w-xl text-base text-muted-foreground">
            Drop a PDF, allow your camera, and drive the deck with swipes, fists, and pointing —
            all running locally in your browser.
          </p>
        </section>

        <section className="mt-16" aria-labelledby="upload-heading">
          <h2 id="upload-heading" className="sr-only">Upload your deck</h2>
          <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
            <a
              href="https://cloudconvert.com/pptx-to-pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs font-medium text-sky-600 transition-colors hover:bg-sky-500/20"
            >
              Convert PPTX to PDF
            </a>
            <a
              href="https://buymeacoffee.com/andreibos"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-yellow-500/10 px-4 py-2 text-base font-medium text-yellow-500 transition-colors hover:bg-yellow-500/20"
            >
              <Coffee className="size-5" />
              Support
            </a>
            <Link
              to="/google"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card/40 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-card/60"
            >
              <Presentation className="size-4" />
              Google Slides
            </Link>
          </div>
          <label
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault(); setDragOver(false);
              const f = e.dataTransfer.files?.[0]; if (f) handleFile(f);
            }}
            className={`group relative flex cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed bg-card/30 px-8 py-20 transition ${dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/60"}`}
          >
            <input
              type="file"
              accept=".pdf,.pptx,application/pdf"
              className="absolute inset-0 cursor-pointer opacity-0"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              disabled={loading}
            />
            {loading ? (
              <>
                <Loader2 className="size-10 animate-spin text-primary" />
                <div className="font-mono text-sm text-muted-foreground">
                  {loadingLabel} · {Math.round(progress * 100)}%
                </div>
                <div className="h-1 w-64 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-primary transition-all" style={{ width: `${progress * 100}%` }} />
                </div>
              </>
            ) : (
              <>
                <div className="rounded-full bg-primary/10 p-4 text-primary">
                  <Upload className="size-8" />
                </div>
                <div className="text-center">
                <div className="font-mono text-base text-foreground">Drop a .pdf or .pptx here</div>
                  <div className="mt-1 text-xs text-muted-foreground">or click to browse · converted locally in your browser</div>
                  <div className="mt-1 text-xs text-amber-500">PDF recommended for best compatibility</div>
                </div>
              </>
            )}
          </label>

          {slides.length > 0 && !loading && (
            <div className="mt-6 flex items-center justify-between rounded-xl border border-border bg-card/40 px-4 py-3 text-sm">
              <div className="flex items-center gap-3">
                <FileText className="size-4 text-muted-foreground" />
                <span className="font-mono">{deckName}</span>
                <span className="text-muted-foreground">· {slides.length} slides</span>
              </div>
              <Button size="sm" onClick={() => navigate({ to: "/present" })}>
                <Hand className="mr-2 size-4" /> Resume presenting
              </Button>
            </div>
          )}
        </section>

        <section aria-labelledby="how-heading" className="mt-24">
          <h2 id="how-heading" className="sr-only">How it works</h2>
          <div className="grid gap-6 md:grid-cols-3">
          {[
            { t: "1 · Upload", d: "Drop a PDF. Pages render to crisp 1920px canvases right in your browser." },
            { t: "2 · Gesture", d: "MediaPipe Hands tracks your hand. Bind swipes, fists, peace signs to any action." },
            { t: "3 · Present", d: "Fullscreen view, laser pointer follows your index finger, blank-screen on cue." },
          ].map((c) => (
            <div key={c.t} className="rounded-xl border border-border bg-card/30 p-5">
              <div className="font-mono text-xs uppercase tracking-widest text-primary">{c.t}</div>
              <div className="mt-2 text-sm text-muted-foreground">{c.d}</div>
            </div>
          ))}
          </div>
        </section>
      </main>
    </div>
  );
}
