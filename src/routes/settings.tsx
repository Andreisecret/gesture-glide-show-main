import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useDeck,
  ALL_GESTURES,
  ALL_ACTIONS,
  type GestureName,
  type ActionName,
} from "@/lib/deckStore";
import { getGoogleClientId, setGoogleClientId, clearGoogleToken } from "@/lib/googleAuth";
import { RotateCcw, Lock } from "lucide-react";
import { toast } from "sonner";
import { SettingsUnlockDialog, type UnlockStep } from "@/components/SettingsUnlockDialog";
import { isUnlocked, unlock } from "@/lib/settingsUnlock";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — GestureDeck bindings & sensitivity" },
      {
        name: "description",
        content:
          "Rebind gestures to slide actions, tune detection cooldown and swipe sensitivity, and toggle webcam mirroring in GestureDeck.",
      },
      { property: "og:title", content: "Settings — GestureDeck bindings & sensitivity" },
      {
        property: "og:description",
        content: "Rebind gestures to actions and tune detection sensitivity in GestureDeck.",
      },
      { property: "og:url", content: "https://gesture-glide-show.lovable.app/settings" },
    ],
    links: [{ rel: "canonical", href: "https://gesture-glide-show.lovable.app/settings" }],
  }),
  component: SettingsPage,
});

const GESTURE_LABEL: Record<GestureName, string> = {
  swipe_right: "Swipe right →",
  swipe_left: "← Swipe left",
  open_palm: "Open palm ✋",
  fist: "Closed fist ✊",
  pointing: "Index pointing ☝",
  thumbs_up: "Thumbs up 👍",
  peace: "Peace ✌",
  ok_sign: "OK sign 👌",
};

const ACTION_LABEL: Record<ActionName, string> = {
  next: "Next slide",
  prev: "Previous slide",
  first: "First slide",
  last: "Last slide",
  toggle_blank: "Toggle blank screen",
  toggle_pointer: "Toggle laser pointer",
  exit_present: "Exit fullscreen",
  none: "— Do nothing —",
};

