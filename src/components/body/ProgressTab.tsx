"use client";

import { useMemo, useState } from "react";
import {
  Clock,
  Dumbbell,
  Flame,
  Pause,
  Share2,
  Shield,
  Trophy,
} from "lucide-react";
import { exerciseLibrary } from "@/data/exercises";
import { kgToLb } from "@/lib/engine/core";
import { useStreakStore } from "@/lib/store/streakStore";
import { useUserStore } from "@/lib/store/userStore";
import { useWorkoutStore } from "@/lib/store/workoutStore";
import type { WorkoutSession } from "@/lib/store/types";
import { addDays, toLocalISODate, weekStartOf } from "@/lib/streak/engine";
import { e1rmHistory } from "@/lib/volume/engine";
import { cn } from "@/lib/utils";
import { Sparkline } from "./Sparkline";

const DOW = ["M", "T", "W", "T", "F", "S", "S"];

function fmtDate(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function fmtDuration(sec: number): string {
  const m = Math.round(sec / 60);
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

const BIG_LIFTS: { slug: string; label: string }[] = [
  { slug: "barbell-bench-press", label: "Bench" },
  { slug: "back-squat", label: "Squat" },
  { slug: "deadlift", label: "Deadlift" },
  { slug: "barbell-shoulder-press", label: "OHP" },
];

export function ProgressTab() {
  const sessions = useWorkoutStore((s) => s.sessions);
  const weekOutcomes = useStreakStore((s) => s.weekOutcomes);
  const streak = useStreakStore();
  const units = useUserStore((s) => s.units);
  const [weeksShown, setWeeksShown] = useState(6);

  const today = toLocalISODate(new Date());
  const currentWeek = weekStartOf(today);

  const sessionsByDate = useMemo(() => {
    const map = new Map<string, WorkoutSession[]>();
    for (const s of sessions) {
      map.set(s.date, [...(map.get(s.date) ?? []), s]);
    }
    return map;
  }, [sessions]);

  const outcomesByWeek = useMemo(
    () => new Map(weekOutcomes.map((w) => [w.weekStart, w])),
    [weekOutcomes],
  );

  /** Calendar weeks, newest first (current week included). */
  const weeks = useMemo(() => {
    const out: string[] = [];
    for (let i = 0; i < weeksShown; i++) out.push(addDays(currentWeek, -7 * i));
    return out;
  }, [currentWeek, weeksShown]);

  const ordered = useMemo(
    () => [...sessions].sort((a, b) => (a.endedAt < b.endedAt ? 1 : -1)),
    [sessions],
  );

  /** 12-week volume + outcome ribbon. */
  const trendWeeks = useMemo(() => {
    const out: { weekStart: string; volume: number; outcome: string | null }[] =
      [];
    for (let i = 11; i >= 0; i--) {
      const ws = addDays(currentWeek, -7 * i);
      const end = addDays(ws, 7);
      const volume = sessions
        .filter((s) => s.date >= ws && s.date < end)
        .reduce((a, s) => a + s.volumeKg, 0);
      out.push({
        weekStart: ws,
        volume,
        outcome:
          ws === currentWeek
            ? "open"
            : (outcomesByWeek.get(ws)?.outcome ?? null),
      });
    }
    return out;
  }, [sessions, currentWeek, outcomesByWeek]);
  const maxVolume = Math.max(1, ...trendWeeks.map((w) => w.volume));

  const sparks = useMemo(
    () =>
      BIG_LIFTS.map((l) => ({
        ...l,
        points: e1rmHistory(sessions, l.slug).slice(-12),
      })).filter((l) => l.points.length >= 1),
    [sessions],
  );

  const shareSession = async (s: WorkoutSession) => {
    const vol =
      units === "lb"
        ? `${Math.round(kgToLb(s.volumeKg)).toLocaleString()} lb`
        : `${s.volumeKg.toLocaleString()} kg`;
    const text = `${s.dayName.split("—").pop()?.trim()} done — ${s.completedWorkingSets} sets · ${vol} volume · ${fmtDuration(s.durationSec)}. Logged with the gym app.`;
    try {
      if (navigator.share) await navigator.share({ text });
      else await navigator.clipboard.writeText(text);
    } catch {
      /* user cancelled — fine */
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Weekly calendar strip */}
      <section aria-label="Weekly history" className="flex flex-col gap-2.5">
        {weeks.map((ws) => {
          const outcome = ws === currentWeek ? null : outcomesByWeek.get(ws);
          const isCurrent = ws === currentWeek;
          return (
            <div
              key={ws}
              className="ring-border-subtle flex items-center gap-3 rounded-2xl bg-white/[0.02] px-4 py-3 ring-1"
            >
              <span className="text-ink-muted w-14 shrink-0 text-[0.6875rem] font-light">
                {fmtDate(ws)}
              </span>
              <div className="flex flex-1 items-center justify-between gap-1">
                {DOW.map((d, i) => {
                  const date = addDays(ws, i);
                  const daySessions = sessionsByDate.get(date) ?? [];
                  const credited = daySessions.some((s) => s.credited);
                  const extra = !credited && daySessions.length > 0;
                  const future = date > today;
                  return (
                    <span key={i} className="flex flex-col items-center gap-1">
                      <span
                        className={cn(
                          "flex size-5 items-center justify-center rounded-full text-[0.5rem]",
                          credited
                            ? "bg-accent shadow-[0_0_8px_var(--color-accent-glow)]"
                            : extra
                              ? "bg-accent/35"
                              : future
                                ? "bg-white/[0.03]"
                                : "ring-1 ring-white/15",
                        )}
                      />
                      <span className="text-ink-muted text-[0.5625rem] font-light">
                        {d}
                      </span>
                    </span>
                  );
                })}
              </div>
              <span className="w-16 shrink-0 text-right">
                {isCurrent ? (
                  <span className="text-ink-muted text-[0.6875rem] font-light">
                    this week
                  </span>
                ) : outcome ? (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6875rem] font-light tabular-nums",
                      outcome.outcome === "success" &&
                        "bg-accent/15 text-accent",
                      outcome.outcome === "shielded" &&
                        "bg-sky-400/15 text-sky-300",
                      outcome.outcome === "failed" &&
                        "text-ink-muted bg-white/[0.05]",
                      outcome.outcome === "paused" &&
                        "text-ink-muted bg-white/[0.05]",
                    )}
                  >
                    {outcome.outcome === "shielded" && (
                      <Shield className="size-2.5" strokeWidth={2} />
                    )}
                    {outcome.outcome === "paused" && (
                      <Pause className="size-2.5" strokeWidth={2} />
                    )}
                    {outcome.validSessions}/{outcome.target}
                    {outcome.outcome === "success" ? " ✓" : ""}
                  </span>
                ) : (
                  <span className="text-ink-muted/50 text-[0.6875rem] font-light">
                    —
                  </span>
                )}
              </span>
            </div>
          );
        })}
        <button
          type="button"
          onClick={() => setWeeksShown((n) => n + 6)}
          className="text-ink-muted hover:text-ink-secondary py-1 text-center text-xs font-light transition-colors"
        >
          Show earlier weeks
        </button>
      </section>

      {/* Trends */}
      <section aria-label="Trends" className="flex flex-col gap-4">
        <h3 className="text-ink text-[1.0625rem] font-normal tracking-tight">
          Trends
        </h3>

        <div className="ring-border-subtle flex flex-col gap-3 rounded-[1.5rem] bg-white/[0.03] p-4 ring-1">
          <span className="text-ink-muted text-[0.625rem] font-light tracking-[0.18em] uppercase">
            12-week volume
          </span>
          <div className="flex h-24 items-end gap-1.5">
            {trendWeeks.map((w) => (
              <div
                key={w.weekStart}
                className="flex flex-1 flex-col items-center gap-1"
              >
                <div
                  className={cn(
                    "w-full rounded-t-[3px] transition-all",
                    w.volume > 0 ? "bg-accent/80" : "bg-white/[0.05]",
                  )}
                  style={{
                    height: `${Math.max(3, (w.volume / maxVolume) * 88)}px`,
                  }}
                />
                <span className="text-[0.5rem] leading-none">
                  {w.outcome === "success" ? (
                    <Flame
                      className="size-2.5 text-orange-400"
                      strokeWidth={2}
                    />
                  ) : w.outcome === "shielded" ? (
                    <Shield className="size-2.5 text-sky-300" strokeWidth={2} />
                  ) : w.outcome === "failed" ? (
                    <span className="text-ink-muted">·</span>
                  ) : (
                    <span className="text-transparent">·</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>

        {sparks.length > 0 && (
          <div className="grid grid-cols-2 gap-2.5">
            {sparks.map((l) => {
              const latest = l.points[l.points.length - 1]?.e1rm ?? 0;
              const shown =
                units === "lb"
                  ? Math.round(kgToLb(latest))
                  : Math.round(latest);
              return (
                <div
                  key={l.slug}
                  className="ring-border-subtle flex flex-col gap-1.5 rounded-2xl bg-white/[0.03] px-4 py-3.5 ring-1"
                >
                  <div className="flex items-baseline justify-between">
                    <span className="text-ink text-sm font-light">
                      {l.label}
                    </span>
                    <span className="text-ink-secondary text-xs font-light tabular-nums">
                      {shown} {units}
                    </span>
                  </div>
                  <Sparkline values={l.points.map((p) => p.e1rm)} width={120} />
                  <span className="text-ink-muted text-[0.5625rem] font-light tracking-wide uppercase">
                    e1RM (Epley)
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* 26-week streak ribbon */}
        <div className="ring-border-subtle flex flex-col gap-2.5 rounded-[1.5rem] bg-white/[0.03] p-4 ring-1">
          <div className="flex items-baseline justify-between">
            <span className="text-ink-muted text-[0.625rem] font-light tracking-[0.18em] uppercase">
              26-week streak history
            </span>
            <span className="text-ink-muted text-[0.6875rem] font-light tabular-nums">
              longest: {streak.longestWeeks}w
            </span>
          </div>
          <div className="flex items-center gap-[3px]">
            {Array.from({ length: 26 }, (_, i) => {
              const ws = addDays(currentWeek, -7 * (25 - i));
              const o = outcomesByWeek.get(ws);
              return (
                <span
                  key={ws}
                  title={`${fmtDate(ws)}: ${o?.outcome ?? "no data"}`}
                  className={cn(
                    "h-5 flex-1 rounded-[2px]",
                    o?.outcome === "success" && "bg-accent",
                    o?.outcome === "shielded" && "bg-sky-400/70",
                    o?.outcome === "failed" && "bg-white/[0.08]",
                    o?.outcome === "paused" && "bg-white/[0.14]",
                    !o && "bg-white/[0.03]",
                  )}
                />
              );
            })}
          </div>
        </div>
      </section>

      {/* Session history */}
      <section aria-label="Session history" className="flex flex-col gap-3">
        <h3 className="text-ink text-[1.0625rem] font-normal tracking-tight">
          Sessions
        </h3>
        {ordered.length === 0 && (
          <p className="text-ink-muted py-6 text-center text-sm font-light">
            No sessions yet — record your first workout and it lands here.
          </p>
        )}
        {ordered.map((s) => (
          <article
            key={s.id}
            className="ring-border-subtle flex flex-col gap-3 rounded-[1.5rem] bg-white/[0.03] p-4 ring-1"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-col gap-0.5">
                <h4 className="text-ink truncate text-[0.9375rem] font-normal">
                  {s.dayName.split("—").pop()?.trim() ?? s.dayName}
                </h4>
                <span className="text-ink-muted text-xs font-light">
                  {new Date(s.endedAt).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  ·{" "}
                  {new Date(s.endedAt).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <button
                type="button"
                onClick={() => shareSession(s)}
                aria-label="Share session"
                className="text-ink-muted hover:text-ink ring-border-subtle flex size-9 shrink-0 items-center justify-center rounded-full bg-white/[0.03] ring-1 transition-colors"
              >
                <Share2 className="size-4" strokeWidth={1.5} />
              </button>
            </div>

            <div className="text-ink-secondary flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.8125rem] font-light tabular-nums">
              <span className="flex items-center gap-1.5">
                <Clock className="size-3.5" strokeWidth={1.5} />
                {fmtDuration(s.durationSec)}
              </span>
              <span className="flex items-center gap-1.5">
                <Dumbbell className="size-3.5" strokeWidth={1.5} />
                {s.exercises.length} exercises
              </span>
              <span>
                {units === "lb"
                  ? `${Math.round(kgToLb(s.volumeKg)).toLocaleString()} lb`
                  : `${s.volumeKg.toLocaleString()} kg`}
              </span>
              <span>{s.estKcal} kcal est.</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {s.credited ? (
                <span className="text-accent flex items-center gap-1 rounded-full bg-[var(--color-accent-soft)] px-2 py-0.5 text-[0.625rem] font-normal tracking-wide uppercase">
                  <Flame className="size-2.5" strokeWidth={2} />
                  Credited
                </span>
              ) : (
                <span className="text-ink-muted rounded-full bg-white/[0.05] px-2 py-0.5 text-[0.625rem] font-light tracking-wide uppercase">
                  Extra
                </span>
              )}
              {s.prSlugs.map((slug) => (
                <span
                  key={slug}
                  className="flex items-center gap-1 rounded-full bg-amber-400/10 px-2 py-0.5 text-[0.625rem] font-normal tracking-wide text-amber-300 uppercase"
                >
                  <Trophy className="size-2.5" strokeWidth={2} />
                  PR · {exerciseLibrary[slug]?.name ?? slug}
                </span>
              ))}
              {s.unscheduled && (
                <span className="text-ink-muted rounded-full bg-white/[0.05] px-2 py-0.5 text-[0.625rem] font-light tracking-wide uppercase">
                  Unscheduled
                </span>
              )}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
