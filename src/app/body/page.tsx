export const unstable_instant = { prefetch: "static" };

import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { BackgroundBlobs } from "@/components/layout/BackgroundBlobs";
import { BodyTabs } from "@/components/body/BodyTabs";

export const metadata: Metadata = {
  title: "Body — Gym App",
  description: "Weekly targets, muscle heat map and progress history",
};

export default function BodyPage() {
  return (
    <AppShell
      showBottomNav
      header={
        <div className="mb-6 flex flex-col gap-1.5 md:mb-8">
          <h1 className="text-ink text-[2rem] leading-[1.1] font-light tracking-tight">
            Body
          </h1>
          <p className="text-ink-secondary text-[0.9375rem] font-light">
            Targets, training heat map and your history.
          </p>
        </div>
      }
    >
      <BackgroundBlobs />
      <BodyTabs />
    </AppShell>
  );
}
