"use client";

import { useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { useUserStore, selectSex } from "@/lib/store/userStore";
import { useWorkoutStore } from "@/lib/store/workoutStore";
import {
  fractionalVolume,
  muscleRecovery,
  topExercisesFor,
  volumeBucket,
  VOLUME_BUCKETS,
  e1rmHistory,
  type Muscle,
} from "@/lib/volume/engine";
import {
  fillsForView,
  HEAT_COLORS,
  MUSCLE_PATHS,
  muscleForPath,
  RECOVERY_COLORS,
  type SilhouetteView,
} from "@/lib/volume/silhouette";
import { cn } from "@/lib/utils";
import { SilhouetteFigure } from "./SilhouetteFigure";
import { Sparkline } from "./Sparkline";

type Mode = "trained" | "recovery";

const RECOVERY_LEGEND = [
  { label: "Fresh", color: RECOVERY_COLORS.fresh! },
  { label: "Recovering", color: RECOVERY_COLORS.recovering! },
  { label: "Fatigued", color: RECOVERY_COLORS.fatigued! },
  { label: "Untrained", color: "#5c6474" },
];

export function SilhouetteTab() {
  const user = useUserStore();
  const sessions = useWorkoutStore((s) => s.sessions);
  const [mode, setMode] = useState<Mode>("trained");
  const [view, setView] = useState<SilhouetteView>("front");
  const [selected, setSelected] = useState<Muscle | null>(null);

  const gender = selectSex(user);
  const now = useMemo(() => new Date(), []);

  const volume = useMemo(
    () => fractionalVolume(sessions, now),
    [sessions, now],
  );
  const recovery = useMemo(
    () => muscleRecovery(sessions, now, user.ageYears ?? 28),
    [sessions, now, user.ageYears],
  );

  const colorByMuscle = useMemo(() => {
    const out: Partial<Record<Muscle, string | null>> = {};
    for (const muscle of Object.keys(MUSCLE_PATHS) as Muscle[]) {
      if (mode === "trained") {
        out[muscle] = HEAT_COLORS[volumeBucket(volume[muscle] ?? 0)];
      } else {
        out[muscle] = RECOVERY_COLORS[recovery[muscle]?.state ?? "untrained"];
      }
    }
    return out;
  }, [mode, volume, recovery]);

  const fills = useMemo(
    () => fillsForView(view, colorByMuscle),
    [view, colorByMuscle],
  );

  const selectedPathIds = useMemo(
    () =>
      selected
        ? MUSCLE_PATHS[selected]
            .filter((r) => r.view === view)
            .map((r) => r.pathId)
        : [],
    [selected, view],
  );

  const detail = selected
    ? {
        muscle: selected,
        weekly: Math.round((volume[selected] ?? 0) * 10) / 10,
        recovery: recovery[selected],
        top: topExercisesFor(sessions, selected, now),
      }
    : null;

  const detailSpark = useMemo(() => {
    if (!detail?.top.length) return null;
    const hist = e1rmHistory(sessions, detail.top[0].slug).slice(-10);
    return hist.length >= 2
      ? { name: detail.top[0].name, values: hist.map((h) => h.e1rm) }
      : null;
  }, [detail, sessions]);

  return (
    <div className="flex flex-col gap-4">
      {/* Mode segmented control */}
      <div
        role="tablist"
        aria-label="Silhouette mode"
        className="bg-surface-muted/60 ring-border-subtle flex w-full shrink-0 rounded-full p-1 ring-1"
      >
        {(["trained", "recovery"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={cn(
              "flex-1 rounded-full py-2 text-sm capitalize transition-colors",
              mode === m
                ? "text-ink-inverse bg-white font-normal shadow-[0_4px_16px_rgba(0,0,0,0.35)]"
                : "text-ink-secondary font-light",
            )}
          >
            {m === "trained" ? "Trained (7d)" : "Recovery"}
          </button>
        ))}
      </div>

      {/* Figure + rotate */}
      <div className="ring-border-subtle relative overflow-hidden rounded-[1.5rem] bg-white/[0.02] ring-1">
        <SilhouetteFigure
          gender={gender}
          view={view}
          fills={fills}
          selectedPathIds={selectedPathIds}
          onPathTap={(pathId) => {
            const muscle = muscleForPath(view, pathId);
            if (muscle) setSelected(muscle);
          }}
          className="mx-auto h-[54dvh] max-h-[560px] w-full py-3"
        />
        <button
          type="button"
          onClick={() => setView(view === "front" ? "back" : "front")}
          aria-label={`Show ${view === "front" ? "back" : "front"} view`}
          className="ring-border-subtle absolute top-3 right-3 flex size-11 items-center justify-center rounded-full bg-black/40 ring-1 backdrop-blur-sm transition-colors hover:bg-black/60"
        >
          <RefreshCw className="text-ink size-4.5" strokeWidth={1.75} />
        </button>
        <span className="text-ink-muted absolute bottom-3 left-4 text-[0.6875rem] font-light tracking-[0.18em] uppercase">
          {view} view
        </span>
      </div>

      {/* Legend */}
      {mode === "trained" ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {VOLUME_BUCKETS.slice(1).map((b, i) => (
            <span key={b.label} className="flex items-center gap-1.5">
              <span
                className="size-2.5 rounded-full"
                style={{ background: HEAT_COLORS[i + 1] ?? "#5c6474" }}
              />
              <span className="text-ink-muted text-[0.6875rem] font-light">
                {b.label}
              </span>
            </span>
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {RECOVERY_LEGEND.map((l) => (
            <span key={l.label} className="flex items-center gap-1.5">
              <span
                className="size-2.5 rounded-full"
                style={{ background: l.color }}
              />
              <span className="text-ink-muted text-[0.6875rem] font-light">
                {l.label}
              </span>
            </span>
          ))}
        </div>
      )}

      <p className="text-ink-muted text-xs font-light">
        Tap any muscle for detail — weekly sets, recovery and top movements.
      </p>

      {/* Muscle detail sheet */}
      <Sheet
        open={!!detail}
        onClose={() => setSelected(null)}
        title={detail?.muscle ?? ""}
      >
        {detail && (
          <div className="flex flex-col gap-5 pb-2">
            <div className="grid grid-cols-2 gap-2.5">
              <div className="ring-border-subtle flex flex-col gap-1 rounded-2xl bg-white/[0.04] px-4 py-3.5 ring-1">
                <span className="text-ink text-lg font-light tabular-nums">
                  {detail.weekly}
                  <span className="text-ink-muted ml-1 text-xs">sets</span>
                </span>
                <span className="text-ink-muted text-[0.625rem] font-light tracking-wide uppercase">
                  7-day fractional volume
                </span>
                <span className="text-ink-muted text-[0.6875rem] font-light">
                  optimal band 12.5–19
                </span>
              </div>
              <div className="ring-border-subtle flex flex-col gap-1 rounded-2xl bg-white/[0.04] px-4 py-3.5 ring-1">
                <span className="text-ink text-lg font-light capitalize">
                  {detail.recovery.state}
                  <span className="text-ink-muted ml-1.5 text-xs tabular-nums">
                    {detail.recovery.state !== "untrained"
                      ? `${detail.recovery.pct}%`
                      : ""}
                  </span>
                </span>
                <span className="text-ink-muted text-[0.625rem] font-light tracking-wide uppercase">
                  recovery
                </span>
                {detail.recovery.etaHours > 0 && (
                  <span className="text-ink-muted text-[0.6875rem] font-light">
                    fully fresh in ~{detail.recovery.etaHours}h
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-ink-muted text-[0.625rem] font-light tracking-[0.18em] uppercase">
                Last trained
              </span>
              <span className="text-ink-secondary text-sm font-light">
                {detail.recovery.lastTrained
                  ? new Date(detail.recovery.lastTrained).toLocaleDateString(
                      "en-US",
                      {
                        weekday: "long",
                        month: "short",
                        day: "numeric",
                      },
                    )
                  : "Not yet trained"}
              </span>
            </div>

            {detail.top.length > 0 && (
              <div className="flex flex-col gap-2.5">
                <span className="text-ink-muted text-[0.625rem] font-light tracking-[0.18em] uppercase">
                  Top movements (7d)
                </span>
                <ul className="flex flex-col gap-2">
                  {detail.top.map((t) => (
                    <li
                      key={t.slug}
                      className="text-ink-secondary flex items-center justify-between text-sm font-light"
                    >
                      <span className="truncate">{t.name}</span>
                      <span className="text-ink-muted ml-3 shrink-0 text-xs tabular-nums">
                        {t.sets} sets
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {detailSpark && (
              <div className="ring-border-subtle flex items-center justify-between rounded-2xl bg-white/[0.04] px-4 py-3.5 ring-1">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-ink truncate text-sm font-light">
                    {detailSpark.name}
                  </span>
                  <span className="text-ink-muted text-[0.625rem] font-light tracking-wide uppercase">
                    e1RM trend
                  </span>
                </div>
                <Sparkline values={detailSpark.values} />
              </div>
            )}
          </div>
        )}
      </Sheet>
    </div>
  );
}
