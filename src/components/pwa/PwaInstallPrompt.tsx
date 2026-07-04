"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Share, Smartphone } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { useHydrated } from "@/lib/store/useHydrated";
import {
  dismissPwaInstallPrompt,
  isIosDevice,
  isPwaInstallDismissed,
  isStandaloneDisplay,
  registerServiceWorker,
  type BeforeInstallPromptEvent,
} from "@/lib/pwa/install";

export function PwaInstallPrompt() {
  const hydrated = useHydrated();
  const [userDismissed, setUserDismissed] = useState(false);
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);

  const showPrompt = useMemo(() => {
    if (!hydrated) return false;
    return !isStandaloneDisplay() && !isPwaInstallDismissed();
  }, [hydrated]);

  const ios = hydrated && isIosDevice();
  const open = showPrompt && !userDismissed;

  const close = useCallback(() => {
    dismissPwaInstallPrompt();
    setUserDismissed(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    registerServiceWorker();

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };

    const onInstalled = () => close();

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [hydrated, close]);

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    setInstallEvent(null);
    if (outcome === "accepted") close();
  };

  if (!open) return null;

  return (
    <Dialog open={open} onClose={close} ariaLabel="Install Gym App">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-4 pt-2 text-center">
          <span className="bg-accent/15 ring-accent/30 flex size-14 items-center justify-center rounded-full ring-1">
            <Smartphone className="text-accent size-6" strokeWidth={1.5} />
          </span>
          <div className="flex flex-col gap-2">
            <h2 className="text-ink text-xl leading-snug font-light tracking-tight">
              Add Gym App to your home screen
            </h2>
            <p className="text-ink-secondary text-sm leading-relaxed font-light">
              Install the app for quick access, full-screen workouts, and a
              home-screen icon — no app store required.
            </p>
          </div>
        </div>

        {ios ? (
          <ol className="text-ink-secondary flex list-decimal flex-col gap-2.5 pl-5 text-left text-sm leading-relaxed font-light">
            <li>
              Tap{" "}
              <Share
                className="text-ink inline size-3.5 align-text-bottom"
                strokeWidth={1.5}
                aria-hidden
              />{" "}
              Share in Safari&apos;s toolbar
            </li>
            <li>Scroll down and tap &ldquo;Add to Home Screen&rdquo;</li>
            <li>Tap &ldquo;Add&rdquo; in the top corner</li>
          </ol>
        ) : installEvent ? (
          <Button variant="accent" onClick={install}>
            Install app
          </Button>
        ) : (
          <p className="text-ink-secondary text-center text-sm leading-relaxed font-light">
            Open your browser menu and choose &ldquo;Install app&rdquo; or
            &ldquo;Add to Home screen&rdquo;.
          </p>
        )}

        <button
          type="button"
          onClick={close}
          className="text-ink-muted hover:text-ink-secondary -mt-2 text-center text-xs font-light transition-colors"
        >
          Not now
        </button>
      </div>
    </Dialog>
  );
}
