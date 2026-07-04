"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { TodayWorkout, type TodayWorkoutProps } from "./TodayWorkout";
import { WeekPlan, type WeekDayView } from "./WeekPlan";

interface PlanTabsProps {
  today: TodayWorkoutProps;
  week: WeekDayView[];
  rotating?: boolean;
  className?: string;
}

const tabs = [
  { id: "today", label: "Today's Workout" },
  { id: "week", label: "Full Week Plan" },
] as const;

type TabId = (typeof tabs)[number]["id"];

export function PlanTabs({ today, week, rotating, className }: PlanTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("today");

  return (
    <div
      className={cn(
        "flex min-h-0 w-full min-w-0 flex-1 flex-col gap-6",
        className,
      )}
    >
      <div
        role="tablist"
        aria-label="Plan views"
        className="bg-surface-muted/60 ring-border-subtle flex w-full shrink-0 rounded-full p-1 ring-1 backdrop-blur-sm"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 rounded-full py-2.5 text-sm transition-colors",
                isActive
                  ? "text-ink-inverse bg-white font-normal shadow-[0_4px_16px_rgba(0,0,0,0.35)]"
                  : "text-ink-secondary font-light",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain"
      >
        {activeTab === "today" ? (
          <TodayWorkout {...today} />
        ) : (
          <WeekPlan days={week} rotating={rotating} />
        )}
      </div>
    </div>
  );
}
