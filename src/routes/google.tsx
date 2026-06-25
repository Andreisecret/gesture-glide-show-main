import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDeck } from "@/lib/deckStore";
import { ensureGoogleToken, getGoogleClientId } from "@/lib/googleAuth";
import { extractPresentationId, loadGoogleSlides } from "@/lib/googleSlides";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/google")({
  head: () => ({
    meta: [
      { title: "Open from Google Slides — GestureDeck" },
      {
        name: "description",
        content:
          "Paste a Google Slides link to open it in GestureDeck. Slide thumbnails are fetched directly from Google to your browser.",
      },
      { property: "og:title", content: "Open from Google Slides — GestureDeck" },
      {
        property: "og:description",
        content: "Open your Google Slides decks in GestureDeck and present with hand gestures.",
      },
      { property: "og:url", content: "https://gesture-glide-show.lovable.app/google" },
    ],
    links: [{ rel: "canonical", href: "https://gesture-glide-show.lovable.app/google" }],
  }),
  component: GooglePage,
});

function GooglePage() {
  const navigate = useNavigate();
  const setDeck = useDeck((s) => s.setDeck);
  const [clientId] = useState(() => getGoogleClientId());
  const [urlInput, setUrlInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(1);

  const openDeck = useCallback(
    async (id: string) => {
      try {
        setLoading(true);
        setProgress(0);
        await ensureGoogleToken();
        const { name, slides } = await loadGoogleSlides(id, setProgress);
        setDeck(name || "Google Slides deck", slides);
        toast.success(`Loaded ${slides.length} slides`);
        navigate({ to: "/present" });
      } catch (e: any) {
        toast.error("Failed to open deck", { description: e?.message ?? String(e) });
      } finally {
        setLoading(false);
      }
    },
    [navigate, setDeck],
  );

  const onPasteOpen = () => {
    const id = extractPresentationId(urlInput);
    if (!id) {
      toast.error("That doesn't look like a Google Slides URL or ID.");
      return;
    }
    void openDeck(id);
  };

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-xl px-6 py-16">
        <div className="text-center">
          <h1 className="font-mono text-3xl font-semibold tracking-tight">
            Open from <span className="text-primary">Google Slides</span>
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            Paste a link to any Google Slides deck you own. You'll be asked to sign in once so
            GestureDeck can fetch slide thumbnails to your browser.
          </p>
        </div>

        {!clientId && (
          <div className="mt-8 rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-5 text-sm">
            <div className="font-mono text-foreground">One-time setup needed</div>
            <p className="mt-1 text-muted-foreground">
              Add your Google OAuth Web Client ID on the{" "}
              <a href="/settings" className="text-primary underline-offset-2 hover:underline">
                Settings page
              </a>
              . You'll need a Google Cloud project with the Slides API enabled and
              <span className="font-mono">
                {" "}
                {typeof window !== "undefined" ? window.location.origin : ""}{" "}
              </span>
              listed as an authorized JavaScript origin.
            </p>
          </div>
        )}

        <section className="mt-8 rounded-xl border border-border bg-card/30 p-5">
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Paste a presentation URL
          </h2>
          <div className="mt-3 flex gap-2">
            <Input
              placeholder="https://docs.google.com/presentation/d/…"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onPasteOpen();
              }}
              disabled={loading}
            />
            <Button onClick={onPasteOpen} disabled={!urlInput || loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : "Open"}
            </Button>
          </div>
          {loading && (
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Fetching slides… {Math.round(progress * 100)}%
            </div>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Works for any deck you have access to. You'll be prompted to sign in if needed.
          </p>
        </section>
      </main>
    </div>
  );
}
