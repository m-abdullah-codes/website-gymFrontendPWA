"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Check,
  ChevronRight,
  Dumbbell,
  ListChecks,
  Pause,
  RotateCcw,
  Sparkles,
  Wand2,
} from "lucide-react";
import {
  QUESTION_STEPS,
  type QuestionStepDef,
} from "@/components/onboarding/steps";
import { Sheet } from "@/components/ui/Sheet";
import { PlanSwitcherSheet } from "@/components/workout/PlanSwitcherSheet";
import { planId as planIdOf } from "@/data/exercises";
import { kgToLb, lbToKg } from "@/lib/engine/core";
import { pickPlan } from "@/lib/engine/planPicker";
import { seedDemoData, resetAllData } from "@/lib/demo/seed";
import { useHydrated } from "@/lib/store/useHydrated";
import { useStreakStore } from "@/lib/store/streakStore";
import {
  selectPickerInput,
  useUserStore,
  type AnswerValue,
} from "@/lib/store/userStore";
import { useWorkoutStore } from "@/lib/store/workoutStore";
import { cn } from "@/lib/utils";

/* Question keys per section. */
const PLAN_KEYS = ["goal", "days", "level", "split"];
const NUTRITION_KEYS = [
  "activity",
  "mealsPerDay",
  "dietExclusions",
  "chai",
  "pace",
];
const PROFILE_KEYS = ["gender", "over40", "adult", "cardio", "stretch"];

function stepFor(key: string): QuestionStepDef | undefined {
  return QUESTION_STEPS.find((s) => s.key === key);
}

function labelFor(
  step: QuestionStepDef,
  value: AnswerValue | undefined,
): string {
  if (value === undefined) return "Not set";
  if (Array.isArray(value)) {
    if (value.length === 0) return "None";
    return value
      .map((v) => step.options.find((o) => o.value === v)?.label ?? v)
      .join(", ")
      .replace(/No /g, "no ");
  }
  return step.options.find((o) => o.value === value)?.label ?? value;
}

