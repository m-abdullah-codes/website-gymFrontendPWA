/**
 * Mock leaderboard + community data. Client-side only until the backend
 * lands — shapes mirror what the Worker API will eventually serve.
 */

export type LeaderboardUser = {
  id: string;
  name: string;
  /** Streak in weeks — the ranking key (verified tier comes later). */
  streakWeeks: number;
  /** Headline strength figure: best e1RM lift or Big-3 total (kg). */
  headline: { label: string; valueKg: number };
  /** Deterministic avatar hue (0–360). */
  hue: number;
};

export const LEADERBOARD_USERS: LeaderboardUser[] = [
  {
    id: "u-hamza",
    name: "Hamza R.",
    streakWeeks: 41,
    headline: { label: "Big-3 total", valueKg: 512.5 },
    hue: 208,
  },
  {
    id: "u-sana",
    name: "Sana I.",
    streakWeeks: 37,
    headline: { label: "Deadlift e1RM", valueKg: 145 },
    hue: 328,
  },
  {
    id: "u-bilal",
    name: "Bilal K.",
    streakWeeks: 33,
    headline: { label: "Bench e1RM", valueKg: 132.5 },
    hue: 156,
  },
  {
    id: "u-ayesha",
    name: "Ayesha T.",
    streakWeeks: 29,
    headline: { label: "Squat e1RM", valueKg: 120 },
    hue: 42,
  },
  {
    id: "u-usman",
    name: "Usman G.",
    streakWeeks: 24,
    headline: { label: "Big-3 total", valueKg: 470 },
    hue: 264,
  },
  {
    id: "u-fatima",
    name: "Fatima N.",
    streakWeeks: 21,
    headline: { label: "Deadlift e1RM", valueKg: 130 },
    hue: 12,
  },
  {
    id: "u-ali",
    name: "Ali S.",
    streakWeeks: 17,
    headline: { label: "Bench e1RM", valueKg: 110 },
    hue: 190,
  },
  {
    id: "u-zara",
    name: "Zara M.",
    streakWeeks: 14,
    headline: { label: "Squat e1RM", valueKg: 105 },
    hue: 300,
  },
  {
    id: "u-omar",
    name: "Omar F.",
    streakWeeks: 11,
    headline: { label: "Big-3 total", valueKg: 402.5 },
    hue: 96,
  },
  {
    id: "u-hira",
    name: "Hira A.",
    streakWeeks: 8,
    headline: { label: "Deadlift e1RM", valueKg: 112.5 },
    hue: 232,
  },
  {
    id: "u-danish",
    name: "Danish W.",
    streakWeeks: 6,
    headline: { label: "Bench e1RM", valueKg: 95 },
    hue: 68,
  },
  {
    id: "u-mahnoor",
    name: "Mahnoor B.",
    streakWeeks: 3,
    headline: { label: "Squat e1RM", valueKg: 87.5 },
    hue: 350,
  },
];

export type ReactionKind = "like" | "fire" | "flex";

export type CommunityPost = {
  id: string;
  userId: string;
  /** Hours ago (mock clock). */
  hoursAgo: number;
  kind: "milestone" | "manual" | "recap";
  /** Milestone posts. */
  milestone?: { title: string; detail: string };
  /** Manual posts. */
  text?: string;
  /** Session recap cards (same shape as Progress share cards). */
  recap?: {
    title: string;
    sets: number;
    volumeKg: number;
    durationMin: number;
    prs: string[];
  };
  reactions: Record<ReactionKind, number>;
  comments: { userId: string; text: string }[];
};

export const COMMUNITY_POSTS: CommunityPost[] = [
  {
    id: "p1",
    userId: "u-hamza",
    hoursAgo: 2,
    kind: "milestone",
    milestone: {
      title: "26-week streak badge",
      detail:
        "Half a year of showing up, every single week. Two shields banked.",
    },
    reactions: { like: 21, fire: 14, flex: 6 },
    comments: [
      { userId: "u-sana", text: "Machine. Absolute machine." },
      { userId: "u-danish", text: "Goals 🔥" },
    ],
  },
  {
    id: "p2",
    userId: "u-ayesha",
    hoursAgo: 5,
    kind: "recap",
    recap: {
      title: "Lower Power",
      sets: 16,
      volumeKg: 6120,
      durationMin: 58,
      prs: ["Back Squat"],
    },
    reactions: { like: 12, fire: 9, flex: 3 },
    comments: [{ userId: "u-bilal", text: "That squat PR though 👏" }],
  },
  {
    id: "p3",
    userId: "u-usman",
    hoursAgo: 9,
    kind: "manual",
    text: "6 months in. Same gym, same time, different person. If you're waiting for motivation — don't. Just book the session.",
    reactions: { like: 33, fire: 11, flex: 8 },
    comments: [
      { userId: "u-hira", text: "Needed this today, thank you" },
      { userId: "u-omar", text: "Facts. See you Monday 5am" },
      { userId: "u-fatima", text: "🙌" },
    ],
  },
  {
    id: "p4",
    userId: "u-sana",
    hoursAgo: 22,
    kind: "milestone",
    milestone: {
      title: "New deadlift e1RM — 145 kg",
      detail: "Up 7.5 kg since March. Slow is smooth, smooth is fast.",
    },
    reactions: { like: 18, fire: 16, flex: 9 },
    comments: [],
  },
  {
    id: "p5",
    userId: "u-zara",
    hoursAgo: 30,
    kind: "recap",
    recap: {
      title: "Push Day",
      sets: 14,
      volumeKg: 3480,
      durationMin: 47,
      prs: [],
    },
    reactions: { like: 7, fire: 3, flex: 2 },
    comments: [{ userId: "u-mahnoor", text: "Consistency queen" }],
  },
  {
    id: "p6",
    userId: "u-bilal",
    hoursAgo: 49,
    kind: "manual",
    text: "Gym was empty at 6am today. Best session in weeks. Highly recommend the early slot before work.",
    reactions: { like: 15, fire: 4, flex: 1 },
    comments: [],
  },
];

export function userById(id: string): LeaderboardUser | undefined {
  return LEADERBOARD_USERS.find((u) => u.id === id);
}
