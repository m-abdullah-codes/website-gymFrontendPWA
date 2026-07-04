/**
 * Exercise swaps — substituting an alternate slug into a plan day while
 * carrying the original's role/loadMode and re-resolving equipment-derived
 * fields from the library (per the engine dev brief).
 */
import {
  exerciseLibrary,
  type PlanExercise,
  type WorkoutPlan,
} from "@/data/exercises";
import { classifyEquipment } from "./core";

export function swapExercise(ex: PlanExercise, altSlug: string): PlanExercise {
  const entry = exerciseLibrary[altSlug];
  if (!entry) return ex;
  return {
    ...ex,
    slug: altSlug,
    name: entry.name,
    loadCategory: classifyEquipment(entry.equipment),
    // The original stays available to swap back to.
    alternates: [
      ex.slug,
      ...(ex.alternates ?? []).filter((s) => s !== altSlug),
    ],
  };
}

/** A view of the plan with the user's exercise swaps applied. */
export function applySwapsToPlan(
  plan: WorkoutPlan,
  swaps: Record<string, string>,
): WorkoutPlan {
  if (!swaps || Object.keys(swaps).length === 0) return plan;
  return {
    ...plan,
    days: plan.days.map((day) => ({
      ...day,
      exercises: day.exercises.map((ex) =>
        swaps[ex.slug] ? swapExercise(ex, swaps[ex.slug]) : ex,
      ),
    })),
  };
}
