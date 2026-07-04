/**
 * Weekly scheduling — lay a plan's workout days across a Monday-first week.
 *
 * Plans label days three ways:
 *  - "Day N" with N ≤ 7: N is the weekday slot (PHUL's Day 1/2/4/5 → gaps are
 *    rest days) when the plan has as many labels as training days.
 *  - Weekday names ("Monday") → mapped directly.
 *  - Rotations (ICF A/B, 5-Day PPL's 3 workouts over 5 days): fewer labels
 *    than weekly sessions — sessions spread across the week and the day
 *    index advances by total sessions completed on the plan.
 */
import type { WorkoutPlan } from "@/data/exercises";
import { weekdayIndex } from "@/lib/streak/engine";

export const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

/** Sensible spread of N sessions across a Monday-first week. */
const SPREAD: Record<number, number[]> = {
  1: [0],
  2: [0, 3],
  3: [0, 2, 4],
  4: [0, 1, 3, 4],
  5: [0, 1, 2, 4, 5],
  6: [0, 1, 2, 3, 4, 5],
  7: [0, 1, 2, 3, 4, 5, 6],
};

export type WeekSlot = {
  weekday: (typeof WEEKDAYS)[number];
  weekdayIdx: number;
  /** Index into plan.days, or null on rest days. */
  dayIndex: number | null;
  /** True when the plan cycles workouts (A/B…) rather than fixing them to weekdays. */
  rotating: boolean;
};

const WEEKDAY_NAME_IDX: Record<string, number> = {
  monday: 0,
  tuesday: 1,
  wednesday: 2,
  thursday: 3,
  friday: 4,
  saturday: 5,
  sunday: 6,
};

function parseDayNumber(label: string): number | null {
  const m = label.match(/(?:day|workout)\s*#?\s*(\d+)/i);
  return m ? parseInt(m[1], 10) : null;
}

/**
 * Compute the week layout for a plan.
 * @param rotationOffset total sessions completed on the plan — advances
 *   the workout pointer for rotating plans (A/B/A → B/A/B next week).
 */
export function weekLayout(plan: WorkoutPlan, rotationOffset = 0): WeekSlot[] {
  const slots: WeekSlot[] = WEEKDAYS.map((weekday, i) => ({
    weekday,
    weekdayIdx: i,
    dayIndex: null,
    rotating: false,
  }));

  const labels = plan.days.map((d) => d.day);
  const sessionsPerWeek = Math.min(plan.daysPerWeek, 7);

  // 1) Weekday-named days ("Monday — …").
  const weekdayIdxs = labels.map(
    (l) => WEEKDAY_NAME_IDX[l.split(/[—-]/)[0].trim().toLowerCase()],
  );
  if (weekdayIdxs.every((x) => x !== undefined)) {
    weekdayIdxs.forEach((wi, di) => (slots[wi].dayIndex = di));
    return slots;
  }

  // 2) Numbered days acting as weekday slots (count matches weekly sessions).
  const nums = labels.map(parseDayNumber);
  if (
    plan.days.length === sessionsPerWeek &&
    nums.every((n) => n !== null && n >= 1 && n <= 7) &&
    new Set(nums).size === nums.length
  ) {
    nums.forEach((n, di) => (slots[n! - 1].dayIndex = di));
    return slots;
  }

  // 3) Rotation: spread sessions across the week, cycling through plan.days.
  const spread = SPREAD[sessionsPerWeek] ?? SPREAD[3];
  spread.forEach((weekdayIdx, i) => {
    slots[weekdayIdx].dayIndex = (rotationOffset + i) % plan.days.length;
    slots[weekdayIdx].rotating = true;
  });
  return slots;
}

/** Which workout (if any) is scheduled for a local ISO date. */
export function scheduledDayIndex(
  plan: WorkoutPlan,
  isoDate: string,
  rotationOffset = 0,
): number | null {
  const layout = weekLayout(
    plan,
    rotationOffsetAtWeekStart(plan, rotationOffset, isoDate),
  );
  return layout[weekdayIndex(isoDate)].dayIndex;
}

/**
 * For rotating plans the offset shown for a week should be the offset as of
 * that week's start; within a week the layout must not shift as sessions
 * complete. v1 keeps it simple: the caller passes the offset at week start.
 */
function rotationOffsetAtWeekStart(
  _plan: WorkoutPlan,
  rotationOffset: number,
  _isoDate: string,
): number {
  return rotationOffset;
}

/** "Day 4 — Lower Power" → "Lower Power"; falls back to the whole label. */
export function dayTitle(dayLabel: string): string {
  const parts = dayLabel.split("—");
  return (parts.length > 1 ? parts.slice(1).join("—") : dayLabel).trim();
}

/** Count the scheduled working sets of a plan day (excludes duration items). */
export function scheduledWorkingSets(
  plan: WorkoutPlan,
  dayIndex: number,
): number {
  const day = plan.days[dayIndex];
  if (!day) return 0;
  let total = 0;
  for (const ex of day.exercises) {
    if (ex.loadMode === "duration") continue;
    total += Math.max(1, ex.setsMin ?? ex.setsMax ?? 3);
  }
  return total;
}
