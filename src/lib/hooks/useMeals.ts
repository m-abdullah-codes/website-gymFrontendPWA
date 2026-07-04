"use client";

import { useMemo } from "react";
import {
  applySwap,
  computeTargets,
  generateDayPlan,
  daySummary,
  scaleMacros,
  todayISO,
} from "@/lib/meals/engine";
import { foodDb, getFoodById } from "@/lib/meals/db";
import type {
  DayLog,
  DayPlan,
  DaySummary,
  MacroTargets,
} from "@/lib/meals/types";
import { useHydrated } from "@/lib/store/useHydrated";
import { selectMealProfile, useUserStore } from "@/lib/store/userStore";
import { recentItemUse, useMealStore } from "@/lib/store/mealStore";
import type { MealProfile } from "@/lib/meals/types";

export type MealData = {
  hydrated: boolean;
  onboarded: boolean;
  date: string;
  profile: Partial<MealProfile>;
  targets: MacroTargets;
  plan: DayPlan;
  log: DayLog;
  summary: DaySummary;
  loggedSlots: number[];
};

/** Apply an accumulated kcal adjustment; carbs absorb the change. */
function adjustedTargets(base: MacroTargets, deltaKcal: number): MacroTargets {
  if (!deltaKcal) return base;
  const floor = base.profile.gender === "female" ? 1200 : 1500;
  const kcal = Math.max(base.kcal + deltaKcal, floor);
  return {
    ...base,
    kcal: Math.round(kcal),
    carbs_g: Math.round(
      Math.max((kcal - base.protein_g * 4 - base.fat_g * 9) / 4, 50),
    ),
  };
}

export function useMeals(): MealData {
  const hydrated = useHydrated();
  const user = useUserStore();
  const meals = useMealStore();

  return useMemo(() => {
    const date = todayISO();
    const profile: Partial<MealProfile> = {
      ...selectMealProfile(user),
      dislikedFoodIds: meals.dislikedFoodIds,
    };
    const base = computeTargets(profile);
    const targets = adjustedTargets(base, hydrated ? meals.kcalAdjustment : 0);
    const plan = generateDayPlan(foodDb, profile, {
      date,
      targets,
      seedSalt: hydrated ? meals.seedSalt : 0,
      recentItemUse: hydrated ? recentItemUse(meals.dayLogs, date) : {},
    });
    // Re-apply the user's persisted swaps on top of the deterministic plan.
    if (hydrated) {
      for (const swap of meals.planSwaps[date] ?? []) {
        const item = getFoodById(swap.itemId);
        const slot = plan.slots[swap.slotIndex];
        if (!item || !slot?.items[swap.itemIndex]) continue;
        applySwap(plan, swap.slotIndex, swap.itemIndex, {
          item,
          portions: swap.portions,
          macros: scaleMacros(item, swap.portions),
          role: slot.items[swap.itemIndex].role,
          deltaKcal: 0,
          deltaProtein: 0,
          score: 0,
        });
      }
    }
    const log: DayLog = hydrated
      ? (meals.dayLogs[date] ?? { date, entries: [], nextId: 1 })
      : { date, entries: [], nextId: 1 };
    return {
      hydrated,
      onboarded: hydrated ? user.onboarded : false,
      date,
      profile,
      targets,
      plan,
      log,
      summary: daySummary(targets, log),
      loggedSlots: hydrated ? (meals.loggedSlots[date] ?? []) : [],
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    hydrated,
    user.onboarded,
    user.answers,
    user.ageYears,
    user.heightCm,
    user.bodyweightKg,
    meals.dayLogs,
    meals.seedSalt,
    meals.kcalAdjustment,
    meals.dislikedFoodIds,
    meals.loggedSlots,
    meals.planSwaps,
  ]);
}