function Row({
  title,
  value,
  onClick,
  href,
  icon,
}: {
  title: string;
  value?: string;
  onClick?: () => void;
  href?: string;
  icon?: React.ReactNode;
}) {
  const inner = (
    <>
      {icon}
      <span className="text-ink flex-1 text-left text-sm font-light">
        {title}
      </span>
      {value && (
        <span className="text-ink-muted max-w-[45%] truncate text-right text-[0.8125rem] font-light">
          {value}
        </span>
      )}
      <ChevronRight
        className="text-ink-muted size-4 shrink-0"
        strokeWidth={1.5}
      />
    </>
  );
  const cls =
    "flex w-full items-center gap-3 px-4 py-3.5 transition-colors hover:bg-white/[0.03]";
  return href ? (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

function Toggle({
  title,
  on,
  onChange,
  icon,
}: {
  title: string;
  on: boolean;
  onChange: (on: boolean) => void;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex w-full items-center gap-3 px-4 py-3.5">
      {icon}
      <span className="text-ink flex-1 text-sm font-light">{title}</span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={title}
        onClick={() => onChange(!on)}
        className={cn(
          "relative h-7 w-12 rounded-full ring-1 transition-colors",
          on ? "bg-accent ring-transparent" : "bg-white/[0.06] ring-white/15",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-6 rounded-full bg-white shadow transition-all",
            on ? "left-[calc(100%-1.625rem)]" : "left-0.5",
          )}
        />
      </button>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-ink-muted px-1 text-[0.6875rem] font-light tracking-[0.2em] uppercase">
        {title}
      </h2>
      <div className="ring-border-subtle divide-y divide-white/[0.05] overflow-hidden rounded-[1.25rem] bg-white/[0.03] ring-1">
        {children}
      </div>
    </section>
  );
}

export function SettingsHome() {
  const hydrated = useHydrated();
  const user = useUserStore();
  const streak = useStreakStore();
  const activePlanId = useWorkoutStore((s) => s.activePlanId);
  const [editKey, setEditKey] = useState<string | null>(null);
  const [statsOpen, setStatsOpen] = useState(false);
  const [plansOpen, setPlansOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const recommendation = useMemo(() => {
    if (!hydrated || !user.onboarded) return null;
    const pick = pickPlan(selectPickerInput(user));
    const id = planIdOf(pick.plan);
    return id !== activePlanId ? { id, name: pick.plan.plan } : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, user.onboarded, user.answers, activePlanId]);

  if (!hydrated) {
    return (
      <div className="mx-auto flex w-full max-w-[var(--max-width-content)] flex-col gap-4 md:max-w-lg">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-32 animate-pulse rounded-[1.25rem] bg-white/[0.03]"
          />
        ))}
      </div>
    );
  }

  const editStep = editKey ? stepFor(editKey) : undefined;
  const editValue = editKey ? user.answers[editKey] : undefined;

  const selectValue = (step: QuestionStepDef, value: string) => {
    if (step.multiSelect) {
      const arr = Array.isArray(user.answers[step.key])
        ? (user.answers[step.key] as string[])
        : [];
      let next: string[];
      if (value === step.exclusiveValue)
        next = arr.includes(value) ? [] : [value];
      else
        next = arr.includes(value)
          ? arr.filter((v) => v !== value)
          : [...arr.filter((v) => v !== step.exclusiveValue), value];
      user.setAnswer(step.key, next);
    } else {
      user.setAnswer(step.key, value);
      setEditKey(null);
    }
  };

  const unit = user.units;
  const showWeight = (kg: number | null) =>
    kg == null
      ? "—"
      : unit === "lb"
        ? `${Math.round(kgToLb(kg))} lb`
        : `${kg} kg`;

  return (
    <div className="mx-auto flex w-full max-w-[var(--max-width-content)] flex-col gap-5 pb-4 md:max-w-lg">
      {recommendation && (
        <button
          type="button"
          onClick={() => setPlansOpen(true)}
          className="flex items-start gap-3 rounded-2xl bg-[var(--color-accent-soft)] px-4 py-3.5 text-left ring-1 ring-[var(--color-accent)]/40"
        >
          <Sparkles
            className="text-accent mt-0.5 size-4 shrink-0"
            strokeWidth={1.75}
          />
          <span className="text-ink-secondary text-[0.8125rem] leading-relaxed font-light">
            With these answers we&apos;d now recommend{" "}
            <span className="text-ink font-normal">
              {recommendation.name.split("—")[0].trim()}
            </span>
            . Tap to review plans.
          </span>
        </button>
      )}

      <Section title="My plan">
        <Row
          title="Manage exercises"
          href="/exercises"
          icon={
            <ListChecks className="text-ink-muted size-4.5" strokeWidth={1.5} />
          }
        />
        <Row
          title="Training plan"
          value={activePlanId ? activePlanId.replace(/-/g, " ") : "None"}
          onClick={() => setPlansOpen(true)}
          icon={
            <Dumbbell className="text-ink-muted size-4.5" strokeWidth={1.5} />
          }
        />
        {PLAN_KEYS.map((key) => {
          const step = stepFor(key);
          if (!step) return null;
          return (
            <Row
              key={key}
              title={
                key === "goal"
                  ? "Goal"
                  : key === "days"
                    ? "Days per week"
                    : key === "level"
                      ? "Experience"
                      : "Training split"
              }
              value={labelFor(step, user.answers[key])}
              onClick={() => setEditKey(key)}
            />
          );
        })}
        <Toggle
          title="Warm-up sets"
          on={user.warmupSets}
          onChange={user.setWarmupSets}
          icon={<Wand2 className="text-ink-muted size-4.5" strokeWidth={1.5} />}
        />
      </Section>

      <Section title="Preferences">
        <div className="flex w-full items-center gap-3 px-4 py-3.5">
          <span className="text-ink flex-1 text-sm font-light">Units</span>
          <div className="ring-border-subtle flex rounded-full bg-white/[0.05] p-1 ring-1">
            {(["kg", "lb"] as const).map((u) => (
              <button
                key={u}
                type="button"
                aria-pressed={unit === u}
                onClick={() => user.setUnits(u)}
                className={cn(
                  "rounded-full px-3.5 py-1 text-xs font-light transition-colors",
                  unit === u ? "bg-accent text-white" : "text-ink-secondary",
                )}
              >
                {u}
              </button>
            ))}
          </div>
        </div>
        {["cardio", "stretch"].map((key) => {
          const step = stepFor(key);
          if (!step) return null;
          return (
            <Row
              key={key}
              title={key === "cardio" ? "Cardio" : "Stretching"}
              value={labelFor(step, user.answers[key])}
              onClick={() => setEditKey(key)}
            />
          );
        })}
      </Section>

      <Section title="Nutrition">
        {NUTRITION_KEYS.map((key) => {
          const step = stepFor(key);
          if (!step) return null;
          return (
            <Row
              key={key}
              title={
                key === "activity"
                  ? "Daily activity"
                  : key === "mealsPerDay"
                    ? "Eating pattern"
                    : key === "dietExclusions"
                      ? "Foods you avoid"
                      : key === "chai"
                        ? "Chai"
                        : "Pace"
              }
              value={labelFor(step, user.answers[key])}
              onClick={() => setEditKey(key)}
            />
          );
        })}
      </Section>

      <Section title="About you">
        <Row
          title="Body stats"
          value={`${user.ageYears ?? "—"}y · ${showWeight(user.bodyweightKg)} · ${user.heightCm ?? "—"}cm`}
          onClick={() => setStatsOpen(true)}
        />
        {PROFILE_KEYS.filter((k) => k !== "cardio" && k !== "stretch").map(
          (key) => {
            const step = stepFor(key);
            if (!step) return null;
            if (step.skip?.(user.answers)) return null;
            return (
              <Row
                key={key}
                title={
                  key === "gender"
                    ? "Gender"
                    : key === "over40"
                      ? "40 or older"
                      : "40+ program"
                }
                value={labelFor(step, user.answers[key])}
                onClick={() => setEditKey(key)}
              />
            );
          },
        )}
        <Toggle
          title="Pause streak (travel, illness)"
          on={streak.paused}
          onChange={streak.setPaused}
          icon={<Pause className="text-ink-muted size-4.5" strokeWidth={1.5} />}
        />
      </Section>

      <Section title="Demo & data">
        <Row
          title="Load 8 weeks of demo history"
          value="for walkthroughs"
          onClick={() => {
            seedDemoData();
          }}
          icon={<Wand2 className="text-ink-muted size-4.5" strokeWidth={1.5} />}
        />
        <Row
          title="Reset all data"
          value="fresh install"
          onClick={() => setConfirmReset(true)}
          icon={
            <RotateCcw className="text-ink-muted size-4.5" strokeWidth={1.5} />
          }
        />
      </Section>

      <p className="text-ink-muted text-center text-[0.6875rem] font-light">
        Everything is stored privately on this device.
      </p>

      {/* Option editor sheet */}
      <Sheet
        open={!!editStep}
        onClose={() => setEditKey(null)}
        title={editStep?.question ?? ""}
      >
        {editStep && (
          <div className="flex flex-col gap-2 pb-2">
            {editStep.hint && (
              <p className="text-ink-muted pb-1 text-[0.8125rem] font-light">
                {editStep.hint}
              </p>
            )}
            {editStep.options.map((opt) => {
              const selected = Array.isArray(editValue)
                ? editValue.includes(opt.value)
                : editValue === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => selectValue(editStep, opt.value)}
                  aria-pressed={selected}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-4 py-3.5 text-left ring-1 transition-colors",
                    selected
                      ? "bg-[var(--color-accent-soft)] ring-[var(--color-accent)]/60"
                      : "ring-border-subtle bg-white/[0.03] hover:bg-white/[0.06]",
                  )}
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-ink text-sm font-light">
                      {opt.label}
                    </span>
                    {opt.description && (
                      <span className="text-ink-muted text-xs font-light">
                        {opt.description}
                      </span>
                    )}
                  </span>
                  {selected && (
                    <Check
                      className="text-accent size-4.5"
                      strokeWidth={2.25}
                    />
                  )}
                </button>
              );
            })}
            {editStep.multiSelect && (
              <button
                type="button"
                onClick={() => setEditKey(null)}
                className="bg-accent mt-2 flex h-11 items-center justify-center rounded-full text-sm font-normal text-white"
              >
                Done
              </button>
            )}
          </div>
        )}
      </Sheet>

      <StatsSheet open={statsOpen} onClose={() => setStatsOpen(false)} />
      <PlanSwitcherSheet open={plansOpen} onClose={() => setPlansOpen(false)} />

      {/* Reset confirmation */}
      <Sheet
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Reset all data?"
      >
        <div className="flex flex-col gap-4 pb-2">
          <p className="text-ink-secondary text-sm leading-relaxed font-light">
            Wipes your plan, sessions, streak and meal logs from this device.
            This can&apos;t be undone.
          </p>
          <button
            type="button"
            onClick={() => {
              resetAllData();
              setConfirmReset(false);
            }}
            className="flex h-12 items-center justify-center rounded-full bg-red-500/85 text-sm font-normal text-white"
          >
            Reset everything
          </button>
        </div>
      </Sheet>
    </div>
  );
}

function StatsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const user = useUserStore();
  const unit = user.units;
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [target, setTarget] = useState("");

  const toKgStr = (v: string): number | null => {
    const n = parseFloat(v);
    if (!Number.isFinite(n) || n <= 0) return null;
    return unit === "lb" ? Math.round(lbToKg(n) * 10) / 10 : n;
  };

  const save = () => {
    const patch: Parameters<typeof user.setStats>[0] = {};
    const a = parseInt(age, 10);
    if (Number.isFinite(a) && a >= 13 && a <= 90) patch.ageYears = a;
    const w = toKgStr(weight);
    if (w) patch.bodyweightKg = w;
    const h = parseInt(height, 10);
    if (Number.isFinite(h) && h >= 120 && h <= 220) patch.heightCm = h;
    user.setStats(patch);
    const t = toKgStr(target);
    if (t) user.setAnswer("targetWeightKg", String(t));
    onClose();
  };

  const inputCls =
    "text-ink placeholder:text-ink-muted ring-border-subtle h-11 w-full rounded-xl bg-white/[0.06] px-3.5 text-sm font-light ring-1 outline-none focus:ring-2 focus:ring-[var(--color-accent)]/60";

  return (
    <Sheet open={open} onClose={onClose} title="Body stats">
      <div className="flex flex-col gap-3 pb-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-ink-secondary text-xs font-light">
            Age (currently {user.ageYears ?? "—"})
          </span>
          <input
            type="text"
            inputMode="numeric"
            value={age}
            onChange={(e) => setAge(e.target.value.replace(/\D/g, ""))}
            placeholder="28"
            className={inputCls}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-ink-secondary text-xs font-light">
            Weight in {unit} (currently {user.bodyweightKg ?? "—"} kg)
          </span>
          <input
            type="text"
            inputMode="decimal"
            value={weight}
            onChange={(e) => setWeight(e.target.value.replace(/[^\d.]/g, ""))}
            placeholder={unit === "kg" ? "80" : "176"}
            className={inputCls}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-ink-secondary text-xs font-light">
            Height in cm (currently {user.heightCm ?? "—"})
          </span>
          <input
            type="text"
            inputMode="numeric"
            value={height}
            onChange={(e) => setHeight(e.target.value.replace(/\D/g, ""))}
            placeholder="178"
            className={inputCls}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-ink-secondary text-xs font-light">
            Goal weight in {unit} (optional)
          </span>
          <input
            type="text"
            inputMode="decimal"
            value={target}
            onChange={(e) => setTarget(e.target.value.replace(/[^\d.]/g, ""))}
            placeholder="—"
            className={inputCls}
          />
        </label>
        <button
          type="button"
          onClick={save}
          className="bg-accent mt-1 flex h-12 items-center justify-center rounded-full text-sm font-normal text-white shadow-[0_0_16px_var(--color-accent-glow)]"
        >
          Save changes
        </button>
        <p className="text-ink-muted text-center text-[0.6875rem] font-light">
          Leave a field empty to keep its current value.
        </p>
      </div>
    </Sheet>
  );
}
