import { exerciseLibrary, type PlanExercise } from "@/data/exercises";

/** Slim view model for exercise rows across the workout UI. */
export type ExerciseView = {
  slug: string;
  name: string;
  sets: string;
  reps: string;
  muscle: string;
  imageSrc: string;
  videoUrl?: string;
  /** e.g. "60 kg × 5" — from today's prescription when available. */
  loadLine?: string | null;
};

/** Muscle names that don't map 1:1 onto a /public/images filename. */
const MUSCLE_IMAGE_OVERRIDES: Record<string, string> = {
  Quads: "/images/quadriceps.jpg",
  "Lower Back": "/images/lower-back.jpg",
};

export function muscleImageFor(muscle: string | undefined): string {
  if (!muscle) return "/images/body-front.jpg";
  return (
    MUSCLE_IMAGE_OVERRIDES[muscle] ?? `/images/${muscle.toLowerCase()}.jpg`
  );
}

export function muscleInfoFor(slug: string): {
  muscle: string;
  imageSrc: string;
} {
  const muscle = exerciseLibrary[slug]?.primaryMuscles[0];
  if (!muscle)
    return { muscle: "Full body", imageSrc: "/images/body-front.jpg" };
  return { muscle, imageSrc: muscleImageFor(muscle) };
}

export function toExerciseView(
  exercise: PlanExercise,
  loadLine?: string | null,
): ExerciseView {
  const libraryEntry = exerciseLibrary[exercise.slug];
  return {
    slug: exercise.slug,
    name: exercise.name,
    sets: exercise.sets,
    reps: exercise.reps,
    ...muscleInfoFor(exercise.slug),
    videoUrl: libraryEntry?.videoUrl,
    loadLine,
  };
}
