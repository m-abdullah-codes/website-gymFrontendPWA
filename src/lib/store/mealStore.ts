"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { createDayLog, todayISO } from "@/lib/meals/engine";
import type { DayLog, LogEntry, WeighIn } from "@/lib/meals/types";

/** A persisted swap: slot item → another food at fitted portions. */
export type PlanSwap = {
  slotIndex: number;
  itemIndex: number;
  itemId: number;
  portions: number;
};

export type MealState = {
  /** Food logs by local date — the log is the truth, the plan is a suggestion. */
  dayLogs: Record<string, DayLog>;
  /** Bumped by "New plan" to reshuffle today's suggestions. */
  seedSalt: number;
  weighIns: WeighIn[];
  lastAdjustDate: string | null;
  /** Applied kcal delta from adaptive weekly adjustments. */
  kcalAdjustment: number;
  dislikedFoodIds: number[];
  /** Which plan slots the user has "eaten" (per date), for calm UI ticks. */
  loggedSlots: Record<string, number[]>;
  /** User swaps applied on top of the generated plan, per date. */
  planSwaps: Record<string, PlanSwap[]>;

  logForDate: (date: string) => DayLog;
  appendEntries: (date: string, log: DayLog, slotIndex?: number | null) => void;
  removeEntry: (date: string, entryId: number) => void;
  bumpSeed: (date: string) => void;
  setSwap: (date: string, swap: PlanSwap) => void;
  addWeighIn: (w: WeighIn) => void;
  applyAdjustment: (deltaKcal: number, date: string) => void;
  toggleDisliked: (foodId: number) => void;
  resetAll: () => void;
};

export const useMealStore = create<MealState>()(
  persist(
    (set, get) => ({
      dayLogs: {},
      seedSalt: 0,
      weighIns: [],
      lastAdjustDate: null,
      kcalAdjustment: 0,
      dislikedFoodIds: [],
      loggedSlots: {},
      planSwaps: {},

      logForDate: (date) => get().dayLogs[date] ?? createDayLog(date),

      appendEntries: (date, log, slotIndex) =>
        set((s) => ({
          dayLogs: { ...s.dayLogs, [date]: log },
          loggedSlots:
            slotIndex != null
              ? {
                  ...s.loggedSlots,
                  [date]: [
                    ...new Set([...(s.loggedSlots[date] ?? []), slotIndex]),
                  ],
                }
              : s.loggedSlots,
        })),

      removeEntry: (date, entryId) =>
        set((s) => {
          const log = s.dayLogs[date];
          if (!log) return s;
          const entry = log.entries.find((e: LogEntry) => e.id === entryId);
          const next: DayLog = {
            ...log,
            entries: log.entries.filter((e: LogEntry) => e.id !== entryId),
          };
          // If a slot no longer has entries, unmark it.
          const slot = entry?.slot;
          let loggedSlots = s.loggedSlots;
          if (slot != null && !next.entries.some((e) => e.slot === slot)) {
            loggedSlots = {
              ...s.loggedSlots,
              [date]: (s.loggedSlots[date] ?? []).filter((x) => x !== slot),
            };
          }
          return { dayLogs: { ...s.dayLogs, [date]: next }, loggedSlots };
        }),

      // A fresh plan invalidates the date's swaps — they refer to the old one.
      bumpSeed: (date) =>
        set((s) => ({
          seedSalt: s.seedSalt + 1,
          planSwaps: { ...s.planSwaps, [date]: [] },
        })),

      setSwap: (date, swap) =>
        set((s) => ({
          planSwaps: {
            ...s.planSwaps,
            [date]: [
              ...(s.planSwaps[date] ?? []).filter(
                (x) =>
                  !(
                    x.slotIndex === swap.slotIndex &&
                    x.itemIndex === swap.itemIndex
                  ),
              ),
              swap,
            ],
          },
        })),

      addWeighIn: (w) =>
        set((s) => ({
          weighIns: [...s.weighIns.filter((x) => x.date !== w.date), w].sort(
            (a, b) => (a.date < b.date ? -1 : 1),
          ),
        })),

      applyAdjustment: (deltaKcal, date) =>
        set((s) => ({
          kcalAdjustment: s.kcalAdjustment + deltaKcal,
          lastAdjustDate: date,
        })),

      toggleDisliked: (foodId) =>
        set((s) => ({
          dislikedFoodIds: s.dislikedFoodIds.includes(foodId)
            ? s.dislikedFoodIds.filter((x) => x !== foodId)
            : [...s.dislikedFoodIds, foodId],
        })),

      resetAll: () =>
        set({
          dayLogs: {},
          seedSalt: 0,
          weighIns: [],
          lastAdjustDate: null,
          kcalAdjustment: 0,
          dislikedFoodIds: [],
          loggedSlots: {},
          planSwaps: {},
        }),
    }),
    { name: "gym.meals.v1", storage: createJSONStorage(() => localStorage) },
  ),
);

/**
 * Recent-use map (itemId → days ago) from PREVIOUS days' logs. Today is
 * deliberately excluded — otherwise logging breakfast would reshuffle the
 * rest of today's plan mid-day.
 */
export function recentItemUse(
  dayLogs: Record<string, DayLog>,
  today?: string,
): Record<number, number> {
  const base = today ?? todayISO();
  const use: Record<number, number> = {};
  for (const [date, log] of Object.entries(dayLogs)) {
    const daysAgo = Math.round(
      (new Date(base).getTime() - new Date(date).getTime()) / 86400000,
    );
    if (daysAgo < 1 || daysAgo > 3) continue;
    for (const e of log.entries) {
      if (e.itemId == null) continue;
      use[e.itemId] =
        use[e.itemId] == null ? daysAgo : Math.min(use[e.itemId], daysAgo);
    }
  }
  return use;
}
