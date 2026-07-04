const DISMISS_KEY = "gym.pwa-install.v1";

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function isPwaInstallDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissPwaInstallPrompt(): void {
  try {
    localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    // Private browsing — prompt may reappear next visit.
  }
}

export function isStandaloneDisplay(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true
  );
}

export function isIosDevice(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function registerServiceWorker(): void {
  if (!("serviceWorker" in navigator)) return;
  void navigator.serviceWorker.register("/sw.js");
}
