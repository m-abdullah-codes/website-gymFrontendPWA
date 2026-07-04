/** Run: npx tsx --test src/lib/streak/engine.test.ts */
import { test } from "node:test";
import assert from "node:assert";
import {
  addDays,
  closeWeek,
  earnedMilestones,
  initialStreakState,
  isSessionValid,
  nextMilestone,
  processWeeks,
  prorateTarget,
  weekStartOf,
  weekdayIndex,
  type StreakState,
} from "./engine";

test("weekStartOf returns local Monday", () => {
  assert.strictEqual(weekStartOf("2026-07-04"), "2026-06-29"); // Sat → Mon
  assert.strictEqual(weekStartOf("2026-06-29"), "2026-06-29"); // Mon → itself
  assert.strictEqual(weekStartOf("2026-07-05"), "2026-06-29"); // Sun → prior Mon
  assert.strictEqual(weekStartOf("2026-07-06"), "2026-07-06"); // next Mon
});

test("weekdayIndex is Monday-first", () => {
  assert.strictEqual(weekdayIndex("2026-06-29"), 0);
  assert.strictEqual(weekdayIndex("2026-07-05"), 6);
});

test("session validity — scheduled day, half the sets, sensible time", () => {
  assert.ok(
    isSessionValid({
      completedWorkingSets: 9,
      scheduledWorkingSets: 18,
      durationSec: 45 * 60,
      unscheduled: false,
    }),
  );
  assert.ok(
    !isSessionValid({
      completedWorkingSets: 8,
      scheduledWorkingSets: 18,
      durationSec: 45 * 60,
      unscheduled: false,
    }),
  );
  // too fast to be credible
  assert.ok(
    !isSessionValid({
      completedWorkingSets: 18,
      scheduledWorkingSets: 18,
      durationSec: 5 * 60,
      unscheduled: false,
    }),
  );
  // unscheduled: a handful of sets counts
  assert.ok(
    isSessionValid({
      completedWorkingSets: 5,
      scheduledWorkingSets: 0,
      durationSec: 20 * 60,
      unscheduled: true,
    }),
  );
  assert.ok(
    !isSessionValid({
      completedWorkingSets: 3,
      scheduledWorkingSets: 0,
      durationSec: 20 * 60,
      unscheduled: true,
    }),
  );
});

test("proration: mid-week start shrinks the first week's target", () => {
  // Started Saturday (idx 5): 2 days remain → ceil(4×2/7)=2
  assert.strictEqual(prorateTarget(4, "2026-07-04", "2026-06-29"), 2);
  // Started Monday: full target
  assert.strictEqual(prorateTarget(4, "2026-06-29", "2026-06-29"), 4);
  // Never below 1
  assert.strictEqual(prorateTarget(1, "2026-07-05", "2026-06-29"), 1);
});

function week(state: StreakState, weekStart: string, valid: number) {
  return closeWeek(state, weekStart, valid);
}

test("weekly close: success grows streak; every 4th success banks a shield (cap 2)", () => {
  let s: StreakState = {
    ...initialStreakState(),
    startDate: "2026-01-05",
    weeklyTarget: 3,
  };
  let w = "2026-01-05";
  for (let i = 1; i <= 9; i++) {
    const r = week(s, w, 3);
    s = r.state;
    assert.strictEqual(r.close.outcome, "success");
    assert.strictEqual(s.streakWeeks, i);
    w = addDays(w, 7);
  }
  assert.strictEqual(s.shields, 2); // 8 successes = 2 shields
  const r10 = week(s, w, 3);
  assert.strictEqual(r10.state.shields, 2); // capped
});

test("weekly close: a missed week consumes a shield; without shields the streak resets", () => {
  let s: StreakState = {
    ...initialStreakState(),
    startDate: "2026-01-05",
    weeklyTarget: 3,
    streakWeeks: 6,
    longestWeeks: 6,
    shields: 1,
  };
  const miss1 = week(s, "2026-03-02", 1);
  assert.strictEqual(miss1.close.outcome, "shielded");
  assert.strictEqual(miss1.state.streakWeeks, 6);
  assert.strictEqual(miss1.state.shields, 0);

  s = miss1.state;
  const miss2 = week(s, "2026-03-09", 0);
  assert.strictEqual(miss2.close.outcome, "failed");
  assert.strictEqual(miss2.state.streakWeeks, 0);
  assert.strictEqual(miss2.state.longestWeeks, 6);
});

test("paused weeks freeze everything", () => {
  const s: StreakState = {
    ...initialStreakState(),
    startDate: "2026-01-05",
    weeklyTarget: 3,
    streakWeeks: 5,
    shields: 1,
    paused: true,
  };
  const r = week(s, "2026-03-02", 0);
  assert.strictEqual(r.close.outcome, "paused");
  assert.strictEqual(r.state.streakWeeks, 5);
  assert.strictEqual(r.state.shields, 1);
});

test("weekly target changes apply from the next week", () => {
  const s: StreakState = {
    ...initialStreakState(),
    startDate: "2026-01-05",
    weeklyTarget: 3,
    pendingWeeklyTarget: 5,
  };
  const r = week(s, "2026-02-02", 3); // closes against OLD target 3
  assert.strictEqual(r.close.outcome, "success");
  assert.strictEqual(r.state.weeklyTarget, 5);
  assert.strictEqual(r.state.pendingWeeklyTarget, null);
});

test("processWeeks catches up all unclosed weeks including empty ones", () => {
  const s: StreakState = {
    ...initialStreakState(),
    startDate: "2026-06-01", // a Monday
    weeklyTarget: 2,
    shields: 0,
  };
  const credits: Record<string, number> = {
    "2026-06-01": 2, // success
    "2026-06-08": 2, // success
    "2026-06-15": 0, // fail
    "2026-06-22": 2, // success
    // 2026-06-29 = current week (today 2026-07-04) — not closed
  };
  const { state, closes } = processWeeks(
    s,
    (w) => credits[w] ?? 0,
    "2026-07-04",
  );
  assert.strictEqual(closes.length, 4);
  assert.deepStrictEqual(
    closes.map((c) => c.outcome),
    ["success", "success", "failed", "success"],
  );
  assert.strictEqual(state.streakWeeks, 1);
  assert.strictEqual(state.longestWeeks, 2);
  assert.strictEqual(state.lastClosedWeekStart, "2026-06-22");
});

test("milestones", () => {
  assert.strictEqual(nextMilestone(0), 4);
  assert.strictEqual(nextMilestone(4), 8);
  assert.strictEqual(nextMilestone(103), 104);
  assert.strictEqual(nextMilestone(104), null);
  assert.deepStrictEqual(earnedMilestones(12), [4, 8, 12]);
});
