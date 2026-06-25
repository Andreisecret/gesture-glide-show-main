import { useEffect, useRef, useState } from "react";
import type { GestureName } from "@/lib/deckStore";

type Landmark = { x: number; y: number; z: number };

const WASM_BASE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

// Finger tip / pip pairs (extension test)
const FINGERS: Array<[number, number]> = [
  [8, 6],   // index
  [12, 10], // middle
  [16, 14], // ring
  [20, 18], // pinky
];

function fingerExtended(lm: Landmark[], tip: number, pip: number) {
  return lm[tip].y < lm[pip].y - 0.02;
}
function thumbExtended(lm: Landmark[]) {
  const dx = lm[4].x - lm[2].x;
  return Math.abs(dx) > 0.06;
}

export type GestureCallback = (g: GestureName) => void;
export type PointerCallback = (p: { x: number; y: number } | null) => void;

export function useHandGestures(opts: {
  enabled: boolean;
  cooldownMs: number;
  sensitivity: number;
  mirror: boolean;
  onGesture: GestureCallback;
  onPointer?: PointerCallback;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
}) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<GestureName | null>(null);
  const landmarkerRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastFireRef = useRef<Record<string, number>>({});
  const motionHistoryRef = useRef<Array<{ x: number; t: number }>>([]);
  const labelBufferRef = useRef<Array<GestureName | null>>([]);
  const smoothedLmRef = useRef<Landmark[] | null>(null);
  const lastEmittedRef = useRef<GestureName | null>(null);
  const sawNullSinceRef = useRef<boolean>(true);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  useEffect(() => {
    let cancelled = false;
    if (!opts.enabled) return;

    (async () => {
      try {
        const vision: any = await import("@mediapipe/tasks-vision");
        const filesetResolver = await vision.FilesetResolver.forVisionTasks(WASM_BASE);
        const landmarker = await vision.HandLandmarker.createFromOptions(filesetResolver, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
          runningMode: "VIDEO",
          numHands: 1,
          minHandDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
        if (cancelled) { landmarker.close(); return; }
        landmarkerRef.current = landmarker;

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: "user" },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        const video = optsRef.current.videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        setReady(true);
        loop();
      } catch (e: any) {
        setError(e?.message || "Failed to start camera");
      }
    })();

    function loop() {
      const lm = landmarkerRef.current;
      const video = optsRef.current.videoRef.current;
      if (!lm || !video || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }
      const ts = performance.now();
      const res = lm.detectForVideo(video, ts);
      const handRaw: Landmark[] | undefined = res.landmarks?.[0];

      if (handRaw) {
        // EMA smooth landmarks (alpha = 0.5)
        const prev = smoothedLmRef.current;
        const hand: Landmark[] = prev && prev.length === handRaw.length
          ? handRaw.map((p, i) => ({
              x: prev[i].x * 0.5 + p.x * 0.5,
              y: prev[i].y * 0.5 + p.y * 0.5,
              z: prev[i].z * 0.5 + p.z * 0.5,
            }))
          : handRaw;
        smoothedLmRef.current = hand;

        // Hand size for normalization (palm width)
        const handSize = Math.hypot(hand[5].x - hand[17].x, hand[5].y - hand[17].y) || 0.001;

        // Reject too-small hand (noisy)
        if (handSize < 0.04) {
          pushLabel(null);
          rafRef.current = requestAnimationFrame(loop);
          return;
        }

        const rawLabel = classify(hand, ts, motionHistoryRef.current, optsRef.current.sensitivity, handSize);
        const smoothed = pushLabel(rawLabel);
        setCurrent(smoothed);

        // Pointer
        if (smoothed === "pointing" || optsRef.current.onPointer) {
          let x = hand[8].x;
          const y = hand[8].y;
          if (optsRef.current.mirror) x = 1 - x;
          optsRef.current.onPointer?.({ x, y });
        }

        // Fire with cooldown + exit-and-return rule
        if (smoothed) {
          const last = lastFireRef.current[smoothed] || 0;
          const cooldownOk = ts - last > optsRef.current.cooldownMs;
          const exitOk = lastEmittedRef.current !== smoothed || sawNullSinceRef.current;
          if (cooldownOk && exitOk) {
            lastFireRef.current[smoothed] = ts;
            lastEmittedRef.current = smoothed;
            sawNullSinceRef.current = false;
            optsRef.current.onGesture(smoothed);
          }
        } else {
          sawNullSinceRef.current = true;
        }

        // Draw landmarks
        const canvas = optsRef.current.canvasRef?.current;
        if (canvas) {
          const ctx = canvas.getContext("2d")!;
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;
          ctx.save();
          if (optsRef.current.mirror) { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = "rgba(140,255,180,0.9)";
          ctx.strokeStyle = "rgba(140,255,180,0.6)";
          ctx.lineWidth = 2;
          for (const p of hand) {
            ctx.beginPath();
            ctx.arc(p.x * canvas.width, p.y * canvas.height, 4, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
      } else {
        smoothedLmRef.current = null;
        motionHistoryRef.current.length = 0;
        const smoothed = pushLabel(null);
        setCurrent(smoothed);
        sawNullSinceRef.current = true;
        optsRef.current.onPointer?.(null);
        const canvas = optsRef.current.canvasRef?.current;
        if (canvas) canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
      }
      rafRef.current = requestAnimationFrame(loop);
    }

    // Majority vote over last N frames
    function pushLabel(label: GestureName | null): GestureName | null {
      const buf = labelBufferRef.current;
      buf.push(label);
      while (buf.length > 6) buf.shift();
      const counts: Record<string, number> = {};
      for (const l of buf) {
        const k = l ?? "__null__";
        counts[k] = (counts[k] || 0) + 1;
      }
      let bestKey: string | null = null;
      let bestN = 0;
      for (const k in counts) {
        if (counts[k] > bestN) { bestN = counts[k]; bestKey = k; }
      }
      if (bestN >= 4 && bestKey && bestKey !== "__null__") return bestKey as GestureName;
      return null;
    }

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      landmarkerRef.current?.close?.();
      landmarkerRef.current = null;
      labelBufferRef.current = [];
      motionHistoryRef.current = [];
      smoothedLmRef.current = null;
      lastEmittedRef.current = null;
      sawNullSinceRef.current = true;
      setReady(false);
    };
  }, [opts.enabled]);

  return { ready, error, current };
}

function classify(
  lm: Landmark[],
  ts: number,
  history: Array<{ x: number; t: number }>,
  sensitivity: number,
  handSize: number,
): GestureName | null {
  // Track index MCP (lm[5]) — more stable than wrist for swipe
  history.push({ x: lm[5].x, t: ts });
  while (history.length > 12) history.shift();

  const extended = FINGERS.map(([t, p]) => fingerExtended(lm, t, p));
  const thumb = thumbExtended(lm);
  const extCount = extended.filter(Boolean).length + (thumb ? 1 : 0);
  const [idx, mid, ring, pinky] = extended;

  // Swipe: dx normalized by hand size, require monotonic motion
  if (history.length >= 4) {
    const recent = history[history.length - 1];
    const old = history.find((h) => recent.t - h.t > 180);
    if (old) {
      const dxNorm = (recent.x - old.x) / handSize;
      const thresh = 2.4 - sensitivity * 1.6; // ~0.8..2.4 hand-widths
      // Monotonic check: last 3 deltas same sign
      let monotonic = true;
      const tail = history.slice(-4);
      const sign = Math.sign(tail[tail.length - 1].x - tail[0].x);
      for (let i = 1; i < tail.length; i++) {
        if (Math.sign(tail[i].x - tail[i - 1].x) !== sign && tail[i].x !== tail[i - 1].x) {
          monotonic = false; break;
        }
      }
      if (Math.abs(dxNorm) > thresh && monotonic) {
        history.length = 0;
        return dxNorm > 0 ? "swipe_right" : "swipe_left";
      }
    }
  }

  // Static poses
  if (!idx && !mid && !ring && !pinky && !thumb) return "fist";
  if (extCount === 0) return "fist";
  if (extended.every(Boolean) && thumb) return "open_palm";
  if (idx && !mid && !ring && !pinky) return "pointing";
  if (idx && mid && !ring && !pinky) return "peace";
  if (thumb && !idx && !mid && !ring && !pinky) return "thumbs_up";
  const dThumbIndex = Math.hypot(lm[4].x - lm[8].x, lm[4].y - lm[8].y) / handSize;
  if (dThumbIndex < 0.6 && mid && ring && pinky) return "ok_sign";

  return null;
}
