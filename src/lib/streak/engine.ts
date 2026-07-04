/**
 * Streak + session-validity engine (v1 — deliberately forgiving).
 *
 * One generous definition of a credited session, weekly close on Monday
 * 00:00 local, shields every 4th successful week (bank 2), and a
 * user-activated pause. All anti-cheat/verification machinery is deferred
 * until a competitive leaderboard needs protecting.
 */

export const MILESTONE_WEEKS = [4, 8, 12, 16, 26, 52, 104] as const;

export const SHIELD_CAP = 2;
export const SUCCESSES_PER_SHIELD = 4;

/* ---------------------------------------------------------------------------
 * Local-date helpers. All week math is local time, Monday-first.
 * ------------------------------------------------------------------------- */

/** Format a Date as local YYYY-MM-DD. */
export function toLocalISODate(d: Date): string {
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

/** Parse local YYYY-MM-DD into a Date at local midnight. */
export function fromLocalISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** ISO date of the Monday of the week containing `date` (local). */
export function weekStartOf(date: Date | string): string {
  const d = typeof date === "string" ? fromLocalISODate(date) : new Date(date);
  const day = d.getDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return toLocalISODate(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
}

export function addDays(iso: string, days: number): string {
  const d = fromLocalISODate(iso);
  d.setDate(d.getDate() + days);
  return toLocalISODate(d);
}

/** Monday-first index of the day within its week (0..6). */
export function weekdayIndex(iso: string): number {
  const day = fromLocalISODate(iso).getDay();
  return day === 0 ? 6 : day - 1;
}

/* ---------------------------------------------------------------------------
 * Session validity — what earns streak credit.
 * ------------------------------------------------------------------------- */

/** Minimum session length to be credible (generous). */
const MIN_DURATION_SEC = 10 * 60;
/** "A handful of sets" for unscheduled sessions. */
const MIN_UNSCHEDULED_SETS = 5;

export type SessionValidityInput = {
  completedWorkingSets: number;
  scheduledWorkingSets: number;
  durationSec: number;
  unscheduled: boolean;
};

/**
 * A finished session earns credit when the user logged a reasonable chunk
 * of work: ≥50% of the day's scheduled working sets (or ≥5 sets when the
 * workout was unscheduled) with a sensible amount of time spent. Lighter
 * sessions still save to history and fill the rings — no credit only.
 */
export function isSessionValid(input: SessionValidityInput): boolean {
  if (input.durationSec < MIN_DURATION_SEC) return false;
  if (input.unscheduled || input.scheduledWorkingSets === 0) {
    return input.completedWorkingSets >= MIN_UNSCHEDULED_SETS;
  }
  return (
    input.completedWorkingSets >= Math.ceil(input.scheduledWorkingSets * 0.5)
  );
}

/* ---------------------------------------------------------------------------
 * Weekly close.
 * ------------------------------------------------------------------------- */

export type StreakState = {
  streakWeeks: number;
  longestWeeks: number;
  shields: number;
  /** Successful weeks since the last shield was earned (0..3). */
  successesTowardShield: number;
  paused: boolean;
  /** Weekly session commitment; changes apply from the next week. */
  weeklyTarget: number;
  pendingWeeklyTarget: number | null;
  /** Monday of the last week that has been closed (processed). */
  lastClosedWeekStart: string | null;
  /** ISO date the user started (for first-week proration). */
  startDate: string | null;
};

export type WeekOutcomeKind = "success" | "shielded" | "failed" | "paused";

export type WeekClose = {
  weekStart: string;
  validSessions: number;
  target: number;
  outcome: WeekOutcomeKind;
  streakAfter: number;
  shieldsAfter: number;
};

export function initialStreakState(): StreakState {
  return {
    streakWeeks: 0,
    longestWeeks: 0,
    shields: 0,
    successesTowardShield: 0,
    paused: false,
    weeklyTarget: 3,
    pendingWeeklyTarget: null,
    lastClosedWeekStart: null,
    startDate: null,
  };
}

/** Prorated target when the user starts mid-week: ceil(full × remaining/7). */
export function prorateTarget(
  fullTarget: number,
  startDate: string,
  weekStart: string,
): number {
  const startIdx =
    weekStartOf(startDate) === weekStart ? weekdayIndex(startDate) : 0;
  const remainingDays = 7 - startIdx;
  return Math.max(1, Math.ceil((fullTarget * remainingDays) / 7));
}

/** Close a single week given how many credited sessions landed in it. */
export function closeWeek(
  state: StreakState,
  weekStart: string,
  validSessions: number,
): { state: StreakState; close: WeekClose } {
  const next: StreakState = { ...state };

  const target =
    state.startDate && weekStartOf(state.startDate) === weekStart
      ? prorateTarget(state.weeklyTarget, state.startDate, weekStart)
      : state.weeklyTarget;

  let outcome: WeekOutcomeKind;
  if (state.paused) {
    outcome = "paused"; // frozen: no gain, no loss, no shield progress
  } else if (validSessions >= target) {
    next.streakWeeks = state.streakWeeks + 1;
    next.longestWeeks = Math.max(state.longestWeeks, next.streakWeeks);
    next.successesTowardShield = state.successesTowardShield + 1;
    if (next.successesTowardShield >= SUCCESSES_PER_SHIELD) {
      next.shields = Math.min(SHIELD_CAP, state.shields + 1);
      next.successesTowardShield = 0;
    }
    outcome = "success";
  } else if (state.shields >= 1) {
    next.shields = state.shields - 1;
    outcome = "shielded"; // streak survives
  } else {
    next.longestWeeks = Math.max(state.longestWeeks, state.streakWeeks);
    next.streakWeeks = 0;
    next.successesTowardShield = 0;
    outcome = "failed";
  }

  // A committed target change applies from the following week.
  if (next.pendingWeeklyTarget != null) {
    next.weeklyTarget = next.pendingWeeklyTarget;
    next.pendingWeeklyTarget = null;
  }
  next.lastClosedWeekStart = weekStart;

  return {
    state: next,
    close: {
      weekStart,
      validSessions,
      target,
      outcome,
      streakAfter: next.streakWeeks,
      shieldsAfter: next.shields,
    },
  };
}

/**
 * Catch up every un-closed week strictly before the current one.
 * `creditedDatesByWeek` maps weekStart → number of distinct credited days.
 */
export function processWeeks(
  state: StreakState,
  creditedDatesByWeek: (weekStart: string) => number,
  today: string,
): { state: StreakState; closes: WeekClose[] } {
  const currentWeek = weekStartOf(today);
  const closes: WeekClose[] = [];
  let s = state;

  // Nothing to process before the user exists.
  const anchor = s.lastClosedWeekStart
    ? addDays(s.lastClosedWeekStart, 7)
    : s.startDate
      ? weekStartOf(s.startDate)
      : null;
  if (!anchor) return { state: s, closes };

  let week = anchor;
  let guard = 0;
  while (week < currentWeek && guard < 520) {
    const res = closeWeek(s, week, creditedDatesByWeek(week));
    s = res.state;
    closes.push(res.close);
    week = addDays(week, 7);
    guard++;
  }
  return { state: s, closes };
}

/* ---------------------------------------------------------------------------
 * Milestones.
 * ------------------------------------------------------------------------- */

export function nextMilestone(streakWeeks: number): number | null {
  return MILESTONE_WEEKS.find((m) => m > streakWeeks) ?? null;
}

export function earnedMilestones(streakWeeks: number): number[] {
  return MILESTONE_WEEKS.filter((m) => streakWeeks >= m);
}
