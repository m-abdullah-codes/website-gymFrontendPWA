export const unstable_instant = { prefetch: "static" };

import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { BackgroundBlobs } from "@/components/layout/BackgroundBlobs";
import { ExerciseLibraryList } from "@/components/exercises/ExerciseLibraryList";

export const metadata: Metadata = {
  title: "Exercises — Gym App",
  description: "The full exercise library",
};

export default function ExercisesPage() {
  return (
    <AppShell
      showBottomNav
      header={
        <div className="mb-6 flex flex-col gap-1.5 md:mb-8">
          <h1 className="text-ink text-[2rem] leading-[1.1] font-light tracking-tight">
            Exercises
          </h1>
          <p className="text-ink-secondary text-[0.9375rem] font-light">
            Every movement in your plans, with form guides.
          </p>
        </div>
      }
    >
      <BackgroundBlobs />
      <div className="mx-auto w-full max-w-[var(--max-width-content)] md:max-w-lg">
        <ExerciseLibraryList />
      </div>
    </AppShell>
  );
}
