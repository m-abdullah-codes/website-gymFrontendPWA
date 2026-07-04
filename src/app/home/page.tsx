export const unstable_instant = { prefetch: "static" };

import { AppShell } from "@/components/layout/AppShell";
import { BackgroundBlobs } from "@/components/layout/BackgroundBlobs";
import { HomeHeader } from "@/components/home/HomeHeader";
import { WorkoutHome } from "@/components/workout/WorkoutHome";

export default function HomePage() {
  return (
    <AppShell
      showBottomNav
      fillViewport
      header={<HomeHeader className="mb-6 shrink-0 md:mb-8" />}
    >
      <BackgroundBlobs />
      <WorkoutHome />
    </AppShell>
  );
}
