"use client";

import { useMemo, useState } from "react";
import { Crown, Flame, MessageCircle, Trophy } from "lucide-react";
import {
  COMMUNITY_POSTS,
  LEADERBOARD_USERS,
  userById,
  type CommunityPost,
  type LeaderboardUser,
  type ReactionKind,
} from "@/data/community";
import { kgToLb } from "@/lib/engine/core";
import { useHydrated } from "@/lib/store/useHydrated";
import { useStreakStore } from "@/lib/store/streakStore";
import { useUserStore } from "@/lib/store/userStore";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "leaderboard", label: "Leaderboard" },
  { id: "community", label: "Community" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function Avatar({
  user,
  size = "md",
}: {
  user: LeaderboardUser;
  size?: "md" | "lg";
}) {
  const initials = user.name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2);
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-normal text-white ring-1 ring-white/20",
        size === "lg" ? "size-14 text-lg" : "size-10 text-sm",
      )}
      style={{
        background: `linear-gradient(160deg, hsl(${user.hue} 60% 42%), hsl(${user.hue} 70% 24%))`,
      }}
    >
      {initials}
    </span>
  );
}

export function LeaderboardTabs() {
  const hydrated = useHydrated();
  const [tab, setTab] = useState<TabId>("leaderboard");
  const streakWeeks = useStreakStore((s) => s.streakWeeks);
  const units = useUserStore((s) => s.units);
  const onboarded = useUserStore((s) => s.onboarded);

  const fmtKg = (kg: number) =>
    units === "lb" ? `${Math.round(kgToLb(kg))} lb` : `${kg} kg`;

  const ranked = useMemo(() => {
    const you: LeaderboardUser | null =
      hydrated && onboarded
        ? {
            id: "you",
            name: "You",
            streakWeeks,
            headline: { label: "Streak", valueKg: 0 },
            hue: 222,
          }
        : null;
    return [...LEADERBOARD_USERS, ...(you ? [you] : [])].sort(
      (a, b) => b.streakWeeks - a.streakWeeks,
    );
  }, [hydrated, onboarded, streakWeeks]);

  const podium = ranked.slice(0, 3);
  const rest = ranked.slice(3);

  return (
    <div className="mx-auto flex w-full max-w-[var(--max-width-content)] flex-col gap-5 md:max-w-lg">
      <div
        role="tablist"
        aria-label="Leaderboard views"
        className="bg-surface-muted/60 ring-border-subtle flex w-full shrink-0 rounded-full p-1 ring-1 backdrop-blur-sm"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex-1 rounded-full py-2.5 text-sm transition-colors",
              tab === t.id
                ? "text-ink-inverse bg-white font-normal shadow-[0_4px_16px_rgba(0,0,0,0.35)]"
                : "text-ink-secondary font-light",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "leaderboard" ? (
        <div className="flex flex-col gap-5">
          {/* Podium — 2 · 1 · 3 */}
          <section
            aria-label="Top three"
            className="grid grid-cols-3 items-end gap-2.5"
          >
            {[podium[1], podium[0], podium[2]]
              .filter(Boolean)
              .map((user, i) => {
                const rank = i === 1 ? 1 : i === 0 ? 2 : 3;
                const medal =
                  rank === 1
                    ? {
                        ring: "ring-amber-300/60",
                        glow: "shadow-[0_0_28px_rgba(251,191,36,0.25)]",
                        label: "text-amber-300",
                        bg: "from-amber-400/15",
                      }
                    : rank === 2
                      ? {
                          ring: "ring-slate-300/50",
                          glow: "shadow-[0_0_20px_rgba(203,213,225,0.15)]",
                          label: "text-slate-300",
                          bg: "from-slate-300/10",
                        }
                      : {
                          ring: "ring-orange-400/50",
                          glow: "shadow-[0_0_20px_rgba(251,146,60,0.15)]",
                          label: "text-orange-400",
                          bg: "from-orange-400/10",
                        };
                return (
                  <div
                    key={user.id}
                    className={cn(
                      "relative flex flex-col items-center gap-2 rounded-[1.5rem] bg-gradient-to-b to-transparent px-2 pb-4 ring-1",
                      medal.bg,
                      medal.ring,
                      medal.glow,
                      rank === 1 ? "pt-6" : "mt-5 pt-4",
                    )}
                  >
                    {rank === 1 && (
                      <Crown
                        className="absolute -top-3 size-6 text-amber-300"
                        strokeWidth={1.5}
                        fill="currentColor"
                      />
                    )}
                    <Avatar user={user} size={rank === 1 ? "lg" : "md"} />
                    <span
                      className={cn(
                        "text-lg leading-none font-light tabular-nums",
                        medal.label,
                      )}
                    >
                      #{rank}
                    </span>
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-ink max-w-full truncate text-[0.8125rem] font-normal">
                        {user.name}
                      </span>
                      <span className="text-ink-secondary flex items-center gap-1 text-[0.75rem] font-light tabular-nums">
                        <Flame
                          className="size-3 text-orange-400"
                          strokeWidth={2}
                        />
                        {user.streakWeeks}w
                      </span>
                      {user.headline.valueKg > 0 && (
                        <span className="text-ink-muted text-center text-[0.625rem] leading-tight font-light">
                          {user.headline.label}
                          <br />
                          {fmtKg(user.headline.valueKg)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
          </section>

          {/* Rank 4+ */}
          <section aria-label="Rankings" className="flex flex-col gap-2">
            {rest.map((user, i) => {
              const rank = i + 4;
              const isYou = user.id === "you";
              return (
                <div
                  key={user.id}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-4 py-3 ring-1",
                    isYou
                      ? "bg-[var(--color-accent-soft)] ring-[var(--color-accent)]/40"
                      : "ring-border-subtle bg-white/[0.03]",
                  )}
                >
                  <span className="text-ink-muted w-6 shrink-0 text-center text-sm font-light tabular-nums">
                    {rank}
                  </span>
                  <Avatar user={user} />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="text-ink truncate text-sm font-normal">
                      {user.name}
                      {isYou && (
                        <span className="text-accent ml-1.5 text-[0.625rem] font-normal tracking-wide uppercase">
                          you
                        </span>
                      )}
                    </span>
                    {user.headline.valueKg > 0 && (
                      <span className="text-ink-muted text-[0.6875rem] font-light">
                        {user.headline.label} · {fmtKg(user.headline.valueKg)}
                      </span>
                    )}
                  </div>
                  <span className="text-ink-secondary flex shrink-0 items-center gap-1 text-sm font-light tabular-nums">
                    <Flame
                      className="size-3.5 text-orange-400"
                      strokeWidth={2}
                    />
                    {user.streakWeeks}w
                  </span>
                </div>
              );
            })}
          </section>

          <p className="text-ink-muted pb-2 text-center text-[0.6875rem] font-light">
            Ranked by weekly streak · your gym only
          </p>
        </div>
      ) : (
        <CommunityFeed />
      )}
    </div>
  );
}

/* --------------------------------------------------------------------------
 * Community feed — one flat list, simple reactions, inline comments.
 * ------------------------------------------------------------------------ */

const REACTIONS: { kind: ReactionKind; emoji: string }[] = [
  { kind: "like", emoji: "👍" },
  { kind: "fire", emoji: "🔥" },
  { kind: "flex", emoji: "💪" },
];

function timeAgo(hours: number): string {
  if (hours < 24) return `${hours}h ago`;
  const d = Math.floor(hours / 24);
  return `${d}d ago`;
}

function CommunityFeed() {
  // Local-only reaction/comment state (mock until the backend exists).
  const [mine, setMine] = useState<Record<string, Set<ReactionKind>>>({});
  const [openComments, setOpenComments] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [added, setAdded] = useState<Record<string, { text: string }[]>>({});

  const toggle = (postId: string, kind: ReactionKind) =>
    setMine((m) => {
      const set = new Set(m[postId] ?? []);
      if (set.has(kind)) set.delete(kind);
      else set.add(kind);
      return { ...m, [postId]: set };
    });

  const submitComment = (postId: string) => {
    const text = (drafts[postId] ?? "").trim();
    if (!text) return;
    setAdded((a) => ({ ...a, [postId]: [...(a[postId] ?? []), { text }] }));
    setDrafts((d) => ({ ...d, [postId]: "" }));
  };

  return (
    <div className="flex flex-col gap-3 pb-2">
      {COMMUNITY_POSTS.map((post) => {
        const author = userById(post.userId)!;
        const myReactions = mine[post.id] ?? new Set<ReactionKind>();
        const extraComments = added[post.id] ?? [];
        const commentCount = post.comments.length + extraComments.length;
        const commentsOpen = openComments === post.id;
        return (
          <article
            key={post.id}
            className="ring-border-subtle flex flex-col gap-3.5 rounded-[1.5rem] bg-white/[0.03] p-4 ring-1"
          >
            <header className="flex items-center gap-3">
              <Avatar user={author} />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-ink truncate text-sm font-normal">
                  {author.name}
                </span>
                <span className="text-ink-muted text-[0.6875rem] font-light">
                  {timeAgo(post.hoursAgo)}
                </span>
              </div>
              {post.kind === "milestone" && (
                <span className="text-accent flex items-center gap-1 rounded-full bg-[var(--color-accent-soft)] px-2.5 py-1 text-[0.625rem] font-normal tracking-wide uppercase">
                  <Trophy className="size-2.5" strokeWidth={2} />
                  Milestone
                </span>
              )}
            </header>

            <PostBody post={post} />

            <footer className="flex items-center gap-2">
              {REACTIONS.map(({ kind, emoji }) => {
                const active = myReactions.has(kind);
                const count = post.reactions[kind] + (active ? 1 : 0);
                return (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => toggle(post.id, kind)}
                    aria-pressed={active}
                    aria-label={`React ${kind}`}
                    className={cn(
                      "flex h-8 items-center gap-1.5 rounded-full px-3 text-[0.75rem] font-light ring-1 transition-all active:scale-95",
                      active
                        ? "bg-[var(--color-accent-soft)] ring-[var(--color-accent)]/50"
                        : "ring-border-subtle bg-white/[0.03]",
                    )}
                  >
                    <span aria-hidden>{emoji}</span>
                    <span className="text-ink-secondary tabular-nums">
                      {count}
                    </span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setOpenComments(commentsOpen ? null : post.id)}
                className="text-ink-secondary ml-auto flex h-8 items-center gap-1.5 rounded-full px-2 text-[0.75rem] font-light"
              >
                <MessageCircle className="size-3.5" strokeWidth={1.75} />
                {commentCount}
              </button>
            </footer>

            {commentsOpen && (
              <div className="flex flex-col gap-2.5 border-t border-white/[0.06] pt-3">
                {post.comments.map((c, i) => {
                  const cu = userById(c.userId);
                  return (
                    <p
                      key={i}
                      className="text-[0.8125rem] leading-relaxed font-light"
                    >
                      <span className="text-ink font-normal">
                        {cu?.name ?? "Member"}
                      </span>{" "}
                      <span className="text-ink-secondary">{c.text}</span>
                    </p>
                  );
                })}
                {extraComments.map((c, i) => (
                  <p
                    key={`mine-${i}`}
                    className="text-[0.8125rem] leading-relaxed font-light"
                  >
                    <span className="text-ink font-normal">You</span>{" "}
                    <span className="text-ink-secondary">{c.text}</span>
                  </p>
                ))}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={drafts[post.id] ?? ""}
                    onChange={(e) =>
                      setDrafts((d) => ({ ...d, [post.id]: e.target.value }))
                    }
                    onKeyDown={(e) =>
                      e.key === "Enter" && submitComment(post.id)
                    }
                    placeholder="Add a comment…"
                    aria-label="Add a comment"
                    className="text-ink placeholder:text-ink-muted ring-border-subtle h-10 flex-1 rounded-full bg-white/[0.05] px-4 text-[0.8125rem] font-light ring-1 outline-none focus:ring-2 focus:ring-[var(--color-accent)]/60"
                  />
                  <button
                    type="button"
                    onClick={() => submitComment(post.id)}
                    className="text-accent text-[0.8125rem] font-normal"
                  >
                    Post
                  </button>
                </div>
              </div>
            )}
          </article>
        );
      })}
      <p className="text-ink-muted pb-2 text-center text-[0.6875rem] font-light">
        Your gym&apos;s feed · sample content until launch
      </p>
    </div>
  );
}

function PostBody({ post }: { post: CommunityPost }) {
  if (post.kind === "milestone" && post.milestone) {
    return (
      <div className="rounded-2xl border border-[var(--color-card-border)] bg-[linear-gradient(165deg,rgba(19,36,72,0.5)_0%,rgba(4,11,26,0.8)_70%)] p-4">
        <p className="text-ink text-[0.9375rem] font-normal">
          {post.milestone.title}
        </p>
        <p className="text-ink-secondary mt-1 text-[0.8125rem] leading-relaxed font-light">
          {post.milestone.detail}
        </p>
      </div>
    );
  }
  if (post.kind === "recap" && post.recap) {
    return (
      <div className="rounded-2xl border border-[var(--color-card-border)] bg-[linear-gradient(165deg,rgba(19,36,72,0.5)_0%,rgba(4,11,26,0.8)_70%)] p-4">
        <div className="flex items-center justify-between">
          <p className="text-ink text-[0.9375rem] font-normal">
            {post.recap.title}
          </p>
          <span className="text-ink-muted text-[0.6875rem] font-light">
            session recap
          </span>
        </div>
        <div className="text-ink-secondary mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[0.8125rem] font-light tabular-nums">
          <span>{post.recap.sets} sets</span>
          <span>{post.recap.volumeKg.toLocaleString()} kg volume</span>
          <span>{post.recap.durationMin} min</span>
        </div>
        {post.recap.prs.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {post.recap.prs.map((pr) => (
              <span
                key={pr}
                className="flex items-center gap-1 rounded-full bg-amber-400/10 px-2 py-0.5 text-[0.625rem] font-normal tracking-wide text-amber-300 uppercase"
              >
                <Trophy className="size-2.5" strokeWidth={2} />
                PR · {pr}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }
  return (
    <p className="text-ink-secondary text-[0.9375rem] leading-relaxed font-light">
      {post.text}
    </p>
  );
}
