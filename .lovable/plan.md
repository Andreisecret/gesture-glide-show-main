
Caveman plan. Current detector in `src/hooks/useHandGestures.ts`. Single-frame classify, naive thresholds, wrist-x swipe, no smoothing, no confirmation. 3 paths to improve. Pick one.

## Option A — Temporal smoothing + confirmation (cheap, big win)

Idea: keep classifier, fix flicker + false fires.

- Ring buffer last N=6 frames of raw label.
- Emit gesture only if same label ≥ K=4 of last 6 (majority vote).
- Per-gesture cooldown already exists; add global "exit-and-return" rule (must see `null` between repeats).
- Landmark EMA smoothing (α≈0.5) before classify → less jitter on `pointing`/`ok_sign`.
- Swipe: track index-MCP (lm[5]) not wrist, normalize dx by hand size (`|lm[5]-lm[17]|`), require monotonic motion (3 consecutive same-sign deltas).
- Reject when hand bbox < min size OR z too far (hand too small/far → noisy).

Effort: small. No new deps. Best ROI.

## Option B — Geometry-aware classifier (medium)

Fix wrong-pose bugs. Current uses only y-compare → fails when hand rotated.

- Compute palm normal + hand rotation from lm[0],[5],[17]. Rotate landmarks to canonical frame before extension test.
- Finger extended = angle(MCP→PIP→TIP) > 160° (not y compare). Robust to upside-down / sideways.
- Thumb extended via angle at lm[3], not dx.
- OK sign: thumb-index distance normalized by hand size, not absolute 0.06.
- Add `numHands:2` optional → ignore non-dominant; pick hand with largest bbox.
- Tune `minHandDetectionConfidence` to 0.6, `minTrackingConfidence` to 0.6.

Includes everything in A. Effort: medium. Still no new deps.

## Option C — ML gesture recognizer (heavy, max accuracy)

Replace hand-rolled classify with MediaPipe `GestureRecognizer` task.

- Swap `HandLandmarker` → `GestureRecognizer` (same `@mediapipe/tasks-vision`).
- Built-in labels: `Closed_Fist, Open_Palm, Pointing_Up, Thumb_Up, Thumb_Down, Victory, ILoveYou`.
- Map MediaPipe labels → app `GestureName`. Keep custom swipe via landmark motion (recognizer still returns landmarks).
- Get confidence score per gesture → threshold + smoothing (option A still applies on top).
- Optional: train custom gestures later via MediaPipe Model Maker for `ok_sign` etc.

Effort: bigger. Best accuracy, official model, less heuristic code. Some custom gestures (`ok_sign`, `peace` mapped to Victory) need remap; `pointing` = Pointing_Up only when index up.

## Recommendation

Start A. If still bad, layer B. Go C only if A+B not enough or you want official labels + confidence.

## Tech details

Files touched:
- `src/hooks/useHandGestures.ts` — main edit site for all options.
- `src/lib/deckStore.ts` — no change (GestureName stable).
- A: add buffers in refs, change `classify` signature to return raw label, smoothing in hook loop.
- B: helper `canonicalizeHand(lm)` + `angleAt(a,b,c)`; rewrite finger tests.
- C: swap import to `GestureRecognizer.createFromOptions`, new model URL `gesture_recognizer.task`, parse `result.gestures[0][0].categoryName` + `.score`.

No new npm deps for any option.
