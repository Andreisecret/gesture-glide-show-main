# GestureDeck

Present with your hands. No clicker, no remote — just your webcam.

Try it [here](https://gesture-glide-show-main-4.eduandreipetru.workers.dev/).

## What it does

Upload a PDF, step in front of your webcam, and navigate your slides with hand gestures. Swipe left to go forward, swipe right to go back, make a fist to pause, flash a peace sign to trigger a laser pointer. Everything is configurable.

## How it works

Everything runs in your browser. Nothing is uploaded to any server.

1. **Upload** — Drop a PDF. Each page is rasterized to a high-res canvas image right on your machine.
2. **Track** — MediaPipe Hands detects 21 hand landmarks from your webcam feed 30+ times per second. The gesture engine classifies poses: swipes, fists, pointing, thumbs up, peace sign.
3. **Present** — Fullscreen mode with smooth transitions. Your index finger works as a laser pointer on screen. Need to blank the display? Wave your palm.

## Features

- **Privacy-first** — Zero video data leaves your computer. All AI inference happens locally via MediaPipe.
- **No hardware** — No clicker, no dongle, no install. Just a browser and a webcam.
- **Custom gestures** — Rebind any gesture to any action (next, previous, blank, pointer, home) in the settings panel.
- **PDF & PPTX** — Rasterizes PDFs natively. PPTX support via conversion to images.
- **Google Slides** — Import decks directly from your Google Drive.
- **Touchless** — Great for stage presence, accessibility, or just feeling like you're in a sci-fi movie.

## Tech stack

TanStack Start (React 19), Vite, TypeScript, Tailwind CSS, MediaPipe Hands, Framer Motion, shadcn/ui, PDF.js, deployed on Cloudflare Workers.
