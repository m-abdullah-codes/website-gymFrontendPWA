"use client";

import { useEffect, useState } from "react";
import { useHydrated } from "@/lib/store/useHydrated";
import { useStreakStore } from "@/lib/store/streakStore";
import { cn } from "@/lib/utils";
import { TargetsTab } from "./TargetsTab";
import { SilhouetteTab } from "./SilhouetteTab";
import { ProgressTab } from "./ProgressTab";

const TABS = [
  { id: "targets", label: "Targets" },
  { id: "silhouette", label: "Silhouette" },
  { id: "progress", label: "Progress" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function BodyTabs() {
  const hydrated = useHydrated();
  const [tab, setTab] = useState<TabId>("targets");
  const ensureWeeksClosed = useStreakStore((s) => s.ensureWeeksClosed);

  // Catch up any weeks that ended while the app was closed.
  useEffect(() => {
    if (hydrated) ensureWeeksClosed();
  }, [hydrated, ensureWeeksClosed]);

  return (
    <div className="mx-auto flex w-full max-w-[var(--max-width-content)] flex-col gap-5 md:max-w-lg">
      <div
        role="tablist"
        aria-label="Body views"
        className="bg-surface-muted/60 ring-border-subtle flex w-full shrink-0 rounded-full p-1 ring-1 backdrop-blur-sm"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex-1 rounded-full py-2.5 text-sm transition-colors",
              tab === t.id
                ? "text-ink-inverse bg-white font-normal shadow-[0_4px_16px_rgba(0,0,0,0.35)]"
                : "text-ink-secondary font-light",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {!hydrated ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-[1.5rem] bg-white/[0.03]"
            />
          ))}
        </div>
      ) : (
        <div role="tabpanel">
          {tab === "targets" && <TargetsTab />}
          {tab === "silhouette" && <SilhouetteTab />}
          {tab === "progress" && <ProgressTab />}
        </div>
      )}
    </div>
  );
}
