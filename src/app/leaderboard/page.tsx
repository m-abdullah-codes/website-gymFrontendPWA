export const unstable_instant = { prefetch: "static" };

import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { BackgroundBlobs } from "@/components/layout/BackgroundBlobs";
import { LeaderboardTabs } from "@/components/leaderboard/LeaderboardTabs";

export const metadata: Metadata = {
  title: "Ranks — Gym App",
  description: "Gym leaderboard and community feed",
};

export default function LeaderboardPage() {
  return (
    <AppShell
      showBottomNav
      header={
        <div className="mb-6 flex flex-col gap-1.5 md:mb-8">
          <h1 className="text-ink text-[2rem] leading-[1.1] font-light tracking-tight">
            Ranks
          </h1>
          <p className="text-ink-secondary text-[0.9375rem] font-light">
            Streaks lead the board. Keep showing up.
          </p>
        </div>
      }
    >
      <BackgroundBlobs />
      <LeaderboardTabs />
    </AppShell>
  );
}
