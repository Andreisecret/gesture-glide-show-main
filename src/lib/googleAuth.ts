// Client-side Google OAuth via Google Identity Services (token client).
// Users supply their own Google Cloud OAuth Web Client ID (stored in localStorage).
// The OAuth client ID is a public identifier, not a secret.

const CLIENT_ID_KEY = "gesturedeck.googleClientId.v1";
const TOKEN_KEY = "gesturedeck.googleToken.v1";
const SCOPES = [
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/presentations.readonly",
].join(" ");

declare global {
  interface Window {
    google?: any;
  }
}

type StoredToken = { token: string; expiresAt: number };

export function getGoogleClientId(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(CLIENT_ID_KEY) ?? "";
}

export function setGoogleClientId(id: string) {
  if (typeof window === "undefined") return;
  if (id) localStorage.setItem(CLIENT_ID_KEY, id.trim());
  else localStorage.removeItem(CLIENT_ID_KEY);
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredToken;
    if (parsed.expiresAt - 60_000 < Date.now()) return null;
    return parsed.token;
  } catch {
    return null;
  }
}

function setStoredToken(token: string, expiresInSec: number) {
  const payload: StoredToken = {
    token,
    expiresAt: Date.now() + expiresInSec * 1000,
  };
  localStorage.setItem(TOKEN_KEY, JSON.stringify(payload));
}

export function clearGoogleToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
}

let gsiLoading: Promise<void> | null = null;

function loadGsi(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("SSR"));
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (gsiLoading) return gsiLoading;
  gsiLoading = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://accounts.google.com/gsi/client"]',
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("Failed to load Google Identity Services")),
      );
      return;
    }
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Google Identity Services"));
    document.head.appendChild(s);
  });
  return gsiLoading;
}

export async function requestGoogleToken(opts?: { prompt?: "" | "consent" }): Promise<string> {
  const clientId = getGoogleClientId();
  if (!clientId) {
    throw new Error(
      "Missing Google OAuth Client ID. Add it on the Settings page (Google Slides section).",
    );
  }
  await loadGsi();
  return new Promise<string>((resolve, reject) => {
    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPES,
        prompt: opts?.prompt ?? "",
        callback: (resp: any) => {
          if (resp?.error) {
            reject(new Error(resp.error_description || resp.error));
            return;
          }
          const tok = resp.access_token as string;
          const expiresIn = Number(resp.expires_in ?? 3600);
          setStoredToken(tok, expiresIn);
          resolve(tok);
        },
        error_callback: (err: any) => reject(new Error(err?.message || "Sign-in cancelled")),
      });
      client.requestAccessToken({ prompt: opts?.prompt ?? "" });
    } catch (e: any) {
      reject(e);
    }
  });
}

export async function ensureGoogleToken(): Promise<string> {
  const existing = getStoredToken();
  if (existing) return existing;
  return requestGoogleToken();
}

export async function googleFetch(input: string, init?: RequestInit): Promise<Response> {
  let token = await ensureGoogleToken();
  const doFetch = (t: string) =>
    fetch(input, {
      ...init,
      headers: { ...(init?.headers ?? {}), Authorization: `Bearer ${t}` },
    });
  let res = await doFetch(token);
  if (res.status === 401) {
    clearGoogleToken();
    token = await requestGoogleToken({ prompt: "consent" });
    res = await doFetch(token);
  }
  return res;
}
