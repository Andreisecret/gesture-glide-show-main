import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/Header";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Help — GestureDeck gesture cheat sheet" },
      { name: "description", content: "Gesture cheat sheet, keyboard shortcuts, and presenter tips for navigating slides with hand gestures in GestureDeck." },
      { property: "og:title", content: "Help — GestureDeck gesture cheat sheet" },
      { property: "og:description", content: "Gesture cheat sheet, keyboard shortcuts, and presenter tips for GestureDeck." },
      { property: "og:url", content: "https://gesture-glide-show.lovable.app/help" },
    ],
    links: [
      { rel: "canonical", href: "https://gesture-glide-show.lovable.app/help" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: "How do I move to the next slide?",
              acceptedAnswer: { "@type": "Answer", text: "Swipe your hand quickly to the right in front of the webcam, or press the right arrow key." },
            },
            {
              "@type": "Question",
              name: "How do I go back to the previous slide?",
              acceptedAnswer: { "@type": "Answer", text: "Swipe your hand quickly to the left, or press the left arrow key." },
            },
            {
              "@type": "Question",
              name: "How do I blank the screen?",
              acceptedAnswer: { "@type": "Answer", text: "Make a closed fist gesture, or press B on the keyboard." },
            },
            {
              "@type": "Question",
              name: "How do I use the laser pointer?",
              acceptedAnswer: { "@type": "Answer", text: "Extend only your index finger. The pointer follows your fingertip on screen." },
            },
            {
              "@type": "Question",
              name: "Does my webcam video leave my device?",
              acceptedAnswer: { "@type": "Answer", text: "No. All gesture detection runs locally in your browser via MediaPipe — nothing is uploaded." },
            },
          ],
        }),
      },
    ],
  }),
  component: HelpPage,
});

const ROWS = [
  { g: "Swipe right →", d: "Move hand quickly to the right", a: "Next slide" },
  { g: "← Swipe left", d: "Move hand quickly to the left", a: "Previous slide" },
  { g: "Closed fist ✊", d: "Curl all fingers into a fist", a: "Blank screen on/off" },
  { g: "Index pointing ☝", d: "Extend only your index finger", a: "Laser pointer on/off" },
  { g: "Thumbs up 👍", d: "Thumb extended, all other fingers curled", a: "Jump to first slide" },
  { g: "OK sign 👌", d: "Thumb tip touches index tip", a: "Jump to last slide" },
  { g: "Open palm ✋", d: "All fingers extended, no motion", a: "(unbound by default)" },
  { g: "Peace ✌", d: "Index + middle extended", a: "(unbound by default)" },
];

function HelpPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="font-mono text-3xl font-semibold tracking-tight">Gesture cheat sheet</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Rebind anything on the <a href="/settings" className="text-primary underline-offset-2 hover:underline">Settings</a> page.
          Keyboard shortcuts work everywhere: <span className="font-mono">←/→</span> navigate, <span className="font-mono">B</span> blank, <span className="font-mono">F</span> fullscreen, <span className="font-mono">Esc</span> exit.
        </p>

        <div className="mt-8 overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-card/50 text-left font-mono text-xs uppercase tracking-widest text-muted-foreground">
              <tr><th className="px-4 py-3">Gesture</th><th className="px-4 py-3">How</th><th className="px-4 py-3">Default action</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {ROWS.map((r) => (
                <tr key={r.g} className="bg-card/20">
                  <td className="px-4 py-3 font-mono">{r.g}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.d}</td>
                  <td className="px-4 py-3">{r.a}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <section className="mt-10 space-y-3 text-sm text-muted-foreground">
          <h2 className="font-mono text-base text-foreground">File formats</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li><span className="font-mono">PDF</span> — drop it on the home page. Rendered fully in-browser.</li>
            <li>
              <span className="font-mono">Google Slides</span> — use{" "}
              <a href="/google" className="text-primary underline-offset-2 hover:underline">Open from Google Slides</a>{" "}
              to sign in with Google and pick a deck.
            </li>
            <li>
              <span className="font-mono">PPTX</span> — browsers can't render PowerPoint reliably.
              Convert to PDF first (PowerPoint Online → Export, CloudConvert), or upload to Google Slides and open it from there.
            </li>
          </ul>
        </section>

        <section className="mt-10 space-y-3 text-sm text-muted-foreground">
          <h2 className="font-mono text-base text-foreground">Tips</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Good lighting on your hand makes detection dramatically better.</li>
            <li>Hold static poses (fist, point, thumb) for ~300ms to register reliably.</li>
            <li>Swipe from elbow, not wrist — bigger motion crosses the threshold faster.</li>
            <li>Increase cooldown if a single gesture triggers twice; lower it for snappier control.</li>
            <li>Everything runs locally in your browser — no video leaves your device.</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
