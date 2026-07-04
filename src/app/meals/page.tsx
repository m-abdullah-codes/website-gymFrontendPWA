export const unstable_instant = { prefetch: "static" };

import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { BackgroundBlobs } from "@/components/layout/BackgroundBlobs";
import { MealsHome } from "@/components/meals/MealsHome";

export const metadata: Metadata = {
  title: "Meals — Gym App",
  description: "Your daily meal plan and macro tracking",
};

export default function MealsPage() {
  return (
    <AppShell
      showBottomNav
      header={
        <div className="mb-6 flex flex-col gap-1.5 md:mb-8">
          <h1 className="text-ink text-[2rem] leading-[1.1] font-light tracking-tight">
            Meals
          </h1>
          <p className="text-ink-secondary text-[0.9375rem] font-light">
            A plan that eats like you do.
          </p>
        </div>
      }
    >
      <BackgroundBlobs />
      <MealsHome />
    </AppShell>
  );
}
