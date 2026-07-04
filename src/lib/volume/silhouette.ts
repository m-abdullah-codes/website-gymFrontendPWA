/**
 * Muscle ↔ silhouette-path mapping (Appendix A). Path ids are only unique
 * within one SVG view, so every reference is { view, pathId }. All logic keys
 * off path ids — never CSS classes.
 */
import type { Muscle } from "./engine";

export type SilhouetteView = "front" | "back";

export type PathRef = { view: SilhouetteView; pathId: string };

export const MUSCLE_PATHS: Record<Muscle, PathRef[]> = {
  Chest: [{ view: "front", pathId: "chest" }],
  Abs: [{ view: "front", pathId: "abs" }],
  Obliques: [
    { view: "front", pathId: "obliques" },
    { view: "back", pathId: "obliques" },
  ],
  Quads: [{ view: "front", pathId: "quadriceps" }],
  Adductors: [{ view: "front", pathId: "adductors" }],
  Abductors: [{ view: "front", pathId: "abductors" }],
  Calves: [
    { view: "front", pathId: "calves" },
    { view: "back", pathId: "calves" },
  ],
  Biceps: [{ view: "front", pathId: "biceps" }],
  Forearms: [
    { view: "front", pathId: "forearms" },
    { view: "back", pathId: "forearms" },
  ],
  Triceps: [
    { view: "front", pathId: "triceps-front" },
    { view: "back", pathId: "triceps" },
  ],
  Shoulders: [
    { view: "front", pathId: "shoulders" },
    { view: "back", pathId: "shoulders" },
  ],
  Trapezius: [
    { view: "front", pathId: "trazepius" },
    { view: "back", pathId: "trazepius" },
  ],
  Back: [
    { view: "back", pathId: "back" },
    { view: "back", pathId: "teres" },
  ],
  "Lower Back": [{ view: "back", pathId: "lower-back" }],
  Hamstrings: [{ view: "back", pathId: "hamstrings" }],
  Glutes: [{ view: "back", pathId: "glutes" }],
};

/** Reverse lookup: which muscle does a tapped path belong to? */
const PATH_TO_MUSCLE = new Map<string, Muscle>();
for (const [muscle, refs] of Object.entries(MUSCLE_PATHS)) {
  for (const ref of refs) {
    PATH_TO_MUSCLE.set(`${ref.view}:${ref.pathId}`, muscle as Muscle);
  }
}

export function muscleForPath(
  view: SilhouetteView,
  pathId: string,
): Muscle | null {
  return PATH_TO_MUSCLE.get(`${view}:${pathId}`) ?? null;
}

/** Fill map for one view given per-muscle colors (null → keep default). */
export function fillsForView(
  view: SilhouetteView,
  colorByMuscle: Partial<Record<Muscle, string | null>>,
): Record<string, string> {
  const fills: Record<string, string> = {};
  for (const [muscle, refs] of Object.entries(MUSCLE_PATHS)) {
    const color = colorByMuscle[muscle as Muscle];
    if (!color) continue;
    for (const ref of refs) {
      if (ref.view === view) fills[ref.pathId] = color;
    }
  }
  return fills;
}

/* ---------------------------------------------------------------------------
 * Color scales.
 * ------------------------------------------------------------------------- */

/** Trained-mode heat scale, bucket index 0–5. Red only for the 20+ caution. */
export const HEAT_COLORS = [
  null, // bucket 0 — untouched, keep the file's default fill
  "#3b4a6b",
  "#33549b",
  "#2e5ccf",
  "#2B59FF", // 12.5–19 ≈ optimal
  "#d13b4b", // 20+ — overreach caution (the only red in the app)
] as const;

/** Recovery-mode state colors. */
export const RECOVERY_COLORS: Record<string, string | null> = {
  fresh: "#35d07f",
  recovering: "#e8b93e",
  fatigued: "#d1663b",
  untrained: null, // keep default
};
