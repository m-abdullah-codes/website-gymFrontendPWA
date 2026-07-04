"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleDot, Zap } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { useActivePlan } from "@/lib/hooks/useActivePlan";
import { useWorkoutStore } from "@/lib/store/workoutStore";

const LINES = [
  "The hardest set is walking in. You're already here.",
  "Future you is built one logged set at a time.",
  "Show up today, thank yourself in 12 weeks.",
  "Nobody ever regretted the workout they finished.",
  "Small sessions stack into big streaks.",
];

interface StartWorkoutDialogProps {
  open: boolean;
  onClose: () => void;
}

/** The bottom-nav Start button's moment: one motivational line, one action. */
export function StartWorkoutDialog({ open, onClose }: StartWorkoutDialogProps) {
  const router = useRouter();
  const view = useActivePlan();
  const active = useWorkoutStore((s) => s.active);
  const startSession = useWorkoutStore((s) => s.startSession);

  // Stable per day, varied across days.
  const line = useMemo(() => LINES[new Date().getDate() % LINES.length], []);

  const record = () => {
    onClose();
    if (!active && view.todayDayIndex != null) {
      startSession(view.todayDayIndex);
    }
    router.push("/workout/record");
  };

  const restDay = view.todayDayIndex == null && !active;

  return (
    <Dialog open={open} onClose={onClose} ariaLabel="Start today's workout">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-4 pt-2 text-center">
          <span className="bg-accent/15 ring-accent/30 flex size-14 items-center justify-center rounded-full ring-1">
            <Zap className="text-accent size-6" strokeWidth={1.5} />
          </span>
          <div className="flex flex-col gap-2">
            <h2 className="text-ink text-xl leading-snug font-light tracking-tight">
              {active
                ? "Your session is still running"
                : restDay
                  ? "Rest day — but you decide"
                  : "Today's the day"}
            </h2>
            <p className="text-ink-secondary text-sm leading-relaxed font-light">
              {active
                ? "Jump back in and finish what you started."
                : restDay
                  ? "Recovery is part of the plan. If you'd rather train, pick a workout from the Workout page."
                  : line}
            </p>
          </div>
        </div>

        {view.onboarded && !restDay ? (
          <Button variant="accent" className="gap-2.5" onClick={record}>
            <CircleDot className="size-4.5" strokeWidth={2} />
            {active ? "Resume workout" : "Record"}
          </Button>
        ) : view.onboarded ? (
          <Link
            href="/home"
            onClick={onClose}
            className="bg-accent flex h-13 w-full items-center justify-center rounded-full text-[0.9375rem] font-normal text-white shadow-[0_0_24px_var(--color-accent-glow)]"
          >
            Pick a workout
          </Link>
        ) : (
          <Link
            href="/onboarding"
            onClick={onClose}
            className="bg-accent flex h-13 w-full items-center justify-center rounded-full text-[0.9375rem] font-normal text-white shadow-[0_0_24px_var(--color-accent-glow)]"
          >
            Set up your plan first
          </Link>
        )}

        <button
          type="button"
          onClick={onClose}
          className="text-ink-muted hover:text-ink-secondary -mt-2 text-center text-xs font-light transition-colors"
        >
          Not now
        </button>
      </div>
    </Dialog>
  );
}
