export const unstable_instant = { prefetch: "static" };

import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { BackgroundBlobs } from "@/components/layout/BackgroundBlobs";
import { SettingsHome } from "@/components/settings/SettingsHome";

export const metadata: Metadata = {
  title: "Settings — Gym App",
  description: "Plan, preferences and profile",
};

export default function SettingsPage() {
  return (
    <AppShell
      showBottomNav
      header={
        <div className="mb-6 flex flex-col gap-1.5 md:mb-8">
          <h1 className="text-ink text-[2rem] leading-[1.1] font-light tracking-tight">
            Settings
          </h1>
          <p className="text-ink-secondary text-[0.9375rem] font-light">
            Your plan, preferences and profile — all editable.
          </p>
        </div>
      }
    >
      <BackgroundBlobs />
      <SettingsHome />
    </AppShell>
  );
}
