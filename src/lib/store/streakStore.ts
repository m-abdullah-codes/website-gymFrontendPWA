"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  closeWeek,
  initialStreakState,
  processWeeks,
  prorateTarget,
  toLocalISODate,
  weekStartOf,
  addDays,
  type StreakState,
  type WeekClose,
} from "@/lib/streak/engine";
import { useWorkoutStore } from "./workoutStore";
import type { WeekOutcome } from "./types";

export type StreakStoreState = StreakState & {
  /** Closed-week history, oldest → newest (Progress Report ribbon). */
  weekOutcomes: WeekOutcome[];

  /** Begin tracking (called when onboarding completes / first plan activates). */
  begin: (weeklyTarget: number) => void;
  /** Commit a new weekly target; applies from next week. */
  setWeeklyTarget: (target: number) => void;
  setPaused: (paused: boolean) => void;
  /** Close any finished weeks that haven't been processed yet. */
  ensureWeeksClosed: () => WeekClose[];
  resetAll: () => void;
};

/** Distinct credited days within the week starting at `weekStart`. */
function creditedDaysInWeek(weekStart: string): number {
  const end = addDays(weekStart, 7);
  const sessions = useWorkoutStore.getState().sessions;
  const days = new Set(
    sessions
      .filter((s) => s.credited && s.date >= weekStart && s.date < end)
      .map((s) => s.date),
  );
  return days.size;
}

export const useStreakStore = create<StreakStoreState>()(
  persist(
    (set, get) => ({
      ...initialStreakState(),
      weekOutcomes: [],

      begin: (weeklyTarget) =>
        set((s) => {
          if (s.startDate) return s; // already tracking
          return {
            startDate: toLocalISODate(new Date()),
            weeklyTarget: Math.max(1, Math.min(7, weeklyTarget)),
          };
        }),

      setWeeklyTarget: (target) =>
        set({ pendingWeeklyTarget: Math.max(1, Math.min(7, target)) }),

      setPaused: (paused) => set({ paused }),

      ensureWeeksClosed: () => {
        const s = get();
        if (!s.startDate) return [];
        const today = toLocalISODate(new Date());
        const { state: nextState, closes } = processWeeks(
          {
            streakWeeks: s.streakWeeks,
            longestWeeks: s.longestWeeks,
            shields: s.shields,
            successesTowardShield: s.successesTowardShield,
            paused: s.paused,
            weeklyTarget: s.weeklyTarget,
            pendingWeeklyTarget: s.pendingWeeklyTarget,
            lastClosedWeekStart: s.lastClosedWeekStart,
            startDate: s.startDate,
          },
          creditedDaysInWeek,
          today,
        );
        if (closes.length === 0) return [];
        set({
          ...nextState,
          weekOutcomes: [
            ...s.weekOutcomes,
            ...closes.map((c) => ({
              weekStart: c.weekStart,
              validSessions: c.validSessions,
              target: c.target,
              outcome: c.outcome,
              streakAfter: c.streakAfter,
            })),
          ],
        });
        return closes;
      },

      resetAll: () => set({ ...initialStreakState(), weekOutcomes: [] }),
    }),
    { name: "gym.streak.v1", storage: createJSONStorage(() => localStorage) },
  ),
);

/* ------------------------------------------------------------------------
 * Derived helpers for the current (open) week.
 * ---------------------------------------------------------------------- */

export function currentWeekStart(): string {
  return weekStartOf(toLocalISODate(new Date()));
}

/** Credited sessions so far in the running week. */
export function currentWeekValidCount(): number {
  return creditedDaysInWeek(currentWeekStart());
}

/** The target for the running week (prorated if it's the start week). */
export function currentWeekTarget(s: StreakState): number {
  const week = currentWeekStart();
  if (s.startDate && weekStartOf(s.startDate) === week) {
    return prorateTarget(s.weeklyTarget, s.startDate, week);
  }
  return s.weeklyTarget;
}

export { closeWeek };
