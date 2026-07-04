"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  GlassWater,
  Plus,
  RefreshCcw,
  Repeat,
  Sparkles,
} from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { foodDb, getFoodById } from "@/lib/meals/db";
import {
  logFood,
  logPlanned,
  searchFoods,
  suggestForRemaining,
  swapOptions,
} from "@/lib/meals/engine";
import type { DayLog, PlanSlot, SwapOption } from "@/lib/meals/types";
import { useMeals } from "@/lib/hooks/useMeals";
import { useMealStore } from "@/lib/store/mealStore";
import { cn } from "@/lib/utils";
import { MacroRings } from "./MacroRings";

const cloneLog = (log: DayLog): DayLog => JSON.parse(JSON.stringify(log));

export function MealsHome() {
  const data = useMeals();
  const meals = useMealStore();
  const [swapTarget, setSwapTarget] = useState<{
    slot: number;
    item: number;
  } | null>(null);
  const [logOpen, setLogOpen] = useState(false);

  const swaps: SwapOption[] = useMemo(() => {
    if (!swapTarget) return [];
    return swapOptions(
      foodDb,
      data.profile,
      data.plan,
      swapTarget.slot,
      swapTarget.item,
      8,
    );
  }, [swapTarget, data.profile, data.plan]);

  if (!data.hydrated) {
    return (
      <div className="mx-auto flex w-full max-w-[var(--max-width-content)] flex-col gap-5 md:max-w-lg">
        <div className="h-44 animate-pulse rounded-[var(--radius-card)] bg-white/[0.03]" />
        <div className="h-32 animate-pulse rounded-[1.5rem] bg-white/[0.03]" />
        <div className="h-40 animate-pulse rounded-[1.5rem] bg-white/[0.03]" />
      </div>
    );
  }

  if (!data.onboarded) {
    return (
      <div className="mx-auto flex w-full max-w-[var(--max-width-content)] flex-1 flex-col items-center justify-center gap-6 py-16 text-center">
        <div className="flex flex-col gap-2.5">
          <h2 className="text-ink text-2xl font-light tracking-tight">
            Meals, planned for you
          </h2>
          <p className="text-ink-secondary max-w-[30ch] text-sm leading-relaxed font-light">
            Finish onboarding and we&apos;ll compute your calories and build a
            daily plan from real Pakistani food.
          </p>
        </div>
        <Link
          href="/onboarding"
          className="bg-accent flex h-13 items-center justify-center gap-2 rounded-full px-8 text-[0.9375rem] font-normal text-white shadow-[0_0_24px_var(--color-accent-glow)]"
        >
          Start onboarding
          <ArrowRight className="size-4.5" strokeWidth={2} />
        </Link>
      </div>
    );
  }

  const eatSlot = (slot: PlanSlot) => {
    const log = cloneLog(data.log);
    logPlanned(foodDb, log, data.plan, slot.index, null, null);
    meals.appendEntries(data.date, log, slot.index);
  };

  const applySwapChoice = (choice: SwapOption) => {
    if (!swapTarget) return;
    meals.setSwap(data.date, {
      slotIndex: swapTarget.slot,
      itemIndex: swapTarget.item,
      itemId: choice.item.id,
      portions: choice.portions,
    });
    setSwapTarget(null);
  };

  const remainingKcal = Math.max(0, data.summary.kcal.remaining);

  return (
    <div className="mx-auto flex w-full max-w-[var(--max-width-content)] flex-col gap-5 md:max-w-lg">
      {/* Hero — mirrors the workout page's card feel */}
      <section
        aria-label="Nutrition today"
        className="relative overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-card-border)] shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
      >
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(120%_120%_at_85%_0%,rgba(53,208,127,0.22)_0%,rgba(43,89,255,0.16)_38%,rgba(0,8,20,0.9)_78%)]"
        />
        <div
          aria-hidden
          className="absolute -top-16 -right-10 size-48 rounded-full bg-[radial-gradient(circle,rgba(232,185,62,0.22),transparent_65%)]"
        />
        <div className="relative flex flex-col gap-4 p-5">
          <div className="flex items-center justify-between">
            <span className="text-ink-secondary text-[0.6875rem] font-light tracking-[0.22em] uppercase">
              Today&apos;s nutrition
            </span>
            <span className="text-ink-secondary rounded-full bg-white/10 px-2.5 py-1 text-[0.6875rem] font-light ring-1 ring-white/15">
              {data.targets.goalLabel}
            </span>
          </div>
          <div className="flex items-end justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-ink text-[2.375rem] leading-none font-light tabular-nums">
                {remainingKcal.toLocaleString()}
              </span>
              <span className="text-ink-secondary text-[0.8125rem] font-light">
                kcal left of {data.targets.kcal.toLocaleString()}
              </span>
            </div>
            <div className="text-ink-secondary flex flex-col items-end gap-1 text-[0.75rem] font-light">
              <span className="flex items-center gap-1.5">
                <GlassWater className="size-3.5" strokeWidth={1.5} />
                {(data.targets.waterMl / 1000).toFixed(1)} L water
              </span>
              {data.targets.etaWeeks && (
                <span>~{data.targets.etaWeeks} wks to goal</span>
              )}
            </div>
          </div>
        </div>
      </section>

      <MacroRings summary={data.summary} />

      {/* Today's plan */}
      <section aria-label="Today's meal plan" className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-ink text-[1.0625rem] font-normal tracking-tight">
            Today&apos;s plan
          </h3>
          <button
            type="button"
            onClick={() => meals.bumpSeed(data.date)}
            className="text-ink-secondary hover:text-ink flex items-center gap-1.5 text-[0.75rem] font-light transition-colors"
          >
            <RefreshCcw className="size-3.5" strokeWidth={1.75} />
            New plan
          </button>
        </div>

        {data.plan.slots.map((slot) => {
          const eaten = data.loggedSlots.includes(slot.index);
          return (
            <article
              key={slot.index}
              className={cn(
                "flex flex-col gap-3 rounded-[1.5rem] p-4 ring-1 transition-colors",
                eaten
                  ? "bg-[var(--color-accent-soft)]/40 ring-[var(--color-accent)]/25"
                  : "ring-border-subtle bg-white/[0.03]",
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <h4 className="text-ink text-[0.9375rem] font-normal">
                    {slot.name}
                  </h4>
                  <span className="text-ink-muted text-[0.6875rem] font-light tabular-nums">
                    {Math.round(slot.totals.kcal)} kcal ·{" "}
                    {Math.round(slot.totals.protein_g)}g protein
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => eatSlot(slot)}
                  disabled={eaten}
                  className={cn(
                    "flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[0.75rem] transition-all",
                    eaten
                      ? "text-accent bg-[var(--color-accent-soft)] font-normal"
                      : "text-ink ring-border-subtle bg-white/[0.05] font-light ring-1 active:scale-[0.97]",
                  )}
                >
                  <Check className="size-3.5" strokeWidth={2.25} />
                  {eaten ? "Eaten" : "I ate this"}
                </button>
              </div>

              <ul className="flex flex-col gap-2">
                {slot.items.map((item, itemIdx) => (
                  <li key={`${item.item.id}-${itemIdx}`}>
                    <button
                      type="button"
                      onClick={() =>
                        setSwapTarget({ slot: slot.index, item: itemIdx })
                      }
                      className="group flex w-full items-center gap-3 rounded-xl px-1 py-1 text-left"
                    >
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="text-ink truncate text-sm font-light">
                          {item.item.name}
                          {item.filler && (
                            <span className="text-accent ml-1.5 text-[0.5625rem] font-normal tracking-wide uppercase">
                              top-up
                            </span>
                          )}
                          {item.swapped && (
                            <span className="text-ink-muted ml-1.5 text-[0.5625rem] font-normal tracking-wide uppercase">
                              swapped
                            </span>
                          )}
                        </span>
                        <span className="text-ink-muted text-[0.6875rem] font-light">
                          {item.portions} × {item.item.serving} ·{" "}
                          {Math.round(item.macros.kcal)} kcal
                        </span>
                      </div>
                      <Repeat
                        className="text-ink-muted size-3.5 shrink-0 opacity-60 transition-opacity group-hover:opacity-100"
                        strokeWidth={1.75}
                        aria-label="Swap"
                      />
                    </button>
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </section>

      {/* Log something else */}
      <button
        type="button"
        onClick={() => setLogOpen(true)}
        className="text-accent bg-surface-muted/30 flex h-14 w-full items-center justify-center gap-2 rounded-[1.15rem] border border-dashed border-[var(--color-border-strong)] text-[0.9375rem] font-normal"
      >
        <Plus className="size-4.5" strokeWidth={2} />
        Log something else
      </button>

      <p className="text-ink-muted pb-2 text-center text-[0.6875rem] leading-relaxed font-light">
        Estimates, not medical advice. Values assume homemade preparation.
      </p>

      {/* Swap sheet */}
      <Sheet
        open={!!swapTarget}
        onClose={() => setSwapTarget(null)}
        title="Swap for…"
        size="tall"
      >
        <div className="flex flex-col gap-2 pb-2">
          {swapTarget && (
            <p className="text-ink-muted pb-1 text-[0.8125rem] font-light">
              Alternatives matched to{" "}
              <span className="text-ink-secondary">
                {
                  data.plan.slots[swapTarget.slot]?.items[swapTarget.item]?.item
                    .name
                }
              </span>{" "}
              — portions auto-fitted to keep your day on target.
            </p>
          )}
          {swaps.map((opt) => (
            <button
              key={opt.item.id}
              type="button"
              onClick={() => applySwapChoice(opt)}
              className="ring-border-subtle flex items-center gap-3 rounded-2xl bg-white/[0.03] px-4 py-3 text-left ring-1 transition-colors hover:bg-white/[0.06]"
            >
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-ink truncate text-sm font-light">
                  {opt.item.name}
                </span>
                <span className="text-ink-muted text-[0.6875rem] font-light">
                  {opt.portions} × {opt.item.serving} ·{" "}
                  {Math.round(opt.macros.kcal)} kcal
                </span>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-0.5 text-[0.625rem] font-light tabular-nums">
                <span
                  className={
                    opt.deltaKcal > 0 ? "text-amber-300" : "text-accent"
                  }
                >
                  {opt.deltaKcal >= 0 ? "+" : ""}
                  {opt.deltaKcal} kcal
                </span>
                <span className="text-ink-muted">
                  {opt.deltaProtein >= 0 ? "+" : ""}
                  {opt.deltaProtein}g protein
                </span>
              </div>
            </button>
          ))}
          {swaps.length === 0 && (
            <p className="text-ink-muted py-8 text-center text-sm font-light">
              No good alternatives for this item.
            </p>
          )}
        </div>
      </Sheet>

      <LogFoodSheet
        open={logOpen}
        onClose={() => setLogOpen(false)}
        data={data}
      />
    </div>
  );
}

/* --------------------------------------------------------------------------
 * Log sheet: protein-first suggestions for what's left, search, custom entry.
 * ------------------------------------------------------------------------ */
function LogFoodSheet({
  open,
  onClose,
  data,
}: {
  open: boolean;
  onClose: () => void;
  data: ReturnType<typeof useMeals>;
}) {
  const meals = useMealStore();
  const [query, setQuery] = useState("");
  const [custom, setCustom] = useState({ name: "", kcal: "", protein: "" });

  const results = useMemo(
    () => (query.trim() ? searchFoods(foodDb, query, 8) : []),
    [query],
  );

  const suggestions = useMemo(() => {
    if (!open) return [];
    return suggestForRemaining(foodDb, data.profile, data.targets, data.log, 4)
      .suggestions;
  }, [open, data.profile, data.targets, data.log]);

  const logItem = (itemId: number, portions: number) => {
    const log = cloneLog(data.log);
    logFood(foodDb, log, { itemId, portions });
    meals.appendEntries(data.date, log);
    onClose();
  };

  const logCustom = () => {
    const kcal = parseFloat(custom.kcal);
    if (!custom.name.trim() || !Number.isFinite(kcal)) return;
    const protein = parseFloat(custom.protein);
    const log = cloneLog(data.log);
    logFood(foodDb, log, {
      name: custom.name.trim(),
      kcal,
      protein_g: Number.isFinite(protein) ? protein : 0,
      carbs_g: 0,
      fat_g: 0,
    });
    meals.appendEntries(data.date, log);
    setCustom({ name: "", kcal: "", protein: "" });
    onClose();
  };

  const inputCls =
    "text-ink placeholder:text-ink-muted ring-border-subtle h-11 rounded-xl bg-white/[0.06] px-3.5 text-sm font-light ring-1 outline-none focus:ring-2 focus:ring-[var(--color-accent)]/60";

  return (
    <Sheet open={open} onClose={onClose} title="Log food" size="tall">
      <div className="flex flex-col gap-5 pb-2">
        {suggestions.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-ink-muted flex items-center gap-1.5 text-[0.625rem] font-light tracking-[0.18em] uppercase">
              <Sparkles className="text-accent size-3" strokeWidth={2} />
              Fits what&apos;s left today
            </span>
            {suggestions.map((s) => (
              <button
                key={s.item.id}
                type="button"
                onClick={() => logItem(s.item.id, s.portions)}
                className="ring-border-subtle flex items-center justify-between gap-3 rounded-2xl bg-white/[0.03] px-4 py-3 text-left ring-1 hover:bg-white/[0.06]"
              >
                <div className="flex min-w-0 flex-col">
                  <span className="text-ink truncate text-sm font-light">
                    {s.item.name}
                  </span>
                  <span className="text-ink-muted text-[0.6875rem] font-light">
                    {s.portions} × {s.item.serving}
                  </span>
                </div>
                <span className="text-ink-secondary shrink-0 text-xs font-light tabular-nums">
                  {Math.round(s.macros.kcal)} kcal ·{" "}
                  {Math.round(s.macros.protein_g)}g P
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <span className="text-ink-muted text-[0.625rem] font-light tracking-[0.18em] uppercase">
            Search the food list
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="daal, anda, biryani, chai…"
            aria-label="Search foods"
            className={inputCls}
          />
          {results.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => logItem(r.id, 1)}
              className="ring-border-subtle flex items-center justify-between gap-3 rounded-2xl bg-white/[0.03] px-4 py-3 text-left ring-1 hover:bg-white/[0.06]"
            >
              <div className="flex min-w-0 flex-col">
                <span className="text-ink truncate text-sm font-light">
                  {r.name}
                </span>
                <span className="text-ink-muted text-[0.6875rem] font-light">
                  {r.serving}
                </span>
              </div>
              <span className="text-ink-secondary shrink-0 text-xs font-light tabular-nums">
                {r.kcal} kcal
              </span>
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-ink-muted text-[0.625rem] font-light tracking-[0.18em] uppercase">
            Or a rough custom entry
          </span>
          <input
            type="text"
            value={custom.name}
            onChange={(e) => setCustom({ ...custom, name: e.target.value })}
            placeholder="Ghar ka khana — name it"
            aria-label="Custom food name"
            className={inputCls}
          />
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              value={custom.kcal}
              onChange={(e) =>
                setCustom({
                  ...custom,
                  kcal: e.target.value.replace(/[^\d]/g, ""),
                })
              }
              placeholder="kcal"
              aria-label="Calories"
              className={cn(inputCls, "flex-1")}
            />
            <input
              type="text"
              inputMode="numeric"
              value={custom.protein}
              onChange={(e) =>
                setCustom({
                  ...custom,
                  protein: e.target.value.replace(/[^\d]/g, ""),
                })
              }
              placeholder="protein g (optional)"
              aria-label="Protein grams"
              className={cn(inputCls, "flex-1")}
            />
          </div>
          <button
            type="button"
            onClick={logCustom}
            disabled={!custom.name.trim() || !custom.kcal}
            className="bg-accent mt-1 flex h-11 items-center justify-center rounded-full text-sm font-normal text-white shadow-[0_0_16px_var(--color-accent-glow)] disabled:opacity-40 disabled:shadow-none"
          >
            Log it
          </button>
        </div>
      </div>
    </Sheet>
  );
}
