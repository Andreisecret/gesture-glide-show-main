import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Hand,
  Maximize,
  Minimize,
  Camera,
  CameraOff,
  Upload,
  Pause,
  Play,
  Loader2,
} from "lucide-react";
import { useDeck, runAction, type GestureName } from "@/lib/deckStore";
import { useHandGestures } from "@/hooks/useHandGestures";
import { Button } from "@/components/ui/button";
import type { Instance as NutrientInstance } from "@nutrient-sdk/viewer";

export const Route = createFileRoute("/present")({
  head: () => ({
    meta: [
      { title: "Presenter — GestureDeck" },
      {
        name: "description",
        content:
          "Run your slide deck full-screen and drive it with webcam hand gestures — swipe, fist, point, all locally in your browser.",
      },
      { property: "og:title", content: "Presenter — GestureDeck" },
      {
        property: "og:description",
        content: "Run your slide deck full-screen and drive it with webcam hand gestures.",
      },
      { property: "og:url", content: "https://gesture-glide-show.lovable.app/present" },
    ],
    links: [{ rel: "canonical", href: "https://gesture-glide-show.lovable.app/present" }],
  }),
  component: PresentPage,
});

function PresentPage() {
  const navigate = useNavigate();
  const slides = useDeck((s) => s.slides);
  const deckName = useDeck((s) => s.deckName);
  const current = useDeck((s) => s.current);
  const blank = useDeck((s) => s.blank);
  const pointer = useDeck((s) => s.pointer);
  const settings = useDeck((s) => s.settings);
  const documentUrl = useDeck((s) => s.documentUrl);
  const totalPages = useDeck((s) => s.totalPages);
  const next = useDeck((s) => s.next);
  const prev = useDeck((s) => s.prev);
  const toggleBlank = useDeck((s) => s.toggleBlank);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [camOn, setCamOn] = useState(true);
  const [paused, setPaused] = useState(false);
  const [showWebcam, setShowWebcam] = useState(settings.showWebcam);
  const [isFs, setIsFs] = useState(false);
  const [pointerPos, setPointerPos] = useState<{ x: number; y: number } | null>(null);
  const [chromeVisible, setChromeVisible] = useState(true);
  const hideTimer = useRef<number | null>(null);

  const onGesture = useCallback(
    (g: GestureName) => {
      if (paused) return;
      const action = settings.bindings[g];
      runAction(action);
    },
    [settings.bindings, paused],
  );

  const {
    ready,
    error,
    current: gestureNow,
  } = useHandGestures({
    enabled: camOn && slides.length > 0,
    cooldownMs: settings.cooldownMs,
    sensitivity: settings.sensitivity,
    mirror: settings.mirror,
    onGesture,
    onPointer: (p) => setPointerPos(p),
    videoRef,
    canvasRef: overlayRef,
  });

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        prev();
      } else if (e.key === "b" || e.key === "B") toggleBlank();
      else if (e.key === "f" || e.key === "F") toggleFs();
      else if (e.key === "p" || e.key === "P") setPaused((v) => !v);
      else if (e.key === "Escape" && document.fullscreenElement) document.exitFullscreen();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, toggleBlank]);

  // FS state
  useEffect(() => {
    const onFs = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // Nutrient Web SDK — mount/unmount
  const nutrientRef = useRef<HTMLDivElement>(null);
  const nutrientInstance = useRef<NutrientInstance | null>(null);
  const [nutrientReady, setNutrientReady] = useState(false);

  useEffect(() => {
    const container = nutrientRef.current;
    if (!documentUrl || !container) return;

    let instance: NutrientInstance | null = null;
    let mounted = true;

    (async () => {
      const NV = (await import("@nutrient-sdk/viewer")).default;
      NV.unload(container);

      const initVS = new NV.ViewState({
        currentPageIndex: useDeck.getState().current,
        layoutMode: NV.LayoutMode.SINGLE,
        scrollMode: NV.ScrollMode.DISABLED,
        showToolbar: false,
        sidebarMode: null,
      });

      instance = (await NV.load({
        container,
        document: documentUrl,
        useCDN: true,
        licenseKey: "",
        initialViewState: initVS,
        toolbarItems: [],
      })) as NutrientInstance;

      if (!mounted) {
        NV.unload(container);
        return;
      }

      nutrientInstance.current = instance;
      setNutrientReady(true);
    })();

    return () => {
      mounted = false;
      if (container) {
        import("@nutrient-sdk/viewer").then((m) => m.default.unload(container));
      }
    };
  }, [documentUrl]);

  // Sync store.current → Nutrient page
  useEffect(() => {
    const inst = nutrientInstance.current;
    if (!inst) return;
    if (inst.viewState.currentPageIndex !== current) {
      inst.setViewState(inst.viewState.set("currentPageIndex", current));
    }
  }, [current]);

  // Auto-hide chrome
  useEffect(() => {
    const onMove = () => {
      setChromeVisible(true);
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
      hideTimer.current = window.setTimeout(() => setChromeVisible(false), 2200);
    };
    window.addEventListener("mousemove", onMove);
    onMove();
    return () => {
      window.removeEventListener("mousemove", onMove);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  function toggleFs() {
    if (!containerRef.current) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else containerRef.current.requestFullscreen?.();
  }

  if (!documentUrl && slides.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <Hand className="size-12 text-muted-foreground" />
        <h1 className="font-mono text-2xl">No deck loaded</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Upload a PDF to start presenting with hand gestures.
        </p>
        <Button onClick={() => navigate({ to: "/" })}>
          <Upload className="mr-2 size-4" /> Upload a deck
        </Button>
      </div>
    );
  }

  const slide = slides[current];

  return (
    <div
      ref={containerRef}
      className="relative h-screen w-screen overflow-hidden bg-black"
      style={{ cursor: chromeVisible ? "default" : "none" }}
    >
      <h1 className="sr-only">{deckName ? `Presenting ${deckName}` : "Presenter"}</h1>

      {/* Slide — Nutrient Web SDK viewer */}
      {documentUrl && (
        <div className="absolute inset-0" style={{ visibility: blank ? "hidden" : "visible" }}>
          <div ref={nutrientRef} className="h-full w-full" />
          {!nutrientReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-black">
              <Loader2 className="size-10 animate-spin text-white/50" />
            </div>
          )}
        </div>
      )}

      {/* Slide — Image fallback (Google Slides) */}
      {!documentUrl && !blank && slides.length > 0 && (
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <img
            key={slide.url}
            src={slide.url}
            alt={`Slide ${current + 1}`}
            className="max-h-full max-w-full rounded-md shadow-2xl"
            draggable={false}
          />
        </div>
      )}

      {/* Laser pointer */}
      <AnimatePresence>
        {pointer && pointerPos && !blank && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute size-5 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              left: `${pointerPos.x * 100}%`,
              top: `${pointerPos.y * 100}%`,
              background:
                "radial-gradient(circle, oklch(0.7 0.3 25) 0%, oklch(0.6 0.3 25 / 0.6) 50%, transparent 70%)",
              boxShadow: "0 0 20px oklch(0.7 0.3 25 / 0.8)",
            }}
          />
        )}
      </AnimatePresence>

      {/* Top chrome */}
      <AnimatePresence>
        {chromeVisible && (
          <motion.div
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            className="absolute left-0 right-0 top-0 flex items-center justify-between px-4 py-3"
          >
            <Link
              to="/"
              className="rounded-md bg-hud px-3 py-1.5 font-mono text-xs text-hud-foreground backdrop-blur"
            >
              ← Exit
            </Link>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCamOn((v) => !v)}
                aria-label={camOn ? "Turn camera off" : "Turn camera on"}
                className="rounded-md bg-hud px-2 py-1.5 text-hud-foreground backdrop-blur"
                title="Toggle camera"
              >
                {camOn ? <Camera className="size-4" /> : <CameraOff className="size-4" />}
              </button>
              <button
                onClick={toggleFs}
                aria-label={isFs ? "Exit fullscreen" : "Enter fullscreen"}
                className="rounded-md bg-hud px-2 py-1.5 text-hud-foreground backdrop-blur"
                title="Fullscreen"
              >
                {isFs ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom chrome */}
      <AnimatePresence>
        {chromeVisible && (
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-3 p-4"
          >
            <button
              onClick={prev}
              aria-label="Previous slide"
              className="rounded-md bg-hud px-3 py-2 text-hud-foreground backdrop-blur"
            >
              <ChevronLeft className="size-4" />
            </button>
            <div
              className="rounded-md bg-hud px-4 py-2 font-mono text-sm text-hud-foreground backdrop-blur"
              aria-label={`Slide ${current + 1} of ${documentUrl ? totalPages : slides.length}`}
            >
              {current + 1} / {documentUrl ? totalPages : slides.length}
            </div>
            <button
              onClick={next}
              aria-label="Next slide"
              className="rounded-md bg-hud px-3 py-2 text-hud-foreground backdrop-blur"
            >
              <ChevronRight className="size-4" />
            </button>
            <button
              onClick={() => setPaused((v) => !v)}
              aria-label={paused ? "Resume gesture control" : "Pause gesture control"}
              className={`rounded-md px-2 py-2 backdrop-blur ${paused ? "bg-primary text-primary-foreground" : "bg-hud text-hud-foreground"}`}
              title={paused ? "Resume gestures (P)" : "Pause gestures (P)"}
            >
              {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
            </button>
            <div className="ml-1 flex items-center gap-2 rounded-md bg-hud px-3 py-2 font-mono text-xs text-hud-foreground backdrop-blur">
              <span
                className={`size-2 rounded-full ${paused ? "bg-yellow-500" : ready ? "bg-primary" : "bg-muted-foreground"}`}
              />
              {error
                ? "camera error"
                : paused
                  ? "paused"
                  : ready
                    ? gestureNow
                      ? gestureNow.replace("_", " ")
                      : "watching…"
                    : "starting…"}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Webcam thumbnail */}
      {camOn && showWebcam && (
        <div className="absolute bottom-20 right-4 w-[220px] overflow-hidden rounded-lg border border-border bg-black/80 shadow-2xl">
          <div className="relative">
            <video
              ref={videoRef}
              playsInline
              muted
              className="block aspect-[4/3] w-full object-cover"
              style={{ transform: settings.mirror ? "scaleX(-1)" : undefined }}
            />
            <canvas
              ref={overlayRef}
              className="pointer-events-none absolute inset-0 h-full w-full"
            />
            <div className="absolute left-2 top-2 rounded bg-black/60 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-white/80">
              {gestureNow ?? "—"}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute left-1/2 top-20 -translate-x-1/2 rounded-md bg-destructive/90 px-4 py-2 font-mono text-sm text-destructive-foreground">
          {error}
        </div>
      )}
    </div>
  );
}
