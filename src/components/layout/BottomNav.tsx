"use client";

import { useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { StartWorkoutDialog } from "@/components/workout/StartWorkoutDialog";
import {
  Dumbbell,
  PersonStanding,
  Play,
  Trophy,
  UtensilsCrossed,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { BOTTOM_NAV_SHAPE_HEIGHT, buildBottomNavPath } from "./bottomNavShape";
import styles from "./BottomNav.module.css";

interface BottomNavProps {
  className?: string;
}

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  match: (pathname: string) => boolean;
};

const NAV_ITEMS: NavItem[] = [
  {
    href: "/home",
    label: "Workout",
    icon: Dumbbell,
    match: (pathname) => pathname === "/home",
  },
  {
    href: "/body",
    label: "Body",
    icon: PersonStanding,
    match: (pathname) => pathname.startsWith("/body"),
  },
  {
    href: "/meals",
    label: "Meals",
    icon: UtensilsCrossed,
    match: (pathname) => pathname.startsWith("/meals"),
  },
  {
    href: "/leaderboard",
    label: "Ranks",
    icon: Trophy,
    match: (pathname) => pathname.startsWith("/leaderboard"),
  },
];

function NavItemLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={cn(styles.item, active && styles.itemActive)}
      aria-label={item.label}
      aria-current={active ? "page" : undefined}
    >
      <Icon className={styles.itemIcon} strokeWidth={active ? 2.25 : 1.85} />
      <span className={styles.itemLabel} aria-hidden>
        {item.label}
      </span>
    </Link>
  );
}

export function BottomNav({ className }: BottomNavProps) {
  const pathname = usePathname();
  const trackRef = useRef<HTMLDivElement>(null);
  const [trackWidth, setTrackWidth] = useState<number | null>(null);
  const [startOpen, setStartOpen] = useState(false);

  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const observer = new ResizeObserver(([entry]) => {
      setTrackWidth(Math.round(entry.contentRect.width));
    });
    observer.observe(track);
    return () => observer.disconnect();
  }, []);

  const barPath = trackWidth ? buildBottomNavPath(trackWidth) : null;
  const viewBox = `0 0 ${trackWidth ?? 0} ${BOTTOM_NAV_SHAPE_HEIGHT}`;

  const [workout, body, meals, leaderboard] = NAV_ITEMS;

  return (
    <nav aria-label="Main navigation" className={cn(styles.shell, className)}>
      <div ref={trackRef} className={styles.track}>
        {barPath ? (
          <svg className={styles.shapeLayer} viewBox={viewBox} aria-hidden>
            <path className={styles.shapeShadow} d={barPath} />
          </svg>
        ) : null}

        <div
          className={styles.glass}
          style={barPath ? { clipPath: `path("${barPath}")` } : undefined}
        />

        {barPath ? (
          <svg className={styles.shapeLayer} viewBox={viewBox} aria-hidden>
            <defs>
              <linearGradient id="bottomNavEdge" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="rgba(255, 255, 255, 0.55)" />
                <stop offset="0.35" stopColor="rgba(255, 255, 255, 0.14)" />
                <stop offset="1" stopColor="rgba(255, 255, 255, 0.05)" />
              </linearGradient>
            </defs>
            <path
              d={barPath}
              fill="none"
              stroke="url(#bottomNavEdge)"
              strokeWidth="1.25"
            />
          </svg>
        ) : null}

        <div className={styles.itemsRow}>
          <NavItemLink item={workout} active={workout.match(pathname)} />
          <NavItemLink item={body} active={body.match(pathname)} />
          <span className={styles.centerSpacer} aria-hidden />
          <NavItemLink item={meals} active={meals.match(pathname)} />
          <NavItemLink
            item={leaderboard}
            active={leaderboard.match(pathname)}
          />
        </div>

        <button
          type="button"
          onClick={() => setStartOpen(true)}
          className={styles.fab}
          aria-label="Start today's workout"
        >
          <Play className={styles.fabIcon} strokeWidth={0} />
        </button>
      </div>

      <StartWorkoutDialog
        open={startOpen}
        onClose={() => setStartOpen(false)}
      />
    </nav>
  );
}