function SettingsPage() {
  const settings = useDeck((s) => s.settings);
  const setBinding = useDeck((s) => s.setBinding);
  const updateSettings = useDeck((s) => s.updateSettings);
  const resetBindings = useDeck((s) => s.resetBindings);
  const [googleId, setGoogleId] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [step, setStep] = useState<UnlockStep | null>(null);
  const [origin, setOrigin] = useState("this site's origin");
  useEffect(() => {
    setGoogleId(getGoogleClientId());
    setUnlocked(isUnlocked());
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  const handleUnlock = () => {
    unlock();
    setUnlocked(true);
    toast.success("Settings unlocked");
  };

  const saveGoogleId = () => {
    setGoogleClientId(googleId);
    clearGoogleToken();
    toast.success(googleId ? "Google Client ID saved" : "Google Client ID cleared");
  };

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-3xl px-6 py-12">
        <div className="mb-10 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-mono text-3xl font-semibold tracking-tight">Settings</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Map any detected gesture to any action. Changes save automatically.
            </p>
          </div>
          {!unlocked && (
            <Button size="sm" onClick={() => setStep("locked")} className="gap-2 shrink-0">
              <Lock className="size-3.5" /> Unlock
            </Button>
          )}
        </div>

        <div
          className={`relative ${unlocked ? "" : "opacity-60"}`}
          onPointerDownCapture={(e) => {
            if (unlocked) return;
            e.preventDefault();
            e.stopPropagation();
            setStep("locked");
          }}
          onKeyDownCapture={(e) => {
            if (unlocked) return;
            if (e.key === "Tab") return;
            e.preventDefault();
            e.stopPropagation();
            setStep("locked");
          }}
          aria-disabled={!unlocked}
        >
          <section className="rounded-xl border border-border bg-card/30">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <h2 className="font-mono text-sm uppercase tracking-widest text-muted-foreground">
                Bindings
              </h2>
              <Button variant="ghost" size="sm" onClick={resetBindings}>
                <RotateCcw className="mr-2 size-3.5" /> Reset
              </Button>
            </div>
            <div className="divide-y divide-border">
              {ALL_GESTURES.map((g) => (
                <div key={g} className="flex items-center justify-between px-5 py-3">
                  <div id={`gesture-${g}-label`} className="font-mono text-sm">
                    {GESTURE_LABEL[g]}
                  </div>
                  <Select
                    value={settings.bindings[g]}
                    onValueChange={(v) => setBinding(g, v as ActionName)}
                  >
                    <SelectTrigger aria-labelledby={`gesture-${g}-label`} className="w-[240px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ALL_ACTIONS.map((a) => (
                        <SelectItem key={a} value={a}>
                          {ACTION_LABEL[a]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-8 space-y-6 rounded-xl border border-border bg-card/30 p-5">
            <h2 className="font-mono text-sm uppercase tracking-widest text-muted-foreground">
              Detection
            </h2>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <label htmlFor="cooldown-slider" id="cooldown-label" className="font-mono">
                  Cooldown
                </label>
                <span className="font-mono text-muted-foreground">{settings.cooldownMs} ms</span>
              </div>
              <Slider
                id="cooldown-slider"
                aria-labelledby="cooldown-label"
                value={[settings.cooldownMs]}
                min={200}
                max={2000}
                step={50}
                onValueChange={([v]) => updateSettings({ cooldownMs: v })}
              />
              <p className="text-xs text-muted-foreground">
                Minimum time between repeated triggers of the same gesture.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <label htmlFor="sensitivity-slider" id="sensitivity-label" className="font-mono">
                  Swipe sensitivity
                </label>
                <span className="font-mono text-muted-foreground">
                  {Math.round(settings.sensitivity * 100)}%
                </span>
              </div>
              <Slider
                id="sensitivity-slider"
                aria-labelledby="sensitivity-label"
                value={[settings.sensitivity * 100]}
                min={20}
                max={100}
                step={5}
                onValueChange={([v]) => updateSettings({ sensitivity: v / 100 })}
              />
              <p className="text-xs text-muted-foreground">
                Higher = smaller motions count as a swipe.
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div id="mirror-label" className="font-mono text-sm">
                  Mirror webcam
                </div>
                <p className="text-xs text-muted-foreground">
                  Show camera as a mirror (natural for self-view).
                </p>
              </div>
              <Switch
                aria-labelledby="mirror-label"
                checked={settings.mirror}
                onCheckedChange={(v) => updateSettings({ mirror: v })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div id="webcam-overlay-label" className="font-mono text-sm">
                  Show webcam overlay
                </div>
                <p className="text-xs text-muted-foreground">
                  Floating thumbnail with hand landmarks while presenting.
                </p>
              </div>
              <Switch
                aria-labelledby="webcam-overlay-label"
                checked={settings.showWebcam}
                onCheckedChange={(v) => updateSettings({ showWebcam: v })}
              />
            </div>
          </section>

          <section className="mt-8 space-y-4 rounded-xl border border-border bg-card/30 p-5">
            <div>
              <h2 className="font-mono text-sm uppercase tracking-widest text-muted-foreground">
                Google Slides
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                To open Google Slides decks by link, paste your own Google OAuth Web Client ID (it's
                a public identifier, not a secret). Create one in{" "}
                <a
                  className="text-primary underline-offset-2 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                  href="https://console.cloud.google.com/apis/credentials"
                >
                  Google Cloud Console → Credentials
                </a>
                , enable the <span className="font-mono">Slides API</span>, and add{" "}
                <span className="font-mono">{origin}</span> as an Authorized JavaScript origin.
              </p>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="123456-abc….apps.googleusercontent.com"
                value={googleId}
                onChange={(e) => setGoogleId(e.target.value)}
              />
              <Button onClick={saveGoogleId}>Save</Button>
            </div>
          </section>
        </div>
      </main>
      <SettingsUnlockDialog step={step} onStepChange={setStep} onUnlock={handleUnlock} />
    </div>
  );
}
