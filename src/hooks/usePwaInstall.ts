"use client";

import { useCallback, useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

type InstallPlatform = "android" | "ios" | null;

// ── Debug-safe detection primitives ────────────────────────────────────
// Pure functions, never throw, default to `false` outside the browser
// (SSR) so they're safe to call from anywhere — including the browser
// console on a real device while debugging (e.g. via Safari's remote
// Web Inspector: `isIOS()`, `isSafari()`, `isStandalone()`).

function ua(): string {
  return typeof navigator === "undefined" ? "" : navigator.userAgent;
}

export function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(ua());
}

export function isSafari(): boolean {
  // Every iOS browser embeds a "Safari" token for legacy compatibility, so
  // detecting *actual* Safari means excluding the other WebKit shells that
  // carry their own token (Chrome/Firefox/Edge/Opera for iOS), plus Android
  // Chrome/WebView which also embed "Safari".
  const s = ua();
  return /Safari/.test(s) && !/CriOS|FxiOS|EdgiOS|OPiOS|Chrome|Android/.test(s);
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true ||
    document.referrer.startsWith("android-app://")
  );
}

/**
 * Whether *any* install pathway is currently offerable.
 * iOS only needs Safari + not-standalone — it never gets a native prompt.
 * Android needs a captured `beforeinstallprompt` event.
 * Pure function — takes explicit booleans rather than reading globals, so
 * it stays trivially testable/debuggable on its own.
 */
export function canInstallPWA(opts: {
  isIOSSafari: boolean;
  hasAndroidPrompt: boolean;
  standalone: boolean;
}): boolean {
  if (opts.standalone) return false;
  return opts.isIOSSafari || opts.hasAndroidPrompt;
}

function detectPlatform(): InstallPlatform {
  if (isIOS() && isSafari()) return "ios";
  if (/Android/.test(ua())) return "android";
  return null;
}

export function usePwaInstall() {
  // Lazy init avoids a flash on first paint when it's correct; the effect
  // below re-validates once mounted in the real browser, since some signals
  // (`navigator.standalone`, matchMedia) can lag by a tick on certain
  // mobile browsers right at first script execution.
  const [installed, setInstalled] = useState(() =>
    typeof window === "undefined" ? false : isStandalone()
  );
  const [platform, setPlatform] = useState<InstallPlatform>(() =>
    typeof window === "undefined" ? null : detectPlatform()
  );
  const [deferredEvent, setDeferredEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Re-sync with the real browser environment post-mount — see comment above.
    const standaloneNow = isStandalone();
    const platformNow = detectPlatform();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from external browser APIs (UA/matchMedia), not derivable during render
    setInstalled(standaloneNow);
    setPlatform(platformNow);

    if (process.env.NODE_ENV !== "production") {
      console.debug("[usePwaInstall]", {
        isIOS: isIOS(),
        isSafari: isSafari(),
        isStandalone: standaloneNow,
        platform: platformNow,
        userAgent: ua(),
      });
    }

    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredEvent(e as BeforeInstallPromptEvent);
    }
    function onAppInstalled() {
      setInstalled(true);
      setDeferredEvent(null);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const canPromptAndroid = platform === "android" && deferredEvent !== null;
  const canShowIosInstructions = platform === "ios";
  const shouldShowButton = canInstallPWA({
    isIOSSafari: canShowIosInstructions,
    hasAndroidPrompt: canPromptAndroid,
    standalone: installed,
  });

  const promptAndroidInstall = useCallback(async () => {
    if (!deferredEvent) return;
    await deferredEvent.prompt();
    const choice = await deferredEvent.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setDeferredEvent(null);
  }, [deferredEvent]);

  return {
    platform,
    shouldShowButton,
    canPromptAndroid,
    canShowIosInstructions,
    promptAndroidInstall,
  };
}
