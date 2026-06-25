import { create } from "zustand";

export type Slide = { index: number; url: string; width: number; height: number; html?: string };

export type GestureName =
  | "swipe_left"
  | "swipe_right"
  | "open_palm"
  | "fist"
  | "pointing"
  | "thumbs_up"
  | "peace"
  | "ok_sign";

export type ActionName =
  | "next"
  | "prev"
  | "first"
  | "last"
  | "toggle_blank"
  | "toggle_pointer"
  | "exit_present"
  | "none";

export const ALL_GESTURES: GestureName[] = [
  "swipe_right",
  "swipe_left",
  "open_palm",
  "fist",
  "pointing",
  "thumbs_up",
  "peace",
  "ok_sign",
];

export const ALL_ACTIONS: ActionName[] = [
  "next",
  "prev",
  "first",
  "last",
  "toggle_blank",
  "toggle_pointer",
  "exit_present",
  "none",
];

export const DEFAULT_BINDINGS: Record<GestureName, ActionName> = {
  swipe_right: "none",
  swipe_left: "none",
  open_palm: "none",
  fist: "none",
  pointing: "none",
  thumbs_up: "next",
  peace: "prev",
  ok_sign: "none",
};

type Settings = {
  bindings: Record<GestureName, ActionName>;
  cooldownMs: number;
  sensitivity: number; // 0.3 - 1
  mirror: boolean;
  showWebcam: boolean;
};

const SETTINGS_KEY = "gesturedeck.settings.v1";

function loadSettings(): Settings {
  if (typeof window === "undefined")
    return {
      bindings: DEFAULT_BINDINGS,
      cooldownMs: 1500,
      sensitivity: 0.6,
      mirror: true,
      showWebcam: true,
    };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) throw 0;
    const parsed = JSON.parse(raw);
    return {
      bindings: { ...DEFAULT_BINDINGS, ...(parsed.bindings ?? {}) },
      cooldownMs: parsed.cooldownMs ?? 1500,
      sensitivity: parsed.sensitivity ?? 0.6,
      mirror: parsed.mirror ?? true,
      showWebcam: parsed.showWebcam ?? true,
    };
  } catch {
    return {
      bindings: DEFAULT_BINDINGS,
      cooldownMs: 1500,
      sensitivity: 0.6,
      mirror: true,
      showWebcam: true,
    };
  }
}

type State = {
  slides: Slide[];
  deckName: string;
  current: number;
  blank: boolean;
  pointer: boolean;
  settings: Settings;
  documentUrl: string | null;
  totalPages: number;
  setDeck: (name: string, slides: Slide[], docUrl?: string | null, totalPages?: number) => void;
  clearDeck: () => void;
  go: (i: number) => void;
  next: () => void;
  prev: () => void;
  first: () => void;
  last: () => void;
  toggleBlank: () => void;
  togglePointer: () => void;
  updateSettings: (patch: Partial<Settings>) => void;
  setBinding: (g: GestureName, a: ActionName) => void;
  resetBindings: () => void;
};

export const useDeck = create<State>((set, get) => ({
  slides: [],
  deckName: "",
  current: 0,
  blank: false,
  pointer: false,
  settings: loadSettings(),
  documentUrl: null,
  totalPages: 0,
  setDeck: (name, slides, docUrl = null, totalPages = 0) =>
    set({
      deckName: name,
      slides,
      current: 0,
      blank: false,
      pointer: false,
      documentUrl: docUrl,
      totalPages,
    }),
  clearDeck: () => {
    get().slides.forEach((s) => {
      if (s.url) URL.revokeObjectURL(s.url);
    });
    if (get().documentUrl) URL.revokeObjectURL(get().documentUrl);
    set({ slides: [], deckName: "", current: 0, documentUrl: null, totalPages: 0 });
  },
  go: (i) => {
    const total = get().documentUrl ? get().totalPages : get().slides.length;
    if (total === 0) return;
    const clamped = Math.max(0, Math.min(total - 1, i));
    set({ current: clamped });
  },
  next: () => get().go(get().current + 1),
  prev: () => get().go(get().current - 1),
  first: () => get().go(0),
  last: () => get().go(get().slides.length - 1),
  toggleBlank: () => set({ blank: !get().blank }),
  togglePointer: () => set({ pointer: !get().pointer }),
  updateSettings: (patch) => {
    const settings = { ...get().settings, ...patch };
    set({ settings });
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {}
  },
  setBinding: (g, a) => get().updateSettings({ bindings: { ...get().settings.bindings, [g]: a } }),
  resetBindings: () => get().updateSettings({ bindings: DEFAULT_BINDINGS }),
}));

export function runAction(action: ActionName) {
  const s = useDeck.getState();
  switch (action) {
    case "next":
      s.next();
      break;
    case "prev":
      s.prev();
      break;
    case "first":
      s.first();
      break;
    case "last":
      s.last();
      break;
    case "toggle_blank":
      s.toggleBlank();
      break;
    case "toggle_pointer":
      s.togglePointer();
      break;
    case "exit_present":
      if (typeof document !== "undefined" && document.fullscreenElement)
        document.exitFullscreen().catch(() => {});
      break;
    case "none":
      break;
  }
}
